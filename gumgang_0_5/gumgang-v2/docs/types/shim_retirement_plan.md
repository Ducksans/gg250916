# Type Shim 은퇴 계획

> 작성일: 2025-01-09  
> 프로젝트: Gumgang 2.0  
> 현재 상태: Shim 타입 4종 운영 중

## 📋 개요

PHASE-3에서 생성된 임시 타입 정의(Shim) 파일들을 공식 타입 패키지로 전환하는 계획입니다.
현재 3D 및 파서 관련 4개의 shim 파일이 운영 중이며, 단계적으로 공식 타입으로 교체할 예정입니다.

## 🎯 목표

- **단기**: Parser shim을 공식 타입으로 교체 (1주)
- **중기**: Tween.js shim 제거 및 공식 패키지 도입 (2주)
- **장기**: Three.js/R3F shim 완전 제거 (3주)

## 📦 현재 Shim 파일 현황

| Shim 파일 | 라인 수 | 용도 | 영향 범위 | 우선순위 |
|----------|---------|------|-----------|----------|
| `types/parser-shim.d.ts` | 285 | TypeScript/JS 파서 | `services/CodeStructureAnalyzer.ts` | 높음 |
| `types/tween-shim.d.ts` | 118 | 애니메이션 라이브러리 | `services/Code3DVisualizationEngine.ts` | 중간 |
| `types/three-shim.d.ts` | 369 | 3D 그래픽 라이브러리 | 모든 visualization 컴포넌트 | 낮음 |
| `types/r3f-shim.d.ts` | 488 | React Three Fiber | 3D 컴포넌트 3개 | 낮음 |

## 🔄 Phase 1: Parser Shim 제거

### 대상
- `types/parser-shim.d.ts`

### 필요 패키지
```bash
npm install --save-dev \
  @typescript-eslint/parser@latest \
  @types/eslint@latest \
  acorn@latest \
  @types/acorn@latest \
  acorn-walk@latest
```

### 마이그레이션 체크리스트

- [ ] 패키지 버전 호환성 확인
  ```bash
  npm ls @typescript-eslint/parser
  npm ls acorn
  ```

- [ ] Import 경로 수정
  ```typescript
  // Before (shim)
  import { parse } from '@typescript-eslint/parser';
  
  // After (official)
  import { parse } from '@typescript-eslint/parser';
  // 동일하므로 수정 불필요, shim만 제거
  ```

- [ ] 타입 호환성 검증
  ```bash
  # Shim 제거 전 타입 체크
  npm run type-check
  
  # Shim 백업
  mv types/parser-shim.d.ts types/parser-shim.d.ts.backup
  
  # 공식 타입으로 테스트
  npm run type-check
  ```

- [ ] 영향받는 파일 테스트
  - `services/CodeStructureAnalyzer.ts`
  - 관련 유닛 테스트 실행

### 롤백 계획
```bash
# Shim 복구
mv types/parser-shim.d.ts.backup types/parser-shim.d.ts

# 패키지 제거 (필요시)
npm uninstall @types/acorn @types/eslint
```

## 🎬 Phase 2: Tween.js Shim 제거

### 대상
- `types/tween-shim.d.ts`

### 필요 패키지
```bash
npm install --save \
  @tweenjs/tween.js@latest
```

### 마이그레이션 체크리스트

- [ ] 패키지 설치 및 버전 확인
  ```bash
  npm info @tweenjs/tween.js
  ```

- [ ] Import 경로 수정
  ```typescript
  // Before (shim)
  import { TWEEN } from '@tweenjs/tween.js';
  
  // After (official) - 동일
  import { TWEEN } from '@tweenjs/tween.js';
  ```

- [ ] API 호환성 확인
  - Tween 생성 방식
  - Easing 함수
  - Animation loop 통합

- [ ] 성능 벤치마크
  ```typescript
  // 애니메이션 성능 테스트
  console.time('tween-performance');
  // ... TWEEN 애니메이션 실행
  console.timeEnd('tween-performance');
  ```

### 영향 범위
- `services/Code3DVisualizationEngine.ts`
- 3D 노드 애니메이션 기능

## 🌐 Phase 3: Three.js & R3F Shim 제거

### 대상
- `types/three-shim.d.ts`
- `types/r3f-shim.d.ts`

### 필요 패키지
```bash
npm install --save \
  three@latest \
  @react-three/fiber@latest \
  @react-three/drei@latest

npm install --save-dev \
  @types/three@latest
```

### 사전 준비 사항

#### 1. 버전 매트릭스 확인
| 패키지 | 현재 Shim 기준 | 권장 버전 | 호환성 |
|--------|---------------|-----------|--------|
| three | 0.150.0 | ^0.160.0 | ✅ |
| @react-three/fiber | 8.0.0 | ^8.15.0 | ✅ |
| @react-three/drei | 9.0.0 | ^9.88.0 | ⚠️ 검증 필요 |

#### 2. Breaking Changes 확인
```bash
# Three.js 마이그레이션 가이드 확인
curl https://threejs.org/docs/index.html#manual/en/introduction/Migration-guide

# R3F 변경사항 확인
npm info @react-three/fiber
```

### 마이그레이션 체크리스트

- [ ] **Step 1: Three.js 기본 타입**
  ```bash
  npm install --save-dev @types/three@latest
  rm types/three-shim.d.ts
  npm run type-check
  ```

- [ ] **Step 2: R3F 타입**
  ```bash
  npm install @react-three/fiber@latest
  rm types/r3f-shim.d.ts
  ```

- [ ] **Step 3: Drei 컴포넌트**
  ```bash
  npm install @react-three/drei@latest
  ```

- [ ] **Step 4: Import 경로 검증**
  ```typescript
  // Three.js imports
  import * as THREE from 'three';
  import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
  
  // R3F imports
  import { Canvas, useFrame } from '@react-three/fiber';
  import { OrbitControls, Box } from '@react-three/drei';
  ```

### 영향받는 컴포넌트

1. **서비스 레이어**
   - `services/Code3DVisualizationEngine.ts`

2. **컴포넌트 레이어**
   - `components/visualization/Code3DViewer.tsx`
   - `components/visualization/Memory3D.tsx`
   - `components/visualization/SystemGrid3D.tsx`

### 호환성 테스트 시나리오

```typescript
// 1. 기본 렌더링 테스트
describe('3D Rendering', () => {
  test('Scene 초기화', () => {
    const scene = new THREE.Scene();
    expect(scene).toBeDefined();
  });
  
  test('Camera 설정', () => {
    const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
    expect(camera.fov).toBe(75);
  });
});

// 2. R3F 컴포넌트 테스트
describe('R3F Components', () => {
  test('Canvas 렌더링', () => {
    render(<Canvas><Box /></Canvas>);
    // ... assertions
  });
});
```

## 📊 진행 상황 추적

### 메트릭 대시보드

```typescript
interface ShimRetirementMetrics {
  phase: 1 | 2 | 3;
  shimsRemaining: number;
  officialPackagesInstalled: string[];
  typeErrors: number;
  performanceImpact: number; // percentage
  rollbacksExecuted: number;
}
```

### 주간 마일스톤

| 주차 | Phase | 목표 | 상태 |
|------|-------|------|------|
| W1 | Phase 1 | Parser shim 제거 | 🔄 진행중 |
| W2 | Phase 2 | Tween.js 공식 타입 | ⏳ 대기 |
| W3 | Phase 3-1 | Three.js 타입 | ⏳ 대기 |
| W4 | Phase 3-2 | R3F 완전 제거 | ⏳ 대기 |

## 🔧 자동화 스크립트

### Shim 제거 스크립트

```bash
#!/bin/bash
# shim-retire.sh

PHASE=$1
BACKUP_DIR="types/backup"

# 백업 디렉토리 생성
mkdir -p $BACKUP_DIR

case $PHASE in
  1)
    echo "Phase 1: Parser shim 제거 중..."
    mv types/parser-shim.d.ts $BACKUP_DIR/
    npm install --save-dev @types/acorn @types/eslint
    ;;
  2)
    echo "Phase 2: Tween.js shim 제거 중..."
    mv types/tween-shim.d.ts $BACKUP_DIR/
    npm install @tweenjs/tween.js
    ;;
  3)
    echo "Phase 3: Three.js/R3F shim 제거 중..."
    mv types/three-shim.d.ts $BACKUP_DIR/
    mv types/r3f-shim.d.ts $BACKUP_DIR/
    npm install three @react-three/fiber @react-three/drei
    npm install --save-dev @types/three
    ;;
  *)
    echo "Usage: ./shim-retire.sh [1|2|3]"
    exit 1
    ;;
esac

# 타입 체크
npm run type-check

if [ $? -eq 0 ]; then
  echo "✅ Phase $PHASE 완료!"
else
  echo "❌ 타입 에러 발생, 롤백 필요"
  exit 1
fi
```

### 롤백 스크립트

```bash
#!/bin/bash
# shim-rollback.sh

PHASE=$1
BACKUP_DIR="types/backup"

case $PHASE in
  1)
    echo "Phase 1 롤백 중..."
    mv $BACKUP_DIR/parser-shim.d.ts types/
    npm uninstall @types/acorn @types/eslint
    ;;
  2)
    echo "Phase 2 롤백 중..."
    mv $BACKUP_DIR/tween-shim.d.ts types/
    npm uninstall @tweenjs/tween.js
    ;;
  3)
    echo "Phase 3 롤백 중..."
    mv $BACKUP_DIR/three-shim.d.ts types/
    mv $BACKUP_DIR/r3f-shim.d.ts types/
    npm uninstall three @react-three/fiber @react-three/drei @types/three
    ;;
esac

echo "✅ 롤백 완료!"
```

## ⚠️ 위험 요소 및 대응 방안

### 1. 버전 불일치
- **위험**: Shim과 공식 타입의 API 차이
- **대응**: 단계별 마이그레이션, 충분한 테스트

### 2. 번들 크기 증가
- **위험**: 공식 패키지가 더 큰 경우
- **대응**: Tree shaking 최적화, 동적 import

### 3. 성능 저하
- **위험**: 공식 타입의 복잡도로 인한 컴파일 시간 증가
- **대응**: tsconfig 최적화, 증분 빌드 활용

### 4. 서드파티 호환성
- **위험**: 다른 라이브러리와의 타입 충돌
- **대응**: peerDependencies 버전 관리

## 📚 참고 자료

- [Three.js TypeScript Guide](https://threejs.org/docs/#manual/en/introduction/Typescript)
- [React Three Fiber Migration](https://docs.pmnd.rs/react-three-fiber/getting-started/migration-guide)
- [TypeScript Declaration Files](https://www.typescriptlang.org/docs/handbook/declaration-files/introduction.html)

## ✅ 최종 체크리스트

- [ ] 모든 shim 파일 백업 완료
- [ ] 공식 패키지 버전 확정
- [ ] 영향 범위 분석 완료
- [ ] 테스트 시나리오 작성
- [ ] 롤백 계획 수립
- [ ] 팀 공유 및 승인
- [ ] 성능 기준선 측정
- [ ] 문서 업데이트

---

*이 문서는 Gumgang 2.0 TypeScript 마이그레이션 프로젝트의 일부입니다.*