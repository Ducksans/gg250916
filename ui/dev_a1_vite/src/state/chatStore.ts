/**
 * [금강 AI 주석 v1.1]
 * ---------------------------------------------------------------------------
 * @파일경로: ui/dev_a1_vite/src/state/chatStore.ts
 * @분석일자: 2025-09-11T12:03Z (UTC) / 2025-09-11 12:03 (KST)
 * @작성자: Gemini (금강 AI)
 * ---------------------------------------------------------------------------
 * @파일목적
 *  - 앱의 모든 클라이언트 측 상태를 관리하는 중앙 상태 관리자(State Manager)입니다.
 *
 * @핵심역할
 *  - 1. (상태 정의) `ChatState` 타입을 통해 앱의 전체 데이터 구조를 정의합니다.
 *  - 2. (상태 저장/로드) `localStorage`를 사용하여 앱의 상태를 브라우저에 영속화합니다.
 *  - 3. (상태 변경 로직) `actions` 객체를 통해 상태를 변경하는 유일한 통로를 제공합니다.
 *
 * @주요관계
 *  - (임포트) ← `@/components/A1Dev.jsx` (및 다른 여러 컴포넌트)
 *  - (DOM API 사용) → `localStorage`
 *
 * @참고사항
 *  - [리팩토링 후보] 현재 파일은 '전체 클라이언트 상태 관리'라는 매우 큰 책임을 가지고 있습니다.
 *  - 향후 도메인별로 스토어를 분리(slice 패턴)하는 리팩토링이 강력하게 권장됩니다.
 * ---------------------------------------------------------------------------
 */
/**
 * Chat 상태 관리 스토어 (localStorage 기반)
 * - 멀티 스레드, 멀티턴 대화
 * - 스레드 단위 에이전트 선택
 * - MCP(툴 호출) 로그/설정 슬롯 포함
 *
 * 사용 예시 (React 컴포넌트):
 * import { chatStore } from '@/state/chatStore';
 * const state = chatStore.getState();
 * chatStore.subscribe(() => setTick((t) => t + 1)); // 간단한 리렌더 트리거
 * chatStore.actions.sendUserMessage('안녕'); // 활성 스레드에 유저 메시지 추가
 */

import { dbStore } from "./dbStore";

export type Role = "user" | "assistant" | "system";

export type ToolParamSchema =
  | { type: "object"; properties?: Record<string, any>; required?: string[] }
  | { type: "string" | "number" | "boolean" | "array" | "null" };

export type ToolDef = {
  id: string;
  name: string;
  description?: string;
  params?: ToolParamSchema;
};

export type Agent = {
  id: string;
  name: string;
  model?: string;
  systemPrompt?: string;
  tools?: ToolDef[];
  tags?: string[];
};

export type Message = {
  id: string;
  role: Role;
  content: string;
  ts: number; // epoch ms
  meta?: {
    agentId?: string; // 해당 메시지 생성 시점의 에이전트
    streaming?: boolean; // 어시스턴트 출력 진행중 여부
    placeholder?: boolean; // 자리표시자("…") 여부
    toolCall?: {
      tool: string;
      args?: Record<string, any>;
    };
    toolResult?: {
      ok: boolean;
      data?: any;
      error?: string;
    };
  };
};

export type Thread = {
  id: string;
  title: string;
  agentId: string; // 선택된 에이전트
  createdAt: number;
  updatedAt: number;
  messages: Message[];
};

export type MCPConfig = {
  enabled: boolean;
  server?: {
    baseUrl?: string; // 예: http://127.0.0.1:11434 or local bridge endpoint
    authToken?: string;
  };
  tools?: ToolDef[];
  // 호출 로그 (간단 슬롯 — 실제 호출은 별도 클라이언트에서 수행)
  invocations: Array<{
    id: string;
    ts: number;
    threadId: string;
    tool: string;
    args?: Record<string, any>;
    result?: { ok: boolean; data?: any; error?: string };
  }>;
};

export type ChatState = {
  version: 1;
  activeThreadId: string | null;
  threads: Thread[];
  agents: Agent[];
  mcp: MCPConfig;
};

type Listener = () => void;

const LS_KEY = "gg_a1_chat_store_v1";
const DB_KEY = "chatState";

function now() {
  return Date.now();
}

function uid(prefix = "id") {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}_${Date.now().toString(36)}`;
}

/** 기본 에이전트: 스크린샷/요구사항 기반 시드 */
const DEFAULT_AGENTS: Agent[] = [
  {
    id: "gpt4o",
    name: "기본 채팅 (GPT-4o)",
    model: "gpt-4o",
    systemPrompt:
      "당신은 금강의 기본 대화 에이전트입니다. 간결하고 명확하게 한국어로 답변합니다.",
    tools: [
      {
        id: "fs",
        name: "파일 시스템",
        description: "읽기/목록/간단 정보 조회",
      },
      { id: "web", name: "웹 검색", description: "간단 웹 검색/요약" },
    ],
    tags: ["chat", "default"],
  },
  {
    id: "researcher",
    name: "리서처 (qwen2.5-rb-instruct)",
    model: "qwen2.5-rb-instruct",
    systemPrompt:
      "신뢰성 있는 출처를 우선하여 근거 중심으로 정보를 수집/정리합니다.",
    tools: [{ id: "web", name: "웹 검색" }],
    tags: ["research"],
  },
  {
    id: "code_reviewer",
    name: "코드 리뷰어 (sonnet)",
    model: "claude-3-5-sonnet-latest",
    systemPrompt:
      "TypeScript/React/Vite/Node 생태계 코드 리뷰어. 안정성과 가독성을 우선.",
    tools: [{ id: "fs", name: "파일 시스템" }],
    tags: ["code", "review"],
  },
];

/** 초기 스레드 */
function makeDefaultThread(): Thread {
  const id = uid("thread");
  const ts = now();
  return {
    id,
    title: "Thread 1",
    agentId: DEFAULT_AGENTS[0].id,
    createdAt: ts,
    updatedAt: ts,
    messages: [
      {
        id: uid("m"),
        role: "assistant",
        content: "안녕하세요! 금강 A1 개발 UI입니다.",
        ts,
        meta: { agentId: DEFAULT_AGENTS[0].id },
      },
    ],
  };
}

/** 기본 상태 */
function makeDefaultState(): ChatState {
  const t = makeDefaultThread();
  return {
    version: 1,
    activeThreadId: t.id,
    threads: [t],
    agents: DEFAULT_AGENTS.slice(),
    mcp: {
      enabled: false,
      tools: [],
      invocations: [],
    },
  };
}

/** IndexedDB 로드/세이브 */
async function loadState(): Promise<ChatState> {
  try {
    // Check for localStorage data to migrate
    const lsData = localStorage.getItem(LS_KEY);
    if (lsData && !(await dbStore.load(DB_KEY))) {
      // Migrate from localStorage to IndexedDB
      try {
        const parsed = JSON.parse(lsData);
        await dbStore.save(DB_KEY, parsed);
        localStorage.removeItem(LS_KEY); // Clear after successful migration
        console.log("Migrated data from localStorage to IndexedDB");
      } catch (e) {
        console.error("Migration failed:", e);
      }
    }

    // Load from IndexedDB (no size limit)
    const data = await dbStore.load(DB_KEY);
    if (!data) return makeDefaultState();
    const parsed = data;

    // 마이그레이션: 에이전트 모델 아이디 정규화
    // - Claude 계열: 과거 'claude-3.5-sonnet' / 'claude-3-5-sonnet-YYYYMMDD' 등을
    //   Anthropic 권장 별칭 'claude-3-5-sonnet-latest'로 교체
    if (Array.isArray(parsed?.agents)) {
      parsed.agents = parsed.agents.map((a: any) => {
        if (!a) return a;
        if (typeof a.model === "string") {
          const m = a.model.toLowerCase();
          if (
            m === "claude-3.5-sonnet" ||
            m === "claude-3-5-sonnet" ||
            m.startsWith("claude-3.5-sonnet-") ||
            m.startsWith("claude-3-5-sonnet-")
          ) {
            return { ...a, model: "claude-3-5-sonnet-latest" };
          }
        }
        return a;
      });
    }

    // 버전 필드 보정(없으면 기본 버전으로)
    if (!parsed.version) parsed.version = 1;

    return parsed as ChatState;
  } catch {
    return makeDefaultState();
  }
}

async function saveState(state: ChatState) {
  try {
    await dbStore.save(DB_KEY, state);
  } catch (error) {
    console.error("Failed to save state to IndexedDB:", error);
  }
}

/** 간단한 옵저버 */
class Store {
  private state: ChatState;
  private listeners: Set<Listener> = new Set();
  private initialized: boolean = false;
  private initPromise: Promise<void> | null = null;

  constructor() {
    this.state = makeDefaultState();
    this.listeners = new Set();
    this.initPromise = this.init();
  }

  private async init() {
    // Load state from IndexedDB
    this.state = await loadState();
    this.initialized = true;

    // 자동 저장 설정 - 상태 변경 시마다 IndexedDB에 저장
    this.subscribe(() => {
      saveState(this.state); // Don't await here, fire and forget
    });

    // URL에 threadId가 있으면 해당 스레드 활성화
    const pathMatch = window.location.pathname.match(/\/thread\/([^/]+)/);
    const urlThreadId = pathMatch ? pathMatch[1] : null;

    if (urlThreadId) {
      // URL의 스레드 활성화 (격리하지 않고 전체 스레드 유지)
      const thread = this.state.threads.find((t) => t.id === urlThreadId);
      if (thread) {
        this.state.activeThreadId = urlThreadId;
      } else {
        // 스레드가 없으면 서버에서 로드 시도
        setTimeout(() => {
          this.actions.loadThreadIsolated(urlThreadId);
        }, 100);
      }
    }

    // 세션당 1회 서버에서 추가 스레드 가져오기
    if (
      !sessionStorage.getItem("threads_loaded") &&
      this.state.threads.length < 50
    ) {
      setTimeout(() => {
        this.actions.importThreads().then((success) => {
          if (success) {
            sessionStorage.setItem("threads_loaded", "true");
          }
        });
      }, 1000);
    }
  }

  async waitForInit(): Promise<void> {
    if (this.initialized) return;
    if (this.initPromise) await this.initPromise;
  }

  getState() {
    return this.state;
  }

  subscribe(fn: Listener) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private emit() {
    saveState(this.state); // Fire and forget, no await
    for (const fn of this.listeners) {
      try {
        fn();
      } catch {
        // ignore
      }
    }
  }

  /** 내부 유틸 */
  private ensureActiveThread(): Thread {
    const { activeThreadId, threads } = this.state;
    let thread = threads.find((t) => t.id === activeThreadId) || null;
    if (!thread) {
      const t = makeDefaultThread();
      this.state.threads.unshift(t);
      this.state.activeThreadId = t.id;
      thread = t;
    }
    return thread;
  }

  /** Actions */
  actions = {
    /** 격리된 스레드 로드 - URL 라우팅 시 사용 */
    loadThreadIsolated: async (threadId: string) => {
      try {
        // 먼저 현재 스레드 목록에서 찾기
        let thread = this.state.threads.find((t) => t.id === threadId);

        if (!thread) {
          // 서버에서 로드 시도
          // Respect backend/source toggles
          const base = ((): string => {
            try {
              const b = localStorage.getItem("GG_CHAT_BACKEND");
              return String(b || "fastapi").toLowerCase() === "bridge"
                ? "/bridge/api"
                : "/api";
            } catch { return "/api"; }
          })();
          const useV2 = ((): boolean => {
            try { return (localStorage.getItem("GG_THREAD_SOURCE") || "files").toLowerCase() === "db"; } catch { return false; }
          })();
          try {
            const url = useV2
              ? `${base}/v2/threads/read?id=${encodeURIComponent(threadId)}`
              : `${base}/threads/read?convId=${encodeURIComponent(threadId)}`;
            const response = await fetch(url);
            if (response.ok) {
              const data = await response.json();
              const turns = Array.isArray(data?.data?.turns)
                ? data.data.turns
                : [];
              const title = data?.data?.title || threadId;

              // 새 스레드 생성
              thread = {
                id: threadId,
                title,
                agentId: this.state.agents[0]?.id || DEFAULT_AGENTS[0].id,
                createdAt: now(),
                updatedAt: now(),
                messages: turns.map((t: any) => ({
                  id: uid("m"),
                  role: t.role || "user",
                  content: t.text || "",
                  ts: t.ts ? Date.parse(t.ts) : now(),
                  meta: t.meta || {},
                })),
              };

              // 새 스레드를 목록에 추가 (격리하지 않음)
              this.state.threads.unshift(thread);
            }
          } catch {
            // 404 등의 에러는 무시하고 계속 진행
            // 스레드가 서버에 없어도 로컬에서 작동 가능
          }
        }

        if (thread) {
          // 스레드 활성화 (전체 목록 유지)
          this.state.activeThreadId = threadId;
          this.emit();
          return true;
        }
        return false;
      } catch (error) {
        // 에러를 콘솔에 기록하지 않고 조용히 실패
        return false;
      }
    },

    /** 스레드 생성 */
    createThread: (title?: string, agentId?: string) => {
      const t = makeDefaultThread();
      if (title) t.title = title;
      if (agentId) t.agentId = agentId;
      t.updatedAt = now();
      this.state.threads.unshift(t);
      this.state.activeThreadId = t.id;
      this.emit(); // Don't await - fire and forget
      return t.id;
    },

    /** 스레드 전환 */
    switchThread: (threadId: string) => {
      const found = this.state.threads.find((t) => t.id === threadId);
      if (!found) return false;
      this.state.activeThreadId = threadId;
      this.emit(); // Don't await - fire and forget
      return true;
    },

    /** 스레드 제목 변경 */
    renameThread: (threadId: string, title: string) => {
      const t = this.state.threads.find((x) => x.id === threadId);
      if (!t) return false;
      t.title = title;
      t.updatedAt = now();
      this.emit(); // Don't await - fire and forget
      return true;
    },

    /** 스레드 삭제 */
    deleteThread: (threadId: string) => {
      const idx = this.state.threads.findIndex((t) => t.id === threadId);
      if (idx < 0) return false;
      this.state.threads.splice(idx, 1);
      if (this.state.activeThreadId === threadId) {
        this.state.activeThreadId = this.state.threads[0]?.id ?? null;
      }
      this.emit(); // Don't await - fire and forget
      return true;
    },

    /** 스레드의 에이전트 지정 */
    setAgentForThread: (threadId: string, agentId: string) => {
      const t = this.state.threads.find((x) => x.id === threadId);
      if (!t) return false;
      const agent = this.state.agents.find((a) => a.id === agentId);
      if (!agent) return false;
      t.agentId = agentId;
      t.updatedAt = now();
      this.emit(); // Don't await - fire and forget
      return true;
    },

    /** 서버에서 읽은 스레드(마이그레이션/복원)를 로컬 상태로 병합/삽입 */
    upsertImportedThread: (
      convId: string,
      title: string | undefined,
      turns: Array<{
        ts?: string;
        turn?: number;
        role: Role | string;
        text?: string;
        meta?: any;
      }>,
    ) => {
      const agentId = this.state.agents[0]?.id || DEFAULT_AGENTS[0].id;
      const toMs = (s?: string) => {
        if (!s) return now();
        const n = Date.parse(s);
        return Number.isFinite(n) ? n : now();
      };
      const msgs: Message[] = (turns || [])
        .map((t) => {
          const role = (String(t.role || "").toLowerCase() as Role) || "user";
          if (!{ user: 1, assistant: 1, system: 1 }[role]) return null as any;
          return {
            id: uid("m"),
            role,
            content: String(t.text || ""),
            ts: toMs(String(t.ts || "")),
            meta: { agentId, ...((t as any).meta || {}) },
          } as Message;
        })
        .filter(Boolean);
      const createdAt = msgs[0]?.ts || now();
      const updatedAt = msgs[msgs.length - 1]?.ts || createdAt;
      const thread: Thread = {
        id: convId,
        title: title || convId,
        agentId,
        createdAt,
        updatedAt,
        messages: msgs.length
          ? msgs
          : [
              {
                id: uid("m"),
                role: "assistant",
                content: "(empty)",
                ts: now(),
                meta: { agentId },
              },
            ],
      };
      const idx = this.state.threads.findIndex((t) => t.id === convId);
      if (idx >= 0) this.state.threads[idx] = thread;
      else this.state.threads.unshift(thread);
      this.emit();
      return true;
    },

    /** 스레드 일괄 Import - API에서 가져온 스레드들을 로컬 상태로 병합 */
    importThreads: async () => {
      try {
        // API에서 스레드 목록 가져오기
        const response = await fetch("/api/threads");
        if (!response.ok) {
          console.error("Failed to fetch threads:", response.status);
          return false;
        }

        const data = await response.json();
        const threads = data.conversations || data.threads || [];

        // 각 스레드를 upsertImportedThread로 처리
        let importedCount = 0;
        for (const thread of threads) {
          const convId = thread.id || thread.conversation_id || uid("t");
          const title = thread.title || thread.name || `Thread ${convId}`;
          const turns = thread.turns || thread.messages || [];

          chatStore.actions.upsertImportedThread(convId, title, turns);
          importedCount++;
        }

        console.log(`Imported ${importedCount} threads`);
        return true;
      } catch (error) {
        console.error("Error importing threads:", error);
        return false;
      }
    },

    /** 스레드 Export - 현재 스레드들을 JSON으로 내보내기 */
    exportThreads: () => {
      const exportData = {
        version: 2,
        exportedAt: new Date().toISOString(),
        threads: this.state.threads.map((thread) => ({
          id: thread.id,
          title: thread.title,
          agentId: thread.agentId,
          createdAt: thread.createdAt,
          updatedAt: thread.updatedAt,
          messages: thread.messages.map((msg) => ({
            id: msg.id,
            role: msg.role,
            content: msg.content,
            ts: msg.ts,
            meta: msg.meta,
          })),
        })),
      };

      // JSON 파일로 다운로드
      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `gumgang-threads-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      return true;
    },

    /** 유저 메시지 전송(싱글턴 멀티턴: 활성 스레드 맥락 유지) */
    sendUserMessage: (content: string) => {
      const t = this.ensureActiveThread();
      const msg: Message = {
        id: uid("m"),
        role: "user",
        content,
        ts: now(),
      };
      t.messages.push(msg);
      t.updatedAt = now();
      this.emit();
      return msg.id;
    },

    /** 어시스턴트 메시지 추가 */
    addAssistantMessage: (content: any, meta?: Message["meta"]) => {
      const normalize = (v: any): string => {
        if (v == null) return "";
        if (typeof v === "string") return v;
        try { return JSON.stringify(v, null, 2); } catch { return String(v); }
      };
      const t = this.ensureActiveThread();
      // 자리표시자("…")라면 기본적으로 streaming=true, placeholder=true
      const isPlaceholder =
        typeof content === "string" && content.trim() === "…";
      const mergedMeta: Message["meta"] = {
        ...(meta || {}),
        agentId: t.agentId,
        streaming: isPlaceholder ? true : (meta?.streaming ?? false),
        placeholder: isPlaceholder ? true : (meta?.placeholder ?? false),
      };
      const msg: Message = {
        id: uid("m"),
        role: "assistant",
        content: normalize(content),
        ts: now(),
        meta: mergedMeta,
      };
      t.messages.push(msg);
      t.updatedAt = now();
      this.emit();
      return msg.id;
    },

    /** 메시지 부분 업데이트(스트리밍 등) */
    patchMessage: (
      threadId: string,
      messageId: string,
      patch: Partial<Message>,
    ) => {
      const t = this.state.threads.find((x) => x.id === threadId);
      if (!t) return false;
      const m = t.messages.find((x) => x.id === messageId);
      if (!m) return false;

      // 스트리밍 완료/전환 로직: content가 "…"에서 실제 내용으로 바뀌면 placeholder=false
      // 또한 streaming 상태를 patch.meta.streaming 명시가 없더라도, 내용 길이 증가를 감지하여 false->true 유지 혹은 true->false 종료
      const prevContent = typeof m.content === "string" ? m.content : "";
      const nextContent =
        typeof patch.content === "string" ? patch.content : prevContent;

      // merge meta safely
      const prevMeta = m.meta || {};
      const patchMeta = patch.meta || {};
      const mergedMeta: Message["meta"] = { ...prevMeta, ...patchMeta };

      // placeholder 해제 조건: 이전이 "…" 또는 placeholder=true 였고, 다음 content가 "…"가 아닐 때
      const wasPlaceholder =
        prevMeta.placeholder || (prevContent && prevContent.trim() === "…");
      const nowPlaceholder = nextContent && nextContent.trim() === "…";
      if (wasPlaceholder && !nowPlaceholder) {
        mergedMeta.placeholder = false;
      }

      // streaming 상태 자동 보정:
      // - patch.meta.streaming이 명시되면 우선.
      // - 아니면: 자리표시자거나 길이 증가일 때만 true, 그 외에는 false로 고정(유휴 하트비트 방지)
      if (patchMeta.streaming !== undefined) {
        mergedMeta.streaming = patchMeta.streaming;
      } else {
        const grew = nextContent.length > prevContent.length;
        // 기본 규칙: placeholder(…) 또는 content 길이 증가일 때만 진행중으로 간주
        mergedMeta.streaming = !!(nowPlaceholder || grew);
      }

      Object.assign(m, { ...patch, meta: mergedMeta });
      t.updatedAt = now();
      this.emit();
      return true;
    },

    /** 메시지 삭제 */
    deleteMessage: (threadId: string, messageId: string) => {
      const t = this.state.threads.find((x) => x.id === threadId);
      if (!t) return false;
      const i = t.messages.findIndex((x) => x.id === messageId);
      if (i < 0) return false;
      t.messages.splice(i, 1);
      t.updatedAt = now();
      this.emit();
      return true;
    },

    /** MCP 설정 토글/수정 */
    setMCPEnabled: (enabled: boolean) => {
      this.state.mcp.enabled = enabled;
      this.emit();
    },
    setMCPServer: (baseUrl?: string, authToken?: string) => {
      this.state.mcp.server = { baseUrl, authToken };
      this.emit();
    },
    setMCPTools: (tools: ToolDef[]) => {
      this.state.mcp.tools = tools.slice();
      this.emit();
    },

    /** MCP 툴 호출/결과 로그 */
    logToolCall: (
      threadId: string,
      tool: string,
      args?: Record<string, any>,
    ) => {
      const entry = {
        id: uid("tool"),
        ts: now(),
        threadId,
        tool,
        args,
      };
      this.state.mcp.invocations.push(entry);
      this.emit();
      return entry.id;
    },
    logToolResult: (
      invocationId: string,
      result: { ok: boolean; data?: any; error?: string },
    ) => {
      const inv = this.state.mcp.invocations.find((x) => x.id === invocationId);
      if (!inv) return false;
      inv.result = { ...result };
      this.emit();
      return true;
    },

    /** 에이전트 관리(선택형) */
    upsertAgent: (agent: Agent) => {
      const idx = this.state.agents.findIndex((a) => a.id === agent.id);
      if (idx >= 0) this.state.agents[idx] = agent;
      else this.state.agents.push(agent);
      this.emit();
    },
    removeAgent: (agentId: string) => {
      const i = this.state.agents.findIndex((a) => a.id === agentId);
      if (i >= 0) {
        this.state.agents.splice(i, 1);
        // 스레드에 매핑된 경우 기본 에이전트로 폴백
        for (const t of this.state.threads) {
          if (t.agentId === agentId) t.agentId = DEFAULT_AGENTS[0].id;
        }
        this.emit();
      }
    },
  };
}

export const chatStore = new Store();

/** 헬퍼들 */

export function getActiveThread(): Thread {
  const s = chatStore.getState();
  return (
    s.threads.find((t) => t.id === s.activeThreadId) ??
    // 방어적 폴백
    s.threads[0]
  );
}

export function listThreads(): Thread[] {
  return chatStore.getState().threads.slice();
}

export function listAgents(): Agent[] {
  return chatStore.getState().agents.slice();
}

export function getAgent(agentId: string): Agent | undefined {
  return chatStore.getState().agents.find((a) => a.id === agentId);
}
