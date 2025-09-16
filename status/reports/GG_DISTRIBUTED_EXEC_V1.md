---
phase: present
---

# GG Distributed Exec v1 — 분산 작업 스케줄러/대시보드 설계(20대 에이전트)

## 목적
- 금강 UI의 오케스트레이션/콘텐츠 파이프라인을 20대 서브 컴퓨터로 분산 실행.
- 중앙 대시보드로 상태/자원/실행 이력을 모니터링하고, 재시도/중단/우선순위 조정.

## 선정(권장) 구도
- 워크플로 엔진: Temporal(내구성 워크플로, 재시도/사가 패턴, Web UI)
- 대규모 병렬 연산/배치: Ray Cluster(Actor/Task, Dashboard)
- 메시지 브로커(옵션 경량 모드): Celery + Redis/RabbitMQ (간단 큐)

## 배치 모델
- 중앙 서버: PostgreSQL(pgvector) + Temporal Server + Prometheus + Grafana + 금강 백엔드(FastAPI)
- 워커(20대): 금강 워커 에이전트 프로세스
  - 모드 A: Temporal Worker(도메인/작업 타입별 Pull)
  - 모드 B: Ray Node(Head/Worker)
  - 모드 C(경량): Celery Worker

## 대시보드
- Temporal Web, Ray Dashboard, Grafana(자원/메트릭), 금강 전용 대시보드(UI 탭: Runs/Agents/Resources)

## 스케줄링/격리
- 우선순위 큐, 태그 기반 라우팅(예: CPU/GPU/메모리), 작업당 타임아웃/재시도/중단, SLO 경계

## 보안/접근
- 워커 인증 토큰, 화이트리스트 네트워크, 감사 로그(JSONL), 파일 IO 경계 준수

## 단계적 도입
1) 로컬 단일 노드(이미지/스크립트 빌드) → 2) Ray Head + 2~3 Worker로 병렬성 검증
3) Temporal Server 도입(워크플로 내구성·재시도) → 4) 20대 확장 + 모니터링 지표/알림

## CI 연동
- orch-sim: 샘플 플로우를 로컬 엔진으로 실행(병렬성 1) — 안정성 기준
- dist-smoke(후속): 소규모 Ray/Temporal 시뮬레이션 잡 수행(요약 메트릭 업로드)

