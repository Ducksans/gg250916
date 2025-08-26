# 🚀 GPT-5 Configuration Guide

**작성일**: 2025-08-10  
**GPT-5 정식 출시일**: 2025-08-08

## 📊 GPT-5 모델 정보

### 사용 가능한 모델들

| 모델명 | 입력 가격 | 출력 가격 | 컨텍스트 | 최대 출력 | 특징 |
|--------|----------|----------|----------|----------|------|
| **gpt-5** | $1.25/1M tokens | $10.00/1M tokens | 400K | 128K | 플래그십 모델, 최고 성능 |
| **gpt-5-mini** | $0.25/1M tokens | $2.00/1M tokens | 400K | 128K | 비용 효율적, 빠른 응답 |
| **gpt-5-nano** | $0.05/1M tokens | $0.40/1M tokens | 400K | 128K | 초경량, 간단한 작업용 |

## 🔧 환경 설정

### 1. 환경 변수 설정 (.env)

```bash
# OpenAI API 설정
OPENAI_API_KEY=your-api-key-here

# GPT-5 모델 선택 (기본값: gpt-5)
OPENAI_MODEL=gpt-5  # 옵션: gpt-5, gpt-5-mini, gpt-5-nano

# 온도 설정 (창의성 조절)
OPENAI_TEMPERATURE=0.7

# 최대 토큰 설정
OPENAI_MAX_TOKENS=2000
```

### 2. 프로젝트 설정 완료 상태

✅ **backend/simple_main.py** - GPT-5 모델 통합 완료
- 환경변수로 모델 선택 가능
- 기본값: gpt-5 설정됨
- 메모리 시스템과 통합됨

## 💡 GPT-5 주요 특징

### 1. **Thinking 기능 내장**
- 복잡한 문제에 대해 깊이 있는 사고
- 단계별 추론 과정 제공
- 더 정확한 답변 생성

### 2. **향상된 성능**
- 수학, 과학, 금융, 법률 분야 전문성
- 코딩 작업 end-to-end 처리
- 더 나은 디버깅 능력

### 3. **안전성 개선**
- 환각(hallucination) 감소
- 더 신뢰할 수 있는 응답
- 사실 확인 능력 향상

## 🔄 마이그레이션 가이드

### GPT-4에서 GPT-5로 전환

1. **모델명 변경**
   ```python
   # 이전 (GPT-4)
   model="gpt-4-turbo-preview"
   
   # 현재 (GPT-5)
   model="gpt-5"  # 또는 환경변수 사용
   ```

2. **토큰 제한 업데이트**
   ```python
   # GPT-5는 더 큰 컨텍스트 지원
   max_tokens=4000  # 기존 2000에서 증가 가능
   ```

3. **온도 조정**
   ```python
   # GPT-5는 더 안정적이므로 온도를 약간 높일 수 있음
   temperature=0.8  # 기존 0.7에서 조정 가능
   ```

## 📈 비용 최적화 전략

### 1. **작업별 모델 선택**
- **복잡한 추론**: gpt-5 (플래그십)
- **일반 대화**: gpt-5-mini (균형)
- **간단한 작업**: gpt-5-nano (경제적)

### 2. **토큰 사용 모니터링**
```python
# 토큰 사용량 추적
if response.usage:
    logger.info(f"토큰 사용: {response.usage.total_tokens}")
    logger.info(f"예상 비용: ${calculate_cost(response.usage)}")
```

### 3. **캐싱 전략**
- 자주 묻는 질문은 메모리 시스템 활용
- 반복적인 요청은 캐시에서 처리

## 🎯 프로젝트별 권장 설정

### Gumgang 2.0 프로젝트
```python
# 추천 설정
OPENAI_MODEL=gpt-5-mini  # 개발 중에는 mini 사용
OPENAI_TEMPERATURE=0.7   # 균형잡힌 창의성
OPENAI_MAX_TOKENS=2000   # 충분한 응답 길이

# 프로덕션 설정
OPENAI_MODEL=gpt-5       # 최고 성능 필요시
OPENAI_TEMPERATURE=0.6   # 안정적인 응답
OPENAI_MAX_TOKENS=3000   # 상세한 응답
```

## 🔍 테스트 명령어

### API 연결 테스트
```bash
# 백엔드 서버에서 GPT-5 테스트
curl -X POST http://localhost:8000/ask \
  -H "Content-Type: application/json" \
  -d '{"query": "GPT-5의 새로운 기능을 설명해줘"}'
```

### 모델 확인
```bash
# 현재 사용 중인 모델 확인
curl http://localhost:8000/health | jq '.context_info.model'
```

## 📚 참고 자료

- [OpenAI GPT-5 공식 문서](https://platform.openai.com/docs/models/gpt-5)
- [GPT-5 API 가격 정책](https://openai.com/api/pricing/)
- [GPT-5 연구 논문](https://openai.com/index/introducing-gpt-5/)

## 🐛 문제 해결

### 일반적인 오류와 해결책

1. **"Model not found" 오류**
   - API 키가 GPT-5 액세스 권한이 있는지 확인
   - 모델명 철자 확인 (gpt-5, gpt-5-mini, gpt-5-nano)

2. **토큰 제한 초과**
   - max_tokens 값 조정
   - 프롬프트 길이 최적화

3. **응답 속도 문제**
   - gpt-5-mini 또는 gpt-5-nano 사용 고려
   - 스트리밍 응답 활성화

## ✅ 체크리스트

- [x] GPT-5 모델 통합 완료
- [x] 환경변수 설정 구현
- [x] 메모리 시스템과 연동
- [ ] 스트리밍 응답 구현
- [ ] 비용 추적 시스템 구축
- [ ] A/B 테스트 환경 구성

---

**마지막 업데이트**: 2025-08-10 16:45 KST