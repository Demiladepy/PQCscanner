# Security

## Reporting vulnerabilities

If you find a security issue in QuantumSafe (scanner, gateway, or web UI), please report it privately so we can fix it before public disclosure. Include steps to reproduce, affected versions, and impact.

## Gateway hardening (operators)

The FastAPI gateway is intended to sit behind a reverse proxy in production. Recommended settings:

- **TLS**: Terminate HTTPS at your proxy; optionally set `Strict-Transport-Security` via the proxy.
- **CORS**: Set `CORS_ORIGINS` to an explicit comma-separated list of allowed web origins. Do not rely on localhost defaults in production.
- **Hosts**: Set `TRUSTED_HOSTS` to your gateway hostname(s), comma-separated, to enable Starlette `TrustedHostMiddleware`.
- **Public mode**: Set `QS_GATEWAY_PUBLIC=1` to omit internal paths (e.g. `quantum_root`) from `/api/v1/health`.
- **Errors**: Do not set `QS_DEBUG=1` in production; it may surface internal error details.
- **Rate limits**: `POST /api/v1/scan` is rate-limited per client IP (see `SCAN_RATE_LIMIT` in `quantumsafe/api_app.py`). Adjust for your deployment.

## Supply chain

CI runs `npm audit` (high severity and above) and `pip-audit` on `requirements.txt` (which includes `requirements-quantumsafe.txt`). Review Dependabot PRs before merging.

## Threat model (short)

- **Scan API** accepts a relative path under `QUANTUM_ROOT` and reads files on disk; only expose the gateway to trusted networks or authenticated clients.
- **LLM**: When `use_ai=true`, code snippets or summaries may be sent to Google AI per your model configuration; use only with appropriate data-handling policies.
