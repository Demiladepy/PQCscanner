"""
Deterministic pattern rules (regex). Goal: high recall for demo; refine for production.
Each rule may match multiple lines — engine records line numbers per hit.
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Iterable, Pattern


@dataclass(frozen=True)
class Rule:
    id: str
    title: str
    algorithm: str
    algorithm_class: str
    default_severity: str
    patterns: tuple[Pattern[str], ...]
    path_globs: tuple[str, ...] | None = None  # None = any tracked extension


def _p(x: str) -> Pattern[str]:
    return re.compile(x, re.IGNORECASE | re.MULTILINE)


# --- Curated rules v0: languages + infra strings ---

RULES: tuple[Rule, ...] = (
    Rule(
        id="PY-RSA-GENERATE",
        title="Python RSA key generation",
        algorithm="RSA",
        algorithm_class="key-agreement-or-encryption",
        default_severity="HIGH",
        patterns=(
            _p(r"rsa\.generate_private_key\s*\("),
            _p(r"RSAPrivateKey"),
        ),
        path_globs=("*.py",),
    ),
    Rule(
        id="PY-ECDSA-EC",
        title="Python ECDSA / EC signing",
        algorithm="ECDSA/EC",
        algorithm_class="signature",
        default_severity="HIGH",
        patterns=(
            _p(r"ec\.generate_private_key\s*\("),
            _p(r"ec\.ECDSA\s*\("),
        ),
        path_globs=("*.py",),
    ),
    Rule(
        id="PY-JWT-RS256",
        title="JWT signed with RS256",
        algorithm="RS256",
        algorithm_class="signature",
        default_severity="MEDIUM",
        patterns=(_p(r'algorithm\s*=\s*["\']RS256["\']'),),
        path_globs=("*.py",),
    ),
    Rule(
        id="GO-ECDSA",
        title="Go ECDSA usage",
        algorithm="ECDSA",
        algorithm_class="signature",
        default_severity="HIGH",
        patterns=(_p(r"ecdsa\.GenerateKey\s*\("),),
        path_globs=("*.go",),
    ),
    Rule(
        id="GO-RSA-TLS",
        title="Go TLS without PQ hints (classical curves only)",
        algorithm="TLS key exchange (classical)",
        algorithm_class="key-exchange",
        default_severity="MEDIUM",
        patterns=(
            _p(r"tls\.CurveP256"),
            _p(r"MinVersion:\s*tls\.VersionTLS12"),
        ),
        path_globs=("*.go",),
    ),
    Rule(
        id="JAVA-RSA",
        title="Java RSA key/cipher",
        algorithm="RSA",
        algorithm_class="encryption",
        default_severity="HIGH",
        patterns=(
            _p(r'KeyPairGenerator\.getInstance\s*\(\s*"RSA"\s*\)'),
            _p(r"RSA/ECB/OAEP"),
        ),
        path_globs=("*.java",),
    ),
    Rule(
        id="JS-ECDH-P256",
        title="WebCrypto ECDH P-256",
        algorithm="ECDH-P256",
        algorithm_class="key-exchange",
        default_severity="HIGH",
        patterns=(
            _p(r'name"\s*:\s*"ECDH"'),
            _p(r"namedCurve\"\s*,\s*\"P-256\""),
        ),
        path_globs=("*.js", "*.ts", "*.tsx", "*.mjs", "*.cjs"),
    ),
    Rule(
        id="NGINX-TLS-ECDHE",
        title="Nginx TLS ECDHE cipher / curve config",
        algorithm="ECDHE (classical)",
        algorithm_class="key-exchange",
        default_severity="MEDIUM",
        patterns=(
            _p(r"ssl_ciphers\s+.*ECDHE"),
            _p(r"ssl_ecdh_curve"),
        ),
        path_globs=("*.conf",),
    ),
    Rule(
        id="SSH-KEX-CLASSICAL",
        title="SSH classical KEX / host keys",
        algorithm="SSH classical (RSA/ECDH/DH)",
        algorithm_class="key-exchange",
        default_severity="MEDIUM",
        patterns=(
            _p(r"KexAlgorithms\s+.*(ecdh|diffie-hellman|group\d+)"),
            _p(r"ssh_host_rsa_key"),
            _p(r"PubkeyAcceptedAlgorithms\s+.*ssh-rsa"),
        ),
        path_globs=("sshd_config",),
    ),
    Rule(
        id="OPENSSL-RSA-LEGACY",
        title="OpenSSL RSA legacy API",
        algorithm="RSA",
        algorithm_class="key-exchange",
        default_severity="HIGH",
        patterns=(_p(r"RSA_generate_key\s*\("), _p(r"PEM_write_RSAPrivateKey")),
        path_globs=("*.c", "*.h", "*.cpp", "*.cc"),
    ),
)


def iter_rules_for_rel_path(rel_path: str) -> Iterable[Rule]:
    """Yield rules that apply to this file path (by extension / basename)."""
    lower = rel_path.replace("\\", "/").lower()
    name = lower.split("/")[-1]
    for r in RULES:
        globs = r.path_globs
        if not globs:
            yield r
            continue
        for g in globs:
            if g.startswith("*"):
                if lower.endswith(g[1:]):
                    yield r
                    break
            elif name == g.lower() or lower.endswith("/" + g.lower()):
                yield r
                break
