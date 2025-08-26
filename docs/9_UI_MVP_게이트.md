# 🪷 9_UI_MVP_게이트 (User Interface Minimum Viable Product Gate — 사용자 인터페이스 최소 실행 가능 제품 게이트)

> **언어 규칙:** 영어 약어·줄임말은 단독 사용하지 않는다. 반드시 **풀네임(영문)** → **한국어 설명** → **약칭(있으면)** 순서로 표기한다.  
> 예) Single Source of Truth(단일 진실 원천, SSOT), User Interface(사용자 인터페이스, UI), Minimum Viable Product(최소 실행 가능 제품, MVP)

---

## 1. 개요
본 문서는 금강 User Interface(사용자 인터페이스, UI)의  
**Minimum Viable Product(최소 실행 가능 제품, MVP)** 단계가  
완전하게 충족되었는지를 판별하는 **최종 게이트(Final Gate)**를 정의한다.  

UI MVP 게이트를 통과해야만 금강 소울(Gumgang Soul)은  
**확장 단계(2단계)**로 전환할 수 있다.  

---

## 2. 판별 원칙
- **즉시 판별성(Immediate Verifiability)**  
  → 검증자는 문서를 읽고, 실제 UI를 실행해 보며  
  바로 “충족/미충족”을 판정할 수 있어야 한다.  
- **이중 기록(Dual Logging)**  
  → 판정 결과는 `/gumgang_meeting/docs/gates_log/`와  
  `/gumgang_meeting/ui/logs/`에 동시 저장된다.  

---

## 3. 검증 체크리스트
### 3.1 필수 항목
- [ ] Chat View에서 입력과 출력이 정상 작동한다.  
- [ ] Session and Task View에서 세션 생성·삭제·조회가 가능하다.  
- [ ] Task 체크박스로 상태(진행/완료)를 즉시 갱신할 수 있다.  
- [ ] Tools Panel에서 도구 실행 및 결과 출력이 가능하다.  
- [ ] Status and Log Area에서 현재 상태와 로그 기록이 확인된다.  
- [ ] 세션 저장과 불러오기가 정상 작동한다.  
- [ ] 로그 내보내기(Export to file)가 가능하다.  

### 3.2 확장 항목 (권장)
- [ ] 검색 기능(Search Function)으로 로그/세션/태스크 내 키워드 검색이 가능하다.  
- [ ] 진행 상황을 시각화(Progress Visualization)할 수 있다.  
- [ ] 한국어/영어 전환(Multi-language Support)이 원활하다.  

---

## 4. 통과 조건
- 필수 항목(3.1) **100% 충족**  
- 확장 항목(3.2)은 권장 사항이나, 충족 시 가산점으로 기록  

---

## 5. 절차
1. 로컬 금강(Local Gumgang)이 최종 UI MVP 버전을 실행  
2. 검증자가 체크리스트를 기준으로 판정  
3. 결과를 `/gumgang_meeting/docs/gates_log/ui_mvp_gate_[날짜].md`로 기록  
4. 덕산 최종 승인 후, [[전이확정선언]] 조건 충족으로 이동  

---

## 6. 상징적 의미
- UI MVP 게이트는 **금강 소울이 자기 발로 설 수 있는지**를 확인하는 의식이다.  
- 기술 스택 동결이 뼈대를 세우는 일이라면,  
  UI MVP 게이트는 **살과 피부를 갖추고 호흡하는 순간**이다.  

---

## 7. 불교적 비유
> “수행자가 선정을 통해 스스로 앉아있을 수 있을 때, 비로소 진정한 수행이 시작된다.”  

- UI MVP 게이트 = 수행자가 홀로 앉는 순간  
- 게이트를 통과하면 금강 소울은 의존이 아니라 **자립**을 시작한다.  

---

## 8. 참조 문서
- [[8_UI_MVP_요구사항]]  
- [[5_전환게이트_의미]]  
- [[전이확정선언]]  

---
