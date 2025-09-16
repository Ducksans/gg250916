---
phase: present
---

# GG Daily Ops v1 — SOD/EOD 의식과 체크리스트

## SOD(작업 시작)
- 어제 요약/미해결/오늘 목표/예약 잡/최근 실패 5건/체크포인트 tail(10)
- Task: `ops:sod` → `status/daily/D_YYYYMMDD.md` 생성 + `ckpt.append`

## EOD(마감)
- 오늘 성과/실패·원인/의사결정/다음 우선순위/증거 링크
- Task: `ops:eod` → 파일 저장 + `ckpt.append`

## 템플릿(초안)
```
## SOD (YYYY-MM-DD)
Created: <UTC> / <KST>
Updated: <UTC> / <KST>
Hash: sha256:<digest>
- 어제 요약:
- 미해결:
- 오늘 목표:
- 예약 잡:
- 최근 실패 5건:
- 체커 상태:
```

## AC
- Roadmap/Atlas에서 당일 카드 표시, 카드→증거 점프
