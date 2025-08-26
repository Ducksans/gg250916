#!/usr/bin/env bash
# 🚩 Gumgang 2.0 — Hourly Canon Integrity Check (WRITE)
# Mode: cron 등록 + 1회 즉시 검증 실행. .rules 불가침.
set -euo pipefail

ROOT="/home/duksan/바탕화면/gumgang_0_5"
VSH="${ROOT}/tools/validate_canon_docs.sh"
VLOG="${ROOT}/logs/metrics/canon_validation.log"
TS="$(TZ=Asia/Seoul date '+%Y-%m-%d %H:%M')"
MARK="# Gumgang:canon-validate-hourly"

echo "[ASK APPROVAL] 매시 정각에 캐논 문서 무결성 검증을 자동 실행하도록 크론에 등록합니다. 진행할까요? (yes/no)"
read -r APPROVE
if [[ "${APPROVE:-no}" != "yes" && "${APPROVE:-no}" != "y" ]]; then
  echo "중단합니다."
  exit 0
fi

# 경로/권한 점검
[[ -x "${VSH}" ]] || { echo "→ 권한 설정(chmod +x)"; chmod +x "${VSH}"; }
[[ -f "${VSH}" ]] || { echo "ERROR: 검증 스크립트가 없습니다: ${VSH}"; exit 2; }
mkdir -p "$(dirname "${VLOG}")"

CRON_LINE="0 * * * * ${VSH} >> ${VLOG} 2>&1 ${MARK}"

# 중복 방지: 기존 크론 확인 후 없으면 추가
if crontab -l 2>/dev/null | grep -Fq "${MARK}"; then
  echo "→ 이미 등록되어 있습니다(건너뜀)."
else
  echo "→ 크론 등록 진행"
  (crontab -l 2>/dev/null; echo "${CRON_LINE}") | crontab -
fi

# 1회 즉시 검증
echo "→ 무결성 1회 즉시 실행"
if "${VSH}"; then
  echo "검증 성공: $(TZ=Asia/Seoul date '+%Y-%m-%d %H:%M')"
else
  echo "검증 실패(상세는 로그 참조): ${VLOG}"
fi

# 결과 요약
echo
echo "=== 등록 결과(KST ${TS}) ==="
echo "- cron: $(crontab -l 2>/dev/null | grep -F "${MARK}" || echo '미등록')"
echo "- log:  $(test -f "${VLOG}" && tail -n 3 "${VLOG}" || echo '아직 로그 없음')"
echo
echo "[DONE] 매시 정각 자동 검증 설정 완료. 다음 단계: .gitignore 정규화 → WS 스키마 v0.1 봉인."
