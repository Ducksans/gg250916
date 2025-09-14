# 금강 UI vs LibreChat — 스레드 보존/복원 로직 비교 분석 보고서

타임스탬프: 2025-09-12T01:14Z (UTC) / 2025-09-12 10:14 (KST)
대상 UI: 
- 금강 UI: http://localhost:5173/ui-dev/thread/thread_n1slv8k5_mfg4ae6z
- LibreChat: http://localhost:3080/c/e6bbc9d5-9b94-4a83-abfd-e15e91a09126

요약
- 금강 UI(A1 Dev)는 클라이언트 측 상태를 IndexedDB(localStorage→마이그레이션)로 영속화하고, 필요 시 FastAPI의 파일 기반 Thread API(/api/threads/*)에서 스레드를 가져와 병합합니다. 반면 LibreChat은 서버 측 MongoDB 모델(Conversation/Message)에 대화를 영속화하고, 클라이언트는 React Query(useInfiniteQuery)로 /api/convos(서버 라우트)에서 커서 기반으로 목록을 불러옵니다.
- 재부팅/새로고침 시 금강 UI가 스레드가 초기화된 현상은 “클라이언트 로컬 저장소 의존 + 초기 렌더 타이밍”과 “서버 싱크의 선택적·수동 임포트” 설계에서 기인합니다. LibreChat은 항상 서버 DB를 단일 사실원천(SSOT)으로 사용하기 때문에 브라우저를 닫아도 스레드가 유지됩니다.

1) 저장소 계층 비교
- 금강 UI (클라 우선 → 서버 보강)
  - IndexedDB: ui/dev_a1_vite/src/state/dbStore.ts
    - DB: GumgangChatDB / store: chatState
    - save/load API로 전체 상태 저장
  - 상태 스토어: ui/dev_a1_vite/src/state/chatStore.ts
    - LS_KEY("gg_a1_chat_store_v1")에서 IndexedDB로 마이그레이션 후 지속 저장
    - URL thread/:id 진입 시 `loadThreadIsolated`로 서버 `/api/threads/read?convId=` 호출해 해당 스레드만 삽입 병합
    - 초기 세션 1회 `/api/threads`/`/threads/recent` 기반 importThreads 트리거 (세션 스토리지 플래그)
  - 증거:
    - chatStore.ts: loadState/saveState/Store.init/Import Threads 로직
      - gumgang_meeting/ui/dev_a1_vite/src/state/chatStore.ts
    - dbStore.ts: IndexedDB 구현
      - gumgang_meeting/ui/dev_a1_vite/src/state/dbStore.ts

- 금강 백엔드 (파일 기반 Thread API)
  - FastAPI: app/api.py — /api/threads/append|recent|read|read_stream
  - JSONL 파일: conversations/threads/YYYYMMDD/<convId>.jsonl(append-only)
  - 최근 목록 인덱스: conversations/threads/index/<convId>.json
  - 증거:
    - gumgang_meeting/app/api.py — /api/threads/recent, /api/threads/read 등
    - gumgang_meeting/conversations/threads/20250911/gg_mig_20250911_06ckhx.jsonl (샘플)

- LibreChat (서버 DB 우선)
  - 서버 모델: Mongo Conversation/Message
    - gumgang_meeting/LibreChat/api/models/Conversation.js
      - saveConvo, getConvosByCursor, getConvo 등
  - 서버 라우트: Express /api/convos
    - gumgang_meeting/LibreChat/api/server/routes/convos.js
      - GET '/' → getConvosByCursor(cursor, limit, order)
      - GET '/:conversationId' → getConvo
      - POST '/update' → saveConvo
  - 클라이언트: React Query로 무한 스크롤 조회
    - gumgang_meeting/LibreChat/client/src/data-provider/queries.ts
      - useConversationsInfiniteQuery → dataService.listConversations → /api/convos
    - 그룹핑/소팅 유틸: client/src/utils/convos.ts

2) 초기 로딩/복구 전략 비교
- 금강 UI
  - 앱 시작 → chatStore.waitForInit → IndexedDB에서 전체 chatState 로드 → 세션 최초 1회 `/api/threads/recent?limit=500` 임포트 시도(선택) → URL에 threadId 있으면 `loadThreadIsolated`로 해당 스레드만 서버에서 읽어와 상태에 삽입
  - 증거: ui/dev_a1_vite/src/components/A1Dev.jsx — storeReady 이후 subscribe, Import Threads 핸들러(fetch `${base}/threads/recent?limit=500`)
- LibreChat
  - 로그인/앱 로드 → useConversationsInfiniteQuery로 서버 /api/convos 커서 기반 페이지네이션 → 특정 대화 진입 시 useGetConvoIdQuery가 캐시 또는 /api/convos/:id에서 단건 조회
  - 서버가 SSOT이므로 새로고침/다른 브라우저에서도 동일 목록 유지

3) 제목/메타 유지
- 금강 UI
  - 제목은 클라에서 첫 user 메시지로 임시 생성 후 chatStore.renameThread로 변경. 서버 JSONL meta.title/title_locked도 포함 가능(백엔드 정책에 따라 잠금)
  - 증거: ui/dev_a1_vite/src/components/A1Dev.jsx L249-255 근처 — 첫 전송 시 renameThread(snippet)
  - 백엔드 JSONL 스키마: meta.title/title_locked/tags/sgm_blocked 등 (app/api.py 구현)
- LibreChat
  - 서버 saveConvo가 title을 DB에 저장. 타이틀 생성 API(gen_title)도 존재.
  - 증거: api/models/Conversation.js saveConvo, server/routes/convos.js /gen_title

4) 스레드 목록 컴포넌트/바인딩
- 금강 UI
  - 좌측 Threads Pane은 로컬 스토어의 threads 배열을 표시. Import/Export 이벤트 제공.
  - URL thread/:id 일치 시 활성화 스위치. 새로고침 시 IndexedDB 로드가 선행되며, 서버 동기화는 부가적.
  - 증거: ui/dev_a1_vite/src/components/A1Dev.jsx (LeftThreadsPane 전달)
- LibreChat
  - 좌측 사이드바는 서버 리스트(무한 스크롤) + 로컬 캐시 조합. 제목/업데이트 시간/아이콘 등 DB 필드를 직접 사용.
  - 증거: client/src/data-provider/queries.ts(useConversationsInfiniteQuery), utils/convos.ts(grouping)

5) 원인 분석 — 금강 UI에서 재부팅 후 스레드 초기화 가능성
- 로컬 IndexedDB가 초기화되었거나, waitForInit 이전 렌더/라우팅 경합으로 좌측 패널이 공백 상태로 그려진 케이스
- 서버 동기화가 “사용자 액션(Import)” 또는 “세션 최초 1회”에 한정되어 항상 복구되지는 않음
- URL thread/:id가 없으면 활성 스레드가 기본 Thread 1로 남아 보이는 UX

6) LibreChat 대비 기술적 간극
- SSOT: 금강은 클라(IndexedDB)가 1차, 서버 파일은 보강; LibreChat은 서버 DB가 1차
- API 계약: 금강은 /api/threads/* 파일 JSONL; LibreChat은 /api/convos* + Mongo 모델
- 초기 로드: 금강은 로컬→선택적 서버 머지; LibreChat은 서버 커서 페이징→로컬 캐시
- 제목/태그: 금강은 클라 생성/서버 meta 반영 설계; LibreChat은 서버 생성/업데이트 일원화

7) 개선안(권고)
- 금강 UI
  1) 앱 시작 시 onReady에서 `/api/threads/recent?limit=20`을 즉시 호출해 좌측 목록을 서버 기준으로프리랜더(로컬 캐시 병합)
  2) URL 파라미터가 없을 때도 최근 convId 자동 선택(가장 최근 항목)
  3) chatStore.loadThreadIsolated가 읽은 서버 turns를 항상 상태에 병합(중복/역전 방지)
  4) 제목/태그 멱등: `title_locked=true`면 UI에서 변경 비활성화, 서버 409 처리 존중
  5) 멀티탭 동기화: BroadcastChannel("gg_threads")로 새 라인/제목 변경 브로드캐스트
- 백엔드(FastAPI)
  6) /api/threads/recent 응답을 LibreChat의 /api/convos 수준으로 축약: {convId, title, title_locked, last_ts, top_tags[<=3], approx_turns}
  7) /api/threads/read에 from_turn, limit 옵션(v1.1) 추가하여 긴 스레드 성능 개선
  8) 인덱스 파일 갱신 안정화 및 recent 정렬 일관성 확보

8) 검증 체크리스트(재발 방지)
- 새로고침 → 좌측 Threads가 즉시 채워지고 현재 convId가 자동 선택됨
- 다른 브라우저/탭에서 동일 convId를 열어도 제목/ turns가 즉시 동기화됨
- /api/threads/recent 호출은 300ms 내 응답, 목록 정렬이 last_ts 기준과 일치

부록 — 인용 경로(증거)
- 금강 UI 프런트
  - gumgang_meeting/ui/dev_a1_vite/src/state/chatStore.ts
  - gumgang_meeting/ui/dev_a1_vite/src/state/dbStore.ts
  - gumgang_meeting/ui/dev_a1_vite/src/components/A1Dev.jsx
  - gumgang_meeting/ui/dev_a1_vite/src/hooks/usePrefs.js
- 금강 백엔드
  - gumgang_meeting/app/api.py (/api/threads/append|recent|read|read_stream)
  - gumgang_meeting/conversations/threads/...
- LibreChat 백엔드/클라
  - gumgang_meeting/LibreChat/api/models/Conversation.js
  - gumgang_meeting/LibreChat/api/server/routes/convos.js
  - gumgang_meeting/LibreChat/client/src/data-provider/queries.ts
  - gumgang_meeting/LibreChat/client/src/utils/convos.ts
