# TypeScript Strict 모드 전환 계획

> 작성일: 2025-01-09  
> 프로젝트: Gumgang 2.0  
> 현재 상태: TypeScript 100% 복구 완료 (@ts-nocheck: 0)

## 📋 개요

본 문서는 Gumgang 2.0 프로젝트의 TypeScript Strict 모드를 단계적으로 활성화하는 전략을 제시합니다.
현재 `tsconfig.json`의 `strict: false` 상태에서 완전한 타입 안정성을 달성하기 위한 3단계 전환 계획입니다.

## 🎯 목표

- **단기 (1주)**: 기본적인 타입 안정성 확보
- **중기 (2주)**: Null 안정성 및 함수 타입 강화
- **장기 (3주)**: 완전한 Strict 모드 활성화

## 📊 현재 상태

```json
{
  "compilerOptions": {
    "strict": false,
    "strictNullChecks": false,
    "strictFunctionTypes": false,
    "strictBindCallApply": false,
    "strictPropertyInitialization": false,
    "noImplicitThis": false,
    "noImplicitAny": false,
    "alwaysStrict": false
  }
}
```

## 🚀 Stage 1: 안전 단계 (Safe Stage)

### 기간
- 1주차 (D+1 ~ D+7)

### 활성화 옵션

```json
{
  "compilerOptions": {
    "noImplicitAny": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noUncheckedIndexedAccess": true,
    "noFallthroughCasesInSwitch": true
  }
}
```

### 옵션별 상세 설명

| 옵션 | 설명 | 예상 영향 |
|------|------|----------|
| `noImplicitAny` | 암묵적 any 타입 금지 | ~50개 에러 예상 |
| `noUnusedLocals` | 사용하지 않는 지역 변수 금지 | ~20개 경고 |
| `noUnusedParameters` | 사용하지 않는 매개변수 금지 | ~30개 경고 |
| `noUncheckedIndexedAccess` | 인덱스 접근 시 undefined 체크 강제 | ~40개 에러 |
| `noFallthroughCasesInSwitch` | switch문 fallthrough 금지 | ~5개 에러 |

### 예상 작업

```typescript
// Before
function processData(data) {  // Error: 'data' implicitly has 'any' type
  return data.value;
}

// After
function processData(data: { value: string }) {
  return data.value;
}
```

### 롤백 조건
- 컴파일 에러 100개 초과
- 빌드 시간 10% 이상 증가
- 핵심 기능 런타임 에러 발생

### 측정 지표
- **에러 수**: 목표 100개 이하
- **빌드 시간**: 현재 대비 +5% 이내
- **코드 커버리지**: 유지 또는 상승

## 🔧 Stage 2: 중간 단계 (Intermediate Stage)

### 기간
- 2주차 (D+8 ~ D+14)

### 활성화 옵션

```json
{
  "compilerOptions": {
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictBindCallApply": true,
    "exactOptionalPropertyTypes": true,
    "noImplicitThis": true
  }
}
```

### 옵션별 상세 설명

| 옵션 | 설명 | 예상 영향 |
|------|------|----------|
| `strictNullChecks` | null/undefined 엄격 체크 | ~200개 에러 예상 |
| `strictFunctionTypes` | 함수 타입 공변/반공변 체크 | ~50개 에러 |
| `strictBindCallApply` | bind/call/apply 타입 체크 | ~20개 에러 |
| `exactOptionalPropertyTypes` | 선택적 속성 정확한 타입 | ~30개 에러 |
| `noImplicitThis` | 암묵적 this 타입 금지 | ~10개 에러 |

### 예상 작업

```typescript
// Before
function getLength(str: string | null) {
  return str.length;  // Error: 'str' is possibly 'null'
}

// After
function getLength(str: string | null) {
  return str?.length ?? 0;
}
```

### 롤백 조건
- 컴파일 에러 300개 초과
- 주요 컴포넌트 타입 호환성 문제
- 테스트 실패율 5% 초과

### 측정 지표
- **Null 관련 런타임 에러**: 0건
- **타입 커버리지**: 95% 이상
- **빌드 시간**: Stage 1 대비 +10% 이내

## 🏁 Stage 3: 최종 단계 (Final Stage)

### 기간
- 3주차 (D+15 ~ D+21)

### 활성화 옵션

```json
{
  "compilerOptions": {
    "strict": true,
    "useUnknownInCatchVariables": true,
    "noPropertyAccessFromIndexSignature": true,
    "noImplicitOverride": true,
    "allowUnreachableCode": false,
    "allowUnusedLabels": false
  }
}
```

### 옵션별 상세 설명

| 옵션 | 설명 | 예상 영향 |
|------|------|----------|
| `strict` | 모든 strict 옵션 활성화 | 통합 효과 |
| `useUnknownInCatchVariables` | catch 변수를 unknown으로 | ~30개 수정 |
| `noPropertyAccessFromIndexSignature` | 인덱스 시그니처 접근 제한 | ~20개 수정 |
| `noImplicitOverride` | override 키워드 강제 | ~15개 수정 |
| `allowUnreachableCode` | 도달 불가능 코드 금지 | ~5개 수정 |

### 예상 작업

```typescript
// Before
try {
  doSomething();
} catch (e) {
  console.log(e.message);  // Error: 'e' is of type 'unknown'
}

// After
try {
  doSomething();
} catch (e) {
  if (e instanceof Error) {
    console.log(e.message);
  }
}
```

### 롤백 조건
- 성능 저하 10% 초과
- 개발 생산성 현저한 저하
- 서드파티 라이브러리 호환성 문제

### 측정 지표
- **타입 안정성**: 100%
- **런타임 에러**: 이전 대비 50% 감소
- **코드 품질 점수**: A등급 달성

## 📈 진행 상황 추적

### 대시보드 메트릭

```typescript
interface StrictModeMetrics {
  stage: 1 | 2 | 3;
  errorsFixed: number;
  errorsRemaining: number;
  buildTime: number;  // seconds
  typesCoverage: number;  // percentage
  runtimeErrors: number;
  rollbackCount: number;
}
```

### 주간 체크포인트

- [ ] **W1**: Stage 1 완료, 에러 100개 이하
- [ ] **W2**: Stage 2 완료, Null 안정성 확보
- [ ] **W3**: Stage 3 완료, 완전한 Strict 모드

## 🔄 롤백 계획

### 즉시 롤백 트리거
1. **빌드 실패**: 프로덕션 빌드 불가
2. **성능 저하**: 15% 이상 느려짐
3. **호환성 문제**: 핵심 라이브러리 작동 불가

### 롤백 프로세스

```bash
# 1. Git 체크포인트로 복구
git checkout strict-mode-checkpoint-{stage}

# 2. tsconfig.json 원복
cp tsconfig.backup.json tsconfig.json

# 3. 타입 에러 무시 (임시)
npm run build -- --force

# 4. 문제 분석 및 재계획
npm run type-check -- --stats
```

## 🛠 도구 및 스크립트

### 타입 검사 스크립트

```json
{
  "scripts": {
    "type-check": "tsc --noEmit",
    "type-check:stats": "tsc --noEmit --diagnostics",
    "type-check:strict-1": "tsc --noEmit --strict false --noImplicitAny true",
    "type-check:strict-2": "tsc --noEmit --strictNullChecks true",
    "type-check:strict-3": "tsc --noEmit --strict true"
  }
}
```

### 진행 상황 모니터링

```bash
# 에러 카운트
npm run type-check 2>&1 | grep -c "error TS"

# 빌드 시간 측정
time npm run build

# 타입 커버리지
npx type-coverage --detail
```

## 📚 참고 자료

- [TypeScript Compiler Options](https://www.typescriptlang.org/tsconfig)
- [Strict Mode Best Practices](https://www.typescriptlang.org/docs/handbook/2/basic-types.html#strictness)
- [Migration Guide](https://www.typescriptlang.org/docs/handbook/migrating-from-javascript.html)

## ⚠️ 주의사항

1. **점진적 적용**: 한 번에 모든 옵션 활성화 금지
2. **팀 공유**: 각 단계 시작 전 팀 전체 공유
3. **백업 필수**: tsconfig.json 변경 전 백업
4. **테스트 우선**: 각 단계마다 전체 테스트 실행
5. **문서화**: 발생한 문제와 해결 방법 기록

## 📅 일정표

| 주차 | Stage | 주요 작업 | 담당자 | 상태 |
|------|-------|----------|--------|------|
| W1 | Stage 1 | 기본 타입 안정성 | - | 대기 |
| W2 | Stage 2 | Null 체크 강화 | - | 대기 |
| W3 | Stage 3 | 완전 Strict 모드 | - | 대기 |
| W4 | 검증 | 최종 검증 및 최적화 | - | 대기 |

---

*이 문서는 Gumgang 2.0 TypeScript 마이그레이션 프로젝트의 일부입니다.*