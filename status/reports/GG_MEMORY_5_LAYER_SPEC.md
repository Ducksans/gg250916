---
phase: present
---

# GG Memory 5-Layer Spec — 초단기/단기/중기/장기/초장기

## 목적
- 맥락 휘발/드리프트를 낮추고, “사실/증거/기억” 기반 대화를 안정화.
- 플로우/콘텐츠 자동화에 필요한 지속적 학습/자기 개선 자료를 축적.

## 계층 정의
- L0 초단기: in-memory 세션 창(현재 대화 윈도)
- L1 단기: IndexedDB 탭 캐시(최근 스레드/플로우 편집 상태)
- L2 중기: SQLite 최근 주·월 이력, decay 스케줄러
- L3 장기: 전체 이력 + 요약/키워드/임베딩
- L4 초장기: 스냅샷/아카이브(JSONL/MD), 선택적 외부 보관

## 리콜/주입 전략
- 계층 가중→FTS5 키워드 검색→Vector KNN(재랭크)→출처/신뢰도 메타 포함하여 주입
- 최신화: 화이트리스트 web.fetch/scrape MCP 지원(사이즈/도메인 가드)

## 저장소 매핑
- L0: 프로세스 메모리
- L1: IndexedDB
- L2/L3: SQLite + FTS5 + embeddings(sqlite-vec)
- L4: `status/evidence/**` JSONL/MD 스냅샷

## 유지/희석(decay)
- 시간/사용 빈도 기반 점수 하향, 임계 이하 항목은 요약 저장 후 본문은 압축/아카이브

## 신뢰도
- 출처·날짜·교차검증 여부로 score 부여 → 주입 시 정렬 근거로 활용

