#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
run_st1205_eval.py — ST-1205 ON/OFF 세트 실행 및 요약 JSON 저장 스크립트

기능
- 쿼리 세트에 대해 두 번의 검색 실행:
  1) 베이스라인(OFF): need_fresh=0, self_rag=0
  2) 실험(ON): need_fresh=1, halflife_days, fresh_weight, self_rag=1
- experimental 실행 직후 생성된 recall_runs/<day>/run_*.json을 찾아
  pre_items(재랭크 전) / post_items(재랭크 후) 상위3 평균을 비교
- 세트 요약 JSON을 status/evidence/memory/set_eval/<UTC_YYYYMMDD>/set_eval_<day>.json 에 저장

사용
  python gumgang_meeting/scripts/run_st1205_eval.py \
    --queries "ST-1205 신선도,Self-RAG 루브릭,ST-1205 테스트" \
    --k 5 --halflife-days 7 --fresh-weight 0.9 --self-rag 1

출력
- 요약 JSON 파일 경로를 stdout에 출력(기본)
- --stdout 옵션 시 JSON 내용을 stdout에 함께 출력
"""
from __future__ import annotations

import argparse
import json
import os
import sys
from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple


# ---------- Project import bootstrap ----------
THIS_FILE = Path(__file__).resolve()
PROJECT_ROOT = THIS_FILE.parents[1]  # gumgang_meeting/
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

# Now import backend helpers (runs without starting server)
from app.api import (  # type: ignore
    memory_search,
    now_iso,
    _date_part,
    PROJECT_ROOT as API_PROJECT_ROOT,
)


# ---------- Data classes ----------


@dataclass
class QueryResult:
    query: str
    off_top3_avg: float
    on_pre_top3_avg: float
    fresh_lift: float
    rerank_top3_avg_pre: float
    rerank_top3_avg_post: float
    rerank_lift: float
    recall_runs_path: Optional[str]


@dataclass
class EvalSummary:
    ts: str
    params: Dict[str, Any]
    queries: List[str]
    results: List[QueryResult]


# ---------- Helpers ----------


def _avg_top3(items: List[Dict[str, Any]], use_new_score: bool = False) -> float:
    """
    items: list of hit dicts with keys: score, rerank.new_score(optional)
    """
    if not items:
        return 0.0
    n = min(3, len(items))
    s = 0.0
    for h in items[:n]:
        if use_new_score:
            r = h.get("rerank") or {}
            s += float(r.get("new_score", h.get("score", 0.0)))
        else:
            s += float(h.get("score", 0.0))
    return float(s / float(n))


def _list_recall_runs(day_dir: Path) -> List[Path]:
    try:
        return sorted(day_dir.glob("run_*.json"))
    except Exception:
        return []


def _latest_recall_after(day_dir: Path, before: List[Path]) -> Optional[Path]:
    """
    Return a newly created recall_runs file after ON search was executed.
    Fallback to the latest file in the directory if diff is empty.
    """
    try:
        after = _list_recall_runs(day_dir)
        before_set = {p.name for p in before}
        new_files = [p for p in after if p.name not in before_set]
        if new_files:
            # pick most recent by mtime
            new_files.sort(key=lambda p: p.stat().st_mtime)
            return new_files[-1]
        return after[-1] if after else None
    except Exception:
        return None


def _safe_rel(p: Path) -> str:
    try:
        return str(p.resolve().relative_to(PROJECT_ROOT))
    except Exception:
        try:
            return str(p.resolve().relative_to(API_PROJECT_ROOT))
        except Exception:
            return str(p)


def _run_pair(
    q: str,
    k: int,
    day_dir: Path,
    halflife_days: float,
    fresh_weight: float,
    self_rag: int,
) -> QueryResult:
    """
    Run OFF then ON; compute summary using recall_runs(pre/post) for ON.
    """
    # OFF (baseline)
    off = memory_search(q=q, k=k)
    off_items = (off.get("data") or {}).get("items") or []

    # Capture pre-existing recall files before ON run
    before_files = _list_recall_runs(day_dir)

    # ON (fresh + self_rag)
    on = memory_search(
        q=q,
        k=k,
        need_fresh=1,
        halflife_days=halflife_days,
        fresh_weight=fresh_weight,
        self_rag=self_rag,
    )

    # Resolve recall_runs file for this ON run
    rec = _latest_recall_after(day_dir, before_files)
    pre_items: List[Dict[str, Any]] = []
    post_items: List[Dict[str, Any]] = []
    rec_rel: Optional[str] = None
    try:
        if rec and rec.exists():
            rec_obj = json.loads(rec.read_text(encoding="utf-8"))
            pre_items = rec_obj.get("pre_items", []) or []
            post_items = rec_obj.get("post_items", []) or []
            rec_rel = _safe_rel(rec)
    except Exception:
        rec_rel = None

    # Fallback if recall file could not be read
    on_items_from_resp = (on.get("data") or {}).get("items") or []
    if not pre_items:
        # If we couldn't read recall pre_items, treat ON response as "post" and estimate pre==post
        pre_items = on_items_from_resp[:]
    if not post_items:
        post_items = on_items_from_resp[:]

    # Metrics
    off_top3_avg = round(_avg_top3(off_items), 4)
    on_pre_top3_avg = round(_avg_top3(pre_items, use_new_score=False), 4)
    fresh_lift = round(on_pre_top3_avg - off_top3_avg, 4)

    rerank_top3_avg_pre = on_pre_top3_avg
    rerank_top3_avg_post = round(_avg_top3(post_items, use_new_score=True), 4)
    rerank_lift = round(rerank_top3_avg_post - rerank_top3_avg_pre, 4)

    return QueryResult(
        query=q,
        off_top3_avg=off_top3_avg,
        on_pre_top3_avg=on_pre_top3_avg,
        fresh_lift=fresh_lift,
        rerank_top3_avg_pre=rerank_top3_avg_pre,
        rerank_top3_avg_post=rerank_top3_avg_post,
        rerank_lift=rerank_lift,
        recall_runs_path=rec_rel,
    )


# ---------- Main ----------


def main(argv: Optional[List[str]] = None) -> int:
    parser = argparse.ArgumentParser(
        description="ST-1205 ON/OFF 세트 실행 및 요약 JSON 저장 스크립트"
    )
    parser.add_argument(
        "--queries",
        type=str,
        default="ST-1205 신선도,Self-RAG 루브릭,ST-1205 테스트",
        help="콤마(,)로 구분된 쿼리 목록",
    )
    parser.add_argument("--k", type=int, default=5, help="top-k (기본=5)")
    parser.add_argument(
        "--halflife-days", type=float, default=7.0, help="신선도 하프라이프(일)"
    )
    parser.add_argument(
        "--fresh-weight", type=float, default=0.9, help="recency 가중치(ON)"
    )
    parser.add_argument(
        "--self-rag",
        type=int,
        default=1,
        choices=[0, 1],
        help="Self-RAG 1회 재랭크 on/off (기본=1)",
    )
    parser.add_argument(
        "--out-dir",
        type=str,
        default=None,
        help="요약 JSON 출력 디렉토리(기본: status/evidence/memory/set_eval/<UTC_YYYYMMDD>)",
    )
    parser.add_argument(
        "--out-name",
        type=str,
        default=None,
        help="요약 JSON 파일명(기본: set_eval_<UTC_YYYYMMDD>.json)",
    )
    parser.add_argument(
        "--stdout",
        action="store_true",
        help="요약 JSON 내용을 stdout에도 출력",
    )

    args = parser.parse_args(argv)

    q_list = [q.strip() for q in (args.queries or "").split(",") if q.strip()]
    if not q_list:
        print("No queries provided", file=sys.stderr)
        return 2

    day = _date_part(now_iso())  # UTC day
    recall_day_dir = API_PROJECT_ROOT / "status" / "evidence" / "memory" / "recall_runs" / day
    recall_day_dir.mkdir(parents=True, exist_ok=True)

    out_dir = (
        Path(args.out_dir).resolve()
        if args.out_dir
        else (API_PROJECT_ROOT / "status" / "evidence" / "memory" / "set_eval" / day)
    )
    out_dir.mkdir(parents=True, exist_ok=True)
    out_name = args.out_name or f"set_eval_{day}.json"
    out_path = out_dir / out_name

    results: List[QueryResult] = []
    for q in q_list:
        r = _run_pair(
            q=q,
            k=max(1, min(100, int(args.k or 5))),
            day_dir=recall_day_dir,
            halflife_days=float(args.halflife_days),
            fresh_weight=float(args.fresh_weight),
            self_rag=int(args.self_rag),
        )
        results.append(r)

    summary = EvalSummary(
        ts=now_iso(),
        params={
            "k": int(args.k),
            "halflife_days": float(args.halflife_days),
            "fresh_weight": float(args.fresh_weight),
            "self_rag": int(args.self_rag),
            "day": day,
        },
        queries=q_list,
        results=results,
    )

    # Serialize dataclasses
    payload = {
        "ts": summary.ts,
        "params": summary.params,
        "queries": summary.queries,
        "results": [asdict(r) for r in summary.results],
    }

    out_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")

    rel_out = _safe_rel(out_path)
    print(rel_out)  # always print the path so UI/Bridge can open it
    if args.stdout:
        print(json.dumps(payload, ensure_ascii=False, indent=2))

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
