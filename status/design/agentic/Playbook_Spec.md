# Playbook Spec — v0 Scaffold (자리표시자)

Status: Draft scaffold (빈 골격). 이 문서는 로드맵 AC(수용 기준) 링크를 만족하기 위한 최소 자리표시자입니다. 세부 규격·예시는 후속 커밋에서 채움.

목적
- 메인 채팅을 “Playbook Runner(절차 실행 엔진)”로 격상하기 위한 최소 인터페이스와 운영 규칙의 뼈대 제공
- BT-14A DONE/AC에서 요구하는 Kernel API, 사고전략 슬롯, Deep-Work UX, 가드레일, Observability, Evidence 스키마의 기준점 정의

범위(Scope)
- 포함: 최소 타입/함수 시그니처, UX 규정, 안전 가드, 증거/관측 규격의 제목/자리표시자
- 제외: 구체 구현, 모델·키·벤더 상세, 실제 플레이북 예시

비범위(Non‑Goals)
- 이 버전은 “문서 링크가 열리도록” 하는 자리표시자이며, 규격의 구속력은 다음 버전에서 확정

---

## 1) Kernel API (자리표시자)

```ts
type StepKind = 'assert' | 'action' | 'ask';

type StepResult = {
  ok: boolean;
  log: string;          // human-readable summary (redacted)
  evidence?: any;       // append-only payload (see Evidence schema)
};

type Step = {
  id: string;
  title: string;
  kind: StepKind;
  timeout?: number;     // ms
  retries?: number;     // >=0
  run: (ctx: any) => Promise<StepResult>;
};

type Report = {
  run_id: string;
  playbook: string;
  started_at: string;   // ISO8601Z
  finished_at?: string; // ISO8601Z
  steps: Array<{
    id: string;
    started_at: string;
    finished_at: string;
    result: StepResult;
  }>;
  stats?: Record<string, number>;
};

declare function registerPlaybook(name: string, steps: Step[]): void;
declare function runPlaybook(name: string, ctx: any): Promise<Report>;
declare function emitEvidence(report: any): Promise<void>; // append-only to SSOT
```

TODO(채움 예정)
- ctx 구조(요청·권한·모드·툴핸들)
- 에러 모델/재시도 백오프
- id 규칙(run_id/step_id/hash 연동)

---

## 2) 사고전략 슬롯(Reasoning Strategy Slots)

목표: 문제 유형에 따라 교체 가능한 사고전략을 슬롯으로 로딩
- 표준 슬롯: ReAct / Tree‑of‑Thought / Reflexion / Graph‑of‑Thought
- 선택 로직(초안): 기본 ReAct, 탐색형 ToT/GoT, 재시도/자기교정 Reflexion (플레이북 메타 힌트 기반)
- 후처리: 증거 인용 검증 실패 시 재탐색 플랜 자동 생성

TODO
- 각 전략 별 최소 훅(계획/평가/재시도)에 대한 인터페이스 정의
- 전략 혼합/연쇄 실행 정책

---

## 3) Deep‑Work UX 규정

- 하트비트: 8–15초 간격으로 현재 단계(계획·증거수집·도구호출·검증·요약) 라벨 스트리밍
- 타임박스: Short ≤ 60s / Medium ≤ 5m / Long ≤ 15m (프로젝트 단위로 조정 가능)
- 완료 알림: 종결 시 알림음 + “실행 로그/증거 링크/비용·지연” 요약 카드
- 내부 추론 원문은 저장하지 않고 요약‑로그만 보존(프라이버시·보안)

TODO
- 하트비트 이벤트 포맷
- 요약 카드 JSON 스키마

---

## 4) 안전·가드레일(SAFE/NORMAL/AUTHOR, HUMAN_APPROVAL)

- SAFE: assert 단계만 실행(읽기 전용·시뮬레이션); 외부부작용 금지
- NORMAL: action 허용(타임아웃/재시도/레이트리밋 필수), 고위험 액션은 HUMAN_APPROVAL 필요
- AUTHOR: 개발자 모드(기본 비활성); 프로젝트 정책에 따라 제한적 사용
- HUMAN_APPROVAL: 쓰기/삭제/결제/배포 등은 승인 전 제안만 가능(승인 후 실행)

TODO
- 위험 액션 카테고리 목록과 승인 다이얼로그 스펙
- 레이트리밋/쿨다운 파라미터

---

## 5) Evidence 스키마(append‑only)

원칙: SSOT(체크포인트 원장)와 호환, 해시/앵커/PII/비용 지표 포함

```json
{
  "schema": "playbook.evidence.v1",
  "id": "EV_YYYYMMDD_HHMMSSZ_xxx",
  "run_id": "72H_YYYYMMDD_HHMMZ",
  "playbook": "name",
  "step_id": "step-001",
  "ts": "2025-01-01T00:00:00Z",
  "ok": true,
  "anchors": ["path/to/file#L10-20"],
  "artifacts": [{"type":"log","path":"..."},{"type":"json","path":"..."}],
  "metrics": {"latency_ms":1234,"tokens":456,"cost_usd":0.0012},
  "pii": {"present": false, "redaction": []},
  "hash": {"algo":"sha256","value":"..."}
}
```

TODO
- 앵커 규칙(path/hash/line range)
- PII redaction 정책과 감사로그 연계

---

## 6) Observability(OTel GenAI 세만틱, Evals)

- Span names(초안): pb.intent, pb.plan, pb.tool.call, pb.validate, pb.summarize
- 필수 속성: run_id, playbook, step, tool.name, latency_ms, tokens, cost, success, safe_mode
- 수집: LangSmith OTel, Phoenix(OpenInference) 병렬 인제스트
- KPI: 성공률, 실패 타입 Top‑N, 비용/지연 추이, 증거 인용률

TODO
- 스팬/메트릭 필드 키 표준(키·단위)
- 헬스 대시보드 위젯 구성

---

## 7) 툴 호출 가이드(자리표시자)

- 파일검색/웹검색/컴퓨터사용 등은 Responses API/커넥터로 통합
- 화이트리스트·버전 고정·권한 최소화
- 툴 호출 요청/응답 전문 스냅샷을 Evidence로 연결

TODO
- 툴별 파라미터 스키마(요약형)
- 실패 리커버리(재시도·대안 전략) 룰

---

## 8) UX 이벤트/상태(초안 키)

- ui.heartbeat: { step, eta_hint, safe_mode }
- ui.phase: { from, to, ts }
- ui.done: { ok, summary_card_ref, costs }
- ui.approval.required: { action, reason, scope }

---

## 9) 수용 기준(AC) 체크리스트(링크용)

- Kernel API 타입/함수 존재
- 전략 슬롯(ReAct/ToT/Reflexion/GoT) 선언
- Deep‑Work UX(하트비트·타임박스·완료 알림) 명시
- SAFE/NORMAL 가드 + HUMAN_APPROVAL 규칙 표기
- Evidence 스키마(v1) 필드 정의
- OTel 스팬/속성 목록 명시, Evals 수집 경로 표기

---

## 10) Open Questions

- 전략 자동선택 휴리스틱의 최소 신뢰도 기준?
- 내부 추론 요약의 보존 기간/민감도 레벨?
- 실패 사례의 자동 카드화·리커버리 템플릿 범위?

---

개정 이력
- v0 (scaffold): 문서 자리표시자 생성 — Kernel/UX/가드/Evidence/OTel 섹션의 제목과 TODO만 배치
