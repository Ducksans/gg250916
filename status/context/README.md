# Context Management (VS Code)

## 목적
- 컨텍스트 길이 증가/스레드 리부트 상황에서도 맥락을 보존하고 빠르게 복귀.

## 구성
- 정적 앵커: `CONTEXT_STATIC.md` — 불변 기준(룰/SSOT 링크).
- 롤링 최신: `CONTEXT_LATEST.md` — 항상 최신 1개.
- 아카이브: `snapshots/*.md` — 시점별 상세 스냅샷.

## 태스크
- 최신 스냅샷: `context:snapshot:latest`
- 아카이브 스냅샷: `context:snapshot:archive`
- 둘 다: `context:snapshot:both`
- 정리: `context:prune`

## 권장 흐름
1) 작업 라운드 시작/종료 시 LATEST 갱신
2) 구조적 결정 시 BOTH 실행(아카이브 생성)
3) 주기적으로 PRUNE 실행(30일/60개 유지 기본)

