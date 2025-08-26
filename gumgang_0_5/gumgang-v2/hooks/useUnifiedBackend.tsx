/**
 * 통합 백엔드 연결 Hook
 * WebSocket + REST API 통합 관리
 */

import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  createContext,
  useContext,
  ReactNode,
} from "react";
import axios, { AxiosInstance } from "axios";

// ===========================================
// 타입 정의
// ===========================================

export interface SystemStatus {
  cpu_usage: number;
  memory_usage: number;
  gpu_usage: number;
  network_throughput: number;
  active_connections: number;
  timestamp: string;
}

export interface MemoryLayer {
  capacity: number;
  current_size: number;
  usage_rate: number;
  duration: number;
}

export interface MemoryStats {
  layers: Record<string, MemoryLayer>;
  total_memories: number;
  access_patterns?: Record<string, any>;
}

export interface SystemComponent {
  id: string;
  name: string;
  type: string;
  status: string;
  cpu_usage: number;
  memory_usage: number;
  connections: string[];
  position: {
    x: number;
    y: number;
    z: number;
  };
}

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

export interface ProcessingRequest {
  query: string;
  context?: Record<string, any>;
  user_id?: string;
  session_id?: string;
}

export interface WebSocketMessage {
  type: string;
  data?: any;
  [key: string]: any;
}

// ===========================================
// Hook Configuration
// ===========================================

interface UseUnifiedBackendConfig {
  wsUrl?: string;
  apiUrl?: string;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  enableAutoReconnect?: boolean;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Error) => void;
  onMessage?: (message: WebSocketMessage) => void;
}

// ===========================================
// 통합 백엔드 Hook
// ===========================================

export const useUnifiedBackend = (config: UseUnifiedBackendConfig = {}) => {
  const {
    wsUrl = "ws://localhost:8000/ws",
    apiUrl = "http://localhost:8000",
    reconnectInterval = 3000,
    maxReconnectAttempts = 10,
    enableAutoReconnect = true,
    onConnect,
    onDisconnect,
    onError,
    onMessage,
  } = config;

  // WebSocket 상태
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);

  // 시스템 상태
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [memoryStats, setMemoryStats] = useState<MemoryStats | null>(null);
  const [components, setComponents] = useState<SystemComponent[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  // 실시간 데이터
  const [realtimeData, setRealtimeData] = useState<any>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  // Refs
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const apiClientRef = useRef<AxiosInstance | null>(null);

  // ===========================================
  // Axios 클라이언트 초기화
  // ===========================================

  useEffect(() => {
    apiClientRef.current = axios.create({
      baseURL: apiUrl,
      timeout: 10000,
      headers: {
        "Content-Type": "application/json",
      },
    });

    // 요청 인터셉터
    apiClientRef.current.interceptors.request.use(
      (config) => {
        // 필요시 토큰 추가 등
        return config;
      },
      (error) => {
        return Promise.reject(error);
      },
    );

    // 응답 인터셉터
    apiClientRef.current.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          // 인증 에러 처리
        }
        return Promise.reject(error);
      },
    );
  }, [apiUrl]);

  // ===========================================
  // WebSocket 연결 관리
  // ===========================================

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      console.log("WebSocket already connected");
      return;
    }

    setIsConnecting(true);
    setConnectionError(null);

    try {
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log("WebSocket connected");
        setIsConnected(true);
        setIsConnecting(false);
        setReconnectAttempts(0);
        setConnectionError(null);

        // Ping 시작
        startPing();

        if (onConnect) {
          onConnect();
        }
      };

      ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          handleWebSocketMessage(message);

          if (onMessage) {
            onMessage(message);
          }
        } catch (error) {
          console.error("Failed to parse WebSocket message:", error);
        }
      };

      ws.onerror = (error) => {
        console.error("WebSocket error:", error);
        setConnectionError("WebSocket connection error");

        if (onError) {
          onError(new Error("WebSocket error"));
        }
      };

      ws.onclose = () => {
        console.log("WebSocket disconnected");
        setIsConnected(false);
        setIsConnecting(false);
        wsRef.current = null;

        // Ping 중지
        stopPing();

        if (onDisconnect) {
          onDisconnect();
        }

        // 자동 재연결
        if (enableAutoReconnect && reconnectAttempts < maxReconnectAttempts) {
          scheduleReconnect();
        }
      };

      wsRef.current = ws;
    } catch (error) {
      console.error("Failed to create WebSocket:", error);
      setIsConnecting(false);
      setConnectionError("Failed to establish connection");

      if (onError) {
        onError(error as Error);
      }
    }
  }, [
    wsUrl,
    reconnectAttempts,
    maxReconnectAttempts,
    enableAutoReconnect,
    onConnect,
    onDisconnect,
    onError,
    onMessage,
  ]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    stopPing();

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    setIsConnected(false);
    setIsConnecting(false);
  }, []);

  const scheduleReconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    reconnectTimeoutRef.current = setTimeout(() => {
      console.log(
        `Attempting to reconnect... (${reconnectAttempts + 1}/${maxReconnectAttempts})`,
      );
      setReconnectAttempts((prev) => prev + 1);
      connect();
    }, reconnectInterval);
  }, [connect, reconnectInterval, reconnectAttempts, maxReconnectAttempts]);

  // ===========================================
  // Ping/Pong
  // ===========================================

  const startPing = () => {
    stopPing();
    pingIntervalRef.current = setInterval(() => {
      sendMessage({ type: "ping" });
    }, 30000); // 30초마다 ping
  };

  const stopPing = () => {
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
      pingIntervalRef.current = null;
    }
  };

  // ===========================================
  // WebSocket 메시지 처리
  // ===========================================

  const handleWebSocketMessage = (message: WebSocketMessage) => {
    setLastUpdate(new Date());

    switch (message.type) {
      case "initial_data":
        if (message.system_status) setSystemStatus(message.system_status);
        if (message.memory_stats) setMemoryStats(message.memory_stats);
        if (message.components) setComponents(message.components);
        break;

      case "status_update":
        setSystemStatus(message.data);
        break;

      case "memory_update":
        setMemoryStats(message.data);
        break;

      case "components_update":
        setComponents(message.data);
        break;

      case "component_updated":
        setComponents((prev) =>
          prev.map((comp) =>
            comp.id === message.component.id ? message.component : comp,
          ),
        );
        break;

      case "process_response":
        const newMessage: ChatMessage = {
          role: "assistant",
          content: message.response,
          timestamp: new Date().toISOString(),
          metadata: { query: message.query },
        };
        setMessages((prev) => [...prev, newMessage]);
        break;

      case "memory_consolidated":
        setMemoryStats(message.stats);
        break;

      case "connection":
        console.log(
          `Connection event: ${message.action}, total: ${message.total_connections}`,
        );
        break;

      case "pong":
        // Pong received, connection is alive
        break;

      case "error":
        console.error("Server error:", message.message);
        setConnectionError(message.message);
        break;

      default:
        // 기타 실시간 데이터
        setRealtimeData(message);
    }
  };

  // ===========================================
  // WebSocket 메시지 전송
  // ===========================================

  const sendMessage = useCallback((message: WebSocketMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
      return true;
    }
    console.warn("WebSocket is not connected");
    return false;
  }, []);

  // ===========================================
  // REST API 메서드
  // ===========================================

  const api = {
    // 시스템 상태
    getStatus: async () => {
      const response = await apiClientRef.current?.get("/api/status");
      return response?.data;
    },

    // 메모리 시스템
    getMemoryStatus: async () => {
      const response = await apiClientRef.current?.get("/api/memory");
      return response?.data;
    },

    storeMemory: async (layer: string, content: string) => {
      const response = await apiClientRef.current?.post(
        "/api/memory/store",
        null,
        {
          params: { layer, content },
        },
      );
      return response?.data;
    },

    retrieveMemory: async (layer: string, query: string) => {
      const response = await apiClientRef.current?.get("/api/memory/retrieve", {
        params: { layer, query },
      });
      return response?.data;
    },

    // 컴포넌트
    getComponents: async () => {
      const response = await apiClientRef.current?.get("/api/components");
      return response?.data;
    },

    getComponent: async (componentId: string) => {
      const response = await apiClientRef.current?.get(
        `/api/components/${componentId}`,
      );
      return response?.data;
    },

    // 처리 요청
    process: async (request: ProcessingRequest) => {
      const response = await apiClientRef.current?.post(
        "/api/process",
        request,
      );
      return response?.data;
    },

    // 메시지
    getMessages: async (limit: number = 50) => {
      const response = await apiClientRef.current?.get("/api/messages", {
        params: { limit },
      });
      return response?.data;
    },

    // 메모리 통합
    consolidateMemories: async () => {
      const response = await apiClientRef.current?.post("/api/consolidate");
      return response?.data;
    },

    // 헬스 체크
    healthCheck: async () => {
      const response = await apiClientRef.current?.get("/health");
      return response?.data;
    },
  };

  // ===========================================
  // 유틸리티 메서드
  // ===========================================

  const requestStatus = useCallback(() => {
    return sendMessage({ type: "get_status" });
  }, [sendMessage]);

  const requestMemory = useCallback(() => {
    return sendMessage({ type: "get_memory" });
  }, [sendMessage]);

  const requestComponents = useCallback(() => {
    return sendMessage({ type: "get_components" });
  }, [sendMessage]);

  const processQuery = useCallback(
    (query: string) => {
      // WebSocket으로 처리
      const success = sendMessage({ type: "process", query });

      if (success) {
        // 사용자 메시지 추가
        const userMessage: ChatMessage = {
          role: "user",
          content: query,
          timestamp: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, userMessage]);
      }

      return success;
    },
    [sendMessage],
  );

  const updateComponent = useCallback(
    (componentId: string, updates: Partial<SystemComponent>) => {
      return sendMessage({
        type: "update_component",
        component_id: componentId,
        updates,
      });
    },
    [sendMessage],
  );

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  // ===========================================
  // 생명주기 관리
  // ===========================================

  useEffect(() => {
    connect();

    return () => {
      disconnect();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ===========================================
  // 반환 객체
  // ===========================================

  return {
    // 연결 상태
    isConnected,
    isConnecting,
    connectionError,
    reconnectAttempts,

    // 시스템 데이터
    systemStatus,
    memoryStats,
    components,
    messages,
    realtimeData,
    lastUpdate,

    // WebSocket 메서드
    connect,
    disconnect,
    sendMessage,

    // 유틸리티 메서드
    requestStatus,
    requestMemory,
    requestComponents,
    processQuery,
    updateComponent,
    clearMessages,

    // REST API
    api,
  };
};

// ===========================================
// 리액트 컨텍스트 (옵션)
// ===========================================

interface UnifiedBackendContextType
  extends ReturnType<typeof useUnifiedBackend> {}

const UnifiedBackendContext = createContext<
  UnifiedBackendContextType | undefined
>(undefined);

export const UnifiedBackendProvider = ({
  children,
  ...config
}: { children: ReactNode } & UseUnifiedBackendConfig) => {
  const backend = useUnifiedBackend(config);

  return (
    <UnifiedBackendContext.Provider value={backend}>
      {children}
    </UnifiedBackendContext.Provider>
  );
};

export const useBackend = () => {
  const context = useContext(UnifiedBackendContext);
  if (!context) {
    throw new Error("useBackend must be used within UnifiedBackendProvider");
  }
  return context;
};

export default useUnifiedBackend;
