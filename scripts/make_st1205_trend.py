#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
make_st1205_trend.py — ST-1205 세트 평가(ON/OFF) 7일 추세 카드 생성기

기능
- 최근 N일(기본 7일)의 set_eval 요약(JSON)을 수집
- 쿼리별 Fresh lift 및 Self‑RAG rerank 영향(절댓값 평균) 추세를 집계
- 결과를 status/evidence/memory/set_eval/trends/trend_{start}_{end}.json 으로 저장
- 옵션으로 stdout에 결과 JSON도 출력(--stdout)

입력 소스(일자별 요약)
- status/evidence/memory/set_eval/YYYYMMDD/set_eval_YYYYMMDD.json
  (scripts/run_st1205_eval.py 가 생성)

출력
- status/evidence/memory/set_eval/trends/trend_{start}_{end}.json
- status/evidence/memory/set_eval/trends/trend_latest.json (마지막 결과에 대한 심볼릭 JSON)

집계 지표(쿼리별)
- days: 집계에 사용된 일수
- fresh_lift: { avg, min, max, first, last, trend_delta(last-first) }
- pass_rate: fresh_lift >= threshold(기본 0.1) 비율
- rerank: { avg_abs } (Self‑RAG 재랭크 영향의 절댓값 평균)
- points: [{ day, fresh_lift, rerank_lift }] (원시 포인트)

집계 지표(전체)
- queries: 포함된 쿼리 수
- days_covered: 탐색한 일수(실제 존재 일수는 쿼리별 days 참고)
- avg_fresh_lift_overall: 쿼리별 avg의 단순 평균
- avg_abs_rerank_overall: 쿼리별 avg_abs의 단순 평균
- pass_rate_overall: 쿼리별 pass_rate의 단순 평균

사용
  python gumgang_meeting/scripts/make_st1205_trend.py
  python gumgang_meeting/scripts/make_st1205_trend.py --days 14 --pass-threshold 0.1 --stdout
"""

from __future__ import annotations

import argparse
import json
import sys
from dataclasses import asdict, dataclass
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional


# ---------- Project Roots ----------

THIS_FILE = Path(__file__).resolve()
PROJECT_ROOT = THIS_FILE.parents[1]  # gumgang_meeting/


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def utc_day_str(dt: Optional[datetime] = None) -> str:
    d = dt or datetime.now(timezone.utc)
    return d.strftime("%Y%m%d")


def safe_rel(p: Path) -> str:
    try:
        return str(p.resolve().relative_to(PROJECT_ROOT))
    except Exception:
        return str(p)


# ---------- Data Classes ----------

@dataclass
class DayPoint:
    day: str
    fresh_lift: float
    rerank_lift: float


@dataclass
class QueryTrend:
    query: str
    days: int
    fresh_avg: float
    fresh_min: float
    fresh_max: float
    fresh_first: float
    fresh_last: float
    fresh_trend_delta: float
    pass_rate: float
    rerank_avg_abs: float
    points: List[DayPoint]


@dataclass
class TrendSummary:
    ts: str
    window_days: int
    start_day: str
    end_day: str
    pass_threshold: float
    queries: List[str]
    per_query: List[QueryTrend]
    overall: Dict[str, Any]
    sources: List[str]


# ---------- Core Logic ----------

def _load_set_eval(day: str) -> Optional[Dict[str, Any]]:
    p = PROJECT_ROOT / "status" / "evidence" / "memory" / "set_eval" / day / f"set_eval_{day}.json"
    if not p.exists():
        return None
    try:
        return json.loads(p.read_text(encoding="utf-8"))
    except Exception:
        return None


def _recent_days(n: int) -> List[str]:
    out = []
    today = datetime.now(timezone.utc).date()
    for i in range(n):
        d = today - timedelta(days=(n - 1 - i))
        out.append(d.strftime("%Y%m%d"))
    return out


def _collect_points(days: List[str]) -> Dict[str, List[DayPoint]]:
    per_query: Dict[str, List[DayPoint]] = {}
    for day in days:
        obj = _load_set_eval(day)
        if not obj:
            continue
        results = obj.get("results") or []
        for r in results:
            q = str(r.get("query") or "").strip()
            if not q:
                continue
            fl = float(r.get("fresh_lift") or 0.0)
            rl = float(r.get("rerank_lift") or 0.0)
            per_query.setdefault(q, []).append(DayPoint(day=day, fresh_lift=fl, rerank_lift=rl))
    # sort points by day per query
    for q, pts in per_query.items():
        pts.sort(key=lambda x: x.day)
    return per_query


def _make_trend_for_query(query: str, pts: List[DayPoint], pass_threshold: float) -> QueryTrend:
    if not pts:
        return QueryTrend(
            query=query,
            days=0,
            fresh_avg=0.0,
            fresh_min=0.0,
            fresh_max=0.0,
            fresh_first=0.0,
            fresh_last=0.0,
            fresh_trend_delta=0.0,
            pass_rate=0.0,
            rerank_avg_abs=0.0,
            points=[],
        )
    n = len(pts)
    fresh_vals = [p.fresh_lift for p in pts]
    rerank_abs = [abs(p.rerank_lift) for p in pts]
    fresh_avg = sum(fresh_vals) / n
    fresh_min = min(fresh_vals)
    fresh_max = max(fresh_vals)
    fresh_first = fresh_vals[0]
    fresh_last = fresh_vals[-1]
    fresh_trend_delta = fresh_last - fresh_first
    pass_hits = sum(1 for v in fresh_vals if v >= pass_threshold)
    pass_rate = pass_hits / n if n else 0.0
    rerank_avg_abs = sum(rerank_abs) / n if n else 0.0
    return QueryTrend(
        query=query,
        days=n,
        fresh_avg=round(fresh_avg, 6),
        fresh_min=round(fresh_min, 6),
        fresh_max=round(fresh_max, 6),
        fresh_first=round(fresh_first, 6),
        fresh_last=round(fresh_last, 6),
        fresh_trend_delta=round(fresh_trend_delta, 6),
        pass_rate=round(pass_rate, 6),
        rerank_avg_abs=round(rerank_avg_abs, 6),
        points=pts,
    )


def _overall(per_query: List[QueryTrend]) -> Dict[str, Any]:
    if not per_query:
        return {
            "queries": 0,
            "days_covered": 0,
            "avg_fresh_lift_overall": 0.0,
            "avg_abs_rerank_overall": 0.0,
            "pass_rate_overall": 0.0,
        }
    qn = len(per_query)
    days_covered = max((qt.days for qt in per_query), default=0)
    avg_fresh = sum(qt.fresh_avg for qt in per_query) / qn
    avg_abs_rerank = sum(qt.rerank_avg_abs for qt in per_query) / qn
    avg_pass_rate = sum(qt.pass_rate for qt in per_query) / qn
    return {
        "queries": qn,
        "days_covered": days_covered,
        "avg_fresh_lift_overall": round(avg_fresh, 6),
        "avg_abs_rerank_overall": round(avg_abs_rerank, 6),
        "pass_rate_overall": round(avg_pass_rate, 6),
    }


def build_trend(days: int, pass_threshold: float) -> TrendSummary:
    day_list = _recent_days(days)
    start_day, end_day = day_list[0], day_list[-1]
    per_query_points = _collect_points(day_list)

    # Keep stable order by reading set file if exists; else natural key sort
    set_file = PROJECT_ROOT / "status" / "resources" / "memory" / "set_eval_queries.json"
    set_queries: List[str] = []
    if set_file.exists():
        try:
            obj = json.loads(set_file.read_text(encoding="utf-8"))
            set_queries = [str(x).strip() for x in (obj.get("queries") or []) if str(x).strip()]
        except Exception:
            set_queries = []

    queries = list(per_query_points.keys())
    if set_queries:
        # order by set_queries first, then any new queries
        ordered = [q for q in set_queries if q in per_query_points] + sorted([q for q in queries if q not in set_queries])
        queries = ordered
    else:
        queries = sorted(queries)

    per_query: List[QueryTrend] = []
    for q in queries:
        qt = _make_trend_for_query(q, per_query_points.get(q, []), pass_threshold)
        per_query.append(qt)

    srcs = []
    for d in day_list:
        p = PROJECT_ROOT / "status" / "evidence" / "memory" / "set_eval" / d / f"set_eval_{d}.json"
        if p.exists():
            srcs.append(safe_rel(p))

    summary = TrendSummary(
        ts=now_iso(),
        window_days=days,
        start_day=start_day,
        end_day=end_day,
        pass_threshold=pass_threshold,
        queries=queries,
        per_query=per_query,
        overall=_overall(per_query),
        sources=srcs,
    )
    return summary


def write_trend(summary: TrendSummary, out_dir: Optional[Path] = None) -> Path:
    trends_dir = out_dir or (PROJECT_ROOT / "status" / "evidence" / "memory" / "set_eval" / "trends")
    trends_dir.mkdir(parents=True, exist_ok=True)
    name = f"trend_{summary.start_day}_{summary.end_day}.json"
    out_path = trends_dir / name
    payload = {
        "ts": summary.ts,
        "window_days": summary.window_days,
        "start_day": summary.start_day,
        "end_day": summary.end_day,
        "pass_threshold": summary.pass_threshold,
        "queries": summary.queries,
        "per_query": [
            {
                **{k: v for k, v in asdict(qt).items() if k != "points"},
                "points": [asdict(pt) for pt in qt.points],
            }
            for qt in summary.per_query
        ],
        "overall": summary.overall,
        "sources": summary.sources,
    }
    out_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")

    # also write/update latest
    latest = trends_dir / "trend_latest.json"
    latest.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")

    return out_path


# ---------- CLI ----------

def main(argv: Optional[List[str]] = None) -> int:
    ap = argparse.ArgumentParser(description="ST-1205 7일 추세 카드 생성기")
    ap.add_argument("--days", type=int, default=7, help="집계 기간(일), 기본=7")
    ap.add_argument("--pass-threshold", type=float, default=0.10, help="PASS 판정 fresh_lift 임계치, 기본=0.10")
    ap.add_argument("--out-dir", type=str, default=None, help="출력 디렉터리(기본 trends/)")
    ap.add_argument("--stdout", action="store_true", help="결과 JSON도 stdout으로 출력")
    args = ap.parse_args(argv)

    days = max(1, min(90, int(args.days or 7)))
    thr = float(args.pass_threshold if args.pass_threshold is not None else 0.10)

    summary = build_trend(days=days, pass_threshold=thr)
    out_dir = Path(args.out_dir).resolve() if args.out_dir else None
    out_path = write_trend(summary, out_dir=out_dir)

    print(safe_rel(out_path))
    if args.stdout:
        try:
            print((out_dir / out_path.name if out_dir else out_path).read_text(encoding="utf-8"))
        except Exception:
            pass
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
