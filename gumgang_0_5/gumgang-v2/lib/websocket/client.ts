import io from "socket.io-client";
// import type { CanonHeader } from "../../types/core"; // Removed: unused import

// WS Event types (no actual binding)
// type WSEvent = "metrics" | "memory-update" | "notification" | "selection-3d"; // Removed: unused type
// interface WSMessage<T = unknown> {
//   type: WSEvent;
//   payload: T;
//   canon?: CanonHeader;
// }

// WebSocket 이벤트 타입 정의
export interface MemoryUpdateEvent {
  level: number;
  data: any;
  timestamp: string;
  operation: "create" | "update" | "delete";
}

export interface ChatStreamEvent {
  id: string;
  chunk: string;
  isComplete: boolean;
  metadata?: {
    tokens?: number;
    model?: string;
  };
}

export interface EvolutionEvent {
  id: string;
  type: "mutation" | "optimization" | "adaptation" | "learning";
  severity: "low" | "medium" | "high" | "critical";
  title: string;
  description: string;
  timestamp: string;
  changes?: {
    before: string;
    after: string;
    language: string;
    filename: string;
  };
}

export interface SystemStatusEvent {
  cpu: number;
  memory: number;
  activeConnections: number;
  uptime: number;
  memoryLevels: {
    level: number;
    count: number;
    size: number;
  }[];
}

// WebSocket 클라이언트 클래스
export class WebSocketClient {
  private socket: any = null;
  private listeners: Map<string, Set<Function>> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private isConnecting = false;
  private connectionPromise: Promise<void> | null = null;

  constructor() {
    // 브라우저 환경에서만 자동 연결
    if (typeof window !== "undefined") {
      this.connect();
    }
  }

  // WebSocket 연결
  async connect(): Promise<void> {
    if (this.socket?.connected) {
      console.log("WebSocket already connected");
      return;
    }

    if (this.isConnecting && this.connectionPromise) {
      return this.connectionPromise;
    }

    this.isConnecting = true;
    this.connectionPromise = new Promise((resolve, reject) => {
      try {
        // 백엔드 URL 설정 (환경변수 또는 기본값)
        const wsUrl = process.env.NEXT_PUBLIC_WS_URL || "http://localhost:8001";

        console.log("Connecting to WebSocket:", wsUrl);

        this.socket = io(wsUrl, {
          reconnection: true,
          reconnectionAttempts: this.maxReconnectAttempts,
          reconnectionDelay: this.reconnectDelay,
          reconnectionDelayMax: 10000,
          transports: ["polling", "websocket"],
          path: "/socket.io/",
        });

        // 연결 성공
        this.socket.on("connect", () => {
          console.log("WebSocket connected:", this.socket?.id);
          this.reconnectAttempts = 0;
          this.emit("connection:status", { connected: true });
          this.isConnecting = false;
          resolve();
        });

        // 연결 끊김
        this.socket.on("disconnect", (reason: string) => {
          console.log("WebSocket disconnected:", reason);
          this.emit("connection:status", { connected: false, reason });
        });

        // 재연결 시도
        this.socket.on("reconnect_attempt", (attemptNumber: number) => {
          console.log("Reconnecting...", attemptNumber);
          this.reconnectAttempts = attemptNumber;
          this.emit("connection:status", {
            connected: false,
            reconnecting: true,
            attempt: attemptNumber,
          });
        });

        // 연결 에러
        this.socket.on("connect_error", (error: Error) => {
          console.error("WebSocket connection error:", error.message);
          this.emit("connection:error", error);

          if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            this.isConnecting = false;
            reject(error);
          }
        });

        // 기본 이벤트 리스너 등록
        this.registerDefaultListeners();
      } catch (error) {
        console.error("Failed to create WebSocket connection:", error);
        this.isConnecting = false;
        reject(error);
      }
    });

    return this.connectionPromise;
  }

  // 기본 이벤트 리스너 등록
  private registerDefaultListeners() {
    if (!this.socket) return;

    // 메모리 업데이트 이벤트
    this.socket.on("memory:update", (data: MemoryUpdateEvent) => {
      this.emit("memory:update", data);
    });

    // 채팅 스트림 이벤트
    this.socket.on("chat:stream", (data: ChatStreamEvent) => {
      this.emit("chat:stream", data);
    });

    // 진화 이벤트
    this.socket.on("evolution:event", (data: EvolutionEvent) => {
      this.emit("evolution:event", data);
    });

    // 시스템 상태 업데이트
    this.socket.on("system:status", (data: SystemStatusEvent) => {
      this.emit("system:status", data);
    });

    // 에러 이벤트
    this.socket.on("error", (error: any) => {
      console.error("WebSocket error:", error);
      this.emit("error", error);
    });
  }

  // 연결 해제
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  // 이벤트 발송
  send(event: string, data?: any): void {
    if (!this.socket?.connected) {
      console.warn("WebSocket not connected. Attempting to connect...");
      this.connect()
        .then(() => {
          this.socket?.emit(event, data);
        })
        .catch((error) => {
          console.error("Failed to send event:", error);
        });
      return;
    }

    this.socket.emit(event, data);
  }

  // Promise 기반 이벤트 발송 (응답 대기)
  async request<T = any>(
    event: string,
    data?: any,
    timeout = 5000,
  ): Promise<T> {
    return new Promise(async (resolve, reject) => {
      if (!this.socket?.connected) {
        await this.connect().catch(reject);
      }

      const timer = setTimeout(() => {
        reject(new Error(`Request timeout: ${event}`));
      }, timeout);

      const responseEvent = `${event}:response`;

      const handleResponse = (response: any) => {
        clearTimeout(timer);
        if (response.error) {
          reject(new Error(response.error));
        } else {
          resolve(response.data || response);
        }
      };

      this.socket?.once(responseEvent, handleResponse);
      this.socket?.emit(event, data);
    });
  }

  // 이벤트 리스너 등록
  on(event: string, callback: Function): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }

    this.listeners.get(event)?.add(callback);

    // 실제 소켓 이벤트도 등록 (내부 이벤트가 아닌 경우)
    if (!event.startsWith("connection:") && !event.startsWith("error")) {
      this.socket?.on(event, callback as any);
    }

    // unsubscribe 함수 반환
    return () => {
      this.off(event, callback);
    };
  }

  // 이벤트 리스너 제거
  off(event: string, callback: Function) {
    this.listeners.get(event)?.delete(callback);

    if (this.listeners.get(event)?.size === 0) {
      this.listeners.delete(event);
    }

    // 실제 소켓 이벤트도 제거
    if (!event.startsWith("connection:") && !event.startsWith("error")) {
      this.socket?.off(event, callback as any);
    }
  }

  // 내부 이벤트 발생
  private emit(event: string, data?: any) {
    this.listeners.get(event)?.forEach((callback) => {
      try {
        callback(data);
      } catch (error) {
        console.error(`Error in event listener for ${event}:`, error);
      }
    });
  }

  // 연결 상태 확인
  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  // 소켓 ID 가져오기
  getSocketId(): string | undefined {
    return this.socket?.id;
  }

  // 채팅 스트림 시작
  startChatStream(message: string, sessionId?: string) {
    this.send("chat:start", { message, sessionId });
  }

  // 채팅 스트림 중지
  stopChatStream(sessionId: string) {
    this.send("chat:stop", { sessionId });
  }

  // 메모리 구독
  subscribeToMemory(levels?: number[]) {
    this.send("memory:subscribe", { levels });
  }

  // 메모리 구독 해제
  unsubscribeFromMemory() {
    this.send("memory:unsubscribe");
  }

  // 진화 이벤트 구독
  subscribeToEvolution() {
    this.send("evolution:subscribe");
  }

  // 진화 이벤트 구독 해제
  unsubscribeFromEvolution() {
    this.send("evolution:unsubscribe");
  }

  // 시스템 상태 구독
  subscribeToSystemStatus(interval = 5000) {
    this.send("system:subscribe", { interval });
  }

  // 시스템 상태 구독 해제
  unsubscribeFromSystemStatus() {
    this.send("system:unsubscribe");
  }
}

// 싱글톤 인스턴스
let wsClient: WebSocketClient | null = null;

// WebSocket 클라이언트 가져오기
export const getWebSocketClient = (): WebSocketClient => {
  if (!wsClient) {
    wsClient = new WebSocketClient();
  }
  return wsClient;
};

// React Hook for WebSocket
export const useWebSocket = () => {
  const client = getWebSocketClient();

  return {
    client,
    connect: () => client.connect(),
    disconnect: () => client.disconnect(),
    send: (event: string, data?: any) => client.send(event, data),
    request: <T = any>(event: string, data?: any) =>
      client.request<T>(event, data),
    on: (event: string, callback: Function) => client.on(event, callback),
    off: (event: string, callback: Function) => client.off(event, callback),
    isConnected: () => client.isConnected(),
    getSocketId: () => client.getSocketId(),
  };
};

export default getWebSocketClient;
