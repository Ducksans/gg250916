# -*- coding: utf-8 -*-
"""
Gumgang 2.0 — AutoCoder
- Calls an OpenAI-compatible API to produce a JSON plan of file changes
- Applies changes safely within the repository
- Records a server-side checkpoint via /api/protocol/checkpoint (requires X-Approve-Code)
- Never touches immutable assets (.rules, docs/blueprint_v1.2.md)

Environment (override as needed):
  GUMGANG_PROJECT_ROOT=/home/duksan/바탕화면/gumgang_0_5
  OPENAI_API_BASE=https://api.openai.com/v1
  OPENAI_API_KEY=YOUR_API_KEY
  OPENAI_MODEL=gpt-5
  GUMGANG_APPROVAL_CODE=GO-ZED-ESCAPE-01
  GUMGANG_SERVER=http://127.0.0.1:8000

Usage:
  python3 backend/tools/autocoder.py "Create docs/ideas/HOWTO-ZED-ESCAPE.md with a 7-step checklist"
"""

import os
import json
import difflib
import pathlib
import requests
import datetime
import sys
from typing import Dict, Any, List, Tuple

# Optional: load .env (backend/.env, then project root .env). Safe no-op if unavailable.
try:
    from dotenv import load_dotenv
    load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "..", ".env"))
    load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "..", "..", ".env"))
except Exception:
    pass

# -------- Config --------
ROOT = pathlib.Path(os.environ.get("GUMGANG_PROJECT_ROOT", ".")).resolve()
API_BASE = os.environ.get("OPENAI_API_BASE", "https://api.openai.com/v1")
API_KEY = os.environ.get("OPENAI_API_KEY", "YOUR_API_KEY")
MODEL = os.environ.get("OPENAI_MODEL", "gpt-4o-mini")
APPROVE = os.environ.get("GUMGANG_APPROVAL_CODE", "GO-ZED-ESCAPE-01")
SERVER = os.environ.get("GUMGANG_SERVER", "http://127.0.0.1:8000")
APPROVE_HEADER = "X-Approve-Code"

SYS = """You are an AutoCoder for the Gumgang 2.0 project. Output ONLY valid JSON matching:
{"message": str,
 "changes":[{"path": str, "old": str|null, "new": str}]}
- paths are repo-relative; 'new' is whole-file content; no extra keys.
- Do not include code fences or commentary or any surrounding text.
- Unless the task explicitly says "replace exactly" (or "replace the entire contents exactly"),
  you MUST preserve existing content and perform minimal changes (prefer append at the end).
- If the task says "Append at the end", do not alter existing lines; add new content strictly after existing content.
- In this project, the term "Zed" refers to the code editor (NOT a camera SDK).
- The final output must be a single JSON object with only the keys {"message","changes"}."""

IMMUTABLE_PATHS = {
    ".rules",
    "docs/blueprint_v1.2.md",
}

# -------- Helpers --------
def is_path_under_root(path: pathlib.Path, root: pathlib.Path) -> bool:
    try:
        path.resolve().relative_to(root.resolve())
        return True
    except Exception:
        return False

def normalize_repo_path(p: str) -> str:
    # Strip leading "./" and backslashes on Windows-like paths
    p = p.strip().lstrip("./").replace("\\", "/")
    return p

def unified_diff(old_text: str, new_text: str, rel_path: str) -> str:
    return "".join(
        difflib.unified_diff(
            old_text.splitlines(keepends=True),
            new_text.splitlines(keepends=True),
            fromfile=f"a/{rel_path}",
            tofile=f"b/{rel_path}",
            n=3,
        )
    )

def parse_llm_json(txt: str) -> Dict[str, Any]:
    # Some models may wrap with ```json ... ```
    t = txt.strip()
    if t.startswith("```"):
        # Remove first fence
        t = t.split("```", 2)
        if len(t) >= 2:
            # After split, t[1] may start with 'json\n'
            candidate = t[1]
            if candidate.lstrip().lower().startswith("json"):
                candidate = candidate.split("\n", 1)[1] if "\n" in candidate else ""
            t = candidate
        else:
            t = txt
    return json.loads(t)

def ask_llm(task: str, context: str) -> Dict[str, Any]:
    payload = {
        "model": MODEL,
        "messages": [
            {"role": "system", "content": SYS},
            {
                "role": "user",
                "content": f"Repo root: {str(ROOT)}\nTask:\n{task}\n\nContext:\n{context}\n",
            },
        ],
        # sampling params removed for compatibility
    }
    # Remove potentially unsupported sampling params defensively
    for k in ("temperature", "top_p", "presence_penalty", "frequency_penalty"):
        payload.pop(k, None)
    headers = {
        "Authorization": f"Bearer {API_KEY}",
        "Content-Type": "application/json",
    }
    r = requests.post(f"{API_BASE}/chat/completions", headers=headers, json=payload, timeout=90)
    if r.status_code >= 400:
        raise RuntimeError(f"LLM error {r.status_code}: {r.text[:300]}")
    data = r.json()
    txt = data["choices"][0]["message"]["content"]
    return parse_llm_json(txt)

def apply_changes(plan: Dict[str, Any]) -> Tuple[str, List[Tuple[str, int]]]:
    """
    Apply changes from plan.
    Returns:
      - unified diff string (all files concatenated)
      - list of (repo_rel_path, size_bytes) for created/updated files
    """
    changes = plan.get("changes") or []
    patch_all: List[str] = []
    touched: List[Tuple[str, int]] = []

    for ch in changes:
        rel = normalize_repo_path(ch["path"])
        # Immutable guard
        if rel in IMMUTABLE_PATHS:
            raise RuntimeError(f"Refusing to modify immutable path: {rel}")

        dst = (ROOT / rel).resolve()
        if not is_path_under_root(dst, ROOT):
            raise RuntimeError(f"Refusing to write outside project root: {dst}")

        # Ensure parent exists
        dst.parent.mkdir(parents=True, exist_ok=True)

        # Read old content from disk (preferred), fallback to provided 'old'
        old_disk = ""
        if dst.exists() and dst.is_file():
            try:
                old_disk = dst.read_text(encoding="utf-8", errors="ignore")
            except Exception:
                old_disk = ""
        old_for_diff = old_disk if old_disk is not None else (ch.get("old") or "")

        new_text = ch["new"]
        patch_all.append(unified_diff(old_for_diff, new_text, rel))

        # Write new content
        dst.write_text(new_text, encoding="utf-8")
        size = dst.stat().st_size if dst.exists() else 0
        touched.append((rel, size))

    return ("\n".join(patch_all)).strip(), touched

def checkpoint(message: str, paths: List[str]) -> Tuple[bool, str]:
    """
    Try /api/protocol/checkpoint first; fallback to git endpoints.
    Returns (ok, http_status_or_error)
    """
    headers = {APPROVE_HEADER: APPROVE, "Content-Type": "application/json"}
    ts = datetime.datetime.now().strftime("%Y-%m-%d %H:%M")
    payloads: List[Tuple[str, Dict[str, Any]]] = [
        ("/api/protocol/checkpoint", {
            "task_id": "AUTOCODER",
            "operation": "edit",
            "paths": paths or [],
            "notes": f"{message} @ {ts}",
            "risk": "SAFE",
            "actor": "autocoder",
        }),
        ("/api/git/checkpoint", {"message": message}),
        ("/api/git/autosave", {"message": message}),
        ("/api/git/backup", {"message": message}),
    ]
    for path, body in payloads:
        try:
            r = requests.post(f"{SERVER}{path}", headers=headers, json=body, timeout=10)
            if r.status_code < 400:
                print(f"[CHECKPOINT] path={path} code={r.status_code}")
                return True, str(r.status_code)
        except Exception:
            pass
    print("[CHECKPOINT] skipped (no available endpoint)")
    return False, "skipped"

def gather_context(max_dirs: int = 20) -> str:
    try:
        entries = []
        for p in ROOT.iterdir():
            if p.is_dir():
                entries.append(p.name + "/")
            elif p.is_file():
                entries.append(p.name)
            if len(entries) >= max_dirs:
                break
        return "Top-level entries: " + ", ".join(sorted(entries))
    except Exception:
        return "Top-level entries: (unavailable)"

def main() -> int:
    if not ROOT.exists():
        print(f"[ERROR] Project root does not exist: {ROOT}")
        return 2

    task = sys.argv[1] if len(sys.argv) > 1 else "Create docs/ideas/HOWTO-ZED-ESCAPE.md with a 7-step checklist"
    context = gather_context()

    # 1) Ask LLM for plan
    try:
        plan = ask_llm(task, context)
    except Exception as e:
        print(f"[ERROR] LLM request failed: {e}")
        return 3

    print("[PLAN]", plan.get("message", "(no message)"))

    # 2) Apply plan
    try:
        patch, touched = apply_changes(plan)
    except Exception as e:
        print(f"[ERROR] Apply failed: {e}")
        return 4

    # 3) Checkpoint
    paths = [p for (p, _size) in touched]
    ok, status = checkpoint(plan.get("message", "autocoder change"), paths)
    print(f"[CHECKPOINT] attempted=yes status={status} ok={ok}")

    # 4) Output patch preview
    print("---- PATCH ----")
    if patch:
        # Limit preview to ~2000 chars for readability
        print(patch[:2000])
    else:
        print("(no changes)")

    # 5) Summary of touched files
    if touched:
        print("---- TOUCHED ----")
        for rel, size in touched:
            print(f"{rel} ({size} bytes)")

    print("DONE.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
