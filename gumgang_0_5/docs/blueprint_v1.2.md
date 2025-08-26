# 🧱 Gumgang 2.0 불변 블루프린트 v1.2 (Migration & PKM/Obsidian-like System)
[HEADER] Gumgang 2.0 / Blueprint v1.2 / KST 2025-08-09 16:12
- 본문은 v1.1(병합판)에 Δ(전환 타이밍, PKM/Obsidian-like, 빠른 도입)를 반영한 집대성 버전입니다.
- 원칙: .rules 불가침 · 근거 우선 · KST 타임스탬프 · 승인 기반 실행 · 복구 가능성.

## 0) Δ 핵심
- Zed→Gumgang Go/No-Go 게이트 + 롤백
- Obsidian-like PKM(즉시 캡처→승격, 백링크/그래프, 2D/3D)
- 24–48h MVP 도입 플랜 & Feature Flags

## A) 비전/가치
- **비전**: "Zed Editor를 완전히 대체하는 자립형 코드 에디터" — 신뢰 기반 AI 실행체계, 장기 맥락, 관측/복구
- **핵심 가치**:
  1. 추측 절대 금지 - 모든 판단은 실제 파일 근거 기반
  2. 타임스탬프 절대 통일 - Asia/Seoul, YYYY-MM-DD HH:mm
  3. 신뢰 기반 실행 체계 - 승인/차단/롤백 메커니즘 (신뢰도 92%+)
  4. .rules 불가침 - 2025-08-09 12:33 봉인
  5. AI는 도구가 아닌 동료 - 공존·번영·자유

## B) 스택/컨텍스트
### Frontend
- **Core**: Tauri + Next.js 15.4.6 + React 19 + TypeScript
- **Editor**: Monaco Editor (25개+ 언어 지원)
- **3D**: Three.js 0.179.1 + @react-three/fiber 9.3.0 + @react-three/drei 10.6.1
- **UI**: ArcoDesign 2.66.3 + Tailwind CSS 4
- **Terminal**: xterm.js 5.3.0 + xterm-addon-fit

### Backend
- **Core**: FastAPI + Python 3.11+
- **AI**: Claude 4.1 Think Engine (주) + GPT-4 (보조)
- **Memory**: 4계층 시간적 메모리 + 메타인지 시스템
- **Guard**: Protocol Guard v3.0 + Rules Enforcer + Token Logger
- **DB**: SQLite (protocol_guard.db, task_context.db)

### 실시간
- **WebSocket**: Socket.io (계획)
- **Events**: metrics/memory-update/notification/selection-3d

## C) 기억 체계 (캐논, 5단계)
| 레벨 | 명칭 | 시간 범위 | 용량 | 디렉토리 | 용도 |
|------|------|----------|------|----------|------|
| 1 | 초단기 | 0-5분 | 7±2 | memory/ultra_short | 워킹 메모리 |
| 2 | 단기 | 5분-1시간 | 50 | memory/short_term | 세션 클러스터 |
| 3 | 중기 | 1시간-1일 | 200 | memory/medium_term | 일일 패턴 |
| 4 | 장기 | 1일-1주 | 1000 | memory/long_term | 영구 지식 |
| 5 | 초장기/메타인지 | 1주+ | 무제한 | memory/meta | 자기 인식 |

## D) 승인 기반 자기진화
```
AST/Graph 분석 → AI diff 제안 → UI 승인 다이얼로그 → 
적용+백업 → Git 커밋 → 이력 기록 → 신뢰도 업데이트
```

## E) Protocol Guard & .rules 강제
### 신뢰도 레벨
- **CRITICAL** (즉시 차단): rm -rf /, .rules 수정, 신뢰도 <80%
- **WARNING** (승인 필요): 신뢰도 80-92%, 시스템 파일 접근
- **SAFE** (자동 진행): 신뢰도 >92%, 읽기 전용, 체크포인트 존재

### 강제 경로
- REST API: FastAPI 미들웨어
- WebSocket: 연결 시점 검증
- Frontend: X-Rules-* 헤더
- Terminal: 명령 실행 전 패턴 매칭

## F) Capability→Feature 현황
| Capability | Feature | 상태 | 완성도 |
|------------|---------|------|--------|
| 코드 편집 | Monaco Editor | 완료 | 100% |
| AI 협업 | Think-Reflect-Create | 완료 | 100% |
| 메모리 | 4계층 시간적 메모리 | 완료 | 100% |
| 터미널 | Secure Terminal | 부분 | 70% |
| 3D 메모리 | Memory3D.tsx | 부분 | 40% |
| 3D 코드 | Code3DViewer.tsx | 부분 | 35% |
| 시스템 그리드 | SystemGrid3D.tsx | 부분 | 30% |
| 파일 탐색기 | FileExplorer.tsx | 더미 | 5% |
| 대시보드 | Dashboard | 더미 | 5% |
| WebSocket | 실시간 통신 | 미구현 | 0% |
| 멀티모달 | 이미지/오디오/비디오 | 계획 | 0% |

## G) 3D/멀티모달 (요지)
### 3D 노드 매핑
- File: Box/Blue (크기=LOC/100)
- Function: Sphere/Green (크기=복잡도*0.8)
- Class: Cylinder/Purple (크기=메서드수*1.2)
- Variable: Icosahedron/Yellow (크기=참조수*0.6)

### 성능 NFR
- FPS ≥60 (기본), ≥30 (복잡)
- 초기 로드 ≤2초
- 노드 상한: 초기 2000, 최대 5000
- WebGL 손실 시 자동 복구

### Feature Flags
- 3D_VISUALIZATION: 기본 Off → 점진 On
- MULTIMODAL: 계획 단계

## H) API/상태 모델
### 핵심 엔드포인트
```
GET  /health
GET  /api/protocol/status
POST /api/protocol/checkpoint
POST /api/ai/ask
POST /api/terminal/execute
GET  /memory/status
POST /memory/store
```

### WebSocket 이벤트 (계획)
```
→ metrics: { cpu, memory, trust_score }
→ memory-update: { level, items }
→ notification: { type, message }
→ selection-3d: { node_id, position }
```

## I) 릴리스/거버넌스
### 주간 Release Train
- 월: 계획/백로그
- 화-목: 개발/테스트
- 금: 통합/검증
- 토: 배포 게이트 (.rules 검증, Guard 위반 0, 신뢰도 92%+)

### 롤백 정책
- 체크포인트: 매시간 + Task 완료 시
- Git: 자동 커밋 (변경 시)
- 드리프트 리포트: 일 1회

## J) 리스크
| 리스크 | 영향 | 확률 | 대응 |
|--------|------|------|------|
| Git 파일 73k | 성능 저하 | HIGH | .gitignore 정리 |
| WebSocket 미구현 | 실시간 불가 | HIGH | Socket.io 우선 구현 |
| 3D 성능 | UX 저하 | MEDIUM | LOD/Worker 적용 |
| 파일탐색기 더미 | 기능 제한 | HIGH | Tree 컴포넌트 구현 |
| 멀티모달 공백 | 확장성 제한 | LOW | Phase 3 계획 |

## K) 2주 로드맵
### Week 1 (8/9-8/15)
- 문서 봉인/검증 체계 구축
- WebSocket 스키마 정의
- 3D 가드레일 설정
- Git 정리 (.gitignore)

### Week 2 (8/16-8/22)
- WebSocket 연결 구현
- 파일 탐색기 구현
- 대시보드 기본 구현
- 3D 최적화 1차 (Instancing)

## L) 캐논 문서 후보
1. `immutable_core_guide.md` - 비전과 철학
2. `tech_stack_architecture.md` - 기술 스택 상세
3. `api_spec.md` - OpenAPI 3.0 명세
4. `roadmap.md` - Phase별 계획
5. `policy_model.md` - Protocol Guard 규칙

---

## 근거
- `.rules` (2025-08-09 12:33 봉인)
- `HYBRID_TRUST_STRATEGY.md`
- `SESSION_CONTINUITY_PROTOCOL.md`
- `PROJECT_STRUCTURE.md`, `BACKEND_STRUCTURE.md`
- `backend/simple_main.py` (포트 8000)
- `backend/app/temporal_memory.py` (4계층 메모리)
- `backend/app/meta_cognitive/meta_cognitive_system.py`
- `backend/terminal_executor.py` (위험 패턴 차단)
- `gumgang-v2/components/visualization/*.tsx` (3D 컴포넌트)
- `gumgang-v2/services/Code3DVisualizationEngine.ts`
- `docs/USER_GUIDE.md`

---

**[SEALED] Blueprint v1.2 @ KST 2025-08-09 16:12**