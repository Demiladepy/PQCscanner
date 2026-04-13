from __future__ import annotations

import json
import os
import re
from pathlib import Path
from typing import Any

_DEFAULT_FAST = "gemini-2.0-flash"
_DEFAULT_GEMMA = os.environ.get("QUANTUMSAFE_GEMMA_MODEL", "gemma-2-9b-it")


def _load_prompt(name: str) -> str:
    p = Path(__file__).resolve().parent.parent / "prompts" / name
    return p.read_text(encoding="utf-8")


def _load_system_prompt() -> str:
    return _load_prompt("system_api.txt")


def _resolve_system_prompt(model_name: str, override: str | None) -> str:
    if override:
        return override
    if "gemma" in model_name.lower():
        return _load_prompt("gemma_pqc.txt")
    return _load_prompt("system_api.txt")


def _default_model_for_name(model: str | None) -> str:
    if model:
        return model
    env = os.environ.get("GEMINI_MODEL") or os.environ.get("QUANTUMSAFE_MODEL")
    return env or _DEFAULT_FAST


def _extract_json(text: str) -> dict[str, Any]:
    text = text.strip()
    m = re.search(r"```(?:json)?\s*([\s\S]*?)```", text)
    if m:
        text = m.group(1).strip()
    return json.loads(text)


def _build_deep_context(payload: dict[str, Any], max_chars: int = 12_000) -> str:
    """Concatenate per-finding snippets for LLM reasoning (bounded)."""
    parts: list[str] = []
    total = 0
    for f in payload.get("findings", []):
        sid = f.get("id", "?")
        path = f.get("file", "")
        snip = (f.get("snippet") or "") or (f.get("matched_text") or "")
        block = f"--- {sid} {path} ---\n{snip}\n"
        if total + len(block) > max_chars:
            parts.append(f"\n[... truncated after {max_chars} characters ...]")
            break
        parts.append(block)
        total += len(block)
    return "\n".join(parts).strip()


def analyze_with_gemini(
    deterministic_payload: dict[str, Any],
    *,
    model: str | None = None,
    system_prompt: str | None = None,
    deep_context: bool = False,
) -> dict[str, Any]:
    """
    Call Google Generative AI (AI Studio key). Supports Gemini and Gemma model IDs
    available on your API key (e.g. ``gemini-2.0-flash``, ``gemma-2-9b-it``).

    When ``deep_context`` is True, append bounded code CONTEXT from scanner snippets
    so Gemma / Gemini can reason about real lines, not only rule metadata.
    """
    try:
        import google.generativeai as genai
    except ImportError as e:
        raise ImportError(
            "Install google-generativeai (see requirements-quantumsafe.txt)"
        ) from e

    api_key = os.environ.get("GOOGLE_API_KEY") or os.environ.get("GOOGLE_AI_API_KEY")
    if not api_key:
        raise EnvironmentError(
            "Set GOOGLE_API_KEY or GOOGLE_AI_API_KEY for AI assessment."
        )

    genai.configure(api_key=api_key)
    model_name = _default_model_for_name(model)
    sys_instr = _resolve_system_prompt(model_name, system_prompt)

    gm = genai.GenerativeModel(
        model_name=model_name,
        system_instruction=sys_instr,
    )

    user_parts = [
        "Deterministic scan output (JSON):\n",
        json.dumps(deterministic_payload, indent=2),
    ]
    if deep_context:
        ctx = _build_deep_context(deterministic_payload)
        if ctx:
            user_parts.append(
                "\n\n--- CODE CONTEXT (line context around hits; use for justification) ---\n"
            )
            user_parts.append(ctx)

    user = "".join(user_parts)
    resp = gm.generate_content(
        user,
        generation_config={
            "temperature": 0.15,
            "max_output_tokens": 8192,
        },
    )
    raw = (resp.text or "").strip()
    if not raw:
        raise RuntimeError("Empty model response")
    out = _extract_json(raw)
    if isinstance(out.get("scan_summary"), dict):
        out["scan_summary"]["llm_model"] = model_name
        out["scan_summary"]["llm_deep_context"] = deep_context
    return out


def merge_scanner_only_report(scan_dict: dict[str, Any]) -> dict[str, Any]:
    """Build a minimal valid report from deterministic findings only (no LLM)."""
    findings_in = scan_dict.get("findings", [])
    hours = min(40, max(1, len(findings_in) * 2))
    sev = {"CRITICAL": 0, "HIGH": 0, "MEDIUM": 0, "LOW": 0}

    findings_out = []
    for i, f in enumerate(findings_in, start=1):
        s = str(f.get("severity", "MEDIUM")).upper()
        if s not in sev:
            s = "MEDIUM"
        sev[s] = sev.get(s, 0) + 1
        findings_out.append(
            {
                "id": f.get("id") or f"QS-{i:03d}",
                "file": f["file"],
                "line_start": f["line_start"],
                "line_end": f["line_end"],
                "severity": s,
                "algorithm": f.get("algorithm", ""),
                "algorithm_class": f.get("algorithm_class", ""),
                "vulnerability": f.get(
                    "vulnerability",
                    "Classical public-key or key-exchange primitive "
                    "— plan migration to NIST PQC (ML-KEM / ML-DSA) per deployment context.",
                ),
                "hndl_risk": f.get("hndl_risk", "MEDIUM"),
                "migration_complexity": f.get("migration_complexity", "MODERATE"),
                "vulnerable_code": f.get("matched_text", "")[:2000],
                "recommended_replacement": f.get(
                    "recommended_replacement",
                    "ML-KEM-768 / ML-DSA-65 (assess protocol fit)",
                ),
                "migration_patch": f.get("migration_patch", "// TODO: context-specific patch"),
                "hybrid_option": f.get(
                    "hybrid_option",
                    "Use hybrid TLS / dual-signature during transition where supported.",
                ),
                "test_suggestion": f.get(
                    "test_suggestion",
                    "Add integration tests for handshake/signing round-trips.",
                ),
                "estimated_hours": f.get("estimated_hours", 2.0),
                "dependencies": f.get("dependencies", []),
                "compliance": f.get("compliance", {"note": "Review NIST IR 8547 / org policy"}),
            }
        )

    out = {
        "scan_summary": {
            "total_findings": len(findings_out),
            "critical": sev["CRITICAL"],
            "high": sev["HIGH"],
            "medium": sev["MEDIUM"],
            "low": sev["LOW"],
            "estimated_total_migration_hours": hours,
            "compliance_gaps": ["manual_review_required"],
        },
        "findings": findings_out,
        "migration_plan": {
            "phases": [
                {
                    "phase": 1,
                    "name": "Triage deterministic findings",
                    "findings": [f["id"] for f in findings_out],
                    "estimated_hours": hours,
                    "rationale": "Heuristic scan only — follow with manual review and tests.",
                }
            ]
        },
    }
    return out


def recommended_llm_profiles() -> list[dict[str, Any]]:
    """Defaults for UI / docs — actual availability depends on API key region."""
    return [
        {
            "id": _DEFAULT_FAST,
            "label": "Gemini Flash",
            "role": "fast_balanced",
            "hint": "Default; strong JSON following",
        },
        {
            "id": _DEFAULT_GEMMA,
            "label": "Gemma (open weights via AI Studio)",
            "role": "pqc_migration_engineering",
            "hint": "Uses gemma_pqc.txt system prompt + optional code context",
        },
    ]
