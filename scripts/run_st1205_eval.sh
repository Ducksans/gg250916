#!/usr/bin/env bash
# run_st1205_eval.sh — ST-1205 일일 평가(ON/OFF 세트) 실행 래퍼
#
# - 기본 쿼리/파라미터는 status/resources/memory/set_eval_queries.json 을 사용
# - 내부적으로 scripts/run_st1205_eval.py 를 호출하여 결과 JSON을 생성
# - 결과 파일 경로를 첫 줄로 출력하고, 기본적으로 요약 JSON도 STDOUT에 출력
#
# 사용:
#   bash gumgang_meeting/scripts/run_st1205_eval.sh
#   bash gumgang_meeting/scripts/run_st1205_eval.sh --quiet           # JSON 출력 억제
#   bash gumgang_meeting/scripts/run_st1205_eval.sh --dry-run         # 실행 명령만 표시
#   bash gumgang_meeting/scripts/run_st1205_eval.sh --python python3  # 파이썬 바이너리 지정
#
# 필요(선택): jq (없으면 파라미터를 기본값으로 사용)
#
# 참고:
#   - 결과 JSON: status/evidence/memory/set_eval/<UTC_YYYYMMDD>/set_eval_<day>.json
#   - 파이썬 스크립트는 결과 파일 경로를 첫 줄에 반드시 출력합니다.

set -euo pipefail

# ------------- Paths -------------
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
PY_SCRIPT="${PROJECT_ROOT}/scripts/run_st1205_eval.py"
SET_FILE="${PROJECT_ROOT}/status/resources/memory/set_eval_queries.json"

# ------------- Args -------------
PYTHON_BIN="python"
QUIET=0
DRYRUN=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --quiet) QUIET=1; shift ;;
    --dry-run|--dryrun) DRYRUN=1; shift ;;
    --python) PYTHON_BIN="${2:-python}"; shift 2 ;;
    -h|--help)
      sed -n '1,80p' "$0"
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      exit 2
      ;;
  esac
done

# ------------- Defaults -------------
QS_DEFAULT="ST-1205 신선도,Self-RAG 루브릭,ST-1205 테스트"
K_DEFAULT="5"
HL_DEFAULT="7"
FW_DEFAULT="0.9"
SR_DEFAULT="1"

QS="$QS_DEFAULT"
K="$K_DEFAULT"
HL="$HL_DEFAULT"
FW="$FW_DEFAULT"
SR="$SR_DEFAULT"

# ------------- Read set file (optional) -------------
if [[ -f "$SET_FILE" ]] && command -v jq >/dev/null 2>&1; then
  # queries -> comma-separated
  QS="$(jq -r '.queries | join(",")' "$SET_FILE" 2>/dev/null || echo "$QS_DEFAULT")"
  # params
  K="$(jq -r '.params.k // empty' "$SET_FILE" 2>/dev/null || echo "$K_DEFAULT")"
  HL="$(jq -r '.params.halflife_days // empty' "$SET_FILE" 2>/dev/null || echo "$HL_DEFAULT")"
  FW="$(jq -r '.params.fresh_weight // empty' "$SET_FILE" 2>/dev/null || echo "$FW_DEFAULT")"
  SR="$(jq -r '.params.self_rag // empty' "$SET_FILE" 2>/dev/null || echo "$SR_DEFAULT")"
fi

# ------------- Build command -------------
CMD=( "$PYTHON_BIN" "$PY_SCRIPT"
  --queries "$QS"
  --k "$K"
  --halflife-days "$HL"
  --fresh-weight "$FW"
  --self-rag "$SR"
)

if [[ $QUIET -eq 0 ]]; then
  CMD+=( --stdout )
fi

echo "[run_st1205_eval] Python: $PYTHON_BIN"
echo "[run_st1205_eval] Script : ${PY_SCRIPT#${PROJECT_ROOT}/}"
if [[ -f "$SET_FILE" ]]; then
  echo "[run_st1205_eval] SetFile: ${SET_FILE#${PROJECT_ROOT}/}"
else
  echo "[run_st1205_eval] SetFile: (missing; using built-in defaults)"
fi
echo "[run_st1205_eval] Queries: $QS"
echo "[run_st1205_eval] Params : k=$K halflife_days=$HL fresh_weight=$FW self_rag=$SR"

if [[ $DRYRUN -eq 1 ]]; then
  echo "[run_st1205_eval] DRY-RUN → ${CMD[*]}"
  exit 0
fi

# ------------- Execute -------------
# The Python script prints the output JSON path on the first line.
OUT="$("${CMD[@]}")"
STATUS=$?

# Mirror output to console when --quiet is used (print just the path)
if [[ $QUIET -eq 1 ]]; then
  echo "$OUT" | head -n1
else
  # Already includes the JSON (because --stdout). Re-echo for clarity:
  echo "$OUT"
fi

exit $STATUS
