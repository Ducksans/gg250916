# 금강 프로젝트 — API 기반 세션 자동 요약 + URL 발급 구조

## 1. 시스템 구성도

[사용자 요청]
│
▼
[세션 매니저]
├─ (1) 세션 존재 여부 확인
├─ (2) 없으면 세션ID(UUIDv4) 생성
├─ (3) 턴ID(UUIDv4) 생성
│
▼
[LLM 호출 모듈]
├─ 사용자 프롬프트 + 세션 버퍼 전달
└─ LLM 응답 수신
│
▼
[요약 엔진 (RAG / CB / MCP)]
├─ 세션 길이·턴 수 체크
├─ 조건 충족 시 자동 요약 생성
└─ 세션 제목 업데이트
│
▼
[저장소]
├─ 대화 로그(JSONL: 세션ID, 턴ID, ts_local, ts_utc, prompt, response)
├─ 세션 메타(제목, 생성일, 최신 턴ID)
└─ 벡터 인덱스(맥락 검색용)
│
▼
[세션 URL 발급]
└─ https://gumgang.local/c/<세션ID>

rust
복사
편집

---

## 2. 시퀀스 다이어그램 (Sequence Diagram)

sequenceDiagram
    participant User as 사용자
    participant SM as 세션 매니저
    participant LLM as LLM 호출 모듈
    participant SUM as 요약 엔진(RAG/CB/MCP)
    participant DB as 저장소

    User->>SM: 질의 전송
    SM->>SM: 세션 존재 여부 확인
    alt 신규 세션
        SM->>SM: 세션ID(UUIDv4) 생성
    end
    SM->>SM: 턴ID(UUIDv4) 생성
    SM->>LLM: (세션 버퍼 + 프롬프트) 전달
    LLM-->>SM: 응답 반환
    SM->>SUM: 대화 길이/턴 수 확인 요청
    SUM-->>SM: 요약 생성 여부 반환
    alt 요약 필요
        SUM->>SUM: 자동 요약 생성
        SUM->>DB: 세션 메타 업데이트(제목 변경)
    end
    SM->>DB: 대화 로그 저장(JSONL)
    SM->>DB: 벡터 인덱스 업데이트
    SM-->>User: 응답 + 세션 URL(https://gumgang.local/c/<세션ID>)
3. 핵심 용어
세션ID: 하나의 대화방 고유 식별자 (UUIDv4)

턴ID: 1회 사용자 요청 + AI 응답 쌍의 식별자 (UUIDv4)

세션 버퍼: 이전 턴들의 요약 또는 원문 일부

자동 요약: 세션 제목을 생성하는 알고리즘 (LLM, 규칙 기반, 또는 혼합)

세션 URL: 세션ID를 포함해 과거 대화로 재접속 가능한 주소

4. 특징
자동 세션 요약으로 사용자가 "아까 어디까지 했더라?" 질문 시 바로 회상 가능

UUID 기반 식별로 충돌 없이 로컬·다중 엔진 동시 지원

벡터 인덱스를 통한 맥락 검색 지원

Web UI와 유사한 UX를 로컬 API 환경에서도 구현 가능

yaml
복사
편집

---

이 문서를 그대로 옵시디언 `/docs/SESSION_FLOW.md`에 넣으면  
**구조와 동작 원리**를 한 번에 이해할 수 있을 거예요.  

원하시면 여기에 **RAG·CB·MCP 각각의 역할을 층별로 표시한 확장 구조도**도 추가해 드릴 수 있습니다.  
그렇게 하면 맥락 유지 설계서로 바로 연결됩니다.  
다음처럼 옵시디언에 바로 넣을 수 있는 구조도+시퀀스 다이어그램 마크다운을 만들었습니다.

markdown
복사
편집
# 금강 — API 기반 세션 자동 요약 + URL 발급

## 1. 구성도

[사용자 요청]
│
▼
[세션 매니저]
├─ 세션ID 확인 / 신규 UUID 생성
├─ 턴ID(UUID) 생성
▼
[LLM 호출 모듈]
├─ 세션 버퍼 + 프롬프트 전달
└─ 응답 수신
▼
[요약 엔진 (RAG/CB/MCP)]
├─ 대화 길이·턴 수 점검
├─ 조건 충족 시 세션 제목 생성
▼
[저장소]
├─ 대화 로그(JSONL: 세션ID, 턴ID, ts_local, ts_utc, prompt, response)
├─ 세션 메타(제목, 생성일, 최신 턴ID)
└─ 벡터 인덱스(검색용)
▼
[세션 URL 발급]
└─ https://gumgang.local/c/<세션ID>

rust
복사
편집

## 2. 시퀀스 다이어그램

sequenceDiagram
    participant User as 사용자
    participant SM as 세션 매니저
    participant LLM as LLM 호출 모듈
    participant SUM as 요약 엔진
    participant DB as 저장소

    User->>SM: 질의
    SM->>SM: 세션ID 확인/생성
    SM->>SM: 턴ID 생성
    SM->>LLM: 세션 버퍼 + 프롬프트
    LLM-->>SM: 응답
    SM->>SUM: 요약 필요성 확인
    alt 요약 필요
        SUM->>SUM: 제목 생성
        SUM->>DB: 세션 메타 업데이트
    end
    SM->>DB: 로그 저장
    SM->>DB: 벡터 인덱스 업데이트
    SM-->>User: 응답 + 세션 URL
3. 용어
세션ID: 대화방 고유 식별자(UUIDv4)

턴ID: 사용자 요청 + 응답 쌍의 식별자(UUIDv4)

세션 버퍼: 이전 턴들의 요약 또는 원문 일부

자동 요약: 세션 제목 생성 로직

세션 URL: 과거 대화로 재접속 가능한 주소