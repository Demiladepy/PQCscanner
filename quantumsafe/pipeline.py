"""
QuantumSafe scan pipeline — single entry used by CLI, HTTP API, and future workers.

Contract: returns a QuantumSafe report dict (scan_summary, findings, migration_plan).
"""

from __future__ import annotations

from pathlib import Path

from quantumsafe.ai.gemini import analyze_with_gemini, merge_scanner_only_report
from quantumsafe.scanner.engine import ScanResult, scan_path


def findings_to_payload(result: ScanResult) -> dict:
    rows = []
    for n, f in enumerate(result.findings, start=1):
        d = f.to_dict()
        d["id"] = f"QS-{n:03d}"
        d["rule_id"] = f.rule_id
        d["vulnerability"] = (
            f"Deterministic hit: {f.title}. Classical asymmetric or key-exchange "
            "primitive — evaluate PQC migration (ML-KEM / ML-DSA / hybrids)."
        )
        d["hndl_risk"] = "HIGH" if f.algorithm_class == "key-exchange" else "MEDIUM"
        d["migration_complexity"] = "MODERATE"
        rows.append(d)
    return {
        "scanner_version": "0.1.0",
        "root": result.root,
        "files_scanned": result.files_scanned,
        "findings": rows,
    }


def build_report(
    root: Path,
    *,
    api_mode: bool = False,
    model: str | None = None,
    deep_context: bool = False,
) -> dict:
    """
    Run deterministic scan on ``root``, then optionally enrich with Gemini / Gemma
    (Google AI Studio) using the same JSON contract.
    """
    result = scan_path(root)
    payload = findings_to_payload(result)
    if api_mode:
        return analyze_with_gemini(
            payload,
            model=model,
            deep_context=deep_context,
        )
    return merge_scanner_only_report(payload)


def build_report_from_scan_result(
    result: ScanResult,
    *,
    api_mode: bool = False,
    model: str | None = None,
    deep_context: bool = False,
) -> dict:
    """Use an existing ScanResult (e.g. cached or merged from multiple engines)."""
    payload = findings_to_payload(result)
    if api_mode:
        return analyze_with_gemini(
            payload,
            model=model,
            deep_context=deep_context,
        )
    return merge_scanner_only_report(payload)
