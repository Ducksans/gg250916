from fastapi import APIRouter, HTTPException, Query
from pathlib import Path
import os

router = APIRouter(prefix="/api/files", tags=["files"])

# Resolve project root from environment (absolute, normalized)
PROJECT_ROOT = Path(os.environ.get("GUMGANG_PROJECT_ROOT", ".")).resolve()


def _safe_join(rel_path: str) -> Path:
    """
    Safely resolve a project-relative path to an absolute file path
    within PROJECT_ROOT. Reject paths that escape the project root,
    missing paths, or non-file targets.
    """
    if not rel_path or rel_path.strip() == "":
        raise HTTPException(status_code=400, detail="invalid_path")

    # Normalize and resolve against project root
    candidate = (PROJECT_ROOT / rel_path).resolve()

    # Ensure the resolved path is inside the project root
    if not str(candidate).startswith(str(PROJECT_ROOT)):
        raise HTTPException(status_code=403, detail="path_outside_project")

    # Ensure it exists and is a file
    if not candidate.exists() or not candidate.is_file():
        raise HTTPException(status_code=404, detail="file_not_found")

    return candidate


@router.get("/read")
def read_file(path: str = Query(..., description="Project-relative file path to read (UTF-8, read-only)")):
    """
    Read a project file safely (UTF-8, errors=replace) and return a JSON payload:
      { "path": "<relative>", "size": <character_count>, "content": "<text>" }

    - Rejects paths that attempt to escape the project root.
    - No write/delete operations are performed.
    """
    fp = _safe_join(path)
    try:
        text = fp.read_text(encoding="utf-8", errors="replace")
    except Exception as e:
        # Hide internal details but provide a readable hint
        raise HTTPException(status_code=500, detail=f"read_error: {e}")

    return {
        "path": path,
        "size": len(text),  # number of characters
        "content": text,
    }
