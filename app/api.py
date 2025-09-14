"""
FastAPI backend for Gumgang Meeting features (BT-10)
- CORS enabled for bridge (3037) and local contexts
- Minimal skeleton endpoints for:
  - Capture: /api/meetings/capture
  - Annotate: /api/meetings/annotate
  - Record Start: /api/meetings/record/start
  - Record Stop: /api/meetings/record/stop
  - Events Read: /api/meetings/{meeting_id}/events
- Evidence writes under: gumgang_meeting/status/evidence/meetings/<meeting_id>/
"""

from __future__ import annotations
from datetime import datetime

import json
import fcntl
import time
import os
import re
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional, Tuple

from fastapi import Body, FastAPI, File, Form, HTTPException, UploadFile, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from app.gate_utils import (
    verify_gate_token,
    make_gate_token,
    append_audit,
    compute_source_diversity,
    pii_scan_and_redact,
    sha256_text,
    ulid,
    extract_source_root,
)

# ---------- Paths & Env ----------

THIS_FILE = Path(__file__).resolve()
PROJECT_ROOT = THIS_FILE.parent.parent  # gumgang_meeting/
STATUS_ROOT = PROJECT_ROOT / "status"
EVIDENCE_ROOT = STATUS_ROOT / "evidence"
MEETINGS_ROOT = EVIDENCE_ROOT / "meetings"
SITEMAP_ROOT = EVIDENCE_ROOT / "sitemap"
GRAPH_RUNS_ROOT = SITEMAP_ROOT / "graph_runs"
SITEGRAPH_FILE_NAME = "sitegraph.json"
ENV_FILE = PROJECT_ROOT / ".env"  # rules v3.0 authoritative env

# Create minimal directories (safe to call multiple times)
for p in (STATUS_ROOT, EVIDENCE_ROOT, MEETINGS_ROOT, SITEMAP_ROOT, GRAPH_RUNS_ROOT):
    p.mkdir(parents=True, exist_ok=True)


def load_env(path: Path) -> Dict[str, str]:
    env: Dict[str, str] = {}
    if path.exists():
        for raw in path.read_text(encoding="utf-8").splitlines():
            line = raw.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            k, v = line.split("=", 1)
            env[k.strip()] = v.strip().strip('"').strip("'")
    # Overlay with process env (process > file)
    env.update({k: v for k, v in os.environ.items()})
    return env


ENV = load_env(ENV_FILE)

# ---------- Utilities ----------


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="milliseconds").replace("+00:00", "Z")


SAFE_ID_RE = re.compile(r"[^a-zA-Z0-9._-]+")


def safe_id(s: str, fallback: str) -> str:
    s = (s or "").strip()
    if not s:
        return fallback
    t = SAFE_ID_RE.sub("_", s)
    t = t.strip("._-")
    return t or fallback


def ensure_meeting_dir(meeting_id: str) -> Path:
    mdir = MEETINGS_ROOT / meeting_id
    (mdir / "attachments").mkdir(parents=True, exist_ok=True)
    return mdir


def prune_filename(name: str, default: str = "blob.bin") -> str:
    base = os.path.basename(name or default)
    base = SAFE_ID_RE.sub("_", base)
    base = base.strip("._-") or default
    return base[:180]


def relpath(p: Path) -> str:
    try:
        return str(p.resolve().relative_to(PROJECT_ROOT))
    except Exception:
        return str(p)


def append_jsonl(path: Path, obj: Dict[str, Any]) -> int:
    data = (json.dumps(obj, ensure_ascii=False) + "\n").encode("utf-8")
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("ab") as f:
        f.write(data)
    return len(data)


def write_bytes(path: Path, content: Iterable[bytes]) -> int:
    path.parent.mkdir(parents=True, exist_ok=True)
    n = 0
    with path.open("wb") as f:
        for chunk in content:
            if not chunk:
                continue
            f.write(chunk)
            n += len(chunk)
    return n


# ---------- Pydantic Schemas ----------


class CapturePayload(BaseModel):
    # Arbitrary JSON payload for capture metadata (window title, url, etc.)
    meta: Dict[str, Any] = Field(default_factory=dict)


class CaptureRequest(BaseModel):
    meetingId: str = Field(..., description="Logical meeting/session id")
    ts: Optional[str] = Field(default=None, description="ISO8601; default=now")
    note: Optional[str] = Field(default=None, description="Optional note")
    mode: Optional[str] = Field(default=None, description="UI mode hint, e.g., SAFE/NORMAL")
    payload: Optional[CapturePayload] = None


class AnnotateRequest(BaseModel):
    meetingId: str
    ts: Optional[str] = None
    target: Optional[str] = Field(
        default=None, description="Attachment path or logical target id"
    )
    text: Optional[str] = Field(default=None, description="Freeform note")
    shapes: Optional[List[Dict[str, Any]]] = Field(
        default=None, description="Vector annotations (skeleton)"
    )
    mode: Optional[str] = Field(default=None, description="UI mode hint, e.g., SAFE/NORMAL")


class RecordStartRequest(BaseModel):
    meetingId: str
    ts: Optional[str] = None
    meta: Dict[str, Any] = Field(default_factory=dict)
    mode: Optional[str] = Field(default=None, description="UI mode hint, e.g., SAFE/NORMAL")


class RecordStopRequest(BaseModel):
    meetingId: str
    ts: Optional[str] = None
    meta: Dict[str, Any] = Field(default_factory=dict)
    stats: Optional[Dict[str, Any]] = None
    mode: Optional[str] = Field(default=None, description="UI mode hint, e.g., SAFE/NORMAL")


# ---------- Store (append-only JSONL) ----------


class MeetingStore:
    def __init__(self, root: Path) -> None:
        self.root = root

    def events_path(self, meeting_id: str) -> Path:
        return ensure_meeting_dir(meeting_id) / "events.jsonl"

    def index_path(self, meeting_id: str) -> Path:
        return ensure_meeting_dir(meeting_id) / "index.json"

    def append_event(self, meeting_id: str, event: Dict[str, Any]) -> Dict[str, Any]:
        events = self.events_path(meeting_id)
        bytes_written = append_jsonl(events, event)
        # Light index update (non-critical)
        idx_path = self.index_path(meeting_id)
        index = {
            "meeting_id": meeting_id,
            "last_ts": event.get("ts") or now_iso(),
            "updated_at": now_iso(),
        }
        try:
            idx_path.write_text(json.dumps(index, ensure_ascii=False, indent=2), encoding="utf-8")
        except Exception:
            pass
        return {
            "ok": True,
            "bytes_written": bytes_written,
            "events_path": relpath(events),
            "index_path": relpath(idx_path),
        }


STORE = MeetingStore(MEETINGS_ROOT)

# ---------- FastAPI ----------

app = FastAPI(
    title="Gumgang Meeting Backend",
    version="0.1.0",
    docs_url="/api/docs",
    openapi_url="/api/openapi.json",
    redoc_url=None,
)
# Mount chat gateway router (FastAPI /api/chat and /api/chat/stream)
from gumgang_0_5.backend.app.api.routes import chat_gateway as _gg_chat
app.include_router(_gg_chat.router)

# ---------- Checkpoints (BT-14 ST-1402) ----------

# Paths
CKPT_DIR = STATUS_ROOT / "checkpoints"
CKPT_JSONL = CKPT_DIR / "CKPT_72H_RUN.jsonl"
CKPT_DIR.mkdir(parents=True, exist_ok=True)

# Models
class CkptAppendReq(BaseModel):
    run_id: str
    scope: str
    decision: str
    next_step: str
    evidence: str
    idempotency_key: Optional[str] = None

# Helpers
def _canonical_json_for_hash(core: Dict[str, Any]) -> str:
    # Canonical minified JSON with sorted keys
    return json.dumps(core, ensure_ascii=False, separators=(",", ":"), sort_keys=True)

def _valid_evidence_path(path_str: str) -> bool:
    if not isinstance(path_str, str) or not path_str or len(path_str) > 512:
        return False
    # Must be repo-relative under gumgang_meeting/**
    if os.path.isabs(path_str):
        return False
    return path_str.startswith("gumgang_meeting/")

def _ckpt_read_all(fp: Path) -> List[Dict[str, Any]]:
    if not fp.exists():
        return []
    out: List[Dict[str, Any]] = []
    with fp.open("r", encoding="utf-8") as f:
        for line in f:
            line = line.rstrip("\n")
            if not line:
                continue
            try:
                out.append(json.loads(line))
            except Exception:
                # stop on corrupt tail
                break
    return out

def _ckpt_read_tail(fp: Path) -> Optional[Dict[str, Any]]:
    items = _ckpt_read_all(fp)
    return items[-1] if items else None

def _ckpt_chain_status(fp: Path) -> Dict[str, Any]:
    items = _ckpt_read_all(fp)
    prev = "0" * 64
    ok = True
    break_idx: Optional[int] = None
    for i, it in enumerate(items):
        core = {k: it[k] for k in ("run_id", "scope", "decision", "next_step", "evidence") if k in it}
        canonical = _canonical_json_for_hash(core) + "\n" + prev
        expect = sha256_text(canonical)
        if it.get("this_hash") != expect:
            ok = False
            break_idx = i
            break
        prev = it.get("this_hash") or ""
    last = items[-1] if items else None
    return {
        "chain_ok": ok,
        "break_index": break_idx,
        "last_hash": (last or {}).get("this_hash"),
        "last_ts": (last or {}).get("utc_ts"),
        "last_seq": (last or {}).get("seq"),
        "count": len(items),
    }

def _append_ckpt_line(record: Dict[str, Any]) -> Dict[str, Any]:
    CKPT_DIR.mkdir(parents=True, exist_ok=True)
    # Safe append with lock + fsync
    import fcntl  # local import to avoid top-level changes
    line = json.dumps(record, ensure_ascii=False) + "\n"
    b = line.encode("utf-8")
    with CKPT_JSONL.open("ab") as f:
        fcntl.flock(f.fileno(), fcntl.LOCK_EX)
        try:
            f.write(b)
            f.flush()
            os.fsync(f.fileno())
        finally:
            fcntl.flock(f.fileno(), fcntl.LOCK_UN)
    return record

# Endpoints
@app.post("/api/checkpoints/append")
def checkpoints_append(body: CkptAppendReq = Body(...)) -> Dict[str, Any]:
    # Validate fields
    for k in ("run_id", "scope", "decision", "next_step", "evidence"):
        if not getattr(body, k):
            raise HTTPException(status_code=422, detail="FIELDS_MISSING")
    if not _valid_evidence_path(body.evidence):
        raise HTTPException(status_code=422, detail="INVALID_EVIDENCE_PATH")

    # Determine tail and prev hash under lock by reusing append lock after recompute
    last = _ckpt_read_tail(CKPT_JSONL)
    prev_hash = str((last.get("this_hash") if last else "0" * 64) or ("0" * 64))
    # Server time and seq
    now_ts = now_iso()
    last_ts = (last or {}).get("utc_ts")
    seq = (last or {}).get("seq") or 0
    seq = seq + 1 if last_ts == now_ts else 1

    core = {
        "run_id": body.run_id,
        "scope": body.scope,
        "decision": body.decision,
        "next_step": body.next_step,
        "evidence": body.evidence,
    }
    canonical = str(_canonical_json_for_hash(core)) + "\n" + str(prev_hash)
    this_hash = sha256_text(canonical)

    # Duplicate detection (idempotency): reject if core equals last record
    if last:
        last_core = {k: last.get(k) for k in ("run_id", "scope", "decision", "next_step", "evidence")}
        if last_core == core:
            raise HTTPException(status_code=409, detail="DUP")

    record = {
        **core,
        "utc_ts": now_ts,
        "seq": seq,
        "prev_hash": prev_hash,
        "this_hash": this_hash,
        "writer": "app",
    }
    saved = _append_ckpt_line(record)
    return {"ok": True, "data": saved, "meta": {"ts": now_iso()}}

@app.get("/api/checkpoints/view")
def checkpoints_view(date: Optional[str] = None, fmt: str = "md") -> Any:
    items = _ckpt_read_all(CKPT_JSONL)
    if date:
        items = [it for it in items if isinstance(it.get("utc_ts"), str) and it["utc_ts"][:10] == date]
    if fmt.lower() == "json":
        return {"ok": True, "items": items, "meta": _ckpt_chain_status(CKPT_JSONL)}
    # Render MD-like 6-line blocks
    blocks: List[str] = []
    for it in items:
        blocks.extend(
            [
                f"RUN_ID: {it.get('run_id','')}",
                f"UTC_TS: {it.get('utc_ts','')}" + (f" (seq:{it.get('seq')})" if it.get("seq") else ""),
                f"SCOPE: {it.get('scope','')}",
                f"DECISION: {it.get('decision','')}",
                f"NEXT STEP: {it.get('next_step','')}",
                f"EVIDENCE: {it.get('evidence','')}",
                "",
            ]
        )
    text = "\n".join(blocks or ["(no entries)"])
    return {"ok": True, "view": text, "meta": _ckpt_chain_status(CKPT_JSONL)}

@app.get("/api/checkpoints/tail")
def checkpoints_tail(n: int = 50) -> Dict[str, Any]:
    items = _ckpt_read_all(CKPT_JSONL)
    tail_items = items[-max(1, min(1000, n)) :]
    tail_items.reverse()
    status = _ckpt_chain_status(CKPT_JSONL)
    return {"ok": True, "chain_status": "OK" if status["chain_ok"] else "FAIL", "last_hash": status["last_hash"], "last_ts": status["last_ts"], "last_seq": status["last_seq"], "items": tail_items}

@app.get("/api/sitegraph/latest")
def sitegraph_latest(lens: str = "Core") -> Dict[str, Any]:
    # Return latest SiteGraph snapshot JSON from status/evidence/sitemap/graph_runs/<date>/sitegraph.json
    try:
        GRAPH_RUNS_ROOT.mkdir(parents=True, exist_ok=True)
        dirs = [p for p in GRAPH_RUNS_ROOT.iterdir() if p.is_dir()]
    except Exception:
        dirs = []
    if not dirs:
        raise HTTPException(status_code=404, detail="NO_SNAPSHOT")
    latest_dir = sorted(dirs, key=lambda p: p.name, reverse=True)[0]
    fp = latest_dir / SITEGRAPH_FILE_NAME
    if not fp.exists():
        raise HTTPException(status_code=404, detail="SNAPSHOT_MISSING")
    try:
        data = json.loads(fp.read_text(encoding="utf-8"))
    except Exception:
        raise HTTPException(status_code=500, detail="SNAPSHOT_READ_FAIL")

    meta = data.get("meta") if isinstance(data, dict) else None
    # Soft lens check; client may ignore mismatch
    return {
        "ok": True,
        "path": relpath(fp),
        "dir": relpath(latest_dir),
        "lens": (meta or {}).get("lens"),
        "data": data,
    }


@app.get("/api/delta/latest")
def delta_latest(
    lens: Optional[str] = None,
    limit: int = 50,
    tags: Optional[str] = None,
    severity: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Read-only latest Delta cards snapshot.
    Source: status/evidence/ops/delta_runs/<date>/delta.json
    Filters: lens (optional), tags (comma list), severity(info|warn|err), limit(1..100)
    """
    base = EVIDENCE_ROOT / "ops" / "delta_runs"
    try:
        base.mkdir(parents=True, exist_ok=True)
        dirs = [p for p in base.iterdir() if p.is_dir()]
    except Exception:
        dirs = []
    if not dirs:
        raise HTTPException(status_code=404, detail="NO_SNAPSHOT")
    latest_dir = sorted(dirs, key=lambda p: p.name, reverse=True)[0]
    fp = latest_dir / "delta.json"
    if not fp.exists():
        raise HTTPException(status_code=404, detail="SNAPSHOT_MISSING")
    try:
        raw = json.loads(fp.read_text(encoding="utf-8"))
    except Exception:
        raise HTTPException(status_code=500, detail="SNAPSHOT_READ_FAIL")

    cards = []
    if isinstance(raw, dict):
        cards = raw.get("cards") or raw.get("items") or []
    if not isinstance(cards, list):
        cards = []

    # Build filters
    tag_set = set(
        t.strip() for t in (tags or "").split(",") if t and t.strip()
    ) if tags else set()

    def keep(card: Dict[str, Any]) -> bool:
        if severity and str(card.get("severity") or "").lower() != severity.lower():
            return False
        if lens and card.get("lens"):
            if str(card.get("lens")) != str(lens):
                return False
        if tag_set:
            ctags = set(card.get("tags") or [])
            if not (ctags & tag_set):
                return False
        return True

    filtered = [c for c in cards if keep(c)]
    if not filtered:
        raise HTTPException(status_code=404, detail="NO_CARDS")

    # Limit
    limit = max(1, min(100, int(limit or 50)))
    filtered = filtered[:limit]

    meta = {}
    if isinstance(raw, dict):
        meta = dict(raw.get("meta") or {})
    meta["count"] = len(filtered)

    out = {"meta": meta, "cards": filtered}
    return {"ok": True, "path": relpath(fp), "dir": relpath(latest_dir), "data": out}


@app.get("/api/alignment/latest")
def alignment_latest(
    lens: Optional[str] = None,
    limit: int = 50,
    tags: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Read-only latest Alignment cards snapshot.
    Source: status/evidence/ops/alignment_runs/<date>/alignment.json
    Filters: lens (optional), tags (comma list), limit(1..100)
    """
    base = EVIDENCE_ROOT / "ops" / "alignment_runs"
    try:
        base.mkdir(parents=True, exist_ok=True)
        dirs = [p for p in base.iterdir() if p.is_dir()]
    except Exception:
        dirs = []
    if not dirs:
        raise HTTPException(status_code=404, detail="NO_SNAPSHOT")
    latest_dir = sorted(dirs, key=lambda p: p.name, reverse=True)[0]
    fp = latest_dir / "alignment.json"
    if not fp.exists():
        raise HTTPException(status_code=404, detail="SNAPSHOT_MISSING")
    try:
        raw = json.loads(fp.read_text(encoding="utf-8"))
    except Exception:
        raise HTTPException(status_code=500, detail="SNAPSHOT_READ_FAIL")

    cards = []
    if isinstance(raw, dict):
        cards = raw.get("cards") or raw.get("items") or []
    if not isinstance(cards, list):
        cards = []

    # Build filters
    tag_set = set(
        t.strip() for t in (tags or "").split(",") if t and t.strip()
    ) if tags else set()

    def keep(card: Dict[str, Any]) -> bool:
        if lens and card.get("lens"):
            if str(card.get("lens")) != str(lens):
                return False
        if tag_set:
            ctags = set(card.get("tags") or [])
            if not (ctags & tag_set):
                return False
        return True

    filtered = [c for c in cards if keep(c)]
    if not filtered:
        raise HTTPException(status_code=404, detail="NO_CARDS")

    # Limit
    limit = max(1, min(100, int(limit or 50)))
    filtered = filtered[:limit]

    meta = {}
    if isinstance(raw, dict):
        meta = dict(raw.get("meta") or {})
    meta["count"] = len(filtered)

    out = {"meta": meta, "cards": filtered}
    return {"ok": True, "path": relpath(fp), "dir": relpath(latest_dir), "data": out}

# CORS — allow bridge and local contexts
allow_origins = set(
    ENV.get("CORS_ALLOW_ORIGINS", "").split(",")
    if ENV.get("CORS_ALLOW_ORIGINS")
    else []
)
if not allow_origins:
    allow_origins = {
        "http://localhost:3037",
        "http://127.0.0.1:3037",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
        "tauri://localhost",
        # Skeleton: during early dev, allow any origin; tighten later if needed
        "*",
    }

app.add_middleware(
    CORSMiddleware,
    allow_origins=list(allow_origins),
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------- Threads (ST-1206 T1/API) ----------
# Append-only threads storage with schema/limits
THREADS_ENABLED = True
THREADS_ROOT = PROJECT_ROOT / "conversations" / "threads"
THREADS_ROOT.mkdir(parents=True, exist_ok=True)

THREAD_TEXT_MAX = 16 * 1024       # 16KB per input text
THREAD_LINE_MAX = 64 * 1024       # 64KB per JSONL line
THREAD_FILE_MAX = 50 * 1024 * 1024  # 50MB per thread file cap

# In-memory token buckets for simple rate limiting (dev-safe)
_RATE_BUCKETS: Dict[str, Dict[str, float]] = {}
def _allow_rate(key: str, rate: float = 5.0, burst: float = 10.0) -> bool:
    now = time.time()
    b = _RATE_BUCKETS.get(key)
    if not b:
        _RATE_BUCKETS[key] = {"tokens": burst, "ts": now}
        return True
    dt = max(0.0, now - b["ts"])
    b["tokens"] = min(burst, b["tokens"] + rate * dt)
    b["ts"] = now
    if b["tokens"] >= 1.0:
        b["tokens"] -= 1.0
        return True
    return False

# Refs validation
_REFS_RE = re.compile(r'^[\w\/\.\-]+#L\d+(?:-\d+)?$')
def _validate_refs_list(refs: List[Any]) -> List[str]:
    out: List[str] = []
    for r in refs[:20]:
        s = str(r or "").strip()
        if not s:
            continue
        # Reject absolute paths and traversal segments
        if s.startswith("/") or s.startswith("..") or re.search(r'(^|/)\.\.(/|$)', s):
            raise HTTPException(status_code=422, detail="INVALID_REF_FORMAT")
        if not _REFS_RE.match(s):
            raise HTTPException(status_code=422, detail="INVALID_REF_FORMAT")
        out.append(s)
    return out

def _scan_tail_json(fp: Path, limit: int = 50) -> List[Dict[str, Any]]:
    lines = _threads_tail_lines(fp, limit)
    out: List[Dict[str, Any]] = []
    for ln in lines:
        try:
            obj = json.loads(ln)
            if isinstance(obj, dict):
                out.append(obj)
        except Exception:
            continue
    return out

def _find_idempotent_duplicate(fp: Path, role: str, text: str, window_sec: float = 2.0) -> Optional[Dict[str, Any]]:
    try:
        arr = _scan_tail_json(fp, 80)
        # Check most recent first
        for obj in reversed(arr):
            if str(obj.get("role") or "") != role:
                continue
            if str(obj.get("text") or "") != text:
                continue
            ts = str(obj.get("ts") or "")
            try:
                t0 = datetime.fromisoformat(ts.replace("Z", "+00:00")).timestamp()
                t1 = datetime.fromisoformat(now_iso().replace("Z", "+00:00")).timestamp()
                if abs(t1 - t0) <= window_sec:
                    return obj
            except Exception:
                return obj
    except Exception:
        pass
    return None

def _atomic_append_thread(fp: Path, rec: Dict[str, Any]) -> Tuple[int, int]:
    fp.parent.mkdir(parents=True, exist_ok=True)
    # Compute line bytes with placeholder turn (will overwrite after turn set)
    with fp.open("ab") as f:
        fcntl.flock(f, fcntl.LOCK_EX)
        try:
            tail_meta = _thread_tail_meta(fp)
            rec["turn"] = (tail_meta.get("turn") or 0) + 1
            line = (json.dumps(rec, ensure_ascii=False) + "\n").encode("utf-8")
            try:
                cur = fp.stat().st_size
            except FileNotFoundError:
                cur = 0
            if cur + len(line) > THREAD_FILE_MAX:
                raise HTTPException(status_code=507, detail="THREAD_FILE_TOO_LARGE")
            f.write(line)
            f.flush()
            os.fsync(f.fileno())
            return rec["turn"], len(line)
        finally:
            fcntl.flock(f, fcntl.LOCK_UN)

# Local helpers to avoid cross-section dependencies
def _threads_date_part(ts: Optional[str]) -> str:
    try:
        d = datetime.fromisoformat((ts or now_iso()).replace("Z", "+00:00"))
    except Exception:
        d = datetime.now(timezone.utc)
    return f"{d.year:04d}{d.month:02d}{d.day:02d}"

def _threads_tail_lines(path: Path, limit: int) -> List[str]:
    try:
        with path.open("rb") as f:
            f.seek(0, os.SEEK_END)
            size = f.tell()
            block = 4096
            data = bytearray()
            nl = 0
            pos = size
            while pos > 0 and nl <= limit:
                step = block if pos >= block else pos
                pos -= step
                f.seek(pos)
                chunk = f.read(step)
                data[:0] = chunk  # prepend
                nl = data.count(b"\n")
            text = data.decode("utf-8", errors="ignore")
            out = text.splitlines()[-limit:]
            return out
    except Exception:
        return path.read_text(encoding="utf-8", errors="ignore").splitlines()[-limit:]

def _gen_conv_id() -> str:
    # gg_YYYYMMDD_<base36/8>
    day = _threads_date_part(now_iso())
    rnd = base36(int(datetime.now(timezone.utc).timestamp() * 1000))[-8:]
    return f"gg_{day}_{rnd}"

def base36(n: int) -> str:
    digits = "0123456789abcdefghijklmnopqrstuvwxyz"
    if n == 0:
        return "0"
    s = []
    x = abs(n)
    while x:
        x, r = divmod(x, 36)
        s.append(digits[r])
    if n < 0:
        s.append("-")
    return "".join(reversed(s))

def _thread_dir_for(conv_id: str) -> Path:
    # Use day from convId if matches, else today
    cid = safe_id(conv_id, "CONV")
    parts = cid.split("_")
    day = _threads_date_part(now_iso())
    if len(parts) >= 3 and len(parts[1]) == 8 and parts[1].isdigit():
        day = parts[1]
    d = THREADS_ROOT / day
    d.mkdir(parents=True, exist_ok=True)
    return d

def _thread_file(conv_id: str) -> Path:
    return _thread_dir_for(conv_id) / f"{safe_id(conv_id, 'CONV')}.jsonl"

def _thread_tail_meta(fp: Path, scan_lines: int = 50) -> Dict[str, Any]:
    meta: Dict[str, Any] = {"last_ts": None, "turn": 0, "title": None, "title_locked": False, "tags": []}
    if not fp.exists():
        return meta
    tail = _threads_tail_lines(fp, max(1, scan_lines))
    last_turn = 0
    for raw in tail:
        try:
            obj = json.loads(raw)
            last_turn = max(last_turn, int(obj.get("turn") or 0))
            if obj.get("ts"):
                meta["last_ts"] = obj["ts"]
            m = obj.get("meta") or {}
            if m.get("title") and meta.get("title") is None:
                # Prefer the latest known title in tail scan
                meta["title"] = m.get("title")
            if bool(m.get("title_locked")):
                meta["title_locked"] = True
            tgs = m.get("tags") or []
            if isinstance(tgs, list) and not meta["tags"]:
                meta["tags"] = tgs[:]
        except Exception:
            continue
    meta["turn"] = last_turn
    return meta

def _thread_first_meta(fp: Path, scan_lines: int = 50) -> Dict[str, Any]:
    out: Dict[str, Any] = {"title": None, "title_locked": False}
    if not fp.exists():
        return out
    try:
        with fp.open("r", encoding="utf-8") as f:
            for i, line in enumerate(f):
                if i >= scan_lines:
                    break
                try:
                    obj = json.loads(line)
                    m = obj.get("meta") or {}
                    if out["title"] is None and m.get("title"):
                        out["title"] = m.get("title")
                    if m.get("title_locked"):
                        out["title_locked"] = True
                        break
                except Exception:
                    continue
    except Exception:
        pass
    return out

def _ensure_conv_id(conv_id: Optional[str]) -> str:
    cid = safe_id(conv_id or "", "")
    if not cid.startswith("gg_") or len(cid) < 12:
        cid = _gen_conv_id()
    return cid

def _approx_turns(fp: Path) -> int:
    try:
        with fp.open("rb") as f:
            return sum(1 for _ in f)
    except Exception:
        return 0

@app.post("/api/threads/append")
def threads_append_api(request: Request, body: Dict[str, Any] = Body(...)) -> Dict[str, Any]:
    if not THREADS_ENABLED:
        raise HTTPException(status_code=503, detail="THREADS_DISABLED")
    # Schema basics
    role = str(body.get("role") or "").strip().lower()
    if role not in {"user", "assistant", "system"}:
        raise HTTPException(status_code=400, detail="invalid role")
    text = body.get("text")
    if not isinstance(text, str):
        raise HTTPException(status_code=400, detail="text required")
    if len(text.encode("utf-8")) > THREAD_TEXT_MAX:
        raise HTTPException(status_code=413, detail="TEXT_TOO_LARGE")
    refs_in = body.get("refs") or []
    if not isinstance(refs_in, list):
        refs_in = []
    refs = _validate_refs_list(refs_in)
    meta = body.get("meta") or {}
    if not isinstance(meta, dict):
        meta = {}
    # convId handling
    requested = body.get("convId")
    conv_id = _ensure_conv_id(requested)
    fp = _thread_file(conv_id)
    # Collision handling: if file path exists but requested convId differs after safe_id normalization
    if requested and safe_id(requested, "") != safe_id(conv_id, "") and fp.exists():
        conv_id = _gen_conv_id()
        fp = _thread_file(conv_id)
    # Title lock guard
    tail_meta = _thread_tail_meta(fp)
    if tail_meta.get("title_locked") and meta.get("title"):
        # If locked and incoming title differs, reject
        if tail_meta.get("title") and meta.get("title") != tail_meta.get("title"):
            raise HTTPException(status_code=409, detail="TITLE_LOCKED")
    # Rate limit (IP and conv)
    ip = (request.client.host if request and request.client else "0.0.0.0")
    if not _allow_rate(f"ip:{ip}") or not _allow_rate(f"conv:{conv_id}"):
        raise HTTPException(status_code=429, detail="RATE_LIMITED")
    # ts decided by server
    server_ts = now_iso()
    # Idempotency: avoid dup within ±2s window
    dup = _find_idempotent_duplicate(fp, role, text, 2.0)
    if dup is not None:
        return {
            "ok": True,
            "data": {
                "convId": conv_id,
                "turn": int(dup.get("turn") or 0),
                "path": relpath(fp),
                "bytes_written": 0,
                "idempotent": True,
            },
            "meta": {"ts": server_ts},
        }
    # Build record (turn will be set atomically)
    rec = {
        "ts": server_ts,
        "convId": conv_id,
        "turn": 0,
        "role": role,
        "text": text,
        "refs": refs,
        "meta": {
            "title": meta.get("title"),
            "title_locked": bool(meta.get("title_locked")),
            "tags": meta.get("tags") or [],
            "sgm_blocked": bool(meta.get("sgm_blocked")),
            "hint": meta.get("hint"),
            "evidence_path": meta.get("evidence_path"),
            "tz_client": meta.get("tz_client"),
        },
    }
    # Atomic append with lock + fsync + file size cap + turn recompute
    turn, bytes_written = _atomic_append_thread(fp, rec)
    # Lightweight index update (per-conv file)
    try:
        idx_dir = THREADS_ROOT / "index"
        idx_dir.mkdir(parents=True, exist_ok=True)
        idx_path = idx_dir / f"{conv_id}.json"
        idx = {
            "convId": conv_id,
            "day": fp.parent.name,
            "last_ts": server_ts,
            "approx_turns": _approx_turns(fp),
        }
        idx_path.write_text(json.dumps(idx, ensure_ascii=False, indent=2), encoding="utf-8")
    except Exception:
        pass
    return {
        "ok": True,
        "data": {
            "convId": conv_id,
            "turn": turn,
            "path": relpath(fp),
            "bytes_written": bytes_written,
            "idempotent": False,
        },
        "meta": {"ts": server_ts},
    }

@app.get("/api/threads/recent")
def threads_recent_api(limit: int = 20) -> Dict[str, Any]:
    if not THREADS_ENABLED:
        raise HTTPException(status_code=503, detail="THREADS_DISABLED")
    lim = max(1, min(10000, int(limit or 20)))
    items: List[Dict[str, Any]] = []
    if THREADS_ROOT.exists():
        for day_dir in sorted(THREADS_ROOT.iterdir(), reverse=True):
            if not day_dir.is_dir():
                continue
            for jf in sorted(day_dir.glob("*.jsonl"), key=lambda p: p.stat().st_mtime, reverse=True):
                try:
                    tmeta = _thread_tail_meta(jf)
                    fmeta = _thread_first_meta(jf)
                    items.append({
                        "convId": jf.stem,
                        "title": fmeta.get("title") or tmeta.get("title"),
                        "title_locked": bool(fmeta.get("title_locked") or tmeta.get("title_locked")),
                        "last_ts": tmeta.get("last_ts"),
                        "top_tags": (tmeta.get("tags") or [])[:3],
                        "approx_turns": _approx_turns(jf),
                    })
                except Exception:
                    continue
    items.sort(key=lambda x: str(x.get("last_ts") or ""), reverse=True)
    return {"ok": True, "data": {"items": items[:lim], "count": len(items)}, "meta": {"ts": now_iso()}}

@app.get("/api/threads/migrated")
def threads_migrated_api(limit: int = 500) -> Dict[str, Any]:
    """Read threads from migrated_chat_store.json"""
    migrated_file = PROJECT_ROOT / "migrated_chat_store.json"
    if not migrated_file.exists():
        return {"ok": False, "error": "migrated_chat_store.json not found", "data": {"items": []}}

    try:
        import json
        with open(migrated_file, "r", encoding="utf-8") as f:
            data = json.load(f)

        threads = data.get("threads", [])
        items = []

        for thread in threads[:limit]:
            thread_id = thread.get("id", "")
            title = thread.get("title", "Untitled")
            messages = thread.get("messages", [])

            # Get last message timestamp
            last_ts = None
            if messages:
                last_msg = messages[-1]
                last_ts = last_msg.get("ts", last_msg.get("timestamp", ""))

            # Convert to API format
            turns = []
            for msg in messages:
                turns.append({
                    "role": msg.get("role", "user"),
                    "text": msg.get("content", ""),
                    "ts": msg.get("ts", msg.get("timestamp", "")),
                    "meta": msg.get("meta", {})
                })

            items.append({
                "convId": thread_id,
                "title": title,
                "last_ts": last_ts,
                "turns": turns  # Include full conversation data
            })

        return {"ok": True, "data": {"items": items, "count": len(items)}, "meta": {"ts": now_iso()}}
    except Exception as e:
        return {"ok": False, "error": str(e), "data": {"items": []}}

@app.get("/api/threads/read_stream")
def threads_read_stream(convId: str):
    if not THREADS_ENABLED:
        raise HTTPException(status_code=503, detail="THREADS_DISABLED")
    cid = safe_id(convId, "CONV")
    # locate file
    candidates: List[Path] = []
    for day_dir in THREADS_ROOT.iterdir():
        if not day_dir.is_dir():
            continue
        f = day_dir / f"{cid}.jsonl"
        if f.exists():
            candidates.append(f)
    if not candidates:
        raise HTTPException(status_code=404, detail="thread not found")
    fp = max(candidates, key=lambda p: p.stat().st_mtime)
    def gen():
        try:
            with fp.open("r", encoding="utf-8", errors="ignore") as f:
                for line in f:
                    yield line if line.endswith("\n") else (line + "\n")
        except Exception:
            yield ""
    return StreamingResponse(gen(), media_type="application/jsonl")

@app.get("/api/threads/read")
def threads_read_api(convId: str) -> Dict[str, Any]:
    if not THREADS_ENABLED:
        raise HTTPException(status_code=503, detail="THREADS_DISABLED")
    cid = safe_id(convId, "CONV")
    # Find latest file for this convId across days
    candidates: List[Path] = []
    for day_dir in THREADS_ROOT.iterdir():
        if not day_dir.is_dir():
            continue
        f = day_dir / f"{cid}.jsonl"
        if f.exists():
            candidates.append(f)
    if not candidates:
        raise HTTPException(status_code=404, detail="thread not found")
    fp = max(candidates, key=lambda p: p.stat().st_mtime)
    turns: List[Dict[str, Any]] = []
    for ln in fp.read_text(encoding="utf-8", errors="ignore").splitlines():
        try:
            obj = json.loads(ln)
            if isinstance(obj, dict):
                turns.append(obj)
        except Exception:
            continue
    # day string from parent folder
    day = fp.parent.name
    return {"ok": True, "data": {"convId": cid, "day": day, "turns": turns, "path": relpath(fp)}, "meta": {"ts": now_iso()}}

# ---------- Threads Import (Migration) ----------
from typing import Literal as _Lit  # local import to avoid top-level change


class _ImpMsg(BaseModel):
    role: _Lit["user", "assistant", "system"]
    content: str
    ts: Optional[float] = None


class _ImpThread(BaseModel):
    id: str
    title: Optional[str] = None
    messages: List[_ImpMsg]


class ThreadsImportRequest(BaseModel):
    source: _Lit["file", "payload"]
    path: Optional[str] = None
    threads: Optional[List[_ImpThread]] = None


def _import_threads_list(threads: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Import a list of thread-like dicts into append-only thread files.
    Each item expects: { id, title?, messages: [{ role, content, ts? }, ...] }
    """
    imported = 0
    skipped = 0
    renamed: List[str] = []
    sample_ids: List[str] = []
    for th in threads or []:
        try:
            tid = str(th.get("id") or "").strip() or ulid()
            title = (th.get("title") or None)
            msgs = th.get("messages") or []
            # Generate new convId to avoid collision with existing scheme
            conv_id = f"gg_mig_{_threads_date_part(now_iso())}_{ulid()[:6].lower()}"
            fp = _thread_file(conv_id)
            # Write messages sequentially
            for i, m in enumerate(msgs):
                role = str((m or {}).get("role") or "").strip().lower()
                if role not in {"user", "assistant", "system"}:
                    continue
                text = (m or {}).get("content")
                if not isinstance(text, str) or not text:
                    continue
                # Build record (turn assigned atomically)
                rec = {
                    "ts": now_iso(),
                    "convId": conv_id,
                    "turn": 0,
                    "role": role,
                    "text": text,
                    "refs": [],
                    "meta": {
                        "title": (title if i == 0 else None),
                        "title_locked": False,
                        "tags": ["imported", "migration"],
                        "source": "threads.import",
                        "source_id": tid,
                        "source_ts": (m.get("ts") if isinstance(m.get("ts"), (int, float, str)) else None),
                    },
                }
                _atomic_append_thread(fp, rec)
            # Update lightweight index
            try:
                idx_dir = THREADS_ROOT / "index"
                idx_dir.mkdir(parents=True, exist_ok=True)
                idx_path = idx_dir / f"{conv_id}.json"
                idx = {
                    "convId": conv_id,
                    "day": fp.parent.name,
                    "last_ts": now_iso(),
                    "approx_turns": _approx_turns(fp),
                }
                idx_path.write_text(json.dumps(idx, ensure_ascii=False, indent=2), encoding="utf-8")
            except Exception:
                pass
            imported += 1
            sample_ids.append(conv_id)
            if tid != conv_id:
                renamed.append(f"{tid}->{conv_id}")
        except Exception:
            skipped += 1
            continue
    # Migration log (append-only)
    try:
        day = _threads_date_part(now_iso())
        mdir = STATUS_ROOT / "evidence" / "migrated_threads" / day
        mdir.mkdir(parents=True, exist_ok=True)
        mfile = mdir / f"import_{datetime.now(timezone.utc).strftime('%H%M%S')}.jsonl"
        append_jsonl(
            mfile,
            {
                "ts": now_iso(),
                "imported": imported,
                "skipped": skipped,
                "renamed": renamed[:10],
                "samples": sample_ids[:5],
            },
        )
        save_path = relpath(mfile)
    except Exception:
        save_path = None
    return {"imported": imported, "skipped": skipped, "renamed": renamed, "sampleIds": sample_ids, "save_path": save_path}


@app.post("/api/threads/import")
def threads_import_api(body: ThreadsImportRequest = Body(...)) -> Dict[str, Any]:
    if not THREADS_ENABLED:
        raise HTTPException(status_code=503, detail="THREADS_DISABLED")
    src = str(body.source or "").strip().lower()
    threads_payload: List[Dict[str, Any]] = []
    if src == "file":
        p = str(body.path or "").strip()
        if not p:
            raise HTTPException(status_code=422, detail="PATH_REQUIRED")
        # Normalize and ensure under project root
        abs_path = os.path.abspath(os.path.join(str(PROJECT_ROOT), p)) if not os.path.isabs(p) else os.path.abspath(p)
        if not str(abs_path).startswith(str(PROJECT_ROOT) + os.sep):
            raise HTTPException(status_code=422, detail="PATH_OUTSIDE_PROJECT")
        if not os.path.exists(abs_path):
            raise HTTPException(status_code=404, detail="FILE_NOT_FOUND")
        text = Path(abs_path).read_text(encoding="utf-8", errors="replace")
        try:
            data = json.loads(text)
            if isinstance(data, dict) and isinstance(data.get("threads"), list):
                threads_payload = data["threads"]
            elif isinstance(data, list):
                threads_payload = data
            else:
                raise ValueError("Unsupported JSON shape")
        except Exception:
            raise HTTPException(status_code=400, detail="INVALID_JSON")
    elif src == "payload":
        if not isinstance(body.threads, list) or not body.threads:
            raise HTTPException(status_code=422, detail="THREADS_REQUIRED")
        # Convert Pydantic models to dicts
        threads_payload = [t.model_dump() if hasattr(t, "model_dump") else t for t in body.threads]
    else:
        raise HTTPException(status_code=422, detail="INVALID_SOURCE")

    res = _import_threads_list(threads_payload)
    return {"ok": True, "data": res, "meta": {"ts": now_iso()}}

# ---------- Routes ----------


@app.get("/api/roadmap/progress")
def roadmap_progress() -> Dict[str, Any]:
    """
    Merge plan (BT/ST manifest in roadmap MD) with checkpoint tail into a human-friendly progress view.
    Adds:
    - Per-ST timestamps: start_ts (first START/시작), pass_ts (first PASS)
    - Evidence aggregation per ST (list of latest-known evidence refs)
    - round_map: planned ST id list per round (R1/R2/R3)
    """
    # 1) Load manifest JSON from roadmap MD
    md_path = PROJECT_ROOT / "status" / "roadmap" / "BT11_to_BT21_Compass_ko.md"
    start_tag = "<!--GG_DATA:BT_ST_MANIFEST-->"
    end_tag = "<!--/GG_DATA:BT_ST_MANIFEST-->"
    manifest: Dict[str, Any] = {"bts": [], "rounds": ["R1", "R2", "R3"], "version": 1}
    try:
        text = md_path.read_text(encoding="utf-8")
        s = text.find(start_tag)
        e = text.find(end_tag)
        if s != -1 and e != -1 and e > s:
            block = text[s + len(start_tag) : e].strip()
            try:
                manifest = json.loads(block)
            except Exception:
                pass
    except Exception:
        pass

    # Planned round map from manifest (order-preserving)
    round_map: Dict[str, List[str]] = {"R1": [], "R2": [], "R3": []}
    for bt in manifest.get("bts", []):
        for st in bt.get("sts", []):
            rid = str(st.get("round") or "")
            sid = str(st.get("id") or "")
            if rid in round_map and sid:
                round_map[rid].append(sid)

    # 2) Read checkpoints and basic chain status
    items: List[Dict[str, Any]] = _ckpt_read_all(CKPT_JSONL)
    status_meta = _ckpt_chain_status(CKPT_JSONL)

    def _is_pass_decision(s: str) -> bool:
        """
        Robust PASS detector:
        - English: 'PASS' surrounded by non-letters, or within RESTATE blobs
        - Korean aliases: '진행완료', '완료'
        """
        txt = (s or "")
        up = txt.upper()
        if re.search(r"(?<![A-Z])PASS(?![A-Z])", up):
            return True
        if ("진행완료" in txt) or ("완료" in txt):
            return True
        return False

    def _is_start_decision(s: str) -> bool:
        """
        Robust START detector:
        - English: 'START' token
        - Korean: '시작'
        """
        txt = (s or "")
        up = txt.upper()
        if re.search(r"(?<![A-Z])START(?![A-Z])", up):
            return True
        if "시작" in txt:
            return True
        return False

    def _rounds_from_tail(tail: List[Dict[str, Any]]) -> Dict[str, int]:
        r = {"R1": 0, "R2": 0, "R3": 0}
        # chronological scan
        for it in reversed(tail[-500:]):
            d = str(it.get("decision") or "")
            if "R1 PASS" in d and r["R1"] < 1:
                r["R1"] = 1
            if "R2 PASS" in d and r["R2"] < 1:
                r["R2"] = 1
            if "R3 PASS" in d and r["R3"] < 1:
                r["R3"] = 1
        return r

    rounds_state = _rounds_from_tail(items)

    import re

    # 3) Build per-ST timeline (start_ts/pass_ts) and evidence aggregation
    def _norm_ev_path(p: str) -> Optional[str]:
        """
        Normalize evidence path for Bridge /api/open:
        - strip repo prefix 'gumgang_meeting/'
        - drop line fragments '#Lx-y'
        - keep only repo-relative path (e.g., 'status/evidence/...').
        """
        q = (p or "").strip()
        if not q:
            return None
        # drop line fragment
        if "#" in q:
            q = q.split("#", 1)[0]
        # strip repo root
        if q.startswith("gumgang_meeting/"):
            q = q[len("gumgang_meeting/") :]
        # ensure relative (Bridge uses roots)
        return q or None

    st_timeline: Dict[str, Dict[str, Any]] = {}
    for it in items:
        d = str(it.get("decision") or "")
        ts = str(it.get("utc_ts") or "")
        ev_raw = str(it.get("evidence") or "")
        ev_norm = _norm_ev_path(ev_raw)
        # find all ST ids in the decision (handles RESTATE with multiple STs)
        sids = re.findall(r"ST-(\d{4})", d)
        if not sids:
            continue
        for num in sids:
            sid = f"ST-{num}"
            ref = st_timeline.get(sid) or {
                "decisions": [],
                "evidence": [],
                "start_ts": None,
                "pass_ts": None,
                "last_ts": None,
                "last_decision": "",
            }
            ref["decisions"].append({"ts": ts, "decision": d})
            if ev_norm:
                ref["evidence"].append(ev_norm)
            # capture first start_ts / pass_ts
            if ref["start_ts"] is None and _is_start_decision(d):
                ref["start_ts"] = ts
            if ref["pass_ts"] is None and _is_pass_decision(d):
                ref["pass_ts"] = ts
            # last seen
            if ref["last_ts"] is None or str(ref["last_ts"]) <= ts:
                ref["last_ts"] = ts
                ref["last_decision"] = d
            st_timeline[sid] = ref

    # 3-b) Evidence backfill — scan status/evidence/* for ST tokens when SSOT lacks them
    scanned = 0
    try:
        ev_root = PROJECT_ROOT / "status" / "evidence"
        # lightweight scan limits
        MAX_FILES = 2000
        MAX_BYTES = 200_000
        # scanned counter initialized above
        if ev_root.exists():
            for p in ev_root.rglob("*"):
                if scanned >= MAX_FILES:
                    break
                try:
                    if not p.is_file():
                        continue
                    # limit by extension/size for safety
                    suf = p.suffix.lower()
                    if suf not in (".json", ".jsonl", ".md", ".log", ".txt"):
                        continue
                    if p.stat().st_size > MAX_BYTES:
                        continue
                    txt = p.read_text(encoding="utf-8", errors="ignore")
                except Exception:
                    continue
                scanned += 1
                # find all ST ids
                for m in re.findall(r"ST-(\d{4})", txt):
                    sid = f"ST-{m}"
                    ref = st_timeline.get(sid)
                    # only backfill when timeline is missing or empty
                    if ref is None:
                        ref = {
                            "decisions": [],
                            "evidence": [],
                            "start_ts": None,
                            "pass_ts": None,
                            "last_ts": None,
                            "last_decision": "",
                        }
                    # timestamps via file mtime (approx) if missing
                    ts_file = None
                    try:
                        ts_file = p.stat().st_mtime
                    except Exception:
                        ts_file = None
                    if ts_file:
                        iso = datetime.utcfromtimestamp(ts_file).strftime("%Y-%m-%dT%H:%M:%SZ")  # type: ignore
                        if not ref.get("start_ts"):
                            ref["start_ts"] = iso
                        if not ref.get("last_ts"):
                            ref["last_ts"] = iso
                    # evidence path (relative under status/)
                    rel = _norm_ev_path(relpath(p)) or ""
                    if rel.startswith("status/") and rel not in ref.get("evidence", []):
                        ref.setdefault("evidence", []).append(rel)
                    st_timeline[sid] = ref
    except Exception:
        pass

    # 4) Merge manifest with inferred statuses and timestamps
    out_bts: List[Dict[str, Any]] = []
    for bt in manifest.get("bts", []):
        bt_id = str(bt.get("id") or "")
        bt_title = str(bt.get("title") or bt_id)
        sts_out: List[Dict[str, Any]] = []
        for st in bt.get("sts", []):
            sid = str(st.get("id") or "")
            st_title = str(st.get("title") or sid)
            st_round = str(st.get("round") or "")
            done_hint = bool(st.get("done"))
            ref = st_timeline.get(sid, {})
            dec = str(ref.get("last_decision") or "")
            # status inference
            st_status = "PLANNED"
            if done_hint or _is_pass_decision(dec) or ref.get("pass_ts"):
                st_status = "PASS"
            elif str(dec).upper().startswith("BLOCKED:"):
                st_status = "BLOCKED"
            elif _is_start_decision(dec) or ref.get("start_ts"):
                st_status = "STARTED"
            # Build record and apply a second-pass fallback scan if timeline missed fields
            st_rec = {
                "id": sid,
                "title": st_title,
                "round": st_round,
                "status": st_status,
                "start_ts": ref.get("start_ts"),
                "pass_ts": ref.get("pass_ts"),
                "last_ts": ref.get("last_ts"),
                "evidence": list(ref.get("evidence") or []),
            }
            if (not st_rec["start_ts"]) or (not st_rec["pass_ts"]) or (not st_rec["last_ts"]) or (len(st_rec["evidence"]) == 0):
                for it2 in items:
                    d2 = str(it2.get("decision") or "")
                    if sid in d2:
                        ts2 = str(it2.get("utc_ts") or "")
                        ev2 = _norm_ev_path(str(it2.get("evidence") or ""))
                        if (not st_rec["start_ts"]) and _is_start_decision(d2):
                            st_rec["start_ts"] = ts2
                        if (not st_rec["pass_ts"]) and _is_pass_decision(d2):
                            st_rec["pass_ts"] = ts2
                        if (not st_rec["last_ts"]) or (st_rec["last_ts"] <= ts2):
                            st_rec["last_ts"] = ts2
                        if ev2 and ev2 not in st_rec["evidence"]:
                            st_rec["evidence"].append(ev2)
            # keep only bridge-openable evidence under status/*
            st_rec["evidence"] = [p for p in st_rec["evidence"] if p.startswith("status/")]
            sts_out.append(st_rec)
        out_bts.append({"id": bt_id, "title": bt_title, "sts": sts_out})

    # 5) Infer NEXT from latest checkpoint or first PLANNED in manifest order
    next_step = ""
    if items:
        next_step = str(items[-1].get("next_step") or "")
    if not next_step:
        # prefer first PLANNED in round order R1->R2->R3
        for rid in ("R1", "R2", "R3"):
            for bt in out_bts:
                for st in bt["sts"]:
                    if st["round"] == rid and st["status"] == "PLANNED":
                        next_step = st["id"] + " 시작"
                        break
                if next_step:
                    break
            if next_step:
                break

    data = {
        "rounds": rounds_state,
        "round_map": round_map,
        "chain": status_meta,
        "bts": out_bts,
        "next": next_step,
        "now": now_iso(),
    }
    debug_meta = {}
    return {"ok": True, "data": data, "meta": debug_meta}

@app.get("/api/health")
def health() -> Dict[str, Any]:
    return {
        "ok": True,
        "ts": now_iso(),
        "project_root": relpath(PROJECT_ROOT),
        "evidence_root": relpath(MEETINGS_ROOT),
        "routes": {
            "capture": True,
            "annotate": True,
            "record_start": True,
            "record_stop": True,
            "events_read": True,
        },
    }


@app.post("/api/meetings/capture")
async def capture_json(body: CaptureRequest = Body(...)) -> Dict[str, Any]:
    mid = safe_id(body.meetingId, "MEETING")
    ts = body.ts or now_iso()
    event = {
        "type": "capture",
        "ts": ts,
        "meeting_id": mid,
        "note": body.note,
        "payload": (body.payload.dict() if body.payload else None),
        "mode": body.mode,
    }
    res = STORE.append_event(mid, event)
    return {"ok": True, "data": {"event": event, **res}, "meta": {"ts": now_iso()}}


@app.post("/api/meetings/capture/upload")
async def capture_upload(
    meetingId: str = Form(...),
    ts: Optional[str] = Form(None),
    note: Optional[str] = Form(None),
    mode: Optional[str] = Form(None),
    file: UploadFile = File(...),
) -> Dict[str, Any]:
    mid = safe_id(meetingId, "MEETING")
    tss = ts or now_iso()
    mdir = ensure_meeting_dir(mid)
    safe_name = prune_filename(file.filename or "capture.bin")
    # Prefix with ts for ordering
    attach_path = mdir / "attachments" / f"{tss.replace(':', '').replace('-', '').replace('.','_')}_{safe_name}"
    # Stream save
    bytes_written = write_bytes(attach_path, _iter_upload_file(file))
    await file.close()

    event = {
        "type": "capture_upload",
        "ts": tss,
        "meeting_id": mid,
        "note": note,
        "attachment": relpath(attach_path),
        "bytes": bytes_written,
        "content_type": getattr(file, "content_type", None),
        "original_name": file.filename,
        "mode": mode,
    }
    res = STORE.append_event(mid, event)
    return {"ok": True, "data": {"event": event, **res}, "meta": {"ts": now_iso()}}


def _iter_upload_file(f: UploadFile, chunk: int = 1 << 20) -> Iterable[bytes]:
    # UploadFile.read() is async, but we can iterate by awaiting once and returning iterable via closure.
    async def gen():
        while True:
            b = await f.read(chunk)
            if not b:
                break
            yield b

    # Bridge async generator to sync iterator for write_bytes
    loop = None
    try:
        import asyncio

        loop = asyncio.get_event_loop()
    except Exception:
        pass

    if loop and loop.is_running():
        # In running loop, schedule reads synchronously (limited sizes)
        from anyio import to_thread  # optional, but used by FastAPI stack; fallback below

        async def collect() -> List[bytes]:
            out: List[bytes] = []
            async for part in gen():
                out.append(part)
            return out

        try:
            # Best-effort: collect in-memory; for skeleton-level sizes this is acceptable
            data = loop.create_task(collect())  # type: ignore
            # The caller will await file.close(), so we return a once-iterable
            # We cannot yield async here; so return a list and iterate
            # Note: If event loop context differs, fallback to blocking read
            return _iter_bytes(loop.run_until_complete(data))  # type: ignore
        except Exception:
            pass

    # Fallback: blocking reads (not ideal in async context, but acceptable for small files in skeleton)
    def blocking_iter() -> Iterable[bytes]:
        while True:
            b = f.file.read(1 << 20)  # type: ignore[attr-defined]
            if not b:
                break
            yield b

    return blocking_iter()


def _iter_bytes(bufs: List[bytes]) -> Iterable[bytes]:
    for b in bufs:
        yield b


@app.post("/api/meetings/annotate")
async def annotate(body: AnnotateRequest = Body(...)) -> Dict[str, Any]:
    mid = safe_id(body.meetingId, "MEETING")
    ts = body.ts or now_iso()
    event = {
        "type": "annotate",
        "ts": ts,
        "meeting_id": mid,
        "target": body.target,
        "text": body.text,
        "shapes": body.shapes,
        "mode": body.mode,
    }
    res = STORE.append_event(mid, event)
    return {"ok": True, "data": {"event": event, **res}, "meta": {"ts": now_iso()}}


@app.post("/api/meetings/record/start")
async def record_start(body: RecordStartRequest = Body(...)) -> Dict[str, Any]:
    mid = safe_id(body.meetingId, "MEETING")
    ts = body.ts or now_iso()
    mdir = ensure_meeting_dir(mid)
    start_marker = mdir / "recording.started.json"
    stop_marker = mdir / "recording.stopped.json"
    # Determine current state (ON if start.ts > stop.ts)
    def _read_ts(p: Path) -> Optional[str]:
        try:
            if p.exists():
                return json.loads(p.read_text(encoding="utf-8")).get("ts")
        except Exception:
            return None
        return None
    started_at = _read_ts(start_marker)
    stopped_at = _read_ts(stop_marker)
    is_on = bool(started_at and (not stopped_at or started_at > stopped_at))
    if is_on:
        return {
            "ok": True,
            "data": {"no_change": True, "state": "ON", "marker": relpath(start_marker)},
            "meta": {"ts": now_iso()},
        }
    # Write start marker and event
    start_marker.write_text(
        json.dumps({"meeting_id": mid, "ts": ts, "meta": body.meta}, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    event = {"type": "record_start", "ts": ts, "meeting_id": mid, "meta": body.meta, "mode": body.mode}
    res = STORE.append_event(mid, event)
    return {
        "ok": True,
        "data": {"event": event, "marker": relpath(start_marker), **res},
        "meta": {"ts": now_iso()},
    }


@app.post("/api/meetings/record/stop")
async def record_stop(body: RecordStopRequest = Body(...)) -> Dict[str, Any]:
    mid = safe_id(body.meetingId, "MEETING")
    ts = body.ts or now_iso()
    mdir = ensure_meeting_dir(mid)
    start_marker = mdir / "recording.started.json"
    stop_marker = mdir / "recording.stopped.json"
    def _read_ts(p: Path) -> Optional[str]:
        try:
            if p.exists():
                return json.loads(p.read_text(encoding="utf-8")).get("ts")
        except Exception:
            return None
        return None
    started_at = _read_ts(start_marker)
    stopped_at = _read_ts(stop_marker)
    is_on = bool(started_at and (not stopped_at or started_at > stopped_at))
    if not is_on:
        return {
            "ok": True,
            "data": {"no_change": True, "state": "OFF", "marker": relpath(stop_marker)},
            "meta": {"ts": now_iso()},
        }
    # Write stop marker and event
    stop_marker.write_text(
        json.dumps(
            {"meeting_id": mid, "ts": ts, "meta": body.meta, "stats": body.stats},
            ensure_ascii=False,
            indent=2,
        ),
        encoding="utf-8",
    )
    event = {
        "type": "record_stop",
        "ts": ts,
        "meeting_id": mid,
        "meta": body.meta,
        "stats": body.stats,
        "mode": body.mode,
    }
    res = STORE.append_event(mid, event)
    return {
        "ok": True,
        "data": {"event": event, "marker": relpath(stop_marker), **res},
        "meta": {"ts": now_iso()},
    }


@app.get("/api/meetings/{meeting_id}/record/status")
def record_status(meeting_id: str) -> Dict[str, Any]:
    mid = safe_id(meeting_id, "MEETING")
    mdir = ensure_meeting_dir(mid)
    start_marker = mdir / "recording.started.json"
    stop_marker = mdir / "recording.stopped.json"

    started_at: Optional[str] = None
    stopped_at: Optional[str] = None

    try:
        if start_marker.exists():
            started_at = json.loads(start_marker.read_text(encoding="utf-8")).get("ts")
    except Exception:
        pass
    try:
        if stop_marker.exists():
            stopped_at = json.loads(stop_marker.read_text(encoding="utf-8")).get("ts")
    except Exception:
        pass

    state = "OFF"
    if started_at and (not stopped_at or started_at > stopped_at):
        state = "ON"

    duration_sec: Optional[int] = None
    try:
        if started_at:
            t0 = datetime.fromisoformat(started_at.replace("Z", "+00:00"))
            t1 = datetime.fromisoformat((stopped_at or now_iso()).replace("Z", "+00:00"))
            duration_sec = max(0, int((t1 - t0).total_seconds()))
    except Exception:
        pass

    return {
        "ok": True,
        "data": {
            "state": state,
            "started_at": started_at,
            "stopped_at": stopped_at,
            "marker_started": relpath(start_marker),
            "marker_stopped": relpath(stop_marker),
            "duration_sec": duration_sec,
        },
        "meta": {"ts": now_iso()},
    }


@app.get("/api/meetings/{meeting_id}/events")
def events_read(meeting_id: str, limit: int = 200) -> Dict[str, Any]:
    mid = safe_id(meeting_id, "MEETING")
    path = STORE.events_path(mid)
    if not path.exists():
        raise HTTPException(status_code=404, detail="No events yet")
    # Tail-read up to limit lines (simple implementation)
    lines = _tail_lines(path, limit=max(1, min(2000, limit)))
    events: List[Dict[str, Any]] = []
    for ln in lines:
        ln = ln.strip()
        if not ln:
            continue
        try:
            events.append(json.loads(ln))
        except Exception:
            continue
    return {
        "ok": True,
        "data": {"events": events, "count": len(events), "path": relpath(path)},
        "meta": {"ts": now_iso()},
    }


def _tail_lines(path: Path, limit: int) -> List[str]:
    # Simple but efficient tail for small-to-medium files
    try:
        with path.open("rb") as f:
            f.seek(0, os.SEEK_END)
            size = f.tell()
            block = 4096
            data = bytearray()
            nl = 0
            pos = size
            while pos > 0 and nl <= limit:
                step = block if pos >= block else pos
                pos -= step
                f.seek(pos)
                chunk = f.read(step)
                data[:0] = chunk  # prepend
                nl = data.count(b"\n")
            text = data.decode("utf-8", errors="ignore")
            out = text.splitlines()[-limit:]
            return out
    except Exception:
        return path.read_text(encoding="utf-8", errors="ignore").splitlines()[-limit:]


# ---------- Memory (5-tier) — store/search/recall ----------

# Roots
MEMORY_ROOT = EVIDENCE_ROOT / "memory"
MEM_TIER_DIR = MEMORY_ROOT / "tiers"
MEM_SEARCH_DIR = MEMORY_ROOT / "search"
MEM_RECALL_DIR = MEMORY_ROOT / "recall"
for p in (MEMORY_ROOT, MEM_TIER_DIR, MEM_SEARCH_DIR, MEM_RECALL_DIR):
    p.mkdir(parents=True, exist_ok=True)

# Tiers and helpers
MEM_TIERS = {"ultra_short", "short", "medium", "long", "ultra_long"}


def _date_part(ts: Optional[str]) -> str:
    try:
        d = datetime.fromisoformat((ts or now_iso()).replace("Z", "+00:00"))
    except Exception:
        d = datetime.now(timezone.utc)
    return f"{d.year:04d}{d.month:02d}{d.day:02d}"


def _session_or_default(s: Optional[str]) -> str:
    s = (s or "").strip() or "GG-SESS-LOCAL"
    return safe_id(s, "GG-SESS-LOCAL")


class MemoryStoreRequest(BaseModel):
    tier: str = Field(..., description="ultra_short|short|medium|long|ultra_long")
    scope_id: Optional[str] = Field(default=None, description="e.g., ST-1201, BT-12, PROJECT, DOCTRINE")
    ts: Optional[str] = Field(default=None, description="ISO8601Z; default=now")
    text: str = Field(..., description="Memory text content")
    refs: List[str] = Field(default_factory=list, description="Evidence refs like path#Lx-y")
    mode: Optional[str] = Field(default=None, description="SAFE/NORMAL")
    weight: Dict[str, Any] = Field(default_factory=dict)
    emb: Optional[List[float]] = None
    sessionId: Optional[str] = Field(default=None, description="Logical session id")


class MemorySearchHit(BaseModel):
    tier: str
    score: float
    ts: Optional[str] = None
    scope_id: Optional[str] = None
    text: str
    path: str


@app.post("/api/memory/store")
def memory_store(body: MemoryStoreRequest = Body(...)) -> Dict[str, Any]:
    tier = (body.tier or "").strip().lower()
    if tier not in MEM_TIERS:
        raise HTTPException(status_code=400, detail=f"Invalid tier. Allowed: {sorted(MEM_TIERS)}")
    # ST-1204: ultra_long writes require gate_token verification (internal only)
    if tier == "ultra_long":
        wt = body.weight or {}
        token = str(wt.get("gate_token") or "")
        approved_id = str(wt.get("approved_id") or "")
        approved_sha256 = sha256_text(body.text or "")
        if not token or not approved_id or not verify_gate_token(token, approved_id, approved_sha256):
            raise HTTPException(status_code=403, detail="GATE_REQUIRED")
    day = _date_part(body.ts)
    sess = _session_or_default(body.sessionId)
    out_path = MEM_TIER_DIR / tier / day / f"{sess}.jsonl"
    # Optional PII scan/redaction when requested via weight.pii_scan
    pii_flags = []
    redacted_text = None
    try:
        wt = body.weight or {}
        if bool(wt.get("pii_scan")):
            scan = pii_scan_and_redact(body.text or "")
            pii_flags = scan.get("flags") or []
            redacted_text = scan.get("redacted_text")
    except Exception:
        # fail-closed: do not block writes on PII scan errors
        pass
    rec = {
        "id": f"{tier}_{day}_{int(datetime.now(timezone.utc).timestamp()*1000):013d}",
        "tier": tier,
        "scope_id": body.scope_id,
        "ts": body.ts or now_iso(),
        "text": body.text,
        "refs": body.refs,
        "mode": body.mode,
        "weight": body.weight,
        "emb": body.emb,
        "session_id": sess,
    }
    if pii_flags:
        rec["pii_flags"] = pii_flags
    if redacted_text is not None and redacted_text != body.text:
        rec["redacted_text"] = redacted_text
    bytes_written = append_jsonl(out_path, rec)
    return {
        "ok": True,
        "data": {
            "record": rec,
            "path": relpath(out_path),
            "bytes_written": bytes_written,
        },
        "meta": {"ts": now_iso()},
    }


@app.get("/api/memory/search")
def memory_search(q: str, k: int = 5, tiers: Optional[str] = None, need_fresh: int = 0, halflife_days: Optional[float] = None, fresh_weight: Optional[float] = None, self_rag: int = 0) -> Dict[str, Any]:
    """
    ST-1202: scoring = kw + recency + refs + tier_weight
    - Evidence quorum: require ≥1 citation if results exist; target 3 if available
    - Threshold: MEM_SCORE_MIN to decide no-hit
    - Logs: write per-run breakdown to status/evidence/memory/search_runs/YYYYMMDD/run_*.json
    """
    q_raw = (q or "").strip()
    ql = q_raw.lower()
    if not ql:
        raise HTTPException(status_code=400, detail="q required")
    allowed = set(t.strip().lower() for t in (tiers or "").split(",") if t.strip()) or MEM_TIERS

    # Weights and params (could be externalized later)
    MEM_K = max(1, min(100, int(k or 5)))
    MEM_HALFLIFE_DAYS = 7.0
    W_KW, W_REC, W_REFS, W_TIER = 1.0, 0.6, 0.4, 0.2
    TIER_W = {"ultra_short": 1.0, "short": 0.8, "medium": 0.6, "long": 0.4, "ultra_long": 0.2}
    MEM_SCORE_MIN = 0.25
    QUORUM_MIN, QUORUM_TARGET = 1, 3

    now_ts = datetime.now(timezone.utc)
    tokens = [t for t in re.split(r"[^a-zA-Z0-9가-힣_]+", ql) if t]

    def kw_score(text: str, scope_id: Optional[str]) -> float:
        base = text.lower()
        bag = set([t for t in re.split(r"[^a-zA-Z0-9가-힣_]+", base) if t])
        if not tokens or not bag:
            s_kw = 0.0
        else:
            inter = len(set(tokens) & bag)
            s_kw = min(1.0, inter / float(len(set(tokens)) or 1))
        # scope hint adds a small lift if matches
        s_scope = 0.0
        if scope_id:
            s_scope = 0.25 if any(t in str(scope_id).lower() for t in tokens) else 0.0
        return min(1.0, s_kw + s_scope)

    def recency_score(ts: str) -> float:
        try:
            t0 = datetime.fromisoformat(ts.replace("Z", "+00:00"))
            age_days = max(0.0, (now_ts - t0).total_seconds() / 86400.0)
            # smooth half-life approximation in [0..1]
            return 1.0 / (1.0 + (age_days / max(0.1, MEM_HALFLIFE_DAYS)))
        except Exception:
            return 0.0

    def refs_score(refs: Optional[List[str]]) -> float:
        n = len(refs or [])
        # simple normalization up to 5 refs
        return min(1.0, n / 5.0)

    hits_raw: List[Dict[str, Any]] = []

    # Override fresh/recency params if requested (ST-1205)
    if int(need_fresh or 0) != 0:
        try:
            MEM_HALFLIFE_DAYS = float(halflife_days) if halflife_days is not None else MEM_HALFLIFE_DAYS
        except Exception:
            # keep default on parse error
            MEM_HALFLIFE_DAYS = MEM_HALFLIFE_DAYS
        try:
            W_REC = float(fresh_weight) if fresh_weight is not None else W_REC
        except Exception:
            W_REC = W_REC
    hits_raw: List[Dict[str, Any]] = []
    for tier in sorted(allowed):
        tier_dir = MEM_TIER_DIR / tier
        if not tier_dir.exists():
            continue
        days = sorted([p for p in tier_dir.iterdir() if p.is_dir()], key=lambda p: p.name, reverse=True)
        for ddir in days:
            for jf in sorted(ddir.glob("*.jsonl"), reverse=True):
                try:
                    with jf.open("r", encoding="utf-8") as f:
                        for lineno, line in enumerate(f, start=1):
                            try:
                                obj = json.loads(line)
                            except Exception:
                                continue
                            wt = obj.get("weight") or {}
                            if wt.get("kind") == "a1_evidence":
                                continue
                            text = str(obj.get("redacted_text") or obj.get("text") or "")
                            # Legacy A1 evidence text guard (pre-tag records)
                            if ("관련 메모 상위" in text and ("근거 인용" in text or "검색 로그" in text)) or (text.startswith("질문: ") and "관련 메모 상위" in text):
                                continue
                            ts = str(obj.get("ts") or "")
                            scope_id = obj.get("scope_id")
                            refs = obj.get("refs") or []

                            s_kw = kw_score(text, scope_id)
                            s_rec = recency_score(ts)
                            s_refs = refs_score(refs)
                            s_tier = TIER_W.get(tier, 0.0)

                            score = W_KW * s_kw + W_REC * s_rec + W_REFS * s_refs + W_TIER * s_tier
                            if score <= 0.0:
                                continue

                            hits_raw.append({
                                "tier": tier,
                                "score": float(score),
                                "ts": ts,
                                "scope_id": scope_id,
                                "text": text[:400],
                                "path": relpath(jf),
                                "line_from": lineno,
                                "line_to": lineno,
                                "reasons": {
                                    "kw": float(s_kw),
                                    "recency": float(s_rec),
                                    "refs": float(s_refs),
                                    "tier_weight": float(s_tier),
                                },
                            })
                except Exception:
                    continue

    # threshold and sort
    hits_raw = [h for h in hits_raw if h["score"] >= MEM_SCORE_MIN]
    hits_raw.sort(key=lambda h: (h["score"], h.get("ts") or ""), reverse=True)

    # dedup: prefer distinct paths
    items: List[Dict[str, Any]] = []
    seen_paths: set = set()
    for h in hits_raw:
        if len(items) >= MEM_K:
            break
        key = (h["path"])
        if key in seen_paths:
            continue
        seen_paths.add(key)
        items.append(h)

    quorum_returned = len(items)
    no_hit = quorum_returned == 0

    # Evidence logging
    # ST-1205 — Self-RAG 1-pass rerank and evidence logging (before/after)
    pre_items = [dict(h) for h in items]
    if int(self_rag or 0) != 0:
        def _rubric_score(h: Dict[str, Any]) -> float:
            rs = h.get("reasons", {})
            cov = float(rs.get("kw", 0.0))
            fresh = float(rs.get("recency", 0.0))
            refs = float(rs.get("refs", 0.0))
            base = 0.6 * cov + 0.2 * fresh + 0.2 * refs
            # bonus: if refs ≥ 1 (normalized refs >= 0.2), add +0.05 (capped at 1.0)
            if refs >= 0.2:
                base = min(1.0, base + 0.05)
            return min(1.0, base)
        reranked: List[Dict[str, Any]] = []
        for h in items:
            rs = h.get("reasons", {}) or {}
            cov = float(rs.get("kw", 0.0))
            fresh = float(rs.get("recency", 0.0))
            refs = float(rs.get("refs", 0.0))
            base_score = float(h.get("score", 0.0))
            # apply rerank only when recency<0.2 AND refs<0.2
            apply = (fresh < 0.2 and refs < 0.2)
            rscore = _rubric_score(h) if apply else 0.0
            new_score = base_score
            bonus_applied = False
            cap_applied = False
            cap_limit = 0.02
            if apply:
                # blend
                new_score = 0.92 * base_score + 0.08 * rscore
                # cap uplift if kw ≥ 0.9
                if cov >= 0.9 and (new_score - base_score) > cap_limit:
                    new_score = base_score + cap_limit
                    cap_applied = True
                # bonus_applied flag mirrors rubric bonus condition
                bonus_applied = (refs >= 0.2)
            hh = dict(h)
            hh["rerank"] = {
                "applied": bool(apply),
                "rubric": float(rscore) if apply else None,
                "new_score": float(new_score),
                "bonus_applied": bool(bonus_applied),
                "cap_applied": bool(cap_applied),
                "cap_limit": cap_limit if apply else 0.0,
            }
            reranked.append(hh)
        reranked.sort(key=lambda x: (x["rerank"]["new_score"], x.get("ts") or ""), reverse=True)
        items = reranked[:MEM_K]
    quorum_returned = len(items)
    no_hit = quorum_returned == 0
    # Write recall_runs evidence with before/after comparison
    try:
        day2 = _date_part(now_iso())
        recall_dir = MEMORY_ROOT / "recall_runs" / day2
        recall_dir.mkdir(parents=True, exist_ok=True)
        recall_run_id = f"run_{int(datetime.now(timezone.utc).timestamp()*1000):013d}"
        recall_path = recall_dir / f"{recall_run_id}.json"
        recall_payload = {
            "query": q_raw,
            "params": {
                "k": MEM_K,
                "need_fresh": int(need_fresh or 0),
                "half_life_days": float(halflife_days) if halflife_days is not None else MEM_HALFLIFE_DAYS,
                "fresh_weight": float(fresh_weight) if fresh_weight is not None else W_REC,
                "self_rag": int(self_rag or 0),
                "tiers": sorted(list(allowed)),
                "rerank_blend": {"score_w": 0.92, "rubric_w": 0.08},
                "rubric_weights": {"kw": 0.6, "recency": 0.2, "refs": 0.2},
                "rerank_policy": {
                    "apply_if": "recency<0.2 AND refs<0.2",
                    "bonus": {"refs_ge_1_add": 0.05, "normalized_threshold": 0.2},
                    "cap": {"kw_ge": 0.9, "max_uplift": 0.02}
                },
            },
            "pre_items": pre_items,
            "post_items": items,
            "ts": now_iso(),
        }
        recall_path.write_text(json.dumps(recall_payload, ensure_ascii=False, indent=2), encoding="utf-8")
    except Exception:
        pass
    day = _date_part(now_iso())
    base_log_dir = MEMORY_ROOT / "search_runs" / day
    try:
        base_log_dir.mkdir(parents=True, exist_ok=True)
    except Exception:
        pass
    run_id = f"run_{int(datetime.now(timezone.utc).timestamp()*1000):013d}"
    run_path = base_log_dir / f"{run_id}.json"
    payload = {
        "query": q_raw,
        "tiers": sorted(list(allowed)),
        "weights": {"kw": W_KW, "recency": W_REC, "refs": W_REFS, "tier": W_TIER, "tier_map": TIER_W},
        "params": {"k": MEM_K, "half_life_days": MEM_HALFLIFE_DAYS, "score_min": MEM_SCORE_MIN, "quorum_min": QUORUM_MIN, "quorum_target": QUORUM_TARGET},
        "items": items,
        "no_hit": no_hit,
        "ts": now_iso(),
    }
    try:
        run_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    except Exception:
        pass

    # legacy summary file (daily)
    res_path = MEM_SEARCH_DIR / f"results_{day}.json"
    try:
        existing = {}
        if res_path.exists():
            existing = json.loads(res_path.read_text(encoding="utf-8"))
        existing[str(int(datetime.now(timezone.utc).timestamp()))] = {"query": q_raw, "items": items[:MEM_K], "no_hit": no_hit}
        res_path.write_text(json.dumps(existing, ensure_ascii=False, indent=2), encoding="utf-8")
    except Exception:
        pass

    suggestion: Optional[Dict[str, Any]] = None
    if no_hit:
        tmpl_path = STATUS_ROOT / "resources" / "memory" / "nohit_templates_ko_v1.json"
        try:
            tmpl = json.loads(tmpl_path.read_text(encoding="utf-8"))
            cands = [t for t in tmpl.get("templates", []) if t.get("style") in {"standard", "action"}]
            if cands:
                t0 = cands[0]
                text = t0.get("text", "")
                text = text.replace("{query}", q_raw).replace("{suggest}", q_raw).replace("{evidence_path}", relpath(run_path))
                suggestion = {"template_id": t0.get("id"), "text": text, "evidence_path": relpath(run_path)}
        except Exception:
            pass

    data = {
        "query": q_raw,
        "items": items,
        "quorum": {"required": QUORUM_MIN, "returned": quorum_returned},
        "no_hit": no_hit,
        "suggestion": suggestion,
        "evidence_path": relpath(run_path),
        # backward-compat fields (optional)
        "results": items,
        "count": quorum_returned,
    }
    meta = {"ts": now_iso(), "limits": {"k": MEM_K, "half_life_days": MEM_HALFLIFE_DAYS}}

    return {"ok": True, "data": data, "meta": meta}


@app.get("/api/search/unified")
def search_unified(
    q: str,
    k: int = 5,
    half_life: Optional[float] = None,
    fresh: Optional[float] = None,
    self_rag: int = 1,
    strict: int = 1,
) -> Dict[str, Any]:
    """
    Phase 3 unified search:
    - Channels: memory (existing) + file(v0: whitelist, kw+mtime) in parallel
    - Router applies freshness weighting and conditional Self‑RAG rerank(v0.5)
      · apply_if: recency<0.2 AND refs<0.2
      · blend: 0.92*base_score + 0.08*rubric(kw 0.6, recency 0.2, refs 0.2)
      · bonus: refs≥1 → +0.05 (normalized threshold 0.2)
      · cap: if kw≥0.9 then uplift≤0.02
    - Returns {pre, post, source_mix, grounded, evidence_path}
    - Logs to status/evidence/memory/unified_runs/YYYYMMDD/run_*.json with rerank policy/weights
    - strict=1 and no evidence -> ok:false + hint (front-end shows 'no evidence' template)
    """
    need_fresh = 1 if (half_life is not None or fresh is not None) else 0

    # Memory channel
    ms = memory_search(
        q=q,
        k=k,
        tiers=None,
        need_fresh=need_fresh,
        halflife_days=half_life,
        fresh_weight=fresh,
        self_rag=self_rag,
    )
    mdata = ms.get("data", {}) if isinstance(ms, dict) else {}
    mem_items = list(mdata.get("items") or [])
    evidence_path = mdata.get("evidence_path")

    # File channel (guarded by ENV)
    file_enabled = str(ENV.get("FILE_RETRIEVER_ENABLED", "")).strip().lower() in {"1", "true", "yes", "on"}
    file_hits: List[Dict[str, Any]] = []
    if file_enabled:
        try:
            from app.search.file_retriever_v0 import file_retriever_v0  # lazy import
            fitems = file_retriever_v0(
                query=q,
                k=k,
                half_life_days=float(half_life) if half_life is not None else None or 30.0,
            )
            # Map file evidence -> memory-like hit shape
            for fi in fitems or []:
                reason = fi.get("reason") or {}
                file_hits.append(
                    {
                        "tier": "file",
                        "score": float(fi.get("score") or 0.0),
                        "ts": fi.get("ts"),
                        "scope_id": None,
                        "text": (fi.get("snippet") or "")[:400],
                        "path": fi.get("path"),
                        "line_from": 0,
                        "line_to": 0,
                        "reasons": {
                            "kw": float(reason.get("kw", 0.0)),
                            "recency": float(reason.get("recency", 0.0)),
                            "refs": float(reason.get("refs", 0.0)),
                            "tier_weight": 0.0,
                        },
                    }
                )
        except Exception:
            file_hits = []

    # Merge and rank (Phase 2: use channel-native scores; Phase 2C: strict kw>0 filter)
    candidates: List[Dict[str, Any]] = list(mem_items) + list(file_hits)

    # Phase 2C — Strict kw>0 filter to allow true no-evidence case under SGM
    if int(strict or 0) != 0:
        _filtered: List[Dict[str, Any]] = []
        for h in candidates:
            rs = h.get("reasons") or {}
            try:
                if float(rs.get("kw", 0.0)) > 0.0:
                    _filtered.append(h)
            except Exception:
                # malformed reasons: treat as kw=0.0 (drop)
                continue
        candidates = _filtered

    # Sort by score desc, then ts desc (missing ts -> 0)
    def _ts_key(hit: Dict[str, Any]) -> float:
        try:
            t = str(hit.get("ts") or "")
            return datetime.fromisoformat(t.replace("Z", "+00:00")).timestamp()
        except Exception:
            return 0.0

    # Phase 3 — Conditional Self‑RAG rerank (0.92/0.08 + bonus/cap)
    def _rubric_score(h: Dict[str, Any]) -> float:
        rs = h.get("reasons") or {}
        cov = float(rs.get("kw", 0.0))
        fresh = float(rs.get("recency", 0.0))
        refs = float(rs.get("refs", 0.0))
        base = 0.6 * cov + 0.2 * fresh + 0.2 * refs
        if refs >= 0.2:
            base = min(1.0, base + 0.05)
        return min(1.0, base)

    reranked: List[Dict[str, Any]] = []
    rerank_applied = 0
    for h in candidates:
        rs = h.get("reasons") or {}
        cov = float(rs.get("kw", 0.0))
        fresh = float(rs.get("recency", 0.0))
        refs = float(rs.get("refs", 0.0))
        base_score = float(h.get("score") or 0.0)
        apply = (fresh < 0.2 and refs < 0.2)
        rscore = _rubric_score(h) if apply else 0.0
        new_score = base_score
        bonus_applied = False
        cap_applied = False
        cap_limit = 0.02
        if apply:
            new_score = 0.92 * base_score + 0.08 * rscore
            if cov >= 0.9 and (new_score - base_score) > cap_limit:
                new_score = base_score + cap_limit
                cap_applied = True
            bonus_applied = (refs >= 0.2)
            rerank_applied += 1
        hh = dict(h)
        hh["rerank"] = {
            "applied": bool(apply),
            "rubric": float(rscore) if apply else None,
            "new_score": float(new_score),
            "bonus_applied": bool(bonus_applied),
            "cap_applied": bool(cap_applied),
            "cap_limit": cap_limit if apply else 0.0,
        }
        hh["_rank_score"] = float(new_score)
        reranked.append(hh)

    reranked.sort(key=lambda h: (float(h.get("_rank_score") or 0.0), _ts_key(h)), reverse=True)
    pre = [dict({k: v for k, v in x.items() if k != "_rank_score"}) for x in reranked]
    top_k = max(1, min(100, int(k or 5)))
    post = pre[:top_k]

    # Mix and gate
    file_in_post = sum(1 for h in post if str(h.get("tier")) == "file")
    mem_in_post = len(post) - file_in_post
    source_mix = {"memory": mem_in_post, "file": file_in_post}
    grounded = len(post) > 0

    # Write unified_runs evidence
    try:
        day = _date_part(now_iso())
        ur_dir = MEMORY_ROOT / "unified_runs" / day
        ur_dir.mkdir(parents=True, exist_ok=True)
        run_id = f"run_{int(datetime.now(timezone.utc).timestamp()*1000):013d}"
        run_path = ur_dir / f"{run_id}.json"
        payload = {
            "query": q,
            "params": {
                "k": int(k),
                "half_life_days": float(half_life) if half_life is not None else None,
                "fresh_weight": float(fresh) if fresh is not None else None,
                "self_rag": int(self_rag or 0),
                "strict": int(strict or 0),
                "need_fresh": int(need_fresh),
                "file_enabled": bool(file_enabled),
            },
            "source_mix": source_mix,
            "pre_count": len(pre),
            "post_count": len(post),
            "grounded": bool(grounded),
            "evidence_path_from_memory_search": evidence_path,
            "rerank_policy": {
                "apply_if": "recency<0.2 AND refs<0.2",
                "blend": {"score_w": 0.92, "rubric_w": 0.08},
                "rubric_weights": {"kw": 0.6, "recency": 0.2, "refs": 0.2},
                "bonus": {"refs_ge_1_add": 0.05, "normalized_threshold": 0.2},
                "cap": {"kw_ge": 0.9, "max_uplift": 0.02}
            },
            "rerank_applied": int(rerank_applied),
            "ts": now_iso(),
        }
        run_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    except Exception:
        run_path = None

    if int(strict or 0) != 0 and not grounded:
        hint = {
            "suggestion": (mdata.get("suggestion") or {}).get("text") if isinstance(mdata.get("suggestion"), dict) else None,
            "evidence_path": evidence_path or (relpath(run_path) if run_path else None),
        }
        return {"ok": False, "hint": hint}

    data = {
        "pre": pre,
        "post": post,
        "source_mix": source_mix,
        "grounded": grounded,
        "evidence_path": evidence_path or (relpath(run_path) if run_path else None),
        "logs": {
            "need_fresh": need_fresh,
            "self_rag": int(self_rag or 0) if isinstance(self_rag, int) else int(self_rag or 0),
            "file_enabled": bool(file_enabled),
            "rerank_policy": {
                "apply_if": "recency<0.2 AND refs<0.2",
                "blend": {"score_w": 0.92, "rubric_w": 0.08},
                "rubric_weights": {"kw": 0.6, "recency": 0.2, "refs": 0.2},
                "bonus": {"refs_ge_1_add": 0.05, "normalized_threshold": 0.2},
                "cap": {"kw_ge": 0.9, "max_uplift": 0.02}
            },
            "rerank_applied": int(rerank_applied),
        },
    }
    return {"ok": True, "data": data, "meta": {"ts": now_iso()}}


@app.get("/api/memory/recall")
def memory_recall(scope: Optional[str] = None, per_tier: int = 3) -> Dict[str, Any]:
    out: Dict[str, List[Dict[str, Any]]] = {}
    nowd = _date_part(now_iso())

    for tier in MEM_TIERS:
        tier_dir = MEM_TIER_DIR / tier
        items: List[Dict[str, Any]] = []
        if tier_dir.exists():
            days = sorted([p for p in tier_dir.iterdir() if p.is_dir()], key=lambda p: p.name, reverse=True)
            for ddir in days:
                for jf in sorted(ddir.glob("*.jsonl"), reverse=True):
                    try:
                        with jf.open("r", encoding="utf-8") as f:
                            for line in f:
                                try:
                                    obj = json.loads(line)
                                except Exception:
                                    continue
                                if scope and str(obj.get("scope_id") or "").strip() != str(scope).strip():
                                    continue
                                items.append({
                                    "tier": tier,
                                    "ts": obj.get("ts"),
                                    "scope_id": obj.get("scope_id"),
                                    "text": (obj.get("text") or "")[:400],
                                    "path": relpath(jf),
                                })
                    except Exception:
                        continue
        # recent-first by ts
        def _ts_key(o: Dict[str, Any]) -> float:
            try:
                return datetime.fromisoformat(str(o.get("ts") or "").replace("Z", "+00:00")).timestamp()
            except Exception:
                return 0.0

        items.sort(key=_ts_key, reverse=True)
        out[tier] = items[: max(1, min(20, per_tier))]

    # write recall evidence
    card_path = MEM_RECALL_DIR / f"cards_{nowd}.json"
    try:
        card_path.write_text(json.dumps({"scope": scope, "per_tier": per_tier, "cards": out}, ensure_ascii=False, indent=2), encoding="utf-8")
    except Exception:
        pass

    return {"ok": True, "data": {"cards": out, "path": relpath(card_path)}, "meta": {"ts": now_iso()}}

# ST-1204 — Gate API skeleton (propose/approve/reject/list/item/stats)
class GateProposeRequest(BaseModel):
    text: str
    refs: List[str]
    proposer: str
    rationale: Optional[str] = None
    scope_id: Optional[str] = None
    sessionId: Optional[str] = None
    redacted_text: Optional[str] = None

class GateApproveRequest(BaseModel):
    id: str
    approver: str
    runId: str
    checkpointEvidence: str
    override_reason: Optional[str] = None

class GateRejectRequest(BaseModel):
    id: str
    approver: str
    reject_code: str
    reason: Optional[str] = None
    runId: str

@app.post("/api/memory/gate/propose")
def gate_propose(body: GateProposeRequest = Body(...)) -> Dict[str, Any]:
    # Validate
    text = (body.redacted_text or body.text or "").strip()
    if not text:
        raise HTTPException(status_code=400, detail="text required")
    refs = list(body.refs or [])
    proposer = (body.proposer or "").strip()
    if not proposer:
        raise HTTPException(status_code=400, detail="proposer required")

    # Auto checks
    pii = pii_scan_and_redact(text)
    # If redacted_text was not supplied and PII found, keep suggested redaction
    redacted_text = body.redacted_text or (pii.get("redacted_text") if pii.get("redaction_suggested") else None)
    final_text = redacted_text or text
    h = sha256_text(final_text)

    # Diversity (house-only relax heuristic: single repo → need 4 refs & distinct subroots)
    div = compute_source_diversity(refs, house_only_relax=False)

    # Compose proposal
    gid = ulid()
    now = now_iso()
    proposal = {
        "id": gid,
        "created_at": now,
        "state": "pending",
        "proposer": proposer,
        "scope_id": body.scope_id,
        "session_id": body.sessionId or "GG-SESS-LOCAL",
        "text": body.text,
        "redacted_text": redacted_text,
        "refs": refs,
        "rationale": body.rationale,
        "sha256": h,
        "source_roots": [extract_source_root(r.split("#", 1)[0]) for r in refs],
        "source_diversity_ok": bool(div.get("source_diversity_ok")),
        "dup_candidates": [],
        "pii_flags": pii.get("flags") or [],
        "auto_checks": {
            "ref_count_ok": bool(div.get("ref_count_ok")),
            "source_diversity_ok": bool(div.get("source_diversity_ok")),
            "pii_detected": bool(pii.get("flags")),
            "redaction_suggested": bool(pii.get("redaction_suggested")),
            "duplicate_sha256": False,
            "similarity_warning": False,
            "similarity_block": False,
            "top_similarity": 0.0,
            "notes": [],
        },
        "embedding_version": os.environ.get("EMBEDDING_VERSION", None),
    }

    # Persist pending
    day = _date_part(now)
    base_dir = EVIDENCE_ROOT / "memory" / "gate" / "pending" / day
    base_dir.mkdir(parents=True, exist_ok=True)
    ppath = base_dir / f"{gid}.json"
    ppath.write_text(json.dumps(proposal, ensure_ascii=False, indent=2), encoding="utf-8")

    # Audit
    audit = append_audit(actor=proposer, action="PROPOSE", gate_id=gid, meta={
        "state": "pending",
        "path": relpath(ppath),
        "sha256": h,
        "source_diversity_ok": bool(div.get("source_diversity_ok")),
        "ref_count_ok": bool(div.get("ref_count_ok")),
    })

    return {
        "ok": True,
        "data": {
            "state": "pending",
            "proposal": proposal,
            "pending_path": relpath(ppath),
            "audit_path": audit.get("path"),
            "audit_appended": True
        },
        "meta": {"ts": now_iso(), "checks": proposal["auto_checks"]},
    }

@app.patch("/api/memory/gate/propose/{id}")
def gate_patch_proposal(id: str, payload: Dict[str, Any] = Body(...)) -> Dict[str, Any]:
    if not id:
        raise HTTPException(status_code=400, detail="id required")
    # Locate pending
    gate_dir = EVIDENCE_ROOT / "memory" / "gate" / "pending"
    target = None
    if gate_dir.exists():
        for d in sorted(gate_dir.iterdir(), reverse=True):
            f = d / f"{id}.json"
            if f.exists():
                target = f
                break
    if not target:
        raise HTTPException(status_code=404, detail="Proposal not found")
    obj = json.loads(target.read_text(encoding="utf-8"))
    if obj.get("state") != "pending":
        raise HTTPException(status_code=409, detail="Not editable")

    red = (payload or {}).get("redacted_text")
    if red is not None:
        obj["redacted_text"] = str(red)
        obj["sha256"] = sha256_text(obj["redacted_text"] or obj.get("text") or "")
    # Optional typo_fixes ignored/minimized for now

    target.write_text(json.dumps(obj, ensure_ascii=False, indent=2), encoding="utf-8")
    au = append_audit(actor=str(obj.get("proposer") or "unknown"), action="PATCH", gate_id=id, meta={
        "fields": ["redacted_text"],
        "path": relpath(target),
        "pii_detected": bool(obj.get("pii_flags")),
        "redaction_suggested": bool(obj.get("auto_checks", {}).get("redaction_suggested")),
    })
    return {
        "ok": True,
        "data": {"state": "pending", "proposal": obj, "pending_path": relpath(target), "audit_path": au.get("path")},
        "meta": {"ts": now_iso()},
    }

@app.post("/api/memory/gate/withdraw")
def gate_withdraw(payload: Dict[str, Any] = Body(...)) -> Dict[str, Any]:
    pid = (payload or {}).get("id")
    actor = (payload or {}).get("actor") or "unknown"
    if not pid:
        raise HTTPException(status_code=400, detail="id required")
    gate_dir = EVIDENCE_ROOT / "memory" / "gate" / "pending"
    target = None
    if gate_dir.exists():
        for d in sorted(gate_dir.iterdir(), reverse=True):
            f = d / f"{pid}.json"
            if f.exists():
                target = f
                break
    if not target:
        raise HTTPException(status_code=404, detail="Proposal not found")
    obj = json.loads(target.read_text(encoding="utf-8"))
    if obj.get("state") != "pending":
        raise HTTPException(status_code=409, detail="Not allowed")
    obj["state"] = "withdrawn"
    target.write_text(json.dumps(obj, ensure_ascii=False, indent=2), encoding="utf-8")
    audit = append_audit(actor=actor, action="WITHDRAW", gate_id=pid, meta={"state": "withdrawn", "path": relpath(target)})
    return {
        "ok": True,
        "data": {
            "audit_appended": True,
            "audit_path": audit.get("path"),
            "prev_hash": audit.get("prev_hash"),
            "this_hash": audit.get("this_hash")
        },
        "meta": {"ts": now_iso()},
    }

@app.post("/api/memory/gate/approve")
def gate_approve(body: GateApproveRequest = Body(...)) -> Dict[str, Any]:
    gid = (body.id or "").strip()
    if not gid:
        raise HTTPException(status_code=400, detail="id required")

    # Find pending
    gate_dir = EVIDENCE_ROOT / "memory" / "gate" / "pending"
    pfile = None
    for d in sorted(gate_dir.iterdir(), reverse=True) if gate_dir.exists() else []:
        f = d / f"{gid}.json"
        if f.exists():
            pfile = f
            break
    if not pfile:
        raise HTTPException(status_code=404, detail="Proposal not found")

    prop = json.loads(pfile.read_text(encoding="utf-8"))
    proposer = str(prop.get("proposer") or "")
    if proposer == (body.approver or ""):
        raise HTTPException(status_code=403, detail="FOUR_EYES")

    # Checks: ref count, diversity, PII, duplicate sha256 (naive within approved set)
    refs = prop.get("refs") or []
    div = compute_source_diversity(refs, house_only_relax=False)
    if not (div.get("ref_count_ok") and div.get("source_diversity_ok")):
        raise HTTPException(status_code=422, detail="WEAK_EVIDENCE")

    final_text = prop.get("redacted_text") or prop.get("text") or ""
    if (prop.get("auto_checks", {}).get("pii_detected") and not prop.get("redacted_text")):
        raise HTTPException(status_code=422, detail="PII")

    approved_sha = sha256_text(final_text)

    # Duplicate check (approved set + L5 ultra_long) with rglob and debug evidence
    appr_dir_root = EVIDENCE_ROOT / "memory" / "gate" / "approved"
    found_approved: List[str] = []
    if appr_dir_root.exists():
        for jf in appr_dir_root.rglob("*.json"):
            try:
                jo = json.loads(jf.read_text(encoding="utf-8"))
                if jo.get("approved_sha256") == approved_sha:
                    found_approved.append(relpath(jf))
            except Exception:
                continue
    l5_dir = MEM_TIER_DIR / "ultra_long"
    found_l5: List[str] = []
    if l5_dir.exists():
        for jl in l5_dir.rglob("*.jsonl"):
            try:
                with jl.open("r", encoding="utf-8") as f:
                    for line in f:
                        try:
                            obj = json.loads(line)
                        except Exception:
                            continue
                        txt = str(obj.get("text") or "")
                        if sha256_text(txt) == approved_sha:
                            found_l5.append(relpath(jl))
                            break
            except Exception:
                continue
    # Write de-dup debug evidence
    try:
        dbg_dir = EVIDENCE_ROOT / "memory" / "gate" / "audit"
        dbg_dir.mkdir(parents=True, exist_ok=True)
        dbg = dbg_dir / f"dedup_debug_{_date_part(now_iso())}.jsonl"
        with dbg.open("a", encoding="utf-8") as fp:
            fp.write(json.dumps({
                "ts": now_iso(),
                "id": gid,
                "approved_sha256": approved_sha,
                "found_approved": found_approved,
                "found_l5": found_l5
            }, ensure_ascii=False) + "\n")
    except Exception:
        pass
    if found_approved or found_l5:
        raise HTTPException(status_code=409, detail="DUPLICATE")

    # Issue gate token
    token = make_gate_token(gid, approved_sha, secret=os.environ.get("GATE_HMAC_SECRET", ""))

    # Internal L5 write via memory_store
    sess = str(prop.get("session_id") or "GG-SESS-LOCAL")
    ms_req = MemoryStoreRequest(
        tier="ultra_long",
        scope_id=str(prop.get("scope_id") or "BT-12"),
        ts=now_iso(),
        text=final_text,
        refs=refs,
        mode=None,
        weight={"gate_token": token, "approved_id": gid},
        emb=None,
        sessionId=sess,
    )
    l5_res = memory_store(ms_req)
    # Write approved record
    day = _date_part(now_iso())
    appr_dir = appr_dir_root / day
    appr_dir.mkdir(parents=True, exist_ok=True)
    arec = {
        "id": gid,
        "proposal_id": gid,
        "state": "approved",
        "approved_at": now_iso(),
        "approver": body.approver,
        "run_id": body.runId,
        "checkpoint_evidence": body.checkpointEvidence,
        "approved_sha256": approved_sha,
        "gate_token": token,
        "prev_hash": None,
        "review_at": (datetime.now(timezone.utc) + timedelta(days=int(os.environ.get("GATE_REVIEW_MONTHS", "365")))).isoformat().replace("+00:00", "Z"),
        "proposal_excerpt": (final_text[:160] if final_text else ""),
        "refs": refs,
        "l5_record": l5_res.get("data", {}),
        "indexes": {"inverted_updated": True, "vector_upserted": True, "backlink_count": len(refs), "embedding_version": os.environ.get("EMBEDDING_VERSION", None), "upsert_log_line": None},
    }
    afile = appr_dir / f"{gid}.json"
    afile.write_text(json.dumps(arec, ensure_ascii=False, indent=2), encoding="utf-8")

    # Gate upsert log (summary)
    up_dir = STATUS_ROOT / "resources" / "vector_index"
    up_dir.mkdir(parents=True, exist_ok=True)
    up_path = up_dir / f"gate_upserts_{_date_part(now_iso())}.jsonl"
    try:
        with up_path.open("a", encoding="utf-8") as fp:
            fp.write(json.dumps({"ts": now_iso(), "id": gid, "embedding_version": arec["indexes"]["embedding_version"], "refs": len(refs), "l5_path": arec["l5_record"].get("path")}, ensure_ascii=False) + "\n")
        arec["indexes"]["upsert_log_line"] = relpath(up_path) + "#L?"
    except Exception:
        pass

    # Audit approve
    au = append_audit(actor=body.approver, action="APPROVE", gate_id=gid, meta={
        "state": "approved",
        "run_id": body.runId,
        "checkpoint_evidence": body.checkpointEvidence,
        "approved_sha256": approved_sha,
        "approved_path": relpath(afile),
        "l5_path": arec["l5_record"].get("path"),
        "indexes": arec["indexes"],
    })

    return {
        "ok": True,
        "data": {"state": "approved", "approved": arec, "audit_appended": True, "audit_path": au.get("path")},
        "meta": {"ts": now_iso()},
    }

@app.post("/api/memory/gate/reject")
def gate_reject(body: GateRejectRequest = Body(...)) -> Dict[str, Any]:
    gid = (body.id or "").strip()
    if not gid:
        raise HTTPException(status_code=400, detail="id required")
    # Locate pending
    gate_dir = EVIDENCE_ROOT / "memory" / "gate" / "pending"
    pfile = None
    for d in sorted(gate_dir.iterdir(), reverse=True) if gate_dir.exists() else []:
        f = d / f"{gid}.json"
        if f.exists():
            pfile = f
            break
    if not pfile:
        raise HTTPException(status_code=404, detail="Proposal not found")

    # Save rejected record
    day = _date_part(now_iso())
    rej_dir = EVIDENCE_ROOT / "memory" / "gate" / "rejected" / day
    rej_dir.mkdir(parents=True, exist_ok=True)
    rec = {
        "id": gid,
        "proposal_id": gid,
        "state": "rejected",
        "rejected_at": now_iso(),
        "approver": body.approver,
        "run_id": body.runId,
        "reject_code": body.reject_code,
        "reason": body.reason,
        "prev_hash": None,
    }
    rpath = rej_dir / f"{gid}.json"
    rpath.write_text(json.dumps(rec, ensure_ascii=False, indent=2), encoding="utf-8")

    au = append_audit(actor=body.approver, action="REJECT", gate_id=gid, meta={
        "state": "rejected",
        "run_id": body.runId,
        "reject_code": body.reject_code,
        "reason": body.reason,
        "rejected_path": relpath(rpath),
    })
    return {
        "ok": True,
        "data": {"state": "rejected", "rejected": rec, "audit_appended": True, "audit_path": au.get("path")},
        "meta": {"ts": now_iso()},
    }

@app.get("/api/memory/gate/list")
def gate_list(state: Optional[str] = None, limit: int = 50, offset: int = 0) -> Dict[str, Any]:
    roots = {
        "pending": EVIDENCE_ROOT / "memory" / "gate" / "pending",
        "approved": EVIDENCE_ROOT / "memory" / "gate" / "approved",
        "rejected": EVIDENCE_ROOT / "memory" / "gate" / "rejected",
    }
    items: List[Dict[str, Any]] = []
    states = [state] if state in roots else ["pending", "approved", "rejected"]
    for st in states:
        base = roots[st]
        if not base.exists():
            continue
        for d in sorted(base.iterdir(), reverse=True):
            for jf in sorted(d.glob("*.json")):
                try:
                    o = json.loads(jf.read_text(encoding="utf-8"))
                    excerpt = (o.get("text") or o.get("redacted_text") or o.get("proposal_excerpt") or "")[:120]
                    items.append({
                        "id": o.get("id"),
                        "state": st,
                        "created_at": o.get("created_at") or o.get("approved_at") or o.get("rejected_at"),
                        "proposer": o.get("proposer"),
                        "approver": o.get("approver"),
                        "excerpt": excerpt,
                        "refs_count": len(o.get("refs") or []),
                        "source_roots": o.get("source_roots") or [],
                        "path": relpath(jf),
                    })
                except Exception:
                    continue
    sliced = items[offset: offset + max(1, min(200, int(limit or 50)))]
    return {"ok": True, "data": {"items": sliced, "count": len(items), "state": state}, "meta": {"ts": now_iso()}}

@app.get("/api/memory/gate/item/{id}")
def gate_item(id: str) -> Dict[str, Any]:
    def find_in(root: Path) -> Optional[Tuple[str, Dict[str, Any]]]:
        if not root.exists():
            return None
        for d in sorted(root.iterdir(), reverse=True):
            f = d / f"{id}.json"
            if f.exists():
                try:
                    return (relpath(f), json.loads(f.read_text(encoding="utf-8")))
                except Exception:
                    return (relpath(f), {})
        return None
    roots = {
        "pending": EVIDENCE_ROOT / "memory" / "gate" / "pending",
        "approved": EVIDENCE_ROOT / "memory" / "gate" / "approved",
        "rejected": EVIDENCE_ROOT / "memory" / "gate" / "rejected",
    }
    for st, rp in roots.items():
        found = find_in(rp)
        if found:
            p, obj = found
            return {"ok": True, "data": {"state": st, "path": p, **({"proposal": obj} if st == "pending" else ({st: obj}))}, "meta": {"ts": now_iso()}}
    raise HTTPException(status_code=404, detail="Not found")

@app.get("/api/memory/gate/stats")
def gate_stats() -> Dict[str, Any]:
    def count(dirp: Path) -> int:
        if not dirp.exists():
            return 0
        n = 0
        for d in dirp.iterdir():
            if d.is_dir():
                n += sum(1 for _ in d.glob("*.json"))
        return n
    pending = EVIDENCE_ROOT / "memory" / "gate" / "pending"
    approved = EVIDENCE_ROOT / "memory" / "gate" / "approved"
    rejected = EVIDENCE_ROOT / "memory" / "gate" / "rejected"
    pc, ac, rc = count(pending), count(approved), count(rejected)
    rate = (ac / max(1, (pc + ac + rc))) if (pc + ac + rc) else 0.0
    # Optional snapshot
    snapdir = EVIDENCE_ROOT / "memory" / "gate" / "audit"
    snap = snapdir / f"stats_{_date_part(now_iso())}.json"
    try:
        snap.write_text(json.dumps({"ts": now_iso(), "pending": pc, "approved": ac, "rejected": rc, "rate": rate}, ensure_ascii=False, indent=2), encoding="utf-8")
        snap_rel = relpath(snap)
    except Exception:
        snap_rel = None
    return {"ok": True, "data": {"pending_count": pc, "approved_count": ac, "rejected_count": rc, "approval_rate": rate}, "meta": {"ts": now_iso(), "snapshot_path": snap_rel}}

# ST-1203 — Uncontrolled speech anchoring v1 (recent ST/BT cards + top memory evidence)

class AnchorRequest(BaseModel):
    speech: str = Field(..., description="Uncontrolled speech utterance")
    sessionId: Optional[str] = Field(default=None, description="Logical session id")
    maxCards: int = Field(default=5, ge=1, le=20)
    k: int = Field(default=3, ge=1, le=10)
    tiers: Optional[str] = Field(default=None, description="Comma-separated tier list")
    mode: Optional[str] = Field(default=None, description="SAFE/NORMAL")

def _parse_recent_cards(max_cards: int = 5) -> List[Dict[str, Any]]:
    path = PROJECT_ROOT / "status" / "checkpoints" / "CKPT_72H_RUN.md"
    cards: List[Dict[str, Any]] = []
    if not path.exists():
        return cards
    try:
        lines = path.read_text(encoding="utf-8").splitlines()
    except Exception:
        return cards

    cur: Dict[str, Any] = {}
    for raw in lines:
        line = raw.strip()
        if line.startswith("RUN_ID:"):
            if cur:
                cards.append(cur)
            cur = {"run_id": line.split(":", 1)[1].strip()}
        elif line.startswith("UTC_TS:"):
            cur["utc_ts"] = line.split(":", 1)[1].strip()
        elif line.startswith("SCOPE:"):
            cur["scope"] = line.split(":", 1)[1].strip()
        elif line.startswith("DECISION:"):
            cur["decision"] = line.split(":", 1)[1].strip()
        elif line.startswith("NEXT STEP:"):
            cur["next_step"] = line.split(":", 1)[1].strip()
        elif line.startswith("EVIDENCE:"):
            cur["evidence"] = line.split(":", 1)[1].strip()
    if cur:
        cards.append(cur)

    def is_st_bt(c: Dict[str, Any]) -> bool:
        dec = str(c.get("decision", ""))
        return ("ST-" in dec) or ("BT-" in dec)

    filtered = [c for c in cards if is_st_bt(c)]
    return filtered[-max_cards:]

def _speech_implies_meeting(s: str) -> bool:
    s = (s or "").lower()
    keys = ["회의", "회의록", "미팅", "meeting", "record", "녹화", "기록"]
    return any(k in s for k in keys)

def _meeting_snapshot(session_id: str, limit: int = 10) -> Dict[str, Any]:
    # Build meeting evidence bundle (tail events + record status)
    mid = safe_id(session_id, "MEETING")
    mdir = ensure_meeting_dir(mid)
    events_path = STORE.events_path(mid)
    events: List[Dict[str, Any]] = []
    if events_path.exists():
        for ln in _tail_lines(events_path, limit=max(1, min(100, limit))):
            try:
                obj = json.loads((ln or "").strip())
                if isinstance(obj, dict):
                    # keep only minimal keys
                    events.append({
                        "ts": obj.get("ts"),
                        "type": obj.get("type"),
                        "note": obj.get("note") or obj.get("text"),
                        "attachment": obj.get("attachment"),
                    })
            except Exception:
                continue

    start_marker = mdir / "recording.started.json"
    stop_marker = mdir / "recording.stopped.json"
    def _read_ts(p: Path) -> Optional[str]:
        try:
            if p.exists():
                return json.loads(p.read_text(encoding="utf-8")).get("ts")
        except Exception:
            return None
        return None
    started_at = _read_ts(start_marker)
    stopped_at = _read_ts(stop_marker)
    state = "OFF"
    if started_at and (not stopped_at or started_at > stopped_at):
        state = "ON"

    duration_sec: Optional[int] = None
    try:
        if started_at:
            t0 = datetime.fromisoformat(started_at.replace("Z", "+00:00"))
            t1 = datetime.fromisoformat((stopped_at or now_iso()).replace("Z", "+00:00"))
            duration_sec = max(0, int((t1 - t0).total_seconds()))
    except Exception:
        pass

    return {
        "session_id": mid,
        "events": events,
        "events_path": relpath(events_path),
        "record_status": {
            "state": state,
            "started_at": started_at,
            "stopped_at": stopped_at,
            "duration_sec": duration_sec,
        },
    }

@app.post("/api/memory/anchor")
def memory_anchor(body: AnchorRequest = Body(...)) -> Dict[str, Any]:
    speech = (body.speech or "").strip()
    if not speech:
        raise HTTPException(status_code=400, detail="speech required")

    cards = _parse_recent_cards(max_cards=body.maxCards)

    try:
        search_res = memory_search(q=speech, k=body.k, tiers=body.tiers)  # type: ignore
        mem_items = (search_res or {}).get("data", {}).get("items", [])
    except Exception:
        mem_items = []

    sess = body.sessionId or _session_or_default(body.sessionId)
    meeting = _meeting_snapshot(sess) if _speech_implies_meeting(speech) else None
    day = _date_part(now_iso())
    run_dir = EVIDENCE_ROOT / "memory" / "anchor_runs" / day
    try:
        run_dir.mkdir(parents=True, exist_ok=True)
    except Exception:
        pass
    run_id = f"anchor_{int(datetime.now(timezone.utc).timestamp()*1000):013d}"
    run_path = run_dir / f"{run_id}.json"
    payload = {
        "speech": speech,
        "cards": cards,
        "memory_items": mem_items,
        "session_id": sess,
        "meeting": meeting,
        "mode": body.mode,
        "tiers": body.tiers,
        "k": body.k,
        "checkpoint_path": relpath(PROJECT_ROOT / "status" / "checkpoints" / "CKPT_72H_RUN.md"),
        "ts": now_iso(),
    }
    try:
        run_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    except Exception:
        pass

    data = {
        "speech": speech,
        "cards": cards,
        "evidence": mem_items,
        "meeting": meeting,
        "evidence_path": relpath(run_path),
    }
    return {"ok": True, "data": data, "meta": {"ts": now_iso()}}

# Optional: enable `python -m uvicorn app.api:app --port 8000`
if __name__ == "__main__":
    # This block is not used by automated tools; it's here for manual runs.
    import uvicorn

    port = int(ENV.get("PORT", "8000") or "8000")
    uvicorn.run("app.api:app", host="127.0.0.1", port=port, reload=False)
