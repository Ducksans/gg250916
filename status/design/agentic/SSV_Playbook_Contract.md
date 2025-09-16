---
phase: past
---

# SSV ↔ Playbook Contract — v0 Scaffold (자리표시자)

Status: Draft scaffold (빈 골격). 이 문서는 로드맵 AC(수용 기준) 링크를 만족하기 위한 최소 자리표시자입니다. 세부 규격·예시는 후속 커밋에서 채움.

목적
- Atlas(SSV: Semantic Structure Viewer)의 “의미 노드”와 Playbook Runner의 “실행 결과(Evidence/Anchors/Metrics)”를 왕복 연결하는 최소 계약을 정의
- BT‑14B DONE/AC에서 요구하는 “단일 클릭 오픈(Obsidian 패턴)”·앵커 스키마·증거 역기록 규칙을 문서화
- SAFE/NORMAL 모드, HUMAN_APPROVAL, Observability(OTel)와의 정합 보장

범위(Scope)
- 포함: 노드 오버레이 스키마, 앵커/오픈 액션 규격, 클릭 UX, 증거 역기록, API 표면(자리표시자), 관측·보안 규칙, AC 체크리스트
- 제외: 구체 구현(렌더러/라우터), 백엔드 영속 로직, 모델/키

비범위(Non‑Goals)
- 본 버전은 “문서 링크가 열리도록” 하는 자리표시자이며, 스키마 필드의 강제성·검증 규칙은 다음 버전에서 확정

---

## 1) 계약 개요(Overview)

- Node ↔ Anchor: SSV의 각 노드는 “앵커(파일/URL/코드 라인 범위)”를 최소 1개 이상 보유
- Open Action: 노드 단일 클릭 → `open_action`에 따라 문서/보드/코드/URL을 즉시 오픈(새 탭/미리보기 제스처 포함)
- Evidence Back‑link: Playbook 실행 결과의 증거/지표를 해당 노드의 `evidence[]/metrics[]`에 append‑only로 역기록
- Modes: SAFE(읽기/검증 중심) / NORMAL(행동 허용; 승인 가드 적용)

---

## 2) Node 오버레이 스키마(SSV 확장 필드)

기존 SiteGraph 노드에 다음 오버레이 필드를 합성(클라이언트/서버 어느 한쪽에서 주입 가능)

```json
{
  "schema": "ssv.node.overlay.v1",
  "id": "gumgang_meeting/path/to/file.md",
  "kind": "file|dir|api|doc|evidence|resource|unknown",
  "roles": ["C","H","A","S","D","UI","R","Q","X","M"],
  "href": "gumgang_meeting/path/to/file.md#L10-40",
  "open_action": "file|url|code|board",
  "evidence": [
    {"type":"log","path":"status/evidence/ops/....log","ts":"2025-08-22T00:00:00Z","hash":"..."}
  ],
  "metrics": {
    "centrality": 0.67,
    "recency": 0.84,
    "last_touched": "2025-08-21T09:00:00Z"
  },
  "flags": {
    "bottleneck": false,
    "pinned": false
  }
}
```

필드 요약
- `href`: 기본 오픈 타깃(파일 경로+라인 범위 또는 URL)
- `open_action`: 오픈 방식(파일 뷰어/URL/코드·보드 전용 핸들러)
- `evidence[]`: Playbook 역기록(append‑only, SSOT 경로 권장)
- `metrics`: 시각 신호(중심성/최근성 등)와 UX 힌트
- `flags`: 고정핀/병목 등 상태 플래그

---

## 3) 앵커(Anchor) 스키마

```json
{
  "schema": "ssv.anchor.v1",
  "id": "ANCH_20250822_000000Z_xxx",
  "href": "gumgang_meeting/app/api.py#L100-140",
  "label": "API: checkpoints tail",
  "open_action": "file",
  "source": {"type":"node","id":"gumgang_meeting/app/api.py"},
  "hash": {"algo":"sha256","value":"..."}
}
```

규칙
- `href`는 `path#Lx-y` 또는 URL 허용
- `open_action` 미지정 시 노드의 기본 값을 상속
- 앵커는 Evidence와 1:N로 링크될 수 있음

---

## 4) 클릭 UX(Obsidian 패턴)

- Click(좌클릭): `href/open_action` 즉시 오픈
- Shift+Click: 앵커 카드(미리보기) 오버레이 표시
- Ctrl/Cmd+Click: 새 탭/분리된 패널로 열기
- 키보드: Enter(오픈), Space(미리보기 토글)
- 접근성: 포커스 순서, ARIA 라벨(`role="link"`, `aria-label="{id or label}"`)
- 실패 처리: 대상 미존재/권한 없음 → 토스트 + “경로 복사” 대안 제공

---

## 5) Playbook → SSV 역기록(append‑only)

Playbook Report의 일부를 해당 노드에 연결

```json
{
  "schema": "ssv.playbook.trace.v1",
  "run_id": "72H_20250822_1549Z",
  "playbook": "refactor-plan",
  "node_id": "gumgang_meeting/app/api.py",
  "anchors": ["gumgang_meeting/app/api.py#L360-460"],
  "evidence": [
    {"type":"json","path":"status/evidence/ops/refactor/plan_20250822.json"},
    {"type":"log","path":"status/evidence/ops/refactor/run_20250822.log"}
  ],
  "metrics": {"latency_ms": 4215, "tokens": 1234, "cost_usd": 0.0035},
  "ts": "2025-08-22T15:49:47Z",
  "hash": {"algo":"sha256","value":"..."}
}
```

원칙
- SSOT(append‑only) 경로를 1급으로 사용
- 해시/타임스탬프 포함(감사 가능성)
- PII_STRICT: 민감 정보는 마스킹/격리 후 링크

---

## 6) API 표면(자리표시자)

UI/서버 간 최소 인터페이스(초안; 실제 경로/메서드는 후속 버전에서 확정)

- `GET /api/ssv/node/:id/anchors` → 앵커 목록/해결
- `POST /api/ssv/node/:id/open` → 오픈 액션(트래킹 목적; 실제 오픈은 클라에서 수행)
- `POST /api/ssv/node/:id/evidence/append` → 역기록(append‑only; SAFE/NORMAL·승인 가드 적용)
- `GET /api/ssv/node/:id/metrics` → 시각 신호값(중심성/최근성/사용도)

요청·응답 공통 필드(초안)
- `run_id`, `safe_mode`, `actor`, `ts`, `hash`, `reason`(선택)

---

## 7) Observability(OTel GenAI 세만틱)

스팬 네이밍(초안)
- `ssv.anchor.resolve`, `ssv.node.open`, `ssv.node.evidence.append`, `ssv.node.metrics.read`

필수 속성
- `run_id`, `node_id`, `anchor_href`, `open_action`, `latency_ms`, `success`, `safe_mode`, `actor`, `cost`(있다면)

대시보드(최소)
- 노드별 클릭/성공률, 실패 유형 Top‑N, 증거 인용률, 비용/지연 추이

---

## 8) 보안·권한·승인(HUMAN_APPROVAL)

- SAFE: `resolve/metrics`만 허용, `evidence.append`는 드라이런
- NORMAL: `evidence.append` 가능(append‑only), 고위험 오픈 액션(쓰기/배포 등)은 HUMAN_APPROVAL 필수
- ACL: 노드/경로 범위 권한(읽기/쓰기/증거추가)
- 비밀/키: 서버 측 주입, 프런트 노출 금지

---

## 9) 수용 기준(AC) 체크리스트(링크용)

- 노드 오버레이 필드(`href/open_action/evidence/metrics`) 정의
- 앵커 스키마 및 오픈 액션 규칙 명시
- 클릭 UX(단일 클릭/미리보기/새 탭/접근성) 규정
- Playbook 역기록(append‑only) 포맷 제시
- API 표면(anchors/open/evidence/metrics) 자리표시자 정의
- OTel 스팬·속성 목록 명시, 대시보드 최소 항목 제시
- SAFE/NORMAL/HUMAN_APPROVAL 가드 문서화

---

## 10) Open Questions

- 다중 앵커를 가진 노드의 기본 `href` 우선순위는?
- 코드 리팩터로 경로/라인 이동 시 앵커 추적 방식(해시/AST/블레임 기준)?
- 증거 링크가 커질 때 요약/압축/카탈로그화 정책?

---

개정 이력
- v0 (scaffold): 노드/앵커/오픈/역기록/관측/가드 섹션의 제목과 자리표시자 예시만 배치

참고(로드맵 각주에 상응)
- 3D 엔진/레이아웃: 3d‑force‑graph, d3‑force‑3d, three.js [16][17][18]
- 모듈/Import Map: MDN [20]
- Observability: OTel GenAI [7][8], LangSmith/Phoenix [9][10][11][12]
- MCP/권한/커넥터: [19][23][24]