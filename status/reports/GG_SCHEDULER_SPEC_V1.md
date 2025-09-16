---
phase: present
---

# GG Scheduler Spec v1 — 작업 스케줄러/분산 실행

## 목표
- 개발작업과 컨텐츠 파이프라인을 동일한 상태머신으로 운영: queued → running → succeeded|failed|canceled → archived.
- 대규모/장시간 작업에서 재시도/일시정지/재개가 신뢰성 있게 동작(내구성 워크플로).

## 엔터티
- pipelines(id, name, version, graph_json, owner, tags, created_at, updated_at)
- jobs(id, pipeline_id, type, priority, schedule_id, state, created_at, updated_at)
- job_runs(id, job_id, status, started_at, finished_at, worker_id, logs_path, artifacts_root, metrics_json)
- schedule_triggers(id, type[cron|webhook|event], cfg_json, active, last_fired_at)
- worker_agents(id, hostname, capabilities_json, status, capacity_cpu, capacity_mem, capacity_gpu, last_heartbeat)
- allocations(run_id, worker_id, cpu, mem, gpu, note)

## 상태/재시도
- backoff: exponential(2^n), jitter 허용, max_retries 설정.
- pause/resume: 센트리 위반 시 PAUSE → 복구 체크리스트 완료 후 RESUME.

## 분산 실행
- Temporal(권장): 워크플로 내구성·재시도·사가, Web UI.
- Ray(선택): 병렬 연산/대량 처리. Temporal Activity 내부에서 호출.

## 보안/보존
- dev_* 보존 30–90일(원문 압축), content_* 월/분기 파티션.
- 채널/배포 키는 content.* 경로로 제한, 이벤트/로그에는 마스킹.

## AC
- Job/Run 카드로 상태/시간/링크/증거 확인 가능, 실패시 원인 링크.

