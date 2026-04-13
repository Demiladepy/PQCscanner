from __future__ import annotations

import fnmatch
import os
from dataclasses import dataclass, field
from pathlib import Path
from typing import Iterator

from quantumsafe.scanner import rules as rules_mod


SKIP_DIR_NAMES = {
    ".git",
    ".hg",
    ".svn",
    "node_modules",
    "venv",
    ".venv",
    "__pycache__",
    "dist",
    "build",
    ".mypy_cache",
    ".pytest_cache",
    "target",  # Rust
    ".gradle",
}


TEXT_EXTENSIONS = {
    ".py",
    ".go",
    ".java",
    ".js",
    ".mjs",
    ".cjs",
    ".ts",
    ".tsx",
    ".c",
    ".h",
    ".cc",
    ".cpp",
    ".rs",
    ".conf",
    ".yaml",
    ".yml",
    ".tf",
    ".md",
    ".json",
    ".toml",
    ".gradle",
    ".kt",
    ".swift",
    ".rb",
    ".php",
    ".cs",
}


SPECIAL_NAMES = {"sshd_config", "config", "dockerfile"}


def _should_scan_file(path: Path, root: Path) -> bool:
    name = path.name.lower()
    if name in SPECIAL_NAMES or name == "dockerfile":
        return True
    if path.suffix.lower() in TEXT_EXTENSIONS:
        return True
    return False


def _rel_posix(path: Path, root: Path) -> str:
    return path.relative_to(root).as_posix()


def _match_glob(rel_posix: str, pattern: str) -> bool:
    # fnmatch on basename for *.ext; full path for ** patterns
    base = rel_posix.split("/")[-1]
    if pattern.startswith("*"):
        return base.endswith(pattern[1:]) or fnmatch.fnmatch(base, pattern)
    if "*" in pattern or "?" in pattern:
        return fnmatch.fnmatch(rel_posix, pattern) or fnmatch.fnmatch(base, pattern)
    return base.lower() == pattern.lower()


def iter_rules_for_rel_path(rel_path: str) -> Iterator[rules_mod.Rule]:
    for r in rules_mod.RULES:
        globs = r.path_globs
        if not globs:
            yield r
            continue
        if any(_match_glob(rel_path, g) for g in globs):
            yield r


@dataclass
class ScanFinding:
    rule_id: str
    title: str
    file: str
    line_start: int
    line_end: int
    severity: str
    algorithm: str
    algorithm_class: str
    matched_text: str
    snippet: str = ""

    def to_dict(self) -> dict:
        return {
            "id": self.rule_id,
            "file": self.file,
            "line_start": self.line_start,
            "line_end": self.line_end,
            "severity": self.severity,
            "algorithm": self.algorithm,
            "algorithm_class": self.algorithm_class,
            "title": self.title,
            "matched_text": self.matched_text,
            "snippet": self.snippet,
        }


@dataclass
class ScanResult:
    root: str
    files_scanned: int
    findings: list[ScanFinding] = field(default_factory=list)


def _line_snippet(lines: list[str], lineno: int, context: int = 2) -> str:
    i = lineno - 1
    lo = max(0, i - context)
    hi = min(len(lines), i + context + 1)
    out = []
    for n in range(lo, hi):
        prefix = ">" if n == i else " "
        out.append(f"{prefix} {n + 1:4d} | {lines[n].rstrip()}")
    return "\n".join(out)


def _iter_project_files(root: Path) -> Iterator[Path]:
    for dirpath, dirnames, filenames in os.walk(root):
        dirnames[:] = [d for d in dirnames if d not in SKIP_DIR_NAMES]
        for fn in filenames:
            yield Path(dirpath) / fn


def scan_path(root: Path, max_files: int = 50_000) -> ScanResult:
    root = root.resolve()
    findings: list[ScanFinding] = []
    scanned = 0

    for path in _iter_project_files(root):
        if not path.is_file():
            continue
        if not _should_scan_file(path, root):
            continue
        scanned += 1
        if scanned > max_files:
            break

        rel = _rel_posix(path, root)
        try:
            text = path.read_text(encoding="utf-8", errors="replace")
        except OSError:
            continue

        file_rules = list(iter_rules_for_rel_path(rel))
        if not file_rules:
            continue

        lines = text.splitlines()
        seen: set[tuple[str, str, int, str]] = set()
        for rule in file_rules:
            for pat in rule.patterns:
                for m in pat.finditer(text):
                    start_pos = m.start()
                    line_no = text.count("\n", 0, start_pos) + 1
                    matched = m.group(0).strip()
                    if len(matched) > 200:
                        matched = matched[:197] + "..."
                    key = (rule.id, rel, line_no, matched)
                    if key in seen:
                        continue
                    seen.add(key)
                    snip = _line_snippet(lines, line_no)
                    findings.append(
                        ScanFinding(
                            rule_id=rule.id,
                            title=rule.title,
                            file=rel,
                            line_start=line_no,
                            line_end=line_no,
                            severity=rule.default_severity,
                            algorithm=rule.algorithm,
                            algorithm_class=rule.algorithm_class,
                            matched_text=matched,
                            snippet=snip,
                        )
                    )

    return ScanResult(root=str(root), files_scanned=scanned, findings=findings)
