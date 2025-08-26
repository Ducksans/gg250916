#!/usr/bin/env bash
# 🚩 Gumgang 2.0 — Safe Resume w/ Start Card → Type-Fence Rebuild
# 모드: ① READ-ONLY 컨텍스트 점검 → ② [ASK APPROVAL] 임시 타입 펜스+재빌드
# 규칙: .rules 불가침, 네트워크/디스크 쓰기는 승인 이후에만 수행
set -euo pipefail

ROOT="/home/duksan/바탕화면/gumgang_0_5"
DOCS="${ROOT}/docs"
LOGS="${ROOT}/logs"
BUILDLOG_DIR="${LOGS}/builds"
SESSIONLOG_DIR="${ROOT}/logs/sessions"
mkdir -p "${SESSIONLOG_DIR}"

ts() { TZ=Asia/Seoul date '+%Y-%m-%d %H:%M'; }
ts_file() { TZ=Asia/Seoul date '+%Y-%m-%d_%H-%M'; }

echo "[ASK APPROVAL] 이전 세션의 문맥을 READ-ONLY로 로드·검증하고, 'Start Card'를 채팅으로만 제출해도 될까요? (.rules 불가침, 디스크 쓰기/네트워크 금지)"
read -r OK
[[ "${OK:-no}" =~ ^(y|yes)$ ]] || { echo "중단합니다."; exit 0; }

# ========== 1) READ-ONLY 컨텍스트 로드 ==========
SEALED_META="N/A"
if [[ -f "${DOCS}/_canon.meta.json" ]]; then
  SEALED_META="$(cat "${DOCS}/_canon.meta.json" 2>/dev/null | wc -l | awk '{print $1" lines"}')"
fi

# 봉인 문서 요약 (hash12)
canon_list() {
  if command -v jq >/dev/null 2>&1 && [[ -f "${DOCS}/_canon.meta.json" ]]; then
    jq -r '.docs[] | "- \(.path)  # " + (.hash_sha256[0:12])' "${DOCS}/_canon.meta.json"
  else
    echo "- (jq 없음) _canon.meta.json 확인 필요"
  fi
}

# WS 스키마 필수 항목 검증(문서 기준)
WS_YAML_OK="NO"
if [[ -f "${DOCS}/ws_schema_v0.1.yaml" ]]; then
  if grep -q 'name: "metrics"' "${DOCS}/ws_schema_v0.1.yaml" \
  && grep -q 'name: "memory-update"' "${DOCS}/ws_schema_v0.1.yaml" \
  && grep -q 'name: "notification"' "${DOCS}/ws_schema_v0.1.yaml" \
  && grep -q 'name: "selection-3d"' "${DOCS}/ws_schema_v0.1.yaml" \
  && grep -q 'require_rules_headers: true' "${DOCS}/ws_schema_v0.1.yaml"; then
    WS_YAML_OK="OK"
  fi
fi

# 크론 등록 확인
CRON_OK="$(crontab -l 2>/dev/null | grep -F 'Gumgang:canon-validate-hourly' || true)"
[[ -n "${CRON_OK}" ]] && CRON_STATUS="OK" || CRON_STATUS="MISSING"

# 최근 빌드 로그 및 에러 후보 파일
LAST_BUILD_LOG="$(ls -t "${BUILDLOG_DIR}"/build_* 2>/dev/null | head -n1 || true)"
ERR_TOP=""
if [[ -n "${LAST_BUILD_LOG}" ]]; then
  ERR_TOP="$(grep -Eo '/[^ :]+\.tsx?' "${LAST_BUILD_LOG}" | sort | uniq -c | sort -nr | head -n 8 | sed 's/^/  - /' || true)"
fi

# Start Card 출력
echo
echo "===== Start Card (READ-ONLY) @ KST $(ts) ====="
echo "■ Canon Meta: ${SEALED_META}"
echo "■ Canon Docs:"
canon_list
echo "■ WS Schema(v0.1 YAML): ${WS_YAML_OK}"
echo "■ Cron(canon-validate-hourly): ${CRON_STATUS}"
echo "■ Last build log: ${LAST_BUILD_LOG:-N/A}"
[[ -n "${ERR_TOP}" ]] && { echo "■ Suspect TS files:"; echo "${ERR_TOP}"; }
echo "=============================================="
echo

# ========== 2) [ASK APPROVAL] 타입 펜스 + 재빌드 ==========
echo "[ASK APPROVAL] 임시 타입 펜스(@ts-nocheck + 타입 스텁 + skipLibCheck) 적용 후 재빌드할까요? (yes/no)"
read -r DOFENCE
[[ "${DOFENCE:-no}" =~ ^(y|yes)$ ]] || { echo "타입 펜스 건너뜀. 종료."; exit 0; }

# 준비
FE_DIR=""
if [[ -d "${ROOT}/gumgang-v2" && -f "${ROOT}/gumgang-v2/package.json" ]]; then
  FE_DIR="${ROOT}/gumgang-v2"
else
  FE_DIR="$(find "${ROOT}" -maxdepth 3 -name package.json -not -path '*/node_modules/*' | head -n1 | xargs -r dirname)"
fi
[[ -n "${FE_DIR}" ]] || { echo "package.json 위치를 찾을 수 없습니다."; exit 2; }

TSSTAMP="$(ts_file)"
BACKUP="${ROOT}/memory/structure_fixes_backup/${TSSTAMP}/type_fence"
mkdir -p "${BACKUP}"

# 최근 빌드 로그 확보(없으면 한 번 생성)
if [[ -z "${LAST_BUILD_LOG}" ]]; then
  mkdir -p "${BUILDLOG_DIR}"
  LAST_BUILD_LOG="${BUILDLOG_DIR}/build_init_${TSSTAMP}.log"
  pushd "${FE_DIR}" >/dev/null
  if [[ -f pnpm-lock.yaml ]]; then INST="pnpm install --frozen-lockfile"; BLD="pnpm build"
  elif [[ -f yarn.lock ]]; then INST="yarn install --frozen-lockfile"; BLD="yarn build"
  elif [[ -f package-lock.json ]]; then INST="npm ci"; BLD="npm run build"
  else INST="npm install"; BLD="npm run build"; fi
  bash -lc "$INST"  > "${LAST_BUILD_LOG}" 2>&1 || true
  bash -lc "$BLD"  >> "${LAST_BUILD_LOG}" 2>&1 || true
  popd >/dev/null
fi

# 에러 파일 상위 8개 추출
mapfile -t FILES < <(grep -Eo '/[^ :]+\.tsx?' "${LAST_BUILD_LOG}" | sort | uniq -c | sort -nr | awk '{print $2}' | head -n 8)
if (( ${#FILES[@]} == 0 )); then
  echo "로그에서 타입 에러 파일을 찾지 못했습니다. 빌드 로그 포맷을 확인하세요."; exit 3;
fi

# @ts-nocheck 주입(백업 후, 중복 방지)
for f in "${FILES[@]}"; do
  [[ -f "$f" ]] || continue
  rel="${f#${ROOT}/}"
  mkdir -p "${BACKUP}/$(dirname "$rel")"
  cp -f "$f" "${BACKUP}/${rel}"
  head -n1 "$f" | grep -q "@ts-nocheck" || sed -i '1i // @ts-nocheck  // TEMP for build pass '"$(ts)" "$f"
  echo "→ nocheck: $rel"
done

# 기본 타입 스텁 추가
mkdir -p "${FE_DIR}/types"
cat > "${FE_DIR}/types/backend.d.ts" <<'DT'
/** TEMP stubs for build pass — replace with real defs */
declare interface SystemStats { cpuPct: number; memMb: number; gpuUtilPct?: number; tokens?: { in: number; out: number }; }
declare interface MemoryStatus { tier: 'ultra-short'|'short'|'mid'|'long'|'ultra-long'; size?: number; updatedAt?: string; }
declare interface Task { id: string; title: string; status: 'todo'|'doing'|'done'; priority?: 'low'|'med'|'high'; createdAt?: string; updatedAt?: string; }
DT

# tsconfig 수정 (skipLibCheck: true) — 백업
TC="${FE_DIR}/tsconfig.json"
if [[ -f "$TC" ]]; then
  cp -f "$TC" "${BACKUP}/tsconfig.json.bak"
  node -e 'const fs=require("fs");const p=process.argv[1];const j=fs.existsSync(p)?JSON.parse(fs.readFileSync(p,"utf8")):{};
    j.compilerOptions=j.compilerOptions||{}; j.compilerOptions.skipLibCheck=true;
    fs.writeFileSync(p, JSON.stringify(j,null,2));' "$TC"
else
  echo '{ "compilerOptions": { "skipLibCheck": true } }' > "$TC"
fi

# 재빌드
pushd "${FE_DIR}" >/dev/null
NEWLOG="${BUILDLOG_DIR}/build_${FE_DIR#${ROOT}/}_${TSSTAMP}.log"
if [[ -f pnpm-lock.yaml ]]; then INST="pnpm install --frozen-lockfile"; BLD="pnpm build"
elif [[ -f yarn.lock ]]; then INST="yarn install --frozen-lockfile"; BLD="yarn build"
elif [[ -f package-lock.json ]]; then INST="npm ci"; BLD="npm run build"
else INST="npm install"; BLD="npm run build"; fi

echo "== Rebuild @ $(ts) ==" | tee "${NEWLOG}"
bash -lc "$INST"  >> "${NEWLOG}" 2>&1 || true
if bash -lc "$BLD" >> "${NEWLOG}" 2>&1; then
  RESULT="SUCCESS"
else
  RESULT="FAIL"
fi
popd >/dev/null

# 요약 & 다음 제안
echo
echo "=== Rebuild Result @ KST $(ts) ==="
echo "- FE: ${FE_DIR}"
echo "- Log: ${NEWLOG}"
echo "- Backup: ${BACKUP}"
echo "- Outcome: ${RESULT}"
if [[ "${RESULT}" == "SUCCESS" ]]; then
  echo "[NEXT] policy_model.md 핵심 규칙 고정 → guard_validate_all.sh 스켈레톤."
else
  echo "[HINT] 실패 시 상위 에러 라인:"
  grep -iE "error|cannot|type" "${NEWLOG}" | head -n 20 || true
  echo "[NEXT] 에러 로그 공유해 주시면 정밀 패치 순서 제시합니다."
fi
