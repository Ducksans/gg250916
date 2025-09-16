---
phase: past
---

# ST-1206 T3 S1/S2 캡처 지침

## 캡처 전 준비사항

### 1. 서버 시작
```bash
cd gumgang_meeting
python3 -m http.server 8077
```

### 2. 브라우저 접속
- URL: http://localhost:8077/ui/snapshots/unified_A1-A4_v0/index.html
- Simple 모드 확인 (body.simple 클래스)

### 3. 런타임 센서 활성화
```javascript
// DevTools 콘솔에서 실행
localStorage.setItem('gg_env', 'dev');
location.reload();
```

## S1 캡처 (초기 상태)

### Desktop (1920x1080)
1. 브라우저 창 크기: 1920x1080
2. A1 탭 활성화
3. 콘솔에서 검증 스니펫 실행:
```javascript
(() => {
  const wrap = document.getElementById('a1-wrap');
  const wrapStyle = getComputedStyle(wrap);
  const rows = wrapStyle.gridTemplateRows.split(' ').filter(v => v && v !== 'none');
  
  console.group('[S1 Desktop Verification]');
  console.log('Grid display:', wrapStyle.display === 'grid' ? '✅' : '❌', wrapStyle.display);
  console.log('Grid rows count:', rows.length === 3 ? '✅' : '❌', rows.length);
  console.log('Grid rows:', rows);
  console.log('Direct children:', wrap.children.length);
  console.log('Global scroll:', 
    getComputedStyle(document.documentElement).overflow === 'hidden' && 
    getComputedStyle(document.body).overflow === 'hidden' ? '✅' : '❌');
  console.groupEnd();
})();
```
4. 스크린샷 캡처
   - 파일명: `S1_desktop_1920x1080.png`
   - 전체 브라우저 창 포함

### Mobile (375x812 - iPhone X)
1. DevTools 디바이스 모드: iPhone X (375x812)
2. A1 탭 활성화
3. 동일한 검증 스니펫 실행
4. 스크린샷 캡처
   - 파일명: `S1_mobile_375x812.png`
   - 뷰포트 전체 포함

## S2 캡처 (상호작용 상태)

### Desktop (1920x1080)
1. 브라우저 창 크기: 1920x1080
2. A1 탭 활성화
3. 채팅 입력창에 텍스트 입력:
   ```
   ST-1206 T3 S2 테스트 메시지입니다.
   이것은 여러 줄의 텍스트를 테스트하기 위한 메시지입니다.
   입력창이 적절히 확장되는지 확인합니다.
   ```
4. 입력창 포커스 유지
5. 콘솔에서 검증 스니펫 실행:
```javascript
(() => {
  const wrap = document.getElementById('a1-wrap');
  const wrapStyle = getComputedStyle(wrap);
  const rows = wrapStyle.gridTemplateRows.split(' ').filter(v => v && v !== 'none');
  const input = document.getElementById('chat-input');
  const msgs = document.getElementById('chat-msgs');
  
  console.group('[S2 Desktop Verification]');
  console.log('Grid display:', wrapStyle.display === 'grid' ? '✅' : '❌', wrapStyle.display);
  console.log('Grid rows count:', rows.length === 3 ? '✅' : '❌', rows.length);
  console.log('Input visible:', input.offsetHeight > 0 ? '✅' : '❌');
  console.log('Input overflow:', getComputedStyle(input).overflow);
  console.log('Messages scrollable:', getComputedStyle(msgs).overflowY === 'auto' ? '✅' : '❌');
  console.log('Composer actions:', document.querySelector('[data-gg="composer-actions"]') ? '✅' : '❌');
  console.groupEnd();
})();
```
6. 스크린샷 캡처
   - 파일명: `S2_desktop_1920x1080_active.png`
   - 입력창과 메시지 영역이 모두 보이도록

### Mobile (375x812 - iPhone X)
1. DevTools 디바이스 모드: iPhone X (375x812)
2. A1 탭 활성화
3. 동일한 텍스트 입력
4. 가상 키보드 시뮬레이션 (DevTools에서 "Toggle device toolbar" → "Show device frame")
5. 검증 스니펫 실행
6. 스크린샷 캡처
   - 파일명: `S2_mobile_375x812_keyboard.png`
   - 키보드가 올라온 상태에서 입력창이 보이는지 확인

## 체크리스트

### S1 (초기 상태)
- [ ] Desktop: html/body overflow hidden
- [ ] Desktop: #a1-wrap display grid
- [ ] Desktop: gridTemplateRows 3개 값
- [ ] Desktop: 스크롤러 2개 (#gg-threads, #chat-msgs)
- [ ] Mobile: 레이아웃 정렬 확인
- [ ] Mobile: 입력창 하단 클리핑 없음

### S2 (상호작용 상태)
- [ ] Desktop: 입력창 확장 정상
- [ ] Desktop: "생각 중" 배지 겹침 없음
- [ ] Desktop: composer-actions 정렬
- [ ] Mobile: 키보드 올라와도 입력창 보임
- [ ] Mobile: 메시지 영역 스크롤 가능
- [ ] Mobile: 레이아웃 붕괴 없음

## 캡처 완료 후

1. 모든 스크린샷을 `gumgang_meeting/status/evidence/ST-1206_T3_S1_S2/` 디렉토리에 저장
2. CKPT JSONL 업데이트 (S1 통과, S2 통과)
3. PR 생성: feat/st1206-guardrails

## 문제 발생 시 대응

### rows_ok 실패
- #a1-wrap 직계 자식 확인
- composer-wrap display:contents 확인
- 보조 요소들이 #chat-msgs 안에 있는지 확인

### 스크롤러 위반
- textarea/input 제외 확인
- 허용된 스크롤러만 있는지 확인

### 입력창 클리핑
- #chat-input overflow:visible 확인
- max-height:35vh 확인
- grid-row:3 확인