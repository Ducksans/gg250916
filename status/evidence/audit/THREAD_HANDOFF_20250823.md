# THREAD HANDOFF — 2025-08-23 — ST-1205 준비 메모

본 문서는 다음 스레드(“BT-12/ST-1205 Self‑RAG/신선도 회귀”) 착수를 위한 인수인계 노트입니다. 현재 상태, 근거(Evidence) 위치, 다음 스코프/AC, 리스크, 실행 순서를 빠짐없이 적었습니다.

## 1) 현재 상태(요약)

- A8 — Roadmap v1 가동(사람 눈 기준 진행판)
  - 라운드 칩(L1/L2/L3), CHAIN, NEXT 표시
  - 내러티브 목록: “(진행완료|진행중|차단|계획) BT/ST 제목 … KST 날짜”
  - 상태 필터(전체/완료/진행중/차단/계획), 상태색(완료=연녹/진행=연파랑/차단=연빨강/계획=짙청)
  - 증거 열기(Bridge /api/open) 및 브라우저 뷰(/api/fs/read) 정상
- 진행도 API(/api/roadmap/progress)
  - 로드맵 마커(JSON) + CKPT tail 병합
  - start_ts/last_ts/evidence 자동 채움(backfill 스캔)
  - meta.backfill_scanned로 스캔 카운트 제공
- 브릿지·백엔드 런너
  - scripts/dev_all.sh: tmux 모드(리로드 ON, Tauri ON 기본)
  - 브릿지 FS 기본 루트(status/ui) 자동 허용
- 인디케이터 배너(헤더 우측)
  - L1~L3 점등, NEXT, CHAIN OK/FAIL, 상태 저장/로드맵/헬스 버튼

체크포인트
- 72H_20250823_0935Z — “A8 Roadmap v1 통과(진행도·KST·증거·필터/색/내러티브 정상)”

## 2) 근거(Evidence) 경로

- 로드맵 문서(+마커 JSON)
  - `status/roadmap/BT11_to_BT21_Compass_ko.md`  (BT_ST_MANIFEST 블록 포함)
- UI — A8 탭 & 로직
  - `ui/snapshots/unified_A1-A4_v0/index.html`  (A8 — Roadmap 섹션)
  - `ui/overlays/active.css`, `ui/overlays/active.js`  (배너/보조)
- 백엔드(API)
  - `app/api.py`  (/api/roadmap/progress, evidence backfill, debug meta)
- 브릿지
  - `bridge/server.js`  (FS_ALLOWLIST 기본값: status/ui, /api/fs/read·/api/open)

## 3) 다음 스레드 스코프 — ST-1205(Self‑RAG/신선도 회귀) 착수

목표
- 회상(Recall) 품질을 “신선도 가중 + 자기평가(Self‑RAG 1회 루프)”로 개선하여, 동일 쿼리 대비 상위 후보의 관련도·신선도를 눈에 보이는 지표와 근거 파일로 증명.

범위(Phase 1, PoC)
- Recall API 확장
  - 파라미터: `need_fresh=1`, `halflife_days`(기본값), `fresh_weight`
  - 스코어: keyword + recency(decay by halflife) (+ optional tier/refs)
- Self‑RAG 1회 토글
  - recall → draft → self‑eval(간단 루브릭) → rerank/retrieve → final set
- Evidence 로깅
  - 각 쿼리별 상위 k 후보의 전/후 점수·선정사유/루브릭 결과를 JSON으로 저장
  - 경로 예: `status/evidence/memory/recall_runs/YYYYMMDD/run_<ts>.json`

수용 기준(AC)
- 동일 쿼리 2건 이상에서 “전/후 비교”로 상위 1~3개 후보의 관련도가 개선(정성+간단 정량)
- 신선도 가중과 self‑eval 선택 근거가 Evidence JSON에 남음
- 회귀 가능(재실행 시 비슷한 결과) — 시드/파라미터 기록

## 4) 실행 순서(새 스레드)

1) ST-1205 시작 CKPT 기록(6줄) — “Recall 확장+Self‑RAG v0 착수”
2) Recall API 확장(백엔드)
   - `/api/memory/search` 또는 `/api/memory/recall`에 fresh 옵션 반영
   - halflife decay, weighting 파라미터화
3) Self‑RAG v0(간단 루브릭)
   - draft(answer) → rubric score → rerank/retrieve (1회)
4) Evidence JSON 저장 로직 추가
   - 입력 쿼리, 후보 목록 전/후, 점수·사유, 파라미터 기록
5) A8 보조(선택)
   - ST-1205 라인에 “증거 모두 보기” 팝업 연결(여러 파일 중 선택 오픈)

## 5) 위험/완충

- 원장(SSOT)에 ST 토큰 부재였던 구간은 backfill로 보완되나, PASS 정밀 시각은 근사(mtime)일 수 있음
  - 완충: 이후 CKPT에 “ST-xxxx START/PASS” 명시 규율화 → 자동 정밀화
- 성능(백필/검색)
  - backfill 스캔은 상한(MAX_FILES/MAX_BYTES) 있음 — 필요 시 범위 조정
- UX
  - A8에 증거가 많으면 선택 UI 필요 — 팝업 우선 배치 제안

## 6) 오늘 변경 사항 요점(요약)

- A8 Roadmap 탭 신설(큰 화면, 내러티브/필터/색/증거 버튼)
- 진행도 API 보강(마커 JSON 병합, backfill, debug 메타)
- 브릿지 FS 기본 루트(status/ui) 자동 허용
- 오버레이 배너 위치/겹침 개선, 브라우저 뷰/OS 열기 모두 정상

## 7) 시작/운영 가이드

실행
- tmux 3분할:  
  `RELOAD=1 RUN_TAURI=1 ./scripts/dev_all.sh tmux`
- 헬스:
  - Backend: `curl -s http://127.0.0.1:8000/api/health | jq .`
  - Bridge:  `curl -s http://127.0.0.1:3037/api/health | jq .`

UI
- 배너: L1~L3/NEXT/CHAIN 자동 갱신(15s), “로드맵 문서 열기/브라우저 뷰”
- A8: 상태 필터 조정, 라인 클릭으로 증거 열기(버튼), 브라우저 뷰 확인

체크포인트(예시 — 다음 스레드 첫 줄)
```
RUN_ID: 72H_<YYYYMMDD_HHMM>Z
UTC_TS: <ISO8601Z>
SCOPE: TASK(BT-12)
DECISION: ST-1205 시작 — Recall 확장(신선도 가중) + Self‑RAG v0(1회 루프) 착수
NEXT STEP: Recall API에 halflife/fresh_weight 파라미터 추가 및 Evidence 로깅 구현
EVIDENCE: status/evidence/memory/recall_runs/README.md#L1-60
```

## 8) .rules 검토(오해 소지 지점 보고)

- SSOT 지침(OK): “CKPT_72H_RUN.jsonl(API append-only), MD는 뷰” — 현재 일관 운용
- 포트/기동 순서(OK): 8000 → 3037 → UI, dev_all.sh로 일원화
- FS Allowlist(보완 완료): .env 미설정 시 브릿지 기본 허용(status/ui) 사용 — 문서에 “기본 허용 있음(개발 모드)” 주석 필요
- ST 토큰 규율(추가 제안):  
  “시작/완료 시 DECISION에 ST-xxxx 포함”을 .rules에 명시(진행도/증거 연계 정밀화)
- SAFE/NORMAL(OK): 현재 지침과 코드 상 동작 합치, 다만 Playbook 단계에서 HUMAN_APPROVAL 게이트를 BT-14A 때 구체화 예정

## 9) 오픈 이슈(메모)

- PASS 시각 정밀화: 백필 mtime → 원장 PASS 토큰으로 대체 필요
- Evidence “여러 개” 선택: 팝업/목록 UI 도입
- A8 정렬/접기: BT 접기/펼치기, 라운드 그룹 정렬(선택)
- 로드맵 문서 뷰어: 마크다운 렌더(+앵커 점프) 확장(선택)

---

끝. 다음 스레드(“ST-1205 Self‑RAG/신선도 회귀”)에서 위 순서대로 착수합니다. 오늘 기록의 근거와 경로는 상단 항목(Evidence) 참조.