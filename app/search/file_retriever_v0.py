"""
Phase 2 — File Retriever v0 (whitelist, kw+mtime scoring, basic filters)

Purpose
- Provide a safe, lightweight file retriever for Unified Search (memory+files) pipeline.
- v0 uses keyword coverage + mtime-based recency (no embeddings) with strict path/size filters.
- Default: disabled at API level via FILE_RETRIEVER_ENABLED=false (Phase 2 is opt-in).

Outputs (Evidence shape)
{
  "source": "file",
  "path": "relative/project/path.ext",
  "snippet": "…a short excerpt containing a matched token…",
  "ts": "2025-08-25T06:00:00Z",
  "score": 0.73,
  "reason": { "kw": 0.8, "recency": 0.5, "refs": 0.0 }
}

Notes
- Whitelist is a directory-list boundary (relative to project root).
- Excludes common noisy/binary/third-party paths.
- Designed to be fast and safe; OK to run frequently.

Usage (library)
    from app.search.file_retriever_v0 import file_retriever_v0
    items = file_retriever_v0("search terms", k=5)

CLI (dev)
    python -m app.search.file_retriever_v0 "search terms" --k 5
"""

from __future__ import annotations

import argparse
import json
import os
import re
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional, Tuple


# ---------- Paths & Env (local, no external deps) ----------

THIS_FILE = Path(__file__).resolve()


def _find_project_root(start: Path) -> Path:
    """
    Heuristic: ascend until we find directory containing README.md and 'app' folder,
    otherwise fallback to 3 levels up (gumgang_meeting).
    """
    cur = start
    for p in [cur] + list(cur.parents):
        if (p / "README.md").exists() and (p / "app").is_dir():
            return p
    # fallback: gumgang_meeting/ (expected depth: app/search/file.py -> parents[2] == app; parents[3] == root)
    return start.parents[3]


PROJECT_ROOT = _find_project_root(THIS_FILE)
ENV_FILE = PROJECT_ROOT / ".env"


def _load_env(path: Path) -> Dict[str, str]:
    env: Dict[str, str] = {}
    if path.exists():
        for raw in path.read_text(encoding="utf-8").splitlines():
            line = raw.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            k, v = line.split("=", 1)
            env[k.strip()] = v.strip().strip('"').strip("'")
    # overlay with process environment (process > file)
    env.update({k: v for k, v in os.environ.items()})
    return env


ENV = _load_env(ENV_FILE)


def _relpath(p: Path) -> str:
    try:
        return str(p.relative_to(PROJECT_ROOT))
    except Exception:
        return str(p)


# ---------- Config (defaults for v0) ----------

DEFAULT_WHITELIST = [
    "docs",
    "projects",
    "status/evidence/logs",
    "status/design",
    "status/roadmap",
    "ui/proto",
    "ui/snapshots",
    "bridge",
    "app",  # allow code (py) for API contract discovery
]

DEFAULT_EXTS = {
    ".md",
    ".txt",
    ".json",
    ".py",
    ".ts",
    ".js",
    ".html",
    ".css",
    ".yaml",
    ".yml",
    ".rs",
    ".go",
    ".java",
    ".kt",
}

EXCLUDE_PATTERNS = [
    "/.git/",
    "/node_modules/",
    "/.venv/",
    "/.next/",
    "/dist/",
    "/build/",
    "/__pycache__/",
    "/.cache/",
    "/venv/",
    "/.ropeproject/",
    "/artifacts/",
    "/QUARANTINE/",
]

# Evidence/log-like subtrees we generally don't want to rank high from file channel
LOW_VALUE_HINTS = [
    "status/evidence/memory/recall_runs/",
    "status/evidence/memory/search_runs/",
    "status/evidence/ui_runtime/threads/",
]

MAX_BYTES_DEFAULT = 1_000_000  # 1 MB
SNIPPET_RADIUS = 160  # characters around first match
HALF_LIFE_DAYS_DEFAULT = 30.0


# ---------- Helpers ----------


def _is_excluded_path(p: Path) -> bool:
    s = str(p.as_posix())
    for pat in EXCLUDE_PATTERNS:
        if pat in s:
            return True
    return False


def _maybe_binary(head: bytes) -> bool:
    # crude binary detector: NUL bytes or very high non-text ratio
    if b"\x00" in head:
        return True
    # Allow UTF-8-ish text; consider binary if too many non-printables
    textish = sum(1 for b in head if 9 <= b <= 13 or 32 <= b <= 126 or b >= 128)
    return textish < max(1, int(len(head) * 0.6))


_token_re = re.compile(r"[A-Za-z0-9가-힣_]+")


def _tokens(s: str) -> List[str]:
    return [t for t in _token_re.findall(s.lower()) if t]


def _kw_score(query_tokens: List[str], text: str) -> float:
    if not query_tokens:
        return 0.0
    bag = set(_tokens(text))
    if not bag:
        return 0.0
    inter = len(set(query_tokens) & bag)
    return min(1.0, inter / float(len(set(query_tokens))))


def _recency_score(ts: float, half_life_days: float) -> float:
    # ts: POSIX seconds (mtime)
    try:
        now = datetime.now(timezone.utc).timestamp()
        age_days = max(0.0, (now - ts) / 86400.0)
        return 1.0 / (1.0 + (age_days / max(0.1, half_life_days)))
    except Exception:
        return 0.0


def _read_text_safely(p: Path, max_bytes: int) -> Tuple[str, float]:
    """
    Returns (text, mtime_utc_ts). On binary/too-large files returns ("", mtime).
    """
    try:
        st = p.stat()
        if st.st_size > max_bytes:
            return ("", st.st_mtime)
        with p.open("rb") as f:
            head = f.read(min(4096, max_bytes))
            if _maybe_binary(head):
                return ("", st.st_mtime)
            rest = f.read(max(0, max_bytes - len(head)))
            data = head + rest
        text = data.decode("utf-8", errors="ignore")
        return (text, st.st_mtime)
    except Exception:
        try:
            mtime = p.stat().st_mtime
        except Exception:
            mtime = 0.0
        return ("", mtime)


def _find_snippet(text: str, qtokens: List[str], radius: int = SNIPPET_RADIUS) -> str:
    if not text:
        return ""
    # pick first token occurrence
    low = text.lower()
    for t in qtokens:
        i = low.find(t.lower())
        if i >= 0:
            start = max(0, i - radius)
            end = min(len(text), i + len(t) + radius)
            snip = text[start:end].strip().replace("\n", " ")
            return ("…" if start > 0 else "") + snip + ("…" if end < len(text) else "")
    # fallback: start of file
    return text[: 2 * radius].strip().replace("\n", " ") + ("…" if len(text) > 2 * radius else "")


@dataclass
class FileEvidence:
    source: str
    path: str
    snippet: str
    ts: str
    score: float
    reason: Dict[str, float]

    def to_dict(self) -> Dict[str, Any]:
        return {
            "source": self.source,
            "path": self.path,
            "snippet": self.snippet,
            "ts": self.ts,
            "score": float(self.score),
            "reason": {k: float(v) for k, v in self.reason.items()},
        }


def _iter_candidate_files(roots: List[Path], allow_exts: Iterable[str]) -> Iterable[Path]:
    exts = {e.lower() for e in allow_exts}
    seen: set = set()
    for root in roots:
        if not root.exists() or not root.is_dir():
            continue
        for p in root.rglob("*"):
            if not p.is_file():
                continue
            if _is_excluded_path(p):
                continue
            if p.suffix.lower() not in exts:
                continue
            # dedup by canonical path
            key = p.resolve()
            if key in seen:
                continue
            seen.add(key)
            yield p


def _resolve_whitelist_dirs(whitelist: Optional[List[str]]) -> List[Path]:
    wl = whitelist or []
    out: List[Path] = []
    for entry in wl:
        entry = entry.strip().strip("/")
        if not entry:
            continue
        out.append(PROJECT_ROOT / entry)
    return out


def file_retriever_v0(
    query: str,
    k: int = 5,
    whitelist: Optional[List[str]] = None,
    extensions: Optional[Iterable[str]] = None,
    half_life_days: float = HALF_LIFE_DAYS_DEFAULT,
    max_bytes: int = MAX_BYTES_DEFAULT,
) -> List[Dict[str, Any]]:
    """
    Search whitelisted directories for text/code files and rank by:
      score = 1.0*kw + 0.6*recency
    Returns top-k FileEvidence dicts.
    """
    q = (query or "").strip()
    if not q:
        return []
    qtokens = _tokens(q)

    # Resolve whitelist (from args or .env FILE_WHITELIST or DEFAULT)
    wl_env = ENV.get("FILE_WHITELIST", "")
    wl = whitelist if whitelist is not None else (
        [w.strip() for w in wl_env.split(",") if w.strip()] or list(DEFAULT_WHITELIST)
    )
    roots = _resolve_whitelist_dirs(wl)

    allow_exts = set(extensions) if extensions else set(DEFAULT_EXTS)

    items: List[FileEvidence] = []
    for fp in _iter_candidate_files(roots, allow_exts):
        # Soft de-prioritize low-value evidence trees by skipping here in v0
        rp = _relpath(fp)
        if any(hint in rp for hint in LOW_VALUE_HINTS):
            continue

        text, mtime = _read_text_safely(fp, max_bytes=max_bytes)
        if not text:
            continue

        s_kw = _kw_score(qtokens, text)
        if s_kw <= 0.0:
            continue  # quick reject when no coverage
        s_rec = _recency_score(mtime, half_life_days)
        score = 1.0 * s_kw + 0.6 * s_rec

        ev = FileEvidence(
            source="file",
            path=rp,
            snippet=_find_snippet(text, qtokens),
            ts=datetime.fromtimestamp(mtime, tz=timezone.utc).isoformat().replace("+00:00", "Z"),
            score=score,
            reason={"kw": s_kw, "recency": s_rec, "refs": 0.0},
        )
        items.append(ev)

    # sort and cut
    items.sort(key=lambda e: (e.score, e.ts), reverse=True)
    top = items[: max(1, min(100, int(k or 5)))]

    return [e.to_dict() for e in top]


# ---------- CLI (development aid) ----------


def _cli() -> None:
    ap = argparse.ArgumentParser(description="File Retriever v0 (kw+mtime)")
    ap.add_argument("query", type=str, help="search query")
    ap.add_argument("--k", type=int, default=5)
    ap.add_argument(
        "--whitelist",
        type=str,
        default=ENV.get("FILE_WHITELIST", ",".join(DEFAULT_WHITELIST)),
        help="comma-separated relative dirs (project root)",
    )
    ap.add_argument(
        "--exts",
        type=str,
        default=",".join(sorted(DEFAULT_EXTS)),
        help="comma-separated file extensions (e.g., .md,.py,.txt)",
    )
    ap.add_argument("--half-life-days", type=float, default=HALF_LIFE_DAYS_DEFAULT)
    ap.add_argument("--max-bytes", type=int, default=MAX_BYTES_DEFAULT)
    args = ap.parse_args()

    wl = [w.strip() for w in (args.whitelist or "").split(",") if w.strip()]
    ex = [e if e.startswith(".") else f".{e}" for e in (args.exts or "").split(",") if e.strip()]

    res = file_retriever_v0(
        query=args.query,
        k=args.k,
        whitelist=wl,
        extensions=ex,
        half_life_days=args.half_life_days,
        max_bytes=args.max_bytes,
    )
    print(json.dumps({"ok": True, "items": res, "meta": {"count": len(res)}}, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    _cli()
