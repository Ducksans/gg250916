"""
gate_utils.py — Gate utilities for ST-1204 (ultra_long Memory Gate)

Features:
- ULID generator (sortable, Crockford Base32)
- SHA-256 helpers and HMAC-SHA256 gate_token (make/verify)
- PII scan + redaction (patterns from status/resources/memory/pii/patterns_v1.json)
- Source root extraction and diversity check for refs[] (path#Lx-y)
- Audit chain logger (append-only JSONL with prev_hash → this_hash)
- Misc helpers: utc_now_iso, cosine similarity, JSONL append, safe mkdirs

Notes:
- No external deps; regex is Python's 're' (close to Rust regex used by patterns v1)
- Keep replacements conservative to minimize false positives
"""

from __future__ import annotations

import base64
import hashlib
import hmac
import json
import os
import random
import re
from dataclasses import dataclass
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional, Tuple


# ---------- Paths & Env ----------

THIS_FILE = Path(__file__).resolve()
PROJECT_ROOT = THIS_FILE.parent.parent  # gumgang_meeting/
STATUS_ROOT = PROJECT_ROOT / "status"
EVIDENCE_ROOT = STATUS_ROOT / "evidence"
RESOURCES_ROOT = STATUS_ROOT / "resources"

PII_PATTERNS_PATH = RESOURCES_ROOT / "memory" / "pii" / "patterns_v1.json"
GATE_AUDIT_DIR = EVIDENCE_ROOT / "memory" / "gate" / "audit"

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
    env.update({k: v for k, v in os.environ.items()})
    return env


ENV = _load_env(ENV_FILE)


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def _ensure_dir(p: Path) -> None:
    p.mkdir(parents=True, exist_ok=True)


def _append_jsonl(path: Path, obj: Dict[str, Any]) -> int:
    data = (json.dumps(obj, ensure_ascii=False) + "\n").encode("utf-8")
    _ensure_dir(path.parent)
    with path.open("ab") as f:
        f.write(data)
    return len(data)


# ---------- ULID (Crockford Base32; 48-bit time + 80-bit randomness) ----------

_CROCKFORD = "0123456789ABCDEFGHJKMNPQRSTVWXYZ"


def _b32_encode(data: bytes) -> str:
    # Encode to Crockford Base32 without padding (manually)
    bits = 0
    value = 0
    out = []
    for b in data:
        value = (value << 8) | b
        bits += 8
        while bits >= 5:
            idx = (value >> (bits - 5)) & 0b11111
            bits -= 5
            out.append(_CROCKFORD[idx])
    if bits:
        idx = (value << (5 - bits)) & 0b11111
        out.append(_CROCKFORD[idx])
    return "".join(out)


def ulid() -> str:
    """
    Returns a 26-char ULID string (time-ordered).
    """
    # 48-bit time = milliseconds since Unix epoch
    ms = int(datetime.now(timezone.utc).timestamp() * 1000)
    time_bytes = ms.to_bytes(6, "big")
    rand_bytes = os.urandom(10)
    enc = _b32_encode(time_bytes + rand_bytes)
    # ULID spec wants 26 chars
    if len(enc) < 26:
        enc = enc + ("0" * (26 - len(enc)))
    return enc[:26]


def is_ulid(s: str) -> bool:
    return bool(re.fullmatch(r"[0-9A-HJKMNP-TV-Z]{26}", s or ""))


# ---------- Hash & HMAC helpers ----------

def sha256_hex(data: bytes | str) -> str:
    if isinstance(data, str):
        data = data.encode("utf-8")
    return hashlib.sha256(data).hexdigest()


def hmac_sha256_hex(secret: str, msg: str) -> str:
    return hmac.new(secret.encode("utf-8"), msg.encode("utf-8"), hashlib.sha256).hexdigest()


# ---------- Gate token (HMAC) ----------

def make_gate_token(approved_id: str, approved_sha256: str, secret: Optional[str] = None, ts: Optional[str] = None) -> str:
    """
    gate_token = "gt.<id>.<tsms>.<sig>"
    - tsms: epoch milliseconds (no dots), avoids token split issues
    - sig  : HMAC(secret, f"{id}|{approved_sha256}|{tsms}") or sha256 if no secret
    """
    # Normalize timestamp to epoch milliseconds (as a string)
    if not ts:
        ts = str(int(datetime.now(timezone.utc).timestamp() * 1000))
    else:
        try:
            if ts.isdigit():
                # already ms
                pass
            else:
                t = datetime.fromisoformat(ts.replace("Z", "+00:00"))
                ts = str(int(t.timestamp() * 1000))
        except Exception:
            ts = str(int(datetime.now(timezone.utc).timestamp() * 1000))

    sec = secret or ENV.get("GATE_HMAC_SECRET", "")
    payload = f"{approved_id}|{approved_sha256}|{ts}"
    sig = hmac_sha256_hex(sec, payload) if sec else sha256_hex(payload)
    return f"gt.{approved_id}.{ts}.{sig}"


def verify_gate_token(token: str, approved_id: str, approved_sha256: str, secret: Optional[str] = None, max_skew_sec: Optional[int] = None) -> bool:
    try:
        prefix, tid, tts, sig = token.split(".", 3)
        if prefix != "gt":
            return False
        if tid != approved_id:
            return False
        # Optional skew check — supports ms epoch or ISO8601Z
        if max_skew_sec is not None:
            try:
                if tts.isdigit():
                    t = datetime.fromtimestamp(int(tts) / 1000.0, tz=timezone.utc)
                else:
                    t = datetime.fromisoformat(tts.replace("Z", "+00:00"))
                now = datetime.now(timezone.utc)
                if abs((now - t).total_seconds()) > max_skew_sec:
                    return False
            except Exception:
                return False
        sec = secret or ENV.get("GATE_HMAC_SECRET", "")
        payload = f"{approved_id}|{approved_sha256}|{tts}"
        want = hmac_sha256_hex(sec, payload) if sec else sha256_hex(payload)
        # constant-time compare
        return hmac.compare_digest(sig, want)
    except Exception:
        return False


# ---------- PII scanning & redaction ----------

@dataclass
class PiiPattern:
    id: str
    kind: str
    regex: str
    flags: str = ""
    enabled: bool = True
    severity: str = "high"
    strategy: str = "mask_full"


def _compile_flags(flags: str) -> int:
    f = 0
    if not flags:
        return f
    for ch in flags:
        if ch.lower() == "i":
            f |= re.IGNORECASE
        if ch.lower() == "m":
            f |= re.MULTILINE
        if ch.lower() == "s":
            f |= re.DOTALL
        if ch.lower() == "x":
            f |= re.VERBOSE
    return f


def load_pii_patterns(path: Path = PII_PATTERNS_PATH) -> List[PiiPattern]:
    patterns: List[PiiPattern] = []
    try:
        raw = json.loads(path.read_text(encoding="utf-8"))
        for p in raw.get("patterns", []):
            if not p.get("enabled", True):
                continue
            patterns.append(PiiPattern(
                id=str(p.get("id")),
                kind=str(p.get("kind")),
                regex=str(p.get("regex")),
                flags=str(p.get("flags", "")),
                enabled=bool(p.get("enabled", True)),
                severity=str(p.get("severity", "high")),
                strategy=str(p.get("strategy", "mask_full")),
            ))
    except Exception:
        pass
    return patterns


def _mask_email(m: re.Match) -> str:
    # keep domain, mask local
    try:
        local = m.group(1)
        domain = m.group(2)
        return "[REDACTED_EMAIL]@" + domain
    except Exception:
        return "[REDACTED_EMAIL]"


def _mask_keep_last4(m: re.Match) -> str:
    s = m.group(0)
    digits = re.sub(r"\D", "", s)
    last4 = digits[-4:] if len(digits) >= 4 else digits
    return "[REDACTED]****" + last4


def _mask_full(_: re.Match) -> str:
    return "[REDACTED]"


def apply_strategy(strategy: str, m: re.Match) -> str:
    st = (strategy or "mask_full").lower()
    if st == "mask_keep_domain":
        return _mask_email(m)
    if st == "mask_keep_last4":
        return _mask_keep_last4(m)
    if st == "mask_partial":
        # keep 2 last chars if exist
        s = m.group(0)
        tail = s[-2:] if len(s) >= 2 else s
        return "[REDACTED]**" + tail
    return _mask_full(m)


def pii_scan_and_redact(text: str, patterns: Optional[List[PiiPattern]] = None) -> Dict[str, Any]:
    """
    Returns:
      {
        "flags": [ { "kind": ..., "id": ..., "match": "...", "start": int, "end": int } ... ],
        "redaction_suggested": bool,
        "redacted_text": str
      }
    """
    if not text:
        return {"flags": [], "redaction_suggested": False, "redacted_text": text}

    pats = patterns or load_pii_patterns()
    flags: List[Dict[str, Any]] = []
    out = text

    # Apply each pattern sequentially, capturing matches for flagging.
    for p in pats:
        try:
            comp = re.compile(p.regex, _compile_flags(p.flags))
        except Exception:
            continue

        # Gather matches on current output (to avoid index skew complexity, we flag using original text positions where possible)
        matches = list(comp.finditer(out))
        if not matches:
            continue

        for m in matches:
            try:
                flags.append({
                    "kind": p.kind,
                    "id": p.id,
                    "match": m.group(0)[:120],
                    "start": m.start(),
                    "end": m.end(),
                })
            except Exception:
                pass

        # Redact on 'out' string
        try:
            out = comp.sub(lambda m: apply_strategy(p.strategy, m), out)
        except Exception:
            pass

    return {
        "flags": flags,
        "redaction_suggested": bool(flags),
        "redacted_text": out if flags else text,
    }


# ---------- Source roots & diversity ----------

_SOURCE_MAP = [
    (re.compile(r"(^|/)status/evidence/meetings/"), "meetings"),
    (re.compile(r"(^|/)status/evidence/memory/tiers/"), "memory_tiers"),
    (re.compile(r"(^|/)status/resources/vector_index/"), "vector_index"),
]


def _path_from_ref(ref: str) -> str:
    # "path#Lx-y" → "path"
    return (ref or "").split("#", 1)[0]


def extract_source_root(path: str) -> str:
    for rx, tag in _SOURCE_MAP:
        if rx.search(path):
            return tag
    # fallback: take first or first-two segments as the root-ish
    norm = path.strip("/").split("/")
    if not norm:
        return "unknown"
    # prefer first segment if it's not "status"
    if norm[0] != "status":
        return norm[0]
    # e.g., status/evidence/xyz → evidence or evidence/xyz
    if len(norm) >= 2:
        return norm[1]
    return "status"


def compute_source_diversity(refs: List[str], house_only_relax: bool = False) -> Dict[str, Any]:
    roots = [extract_source_root(_path_from_ref(r)) for r in (refs or [])]
    uniq = sorted(set(roots))
    ref_count_ok = len(refs or []) >= (4 if house_only_relax else 3)
    diversity_ok = len(uniq) >= (1 if house_only_relax else 2)
    return {
        "roots": uniq,
        "ref_count_ok": ref_count_ok,
        "source_diversity_ok": diversity_ok,
    }


# ---------- Audit chain (append-only JSONL) ----------

def _audit_day_dir(ts_iso: Optional[str] = None) -> Path:
    try:
        d = datetime.fromisoformat((ts_iso or utc_now_iso()).replace("Z", "+00:00"))
    except Exception:
        d = datetime.now(timezone.utc)
    day = f"{d.year:04d}{d.month:02d}{d.day:02d}"
    return GATE_AUDIT_DIR / day


def _audit_file(ts_iso: Optional[str] = None) -> Path:
    return _audit_day_dir(ts_iso) / "audit.jsonl"


def _audit_last_hash(path: Path) -> str:
    if not path.exists():
        return "0" * 64
    try:
        # tail last line
        with path.open("rb") as f:
            f.seek(0, os.SEEK_END)
            size = f.tell()
            block = 4096
            data = bytearray()
            pos = size
            while pos > 0 and data.count(b"\n") < 2:
                step = block if pos >= block else pos
                pos -= step
                f.seek(pos)
                data[:0] = f.read(step)
            line = data.splitlines()[-1] if data else b""
        if not line:
            return "0" * 64
        obj = json.loads(line.decode("utf-8", errors="ignore"))
        return str(obj.get("this_hash") or "").lower() or "0" * 64
    except Exception:
        return "0" * 64


def append_audit(actor: str, action: str, gate_id: str, meta: Dict[str, Any], ts_iso: Optional[str] = None) -> Dict[str, Any]:
    """
    Appends an audit line:
      {"ts","actor","action","id","prev_hash","this_hash","meta":{...}}
    Returns dict with path and hashes.
    """
    ts = ts_iso or utc_now_iso()
    af = _audit_file(ts)
    _ensure_dir(af.parent)
    prev_hash = _audit_last_hash(af)

    body = {
        "ts": ts,
        "actor": actor,
        "action": action,
        "id": gate_id,
        "prev_hash": prev_hash,
        "meta": meta or {},
    }
    # compute this_hash = sha256(prev_hash + sha256(minified_meta))
    try:
        meta_min = json.dumps(body["meta"], separators=(",", ":"), sort_keys=True)
    except Exception:
        meta_min = "{}"
    this_hash = sha256_hex(prev_hash + sha256_hex(meta_min))
    body["this_hash"] = this_hash

    _append_jsonl(af, body)
    return {"ok": True, "path": str(af.relative_to(PROJECT_ROOT)), "prev_hash": prev_hash, "this_hash": this_hash, "ts": ts}


# ---------- Similarity ----------

def cosine_sim(a: List[float], b: List[float]) -> float:
    if not a or not b or len(a) != len(b):
        return 0.0
    num = 0.0
    da = 0.0
    db = 0.0
    for x, y in zip(a, b):
        num += x * y
        da += x * x
        db += y * y
    if da <= 0.0 or db <= 0.0:
        return 0.0
    return float(num / ((da ** 0.5) * (db ** 0.5)))


# ---------- Hash helpers for text/content ----------

def sha256_text(text: str) -> str:
    return sha256_hex(text or "")


# ---------- Public summary for external modules ----------

__all__ = [
    # time/util
    "utc_now_iso",
    # ULID
    "ulid", "is_ulid",
    # hash/hmac
    "sha256_hex", "hmac_sha256_hex",
    # tokens
    "make_gate_token", "verify_gate_token",
    # pii
    "PiiPattern", "load_pii_patterns", "pii_scan_and_redact",
    # refs/diversity
    "extract_source_root", "compute_source_diversity",
    # audit
    "append_audit",
    # similarity
    "cosine_sim",
    # text hash
    "sha256_text",
]
