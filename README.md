# Gumgang Meeting — Daily Operations Hub

이 문서는 금강 프로젝트의 하루 업무 루틴과 관제 문서를 한 곳에 정리한 허브입니다. **모든 진행 상황·TODO·증거는 아래 Control Tower 문서를 단일 근거로 사용**하며, README 자체에는 요약/동선만 남깁니다.

## 1. Control Tower (항상 먼저 열람)
- [`status/vision/PROJECT_NORTH_STAR.md`](status/vision/PROJECT_NORTH_STAR.md) — 금강 4단계 절대 목표와 현재 위치
- [`status/reports/MASTER_EXECUTION_TIMELINE.md`](status/reports/MASTER_EXECUTION_TIMELINE.md) — 단일 실행 타임라인(주간 스프린트)
- [`status/catalog/MASTER_RUNBOOK.md`](status/catalog/MASTER_RUNBOOK.md) — 오늘의 3대 작업 및 체크리스트
- [`status/catalog/SSOT_SITEMAP.md`](status/catalog/SSOT_SITEMAP.md) — 스펙/계획/증거 문서 색인 (Dataview)
- 에이전트 프로토콜: [`AGENTS.md`](AGENTS.md) · [`AGENTS_expand.md`](AGENTS_expand.md) · [`AGENTS_log.md`](AGENTS_log.md)

> **전날 복기 요령:** 위 네 문서를 순서대로 읽고, `status/checkpoints/CKPT_72H_RUN.jsonl`의 마지막 기록을 확인한 뒤 아래 일일 루틴을 시작합니다.

## 2. 하루 시작(Start of Day)
1. **문서 복기**
   - `AGENTS*.md` → 상호작용 규칙/문서 구조 점검
   - `MASTER_RUNBOOK.md` → 오늘 진행 중 ST, 위험 요소 확인
   - `MASTER_EXECUTION_TIMELINE.md` → 예정된 실행 차수 및 승인 체계 파악
2. **환경 기동**
   ```bash
   ./start_servers.sh      # tmux 4분할(Backend/Bridge/Vite Dev/Vite Preview)
   ./check_servers.sh      # 8000/3037/5173/5175 헬스 확인
   ```
3. **UI 접속**
   - Dev: <http://127.0.0.1:5173/ui-dev/>
   - Preview: <http://127.0.0.1:5175/ui-dev/>
4. **PG 모드 여부 확인(선택)**
   - `.env` `GG_CONTENT_DB=pg` 설정 시 Postgres가 기동 중인지 `systemctl status postgresql` 또는 `psql`로 점검

## 3. 작업 중(PLAN → PATCH → PROVE)
- **PLAN**: `MASTER_EXECUTION_TIMELINE.md`에서 담당 차수/선행 조건을 확인하고, 변경 전·후 요약을 채팅에 공유
- **PATCH**: 코드/문서를 수정하기 전 해당 문서(SSOT, RUNBOOK, tasks)를 열람 후 변경
- **PROVE**: 결과 증거를 남기고 다음 두 위치를 즉시 갱신
  - `status/catalog/MASTER_RUNBOOK.md` — 오늘의 상태·TODO
  - `status/checkpoints/CKPT_72H_RUN.jsonl` — run_id/decision/evidence Append

> 개발 중 참조 문서: 설계 스펙(`status/reports/**`), 증거(`status/evidence/**`), UI/Backend 소스.

## 4. 하루 마감(End of Day)
1. 실행 결과 정리
   - `MASTER_RUNBOOK.md`의 “오늘의 상태 요약”과 TODO 체크박스 업데이트
   - `MASTER_EXECUTION_TIMELINE.md`에서 완료된 차수의 상태 및 선행 조건 반영
   - 필요 시 `SSOT_SITEMAP.md`에 신규 문서 링크 추가
2. 증거/로그 확정
   - `status/checkpoints/CKPT_72H_RUN.jsonl` Append (run_id, decision, next_step, evidence)
   - 관련 evidence/log 파일 경로를 `status/evidence/**`에 저장
3. 에이전트 로그
   - `AGENTS_log.md` Gate 체크리스트 실행(메타데이터/태그/Dataview)에 이상 없는지 확인
4. 세션 종료
   ```bash
   tmux kill-session -t gg_dev   # 서버 종료
   ```

## 5. Evidence & Monitoring Quick Links
- 서버 헬스: `status/evidence/backend/health_*.json`, `status/evidence/bridge/health_*.json`
- UI 세션 로그: `status/evidence/ui_runtime_*`
- 인게스트/실행 기록: `status/evidence/ui/ingest/`, `status/evidence/memory/**`
- 최근 작업 조회: `status/checkpoints/CKPT_72H_RUN.jsonl` 마지막 항목 확인
- Evidence 모니터링: `scripts/monitor/evidence_fallback_check.py` → 출력 `status/logs/evidence_monitor_*.json`

모니터 실행 예시:
```bash
python scripts/monitor/evidence_fallback_check.py
# 출력된 경로의 JSON을 열어 지표/상태 확인 (status/logs/evidence_monitor_*.json)
```

## 6. 주요 명령 모음
```bash
./start_servers.sh           # tmux 4분할 기동
./check_servers.sh           # 4개 포트 헬스 체크
./scripts/dev_backend.sh run # 백엔드 단독 실행(필요 시)
psql $CONTENT_PG_URL         # Postgres 스키마 점검
# PySpark (Stage 2 준비용) — venv 활성화 후 실행
source venv/bin/activate \
  && export JAVA_HOME=$PWD/tools/java/jdk-17.0.11+9 \
  && export PATH="$JAVA_HOME/bin:$PATH" \
  && python - <<'PY'
from pyspark.sql import SparkSession
spark = SparkSession.builder.master('local[*]').appName('verify').getOrCreate()
print('Spark version:', spark.version)
spark.stop()
PY

# PySpark 샘플 잡 실행(API 직접 호출):
curl -s -X POST http://127.0.0.1:8000/api/mcp/pyspark/run \
  -H 'Content-Type: application/json' \
  -d '{"script":"scripts/pyspark_jobs/sample_verify_spark.py"}' | jq
```

## 6‑B. Desktop(Tauri) Quickstart
- Dev 서버가 5173에서 실행 중이면 Tauri만 실행합니다.
  ```bash
  cd ui/dev_a1_vite
  npm run tauri:dev        # 네이티브 창에서 Gumgang UI 실행
  ```
- 5173 포트가 바뀌면 `ui/dev_a1_vite/src-tauri/tauri.conf.json`의 `app.windows[0].url`을 같은 주소로 변경하세요.
- 빌드 산출물 경로: `ui/dev_a1_vite/dist` (Vite)

Tauri Resize 안정화(중요)
- WebKitGTK 환경에서 100vh/100dvh가 창 리사이즈 시 부정확해질 수 있어 JS가 `--gg-vh` 변수를 게시하고 레이아웃은 이 값을 사용합니다.
- 적용 파일: `ui/dev_a1_vite/src/hooks/useViewportUnits.js`, `a1.css`(wrapper 높이), Editor 높이 계산.
- 문제가 재현되면 창을 리사이즈해 보며 상단/하단이 잘린 현상이 사라지는지 확인하세요.

## 7. IDE 모드(코딩 에이전트) Quickstart
- 라우트: `http://127.0.0.1:5173/ui-dev/ide` (전역 메뉴 Home=IDE)
- 레이아웃: 좌(파일 트리) · 중(멀티탭 Monaco) · 우(채팅)
- 리사이저: 좌/중, 중/우 사이 세로 바 드래그(프리셋 더블클릭: 접힘→280→480). 우측 기본폭 480px.
- 단축키: 
  - 전환: `Ctrl/Cmd+1` Chat, `Ctrl/Cmd+2` IDE
  - 패널: `Ctrl/Cmd+B` Explorer 토글, `Ctrl/Cmd+J` Chat 토글
  - 에디터: `Ctrl/Cmd+P` 빠른 열기, `Ctrl/Cmd+W` 탭 닫기(중복 방지)
- 전고: `--vh` 기반(브라우저/Tauri 동일), 컬럼별 자체 스크롤
- 스펙 문서: `status/reports/GG_IDE_SHELL_SPEC_V1.md`

### Editor 모드 요약
- 진입: 상단 `Editor` 버튼 → 좌(파일 트리) · 중(멀티탭 Monaco) · 우(채팅) 3분할.
- 리사이즈: 좌/중, 중/우 사이 세로 바를 드래그(폭은 자동 저장). 탭 중클릭 닫기, 같은 파일 중복 방지.
- 파일 읽기 API: `GET /api/files/read?path=/repo/relative/path`
- 트리 API: `GET /api/files/list?path=.&depth=2`

## 7. 빈틈 방지 체크리스트
- [ ] 하루 시작 전에 Control Tower 4개 문서를 읽었다.
- [ ] 진행 중인 ST/BT는 Timeline/RUNBOOK에 반영되었다.
- [ ] 신규 증거는 `status/evidence/**`에 저장하고 CKPT에 링크했다.
- [ ] 종료 전 RUNBOOK/TIMELINE/SSOT/CKPT/AGENTS_log를 최신 상태로 맞췄다.

> 위 체크리스트가 모두 ✅이면, 다음날 작업자가 README 상단 → Control Tower → RUNBOOK/Timeline 순으로 읽기만 해도 바로 이어서 작업할 수 있습니다.
