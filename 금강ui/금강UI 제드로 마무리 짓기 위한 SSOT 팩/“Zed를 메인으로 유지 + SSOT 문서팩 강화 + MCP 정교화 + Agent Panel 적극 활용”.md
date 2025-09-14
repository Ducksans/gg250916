- `docs/SSOT/00_project_contract.md` (목표/불변식/합격기준)
    
- `docs/SSOT/10_agent_rules.md` (행동 규칙·허용 명령·중단 트리거)
    
- `tickets/issue_template.md` (25분 타임박스 이슈폼)
-

# (A) 한눈 개요 — “Zed 메인 + 가드레일 + 금강 MCP”


[SSOT(단일진실) 고정] ──▶  [Zed 메인 편집] ──▶ [Agent Panel 승인형 실행]
   │                          │                       │
   │ (목표/불변식/AC/규칙)     │ (A→B→C 본선만)        │ (/file, /diagnostics, /terminal)
   │                          │                       │
   └──────▶ [금강 MCP(툴서버)] ◀──────────────────────┘
                │
      (status_report, apply_structure_fixes,
       ingest_chat_ui_log 등 금강 전용 툴)


- **원칙:** 기능 작업은 항상 **A→B→C 본선**에서만 진행. 디버깅·리팩터는 **타임박스(예: 25분)** 넘기면 **즉시 티켓화 후 보류** → 본선 계속.
    
- **컨텍스트:** Zed에 **SSOT 문서 2~3개**와 **최근 커밋/로그**를 _상시 고정_(@rule, @file).
    
- **실행:** Agent Panel에서 **허용 명령(allow-list)**만 실행. 금강 **MCP**로 상태·수정·인게스트를 **툴 호출**로 안전하게 연결.

# (B) 실행 전략과 순서 (복붙·체크리스트)

## 0) 준비 (브랜치 + 폴더)

- 브랜치: `feat/guardrails-ssot-mcp`
    
- 폴더:
    
    `docs/SSOT/   00_project_contract.md   # 목표/불변식/합격기준(AC)   10_agent_rules.md        # 행동 규칙/허용명령/중단트리거 tickets/   issue_template.md        # 25분 타임박스용`
    

### 00_project_contract.md (요지 템플릿)

`# 금강UI 프로젝트 컨트랙트 목표: 프론트(Tauri/Next) + 백엔드(FastAPI) 안정화, 컨텐츠 자동화 파이프라인 상시가동 불변식: - ChatGPT형 스트림 UX, 상태카드, 메모리 시각화 유지 - /status_report → /apply_structure_fixes 루프 보존 - 한국어 라벨/경로 컨벤션 준수 합격기준(AC): - 빌드·런 1회 패스(README 기준) - e2e 스모크 3건 중 2건↑ 통과 - CI 스모크 그린 드리프트 방지: - 디버깅/리팩터 25분 초과 시 중단→ tickets/ 로 이슈화 → 본선 복귀`

### 10_agent_rules.md (요지 템플릿)

`- 변경 전 반드시: [이유][대안][리스크][롤백] 4줄 요약 - 상시컨텍스트: 00_contract, README, 최근 커밋/빌드로그 - 중단트리거: 빌드/테스트 연속 실패 2회 or 종속성 대규모 변경 필요 - 허용명령(allow-list):   { npm ci, pnpm dev, uvicorn main:app --reload, pytest -q, playwright test } - 금지: rm -rf, 시스템설정 변경, 비허용 네트워크 호출`

### tickets/issue_template.md

`[원인/증상] (로그 요약 5줄) [가설] (유력 원인 1~2) [실험] (바꿀 점 1~2 + 예상 결과) [롤백] (되돌릴 커밋/명령) [타임박스] 25분`

---

## 1) Zed 세팅 (컨텍스트 고정 + 실행 가드)

1. **Rules**에 `00_project_contract.md`, `10_agent_rules.md`를 등록.
    
2. **Agent Panel** 기본 스레드에 아래 “앵커 메시지”를 올리고 핀 고정:
    
    `[세션앵커] - 오늘 목표/AC: - 현재 브랜치: - 허용명령: npm ci / pnpm dev / uvicorn ... / pytest -q - 중단트리거: 25분/실패 2회 → 티켓화 - 참고: 최근 커밋 로그 및 마지막 빌드 로그 첨부`
    
3. **터미널 실행은 Agent Panel**에서만, 그리고 **허용명령만** 승인.
    

---

## 2) 금강 MCP(툴서버) “얇게” 붙이기

> 목표: Agent가 **코드를 마구 바꾸지 않고**, 금강 백엔드 기능을 **도구 호출**로 쓰게 하기.

- **툴(예):**
    
    - `status_report()` → 금강 상태/기억 요약 JSON 반환
        
    - `apply_structure_fixes(dry_run: bool)` → 구조 개선 실행/미리보기
        
    - `ingest_chat_ui_log(session_id)` → 대화로그 인게스트
        
- **리소스(읽기전용):** `structure_report.json`, `roadmap.json`
    

### 예시: 간단한 MCP 서버 스켈레톤 (Python; 경로는 프로젝트에 맞게)

`# gumgang_mcp_server.py import json, subprocess from typing import Any, Dict from fastapi import FastAPI app = FastAPI()  @app.get("/tools/status_report") def status_report():     # 실제 금강 백엔드 호출로 대체     return {"ok": True, "version": "0.8", "components": ["roadmap","structure_report"]}  @app.post("/tools/apply_structure_fixes") def apply_structure_fixes(dry_run: bool = True):     # ex) subprocess.run(["python","scripts/structure_fix_applier.py","--dry-run"])     return {"ok": True, "dry_run": dry_run, "changes": []}`

> Zed/MCP 연결은 **“커맨드 + args”**로 이 서버를 띄우거나 이미 떠있는 주소에 붙이시면 됩니다. (로컬 포트 고정 권장)

---

## 3) “작업 루프” 운용 규칙 (A→B→C 유지)

1. **A(기능)** 시작 전: 세션앵커 업데이트(목표/AC/허용명령).
    
2. 설계 요약 4줄 **(이유/대안/리스크/롤백)** → **작은 PR 단위**로 진행.
    
3. 빌드·테스트 실패 시 **한 번 재시도** → 또 실패면 **즉시 티켓화**하고 **B로 복귀**.
    
4. 하루 끝: 머지 요약(무엇이 달성/무엇이 보류/티켓 목록).
    

---

## 4) 오늘~모레(2–3일) 적용 순서

**Day 0 (오늘 오전)**

- SSOT 3종 작성 → 커밋.
    
- Zed Rules·Agent Panel 세팅(앵커 메시지 핀).
    
- 허용명령 리스트 합의.
    
- **작은 기능 A-1**을 이 프로세스로 한번 끝까지 밀어보기.
    

**Day 1**

- **MCP 스텁** 가동(로컬 포트) → Agent Panel에서 `/tools/status_report` 호출 테스트.
    
- **디버깅 1건**을 MCP+허용명령 조합으로 해결(25분 타임박스 엄수).
    
- 티켓화 흐름이 실제로 잘 동작하는지 확인.
    

**Day 2**

- **리팩터 1건**을 “4줄요약→소PR”로 처리.
    
- e2e 스모크 2개 통과 목표.
    
- 하루 말미에 **회고**: 타임박스 위반/드리프트 사례 점검→ 규칙 보강.
    

---

## 5) 최종 점검 체크리스트

-  SSOT 문서 3종이 리포지토리에 존재, Rules에 연결됨
    
-  Agent Panel 기본 스레드에 “세션앵커” 핀 고정
    
-  허용명령(allow-list) 합의 및 적용
    
-  MCP 스텁에서 최소 1개 툴(status_report) 호출 성공
    
-  A→B→C 본선에서 티켓화가 실제로 작동(25분 타임박스)
    
-  “4줄 요약”이 모든 변경에 기록됨
    

---