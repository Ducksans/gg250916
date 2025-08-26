# 🚀 금강 2.0 백엔드 시스템

> **Gumgang 2.0** - 차세대 AI 인지 시스템 백엔드  
> 시간적 메모리, 메타인지, 창의성, 꿈, 공감을 통합한 혁신적인 AI 아키텍처

[![Python Version](https://img.shields.io/badge/python-3.7%2B-blue)](https://www.python.org/)
[![Architecture](https://img.shields.io/badge/architecture-modular-green)](./docs/architecture.md)
[![Status](https://img.shields.io/badge/status-production--ready-success)](./REFACTORING_HANDOVER.md)

---

## 📋 목차

- [시스템 개요](#-시스템-개요)
- [핵심 특징](#-핵심-특징)
- [시스템 아키텍처](#-시스템-아키텍처)
- [설치 가이드](#-설치-가이드)
- [빠른 시작](#-빠른-시작)
- [API 문서](#-api-문서)
- [프론트엔드 연동](#-프론트엔드-연동)
- [시스템 구성요소](#-시스템-구성요소)
- [테스트](#-테스트)
- [문제 해결](#-문제-해결)
- [마이그레이션](#-마이그레이션)
- [기여하기](#-기여하기)

---

## 🌟 시스템 개요

금강 2.0은 인간의 인지 구조를 모방한 혁신적인 AI 백엔드 시스템입니다. 단순한 질의응답을 넘어 시간적 맥락 이해, 자기 인식, 창의적 사고, 꿈과 같은 무의식 처리, 그리고 깊은 공감 능력을 갖춘 차세대 AI 플랫폼입니다.

### 🎯 핵심 철학

- **모듈성**: 각 인지 기능이 독립적으로 작동하며 필요시 협업
- **확장성**: 새로운 인지 모듈을 쉽게 추가 가능
- **효율성**: 중앙 시스템 매니저를 통한 최적화된 리소스 관리
- **신뢰성**: 자동 복구 및 헬스 체크 메커니즘

---

## ✨ 핵심 특징

### 1. 🧠 **통합 인지 시스템**
- 시간적 메모리로 맥락 유지
- 메타인지로 자기 사고 모니터링
- 창의적 연상과 패턴 발견
- 꿈 시스템을 통한 무의식 처리
- 깊은 공감과 감정 이해

### 2. 🔄 **의존성 주입 패턴**
- 순환참조 완전 해결
- 깔끔한 의존성 관리
- 테스트 용이성

### 3. 📊 **실시간 모니터링**
- 시스템 헬스 체크
- 성능 메트릭 수집
- 자동 복구 메커니즘

### 4. 🔌 **프론트엔드 친화적**
- RESTful API 설계
- WebSocket 실시간 통신
- 명확한 응답 구조

---

## 🏗️ 시스템 아키텍처

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend Layer                        │
│                   (React/Vue/Next.js)                    │
└────────────────────┬────────────────────────────────────┘
                     │ REST API / WebSocket
┌────────────────────▼────────────────────────────────────┐
│                    API Gateway                           │
│                  (FastAPI Router)                        │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│               System Manager (중앙 관리)                  │
│  ┌──────────────────────────────────────────────────┐   │
│  │  • 시스템 초기화 및 종료                          │   │
│  │  • 의존성 주입 관리                              │   │
│  │  • 헬스 체크 및 모니터링                         │   │
│  │  • 자동 복구 메커니즘                            │   │
│  └──────────────────────────────────────────────────┘   │
└────────┬───────┬───────┬───────┬───────┬───────────────┘
         │       │       │       │       │
    ┌────▼──┐ ┌──▼──┐ ┌──▼──┐ ┌──▼──┐ ┌──▼──┐
    │Memory │ │Meta │ │Crea │ │Dream│ │Empa │
    │System │ │Cog  │ │tive │ │Sys  │ │thy  │
    └───────┘ └─────┘ └─────┘ └─────┘ └─────┘
```

### 📁 디렉토리 구조

```
backend/
├── app/
│   ├── core/                    # 핵심 시스템
│   │   ├── system_manager.py    # 🎛️ 중앙 관리자
│   │   ├── memory/              # 📦 메모리 시스템
│   │   │   └── temporal.py      
│   │   └── cognition/           # 🧠 인지 시스템
│   │       └── meta.py          
│   ├── engines/                 # 🚀 처리 엔진
│   │   ├── creative.py          # 🎨 창의 엔진
│   │   ├── dream.py             # 💭 꿈 시스템
│   │   └── empathy.py           # 💖 공감 시스템
│   ├── api/                     # 🔌 API 엔드포인트
│   │   ├── __init__.py
│   │   ├── routes/              # 라우트 정의
│   │   └── websockets/          # 실시간 통신
│   └── utils/                   # 🛠️ 유틸리티
├── tests/                       # 🧪 테스트
│   ├── unit/                    # 단위 테스트
│   ├── integration/             # 통합 테스트
│   └── experiments/             # 실험 코드
├── docs/                        # 📚 문서
├── requirements.txt             # 📦 의존성
└── README.md                    # 📖 이 파일
```

---

## 📦 설치 가이드

### 시스템 요구사항

- Python 3.7 이상
- 4GB RAM 이상 권장
- Ubuntu/macOS/Windows 지원

### 1. 저장소 클론

```bash
git clone https://github.com/your-org/gumgang-2.0.git
cd gumgang-2.0/backend
```

### 2. 가상환경 생성 (권장)

```bash
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
```

### 3. 의존성 설치

```bash
# 기본 패키지
pip install -r requirements.txt

# 전체 기능 활성화를 위한 추가 패키지
pip install scipy scikit-learn numpy
```

### 4. 환경 설정

```bash
# .env 파일 생성
cp .env.example .env

# 필요시 설정 수정
nano .env
```

---

## 🚀 빠른 시작

### 기본 사용법

```python
import asyncio
from app.core.system_manager import SystemConfig, get_system_manager

async def main():
    # 시스템 구성
    config = SystemConfig(
        enable_temporal_memory=True,
        enable_meta_cognitive=True,
        enable_creative=True,
        enable_dream=True,
        enable_empathy=True
    )
    
    # 시스템 초기화
    manager = get_system_manager(config)
    await manager.initialize()
    
    # 시스템 사용
    memory = manager.temporal_memory
    await memory.store_memory("안녕하세요", "greeting")
    
    # 시스템 종료
    await manager.shutdown()

# 실행
asyncio.run(main())
```

### FastAPI 서버 실행

```bash
# 개발 서버
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# 프로덕션 서버
gunicorn app.main:app -w 4 -k uvicorn.workers.UvicornWorker
```

---

## 📡 API 문서

### 주요 엔드포인트

#### 1. 시스템 상태

```http
GET /api/v1/health
```

**응답 예시:**
```json
{
  "status": "healthy",
  "uptime": "2h 15m",
  "systems": {
    "temporal_memory": true,
    "meta_cognitive": true,
    "creative_engine": true,
    "dream_system": true,
    "empathy_system": true
  },
  "metrics": {
    "total_requests": 1523,
    "avg_response_time": 45.2,
    "memory_usage": "512MB"
  }
}
```

#### 2. 대화 처리

```http
POST /api/v1/chat
Content-Type: application/json

{
  "message": "오늘 날씨가 좋네요",
  "context_id": "session-123",
  "emotion_mode": true
}
```

**응답 예시:**
```json
{
  "response": "맑은 날씨가 기분을 좋게 만드는군요! 산책하기 좋은 날입니다.",
  "emotion": {
    "detected": "positive",
    "confidence": 0.85
  },
  "associations": [
    "봄날", "행복", "산책"
  ],
  "memory_stored": true
}
```

#### 3. 메모리 검색

```http
GET /api/v1/memory/search?query=날씨&limit=10
```

#### 4. 창의적 연상

```http
POST /api/v1/creative/associate
Content-Type: application/json

{
  "seed": "하늘",
  "depth": 3,
  "creativity_level": 0.8
}
```

### WebSocket 실시간 통신

```javascript
// JavaScript 클라이언트 예시
const ws = new WebSocket('ws://localhost:8000/ws');

ws.onopen = () => {
  ws.send(JSON.stringify({
    type: 'subscribe',
    channels: ['thoughts', 'emotions']
  }));
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('실시간 업데이트:', data);
};
```

---

## 🔗 프론트엔드 연동

### React 예시

```jsx
// services/gumgangAPI.js
import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000';

class GumgangAPI {
  constructor() {
    this.client = axios.create({
      baseURL: API_BASE,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  async chat(message, contextId) {
    const response = await this.client.post('/api/v1/chat', {
      message,
      context_id: contextId,
      emotion_mode: true
    });
    return response.data;
  }

  async getHealth() {
    const response = await this.client.get('/api/v1/health');
    return response.data;
  }

  connectWebSocket() {
    return new WebSocket(`${API_BASE.replace('http', 'ws')}/ws`);
  }
}

export default new GumgangAPI();
```

```jsx
// components/ChatInterface.jsx
import React, { useState, useEffect } from 'react';
import GumgangAPI from '../services/gumgangAPI';

function ChatInterface() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [systemStatus, setSystemStatus] = useState({});

  useEffect(() => {
    // 시스템 상태 확인
    GumgangAPI.getHealth().then(setSystemStatus);

    // WebSocket 연결
    const ws = GumgangAPI.connectWebSocket();
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      // 실시간 업데이트 처리
    };

    return () => ws.close();
  }, []);

  const sendMessage = async () => {
    const response = await GumgangAPI.chat(input, 'session-123');
    setMessages([...messages, 
      { type: 'user', text: input },
      { type: 'ai', text: response.response }
    ]);
    setInput('');
  };

  return (
    <div className="chat-interface">
      {/* UI 구현 */}
    </div>
  );
}
```

---

## 🧩 시스템 구성요소

### 1. 📦 Temporal Memory System
시간적 맥락을 이해하고 저장하는 메모리 시스템

- **주요 기능**:
  - 시간 기반 메모리 저장/검색
  - 맥락 연결 및 패턴 인식
  - 메모리 클러스터링

### 2. 🧠 Meta-Cognitive System
자기 사고를 모니터링하고 분석하는 메타인지 시스템

- **주요 기능**:
  - 사고 과정 추적
  - 인지 패턴 분석
  - 자기 인식 및 성찰

### 3. 🎨 Creative Association Engine
창의적 연상과 새로운 아이디어 생성

- **주요 기능**:
  - 개념 간 창의적 연결
  - 은유 생성
  - 패턴 기반 창작

### 4. 💭 Dream System
무의식적 처리와 추상적 사고

- **주요 기능**:
  - 꿈 시퀀스 생성
  - 심볼릭 처리
  - 잠재 패턴 발견

### 5. 💖 Empathy System
감정 이해와 공감적 반응

- **주요 기능**:
  - 감정 분석
  - 공감적 응답 생성
  - 감정 미러링

---

## 🧪 테스트

### 단위 테스트 실행

```bash
# 전체 테스트
pytest tests/

# 특정 모듈 테스트
pytest tests/unit/test_temporal_memory.py

# 커버리지 리포트
pytest --cov=app tests/
```

### 통합 테스트

```bash
# 시스템 통합 테스트
python tests/integration/test_system_init.py

# 전체 시스템 테스트
python test_full_system.py
```

### 상태 확인

```bash
# 리팩토링 상태 확인
python check_refactoring_status.py
```

---

## 🔧 문제 해결

### 일반적인 문제

#### 1. ImportError: scipy not found
```bash
pip install scipy numpy scikit-learn
```

#### 2. 시스템 초기화 실패
```python
# verbose 모드로 디버깅
config = SystemConfig(enable_temporal_memory=True)
manager = get_system_manager(config)
# 로그 확인
```

#### 3. 메모리 부족
```python
# 캐시 크기 조정
config.memory_cache_size = 5000  # 기본값: 10000
```

### 로그 확인

```bash
# 로그 위치
tail -f logs/gumgang.log

# 디버그 모드
export LOG_LEVEL=DEBUG
python app/main.py
```

---

## 🔄 마이그레이션

### 기존 코드에서 마이그레이션

#### Import 경로 변경

```python
# 이전 (Old)
from temporal_memory import TemporalMemory
from meta_cognitive_system import MetaCognitiveSystem

# 이후 (New)
from app.core.memory.temporal import TemporalMemory
from app.core.cognition.meta import MetaCognitiveSystem
```

#### 시스템 초기화 변경

```python
# 이전 (Old)
memory = TemporalMemory()
meta = MetaCognitiveSystem()

# 이후 (New)
from app.core.system_manager import get_system_manager

manager = get_system_manager()
await manager.initialize()
memory = manager.temporal_memory
meta = manager.meta_cognitive
```

자세한 마이그레이션 가이드는 [MIGRATION.md](./MIGRATION.md) 참조

---

## 🤝 기여하기

### 개발 환경 설정

```bash
# 개발 의존성 설치
pip install -r requirements-dev.txt

# pre-commit 훅 설치
pre-commit install

# 코드 포맷팅
black app/
isort app/
```

### 기여 프로세스

1. Fork 저장소
2. Feature 브랜치 생성 (`git checkout -b feature/AmazingFeature`)
3. 변경사항 커밋 (`git commit -m 'Add AmazingFeature'`)
4. 브랜치 푸시 (`git push origin feature/AmazingFeature`)
5. Pull Request 생성

### 코딩 규칙

- PEP 8 준수
- Type hints 사용
- Docstring 작성 (Google Style)
- 테스트 코드 필수

---

## 📄 라이선스

이 프로젝트는 MIT 라이선스 하에 있습니다. 자세한 내용은 [LICENSE](./LICENSE) 파일을 참조하세요.

---

## 👥 팀

- **프로젝트 리드**: Gumgang AI Team
- **백엔드 개발**: Backend Team
- **AI 연구**: Research Team

---

## 📞 연락처

- **이메일**: support@gumgang.ai
- **이슈 트래커**: [GitHub Issues](https://github.com/your-org/gumgang-2.0/issues)
- **문서**: [공식 문서](https://docs.gumgang.ai)

---

## 🙏 감사의 말

금강 2.0 개발에 기여해주신 모든 분들께 감사드립니다.

---

<div align="center">
  <b>🚀 금강 2.0 - 인간과 AI의 아름다운 공존을 위하여</b>
</div>