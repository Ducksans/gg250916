---
timestamp:
  utc: 2025-09-16T16:34Z
  kst: 2025-09-17 01:35
author: Codex (AI Agent)
summary: BT-06 ST-0607 테스트 시나리오와 증거 규격 정의
document_type: test_plan
tags:
  - #design
  - #bt-06
  - #st-0607
phase: present
DOCS_TIME_SPEC: GG_TIME_SPEC_V1
---

# Test Plan (Draft)

목적: BT-07~BT-10에 대한 검증 시나리오와 수용 기준 정의.

## 공통 원칙
- 모든 테스트 결과는 path#Lx-y로 인용 가능한 증거를 남긴다(status/evidence/*).
  - 아티팩트 규격: JSON은 *.json, 로그는 *.log, 스크린샷은 *.png 로 저장.
  - 네이밍: <YYYYMMDD_HHMM>_<scenario>.{json|log|png}
  - 모든 아티팩트는 문서 내 Evidence 항목으로 path#Lx-y 인용.
- 서버/포트 고정: Backend 8000, Bridge 3037.

## 시나리오 예시
0) Threads v2(DB) + Bridge 패스스루
   - recent: GET /api/v2/threads/recent?limit=5 (FastAPI 8000, Bridge 3037)
   - read:   GET /api/v2/threads/read?id=<id>
   - Evidence: status/evidence/bridge/V2_PROXY_PASS_*.md
   - 수용 기준:
     - Bridge→Backend 응답 그대로 전달(ok:true, items[*].id 존재)
     - read 시 turns 배열 존재, 오류 없음

1) Semantic Search API(문서 기준)
   - 입력: POST /search { query: "...", top_k: 5 }
   - 출력: 200, results[*].path,line_start,line_end,snippet 존재
   - Evidence: status/evidence/search_api_sample.json#L1-100, status/evidence/search_api_schema_result.log#L1-100
   - 수용 기준:
     - 스키마 적합: sample이 backend_semantic_search_api.yaml의 SearchResponse에 100% 적합
     - 인용 충족: results[*] 모두 path,line_start,line_end 포함(100%)
     - 크기 제한: top_k ≤ 50, 결과 길이 ≤ top_k
     - 성능(적용 시): p95 응답 ≤ 1500ms, 실패율 0%

2) Bridge 계약 적합성(문서 기준)
   - 입력/응답: bridge_contract.md의 스키마 예제 사용
   - Evidence: status/evidence/bridge_contract_sample.json#L1-120, status/evidence/bridge_contract_validation.log#L1-200
   - 수용 기준:
     - 계약 일치: 요청/응답이 bridge_contract.md와 backend ErrorResponse/Request 스키마에 적합
     - 하트비트: 60s 내 연속 2회 미수신 시 재연결 로그 존재
     - 타임아웃(적용 시): 왕복 응답 시간 2s 이내

3) UI UX 링크 오픈
   - 동작: 검색 결과 더블클릭→해당 파일/라인 열림
   - Evidence: 로그 캡처 또는 스크린샷(status/evidence/ui_open_navigation.png#L1-1, status/evidence/ui_open_navigation.log#L1-200)
   - 수용 기준:
     - 3회 연속 더블클릭→파일/라인 오픈 성공(0 실패)
     - 크래시/흰 화면 0회, WRITE_ALLOW 외 저장 시도 0회

## 리그레션
- 체크포인트 6줄 포맷 위반 여부 점검(수동 목록→스크립트로 이행).
  - Evidence: status/evidence/ckpt_lint_result.txt#L1-200
  - 수용 기준: 위반 0건, EVIDENCE 라인에 path#Lx-y 필수
4) UI Threads Import & Infinite Scroll
   - 준비: TopToolbar → Backend=FastAPI/Bridge, Source=DB 로 각각 1회씩 테스트
   - 동작: Import Threads 실행 → 좌측 패널 하단까지 스크롤 반복
   - Evidence: status/evidence/ui/thread_import_*.{log,json}, 스크린샷 1장
   - 수용 기준:
     - visibleCount가 20→40→60… 증가
     - 임의 스레드 진입 시 turns 렌더, 깜빡임 없음(라우트 동기화 조건 준수)
