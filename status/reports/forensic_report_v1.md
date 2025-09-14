# 금강UI 포렌식 v2.0 (아키텍처 분석 완료)

- **작성자:** Gemini
- **날짜:** 2025-09-10 (Asia/Seoul)
- **버전:** v2.0 (심층 분석을 통해 시스템 아키텍처를 새로 정의)

## 1. 요약(최대 5줄)

- **현 상태:** 모놀리식 구조의 핵심 UI(`ui/snapshots`)가 분산된 백엔드(`app` + `gumgang_0_5`)와 상호작용하며 **현재 정상 동작하는 하이브리드 시스템.** 주 개발(`ui/dev_a1_vite`)은 이 모놀리식 UI를 점진적으로 현대적인 컴포넌트로 **리팩토링**하는 과정.
- **핵심 아키텍처:** 모든 작업의 무결성은 **Append-Only 체크포인트 시스템(`CKPT_JSONL`)**과 **벡터 기반 메모리 API**를 통해 보장됨. 이는 모든 주요 결정이 위변조 불가능한 '증거'에 기반하여 기록됨을 의미.
- **최우선 과제:** 데이터 소실로 유실된 `ui/snapshots`의 **'기억 엔진'(`sendChat` 함수)**을 `ui/dev_a1_vite`의 `A1Dev.jsx` 컴포넌트에 이식하는 것. 드리프트 방지, 증거 기반 추론, 자동 기록 기능의 복원이 선행되어야 함.

## 2. '기억과 기록' 시스템 아키텍처

금강 프로젝트의 핵심은 단순한 UI나 백엔드가 아닌, 작업의 맥락을 보존하는 '기억과 기록' 시스템에 있다. 전체 흐름은 아래와 같다.

**데이터 흐름도:**
`사용자 입력 (A1 Chat)` → `sendChat() JS 함수 (in index.html)`
1.  **가드레일/센서:** `preSendGuard()`로 AI 드리프트 방지, `isEOD()`로 체크포인트 트리거 감지.
2.  **기억 회상 (Recall):** 백엔드 `POST /api/memory/search` 호출 → 과거 작업 내용 '증거'로 확보.
3.  **엄격 게이트 (Strict Gate):** 확보된 **증거가 없으면 LLM 호출을 원천 차단**하여 환각 방지.
4.  **증거 기반 추론:** `POST /api/chat` 호출 시, 확보된 '증거'를 프롬프트에 주입하여 사실 기반 답변 유도.
5.  **기록 (Record):** 모든 대화와 '증거' 사용 내역을 `POST /api/threads/append`, `POST /api/memory/store`로 영구 기록.
6.  **체크포인트 (Immutability):** `triggerEOD()` 등 특정 조건 발생 시 `POST /api/checkpoints/append` 호출 → 작업 상태를 SHA256 해시와 함께 불변 로그(`CKPT_JSONL`)에 추가.

**핵심 컴포넌트:**

| 컴포넌트 | 경로 | 역할 |
| :--- | :--- | :--- |
| **UI 상호작용 허브** | `ui/snapshots/.../index.html` (`sendChat` 함수) | 사용자 입력부터 API 호출까지 전체 '기억과 기록' 흐름을 조율하는 오케스트레이터. |
| **체크포인트 뷰어** | `ui/proto/atlas_A6/checkpoints.html` | 불변 로그를 **읽기 전용(Read-Only)**으로 시각화. `/api/checkpoints/*` API로 데이터 조회. |
| **API 게이트웨이** | `app/api.py` | 체크포인트, 회의록 등 핵심 API 엔드포인트를 정의하는 주 FastAPI 애플리케이션. |
| **채팅/기억 로직** | `gumgang_0_5/backend/app/...` | `app/api.py`에 의해 임포트되어 채팅, 벡터 검색 등 핵심 AI 로직을 처리. |
| **불변 로그 (SSOT)** | `status/checkpoints/CKPT_72H_RUN.jsonl` | 모든 주요 결정을 기록하는 최종 진실 공급원(Single Source of Truth). Append-only. |

## 3. 레포 맵(최대 3 depth)

- **트리 요약:**

```
.
├── app/                  # FastAPI 백엔드 1 (체크포인트, 회의)
├── bridge/               # 브릿지 서버 (Node.js, 파일 I/O)
├── docs/                 # 불변 원칙 SSOT 문서
├── gumgang_0_5/
│   └── backend/          # FastAPI 백엔드 2 (채팅, 기억) - [Active]
├── scripts/              # 실행 스크립트
├── status/               # 체크포인트, 로드맵 등 동적 문서
├── ui/
│   ├── dev_a1_vite/      # [Active] 프론트엔드 리팩토링 기지
│   └── snapshots/        # [Active] 현재 동작하는 핵심 UI - [DO NOT ARCHIVE]
└── .rules                # [Active] 프로젝트 운영 규칙
```

## 4. 엔트리/명령 확정(근거 필수)

| 대상 | 명령 | 포트/프록시 | 근거(경로:라인) | 확인 절차 | 롤백 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **통합(권장)** | `RELOAD=1 ./scripts/dev_all.sh tmux` | 8000, 3037, 5173 | `README.md:103` | `curl`로 각 포트 health check | `tmux kill-session` |
| **Backend** | `./scripts/dev_backend.sh run` | 8000 | `scripts/dev_backend.sh:160` | `curl http://127.0.0.1:8000/api/health` | `pkill uvicorn` |
| **Bridge** | `node bridge/server.js` | 3037 | `README.md:146` | `curl http://127.0.0.1:3037/api/health` | `pkill node` |
| **Frontend** | `npm run dev` | **포트**: `5173`<br>**프록시**:<br>`/api`→`8000`<br>`/bridge`→`3037` | `ui/dev_a1_vite/vite.config.ts:38-54` | 브라우저 `http://localhost:5173/ui-dev/`접속 | `Ctrl+C` |

## 5. 종속성·환경 리스크(채점표)

| 이슈 | 원인 | 영향 | 해결책 | risk | impact | effort | 근거 |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **백엔드 아키텍처 복잡성** | **하이브리드 구조**: `app`(회의/관리)와 `gumgang_0_5`(채팅/AI) 두 모듈이 결합됨. | 단일 진입점 부재로 인한 혼란, 모듈 간 잠재적 충돌. | 두 모듈의 역할을 명확히 문서화하고 API 계약 정의. | 4 | 5 | 3 | `app/api.py`, `ls -lR gumgang_0_5/backend/app` |
| **브릿지 보안 의존성** | 파일 I/O가 브릿지의 `FS_ALLOWLIST` 등 `.env` 설정에 강하게 의존. | 잘못된 `.env` 설정이 파일 접근 오류나 보안 취약점으로 이어질 수 있음. | `.env.example` 파일을 생성하여 필수 환경 변수를 명시. | 4 | 4 | 2 | `bridge/server.js:125-144` |
| **백엔드 종속성 이중화** | `requirements.txt`와 `dev_backend.sh` 내 `DEPS` 배열이 분리됨. | 환경 불일치, 배포 시 누락 위험. | `dev_backend.sh`가 `requirements.txt`를 읽도록 수정. | 5 | 4 | 2 | `scripts/dev_backend.sh:50-57` |
| **Node 버전 요구사항** | 루트 `package.json`과 `dev_a1_vite`의 `engines` 필드가 없음. | 개발 환경 간 비호환성 문제 발생 가능. | `engines` 필드를 `package.json`에 명시. | 3 | 3 | 1 | `ui/dev_a1_vite/package.json:1-21` |

## 6. 드리프트/중복 지도 (Active/Archive)

| path | status | reason | risk | impact |
| :--- | :--- | :--- | :--- | :--- |
| `ui/dev_a1_vite/` | **Active (리팩토링 기지)** | `snapshots`의 기능을 점진적으로 대체할 현대적 컴포넌트 기반 프론트엔드. | 1 | 5 |
| `ui/snapshots/` | **Active (핵심 UI)** | **현재 동작하는 메인 UI.** 모든 핵심 기능의 '진실 원천'이자 리팩토링의 기준점. **절대 아카이브 불가.** | 5 | 5 |
| `gumgang_0_5/` | **Active (핵심 로직)** | 메인 백엔드(`app`)가 직접 임포트하여 사용하는 채팅/기억 API의 실제 구현부. **절대 아카이브 불가.** | 5 | 5 |
| `LibreChat/` | **Archive Candidate** | 프로젝트와 직접적인 의존성이 없는 독립 외부 애플리케이션. | 1 | 1 |
| `obsidian_vault/` | **Archive Candidate** | 프로젝트와 직접적인 의존성이 없는 독립 문서 저장소. | 1 | 1 |

## 7. 격차 분석 및 복구 전략

| 기능 | 모놀리식 구현 (`snapshots`) | 대상 컴포넌트 (`dev_a1_vite`) | 전략 |
| :--- | :--- | :--- | :--- |
| **A1-채팅 (증거 엔진)** | `index.html`의 `sendChat()` 함수가 전체 RAG 파이프라인 로직을 포함. | `chatStore.ts`, `A1Dev.jsx` | `sendChat`의 핵심 로직(Recall→Gate→Reason→Record)을 `chatStore.ts` (Zustand) 상태 머신으로 재구현하고 React 컴포넌트에 연결. **'엄격 게이트'** 최우선 복원. |
| **A6-Atlas (체크포인트)** | `<iframe>`이 `checkpoints.html`을 로드, 해당 파일이 API 호출/렌더링. | `AtlasViewer.jsx` (신규) | `<iframe>` 의존성 제거. `/api/checkpoints/*` 엔드포인트를 직접 호출하여 데이터를 렌더링하는 React 컴포넌트 신규 개발. |
| **A6-Atlas (SSV/3D)** | `<iframe>`이 `3d_local.html`, `ssv_summary.html` 등을 로드. | `SSVViewer.jsx` (신규) | `<iframe>`의 데이터 소스(API 또는 정적 JSON)를 분석하여, `react-three-fiber` 등 라이브러리를 사용해 3D 그래프를 렌더링하는 컴포넌트 신규 개발. |

### 7.1. 이상(`UI_RESTORE_SSOT.md`) vs 현실(`A1Dev.jsx`)

Git 롤백으로 인한 데이터 소실 이후, `ui/dev_a1_vite`는 상당 부분 복구되었으나 핵심 기능들이 누락된 상태이다.

| 기능 분류 | 이상적인 상태 (`UI_RESTORE_SSOT.md` 기반) | 현재 상태 (`A1Dev.jsx` 분석 기반) | 격차 및 복구 전략 (재확인) |
| :--- | :--- | :--- | :--- |
| **'기억과 기록' 엔진** | `sendChat` 함수 내에 **증거 기반 RAG 파이프라인**이 완벽히 구현되어야 함. (드리프트 방지, 기억 회상, 엄격 게이트, 자동 기록, 체크포인트 트리거) | 현재 `send` 함수는 단순 LLM 호출 기능만 수행. **'기억과 기록'과 관련된 모든 핵심 로직이 부재.** | **[1단계: 기억 엔진 이식]** `snapshots/index.html`의 `sendChat` 로직을 `A1Dev.jsx`의 `send` 함수와 `chatStore.ts`에 완벽하게 재구현하는 것이 **최우선 과제.** |
| **Command Center (우측 패널)** | Planner, Insights, Executor 등 모든 패널이 백엔드와 연동되어 실제 데이터를 표시해야 함. | 패널들의 UI 골격(스켈레톤)만 존재하며, 내부는 비어있음. API 연동 로직 부재. | **[3단계: 패널 기능 구현]** 각 패널에 해당하는 API를 연동하여 실제 데이터를 렌더링. (예: Insights 패널에 `/api/health` 데이터 표시) |
| **A6 Atlas (과거 탐색)** | 체크포인트, SSV 등 과거의 모든 '사실'을 탐색하는 기능이 완벽히 복원되어야 함. | `dev_a1_vite` 내에 **A6 Atlas 관련 기능이 전무함.** | **[2단계: Atlas 뷰어 개발]** `snapshots`의 `checkpoints.html` 등을 참고하여, 체크포인트 API를 호출하는 `AtlasViewer.jsx` 컴포넌트를 신규 개발하고 Command Center에 통합. |

### 7.2. 코드 품질 및 리팩토링 원칙

'A&A 프로토콜' 수행 중, 아래 기준에 부합하는 파일은 주석에 **[리팩토링 후보]** 로 명시하여 점진적인 개선을 유도한다. 이는 `snapshots/index.html`과 같은 초거대 파일의 생성을 원천적으로 방지하기 위함이다.

- **길이 기준:** 파일의 총 코드 라인이 약 250~300줄을 초과하는 경우.
- **책임 기준:** UI 렌더링, 상태 관리, API 호출 등 여러 개의 다른 책임을 하나의 파일이 모두 수행하여 **'단일 책임 원칙(Single Responsibility Principle)'**을 명백히 위배하는 경우.

## 8. 실행 계획(오늘·3일·7일)

| 기간 | 할 일 | AC(관찰 가능한 합격조건) | 예상 리스크 | 롤백 |
| :--- | :--- | :--- | :--- | :--- |
| **오늘** | 1. `package.json`에 `dev_all` 통합 스크립트 추가 (25분) | `npm run dev` 실행 시 모든 서버 정상 구동 | 포트 충돌 | `git restore package.json` |
| | 2. `_archive` 폴더 생성 및 아카이브 후보(**`LibreChat`**, **`obsidian_vault`**)에 알림 파일(**`_ARCHIVE_CANDIDATE_NOTICE.txt`**) 추가 (25분) | 각 폴더에 알림 파일 생성 확인. **(주의: 이동은 아직 하지 않음)** | 권한 문제 | `rm` |
| | 3. 이 보고서(`forensic_report_v1.md`)를 v2.0으로 최종 업데이트하여 프로젝트 SSOT로 확립. | 팀원(인간/AI)이 이 문서를 기준으로 아키텍처를 이해. | 내용 누락 | `git restore` |
| **3일** | 백엔드 종속성 관리 단일화 (`dev_backend.sh` 수정) | `requirements.txt` 수정 시 `install` 명령에 반영됨 | 버전 충돌 | `git restore scripts/dev_backend.sh` |
| | `pre-commit` 및 `ESLint` 설정 파일 추가 및 `npm install` | `git commit` 시 훅 자동 실행, `lint` 명령 성공 | 기존 코드 대량 수정 필요 | 설정 파일 삭제 및 `git restore` |
| **7일** | GitHub Actions CI 워크플로우(`check.yml`) 추가 | PR 생성 시 빌드/린트 자동 실행 및 결과 보고 | API 키 등 secret 관리 | `.github/workflows` 폴더 삭제 |