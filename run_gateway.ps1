# QuantumSafe API gateway — run from monorepo root (QUANTUM directory)
Set-Location $PSScriptRoot
pip install -q -r requirements.txt
python -m uvicorn quantumsafe.api_app:app --host 127.0.0.1 --port 8765
