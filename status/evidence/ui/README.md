---
timestamp:
  utc: 2025-09-16T16:34Z
  kst: 2025-09-17 01:35
author: Codex (AI Agent)
summary: ST0102 Runner가 생성하는 Dev UI 증거 파일 명명 규칙
document_type: evidence_manifest
tags:
  - #evidence
  - #st0102
phase: present
DOCS_TIME_SPEC: GG_TIME_SPEC_V1
---

# ST0102 Evidence Naming

| 파일 | 설명 |
| --- | --- |
| `build_<UTC>.log` | `npm run build` 전체 로그 |
| `test_<UTC>.log` | `npm run test -- --watch=false` 로그 |
| `guardrails_<UTC>.log` | `npm run guard:ui` 결과 |
| `dist/dev_ui_dist_<UTC>.zip` | `ui/dev_a1_vite/dist/` 압축본 |
| `preview_<UTC>.txt` | 5175/5173 프리뷰 명령 안내 |
| `preview_<UTC>.png` | 5175 프리뷰 스크린샷(수동 캡처) |
| `preview_<UTC>.html` | 5175 프리뷰 HTTP 본문 캡처(curl) |
| `preview_head_<UTC>.log` | 5175 프리뷰 HTTP 헤더 캡처 |

> Runner 실행 후 `status/checkpoints/CKPT_72H_RUN.jsonl`에 위 증거 경로를 포함하세요.

---

# ST0103 Evidence Naming (Thread Import)

- `thread_import_<UTC>.log` — recent/read API 호출 로그 및 요약
- `thread_import_<UTC>.json` — 샘플 수/성공/실패 카운트 요약(JSON)

실행 예시:

```
scripts/ci/st0103_import_runner.sh --dry-run
scripts/ci/st0103_import_runner.sh --backend bridge --host http://localhost:5175 --limit 100
```

검증 체크포인트 작성 시 위 두 파일명을 evidence 필드에 포함하세요.
