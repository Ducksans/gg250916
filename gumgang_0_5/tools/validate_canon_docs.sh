#!/usr/bin/env bash
set -euo pipefail

# 무결성 검증 스크립트 - 캐논 문서 해시 검증
# 생성: 2025-08-09 16:12 (KST)

ROOT="/home/duksan/바탕화면/gumgang_0_5"
DOCS="${ROOT}/docs"
META="${DOCS}/_canon.meta.json"
LOG="${ROOT}/logs/metrics/canon_validation.log"
TS="$(TZ=Asia/Seoul date '+%Y-%m-%d %H:%M')"

# 로그 디렉토리 생성
mkdir -p "$(dirname "$LOG")"

# 메타 파일 존재 확인
if [[ ! -f "${META}" ]]; then
  echo "[${TS}] ERROR: Meta file not found: ${META}" | tee -a "${LOG}"
  exit 2
fi

# Python을 사용한 해시 검증
python3 - "$META" "$ROOT" <<'PYTHON_SCRIPT'
import json
import hashlib
import pathlib
import sys

def verify_documents():
    meta_path = pathlib.Path(sys.argv[1])
    root_path = pathlib.Path(sys.argv[2])

    try:
        with open(meta_path, 'r', encoding='utf-8') as f:
            meta = json.load(f)
    except Exception as e:
        print(f"FAIL|META_READ_ERROR:{e}")
        sys.exit(1)

    errors = []
    verified = []

    for doc in meta.get('docs', []):
        doc_path = root_path / doc['path']

        # 파일 존재 확인
        if not doc_path.exists():
            errors.append(f"MISSING:{doc['path']}")
            continue

        # 해시 계산
        try:
            with open(doc_path, 'rb') as f:
                calculated_hash = hashlib.sha256(f.read()).hexdigest()

            # 전체 해시 검증 (있는 경우)
            if 'hash_sha256' in doc:
                if calculated_hash != doc['hash_sha256']:
                    errors.append(f"HASH_MISMATCH:{doc['path']}|expected:{doc['hash_sha256'][:12]}|got:{calculated_hash[:12]}")
                else:
                    verified.append(doc['path'])
            # 12자 해시만 있는 경우
            elif 'hash12' in doc:
                if calculated_hash[:12] != doc['hash12']:
                    errors.append(f"HASH12_MISMATCH:{doc['path']}|expected:{doc['hash12']}|got:{calculated_hash[:12]}")
                else:
                    verified.append(doc['path'])
            else:
                errors.append(f"NO_HASH:{doc['path']}")
        except Exception as e:
            errors.append(f"READ_ERROR:{doc['path']}|{e}")

    # 결과 출력
    if errors:
        print("FAIL|" + "|".join(errors))
        sys.exit(1)
    else:
        print(f"OK|verified:{len(verified)}")
        sys.exit(0)

verify_documents()
PYTHON_SCRIPT

RC=$?

# 결과 로깅
if [[ $RC -eq 0 ]]; then
  RESULT=$(python3 -c "
import json, pathlib
meta = json.loads(pathlib.Path('${META}').read_text(encoding='utf-8'))
print(len(meta.get('docs', [])))
" 2>/dev/null || echo "0")
  echo "[${TS}] OK: Canon docs verified (${RESULT} documents)" | tee -a "${LOG}"
  echo "✅ 무결성 검증 성공: ${RESULT}개 문서 확인됨"
else
  echo "[${TS}] FAIL: Canon docs validation failed" | tee -a "${LOG}"
  echo "❌ 무결성 검증 실패 - 상세 내용은 ${LOG} 확인"
  exit 1
fi

exit 0
