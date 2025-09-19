---
timestamp:
  utc: 2025-09-17T07:10Z
  kst: 2025-09-17 16:10
author: Codex (AI Agent)
summary: BT-09 Bridge/API 계약 검증 작업 지시서(v1/v2 recent/read 스키마 일치 확인)
document_type: task_instruction
tags: [tasks]
BT: BT-09
ST: ST-0901
phase: present
DOCS_TIME_SPEC: GG_TIME_SPEC_V1
---

# ST-0901 — Contract Verification (Bridge/API)

목적: Bridge(3037)와 Backend(8000)의 v1/v2 Threads 엔드포인트가 설계서(`status/design/backend_semantic_search_api.yaml`)와 스키마가 일치하는지 검증하고 증적을 남긴다.

선행 조건
- 서버 구동: 8000/3037/5173/5175 OK (`./check_servers.sh`)
- DB 준비: `db/gumgang.db`
- 브라우저/테스트 Origin 고정: 127.0.0.1

체크리스트
- [x] v1 recent/read (Backend) 스키마 확인 — `/api/threads/recent`, `/api/threads/read?convId=`
- [x] v1 recent/read (Bridge) 스키마 확인 — `/bridge/api/threads/*`
- [x] v2 recent/read (Backend) 스키마 확인 — `/api/v2/threads/*`
- [x] v2 recent/read (Bridge) 스키마 확인 — `/bridge/api/v2/threads/*`
- [x] key 필드 일치 확인: `ok`, `data.items[].{id|convId,title,updatedAt}` 등 설계 대비 필수 키 존재
- [ ] 응답 시간 p95 ≤ 1500ms (로컬 3회 평균 참고)
- [x] 증적 저장 및 CKPT Append

명령 예(Bridge 기준)
```bash
# v2 recent/read
curl -s 'http://127.0.0.1:3037/api/v2/threads/recent?limit=5' | jq '.ok, (.data.items|length)'
id=$(curl -s 'http://127.0.0.1:3037/api/v2/threads/recent?limit=1' | jq -r '.data.items[0].id // .data.items[0].convId')
curl -s "http://127.0.0.1:3037/api/v2/threads/read?id=${id}" | jq '.ok, .data.id, (.data.turns|length)'

# v1 recent/read
curl -s 'http://127.0.0.1:3037/api/threads/recent?limit=5' | jq '.ok, (.data.items|length)'
id=$(curl -s 'http://127.0.0.1:3037/api/threads/recent?limit=1' | jq -r '.data.items[0].convId // .data.items[0].id')
curl -s "http://127.0.0.1:3037/api/threads/read?convId=${id}" | jq '.ok, .data.convId, (.data.turns|length)'
```

대조 문서
- 설계: `status/design/backend_semantic_search_api.yaml`

증적 규약
- `status/evidence/bridge/CONTRACT_MATCH_<UTC>.md` — 비교 결과 요약(불일치 항목/원인/조치)
- 필요 시 원응답: `status/evidence/bridge/samples/contract_*.json`

이번 실행 증적(2025-09-17 UTC)
- Report: `status/evidence/bridge/CONTRACT_MATCH_20250917T073050Z.md`
- Samples: `status/evidence/bridge/samples/*_20250917T073050Z.json`

완료 조건(AC)
- v1/v2, Backend/Bridge 총 4경로 모두 스키마 일치 OK. 불일치 시 원인과 수정안 기록.

CKPT Append 템플릿
```bash
UTC=$(date -u +%Y-%m-%dT%H:%M:%SZ)
echo '{"run_id":"ST-0901_CONTRACT_MATCH","scope":"BT-09.ST-0901","decision":"Contract verified — v1/v2 match via Bridge/Backend","next_step":"Proceed to BT-10 search UX smoke","evidence":"status/evidence/bridge/CONTRACT_MATCH_<UTC>.md","utc_ts":"'"$UTC"'","writer":"agent"}' >> status/checkpoints/CKPT_72H_RUN.jsonl
```
