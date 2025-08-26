# Gumgang 2.0 워크플로우(간략판 · 인디케이터용) v1.2
[HEADER] Gumgang 2.0 / Workflow Compact v1.2 / KST 2025-08-09 16:12

## 1) 문서 확정(정적 기준선)
- 블루프린트 v1.2 본문화 → 캐논 5종 스켈레톤 채움 → 해시 봉인 + Guard 감시
- DoD: X-Rules-* 검증 통과, _canon.meta.json 생성, protocol_config_v3.json 업데이트

## 2) Go/No-Go 전환(Zed → Gumgang)
### 게이트 5종
1. 전경로 규칙강제: REST/WS/Frontend/Terminal 모두 .rules 적용
2. WS 최소스키마: metrics/memory-update/notification/selection-3d 정의
3. 프론트 빌드 정상: `npm run build` 성공
4. 백엔드 헬스 3회 OK: `curl http://localhost:8000/health` 연속 성공
5. 롤백 수단: 체크포인트 + Git 백업 확인

### 판정
- **GREEN = Go**: 모든 게이트 통과 → Gumgang 전환
- **RED = No-Go**: 1개 이상 실패 → 다음 창으로 연기

## 3) PKM(Obsidian-like) MVP(24-48h)
### 구현 순서
1. Quick Capture: Chat/코드 → `notes/inbox/` 자동 저장
2. Promote: 리뷰 후 → `notes/vault/` 승격
3. Backlinks: 자동 [[연결]] 파싱 + 역참조 생성
4. Graph 2D: Force-directed 시각화 (3D Flag Off 시작)

### DoD
- 캡처→승격 루프 하루 20회 이상 테스트
- 백링크/그래프 가시화 확인
- 검색 인덱싱 동작

## 4) 실시간·가드레일
### WebSocket 스키마 고정
```json
{
  "metrics": { "cpu": 0.0, "memory": 0.0, "trust_score": 100 },
  "memory-update": { "level": 1, "items": [] },
  "notification": { "type": "info", "message": "" },
  "selection-3d": { "node_id": "", "position": [0,0,0] }
}
```

### 3D NFR
- FPS ≥60 (필수), 노드 ≤2000 (초기)
- Feature Flags: `3D_ENABLED=false` → 점진 활성화

## 5) 운영 자동화
### APScheduler 작업
- **일간**: 무결성 검증 (`validate_canon_docs.sh`)
- **일간**: 토큰 사용량 리포트
- **주간**: 드리프트 분석 (코드 ↔ 문서)
- **주간**: PKM 지표 (캡처/승격/백링크 수)
- **월간**: 승인 히스토리 아카이브

### 알림
- 신뢰도 <92%: 즉시 알림
- 체크포인트 실패: 긴급 알림
- .rules 위반: 차단 + 로그

## 6) 기능 램프업(안전 순서)
### Phase 1 (즉시)
1. **파일 탐색기**: Tauri readDir → Tree 컴포넌트
2. **Git 정리**: .gitignore 설정 (73k 파일 → 정상화)

### Phase 2 (1주)
3. **대시보드**: 메트릭 차트 (Recharts/D3.js)
4. **WebSocket**: Socket.io 연결 + 자동 재연결

### Phase 3 (2주)
5. **3D 최적화**: Instancing/LOD/Web Worker
6. **터미널 완성**: 명령 히스토리 + 자동완성

### Phase 4 (선택)
7. **멀티모달**: 이미지 업로드/미리보기 (필요시)

## 7) 주간 릴리스 트레인
### 스케줄
| 요일 | 활동 | 체크포인트 |
|-----|------|-----------|
| 월 | 백로그 정리, 우선순위 | Task 할당 |
| 화-수 | 개발, 단위 테스트 | PR 생성 |
| 목 | 통합 테스트 | CI 통과 |
| 금 | 검증, 문서 업데이트 | Guard 검증 |
| 토 | 배포 게이트 판정 | Go/No-Go |
| 일 | 배포 또는 롤백 | 리포트 |

### 게이트 조건
- .rules 해시 불변
- Protocol Guard 위반 0
- 신뢰도 ≥92%
- 테스트 커버리지 ≥80%
- 성능 지표 만족

### 실패 시
- 자동 롤백 → 원인 분석 → 수정 → 다음 주 재시도

---

## 📋 Quick Commands
```bash
# 상태 확인
gumgang-status
curl http://localhost:8000/health
python protocol_guard_v3.py --status

# 문서 검증
./tools/validate_canon_docs.sh

# 체크포인트
python protocol_guard_v3.py --checkpoint "작업명"

# 프론트엔드
cd gumgang-v2 && npm run dev

# 백엔드
cd backend && python simple_main.py
```

---

## ⚠️ 중요 원칙
1. **.rules 불가침**: 2025-08-09 12:33 봉인 유지
2. **승인 우선**: 모든 변경은 승인 후 실행
3. **체크포인트**: 중요 작업 전후 필수
4. **KST 타임스탬프**: YYYY-MM-DD HH:mm 엄수
5. **근거 기반**: 추측 금지, 파일 증거 필수

---

**[SEALED] Workflow Compact v1.2 @ KST 2025-08-09 16:12**