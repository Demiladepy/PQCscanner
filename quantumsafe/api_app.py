"""
QuantumSafe HTTP gateway — connects quantumsafe-web and automation to the same pipeline.

Run: uvicorn quantumsafe.api_app:app --host 127.0.0.1 --port 8765

Env:
  QUANTUM_ROOT — absolute path; repo root by default (parent of ``quantumsafe`` package).
  GOOGLE_API_KEY / GOOGLE_AI_API_KEY — required only when use_ai=true on /scan.
  CORS_ORIGINS — comma-separated allowed browser origins (set in production).
  TRUSTED_HOSTS — comma-separated hostnames for TrustedHostMiddleware (production).
  QS_GATEWAY_PUBLIC=1 — omit internal paths from /api/v1/health.
  QS_DEBUG=1 — include exception strings in HTTP error responses (dev only).
  SCAN_RATE_LIMIT — slowapi limit for POST /api/v1/scan (default ``30/minute``).
"""

import os
from pathlib import Path
from typing import Annotated

from pydantic import BaseModel, Field

from fastapi import Body, FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from slowapi.util import get_remote_address
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.middleware.trustedhost import TrustedHostMiddleware

from quantumsafe import __version__ as qs_version
from quantumsafe.ai.gemini import recommended_llm_profiles
from quantumsafe.pipeline import build_report

_DEBUG = os.environ.get("QS_DEBUG", "").lower() in ("1", "true", "yes")
_PUBLIC = os.environ.get("QS_GATEWAY_PUBLIC", "").lower() in ("1", "true", "yes")
_SCAN_RATE_LIMIT = os.environ.get("SCAN_RATE_LIMIT", "30/minute")

def _repo_root() -> Path:
    return Path(__file__).resolve().parent.parent


def _quantum_root() -> Path:
    raw = os.environ.get("QUANTUM_ROOT")
    if raw:
        return Path(raw).expanduser().resolve()
    return _repo_root()


def _safe_child_path(rel: str) -> Path:
    """Resolve ``rel`` under QUANTUM_ROOT; reject path traversal."""
    raw = rel.strip().replace("\\", "/")
    if not raw or raw.startswith("/") or Path(raw).is_absolute():
        raise HTTPException(status_code=400, detail="Path must be relative to QUANTUM_ROOT")
    if ".." in Path(raw).parts:
        raise HTTPException(status_code=400, detail="Invalid path")
    base = _quantum_root().resolve()
    child = (base / raw).resolve()
    if not str(child).startswith(str(base)):
        raise HTTPException(status_code=400, detail="Path escapes QUANTUM_ROOT")
    return child


app = FastAPI(
    title="QuantumSafe Gateway",
    version=qs_version,
    description="PQC discovery + assessment API for the QuantumSafe platform.",
)

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Baseline headers for JSON APIs (reduce XSS/clickjacking and MIME confusion)."""

    async def dispatch(self, request, call_next):
        response = await call_next(request)
        response.headers.setdefault("X-Content-Type-Options", "nosniff")
        response.headers.setdefault("X-Frame-Options", "DENY")
        response.headers.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
        response.headers.setdefault(
            "Permissions-Policy",
            "accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), "
            "microphone=(), payment=(), usb=()",
        )
        response.headers.setdefault("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'")
        return response


_trusted = [h.strip() for h in os.environ.get("TRUSTED_HOSTS", "").split(",") if h.strip()]
if _trusted:
    app.add_middleware(TrustedHostMiddleware, allowed_hosts=_trusted)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in os.environ.get(
        "CORS_ORIGINS",
        "http://127.0.0.1:5173,http://localhost:5173",
    ).split(",") if o.strip()],
    allow_credentials=True,
    allow_methods=["GET", "HEAD", "POST", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Accept"],
)
app.add_middleware(SecurityHeadersMiddleware)


@app.get("/api/v1/health")
def health():
    payload = {
        "status": "ok",
        "service": "quantumsafe-gateway",
        "version": qs_version,
    }
    if not _PUBLIC:
        payload["quantum_root"] = str(_quantum_root())
    return payload


@app.get("/api/v1/meta")
def meta():
    """How the pieces of the monorepo connect (for UI / ops)."""
    root = _quantum_root()
    return {
        "platform": "quantumsafe",
        "version": qs_version,
        "quantum_root": str(root),
        "components": {
            "quantumsafe": "Python package: scanner + AI pipeline + this API",
            "quantumsafe_web": "Vite React UI — consumes report JSON",
            "demo_samples": "Fixture repos under quantum_root / demo_samples",
            "pqc_scanner": "Optional: upstream Gemma JAX library for research / custom fine-tunes",
            "llm_assessment": "Google AI Studio: Gemini or Gemma model IDs via analyze_with_gemini",
            "scan_py": "CLI wrapper around the same pipeline as /api/v1/scan",
        },
    }


class ScanRequest(BaseModel):
    """Relative path under QUANTUM_ROOT (e.g. ``demo_samples``)."""

    root: str = Field(
        ...,
        max_length=4096,
        description="Directory to scan, relative to QUANTUM_ROOT",
    )
    use_ai: bool = Field(False, description="If true, call Gemini/Gemma for enriched report")
    model: str | None = Field(
        None,
        description="Model id (e.g. gemini-2.0-flash, gemma-2-9b-it)",
    )
    deep_context: bool = Field(
        False,
        description="Attach code snippets to the LLM prompt for deeper reasoning",
    )


@app.get("/api/v1/llm/defaults")
def llm_defaults():
    """Recommended models and env hints for the Scan UI."""
    return {
        "profiles": recommended_llm_profiles(),
        "env": {
            "GOOGLE_API_KEY": "or GOOGLE_AI_API_KEY — required when use_ai is true",
            "GEMINI_MODEL": "optional default when model omitted",
            "QUANTUMSAFE_GEMMA_MODEL": "default Gemma id when UI picks Gemma profile",
        },
    }


@app.post("/api/v1/scan")
@limiter.limit(_SCAN_RATE_LIMIT)
def scan(
    request: Request,  # noqa: ARG001
    payload: Annotated[ScanRequest, Body()],
):
    # ``request`` is required by slowapi for per-IP rate limiting.
    target = _safe_child_path(payload.root)
    if not target.is_dir():
        raise HTTPException(status_code=404, detail=f"Not a directory: {payload.root}")
    try:
        report = build_report(
            target,
            api_mode=payload.use_ai,
            model=payload.model,
            deep_context=payload.deep_context,
        )
    except EnvironmentError as e:
        detail = str(e) if _DEBUG else "Service unavailable"
        raise HTTPException(status_code=503, detail=detail) from e
    except Exception as e:
        detail = str(e) if _DEBUG else "Internal server error"
        raise HTTPException(status_code=500, detail=detail) from e
    return report
