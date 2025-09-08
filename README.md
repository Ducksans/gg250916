# Gumgang Meeting — Root README

## A1 Vite Dev (UI 5173) — React + Vite 개발용 미니 앱
- 목적: 3037/ui#a1에서 보던 스냅샷 기반 UI(`ui/snapshots/unified_A1-A4_v0/index.html`)의 과도한 단일 파일 의존을 줄이고, A1만 분리하여 빠르게 개발/검증하기 위함입니다.
- 경로: `ui/dev_a1_vite`
- Dev URL: http://localhost:5173/ui-dev/ (Vite dev 서버, base: `/ui-dev/`)
- 프록시:
  - `/api` → http://127.0.0.1:8000 (FastAPI)
  - `/bridge` → http://127.0.0.1:3037 (Bridge: 정적 UI/파일 오퍼레이션)
- 실행:
  1) `cd ui/dev_a1_vite`
  2) `npm install`
  3) `npm run dev` → 브라우저에서 http://localhost:5173/ui-dev/ 접속
  - 포트 충돌 시: `npm run dev -- --port 5174` (접속: http://localhost:5174/ui-dev/)
- 가드레일(ST-1206) 체크: `npm run guard:ui`
  - Simple 모드에서 전역 스크롤 숨김
  - #a1에는 정확히 2개의 스크롤러만 허용: `#gg-threads`, `#chat-msgs`
  - `#a1-wrap`은 grid이며 rows는 `auto minmax(0,1fr) auto`
  - `#a1-wrap` 높이 = `calc(100dvh - var(--gg-strip-h))`
- 빌드/미리보기:
  - `npm run build` → `dist` 산출물 (base: `/ui-dev/`)
  - `npm run preview` → http://localhost:5173 (build 미리보기)
- 참고:
  - 기존 메인 스냅샷 UI는 여전히 Bridge가 제공합니다: http://localhost:3037/ui/snapshots/unified_A1-A4_v0/index.html
  - monolithic 접근(3037/ui#a1)을 대체/보완하는 개발용 경량 앱입니다.


## ST-1205 — Daily eval & 7-day trend (operator quick guide)

- What this does
  - Daily eval: runs the ST-1205 ON/OFF set and writes a summary JSON per day.
  - 7-day trend: aggregates recent N days (default 7) into a “trend card” JSON.

- One-liners
  - Daily eval (summary path only):  
    bash scripts/run_st1205_eval.sh --quiet
  - Daily eval (plus JSON printed to console):  
    bash scripts/run_st1205_eval.sh
  - 7-day trend (print JSON too):  
    python scripts/make_st1205_trend.py --stdout

- Outputs
  - Daily summary: status/evidence/memory/set_eval/UTC_YYYYMMDD/set_eval_UTC_YYYYMMDD.json
  - Trend card: status/evidence/memory/set_eval/trends/trend_{start}_{end}.json
  - Latest trend alias: status/evidence/memory/set_eval/trends/trend_latest.json

- Set definition (queries/params)
  - status/resources/memory/set_eval_queries.json
  - You can edit queries or k/halflife/fresh_weight/self_rag here, or pass flags to the Python script.

- Cron (daily 09:00 example)
  - crontab -e 에 아래 한 줄 추가(경로는 환경에 맞게 수정)
    0 9 * * * cd /home/duksan/바탕화면/gumgang_meeting && bash scripts/run_st1205_eval.sh --quiet >> status/logs/st1205_eval.cron.log 2>&1
  - 다음날 아침, 로그와 결과 JSON을 확인:
    - status/logs/st1205_eval.cron.log
    - status/evidence/memory/set_eval/오늘날짜/set_eval_오늘날짜.json

- Notes
  - Fresh weighting shows consistent lift; Self‑RAG v0 runs in “safe/conditional” mode to avoid harming baseline.
  - Evidence is append-only; all results/aggregates land under status/evidence/** for auditability.


## 3총사 부팅(Backend/Bridge/Tauri) — 한 번에 실행 & 헬스 체크
- 최초 1회 권한 부여:
  chmod +x scripts/dev_all.sh scripts/dev_backend.sh scripts/preflight.sh
- tmux 모드(권장, 한 화면 2~3패널 동시 모니터링):
  ./scripts/dev_all.sh tmux
  # Tauri 포함하려면
  RUN_TAURI=1 ./scripts/dev_all.sh tmux
  RELOAD=1 ./scripts/dev_all.sh tmux
  
- 백그라운드 모드:
  ./scripts/dev_all.sh stop
  ./scripts/dev_all.sh status
  ./scripts/dev_all.sh stop
- 헬스 체크:
  curl -s http://127.0.0.1:8000/api/health | jq .
  curl -s http://127.0.0.1:3037/api/health | jq .
  - jq 미설치 시: `curl -s http://127.0.0.1:8000/api/health` (또는 3037)
- 로그/요약(백그라운드/ tmux 모두 기록):
  status/evidence/ops/dev_all/<UTC>/{backend.log, bridge.log, summary.json}


전체 끄기(OFF)
- 가장 간단(모든 tmux 세션 종료)
  - tmux kill-server
- 특정 세션만 종료(기본 세션명이 gg_dev)
  - 세션 확인: tmux ls
  - 종료: tmux kill-session -t gg_dev
- 세션 안에 붙어있는 상태에서 바로 종료
  - Prefix(Ctrl+b) → : → kill-session 입력 후 Enter
- 백그라운드 프로세스도 있다면 정리
  - ./scripts/dev_all.sh stop
  - 포트 점유 확인(선택): ./scripts/preflight.sh

다시 켜기(ON)
- 자동 리로드 + 타우리 ON으로 실행
  - RELOAD=1 RUN_TAURI=1 ./scripts/dev_all.sh tmux
- 기본 세션명이 gg_dev입니다. 이미 있으면
  - tmux kill-session -t gg_dev 후 재실행
- 실행 확인(건강 체크)
  - curl -s http://127.0.0.1:8000/api/health
  - curl -s http://127.0.0.1:3037/api/health

자주 쓰는 키/팁
- 세션 분리(detach): Ctrl+b, d
- 다른 pane으로 이동: Ctrl+b, 화살표
- pane 번호 보기: Ctrl+b, q (숫자키로 바로 선택)
- 세션 다시 붙기: tmux attach -t gg_dev

문제 해결 체크리스트
- 포트 충돌 시: ./scripts/dev_all.sh stop → ./scripts/preflight.sh로 8000/3037 점유 확인
- UI가 오래된 파일 서빙 시: Bridge 재시작(위 절차) 후 브라우저 강력 새로고침(Ctrl+Shift+R)

원하시면 “세 개 터미널 창 자동 실행(gnome-terminal/konsole 감지)” 모드도 추가해 tmux 없이 1커맨드로 3창 띄우게 만들 수 있습니다.


  아예 tmux 안 쓰고 개별 터미널로 실행하려면:
      - 백엔드(권장, 리로드/감시 경로 제한 포함):
        RELOAD=1 RELOAD_DIRS="app, gumgang_0_5/backend/app" RELOAD_EXCLUDE=".git/*,node_modules/*,__pycache__/*,dist/*,build/*" HOST=127.0.0.1 PORT=8000 VENV_DIR=/home/duksan/바탕화면/gumgang_meeting/.venv_backend ./scripts/dev_backend.sh run
      - 브릿지: PORT=3037 node bridge/server.js
      - (선택) 타우리: (프로젝트 폴더 진입 후) npm run tauri:dev



This is the top-level guide for running and developing the Gumgang Meeting stack in BT-10 (meeting capture, annotate, record). It highlights fixed ports, minimal dependencies, virtual environment hygiene, preflight checks, and quick start commands.

Status
- Core UI is served by the Bridge on port 3037.
- Meeting backend (FastAPI) runs on port 8000.
- A1/A5 UI buttons are wired to backend endpoints.
- Evidence is written under status/evidence/**.

Ports & Entrypoints (fixed by rules v3.0)
- Bridge (UI + file ops): http://localhost:3037 (node bridge/server.js)
  - Static UI at /ui/ (default: /ui/snapshots/unified_A1-A4_v0/index.html)
  - APIs: /api/save, /api/open, /api/fs/*, /api/health
- Backend (meeting + chat gateway): http://127.0.0.1:8000 (uvicorn app.api:app)
  - Health: GET /api/health
  - Chat (FastAPI gateway): 
    - POST /api/chat — 단건 응답(모델 라우팅: OpenAI/Anthropic/Gemini)
    - POST /api/chat/stream — SSE 스트리밍(Bridge는 JSON만)
    - POST /api/chat/toolcall — MCP‑Lite(OpenAI function calling 루프, 최대 3스텝)
  - Tools (MCP‑Lite):
    - GET /api/tools/definitions — 서버 기본 툴 목록(now, fs.read, web.search)
    - POST /api/tools/invoke — 단일 툴 실행 { tool, args }
  - Meeting features:
    - Capture: POST /api/meetings/capture
    - Capture(upload): POST /api/meetings/capture/upload
    - Annotate: POST /api/meetings/annotate
    - Record start/stop: POST /api/meetings/record/start, /record/stop
    - Events read: GET /api/meetings/{meetingId}/events

Authoritative env file
- gumgang_meeting/.env (rules v3.0)
- Bridge also reads certain variables (e.g., READ_ONLY_MODE, FS_ALLOWLIST).

Dependencies (dev environment)
- Node.js >= 18 (to run the Bridge; server.js uses only built-in modules)
- Python >= 3.10 (tested with 3.12) with venv support (python3-venv on Debian/Ubuntu)
- Python packages (installed into project-local venv):
  - fastapi >= 0.110
  - uvicorn[standard] >= 0.23
  - python-multipart >= 0.0.9

Never install Python packages globally on system Python (PEP 668). Use the provided venv helper.

Project structure (key paths)
- bridge/server.js — Bridge (3037). Serves UI and provides /api/save, /api/open, /api/health.
- ui/snapshots/unified_A1-A4_v0/index.html — Main UI snapshot (overlays auto-injected if present).
- ui/overlays/active.css, ui/overlays/active.js — Hot-reload overlays (optional).
- app/api.py — FastAPI backend (8000) for meeting capture/annotate/record.
- scripts/dev_backend.sh — venv helper for backend: init/run/health/freeze/env.
- scripts/preflight.sh — Preflight: venv existence/deps, port conflicts (3037, 8000).
- status/evidence/** — Evidence outputs (freeze snapshots, meeting events, etc.).
- status/checkpoints/CKPT_72H_RUN.md — Single source of truth for checkpoints.

Quick start (recommended)
1) Preflight (checks venv + ports)
   ./scripts/preflight.sh
   # Optional machine-readable:
   ./scripts/preflight.sh --json

2) Backend venv setup and run
   chmod +x scripts/dev_backend.sh
   # 1회(venv 생성 + 최소 의존성 설치)
   VENV_DIR=/home/duksan/바탕화면/gumgang_meeting/.venv_backend ./scripts/dev_backend.sh init
   # 실행(리로드 + 안전 감시 경로 설정)
   RELOAD=1 RELOAD_DIRS="app, gumgang_0_5/backend/app" RELOAD_EXCLUDE=".git/*,node_modules/*,__pycache__/*,dist/*,build/*" HOST=127.0.0.1 PORT=8000 VENV_DIR=/home/duksan/바탕화면/gumgang_meeting/.venv_backend ./scripts/dev_backend.sh run
   # Health:
   ./scripts/dev_backend.sh health

3) Run Bridge (in another terminal)
   node bridge/server.js
   # Health:
   curl -s http://localhost:3037/api/health

4) Open UI and test
   - Browser: http://localhost:3037/ui/
   - A2 탭의 Session에 세션ID 입력(없으면 GG-SESS-LOCAL 사용).
   - A5 탭 또는 A1 퀵패널에서 캡쳐/주석/녹화 버튼 클릭.
   - 이벤트 확인:
     curl -s "http://127.0.0.1:8000/api/meetings/<세션ID>/events" | jq

Evidence and reproducibility
- Freeze snapshot (pip freeze + runtime info) is written by:
   ./scripts/dev_backend.sh freeze
  → status/evidence/packaging/dev_backend_freeze_*.txt
- Venv hygiene guide (full details):
  status/evidence/packaging/venv_hygiene_guide_20250820.md

UI overlay notes
- UI auto-loads overlays if files exist:
  - /ui/overlays/active.css
  - /ui/overlays/active.js
- You can toggle overlays without rebuild; they are HEAD-probed and injected by index.html.

Bridge API quick tips
- Save
   curl -sS -X POST http://localhost:3037/api/save \
     -H "Content-Type: application/json" \
     -d '{"root":"status","path":"evidence/demo.txt","content":"hello","overwrite":true,"ensureDirs":true}'
- Open
   curl -sS -X POST http://localhost:3037/api/open \
     -H "Content-Type: application/json" \
     -d '{"root":"status","path":"evidence/demo.txt"}'

Backend API quick tips
- Health
   curl -s http://127.0.0.1:8000/api/health
- Chat gateway (단건)
   curl -s -X POST http://127.0.0.1:8000/api/chat -H "Content-Type: application/json" -d '{"model":"gpt-4o","messages":[{"role":"user","content":"모델 이름을 말해줘"}]}'
- Chat gateway (스트리밍, SSE는 브라우저/프론트에서 권장)
   curl -Nv -X POST http://127.0.0.1:8000/api/chat/stream -H "Content-Type: application/json" -d '{"model":"gpt-4o","messages":[{"role":"user","content":"한 문장으로 인사해줘"}]}'
- Tools
   curl -s http://127.0.0.1:8000/api/tools/definitions | jq .
   curl -s -X POST http://127.0.0.1:8000/api/tools/invoke -H "Content-Type: application/json" -d '{"tool":"now","args":{}}' | jq .
   curl -s -X POST http://127.0.0.1:8000/api/tools/invoke -H "Content-Type: application/json" -d '{"tool":"fs.read","args":{"path":"gumgang_meeting/README.md"}}' | jq .
- Tool-call 대화(OpenAI)
   curl -s -X POST http://127.0.0.1:8000/api/chat/toolcall -H "Content-Type: application/json" -d '{"model":"gpt-4o","messages":[{"role":"user","content":"오늘 날짜와 시간(now)을 알려줘"}]}' | jq .
- Capture (JSON)
   curl -sS -X POST http://127.0.0.1:8000/api/meetings/capture \
     -H "Content-Type: application/json" \
     -d '{"meetingId":"GG-SESS-LOCAL","note":"manual test","payload":{"source":"curl"}}'
- Events tail
   curl -s "http://127.0.0.1:8000/api/meetings/GG-SESS-LOCAL/events?limit=50"

Preflight (details)
- Checks for:
  - Project venv availability at ./venv
  - Python deps: fastapi, uvicorn, multipart
  - Port conflicts on 3037 (Bridge) and 8000 (Backend)
- Usage:
   chmod +x scripts/preflight.sh
   scripts/preflight.sh
- If a port is in use, free it or run with overrides (document any overrides in a checkpoint).

Venv policy (cleanliness)
- Exactly one venv at project root: ./venv
- Do not create nested envs under gumgang_0_5/** etc.
- Avoid system-level pip installs; use venv or pipx.
- Record environment with ./scripts/dev_backend.sh freeze when dependencies change.

Troubleshooting
- “externally-managed-environment” (PEP 668)
  - Use venv: ./scripts/dev_backend.sh init
- uvicorn not found
  - Run from venv: ./scripts/dev_backend.sh run
- Port already in use
  - Identify listener (ss/lsof/netstat) and stop, or override:
    PORT_BACKEND=8010 ./scripts/preflight.sh
    HOST=127.0.0.1 PORT=8010 ./scripts/dev_backend.sh run
  - If you override ports, record a checkpoint entry per rules v3.0.
- CORS issues
  - Backend enables permissive CORS for localhost and tauri://localhost by default; see app/api.py.

Security
- Bridge has no auth; use on trusted networks only.
- All path writes via Bridge are constrained to allowed roots and normalized to prevent traversal.

References
- Rules v3.0: gumgang_meeting/.rules (ports, evidence, checkpoints, non‑negotiables)
- Bridge docs: gumgang_meeting/bridge/README.md
- Backend app: gumgang_meeting/app/api.py

BT-10 addendum — Meeting quickstart and SAFE notes
- Meeting flow recap: A5에서 캡쳐 → 주석 → 녹화 시작/중지 → 업로드 → 이벤트 열기(A5 리스트/브리지 /api/open)
- SAFE 모드: http://localhost:3037/ui/?safe=1 또는 localStorage.setItem('gg_safe_mode','1')
- Mode 필드: 모든 이벤트에 "mode": "SAFE" | "NORMAL" 기록됨 (capture/annotate/record_start/record_stop/capture_upload)
- Start/Stop 정상화: 이미 ON 상태에서 start는 no_change, OFF에서 stop은 no_change (중복 이벤트 방지)
- 녹화 상태 배지/버튼: 즉시 반영 후 150ms 뒤 GET /api/meetings/{id}/record/status로 재동기화
- 이벤트 뷰어: A5 리스트에서 최근 50건 조회, (첨부) 링크/최근 첨부 열기 버튼으로 파일 오픈
- 참고 Evidence: status/evidence/packaging/safe_normal_parity_20250820.md

Happy building!
