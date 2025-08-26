# ST-1206 — Thread UX v1 T5 수동 테스트 체크리스트 + cURL 헬퍼

목적
- 스레드 API(/api/threads/append, /recent, /read)와 v1 규격(제목 1회 업그레이드·잠금, SGM 차단 라인, 사이즈 상한)을 수동으로 검증한다.
- UI는 로컬 우선 → 서버 병합이 동작하며, 최근 목록·헤더 배지가 기대대로 갱신되는지 확인한다.

사전 준비
- 백엔드 실행(별도 터미널): uvicorn app.api:app --port 8000
- jq 설치 권장(응답 파싱용): mac: brew install jq, ubuntu: sudo apt-get install -y jq

환경 변수
- 기본 BASE: http://localhost:8000
- 저장 경로(서버가 응답): gumgang_meeting/conversations/threads/YYYYMMDD/<convId>.jsonl

---

A. 빠른 체크(헬스)
1) 서버 헬스 확인
- GET {BASE}/api/health → 200 ok, meta.ts 존재

---

B. 스레드 생성 → 제목 Draft → 업그레이드 1회(🔒) → 잠금 확인(409)
1) 새 스레드 생성(사용자 턴 1)
- POST /api/threads/append
  - convId: gg_YYYYMMDD_<랜덤(8)>
  - role: user, text: "첫 메시지입니다. 제목은 이 문장의 앞부분을 사용."
  - meta.title: "첫 메시지입니다. 제목은 이 문장의 앞부분…" (Draft), meta.title_locked=false
- 기대: 200, data.convId 반환, data.path는 conversations/threads/YYYYMMDD/<convId>.jsonl

2) 업그레이드 1회(어시스턴트 턴 2; refs≥1 또는 text≥200자 중 택1)
- POST /api/threads/append
  - 같은 convId, role: assistant
  - text: 길게 200자 이상 또는 refs=["status/checkpoints/CKPT_72H_RUN.md#L1-6"]
  - meta.title: "업그레이드된 요약 제목", meta.title_locked=true
- 기대: 200, 이후 /read 시 meta.title_locked 상태가 tail에 반영됨

3) 잠금 확인(제목 변경 시도 → 409)
- POST /api/threads/append
  - 같은 convId, role: system
  - meta.title: "다른 제목" (변경 시도), meta.title_locked=true
- 기대: 409 TITLE_LOCKED

---

C. SGM 차단 라인(근거 0 → 보류 템플릿 기록)
1) 근거 없음 차단 기록(어시스턴트 턴)
- POST /api/threads/append
  - role: assistant, text: "[SGM: 근거 부족 – 답변 보류]"
  - refs: [], meta.sgm_blocked=true, meta.hint={"reason":"zero_refs","suggest":["upload files","re-run unified search","narrow query ..."]}
- 기대: 200, /read에서 마지막 턴 meta.sgm_blocked=true 라인 확인

---

D. evidence_path 규칙(grounded일 때 필수)
1) 근거 포함 응답(어시스턴트 턴, refs>0)
- POST /api/threads/append
  - role: assistant, refs=["status/checkpoints/CKPT_72H_RUN.md#L1-6"]
  - meta.evidence_path="status/evidence/memory/unified_runs/20250825/run_xxx.json"
- 기대: 200, /read에서 meta.evidence_path 확인

---

E. 사이즈 상한(방어)
1) 텍스트 16KB 초과
- POST /api/threads/append
  - text: 20000자 등 16KB 초과
- 기대: 413 TEXT_TOO_LARGE
2) JSONL 1라인 64KB 초과
- 같은 방식으로 meta 포함 과대 데이터 → 413 LINE_TOO_LARGE

---

F. 최근 목록 응답 필드 경량화
1) GET /api/threads/recent?limit=20
- 기대: 각 item에 convId, title, title_locked, last_ts, top_tags(<=3), approx_turns

---

G. UI 동작(브라우저, A1 프로토)
1) 새 스레드 시작 → 헤더에 convId/제목 배지 표시, Recent에 추가
2) 메시지 2~3개 후 제목 1회 업그레이드(🔒) 확인, 이후 불변
3) refs=0일 때 “근거 부족 – 보류” 템플릿 노출 및 서버 라인 기록
4) 새로고침 후 로컬 렌더 → 서버 병합으로 턴이 보강되는지 확인
5) Recent에서 다른 스레드 선택 전환 시 헤더/리스트 동기화 확인

---

부록 — cURL 헬퍼 스크립트(저장 후 실행)
아래 블록을 gumgang_meeting/scripts/tests/st1206.sh 로 저장(+x)하면 테스트를 빠르게 반복할 수 있습니다.

```bash
#!/usr/bin/env bash
set -euo pipefail

BASE="${BASE:-http://localhost:8000}"
JQ="${JQ:-jq}"

new_cid() {
  day=$(date +%Y%m%d)
  rnd=$(cat /dev/urandom | tr -dc 'a-z0-9' | head -c 8 || true)
  echo "gg_${day}_${rnd}"
}

t_new() {
  CID="${1:-$(new_cid)}"
  TITLE="${2:-"첫 메시지입니다. 제목은 이 문장의 앞부분을 사용."}"
  echo "CID=$CID"
  curl -sS -X POST "$BASE/api/threads/append" \
    -H 'Content-Type: application/json' \
    -d "{
      \"convId\":\"$CID\",
      \"role\":\"user\",
      \"text\":\"첫 메시지입니다. 제목은 이 문장의 앞부분을 사용.\",
      \"refs\":[],
      \"meta\":{\"title\":\"$TITLE\",\"title_locked\":false,\"tz_client\":\"Asia/Seoul\"}
    }" | $JQ .
  echo "$CID"
}

t_upgrade_lock() {
  CID="$1"
  curl -sS -X POST "$BASE/api/threads/append" \
    -H 'Content-Type: application/json' \
    -d "{
      \"convId\":\"$CID\",
      \"role\":\"assistant\",
      \"text\":\"이 응답은 충분히 길거나(>=200자) 또는 refs를 포함하여 제목 업그레이드를 트리거합니다. 그러므로 title_locked=true 상태로 업그레이드 후 더 이상 변경되지 않아야 합니다.\",
      \"refs\":[\"status/checkpoints/CKPT_72H_RUN.md#L1-6\"],
      \"meta\":{\"title\":\"업그레이드된 요약 제목\",\"title_locked\":true}
    }" | $JQ .
}

t_lock_conflict() {
  CID="$1"
  curl -sS -o /dev/stderr -w "%{http_code}\n" -X POST "$BASE/api/threads/append" \
    -H 'Content-Type: application/json' \
    -d "{
      \"convId\":\"$CID\",
      \"role\":\"system\",
      \"text\":\"제목 변경 시도\",
      \"refs\":[],
      \"meta\":{\"title\":\"잠금 이후 변경 시도\",\"title_locked\":true}
    }"
}

t_block_sgm() {
  CID="$1"
  curl -sS -X POST "$BASE/api/threads/append" \
    -H 'Content-Type: application/json' \
    -d "{
      \"convId\":\"$CID\",
      \"role\":\"assistant\",
      \"text\":\"[SGM: 근거 부족 – 답변 보류]\",
      \"refs\":[],
      \"meta\":{\"sgm_blocked\":true, \"hint\":{\"reason\":\"zero_refs\",\"suggest\":[\"upload files\",\"re-run unified search\",\"narrow query ...\"]}}
    }" | $JQ .
}

t_grounded_with_ev() {
  CID="$1"
  curl -sS -X POST "$BASE/api/threads/append" \
    -H 'Content-Type: application/json' \
    -d "{
      \"convId\":\"$CID\",
      \"role\":\"assistant\",
      \"text\":\"근거를 포함한 응답 예시\",
      \"refs\":[\"status/checkpoints/CKPT_72H_RUN.md#L1-6\"],
      \"meta\":{\"evidence_path\":\"status/evidence/memory/unified_runs/$(date +%Y%m%d)/run_demo.json\"}
    }" | $JQ .
}

t_recent() {
  curl -sS "$BASE/api/threads/recent?limit=20" | $JQ .
}

t_read() {
  CID="$1"
  curl -sS "$BASE/api/threads/read?convId=$CID" | $JQ .
}

t_oversize_text() {
  CID="$1"
  big=$(python - <<'PY'
print("A"*20000)
PY
)
  code=$(curl -sS -o /dev/null -w "%{http_code}" -X POST "$BASE/api/threads/append" \
    -H 'Content-Type: application/json' \
    --data-binary @- <<EOF
{
  "convId":"$CID",
  "role":"user",
  "text":"$big",
  "refs":[],
  "meta":{}
}
EOF
)
  echo "Expect 413, got: $code"
}

# Demo run
if [[ "${1:-}" == "demo" ]]; then
  CID=$(t_new | tail -1)
  t_upgrade_lock "$CID" >/dev/null
  echo "Lock conflict status:"; t_lock_conflict "$CID"
  t_block_sgm "$CID" >/dev/null
  t_grounded_with_ev "$CID" >/dev/null
  echo "Recent:"; t_recent
  echo "Thread read:"; t_read "$CID"
  echo "Oversize:"; t_oversize_text "$CID"
fi
```

사용 방법
- 체크리스트 절차를 따라 UI와 API를 함께 확인합니다.
- 헬퍼 실행 예:
  - chmod +x gumgang_meeting/scripts/tests/st1206.sh
  - BASE=http://localhost:8000 gumgang_meeting/scripts/tests/st1206.sh demo

수락 기준(요약)
- /api/threads/append/recent/read 200 동작, append-only 파일 생성.
- 새 스레드 제목 Draft → 최대 1회 업그레이드 후 🔒, 이후 제목 변경 시도 409.
- refs=0 차단 시 JSONL에 meta.sgm_blocked=true, meta.hint 포맷 기록.
- /recent 응답 필드(title/title_locked/last_ts/top_tags/approx_turns) 확인.