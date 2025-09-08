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

export type Role = 'user' | 'assistant' | 'system';

export type ToolParamSchema =
  | { type: 'object'; properties?: Record<string, any>; required?: string[] }
  | { type: 'string' | 'number' | 'boolean' | 'array' | 'null' };

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

const LS_KEY = 'gg_a1_chat_store_v1';

function now() {
  return Date.now();
}

function uid(prefix = 'id') {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}_${Date.now().toString(36)}`;
}

/** 기본 에이전트: 스크린샷/요구사항 기반 시드 */
const DEFAULT_AGENTS: Agent[] = [
  {
    id: 'gpt4o',
    name: '기본 채팅 (GPT-4o)',
    model: 'gpt-4o',
    systemPrompt:
      '당신은 금강의 기본 대화 에이전트입니다. 간결하고 명확하게 한국어로 답변합니다.',
    tools: [
      { id: 'fs', name: '파일 시스템', description: '읽기/목록/간단 정보 조회' },
      { id: 'web', name: '웹 검색', description: '간단 웹 검색/요약' },
    ],
    tags: ['chat', 'default'],
  },
  {
    id: 'researcher',
    name: '리서처 (qwen2.5-rb-instruct)',
    model: 'qwen2.5-rb-instruct',
    systemPrompt:
      '신뢰성 있는 출처를 우선하여 근거 중심으로 정보를 수집/정리합니다.',
    tools: [{ id: 'web', name: '웹 검색' }],
    tags: ['research'],
  },
  {
    id: 'code_reviewer',
    name: '코드 리뷰어 (sonnet)',
    model: 'claude-3.5-sonnet',
    systemPrompt:
      'TypeScript/React/Vite/Node 생태계 코드 리뷰어. 안정성과 가독성을 우선.',
    tools: [{ id: 'fs', name: '파일 시스템' }],
    tags: ['code', 'review'],
  },
];

/** 초기 스레드 */
function makeDefaultThread(): Thread {
  const id = uid('thread');
  const ts = now();
  return {
    id,
    title: 'Thread 1',
    agentId: DEFAULT_AGENTS[0].id,
    createdAt: ts,
    updatedAt: ts,
    messages: [
      {
        id: uid('m'),
        role: 'assistant',
        content: '안녕하세요! 금강 A1 개발 UI입니다.',
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

/** 로컬 스토리지 로드/세이브 */
function loadState(): ChatState {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return makeDefaultState();
    const parsed = JSON.parse(raw);
    // 간단한 마이그레이션 자리
    if (!parsed.version) return makeDefaultState();
    return parsed as ChatState;
  } catch {
    return makeDefaultState();
  }
}

function saveState(state: ChatState) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
}

/** 간단한 옵저버 */
class Store {
  private state: ChatState;
  private listeners: Set<Listener>;

  constructor() {
    this.state = loadState();
    this.listeners = new Set();
  }

  getState() {
    return this.state;
  }

  subscribe(fn: Listener) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private emit() {
    saveState(this.state);
    for (const fn of this.listeners) {
      try {
        fn();
      } catch {
        // ignore listener error
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
    /** 스레드 생성 */
    createThread: (title?: string, agentId?: string) => {
      const t = makeDefaultThread();
      if (title) t.title = title;
      if (agentId) t.agentId = agentId;
      t.updatedAt = now();
      this.state.threads.unshift(t);
      this.state.activeThreadId = t.id;
      this.emit();
      return t.id;
    },

    /** 스레드 전환 */
    switchThread: (threadId: string) => {
      const found = this.state.threads.find((t) => t.id === threadId);
      if (!found) return false;
      this.state.activeThreadId = threadId;
      this.emit();
      return true;
    },

    /** 스레드 제목 변경 */
    renameThread: (threadId: string, title: string) => {
      const t = this.state.threads.find((x) => x.id === threadId);
      if (!t) return false;
      t.title = title;
      t.updatedAt = now();
      this.emit();
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
      this.emit();
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
      this.emit();
      return true;
    },

    /** 유저 메시지 전송(싱글턴 멀티턴: 활성 스레드 맥락 유지) */
    sendUserMessage: (content: string) => {
      const t = this.ensureActiveThread();
      const msg: Message = {
        id: uid('m'),
        role: 'user',
        content,
        ts: now(),
      };
      t.messages.push(msg);
      t.updatedAt = now();
      this.emit();
      return msg.id;
    },

    /** 어시스턴트 메시지 추가 */
    addAssistantMessage: (content: string, meta?: Message['meta']) => {
      const t = this.ensureActiveThread();
      const msg: Message = {
        id: uid('m'),
        role: 'assistant',
        content,
        ts: now(),
        meta: { ...(meta || {}), agentId: t.agentId },
      };
      t.messages.push(msg);
      t.updatedAt = now();
      this.emit();
      return msg.id;
    },

    /** 메시지 부분 업데이트(스트리밍 등) */
    patchMessage: (threadId: string, messageId: string, patch: Partial<Message>) => {
      const t = this.state.threads.find((x) => x.id === threadId);
      if (!t) return false;
      const m = t.messages.find((x) => x.id === messageId);
      if (!m) return false;
      Object.assign(m, patch);
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
    logToolCall: (threadId: string, tool: string, args?: Record<string, any>) => {
      const entry = {
        id: uid('tool'),
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
