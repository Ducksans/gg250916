from fastapi import APIRouter, HTTPException, Query
from pathlib import Path
import os

router = APIRouter(prefix="/api/files", tags=["files"])

# Resolve project root from environment (absolute, normalized)
ROOT = Path(os.environ.get("GUMGANG_PROJECT_ROOT", ".")).resolve()

# Ignore common heavy/noisy directories
IGNORE_DIRS = {".git", ".venv", "node_modules", "__pycache__", ".next", "dist", "build"}
# Safety cap to avoid huge responses
MAX_ITEMS = 5000


def _safe_base(rel: str | None) -> Path:
    """
    Safely resolve a base directory under the project root.
    """
    base = ROOT if not rel else (ROOT / rel)
    p = base.resolve()
    if not str(p).startswith(str(ROOT)):
        raise HTTPException(status_code=403, detail="path_outside_project")
    return p


def _list_tree(base: Path, depth: int, seen: list[int]) -> dict:
    """
    Recursively list directory structure up to 'depth'.
    - Returns a JSON-serializable dict with children for directories.
    - Tracks item count in 'seen' to enforce MAX_ITEMS.
    """
    rel_path = "" if base == ROOT else str(base.relative_to(ROOT))
    node = {"path": rel_path, "name": base.name or "root", "type": "dir", "children": []}

    if depth < 0:
        return node

    try:
        entries = sorted(
            base.iterdir(),
            key=lambda x: (x.is_file(), x.name.lower())
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"scan_error: {e}")

    for entry in entries:
        # Enforce global cap
        if seen[0] >= MAX_ITEMS:
            break

        name = entry.name
        if name in IGNORE_DIRS or name.startswith("."):
            continue

        if entry.is_dir():
            if depth > 0:
                child = _list_tree(entry, depth - 1, seen)
                node["children"].append(child)
                # Count a directory as 1 item as well
                seen[0] += 1
        else:
            try:
                size = entry.stat().st_size
            except Exception:
                size = None
            node["children"].append({
                "path": str(entry.relative_to(ROOT)),
                "name": name,
                "type": "file",
                "size": size
            })
            seen[0] += 1

    return node


@router.get("/tree")
def get_tree(
    path: str | None = Query(None, description="project-relative base directory (optional)"),
    depth: int = Query(2, ge=0, le=6, description="max recursion depth (0-6)")
):
    """
    Read-only directory tree API.
    - Lists files/dirs under the given base path (relative to project root).
    - Enforces project-root confinement and ignores heavy/noisy directories.
    - Returns a tree with up to MAX_ITEMS entries.
    """
    base = _safe_base(path)
    if not base.exists() or not base.is_dir():
        raise HTTPException(status_code=404, detail="dir_not_found")

    counter = [0]  # mutable counter to enforce MAX_ITEMS
    return _list_tree(base, depth, counter)
