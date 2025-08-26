"use client";

import React, {
  createContext,
  useContext,
  ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";

// WebSocket Context 타입 정의 (스텁)
interface WebSocketContextType {
  // 연결 상태
  isConnected: boolean;
  isConnecting: boolean;
  connectionError: string | null;
  socketId: string | undefined;

  // 연결 관리
  connect: () => Promise<void>;
  disconnect: () => void;

  // 이벤트 발송
  send: (event: string, data?: any) => void;
  request: <T = any>(event: string, data?: any, timeout?: number) => Promise<T>;

  // 채팅 관련
  startChatStream: (message: string, sessionId?: string) => void;
  stopChatStream: (sessionId: string) => void;

  // 구독 관리
  subscribeToMemory: (levels?: number[]) => void;
  unsubscribeFromMemory: () => void;
  subscribeToEvolution: () => void;
  unsubscribeFromEvolution: () => void;
  subscribeToSystemStatus: (interval?: number) => void;
  unsubscribeFromSystemStatus: () => void;

  // 실시간 데이터
  memoryUpdates: any[];
  chatStreams: Map<string, any>;
  evolutionEvents: any[];
  systemStatus: any | null;
}

// 기본 스텁 구현
const stubImplementation: WebSocketContextType = {
  isConnected: false,
  isConnecting: false,
  connectionError: null,
  socketId: undefined,
  connect: async () => {
    console.log(
      "WebSocketContext: Using stub implementation. Use useUnifiedBackend hook instead.",
    );
  },
  disconnect: () => {},
  send: () => {},
  request: async () => {
    throw new Error(
      "WebSocketContext: Stub implementation. Use useUnifiedBackend hook instead.",
    );
  },
  startChatStream: () => {},
  stopChatStream: () => {},
  subscribeToMemory: () => {},
  unsubscribeFromMemory: () => {},
  subscribeToEvolution: () => {},
  unsubscribeFromEvolution: () => {},
  subscribeToSystemStatus: () => {},
  unsubscribeFromSystemStatus: () => {},
  memoryUpdates: [],
  chatStreams: new Map(),
  evolutionEvents: [],
  systemStatus: null,
};

// Context 생성
const WebSocketContext =
  createContext<WebSocketContextType>(stubImplementation);

// Provider 컴포넌트 (아무것도 하지 않는 스텁)
export function WebSocketProvider({
  children,
  autoConnect: _autoConnect = true,
}: {
  children: ReactNode;
  autoConnect?: boolean;
}) {
  const wsRef = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [socketId, setSocketId] = useState<string | undefined>(undefined);
  const [memoryUpdates, setMemoryUpdates] = useState<any[]>([]);
  const chatStreams = useRef<Map<string, any>>(new Map()).current;
  const evolutionEvents = useRef<any[]>([]).current;
  const systemStatusRef = useRef<any | null>(null);
  const pending = useRef<
    Map<
      string,
      { resolve: (v: any) => void; reject: (e: any) => void; timeout: any }
    >
  >(new Map()).current;

  const url = (() => {
    const envUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
    if (envUrl) {
      try {
        const u = new URL(envUrl);
        const proto = u.protocol === "https:" ? "wss:" : "ws:";
        return `${proto}//${u.host}/ws`;
      } catch {
        const guessed = envUrl.startsWith("https")
          ? envUrl.replace(/^https:/, "wss:")
          : envUrl.replace(/^http:/, "ws:");
        return guessed.endsWith("/ws") ? guessed : `${guessed}/ws`;
      }
    }
    return "ws://localhost:8000/ws";
  })();

  const connect = async () => {
    if (
      wsRef.current &&
      (wsRef.current.readyState === WebSocket.OPEN ||
        wsRef.current.readyState === WebSocket.CONNECTING)
    ) {
      return;
    }

    setIsConnecting(true);
    setConnectionError(null);

    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
      setIsConnecting(false);
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        const type = msg?.type;

        if (type === "auth_success") {
          setSocketId(msg?.data?.connection_id);
        } else if (type === "memory-update") {
          const data = msg?.data;
          if (data?.tiers && typeof data?.ts_kst === "string") {
            setMemoryUpdates((prev) => {
              const next = prev.concat([data]);
              return next.length > 100 ? next.slice(-100) : next;
            });
          }
        }

        const reqId = msg?.requestId;
        if (reqId && pending.has(reqId)) {
          const entry = pending.get(reqId)!;
          clearTimeout(entry.timeout);
          entry.resolve(msg?.data);
          pending.delete(reqId);
        }
      } catch {
        // ignore malformed payloads
      }
    };

    ws.onerror = () => {
      setConnectionError("WebSocket error (see console, auto-retry enabled)");
    };

    ws.onclose = () => {
      setIsConnected(false);
      setIsConnecting(false);
      setSocketId(undefined);

      // reject all pending requests
      pending.forEach(({ reject, timeout }, id) => {
        clearTimeout(timeout);
        reject(new Error(`WebSocket closed (requestId=${id})`));
      });
      pending.clear();

      // auto-reconnect when enabled
      if (_autoConnect) {
        setTimeout(() => {
          connect();
        }, 2000);
      }
    };
  };

  const disconnect = () => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  };

  const send = (event: string, data?: any) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: event, data }));
    }
  };

  const request = async <T = any,>(
    event: string,
    data?: any,
    timeout = 5000,
  ): Promise<T> => {
    const id = Math.random().toString(36).slice(2);
    return new Promise<T>((resolve, reject) => {
      if (!(wsRef.current && wsRef.current.readyState === WebSocket.OPEN)) {
        reject(
          new Error(
            "WebSocket not connected — check server/network and try again",
          ),
        );
        return;
      }
      const timeoutHandle = setTimeout(() => {
        pending.delete(id);
        reject(
          new Error(
            `Request timeout (event=${event}, requestId=${id}, after=${timeout}ms)`,
          ),
        );
      }, timeout);
      pending.set(id, { resolve, reject, timeout: timeoutHandle });
      wsRef.current!.send(JSON.stringify({ type: event, data, requestId: id }));
    });
  };

  // Placeholder subscriptions/streams (no-op for now)
  const subscribeToMemory = (_levels?: number[]) => {};
  const unsubscribeFromMemory = () => {};
  const subscribeToEvolution = () => {};
  const unsubscribeFromEvolution = () => {};
  const subscribeToSystemStatus = (_interval?: number) => {};
  const unsubscribeFromSystemStatus = () => {};
  const startChatStream = (_message: string, _sessionId?: string) => {};
  const stopChatStream = (_sessionId: string) => {};

  useEffect(() => {
    if (_autoConnect) {
      connect();
      return () => disconnect();
    }
  }, [_autoConnect]);

  const value: WebSocketContextType = {
    isConnected,
    isConnecting,
    connectionError,
    socketId,
    connect,
    disconnect,
    send,
    request,
    startChatStream,
    stopChatStream,
    subscribeToMemory,
    unsubscribeFromMemory,
    subscribeToEvolution,
    unsubscribeFromEvolution,
    subscribeToSystemStatus,
    unsubscribeFromSystemStatus,
    memoryUpdates,
    chatStreams,
    evolutionEvents,
    systemStatus: systemStatusRef.current,
  };

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
}

// Hook
export function useWebSocket() {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error("useWebSocket must be used within WebSocketProvider");
  }
  return context;
}

// 타입 내보내기
export type { WebSocketContextType };
