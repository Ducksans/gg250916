#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
sitegraph_scan.py — Generate SiteGraph snapshot v0 (Core lens)

Purpose
- Walk the repository, parse Markdown links, build a directed graph of files.
- Compute simple metrics (degree, PageRank if networkx present, fallback otherwise).
- Produce an append-only JSON snapshot matching status/design/schemas/sitegraph.schema.json (v1).

Defaults
- Root: gumgang_meeting (auto-detected from this script path)
- Lens: Core (pinned anchors + 1-hop neighborhood + selected core roles)
- Out: status/evidence/sitemap/graph_runs/YYYYMMDD/sitegraph.json
- Seed: 12345
- K: level0=8, level1=20

Usage
  python scripts/sitegraph_scan.py \
    --lens Core \
    --seed 12345 \
    --date 20250821 \
    --out-dir gumgang_meeting/status/evidence/sitemap/graph_runs/20250821 \
    [--overwrite] [--dry-run] [--max-nodes 2000]

Notes
- If 'jsonschema' is available, schema validation will run; otherwise it's skipped (soft).
- If 'networkx' is unavailable, falls back to degree-based pseudo PageRank and zero betweenness.
"""

from __future__ import annotations

import argparse
import dataclasses
import json
import os
import re
import sys
import time
from collections import defaultdict
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional, Set, Tuple

# Optional deps
try:
    import networkx as nx  # type: ignore
except Exception:  # pragma: no cover
    nx = None  # type: ignore

try:
    import jsonschema  # type: ignore
except Exception:  # pragma: no cover
    jsonschema = None  # type: ignore


# ---------- Paths / Constants ----------

SCRIPT_PATH = Path(__file__).resolve()
PROJECT_ROOT = SCRIPT_PATH.parent.parent  # gumgang_meeting/
STATUS_ROOT = PROJECT_ROOT / "status"
SCHEMA_PATH = STATUS_ROOT / "design" / "schemas" / "sitegraph.schema.json"

DENY_GLOBS = [
    ".git",
    "node_modules",
    ".venv",
    ".next",
    "target",
    "__pycache__",
    ".cache",
    "dist",
    "build",
]

# Anchors (Core lens; must remain visible or 1-hop reachable)
PINNED_ANCHORS = [
    "gumgang_meeting/.rules",
    "gumgang_meeting/status/checkpoints/CKPT_72H_RUN.md",
    "gumgang_meeting/app/api.py",
    "gumgang_meeting/status/design/memory_gate/SSOT.md",
]

# Lens presets enumeration (kept for future extension)
LENSES = {"Core", "Hub", "API", "Memory", "Runtime", "Quarantine"}


# ---------- Helpers ----------

def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def iso_snapshot_id(dt: Optional[datetime] = None) -> str:
    d = (dt or datetime.now(timezone.utc))
    return d.strftime("%Y%m%dT%H%M%SZ")


def is_denied(path: Path) -> bool:
    p = str(path)
    for g in DENY_GLOBS:
        if f"/{g}/" in p or p.endswith(f"/{g}") or p.startswith(f"{g}/"):
            return True
    return False


def repo_rel(p: Path) -> str:
    try:
        return str(p.resolve().relative_to(PROJECT_ROOT))
    except Exception:
        return str(p)


def to_sitegraph_id(p: Path) -> str:
    # Use POSIX sep and prefix with project dir name
    rel = repo_rel(p).replace("\\", "/")
    if not rel.startswith("gumgang_meeting/"):
        return f"gumgang_meeting/{rel}" if rel else "gumgang_meeting"
    return rel


def guess_kind(path: str) -> str:
    if path.endswith("/"):
        return "dir"
    if path.endswith(".md"):
        return "doc"
    if "/status/evidence/" in path:
        return "evidence"
    if "/app/" in path and (path.endswith(".py") or path.endswith(".rs") or path.endswith(".ts")):
        return "api"
    if "/ui/" in path or "/금강ui/" in path:
        return "resource"
    return "file"


def role_tags(path: str) -> List[str]:
    roles: Set[str] = set()
    if path.endswith(".rules") or "/status/checkpoints/" in path:
        roles.update(["C", "S", "D"])
    if "/status/design/" in path:
        roles.update(["S", "D"])
    if "/status/" in path:
        roles.add("D")
    if "/app/" in path:
        roles.add("A")
        roles.add("C")  # backend often central
    if "/bridge/" in path or "/scripts/" in path:
        roles.add("H")
    if "/ui/" in path or "/금강ui/" in path:
        roles.add("UI")
    if "/QUARANTINE/" in path:
        roles.add("Q")
    if "/memory/" in path:
        roles.add("M")
    if not roles:
        roles.add("X")
    return sorted(roles)


MARKDOWN_LINK_RE = re.compile(r"\[([^\]]+)\]\(([^)]+)\)")
EVIDENCE_PATH_RE = re.compile(r"^[A-Za-z0-9_\-./]+(?:#L\d+(?:-\d+)?)?$")
GFM_HEADING_RE = re.compile(r"^\s{0,3}#{1,6}\s+\S+")


def resolve_link(src_file: Path, link: str) -> Optional[str]:
    # Ignore external links (http, https, mailto)
    if re.match(r"^[a-zA-Z]+://", link):
        return None
    # Fragments only
    if link.startswith("#"):
        return None
    # Evidence line anchors keep as-is if path-like
    # Normalize to project-relative POSIX path
    if link.startswith("gumgang_meeting/"):
        target = PROJECT_ROOT / link[len("gumgang_meeting/"):]
        return to_sitegraph_id(target)
    # If absolute path (outside project) → reject
    if os.path.isabs(link):
        return None
    # Treat as relative path from src_file directory
    target = (src_file.parent / link).resolve()
    if PROJECT_ROOT in target.parents or target == PROJECT_ROOT:
        return to_sitegraph_id(target)
    return None


# ---------- Dataclasses ----------

@dataclass
class NodeInfo:
    id: str
    kind: str
    roles: List[str]
    owner: Optional[str] = None
    last_reviewed: Optional[str] = None
    mtime: Optional[str] = None
    size: int = 0
    # raw metrics
    in_degree: int = 0
    out_degree: int = 0
    evidence_count: int = 0
    pr: float = 0.0
    btw: float = 0.0
    usage_count: int = 0


@dataclass
class EdgeInfo:
    src: str
    dst: str
    type: str = "references"
    weight: float = 1.0


# ---------- Scanner ----------

def walk_files(root: Path) -> List[Path]:
    items: List[Path] = []
    for dirpath, dirnames, filenames in os.walk(root):
        # filter deny globs in-place
        dirnames[:] = [d for d in dirnames if not is_denied(Path(dirpath) / d)]
        for f in filenames:
            p = Path(dirpath) / f
            if is_denied(p):
                continue
            if p.is_file():
                items.append(p)
    return items


def parse_markdown_links(file_path: Path, text: str) -> List[str]:
    links: List[str] = []
    # Encourage local references, avoid mailto/http(s)
    for m in MARKDOWN_LINK_RE.finditer(text):
        target = m.group(2).strip()
        rid = resolve_link(file_path, target)
        if rid:
            links.append(rid)
    return links


def scan_repo(root: Path) -> Tuple[Dict[str, NodeInfo], List[EdgeInfo]]:
    nodes: Dict[str, NodeInfo] = {}
    edges: List[EdgeInfo] = []

    files = walk_files(root)
    for p in files:
        sgid = to_sitegraph_id(p)
        st = p.stat()
        n = nodes.get(sgid)
        if not n:
            n = NodeInfo(
                id=sgid,
                kind=guess_kind(sgid),
                roles=role_tags(sgid),
                mtime=datetime.fromtimestamp(st.st_mtime, tz=timezone.utc).isoformat().replace("+00:00", "Z"),
                size=int(st.st_size),
            )
            nodes[sgid] = n

        # Markdown parsing
        if p.suffix.lower() == ".md":
            try:
                txt = p.read_text(encoding="utf-8", errors="ignore")
            except Exception:
                txt = ""
            links = parse_markdown_links(p, txt)
            for dst in links:
                if dst == sgid:
                    continue
                edges.append(EdgeInfo(src=sgid, dst=dst, type="references", weight=1.0))
                # evidence heuristic: if link contains #Lx-y consider evidenceOf
                if "#" in dst and EVIDENCE_PATH_RE.match(dst.split("#", 1)[0]):
                    edges.append(EdgeInfo(src=sgid, dst=dst.split("#", 1)[0], type="evidenceOf", weight=1.0))
                    # bump evidence count on target if we have it
                    base = dst.split("#", 1)[0]
                    if base in nodes:
                        nodes[base].evidence_count += 1
    return nodes, edges


# ---------- Metrics ----------

def compute_graph_metrics(nodes: Dict[str, NodeInfo], edges: List[EdgeInfo]) -> None:
    # Build NX graph if available; else fallback
    if nx is None:
        # Fallback: in/out degree via simple counts; pr via normalized indegree; btw=0
        indeg: Dict[str, int] = defaultdict(int)
        outdeg: Dict[str, int] = defaultdict(int)
        for e in edges:
            if e.type not in ("references", "backlink", "evidenceOf"):
                continue
            outdeg[e.src] += 1
            indeg[e.dst] += 1
        max_in = max(indeg.values()) if indeg else 1
        for nid, n in nodes.items():
            n.in_degree = indeg.get(nid, 0)
            n.out_degree = outdeg.get(nid, 0)
            n.pr = (n.in_degree / max_in) if max_in > 0 else 0.0
            n.btw = 0.0
        return

    G = nx.DiGraph()
    for nid in nodes.keys():
        G.add_node(nid)
    for e in edges:
        if e.type not in ("references", "backlink", "evidenceOf"):
            continue
        # accumulate weights
        if G.has_edge(e.src, e.dst):
            G[e.src][e.dst]["weight"] += e.weight
        else:
            G.add_edge(e.src, e.dst, weight=e.weight)

    indeg = dict(G.in_degree())
    outdeg = dict(G.out_degree())
    try:
        pr = nx.pagerank(G, alpha=0.85, max_iter=100, weight="weight")
    except Exception:
        # Fallback to indegree proportions
        total = sum(indeg.values()) or 1
        pr = {n: (indeg.get(n, 0) / total) for n in G.nodes()}

    # Betweenness (approx if large)
    try:
        N = len(G)
        if N <= 800:
            btw = nx.betweenness_centrality(G, normalized=True)
        else:
            k = max(10, min(100, N // 10))
            btw = nx.betweenness_centrality(G, k=k, normalized=True, seed=42)
    except Exception:
        btw = {n: 0.0 for n in G.nodes()}

    for nid, n in nodes.items():
        n.in_degree = int(indeg.get(nid, 0))
        n.out_degree = int(outdeg.get(nid, 0))
        n.pr = float(pr.get(nid, 0.0))
        n.btw = float(btw.get(nid, 0.0))


def minmax(vals: Iterable[float]) -> Tuple[float, float]:
    lst = list(vals)
    if not lst:
        return (0.0, 1.0)
    lo = min(lst)
    hi = max(lst)
    if lo == hi:
        hi = lo + 1.0
    return (float(lo), float(hi))


def normalize_nodes(nodes: Dict[str, NodeInfo]) -> Tuple[Dict[str, Dict[str, float]], Dict[str, Dict[str, float]]]:
    # norm values and norm_params per metric
    metrics = {
        "in_degree": [float(n.in_degree) for n in nodes.values()],
        "pr": [float(n.pr) for n in nodes.values()],
        "btw": [float(n.btw) for n in nodes.values()],
        "evidence_count": [float(n.evidence_count) for n in nodes.values()],
    }
    norm_params: Dict[str, Dict[str, float]] = {}
    for k, vals in metrics.items():
        lo, hi = minmax(vals)
        norm_params[k] = {"min": lo, "max": hi}

    norms: Dict[str, Dict[str, float]] = {}
    for nid, n in nodes.items():
        norms[nid] = {
            "in_degree": (n.in_degree - norm_params["in_degree"]["min"]) / (norm_params["in_degree"]["max"] - norm_params["in_degree"]["min"]) if norm_params["in_degree"]["max"] > norm_params["in_degree"]["min"] else 0.0,
            "pr": (n.pr - norm_params["pr"]["min"]) / (norm_params["pr"]["max"] - norm_params["pr"]["min"]) if norm_params["pr"]["max"] > norm_params["pr"]["min"] else 0.0,
            "btw": (n.btw - norm_params["btw"]["min"]) / (norm_params["btw"]["max"] - norm_params["btw"]["min"]) if norm_params["btw"]["max"] > norm_params["btw"]["min"] else 0.0,
            "evidence_count": (n.evidence_count - norm_params["evidence_count"]["min"]) / (norm_params["evidence_count"]["max"] - norm_params["evidence_count"]["min"]) if norm_params["evidence_count"]["max"] > norm_params["evidence_count"]["min"] else 0.0,
        }
    return norms, norm_params


# ---------- Lens / Filter ----------

def apply_core_lens(nodes: Dict[str, NodeInfo], edges: List[EdgeInfo], max_nodes: int = 2000) -> Tuple[Dict[str, NodeInfo], List[EdgeInfo]]:
    # Keep pinned anchors, plus nodes within 1-hop of anchors, plus core role candidates
    pinned = set(PINNED_ANCHORS)
    existing = set(nodes.keys())
    keep: Set[str] = set(n for n in pinned if n in existing)

    # 1-hop neighbors
    src_to_dst: Dict[str, Set[str]] = defaultdict(set)
    dst_to_src: Dict[str, Set[str]] = defaultdict(set)
    for e in edges:
        if e.type not in ("references", "backlink", "evidenceOf"):
            continue
        src_to_dst[e.src].add(e.dst)
        dst_to_src[e.dst].add(e.src)

    for a in list(keep):
        for v in src_to_dst.get(a, ()):
            keep.add(v)
        for u in dst_to_src.get(a, ()):
            keep.add(u)

    # Role candidates (central/control)
    for nid, n in nodes.items():
        if any(r in n.roles for r in ("C", "H", "A", "S", "D")):
            keep.add(nid)

    # Limit by max_nodes — keep pinned first, then by in_degree+pr rank
    if len(keep) > max_nodes:
        # rank non-pinned candidates
        candidates = [nid for nid in keep if nid not in pinned]
        candidates.sort(key=lambda x: (nodes[x].in_degree + nodes[x].out_degree, nodes[x].pr), reverse=True)
        trimmed = set(list(candidates)[: max(0, max_nodes - len(pinned))])
        keep = set(pinned) | trimmed

    # Filter
    f_nodes = {nid: nodes[nid] for nid in keep if nid in nodes}
    f_edges = [e for e in edges if e.src in keep and e.dst in keep]

    return f_nodes, f_edges


# ---------- Snapshot Assembly ----------

def build_snapshot(meta: Dict[str, Any], nodes: Dict[str, NodeInfo], edges: List[EdgeInfo], norms: Dict[str, Dict[str, float]], norm_params: Dict[str, Dict[str, float]]) -> Dict[str, Any]:
    # Node scores (v1) — centrality from signals doc; isolation simple proxy
    out_nodes: List[Dict[str, Any]] = []
    for nid, n in nodes.items():
        nn = norms.get(nid, {})
        centrality = 0.40 * nn.get("in_degree", 0.0) + 0.20 * nn.get("pr", 0.0) + 0.20 * nn.get("evidence_count", 0.0)
        # basic isolation proxy: low degree → high isolation
        isolation = 1.0 - min(1.0, (n.in_degree + n.out_degree) / max(1.0, 5.0))
        out_nodes.append({
            "id": n.id,
            "kind": n.kind,
            "roles": n.roles if n.roles else ["X"],
            "owner": n.owner,
            "last_reviewed": n.last_reviewed,
            "mtime": n.mtime,
            "size": int(n.size),
            "raw": {
                "in_degree": n.in_degree,
                "out_degree": n.out_degree,
                "evidence_count": n.evidence_count,
                "pr": n.pr,
                "btw": n.btw,
                "usage_count": n.usage_count,
            },
            "norm": {
                "in_degree": nn.get("in_degree", 0.0),
                "evidence_count": nn.get("evidence_count", 0.0),
                "pr": nn.get("pr", 0.0),
                "btw": nn.get("btw", 0.0),
            },
            "scores": {
                "centrality": round(max(0.0, min(1.0, centrality)), 6),
                "isolation": round(max(0.0, min(1.0, isolation)), 6),
                "bottleneck": {"flag": bool(n.btw > 0.10), "why": {"btw_q": None, "recency": None, "owner_present": bool(n.owner), "evidence_count": n.evidence_count, "in_degree": n.in_degree}},
            },
        })

    out_edges: List[Dict[str, Any]] = []
    for e in edges:
        out_edges.append({
            "src": e.src,
            "dst": e.dst,
            "type": e.type,
            "weight": float(e.weight),
        })

    snapshot = {
        "meta": meta,
        "nodes": out_nodes,
        "edges": out_edges,
        "anchors": {
            "pinned": [a for a in PINNED_ANCHORS if a in {n.id for n in nodes.values()}] or PINNED_ANCHORS,
            "positions": {},  # optional (for layout stability; empty in v0)
        },
    }
    # Attach norm_params into meta
    snapshot["meta"]["norm_params"] = norm_params
    return snapshot


def default_thresholds() -> Dict[str, Any]:
    return {
        "bottleneck_q": 0.9,
        "isolation_q": 0.9,
        "tau_stale": 0.25,
        "halflife_days": 7,
    }


# ---------- CLI ----------

def parse_args(argv: Optional[List[str]] = None) -> argparse.Namespace:
    ap = argparse.ArgumentParser(description="Generate SiteGraph snapshot (v0 Core lens)")
    ap.add_argument("--root", default=str(PROJECT_ROOT), help="Project root (default: auto)")
    ap.add_argument("--lens", default="Core", choices=sorted(LENSES), help="Lens preset (default: Core)")
    ap.add_argument("--seed", type=int, default=12345, help="Layout seed (default: 12345)")
    ap.add_argument("--k0", type=int, default=8, help="Top-K level0 (default: 8)")
    ap.add_argument("--k1", type=int, default=20, help="Top-K level1 (default: 20)")
    ap.add_argument("--date", default=datetime.now(timezone.utc).strftime("%Y%m%d"), help="YYYYMMDD for run dir (default: today UTC)")
    ap.add_argument("--out-dir", default=None, help="Output dir (default: status/evidence/sitemap/graph_runs/<date>)")
    ap.add_argument("--overwrite", action="store_true", help="Allow overwriting existing snapshot file")
    ap.add_argument("--dry-run", action="store_true", help="Do not write file; print summary only")
    ap.add_argument("--max-nodes", type=int, default=2000, help="Max nodes to keep in lens filter (default: 2000)")
    return ap.parse_args(argv)


def load_schema() -> Optional[Dict[str, Any]]:
    try:
        return json.loads(SCHEMA_PATH.read_text(encoding="utf-8"))
    except Exception:
        return None


def validate_schema(obj: Dict[str, Any], schema: Optional[Dict[str, Any]]) -> Tuple[bool, Optional[str]]:
    if jsonschema is None or schema is None:
        return True, None
    try:
        jsonschema.validate(instance=obj, schema=schema)  # type: ignore
        return True, None
    except Exception as e:
        return False, str(e)


def main(argv: Optional[List[str]] = None) -> int:
    args = parse_args(argv)

    root = Path(args.root).resolve()
    if not root.exists():
        print(f"[ERR] root not found: {root}", file=sys.stderr)
        return 2

    # Output path
    out_dir = Path(args.out_dir) if args.out_dir else (PROJECT_ROOT / "status" / "evidence" / "sitemap" / "graph_runs" / args.date)
    out_dir.mkdir(parents=True, exist_ok=True)
    out_file = out_dir / "sitegraph.json"
    if out_file.exists() and not args.overwrite and not args.dry_run:
        print(f"[ERR] Output exists: {out_file} (use --overwrite to replace)", file=sys.stderr)
        return 3

    # Scan + parse
    print(f"[INFO] Scanning repo: {root}", file=sys.stderr)
    nodes, edges = scan_repo(root)

    # Metrics
    print(f"[INFO] Computing metrics (nx={'yes' if nx else 'no'})", file=sys.stderr)
    compute_graph_metrics(nodes, edges)
    norms, norm_params = normalize_nodes(nodes)

    # Lens
    if args.lens == "Core":
        f_nodes, f_edges = apply_core_lens(nodes, edges, max_nodes=args.max_nodes)
    else:
        # For other lenses, keep entire set (future extension)
        f_nodes, f_edges = nodes, edges

    # Meta
    created = now_iso()
    snapshot_id = iso_snapshot_id()
    meta = {
        "snapshot_id": snapshot_id,
        "created_at": created,
        "style_version": "1",
        "signals_version": "1",
        "layout_seed": int(args.seed),
        "lens": str(args.lens),
        "K": {"level0": int(args.k0), "level1": int(args.k1)},
        "thresholds": default_thresholds(),
        # norm_params added later
    }

    snapshot = build_snapshot(meta, f_nodes, f_edges, norms, norm_params)

    # Validate
    schema = load_schema()
    ok, err = validate_schema(snapshot, schema)
    if not ok:
        print(f"[WARN] Schema validation failed: {err}", file=sys.stderr)

    # Write
    if args.dry_run:
        kept = len(snapshot["nodes"])
        total = len(nodes)
        print(f"[DRY-RUN] Would write snapshot: {out_file}", file=sys.stderr)
        print(f"[DRY-RUN] Nodes kept={kept} (total={total}), Edges={len(snapshot['edges'])}", file=sys.stderr)
        print(json.dumps({"meta": snapshot["meta"], "anchors": snapshot["anchors"]}, ensure_ascii=False, indent=2))
        return 0

    out_bytes = json.dumps(snapshot, ensure_ascii=False, indent=2).encode("utf-8")
    out_file.write_bytes(out_bytes)
    print(f"[OK] Wrote snapshot: {repo_rel(out_file)} ({len(out_bytes)} bytes)", file=sys.stderr)
    print(f"[OK] Nodes={len(snapshot['nodes'])}, Edges={len(snapshot['edges'])}", file=sys.stderr)
    return 0


if __name__ == "__main__":
    sys.exit(main())
