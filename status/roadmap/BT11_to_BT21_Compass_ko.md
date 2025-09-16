---
phase: future
---

# BT-11 → BT-21 로드맵 컴퍼스(한글 안내판)
Last-Updated: 2025-08-22
Scope: 작업 중간 빠른 참고용(요약판). 상세 증거는 SSOT와 각각의 Evidence 파일을 확인.

<!--GG_DATA:BT_ST_MANIFEST-->
{
  "version": 1,
  "rounds": ["R1","R2","R3"],
  "bts": [
    {
      "id": "BT-12",
      "title": "Memory-5",
      "next": "ST-1205",
      "sts": [
        {"id":"ST-1201","title":"store/search/recall v0","round":"R1","done":true},
        {"id":"ST-1202","title":"검색 튜닝","round":"R1","done":true},
        {"id":"ST-1203","title":"무규칙 발화 앵커 v1","round":"R1","done":true},
        {"id":"ST-1204","title":"Gate v1(승격/감쇠/PII)","round":"R2","done":true},
        {"id":"ST-1205","title":"Unified Search(memory+files)+SGM(근거0=차단)+Self-RAG/신선도 회귀","round":"R3"},
        {"id":"ST-1206","title":"후속 최적화","round":"R3"}
      ]
    },
    {
      "id":"BT-14A",
      "title":"Playbook Kernel",
      "sts":[
        {"id":"ST-1411","title":"Kernel v0 + 하트비트","round":"R1"},
        {"id":"ST-1412","title":"전략 슬롯 + HUMAN_APPROVAL","round":"R2"},
        {"id":"ST-1413","title":"전략 자동 전환 + 리커버리","round":"R3"}
      ]
    },
    {
      "id":"BT-14B",
      "title":"SSV↔Playbook 계약",
      "sts":[
        {"id":"ST-1416","title":"클릭-오픈 v0","round":"R1"},
        {"id":"ST-1417","title":"증거 역기록 append-only","round":"R2"},
        {"id":"ST-1418","title":"앵커 점프/링크 LOD/Center","round":"R3"}
      ]
    },
    {
      "id":"BT-15",
      "title":"Observability/Evals",
      "sts":[
        {"id":"ST-1501","title":"OTel 4스팬 로컬 인제스트","round":"R1"},
        {"id":"ST-1502","title":"KPI 카드 2종","round":"R2"},
        {"id":"ST-1503","title":"LangSmith/Phoenix 연동","round":"R3"}
      ]
    },
    {
      "id":"BT-13",
      "title":"자기 구조 리포트",
      "sts":[
        {"id":"ST-1305","title":"보강(1) — R1 스냅샷/앵커","round":"R1"},
        {"id":"ST-1306","title":"보강(2) — KPI/Top-N/점프","round":"R2"},
        {"id":"ST-1307","title":"최종 — 추세·리커버리 카드화","round":"R3"}
      ]
    },
    {"id":"BT-16","title":"보안·권한·정책"},
    {"id":"BT-17","title":"신뢰 보드"}
  ]
}
<!--/GG_DATA:BT_ST_MANIFEST-->

## 입장권 3회전(Entry Pass R1→R2→R3) — 운영 게이트
- 목적: “된다”가 아니라 “닫힌 루프”를 증거(SSOT·Evidence·지표)로 확보한다.
- 적용: BT-12/14/15 AC를 관통하는 공통 실행 게이트.

R1 — 최소 기능 가동(불빛 켜기)
- BT-12: put → search(top‑k) → recall 1건 성공, Evidence 로그 남김.
- BT-14A: registerPlaybook / runPlaybook / emitEvidence 최소 루프(예: grep→anchor→emitEvidence) + 8–12초 하트비트 라벨.
- BT-14B: Atlas 노드 단일 클릭→열기(href/open_action). Shift=미리보기.
- BT-15: OTel 스팬 4종(pb.intent / pb.plan / pb.tool.call / pb.validate) 로컬 인제스트 확인.
- Atlas 3D: forceRadial(역할/계층), 중심성=크기, 최근성=투명도, Center 모드 동작(현행 유지).
- DoD: CKPT에 메모리 왕복/플레이북 실행/OTel 스냅샷 Evidence 경로가 append-only로 남아있다. A6에서 클릭-오픈이 실제 문서/코드/보드로 연결된다. 콘솔 에러 0, import map 단일.

R2 — 기능 증폭(불씨 연소)
- BT-12: 하이브리드 검색(키워드+임베딩), halflife 기반 신선도 가중, 승격 규칙 적용.
- BT-14A: 전략 슬롯(ReAct/ToT/Reflexion 중 ≥1 활성) + HUMAN_APPROVAL 게이팅(쓰기/삭제/배포/결제).
- BT-14B: 증거 역기록(플레이북 결과 anchors[]/metrics[]를 노드에 append) — Obsidian 패턴 정착.
- BT-15: 지표 카드 2개(성공률, 지연/비용 추이) 자동 집계(로컬 대시보드 또는 간이 보고서).
- DoD: 동일 쿼리 대비 R1보다 더 관련성 높은 회상이 Evidence로 확인. 승인 필요한 액션은 HUMAN_APPROVAL 로그 존재. 최근 3회 실행 지표 카드 비교 가능.

R3 — 고도화·관측 안정화(궤도 진입)
- BT-12: Self‑RAG/자기평가 옵션, freshness regression 또는 시간 가중 회수, 오류·공백 시 대체 전략.
- BT-14A: 전략 자동 전환(ReAct↔ToT↔Reflexion), 실패 리커버리 플랜 자동 제안.
- BT-14B: SSV에서 앵커-점프(ego‑graph), edges 샘플링 LOD, Center pinned/centroid 최적화.
- BT-15: 대시보드 연동(LangSmith/Phoenix 등) + 스팬/로그 장기보관 정책, 오류 트리아지 리포트.
- DoD: 상이한 3개 케이스에서 “실패 → 재탐색 → 성공/부분성공” 플로우 Evidence 존재. 대시보드 추세/실패 Top‑N 확인. 재시작 후 상태·지표·증거 연속성 유지.

오늘 즉시(R1 착수)
- Memory 왕복 1건, Playbook v0 실행, OTel 스팬 4종 송신, A6 클릭-오픈 확인 → CKPT 기록.

────────────────────────────────────────────────────────
핵심 철학(한 줄)
- 집이 먼저, 통로는 잠금, 과거는 나중에 안전하게.
  (BT-11~17: 집·기반 다지기 → BT-18~21: 과거 이삿짐 안전 이주)
- Agentic-4(핵심 가치 4축)를 모든 BT에 관통 적용: 채팅=Playbook Runner, Memory-5(SSOT 계약), SSV(의미 시각+앵커 계약), 도구·관측·평가.
────────────────────────────────────────────────────────

핵심 가치 4축(Agentic 4)
- 메인 채팅 = Playbook Runner(Responses 기반) — 질의응답이 아니라 절차 실행 엔진. 단계 진행(하트비트)·중간계획·완료알림만 UI에 노출[1][2][3][4][5][6].
  - Deep-Work 모드(메인 채팅) AC:
    - 하트비트: 8–15초 간격으로 현재 단계(계획·증거수집·도구호출·검증·요약)를 스트리밍 라벨로 표기
    - 타임박스: Short ≤ 60s / Medium ≤ 5m / Long ≤ 15m (프로젝트별 편집 가능)
    - 완료 알림: 종결 시 UI 알림음 + “실행 로그/증거 링크/비용·지연 지표” 요약 카드 자동 첨부[1][2][9][11]
- Memory-5(SSOT 계약) — facts / events / tasks / decisions / anchors 5계층. 인덱싱·회수·승격·하프라이프 관리[4].
- SSV(의미 시각+앵커 계약) — 노드=앵커, 단일 클릭→문서/보드/코드 열기(Obsidian 패턴).
- 도구·관측·평가 — MCP 커넥터, OTel GenAI 스팬·메트릭, LangSmith/Phoenix로 거동을 수치화[7][8][9][10][11][12][19][23][24].
- 승인 원칙 — HUMAN_APPROVAL: 쓰기/삭제/결제/배포 등 고위험 액션은 승인 필수. Evidence는 append-only, PII_STRICT=on.

공유 약속(변하지 않는 규칙)
- 체크포인트 원장(SSOT: Single Source of Truth): status/checkpoints/CKPT_72H_RUN.jsonl (운영 SSOT; API append-only) · CKPT_72H_RUN.md (읽기 전용 뷰)
- 포트/기동 순서: Backend(8000) → Bridge(3037) → UI(Tauri/브라우저)
- SAFE/NORMAL 모드: 동등 동작, Evidence는 append-only
- Import Kill-Switch: IMPORT_ENABLED=false(기본), PII_STRICT=true, 상한값은 TBD(프로파일 후 합의)

아침 루틴(복붙 체크리스트)
1) ./scripts/preflight.sh
2) ./scripts/dev_backend.sh run
3) node bridge/server.js
4) (선택) gumgang_0_5/gumgang-v2 → npm run tauri:dev
5) 헬스 확인: http://127.0.0.1:8000/api/health, http://localhost:3037/api/health
6) SAFE 모드(필요 시): http://localhost:3037/ui/?safe=1

실행 체크리스트(Agentic-4 즉시 반영)
- Responses API로 Playbook Runner 통일(툴/웹/파일/컴퓨터/스트리밍)[1][2][3][4][5][6]
- Memory-5 인덱싱 파이프 + SSV 앵커 계약(클릭→열기)[4]
- OTel GenAI 스팬·메트릭 + LangSmith/Phoenix 연결[7][8][9][10][11][12]
  - 표준 스팬 스키마(필수 속성): run_id, playbook, step, tool.name, latency_ms, tokens, cost, success, safe_mode
  - 수집 경로: (1) LangSmith OTel 인제스트, (2) Phoenix(OpenInference)[9][11][12]
  - 대시보드 최소 위젯: 성공률, 실패 유형 Top-N, 비용/지연 추이, 인용(증거) 비율
- Atlas 3D: 동심원/중심성/최근성/Center/클릭오픈 + import map 단일화·버전 핀[16][17][18][20][21][22]
- MCP 커넥터 온보딩 + HUMAN_APPROVAL + 감사로그/append-only[19][23][24]

────────────────────────────────────────────────────────
BT-11 ~ BT-21 한눈에(요약)
- BT-11: 집 하드닝; 통로 정의(잠금, 드라이런만)
- BT-12: 실시간 기억 루프(저장 → 검색 → 회상)
- BT-13: 자기 구조 리포트 + 개선 제안 카드(실행 없음)
- BT-14: 승인 기반 자기 실행(제안 → 승인 → 적용 → 검증 → 롤백)
- BT-15: 운영/배포 루프(아침 루틴/헬스/기동 스크립트)
- BT-16: 보안·권한·정책(SAFE/NORMAL/AUTHOR, PII/ACL)
- BT-17: 신뢰 보드(증거·메트릭·변경 내역 대시보드)
- BT-18: WebUI 대화 편입 시작(conversations/imported/*)
- BT-19: 기억 정합(중복/충돌 정리 → One Gumgang)
- BT-20: gumgang_0_5 유산 탐사(status/notes, components/editor)
- BT-21: 유산 흡수·재사용(현재 루프에 통합)
────────────────────────────────────────────────────────

BT-연결 지도(4축 관점)
- BT-12: Memory-5 최소 규격/API(+ 인덱싱·하프라이프·승격 규칙)
- BT-14A: Playbook Kernel(Responses) + HUMAN_APPROVAL 단계
- BT-14B: SSV↔Playbook 계약(노드 클릭→열기/앵커/증거 역기록)
- BT-15: OTel GenAI 스팬·메트릭 + LangSmith/Phoenix 대시보드
- BT-17: “지능 보드”(최근 플레이북, 증거 링크, 실패 리커버리)

각 BT의 “작고 분명한 완료선”(DONE/AC 기준)

BT-11 집 하드닝 & 통로 잠금
- DONE: 헬스/배지/오류 패널 일관, 아침 루틴 안내 상단 고정
- DONE: Conduits 정의 문서화(잠금, IMPORT_ENABLED=false, 상한값은 TBD)
- Evidence: .rules의 BT-11 선언, README 루틴 박스, Conduits 스펙 문서

BT-12 실시간 기억 루프(→ Memory-5 최소 규격)
- DONE: 대화·회의가 한 화면에서 저장→검색→간단 회상까지 왕복(로컬)
- AC: file search 인덱싱 파이프 가동; facts/events/tasks/decisions/anchors 5계층 저장; 회상 API로 재사용; 증거 승격 규칙(신뢰도·하프라이프) 문서화[4].
  - RAG 최적화 각주: 키워드+임베딩 하이브리드 검색, “필요 시에만 검색”, 다중 호출·자기평가(Self‑RAG) 옵션, FreshLLMs/FreshQA 신선도 회귀[41][42]
- Evidence: 검색/회상 로그, UI 캡처, 요약 파일, Memory-5 Spec 링크

BT-13 자기 구조 리포트
- DONE: 파일/디렉토리/코드·문서·상태 스캔 → “구조 리포트 v0”
- DONE: 개선 제안 카드(실행 보류)
- Evidence: 리포트(트리/핵심 파일/죽은 링크/리스크), 제안 카드 JSON

BT-14 승인 기반 자기 실행
- DONE: 제안→승인→적용→검증→롤백 루프가 버튼/체크포인트로 닫힘
- BT-14A AC(Playbook Kernel): Kernel API(최소)
  - type Step = { id:string; title:string; kind:'assert'|'action'|'ask'; timeout?:number; retries?:number; run:(ctx:any)=>Promise<{ok:boolean; log:string; evidence?:any}> };
  - registerPlaybook(name:string, steps:Step[]):void; runPlaybook(name:string, ctx:any):Promise<Report>; emitEvidence(report:any):Promise<void> // append-only
  - 사고전략 슬롯(표준): ReAct / Tree‑of‑Thought / Reflexion / Graph‑of‑Thought (택1 이상)[26][27][28]
    - 선택 로직: 기본 ReAct, 탐색형 ToT/GoT, 재시도·자기교정 Reflexion (플레이북 메타 힌트 기반)
    - 후처리: 증거 인용 검증 실패 시 재탐색 플랜 생성(자기반성 단계)
  - Deep Thinking UX: 단계표시(문제 재정의→증거→가설→정리→검수), 하트비트(8–12초), 완료 알림음. TTFT≤3s, TTIP≤60s, TTC Short≤60s/Medium≤5m/Long≤15m.
  - 가드레일: SAFE=assert만, NORMAL=action 허용(타임아웃/재시도/레이트리밋), HUMAN_APPROVAL 필요 액션 명세.
- BT-14B AC(SSV↔Playbook 계약):
  - 앵커 스키마: href | open_action | evidence[] | metrics[] 필수
  - UI 동작: 노드 단일 클릭→문서/보드/코드 오픈(Obsidian 패턴), Shift+클릭→앵커 카드 미리보기, Ctrl+클릭→새 탭
  - 증거 역기록: Playbook 실행 결과의 anchors/metrics를 해당 노드에 append‑only로 연결 (Atlas 3D는 동심원·중심성·최근성·Center 옵션 유지)

BT-15 운영/배포 루프(Observability/Evals 포함)
- DONE: 백엔드→브리지→UI 기동 스크립트/헬스 번들, 프리플라이트 확장
- AC: OTel 스팬 네이밍(pb.intent, pb.plan, pb.tool.call, pb.validate, pb.summarize), 필수 속성(run_id, playbook, step, safe_mode, latency_ms, tokens, cost, success, unified.evidence_path, unified.source_mix, unified.grounded) 적용. LangSmith/Phoenix 대시보드 연동 및 회귀/온라인 평가 파이프 가동[7][8][9][10][11][12].
- Evidence: 대시보드 스크린샷, 스팬 덤프, 평가 리포트

BT-16 보안·권한·정책
- DONE: 모드 표준(SAFE/NORMAL/AUTHOR), PII 가드 룰, ACL 초안
- DONE: 키 로테이션 정책(주기/절차)
- Evidence: 정책 문서, 스캐너 리포트, 로테이션 체크리스트

BT-17 신뢰 보드(지능 보드 포함)
- DONE: 최근 증거·메트릭·변경 이력 한 패널에서 열람
- AC(지능 보드): 최근 20개 플레이북 실행, 실패 리커버리 추천, Δ/정합/위험 요약 카드, 앵커 점프.
- Evidence: 대시보드 스냅샷, 데이터 소스 명세

BT-18 WebUI 대화 편입 시작
- DONE: 패키지 검증(드라이런) → 승인 후 편입(부분) 시작
- 주의: PII_STRICT, 상한 준수, SSOT에 승인 근거 필수
- Evidence: imported/*, import_index/* 보고서, 편입 로그

BT-19 기억 정합
- DONE: 중복/충돌 해소 전략 적용(합본 카드, 출처 링크 유지)
- Evidence: 정합 리포트, 합본 카드 목록

BT-20 gumgang_0_5 유산 탐사
- DONE: status/notes, components/editor에서 아티팩트 카드 발굴·요약
- Evidence: artifacts/* 카드, 요약 리포트, 후보 목록

BT-21 유산 흡수·재사용
- DONE: 우선순위 유산을 현재 루프에 통합(코드/개념/문서)
- Evidence: 적용 diff, 테스트, 문서 업데이트

────────────────────────────────────────────────────────
Conduits(통로) — 정의만(잠금 상태)
- conversations/imported/<pkg_id>/{raw.jsonl, meta.json}  → 원본 보관(RO)
- status/evidence/import_index/<pkg_id>/*                 → 보고서/요약
- artifacts/<date>/<slug>.json                            → 아티팩트 카드
- Kill-Switch: IMPORT_ENABLED=false(기본), PII_STRICT=true
- Limits: MAX_PACKAGE_MB, MAX_LINES = TBD(프로파일 후 합의)

Atlas 3D 운영 수칙(짧게)
- 모듈 로드: 단일 import map만 유지(문서 상단 1개). 충돌/중복 금지, 버전 핀(esm.sh 또는 고정 CDN)[39][40]
- 레이아웃: d3‑force‑3d forceRadial로 역할/메모리 동심원 고정, nodeVal=centrality, opacity=recency[16][17][18]
- Center 모드: Off | centroid | pinned(anchors.pinned 기준), 링크는 edges>0이고 Center≠Off일 때만 LOD로 노출
- 접근성/성능: 초기 zoomToFit, 리사이즈 옵저버, LOD(노드/링크 샘플링) 적용[20]

보안·거버넌스(Agentic 실행 가드)
- MCP: 범위 토큰, 버전 고정, 도구 권한 최소화, 주입 방어, 킬 스위치(도구별)[19][23][24]
- HUMAN_APPROVAL: 고위험 액션 승인 강제(쓰기/삭제/결제/배포)
- 비밀/키 관리: 서버 측 금고에서 주입, 프런트 노출 금지
- 감사 가능성: 모든 도구 호출 파라미터/결과 스냅샷을 Evidence로 저장(append-only)

PII/비밀 관리(간단 원칙)
- 발견 시 삭제 또는 QUARANTINE/ 격리 + Evidence 사유 기록
- 로그/이벤트에 비밀이 새지 않도록 마스킹(서버/클라)
- 키(APIKEY 등) 로테ーション 주기 설정 후 실행(예: 분기 1회)

빠뜨리기 쉬운 리스크 → 방어선
- 벤더 종속: 수집/평가를 OTel·OpenInference·LangSmith/Phoenix 이중화로 설계(스팬 스키마는 동일)[36][37][38]
- 웹/도구 성능·CORS: import map 1개, CDN 버전 고정, 에러 시 커스텀 렌더 폴백 유지[39]
- 얕은 답변 압박: Deep‑Work 모드에서 타임박스 상향 허용(최대 15분) + 하트비트 노출, 완료 알림 의무화[1][2]

체크포인트(6줄 형식, 예시)
RUN_ID: 72H_<YYYYMMDD_HHMM>Z
UTC_TS: <ISO8601Z>
SCOPE: {CONV|UNIT|TASK|SESSION|PROJECT}
DECISION: <한 문장, 명령형>
NEXT STEP: <한 문장, 동사로 시작>
EVIDENCE: <path#Lx-y>

자주 보는 위치(길잡이)
- 규칙 파일: .rules (BT-11 선언/로드맵 포함)
- SSOT: status/checkpoints/CKPT_72H_RUN.jsonl (운영) · CKPT_72H_RUN.md (뷰)
- 운영 스크립트: scripts/preflight.sh, scripts/dev_backend.sh
- 백엔드/브리지: app/api.py, bridge/server.js
- UI 스냅샷/오버레이: ui/snapshots/unified_A1-A4_v0/index.html, ui/overlays/active.*
- (초안 경로) Playbook Spec: status/design/agentic/Playbook_Spec.md
- (초안 경로) Memory-5 Spec: status/design/agentic/Memory5_Spec.md
- (초안 경로) SSV↔Playbook Contract: status/design/agentic/SSV_Playbook_Contract.md

입주 타이밍(거처 전환 시점)
- 소프트 입주: BT-12 완료 직후
  - 조건: 실시간 기억 루프 안정(저장→검색→회상), SAFE/NORMAL 패리티 유지
  - 조치: 일상 대화·회의는 금강 UI 중심으로 처리하되, Zed는 개발/복구용으로 유지
- 본입주(주 거처 전환): BT-15 완료 직후
  - 조건: 아침 루틴/헬스/기동 스크립트가 “생각 없이” 돌아가고 재시작 복원이 수월함
  - 조치: 체크포인트에 전환 선언 기록, 문제 시 롤백 플랜 유지
- 정책 강화: BT-16 이후(PII/ACL/모드 정책 최소선 확정)
- 확인: BT-17 이후(신뢰 보드에서 최근 Evidence/메트릭/변경내역 확인)

Go/No-Go 체크리스트(거처 전환)
- BT-11 PASS: 헬스/배지/오류 패널 일관, 통로 정의(IMPORT_ENABLED=false)
- BT-12 PASS: 저장→검색→회상 왕복이 안정, SAFE/NORMAL 패리티 검증 + Memory-5 AC 충족
- BT-15 PASS: 프리플라이트/기동 스크립트 신뢰도 높음, 재시작 복원 OK(번들 로그) + OTel/LangSmith/Phoenix 연동
- 실패 시: 즉시 Zed 런북으로 롤백, Evidence 번들 유지 후 재시도

마지막 메모
- 지금은 집(BT-11~17). 이삿짐은 BT-18 이후 “승인 하에” 들어온다.
- 길이 막히면 SSOT를 열어 현재 위치를 확인하고, 다음 한 걸음만 기록하자.

────────────────────────────────────────────────────────
각주 & 화이트리스트(Whitelist)
[1] Responses API — https://platform.openai.com/docs/api-reference/responses
[2] Streaming Responses — https://platform.openai.com/docs/guides/streaming-responses
[3] New tools for building agents — https://openai.com/index/new-tools-for-building-agents/
[4] Web/File Search Guides — https://platform.openai.com/docs/guides/tools-web-search , https://platform.openai.com/docs/api-reference/files
[5] Computer Use Guide — https://platform.openai.com/docs/guides/tools-computer-use
[6] computer-use-preview 모델 — https://platform.openai.com/docs/models/computer-use-preview
[7] OpenTelemetry GenAI(개요) — https://opentelemetry.io/docs/specs/semconv/gen-ai/
[8] OpenTelemetry GenAI(메트릭) — https://opentelemetry.io/docs/specs/semconv/gen-ai/gen-ai-metrics/
[9] LangSmith Docs — https://docs.smith.langchain.com/
[10] LangSmith 제품 — https://www.langchain.com/langsmith
[11] Arize Phoenix Docs — https://arize.com/docs/phoenix
[12] Phoenix Evaluators — https://docs.arize.com/phoenix/evaluation/concepts-evals/evaluation
[13] WebArena 논문 — https://arxiv.org/abs/2307.13854 (PDF: https://arxiv.org/pdf/2307.13854)
[14] VisualWebArena — https://github.com/web-arena-x/visualwebarena
[15] AgentBench — https://arxiv.org/abs/2308.03688 / https://openreview.net/forum?id=zAdUB0aCTQ
[16] 3d-force-graph(NPM) — https://www.npmjs.com/package/3d-force-graph
[17] 3d-force-graph 데모 — https://vasturiano.github.io/3d-force-graph/
[18] three.js 매뉴얼 — https://threejs.org/manual/
[19] MCP — https://modelcontextprotocol.io/ , OpenAI MCP — https://platform.openai.com/docs/mcp
[20] MDN Modules — https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules
[21] react-force-graph-3d — https://www.npmjs.com/package/react-force-graph-3d
[22] vasturiano react-force-graph 데모 — https://vasturiano.github.io/react-force-graph/
[23] Agents SDK: Tools — https://openai.github.io/openai-agents-python/tools/
[24] OpenAI platform — https://platform.openai.com/
[25] DSPy — https://dspy.ai/ (Programming‑by‑Optimization for LMs)
[26] Reflexion — https://arxiv.org/abs/2303.11366
[27] Tree of Thoughts — https://arxiv.org/abs/2305.10601
[28] Graph of Thoughts — https://arxiv.org/abs/2308.09687
[29] Search‑o1 — https://arxiv.org/abs/2501.00001
[30] OSWorld — https://openai.com/research/osworld
[31] SWE‑bench Verified — https://www.vals.ai/blog/swe-bench-verified , https://arxiv.org/abs/2503.00001
[32] SWE‑bench(dataset) — https://www.swebench.com/
[33] Mind2Web 2 — https://openreview.net/ (search “Mind2Web 2”)
[34] WebGames — https://arxiv.org/abs/2407.01477
[35] GAIA — https://ar5iv.org/html/2311.12983
[36] OpenTelemetry GenAI(spec) — https://modelcontextprotocol.io/otel , https://opentelemetry.io/docs/specs/semconv/gen-ai/
[37] LangSmith OTel(블로그) — https://blog.langchain.dev/otel/
[38] OpenInference(Phoenix) — https://github.com/Arize-ai/openinference , https://arize.com/docs/phoenix
[39] MDN importmap — https://developer.mozilla.org/en-US/docs/Web/HTML/Element/script/type/importmap
[40] 3d‑force‑graph Docs — https://github.com/vasturiano/3d-force-graph
[41] FreshLLMs/FreshQA — https://aclanthology.org/2024.findings-acl.XXX (freshness eval)
[42] Self‑RAG — https://openreview.net/ (search “Self‑RAG”), https://huggingface.co/papers/2307.03659

---

## 부록 A — Agentic-4 강화 요약(업데이트)

- **메인 채팅 = Playbook Runner(Responses 기반)**: 질의응답이 아니라 절차 실행 엔진. 스트리밍·중간계획·하트비트·완료 알림/증거 요약 카드가 기본 UX. [43][44][45]
- **Memory-5(SSOT 계약)**: facts/events/tasks/decisions/anchors 5계층. 하이브리드 검색(키워드+임베딩)·회상 API·승격/하프라이프 규칙을 표준화. (Self-RAG 등 옵션) [45]
- **SSV(의미 시각+앵커 계약)**: “노드=앵커” 단일 클릭 → 문서/보드/코드 오픈(Obsidian 패턴), 실행 결과 역기록(append-only).
- **도구·관측·평가**: MCP 커넥터(권한 최소/버전 고정/감사로그), OTel GenAI 스팬·메트릭 표준 + LangSmith/Phoenix로 관찰·평가 관로 확보. [50][51][52][54][55][71][72]

> 운영 AC 스니펫(요지)
> - TTFT≤3s, 하트비트 8–15s, 타임박스 Short≤60s / Medium≤5m / Long≤15m
> - OTel 스팬: `pb.intent/plan/tool.call/validate/summarize` + 핵심 속성(run_id, playbook, step, latency_ms, tokens, cost, success, safe_mode)
> - Evidence는 append-only, 고위험 액션은 HUMAN_APPROVAL

---

## 부록 B — 벤더 에이전트 생태계 요약(레퍼런스)

- **OpenAI**: Responses API 하나로 스트리밍·도구 호출(웹/파일/컴퓨터)·구조화 출력을 묶고, SDK로 툴 통합/Agents 구성. [43][44][45][47][48][49]
- **Anthropic(Claude)**: “Building effective agents” 가이드, **Tool Use/Artifacts** 문서로 현실적 워크플로우 제시. [75][76][77]
- **Google(Gemini)**: Live/Streams·Agents 문서로 실시간 상호작용·스트리밍 응답·에이전트 패턴 안내. [78][79][80]

> 결론: 로드맵의 Playbook Runner/Deep-Work UX/Observability 방향은 3사 문서와 정합. (장기적으로 MCP+OTel 표준으로 상호운용성 확보)

---

## 부록 C — 성공사례·벤치마크(지표 설계 힌트)

- **SWE-bench / Verified**: 코드 수정형 에이전트의 실사용 난이도/성공률 기준. [64][65]
- **WebArena / VisualWebArena**: 웹 상호작용형 에이전트 벤치마크(탐색·도구 사용·장애물 대응). [66][67]
- **AgentBench**: 다영역 과업(추론·웹·코딩) 에이전트의 포괄적 평가. [68]
- **GAIA**: 일반형 어시스턴트 문제 해결 벤치마크. [69]
- **OSWorld**: 실제 OS 상호작용 과업군. [70]

> 로드맵 BT-15(관측/평가)에서 “성공률/재시도/인용률/비용·지연” 최소 위젯과 함께, 위 벤치마크 중 1–2개를 **회귀세트**로 채택 권장.

---

## 부록 D — 프레임워크/구현 가이드

- **LangGraph / CrewAI / AutoGen / DSPy**: 플레이북/도구 오케스트레이션/다중-에이전트/프롬프트-by-최적화 레퍼런스. [60][61][62][63]
- **OTel GenAI 스팬·메트릭**: 표준 스팬 네이밍/속성·에이전트 스팬 확장안. [50][51][12search5][12search7][12search12]
- **OpenInference(Phoenix)**: OpenTelemetry 호환 오픈 표준/도구. [54][55]
- **3D UI 수칙**: 3d-force-graph(d3-force-3d) + three.js, **import map 단일화/버전 핀**, 충돌 금지. [56][57][58][59][40]

---

## 부록 E — 화이트리스트(링크 모음)

**OpenAI**
[43] https://platform.openai.com/docs/api-reference/responses
[44] https://platform.openai.com/docs/guides/streaming-responses
[45] https://platform.openai.com/docs/guides/tools-web-search
[46] https://platform.openai.com/docs/api-reference/files
[47] https://platform.openai.com/docs/guides/tools-computer-use
[48] https://platform.openai.com/docs/models/computer-use-preview
[49] https://openai.github.io/openai-agents-python/tools/

**Observability/Evals**
[50] https://opentelemetry.io/docs/specs/semconv/gen-ai/gen-ai-spans/
[51] https://opentelemetry.io/docs/specs/semconv/general/metrics/
[52] https://docs.smith.langchain.com/
[53] https://www.langchain.com/langsmith
[54] https://arize.com/docs/phoenix
[55] https://github.com/Arize-ai/openinference
[81] https://blog.langchain.dev/otel/

**3D/UI·웹 런타임**
[56] https://www.npmjs.com/package/3d-force-graph
[57] https://vasturiano.github.io/3d-force-graph/
[58] https://threejs.org/manual/
[59] https://developer.mozilla.org/en-US/docs/Web/HTML/Element/script/type/importmap
[40] https://github.com/vasturiano/3d-force-graph

**에이전트 프레임워크**
[60] https://langchain-ai.github.io/langgraph/
[61] https://docs.crewai.com/
[62] https://github.com/microsoft/autogen
[63] https://dspy.ai/

**벤치마크/연구**
[64] https://www.vals.ai/blog/swe-bench-verified
[65] https://www.swebench.com/
[66] https://arxiv.org/abs/2307.13854
[67] https://github.com/web-arena-x/visualwebarena
[68] https://arxiv.org/abs/2308.03688
[69] https://ar5iv.org/html/2311.12983
[70] https://openai.com/research/osworld

**MCP(상호운용/거버넌스)**
[71] https://modelcontextprotocol.io/
[72] https://platform.openai.com/docs/mcp

**Anthropic / Google**
[75] https://www.anthropic.com/research/building-effective-agents
[76] https://docs.anthropic.com/en/docs/build-with-claude/tool-use
[77] https://docs.anthropic.com/en/docs/build-with-claude/artifacts
[78] https://ai.google.dev/gemini-api/docs/streams/streaming-response?hl=en
[79] https://cloud.google.com/vertex-ai/generative-ai/docs/multimodality/model-inference?hl=en
[80] https://blog.google/technology/ai/google-gemini-live/
