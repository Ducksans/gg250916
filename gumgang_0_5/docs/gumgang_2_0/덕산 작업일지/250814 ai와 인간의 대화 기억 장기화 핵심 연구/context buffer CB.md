Context Buffer(CB)를 구현하는 방법은 크게 **저장 방식**, **교체 정책**, **검색 방법** 3가지 요소로 나눌 수 있습니다.  
아래는 금강 프로젝트 같은 로컬 중심 환경을 가정한 설계 예시입니다.

---

## 1. **저장 방식**

- **구조**:
    
    `{   "id": "<uuid>",    "ts_local": "YYYY-MM-DDTHH:mm:ss+09:00",   "ts_utc": "YYYY-MM-DDTHH:mm:ssZ",   "role": "user|assistant|system",   "content": "텍스트 내용",   "meta": { "topic_hash": "...", "phase": "preflight|run" } }`
    
- **형식**:
    
    - JSONL (한 줄 = 한 메시지) → `cb_current.jsonl`
        
    - 또는 SQLite (작은 쿼리 빠름)
        
- **위치**: `.session/context_buffer/`
    
    - 재시작 시 자동 로드 가능
        

---

## 2. **교체 정책**

- **슬라이딩 윈도우 방식**:
    
    - 최근 N턴(예: 20턴)만 유지
        
    - 새 항목 추가 시 가장 오래된 항목 삭제
        
- **토큰 기반**:
    
    - 전체 CB의 총 토큰 수가 `max_context_tokens` 초과 시, 오래된 항목부터 삭제
        
- **시간 기반**:
    
    - 최근 X시간(예: 3시간) 이내의 기록만 유지
        

---

## 3. **검색 방법**

- **순차 전송**: LLM 호출 시 CB 내용을 최근 순으로 합쳐서 prompt 상단에 삽입
    
- **필터링**:
    
    - 키워드 기반 (현재 토픽 관련 메시지만 전송)
        
    - RAG 기반 (현재 질문과 유사도 높은 메시지만 선택)
        
- **하이브리드**:
    
    - “최근 N턴 + 관련도 높은 과거 턴” 병합
        

---

## 4. **동작 흐름**

1. 사용자 발화 저장 → CB에 append
    
2. LLM 응답 저장 → CB에 append
    
3. 다음 요청 시 CB에서 최근 맥락을 불러와 prompt에 추가
    
4. CB 길이가 초과되면 오래된 항목 drop
    

---

## 5. **간단한 Node.js 구현 예시**

`const fs = require('fs'); const path = './.session/context_buffer/cb_current.jsonl';  function appendToCB(entry) {   fs.appendFileSync(path, JSON.stringify(entry) + '\n'); }  function loadCB(limit = 20) {   const lines = fs.readFileSync(path, 'utf8').trim().split('\n');   return lines.slice(-limit).map(JSON.parse); }  // 예시 저장 appendToCB({   id: crypto.randomUUID(),   ts_local: new Date().toISOString(),   ts_utc: new Date().toISOString(),   role: 'user',   content: '오늘 어디까지 했더라?',   meta: { topic_hash: 'abc123', phase: 'run' } });  // 최근 10턴 불러오기 console.log(loadCB(10));`

---

💡 **금강에 적용 시 장점**

- **세션 리부트**나 **엔진 교체** 시에도 최근 맥락 유지
    
- **자동 리캡(Auto Recap)**, **RAG**, **MCP 핸드오프**와 결합 가능
    
- 장기 메모리 이전 전 단계에서 _실시간 버퍼_ 역할


원하시면 제가 금강 프로젝트에 맞춰서 **CB + RAG + MCP가 통합된 맥락 복구 파이프라인** 설계도를 그려드릴 수 있습니다.  
그렇게 하면 “금강아, 아까 어디까지 했더라?” 같은 질문을 거의 완벽히 대응 가능해집니다.