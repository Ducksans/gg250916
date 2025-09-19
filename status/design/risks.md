---
timestamp:
  utc: 2025-09-16T16:34Z
  kst: 2025-09-17 01:35
author: Codex (AI Agent)
summary: BT-06 ST-0608을 위한 리스크 및 완화 전략 정리
document_type: risk_register
tags:
  - #design
  - #bt-06
  - #st-0608
phase: present
DOCS_TIME_SPEC: GG_TIME_SPEC_V1
---

# Risks (Draft)

```dataviewjs
const D = dv.luxon.DateTime;
dv.paragraph(`(as of ${D.utc().toFormat("yyyy-LL-dd HH:mm'Z'")})`);
```

| ID | Risk | Impact | Mitigation |
|---|---|---|---|
| R1 | 포트 충돌(8000/3037) | 백엔드/브리지 실패 | 고정 포트 준수, 충돌 시 체크포인트 후 재시도 시간 창 설정 |
| R2 | 토큰/길이 제한 | 로그/증거 손실 | ALERT70/85/95 가드 준수, 요약 단계 도입 |
| R3 | 외부 쓰기 | 보안/규정 위반 | WRITE_ALLOW 강제, 도구 사용 제한 |
| R4 | 증거 누락 | 검증 불가 | 모든 결정에 path#Lx-y 첨부 |
| R5 | 시간박스 초과 | 일정 지연 | ST ≤ 90분 준수, BLOCKED 기록 후 이동 |
| R6 | v1(파일)/v2(DB) 혼용 | 목록/내용 불일치 | DB(v2) 고정, v1은 이관/백필 전용 |
| R7 | API 토글 혼선 | 잘못된 경로로 무응답 | FastAPI 단일화(토글 제거/잠금), 문구/README 일관 |
| R8 | IndexedDB 캐시와 DB 불일치 | 잘못된 UI 상태 | 세션 1회 자동 임포트 + 수동 Import 버튼, Source=DB 플래그 기본화 |
| R9 | 무한스크롤 옵저버 루트 오류 | 목록 확장 실패 | root=`#gg-threads` 강제, rootMargin 확장, 회귀 테스트 추가 |
| R10 | URL↔스토어 동기화 루프 | URL 깜빡임 | 라우트에 threadId 있을 때는 URL 미수정(스토어만 전환) |

신규 위험(단일 관문 운영)
| ID | Risk | Impact | Mitigation |
|---|---|---|---|
| R11 | FastAPI 장애(단일 관문) | 대화/툴/검색 중단 | 임시 우회로: Bridge 프록시 /api/chat 유지(비권장) + 헬스/알람, 신속 롤백 문서 |

## Session Updates — 2025-09-17 (UTC)
- IndexedDB Origin 분리 이슈 재확인: localhost/127.0.0.1, 5173/5175 간 저장소가 분리됨 → 문서/README에 Origin 고정 안내 필요.
- Bridge v2 프록시 스모크 PASS: 프록시 드리프트 리스크 현재 없음(정기 스모크 유지).
- 린트 규칙 준수 상태 상향: 에러 0(경고는 추적 관리).
- Evidence: `status/evidence/bridge/V2_PROXY_SMOKE_20250917T0441Z.md`, `status/evidence/ui/lint_final_20250917T0502Z.log`.
