# 📄 structure_fix.md

> 금강 0.8 – 구조 리포트 기반 자동 구조 개선 기능 문서  
> 작성일: 2025-07-28 02:40:21

---

## 🧠 기능 개요

금강은 자신의 프론트엔드/백엔드 구조를 분석하여,
- 중복 파일 제거
- 연결되지 않은 테스트/로그 파일 분리
- 미사용 폴더 정리

등의 구조 개선을 스스로 판단하고 자동 적용할 수 있습니다.

---

## 📂 주요 구성

### 1. 구조 보고서
- 경로: `backend/data/structure_report.json`
- 생성 스크립트: `analyze_structure.py`
- 구조: 누락 파일, 중복 항목, 미연결 리소스 등을 포함

### 2. 구조 개선 실행기
- 파일: `backend/scripts/structure_fix_applier.py`
- 주요 옵션:
  - `--dry_run`: 실제 적용 없이 제안만 출력
  - `--apply`: 실제 적용 수행
- 백업 폴더: `memory/structure_fixes_backup/{TIMESTAMP}/`
- 미연결 항목 이동: `memory/unlinked/`

---

## 🔗 백엔드 연동 흐름

### ✅ 상태 리포트 API `/status_report`
- 구조 보고서 + 구조 개선 제안 포함 (`structure_proposals`)
- 프론트 UI에 카드 형태로 출력

### ✅ 구조 적용 API `/apply_structure_fixes` (예정)
- `StructureProposalCard.tsx`의 실행 버튼과 연동 예정
- 실행 시 실제 파일 이동 및 백업 수행

---

## 📌 향후 확장 계획

- `structure_fix_log.json` 기록 및 시각화
- 구조 개선 히스토리 타임라인
- VSCode 자동 열기 등 연동
- LangGraph 응답에 구조 개선 기록 포함

---

## ✅ 개발 순서 요약

1. 구조 리포트 생성 (완료)
2. 구조 개선 스크립트 구현 (완료)
3. 백엔드 API `/apply_structure_fixes` 구현 (진행 예정)
4. 프론트 UI 연동 (진행 중)
5. 구조 개선 기록 시스템 및 LangGraph 통합 (예정)
