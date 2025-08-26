from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel
import subprocess
import shlex
import os
import re
from pathlib import Path
from typing import List, Dict, Any

router = APIRouter(prefix="/api/protocol/autocode", tags=["autocode"])

# Resolve project root from environment (fallback to current directory)
PROJECT_ROOT = Path(os.environ.get("GUMGANG_PROJECT_ROOT", str(Path(__file__).resolve().parents[3]))).resolve()


class RunReq(BaseModel):
    task: str


def _extract_touched(stdout: str) -> List[str]:
    """
    Extract touched file paths from AutoCoder stdout.
    Looks for a section starting with '---- TOUCHED ----'
    and captures lines like: 'path/to/file (123 bytes)'
    """
    touched: List[str] = []
    touched_mode = False
    for raw in stdout.splitlines():
        line = raw.strip()
        if not line:
            continue
        if line.startswith("---- TOUCHED ----"):
            touched_mode = True
            continue
        if touched_mode:
            m = re.match(r"^(?P<path>.+?)\s+\(\d+\s*bytes\)\s*$", line)
            if m:
                touched.append(m.group("path"))
    return touched


@router.post("/run")
def run_autocode(
    req: RunReq,
    approve_code: str | None = Header(None, alias="X-Approve-Code"),
) -> Dict[str, Any]:
    """
    Execute backend/tools/autocoder.py with the provided task.
    - Requires 'X-Approve-Code' header.
    - Runs with cwd=PROJECT_ROOT and inherits current environment.
    - Returns ok/code, stdout/stderr (tail), and a 'touched' list parsed from stdout.
    """
    if not approve_code or not approve_code.strip():
        raise HTTPException(status_code=403, detail="approval_required")

    script = PROJECT_ROOT / "backend" / "tools" / "autocoder.py"
    if not script.exists():
        raise HTTPException(status_code=404, detail="autocoder_not_found")

    # Prepare environment (inherit, override approval and default server if missing)
    env = dict(os.environ)
    env["GUMGANG_APPROVAL_CODE"] = approve_code
    env.setdefault("GUMGANG_SERVER", os.environ.get("GUMGANG_SERVER", "http://127.0.0.1:8000"))
    env.setdefault("OPENAI_API_BASE", "https://api.openai.com/v1")
    env.setdefault("OPENAI_MODEL", "gpt-4o-mini")

    # Compose command
    cmd = f'python3 "{script}" {shlex.quote(req.task)}'

    try:
        proc = subprocess.run(
            cmd,
            shell=True,
            capture_output=True,
            text=True,
            cwd=PROJECT_ROOT,
            env=env,
            timeout=180,
        )
    except subprocess.TimeoutExpired as e:
        raise HTTPException(status_code=504, detail=f"autocoder_timeout: {e}") from e
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"autocoder_failed_to_start: {e}") from e

    stdout = (proc.stdout or "")
    stderr = (proc.stderr or "")
    touched = _extract_touched(stdout)

    # Limit payload sizes to keep response reasonable
    stdout_tail = stdout[-4000:] if len(stdout) > 4000 else stdout
    stderr_tail = stderr[-2000:] if len(stderr) > 2000 else stderr

    return {
        "ok": proc.returncode == 0,
        "code": proc.returncode,
        "stdout": stdout_tail.strip(),
        "stderr": stderr_tail.strip(),
        "touched": touched,
    }
