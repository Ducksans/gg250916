# 📋 금강 2.0 마이그레이션 가이드

> 기존 금강 시스템에서 2.0 리팩토링 버전으로 안전하게 마이그레이션하는 방법

**버전**: 1.x → 2.0  
**작성일**: 2025-08-08  
**난이도**: ⭐⭐⭐ (중급)

---

## 📑 목차

1. [개요](#개요)
2. [주요 변경사항](#주요-변경사항)
3. [단계별 마이그레이션](#단계별-마이그레이션)
4. [Import 경로 매핑](#import-경로-매핑)
5. [코드 변경 예시](#코드-변경-예시)
6. [API 변경사항](#api-변경사항)
7. [문제 해결](#문제-해결)
8. [체크리스트](#체크리스트)

---

## 개요

금강 2.0 리팩토링은 순환참조 해결, 모듈화 개선, 중앙 시스템 관리를 목표로 진행되었습니다.
기존 코드는 하위 호환성을 위해 유지되지만, 새로운 구조로 점진적 마이그레이션을 권장합니다.

### 🎯 마이그레이션 목표

- ✅ 순환참조 완전 제거
- ✅ 의존성 주입 패턴 적용
- ✅ 중앙 시스템 매니저 활용
- ✅ 테스트 가능성 향상

---

## 주요 변경사항

### 1. 🏗️ 프로젝트 구조 변경

**이전 구조:**
```
backend/
├── temporal_memory.py
├── meta_cognitive_system.py
├── creative_association_engine.py
├── dream_system/
│   └── dream_system.py
├── emotional_empathy_system.py
└── *.py (혼재된 테스트 파일들)
```

**새로운 구조:**
```
backend/
├── app/
│   ├── core/
│   │   ├── system_manager.py      # 🆕 중앙 관리자
│   │   ├── memory/
│   │   │   └── temporal.py        # 이전: temporal_memory.py
│   │   └── cognition/
│   │       └── meta.py            # 이전: meta_cognitive_system.py
│   ├── engines/
│   │   ├── creative.py            # 이전: creative_association_engine.py
│   │   ├── dream.py               # 이전: dream_system/dream_system.py
│   │   └── empathy.py             # 이전: emotional_empathy_system.py
│   └── [기존 파일들 - 호환성 유지]
└── tests/                         # 🆕 체계화된 테스트
    ├── unit/
    ├── integration/
    └── experiments/
```

### 2. 🔄 시스템 초기화 방식 변경

**이전: 개별 초기화**
```python
# 각 시스템을 개별적으로 초기화
temporal_memory = TemporalMemory()
meta_cognitive = MetaCognitiveSystem()
creative_engine = CreativeAssociationEngine()
```

**현재: 중앙 매니저 사용**
```python
# 시스템 매니저를 통한 통합 초기화
from app.core.system_manager import get_system_manager

manager = get_system_manager()
await manager.initialize()
```

### 3. 🔗 의존성 주입

**이전: 직접 참조**
```python
class CreativeEngine:
    def __init__(self):
        self.memory = TemporalMemory()  # 직접 생성
```

**현재: 의존성 주입**
```python
class CreativeEngine:
    def inject_dependencies(self, deps: Dict[str, Any]):
        self.memory = deps['temporal_memory']  # 주입받음
```

---

## 단계별 마이그레이션

### Step 1: 백업 생성 ⚠️

```bash
# 현재 코드 백업
cp -r backend/ backend_backup_$(date +%Y%m%d_%H%M%S)

# Git을 사용하는 경우
git checkout -b pre-migration-backup
git commit -am "Backup before migration to 2.0"
```

### Step 2: 새 구조 설치

```bash
# 최신 버전 가져오기
git pull origin gumgang-2.0

# 의존성 설치
pip install -r requirements.txt
pip install scipy scikit-learn numpy  # 전체 기능용
```

### Step 3: Import 경로 업데이트

#### 자동 변환 스크립트

```python
#!/usr/bin/env python3
"""
import_migrator.py - Import 경로 자동 변환
"""

import os
import re
from pathlib import Path

# Import 매핑 정의
IMPORT_MAPPINGS = {
    r'from temporal_memory import': 'from app.core.memory.temporal import',
    r'from meta_cognitive_system import': 'from app.core.cognition.meta import',
    r'from creative_association_engine import': 'from app.engines.creative import',
    r'from dream_system.dream_system import': 'from app.engines.dream import',
    r'from emotional_empathy_system import': 'from app.engines.empathy import',
    r'import temporal_memory': 'import app.core.memory.temporal as temporal_memory',
    r'import meta_cognitive_system': 'import app.core.cognition.meta as meta_cognitive_system',
}

def migrate_file(filepath):
    """파일의 import 구문 마이그레이션"""
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    original = content
    for old_pattern, new_pattern in IMPORT_MAPPINGS.items():
        content = re.sub(old_pattern, new_pattern, content)
    
    if content != original:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"✅ 마이그레이션 완료: {filepath}")
        return True
    return False

def migrate_directory(directory):
    """디렉토리 전체 마이그레이션"""
    migrated_count = 0
    for py_file in Path(directory).rglob('*.py'):
        if migrate_file(py_file):
            migrated_count += 1
    
    print(f"\n총 {migrated_count}개 파일 마이그레이션 완료")

if __name__ == "__main__":
    # 현재 프로젝트의 파일들 마이그레이션
    migrate_directory(".")
```

사용법:
```bash
python import_migrator.py
```

### Step 4: 시스템 초기화 코드 변경

#### 이전 코드:
```python
# old_app.py
import asyncio
from temporal_memory import TemporalMemory
from meta_cognitive_system import MetaCognitiveSystem

class OldApp:
    def __init__(self):
        self.temporal_memory = TemporalMemory()
        self.meta_cognitive = MetaCognitiveSystem()
        self.meta_cognitive.temporal_memory = self.temporal_memory
        
    async def run(self):
        # 앱 로직
        pass

# 실행
app = OldApp()
asyncio.run(app.run())
```

#### 새 코드:
```python
# new_app.py
import asyncio
from app.core.system_manager import SystemConfig, get_system_manager

class NewApp:
    def __init__(self):
        self.manager = None
        
    async def initialize(self):
        config = SystemConfig(
            enable_temporal_memory=True,
            enable_meta_cognitive=True,
            enable_creative=True,
            enable_dream=True,
            enable_empathy=True
        )
        
        self.manager = get_system_manager(config)
        await self.manager.initialize()
        
    async def run(self):
        await self.initialize()
        
        # 시스템 접근
        temporal_memory = self.manager.temporal_memory
        meta_cognitive = self.manager.meta_cognitive
        
        # 앱 로직
        
        # 종료 시
        await self.manager.shutdown()

# 실행
app = NewApp()
asyncio.run(app.run())
```

### Step 5: 테스트 코드 이동

```bash
# 테스트 파일 재구성
mkdir -p tests/unit tests/integration tests/experiments

# 단위 테스트 이동
mv test_*.py tests/unit/
mv gpt_*.py tests/unit/

# 실험 코드 이동
mv semantic_router_test.py tests/experiments/
mv *_experiment.py tests/experiments/
```

---

## Import 경로 매핑

### 클래스별 매핑

| 이전 Import | 새 Import |
|------------|----------|
| `from temporal_memory import TemporalMemory` | `from app.core.memory.temporal import TemporalMemory` |
| `from meta_cognitive_system import MetaCognitiveSystem` | `from app.core.cognition.meta import MetaCognitiveSystem` |
| `from creative_association_engine import CreativeAssociationEngine` | `from app.engines.creative import CreativeAssociationEngine` |
| `from dream_system.dream_system import DreamSystem` | `from app.engines.dream import DreamSystem` |
| `from emotional_empathy_system import EmotionalEmpathySystem` | `from app.engines.empathy import EmotionalEmpathySystem` |

### 함수별 매핑

| 이전 | 새 |
|-----|-----|
| `get_meta_cognitive_system()` | `get_metacognitive_system()` (별칭 유지) |
| 개별 초기화 함수들 | `SystemManager.initialize()` |

---

## 코드 변경 예시

### 예시 1: FastAPI 앱

**이전:**
```python
# main.py
from fastapi import FastAPI
from temporal_memory import TemporalMemory
from meta_cognitive_system import MetaCognitiveSystem

app = FastAPI()

# 전역 시스템
temporal_memory = TemporalMemory()
meta_cognitive = MetaCognitiveSystem()

@app.post("/chat")
async def chat(message: str):
    # 메모리 저장
    await temporal_memory.store_memory(message)
    # 처리
    response = await meta_cognitive.process(message)
    return {"response": response}
```

**현재:**
```python
# main.py
from fastapi import FastAPI
from contextlib import asynccontextmanager
from app.core.system_manager import SystemConfig, get_system_manager

# 생명주기 관리
@asynccontextmanager
async def lifespan(app: FastAPI):
    # 시작 시 초기화
    config = SystemConfig(
        enable_temporal_memory=True,
        enable_meta_cognitive=True
    )
    app.state.manager = get_system_manager(config)
    await app.state.manager.initialize()
    
    yield
    
    # 종료 시 정리
    await app.state.manager.shutdown()

app = FastAPI(lifespan=lifespan)

@app.post("/chat")
async def chat(message: str):
    manager = app.state.manager
    
    # 메모리 저장
    await manager.temporal_memory.store_memory(message)
    
    # 처리
    response = await manager.meta_cognitive.process(message)
    
    return {"response": response}
```

### 예시 2: 배치 처리 스크립트

**이전:**
```python
# batch_processor.py
import asyncio
from temporal_memory import TemporalMemory

async def process_batch(data):
    memory = TemporalMemory()
    
    for item in data:
        await memory.store_memory(item)
    
    results = await memory.search_memory("query")
    return results

# 실행
data = ["item1", "item2", "item3"]
results = asyncio.run(process_batch(data))
```

**현재:**
```python
# batch_processor.py
import asyncio
from app.core.system_manager import SystemConfig, get_system_manager

async def process_batch(data):
    # 시스템 매니저 사용
    config = SystemConfig(enable_temporal_memory=True)
    manager = get_system_manager(config)
    await manager.initialize()
    
    try:
        for item in data:
            await manager.temporal_memory.store_memory(item)
        
        results = await manager.temporal_memory.search_memory("query")
        return results
    finally:
        await manager.shutdown()

# 실행
data = ["item1", "item2", "item3"]
results = asyncio.run(process_batch(data))
```

---

## API 변경사항

### RESTful API 엔드포인트

| 이전 | 새 | 설명 |
|-----|-----|------|
| `POST /process` | `POST /api/v1/chat` | 표준화된 경로 |
| `GET /status` | `GET /api/v1/health` | 헬스 체크 |
| `GET /memory?q=` | `GET /api/v1/memory/search?query=` | 명확한 파라미터 |
| 없음 | `POST /api/v1/creative/associate` | 새 기능 |
| 없음 | `GET /api/v1/metrics` | 메트릭 조회 |

### WebSocket 변경

**이전:**
```javascript
const ws = new WebSocket('ws://localhost:8000/websocket');
ws.send('message');
```

**현재:**
```javascript
const ws = new WebSocket('ws://localhost:8000/ws');
ws.send(JSON.stringify({
  type: 'message',
  content: 'Hello',
  channel: 'chat'
}));
```

---

## 문제 해결

### 일반적인 마이그레이션 이슈

#### 1. ImportError 발생

**문제:**
```python
ImportError: cannot import name 'TemporalMemory' from 'temporal_memory'
```

**해결:**
```python
# 올바른 import 경로 사용
from app.core.memory.temporal import TemporalMemory

# 또는 하위 호환성을 위해 기존 파일 유지
# temporal_memory.py가 아직 존재하는 경우
```

#### 2. 순환참조 오류

**문제:**
```
ImportError: cannot import name 'X' from partially initialized module
```

**해결:**
```python
# 시스템 매니저를 통한 의존성 주입 사용
from app.core.system_manager import get_system_manager

manager = get_system_manager()
await manager.initialize()
# 이제 모든 시스템이 안전하게 초기화됨
```

#### 3. 비동기 함수 호출 오류

**문제:**
```python
RuntimeWarning: coroutine 'X' was never awaited
```

**해결:**
```python
# 모든 비동기 함수는 await 필요
result = await async_function()

# 또는 동기 컨텍스트에서
import asyncio
result = asyncio.run(async_function())
```

#### 4. 시스템 초기화 실패

**문제:**
```
ERROR: System initialization failed
```

**해결:**
```python
# 필요한 의존성 확인
pip install scipy numpy scikit-learn

# 선택적 시스템만 활성화
config = SystemConfig(
    enable_temporal_memory=True,
    enable_meta_cognitive=True,
    enable_creative=False,  # scipy 없으면 비활성화
    enable_dream=False,
    enable_empathy=False
)
```

---

## 체크리스트

### 마이그레이션 전 ✅

- [ ] 현재 코드 백업 완료
- [ ] 테스트 환경 준비
- [ ] 의존성 패키지 설치
- [ ] 팀원들에게 공지

### 마이그레이션 중 ✅

- [ ] Import 경로 변경
- [ ] 시스템 초기화 코드 수정
- [ ] API 엔드포인트 업데이트
- [ ] 테스트 파일 재구성
- [ ] 환경 변수 업데이트

### 마이그레이션 후 ✅

- [ ] 단위 테스트 실행
- [ ] 통합 테스트 실행
- [ ] API 엔드포인트 테스트
- [ ] 성능 벤치마크
- [ ] 문서 업데이트
- [ ] 팀 교육

---

## 추가 리소스

- 📚 [README.md](./README.md) - 전체 시스템 문서
- 📋 [REFACTORING_HANDOVER.md](./REFACTORING_HANDOVER.md) - 리팩토링 세부 내역
- 🧪 [tests/](./tests/) - 테스트 예시
- 💬 [GitHub Issues](https://github.com/your-org/gumgang-2.0/issues) - 질문 및 이슈

---

## 도움말

마이그레이션 중 문제가 발생하면:

1. `check_refactoring_status.py` 실행하여 상태 확인
2. 로그 파일 확인: `logs/migration.log`
3. 팀 채널에 질문
4. GitHub Issue 생성

---

<div align="center">
  <b>🚀 성공적인 마이그레이션을 위해 단계별로 신중하게 진행하세요!</b>
</div>