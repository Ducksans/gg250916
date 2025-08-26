// WebSocket type definitions for Gumgang 2.0

// WebSocket ready state constants
export type WSReady = 0 | 1 | 2 | 3; // CONNECTING/OPEN/CLOSING/CLOSED

// WebSocket-like interface
export type WSLike = {
  send(data: string | ArrayBufferLike | Blob | ArrayBufferView): void;
  close(code?: number, reason?: string): void;
  readyState: WSReady;
  addEventListener(type: string, listener: EventListener): void;
  removeEventListener(type: string, listener: EventListener): void;
};

// Message event type
export type MessageEvt<T = unknown> = {
  data: T;
  origin?: string;
  lastEventId?: string;
  source?: MessageEventSource | null;
  ports?: ReadonlyArray<MessagePort>;
};

// Close event type
export type CloseEvt = {
  code: number;
  reason?: string;
  wasClean?: boolean;
};

// Error event type
export type ErrorEvt = {
  message?: string;
  error?: Error;
};

// WebSocket event map
export interface WSEventMap {
  open: Event;
  message: MessageEvt;
  error: ErrorEvt;
  close: CloseEvt;
}

// WebSocket connection state
export interface WSConnectionState {
  isConnected: boolean;
  readyState: WSReady;
  error?: string;
  reconnectAttempts?: number;
}

// WebSocket configuration
export interface WSConfig {
  url: string;
  protocols?: string | string[];
  reconnect?: boolean;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  heartbeatInterval?: number;
}
