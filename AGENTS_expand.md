---
timestamp:
  utc: 2025-09-16T04:51Z
  kst: 2025-09-16 13:51
author: Codex (AI Agent)
summary: 프로젝트 설계서/작업 계획서/작업 지시서 구조와 Obsidian 운용 세부 규약
document_type: agent_operational_detail
tags:
  - #agent
  - #planning
  - #obsidian
BT: none
ST: none
RT: none
DOCS_TIME_SPEC: GG_TIME_SPEC_V1
---

# AGENTS 확장 규약

## 1. 문서 계층 Tree
| 계층 | 역할 | 포함 내용 | 기록 위치 |
| --- | --- | --- | --- |
| 프로젝트 설계서 | 최종 목표, 핵심 기능, 성공 조건, 변경 원칙 | BT(Big Task) 목록, 프로젝트 미션 스테이트먼트 | `/status/roadmap`, `/status/reports` SSOT |
| 작업 계획서 | BT/ST 구조, 실행 순서표, 의존성, 라운드(RT) 정의 | `BT01`, `ST0101` 등 고유 번호와 목표/성과기준 | `/status/reports/EXEC_PLAN_*.md`, `/status/catalog` |
| 작업 지시서 | 코드 수준 지침, 세부 TODO, 테스트 기준, CI runner 실행 조건 | ST 하위 세부 단계, 환경 설정, 성공 확인 체크리스트 | `/status/tasks`, `/docs/instructions` |

> **Tip:** 초보자도 문서 흐름을 찾기 쉽도록 각 문서 상단에 “이 문서는 (상위 문서 링크) 하위 문서입니다”라는 문장을 넣는다.

## 2. 번호 규칙 (BT, ST, RT)
- **BT(Big Task):** `BT01_목표_작업내용` 형태. 계획서에 등록 시, 목적·완료 기준·연관 SSOT 링크를 함께 기입한다.
- **ST(Small Task):** `ST0101_목표_작업내용`처럼 상위 BT 번호 + 2자리 세부 번호. 의존성이 있을 때는 “선행 ST” 항목을 추가한다.
- **RT(Round Task):** 특정 목표를 위해 여러 BT/ST를 순환 실행할 때 `RT01_목표_작업내용`으로 묶는다. 라운드마다 포함된 BT/ST와 반복 사유를 표로 남긴다.

### 작성 예시
| 라벨 | 제목 | 선행 항목 | 완료 조건 |
| --- | --- | --- | --- |
| BT01 | BT01_DevUI_채팅복원 | - | Dev UI에서 sendChat 파이프라인 정상 동작 |
| ST0103 | ST0103_sendChat_orchestrator_연결 | ST0102, ST0201 | 백엔드 응답이 Dev UI에 표시되고 LOG#A1 패널에 추적 |
| RT01 | RT01_Scheduler_Context_Sync | BT02, BT05 | SSV와 Scheduler 데이터 동기화 검증 1회 완료 |

## 3. 작업 실행 순서표 만들기
1. **템플릿:** Obsidian에서 새 노트 생성 후 아래 표를 붙여넣는다.
   ```markdown
   | 실행 차수 | 대상(BT/ST/RT) | 목적 | 선행 작업 | 산출물 | 담당 |
   | --- | --- | --- | --- | --- | --- |
   ```
2. **실행 차수:** 실제 실행 순서를 1, 2, 3 …으로 기록한다. BT/ST 번호와 다를 수 있다.
3. **선행 작업:** 같은 라운드 또는 다른 BT의 의존 항목을 나열한다. 필요하면 `GG_TIME_SPEC_V1`에서 정의한 시간 블록을 적는다.
4. **산출물:** 생성될 문서, 코드 경로, 체크포인트 ID 등을 기재해 추적성을 높인다.
5. **라운드 기록:** 특정 실행이 RT에 속하면 추가 행을 만들어 라운드 번호와 반복 횟수를 기록한다.

## 4. Obsidian Vault 구성 절차
1. **Vault 설정**
   - Vault 루트를 프로젝트 루트로 지정 후 `Settings → Files & Links`에서 `Automatically update internal links`, `Detect all links`, `New link format` 옵션을 모두 수동으로 맞춘다(자동 변경 OFF).
   - `Attachments` 저장 경로를 `docs/assets` 등 허용 폴더로 지정한다.
   - `Editor → Reading view` 기본값을 유지하고 `Strict line breaks` 활성화.
2. **필터 공유**
   - Global Graph: `tag:#project and -path:archive`
   - Local Graph: `path:status` 또는 `tag:#spec`
   - Dataview 플러그인에서 `AGENTS_log.md`에 기재된 쿼리를 재사용한다.
3. **DYN 블록 & 시간 헤더**
   - `GG_DYNAMIC_BLOCKS_SPEC.md`의 규격을 따라 `%%DYN ... %%` 블록을 유지.
   - 시간 헤더는 `GG_TIME_SPEC_V1`에서 정의한 `## [2025-09-16 | KST-Session-01]` 형식 사용.

## 5. CI Runner와 승인 흐름
1. ST 단위 작업이 준비되면 **작업 지시서**에 CI Runner 명령을 명시한다.
2. Runner가 통과하면 가상환경(포트 5175)에서 사람이 검수한다.
3. 검수자가 승인 후 `RT` 또는 상위 BT에 결과를 반영하고, 필요 시 `ST0101a` 같은 파생 번호를 생성해 추가 개선을 기록한다.
4. 모든 승인 기록은 `status/checkpoints/CKPT_72H_RUN.jsonl`에 Append하며, `decision` 필드에 ST 번호와 결과를 명시한다.

## 6. 문서 정렬 절차 (드리프트 방지)
- 계획서/지시서 외 아이디어가 등장하면 즉시 작업 중단 → 해당 아이디어를 **프로젝트 설계서** 아래 제안 섹션에 임시 기록 → 검토 후 승인되면 BT/ST에 반영.
- 문서 정렬이 끝나기 전에는 어떠한 코드 수정도 진행하지 않는다.
- 정렬 완료 후 `AGENTS_log.md`의 “게이트 체크리스트”를 따라 검증한다.

## 7. 체크포인트 & 시간 규약 연동
- 실행 순서표가 업데이트될 때마다 `GG_TIME_SPEC_V1`의 `DOCS_TIME_SPEC` 섹션 버전을 확인한다.
- 체크포인트 Append 시 `decision` 또는 `next_step`에 `DOCS_TIME_SPEC_v1 적용` 등을 명시해 히스토리를 남긴다.
- Dataview 인덱스(`SSOT_SITEMAP.md`)에 새로운 계획 문서를 추가하면 반드시 태그 `#plan` 또는 `#instruction`를 부여해 필터에 노출시킨다.

## 8. 빠른 자기점검 목록
- [ ] 문서 상단 메타데이터(UTC/KST, 작성자, 요약) 입력 완료
- [ ] 상위 문서 링크 또는 참조가 명시됨
- [ ] 실행 순서표는 최신이며 의존성이 표에 포함됨
- [ ] Obsidian 설정 변경 사항을 팀에 공유함 (필요 시 스크린샷 첨부)
- [ ] 체크포인트 Append 완료 후 로그 경로 기록
