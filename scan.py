#!/usr/bin/env python3
"""
QuantumSafe CLI — deterministic scan + optional Gemini/Gemma assessment (AI Studio API).

Examples:
  python scan.py --dir ./demo_samples --output report.json
  python scan.py --dir ./demo_samples --api-mode --model gemma-2-9b-it --deep -o report.json

Same pipeline as: POST /api/v1/scan

Env:
  GOOGLE_API_KEY or GOOGLE_AI_API_KEY  (required for --api-mode)
  GEMINI_MODEL / QUANTUMSAFE_MODEL       (optional default model)
  QUANTUMSAFE_GEMMA_MODEL               (default Gemma id for Gemma profile)
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from quantumsafe.pipeline import build_report


def main() -> int:
    p = argparse.ArgumentParser(description="QuantumSafe repository scanner")
    p.add_argument("--dir", required=True, help="Project root to scan")
    p.add_argument("--output", "-o", help="Write JSON report to this path")
    p.add_argument(
        "--api-mode",
        action="store_true",
        help="Call Google AI Studio (Gemini or Gemma) for enriched JSON report",
    )
    p.add_argument(
        "--model",
        default=None,
        help="Model id, e.g. gemini-2.0-flash or gemma-2-9b-it",
    )
    p.add_argument(
        "--deep",
        action="store_true",
        help="Attach code CONTEXT snippets to the LLM (richer Gemma/Gemini reasoning)",
    )
    args = p.parse_args()

    root = Path(args.dir).expanduser().resolve()
    if not root.is_dir():
        print(f"Not a directory: {root}", file=sys.stderr)
        return 2

    result = build_report(
        root,
        api_mode=args.api_mode,
        model=args.model,
        deep_context=args.deep,
    )
    text = json.dumps(result, indent=2)
    if args.output:
        Path(args.output).write_text(text, encoding="utf-8")
        print(f"Wrote {args.output}")
    else:
        print(text)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
