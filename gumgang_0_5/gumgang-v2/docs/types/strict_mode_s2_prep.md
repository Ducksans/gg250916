# Strict Mode Stage 2 준비 문서

> 작성일: 2025-01-09  
> 프로젝트: Gumgang 2.0  
> 현재 상태: Stage 1 진행 중  
> 목표: Stage 2 (Null Safety) 준비

## 📋 개요

Stage 2는 TypeScript의 null 안정성과 함수 타입 엄격성을 강화하는 단계입니다.
Stage 1 안정화 완료 후 진행하며, 예상 작업량이 가장 큰 단계입니다.

## 🎯 Stage 2 목표 설정

### 활성화 예정 옵션

```json
{
  "compilerOptions": {
    "strictNullChecks": true,        // null/undefined 엄격 체크
    "strictFunctionTypes": true,     // 함수 타입 공변/반공변
    "strictBindCallApply": true,     // bind/call/apply 타입 체크
    "exactOptionalPropertyTypes": true,  // 선택적 속성 정확성
    "noImplicitThis": true          // 암묵적 this 금지
  }
}
```

## 🔍 사전 영향 분석

### 1. strictNullChecks 영향 범위

#### 예상 에러 패턴
```typescript
// ❌ Before (Stage 1)
function getValue(obj: { value?: string }) {
  return obj.value.toUpperCase(); // Runtime error possible
}

// ✅ After (Stage 2)
function getValue(obj: { value?: string }) {
  return obj.value?.toUpperCase() ?? '';
}
```

#### 주요 영향 영역
- **API 응답 처리**: 모든 외부 데이터 null 체크 필요
- **상태 관리**: useState 초기값 undefined 처리
- **Props**: 선택적 props의 기본값 처리
- **배열 접근**: 인덱스 접근 시 undefined 가능성

### 2. strictFunctionTypes 영향 범위

#### 예상 에러 패턴
```typescript
// ❌ Before
type Handler = (e: MouseEvent | KeyboardEvent) => void;
const clickHandler: Handler = (e: MouseEvent) => {}; // Error in Stage 2

// ✅ After
const clickHandler: Handler = (e: MouseEvent | KeyboardEvent) => {
  if (e instanceof MouseEvent) {
    // mouse-specific logic
  }
};
```

### 3. 예상 에러 수량

| 컴포넌트 카테고리 | 예상 에러 | 난이도 |
|-----------------|----------|--------|
| Pages (12개) | ~100 | 중간 |
| Components (20개) | ~150 | 높음 |
| Hooks (5개) | ~30 | 높음 |
| Services (3개) | ~20 | 낮음 |
| **총계** | **~300** | - |

## 🛠 준비 작업

### Phase 1: 코드 정리 (Stage 1 완료 후)

#### 1. Null 체크 패턴 표준화
```typescript
// utils/null-guards.ts
export function isDefined<T>(value: T | undefined | null): value is T {
  return value !== undefined && value !== null;
}

export function assertDefined<T>(
  value: T | undefined | null,
  message?: string
): asserts value is T {
  if (value === undefined || value === null) {
    throw new Error(message ?? 'Value is not defined');
  }
}
```

#### 2. 기본값 헬퍼 함수
```typescript
// utils/defaults.ts
export const withDefault = <T>(value: T | undefined, defaultValue: T): T => {
  return value ?? defaultValue;
};

export const withDefaultObject = <T extends object>(
  partial: Partial<T>,
  defaults: T
): T => {
  return { ...defaults, ...partial };
};
```

### Phase 2: 점진적 마이그레이션

#### 1. 파일별 활성화 전략
```typescript
// @ts-strict-check 주석으로 파일별 적용
// 이 방법은 TypeScript 5.0+에서 지원
```

#### 2. 우선순위 기반 수정
1. **Critical Path**: 사용자 인터페이스 직접 영향
2. **Core Logic**: 비즈니스 로직 및 데이터 처리
3. **Utilities**: 헬퍼 함수 및 유틸리티
4. **Tests**: 테스트 코드

## 📊 측정 지표

### 성공 기준
- [ ] 컴파일 에러 0개
- [ ] 런타임 null 에러 50% 감소
- [ ] 타입 커버리지 95% 이상
- [ ] 빌드 시간 증가 20% 이내

### 모니터링 지표
```typescript
interface Stage2Metrics {
  totalErrors: number;
  nullCheckErrors: number;
  functionTypeErrors: number;
  thisBindingErrors: number;
  fixedErrors: number;
  remainingErrors: number;
  estimatedHours: number;
}
```

## 🧪 테스트 계획

### 1. 유닛 테스트 강화
```typescript
// null 안정성 테스트 추가
describe('Null Safety Tests', () => {
  test('handles undefined props gracefully', () => {
    const result = Component({ data: undefined });
    expect(result).toBeDefined();
  });
  
  test('handles null API responses', () => {
    const response = null;
    const processed = processApiResponse(response);
    expect(processed).toEqual(defaultValue);
  });
});
```

### 2. 통합 테스트
- API 응답 null 처리
- 상태 전환 중 undefined 처리
- 사용자 입력 검증

## 🔄 롤백 계획

### 즉시 롤백 조건
1. **에러 수 500개 초과**
2. **빌드 시간 30% 이상 증가**
3. **핵심 기능 작동 불가**

### 롤백 스크립트
```bash
#!/bin/bash
# rollback-stage2.sh

echo "Rolling back Stage 2..."

# Restore tsconfig
cp tsconfig.stage1.backup.json tsconfig.json

# Clear build cache
rm -rf .next
rm -rf node_modules/.cache

# Rebuild
npm run build

echo "Rollback complete"
```

## 📝 체크리스트

### 사전 준비
- [ ] Stage 1 완전 안정화 확인
- [ ] 현재 null 에러 패턴 분석
- [ ] 팀 교육 자료 준비
- [ ] 롤백 계획 검토

### 기술적 준비
- [ ] Null 가드 유틸리티 함수 작성
- [ ] 기본값 처리 전략 수립
- [ ] 타입 narrowing 패턴 정의
- [ ] 테스트 케이스 보강

### 문서화
- [ ] 마이그레이션 가이드 작성
- [ ] 일반적인 패턴 및 해결책
- [ ] FAQ 준비

## 🚀 실행 계획

### Week 1: 준비 및 분석
- Day 1-2: Stage 1 완료 확인
- Day 3-4: 영향 분석 및 측정
- Day 5: 팀 교육 및 준비

### Week 2: 실행
- Day 1: tsconfig.json 수정
- Day 2-4: 에러 수정 (페이지/컴포넌트)
- Day 5: 테스트 및 검증

### Week 3: 안정화
- Day 1-2: 남은 에러 처리
- Day 3: 성능 측정
- Day 4-5: 문서 업데이트

## 🎓 팀 교육 자료

### 핵심 개념
1. **Null vs Undefined**
   - null: 명시적 "값 없음"
   - undefined: 초기화되지 않음

2. **Type Guards**
   ```typescript
   if (value !== null && value !== undefined) {
     // value is defined
   }
   ```

3. **Optional Chaining**
   ```typescript
   const result = obj?.property?.method?.();
   ```

4. **Nullish Coalescing**
   ```typescript
   const value = input ?? defaultValue;
   ```

## ⚠️ 주의사항

1. **외부 라이브러리**
   - 타입 정의가 없는 라이브러리 처리
   - @types 패키지 버전 확인

2. **레거시 코드**
   - 점진적 마이그레이션 필요
   - 임시 @ts-expect-error 사용 가능

3. **성능 영향**
   - 컴파일 시간 증가 예상
   - 증분 빌드 최적화 필요

## 📌 참고 자료

- [TypeScript Strict Null Checks](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-2-0.html#strict-null-checks)
- [Function Types Best Practices](https://www.typescriptlang.org/docs/handbook/2/functions.html)
- [Migration Strategies](https://www.typescriptlang.org/docs/handbook/migrating-from-javascript.html)

---

*이 문서는 Stage 2 준비를 위한 가이드입니다.*
*Stage 1 완료 후 본격 실행 예정입니다.*