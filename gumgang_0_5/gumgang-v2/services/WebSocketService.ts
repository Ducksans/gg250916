import { EventEmitter } from "events";
// import type { CanonHeader } from "../../types/core"; // Removed: module not found

// WS Event types (no actual binding)
// type WSEvent = "metrics" | "memory-update" | "notification" | "selection-3d"; // Removed: unused type
// interface WSMessage<T = unknown> {
//   type: WSEvent;
//   payload: T;
//   canon?: any; // CanonHeader type not available
// }

// Types matching the backend
export enum MessageType {
  // Connection
  CONNECT = "connect",
  DISCONNECT = "disconnect",
  PING = "ping",
  PONG = "pong",

  // Authentication
  AUTH = "auth",
  AUTH_SUCCESS = "auth_success",
  AUTH_FAILED = "auth_failed",

  // Room Management
  JOIN_ROOM = "join_room",
  LEAVE_ROOM = "leave_room",
  ROOM_JOINED = "room_joined",
  ROOM_LEFT = "room_left",
  ROOM_USERS = "room_users",

  // Document Operations
  DOCUMENT_CHANGE = "document_change",
  DOCUMENT_SAVE = "document_save",
  DOCUMENT_SYNC = "document_sync",
  CURSOR_POSITION = "cursor_position",
  SELECTION_CHANGE = "selection_change",

  // Collaboration
  USER_JOINED = "user_joined",
  USER_LEFT = "user_left",
  USER_TYPING = "user_typing",
  USER_IDLE = "user_idle",

  // AI Operations
  AI_SUGGESTION = "ai_suggestion",
  AI_ANALYSIS = "ai_analysis",
  AI_COMPLETION = "ai_completion",

  // Error
  ERROR = "error",

  // File Operations
  FILE_OPENED = "file_opened",
  FILE_CLOSED = "file_closed",
  FILE_RENAMED = "file_renamed",
  FILE_DELETED = "file_deleted",
}

// Interfaces
export interface User {
  id: string;
  username: string;
  joined_at: string;
  last_activity: string;
  cursor_position?: CursorPosition;
  selection?: Selection;
  is_typing: boolean;
  color: string;
}

export interface Room {
  id: string;
  name: string;
  created_at: string;
  users: string[];
  document_version: number;
  last_modified: string;
  settings: Record<string, any>;
}

export interface CursorPosition {
  line: number;
  column: number;
  file?: string;
}

export interface Selection {
  start: CursorPosition;
  end: CursorPosition;
}

export interface DocumentChange {
  type: "insert" | "delete" | "replace";
  range: {
    start: CursorPosition;
    end: CursorPosition;
  };
  text?: string;
  timestamp: number;
}

export interface WebSocketMessage {
  type: MessageType;
  data?: any;
}

export interface ConnectionOptions {
  url?: string;
  userId?: string;
  username?: string;
  token?: string;
  reconnect?: boolean;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  heartbeatInterval?: number;
}

// Connection states
export enum ConnectionState {
  DISCONNECTED = "disconnected",
  CONNECTING = "connecting",
  CONNECTED = "connected",
  RECONNECTING = "reconnecting",
  ERROR = "error",
}

// WebSocket Service Class
export class WebSocketService extends EventEmitter {
  private ws: WebSocket | null = null;
  private options: Required<ConnectionOptions>;
  private connectionState: ConnectionState = ConnectionState.DISCONNECTED;
  private reconnectAttempts = 0;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private messageQueue: WebSocketMessage[] = [];
  private currentUser: User | null = null;
  private currentRoom: Room | null = null;
  private roomUsers: Map<string, User> = new Map();

  private documentVersion = 0;

  constructor(options: ConnectionOptions = {}) {
    super();
    this.options = {
      url: options.url || "ws://localhost:8001/ws",
      userId: options.userId || this.generateUserId(),
      username:
        options.username || `User_${Math.random().toString(36).substr(2, 8)}`,
      token: options.token || "",
      reconnect: options.reconnect !== false,
      reconnectInterval: options.reconnectInterval || 3000,
      maxReconnectAttempts: options.maxReconnectAttempts || 10,
      heartbeatInterval: options.heartbeatInterval || 30000,
    };
  }

  // Connection management
  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        resolve();
        return;
      }

      this.setConnectionState(ConnectionState.CONNECTING);

      const wsUrl = new URL(this.options.url);
      wsUrl.searchParams.append("user_id", this.options.userId);
      wsUrl.searchParams.append("username", this.options.username);
      if (this.options.token) {
        wsUrl.searchParams.append("token", this.options.token);
      }

      this.ws = new WebSocket(wsUrl.toString());

      this.ws.onopen = () => {
        console.log("WebSocket connected");
        this.setConnectionState(ConnectionState.CONNECTED);
        this.reconnectAttempts = 0;
        this.startHeartbeat();
        this.flushMessageQueue();
        this.emit("connected");
        resolve();
      };

      this.ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          this.handleMessage(message);
        } catch (error) {
          console.error("Failed to parse message:", error);
        }
      };

      this.ws.onerror = (error) => {
        console.error("WebSocket error:", error);
        this.setConnectionState(ConnectionState.ERROR);
        this.emit("error", error);
        reject(error);
      };

      this.ws.onclose = (event) => {
        console.log("WebSocket disconnected", event.code, event.reason);
        this.setConnectionState(ConnectionState.DISCONNECTED);
        this.stopHeartbeat();
        this.emit("disconnected", { code: event.code, reason: event.reason });

        if (this.options.reconnect && !event.wasClean) {
          this.attemptReconnect();
        }
      };

      // Timeout for initial connection
      setTimeout(() => {
        if (this.connectionState === ConnectionState.CONNECTING) {
          this.ws?.close();
          reject(new Error("Connection timeout"));
        }
      }, 10000);
    });
  }

  disconnect(): void {
    this.options.reconnect = false;
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    if (this.ws) {
      this.ws.close(1000, "Client disconnect");
      this.ws = null;
    }
    this.stopHeartbeat();
    this.setConnectionState(ConnectionState.DISCONNECTED);
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.options.maxReconnectAttempts) {
      console.error("Max reconnection attempts reached");
      this.emit("reconnect_failed");
      return;
    }

    this.reconnectAttempts++;
    this.setConnectionState(ConnectionState.RECONNECTING);
    console.log(`Reconnecting... Attempt ${this.reconnectAttempts}`);

    this.reconnectTimeout = setTimeout(
      () => {
        this.connect().catch((error) => {
          console.error("Reconnection failed:", error);
        });
      },
      this.options.reconnectInterval * Math.min(this.reconnectAttempts, 5),
    );
  }

  private setConnectionState(state: ConnectionState): void {
    if (this.connectionState !== state) {
      this.connectionState = state;
      this.emit("connection_state_changed", state);
    }
  }

  getConnectionState(): ConnectionState {
    return this.connectionState;
  }

  isConnected(): boolean {
    return this.connectionState === ConnectionState.CONNECTED;
  }

  // Message handling
  private handleMessage(message: WebSocketMessage): void {
    const { type, data } = message;

    switch (type) {
      case MessageType.AUTH_SUCCESS:
        this.currentUser = data.user;
        this.emit("auth_success", data);
        break;

      case MessageType.AUTH_FAILED:
        this.emit("auth_failed", data);
        break;

      case MessageType.PING:
        this.send({ type: MessageType.PONG });
        break;

      case MessageType.ROOM_JOINED:
        this.currentRoom = data.room;
        this.documentVersion = data.room.document_version;
        data.users.forEach((user: User) => {
          this.roomUsers.set(user.id, user);
        });
        this.emit("room_joined", data);
        break;

      case MessageType.ROOM_LEFT:
        this.currentRoom = null;
        this.roomUsers.clear();
        this.emit("room_left", data);
        break;

      case MessageType.USER_JOINED:
        this.roomUsers.set(data.user.id, data.user);
        this.emit("user_joined", data);
        break;

      case MessageType.USER_LEFT:
        this.roomUsers.delete(data.user.id);
        this.emit("user_left", data);
        break;

      case MessageType.DOCUMENT_CHANGE:
        this.handleDocumentChange(data);
        break;

      case MessageType.CURSOR_POSITION:
        this.handleCursorPosition(data);
        break;

      case MessageType.SELECTION_CHANGE:
        this.handleSelectionChange(data);
        break;

      case MessageType.USER_TYPING:
      case MessageType.USER_IDLE:
        this.handleTypingStatus(data);
        break;

      case MessageType.ERROR:
        console.error("Server error:", data.message);
        this.emit("server_error", data);
        break;

      default:
        this.emit(type, data);
    }
  }

  private send(message: WebSocketMessage): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      this.messageQueue.push(message);
    }
  }

  private flushMessageQueue(): void {
    while (this.messageQueue.length > 0 && this.isConnected()) {
      const message = this.messageQueue.shift();
      if (message) {
        this.send(message);
      }
    }
  }

  // Heartbeat
  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.heartbeatInterval = setInterval(() => {
      if (this.isConnected()) {
        this.send({ type: MessageType.PING });
      }
    }, this.options.heartbeatInterval);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  // Room operations
  joinRoom(roomId: string, roomName?: string): void {
    this.send({
      type: MessageType.JOIN_ROOM,
      data: { room_id: roomId, room_name: roomName },
    });
  }

  leaveRoom(roomId: string): void {
    this.send({
      type: MessageType.LEAVE_ROOM,
      data: { room_id: roomId },
    });
  }

  getCurrentRoom(): Room | null {
    return this.currentRoom;
  }

  getRoomUsers(): User[] {
    return Array.from(this.roomUsers.values());
  }

  // Document operations
  sendDocumentChange(roomId: string, changes: DocumentChange[]): void {
    this.send({
      type: MessageType.DOCUMENT_CHANGE,
      data: { room_id: roomId, changes },
    });
  }

  private handleDocumentChange(data: any): void {
    this.documentVersion = data.version;
    this.emit("document_change", {
      user: data.user,
      changes: data.changes,
      version: data.version,
      timestamp: data.timestamp,
    });
  }

  // Cursor and selection
  sendCursorPosition(roomId: string, position: CursorPosition): void {
    this.send({
      type: MessageType.CURSOR_POSITION,
      data: { room_id: roomId, position },
    });
  }

  private handleCursorPosition(data: any): void {
    const user = this.roomUsers.get(data.user.id);
    if (user) {
      user.cursor_position = data.position;
    }
    this.emit("cursor_position", data);
  }

  sendSelectionChange(roomId: string, selection: Selection): void {
    this.send({
      type: MessageType.SELECTION_CHANGE,
      data: { room_id: roomId, selection },
    });
  }

  private handleSelectionChange(data: any): void {
    const user = this.roomUsers.get(data.user.id);
    if (user) {
      user.selection = data.selection;
    }
    this.emit("selection_change", data);
  }

  // Typing status
  sendTypingStatus(roomId: string, isTyping: boolean): void {
    this.send({
      type: MessageType.USER_TYPING,
      data: { room_id: roomId, is_typing: isTyping },
    });
  }

  private handleTypingStatus(data: any): void {
    const user = this.roomUsers.get(data.user.id);
    if (user) {
      user.is_typing = data.is_typing;
    }
    this.emit(data.is_typing ? "user_typing" : "user_idle", data);
  }

  // Utility methods
  private generateUserId(): string {
    return `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  getCurrentUser(): User | null {
    return this.currentUser;
  }

  getDocumentVersion(): number {
    return this.documentVersion;
  }

  // Conflict resolution
  resolveConflict(
    localChanges: DocumentChange[],
    remoteChanges: DocumentChange[],
  ): DocumentChange[] {
    // Simple operational transform for conflict resolution
    // This is a basic implementation - can be enhanced with more sophisticated algorithms
    const resolved: DocumentChange[] = [];

    // Sort changes by timestamp
    const allChanges = [...localChanges, ...remoteChanges].sort(
      (a, b) => a.timestamp - b.timestamp,
    );

    for (const change of allChanges) {
      // Apply transformations based on previous changes
      let transformedChange = { ...change };

      for (const appliedChange of resolved) {
        transformedChange = this.transformChange(
          transformedChange,
          appliedChange,
        );
      }

      resolved.push(transformedChange);
    }

    return resolved;
  }

  private transformChange(
    change: DocumentChange,
    against: DocumentChange,
  ): DocumentChange {
    // Basic operational transform logic
    // This handles simple cases - would need more sophisticated logic for production
    const transformed = { ...change };

    if (
      against.type === "insert" &&
      change.range.start.line >= against.range.end.line
    ) {
      // Adjust line numbers if insertion happened before
      const linesDiff = against.text?.split("\n").length || 1;
      transformed.range.start.line += linesDiff - 1;
      transformed.range.end.line += linesDiff - 1;
    } else if (
      against.type === "delete" &&
      change.range.start.line > against.range.start.line
    ) {
      // Adjust line numbers if deletion happened before
      const linesDeleted = against.range.end.line - against.range.start.line;
      transformed.range.start.line -= linesDeleted;
      transformed.range.end.line -= linesDeleted;
    }

    return transformed;
  }
}

// Singleton instance
let wsService: WebSocketService | null = null;

export function getWebSocketService(
  options?: ConnectionOptions,
): WebSocketService {
  if (!wsService) {
    wsService = new WebSocketService(options);
  }
  return wsService;
}

export function disposeWebSocketService(): void {
  if (wsService) {
    wsService.disconnect();
    wsService.removeAllListeners();
    wsService = null;
  }
}

// React Hook for WebSocket
export function useWebSocket(options?: ConnectionOptions) {
  const [connectionState, setConnectionState] = React.useState<ConnectionState>(
    ConnectionState.DISCONNECTED,
  );
  const [currentUser, setCurrentUser] = React.useState<User | null>(null);
  const [roomUsers, setRoomUsers] = React.useState<User[]>([]);
  const [currentRoom, setCurrentRoom] = React.useState<Room | null>(null);

  const wsRef = React.useRef<WebSocketService | null>(null);

  React.useEffect(() => {
    const ws = getWebSocketService(options);
    wsRef.current = ws;

    // Event listeners
    const handleConnectionStateChange = (state: ConnectionState) => {
      setConnectionState(state);
    };

    const handleAuthSuccess = (data: any) => {
      setCurrentUser(data.user);
    };

    const handleRoomJoined = (data: any) => {
      setCurrentRoom(data.room);
      setRoomUsers(data.users);
    };

    const handleUserJoined = () => {
      setRoomUsers(ws.getRoomUsers());
    };

    const handleUserLeft = () => {
      setRoomUsers(ws.getRoomUsers());
    };

    // Register event listeners
    ws.on("connection_state_changed", handleConnectionStateChange);
    ws.on("auth_success", handleAuthSuccess);
    ws.on("room_joined", handleRoomJoined);
    ws.on("user_joined", handleUserJoined);
    ws.on("user_left", handleUserLeft);

    // Connect
    ws.connect().catch(console.error);

    // Cleanup
    return () => {
      ws.off("connection_state_changed", handleConnectionStateChange);
      ws.off("auth_success", handleAuthSuccess);
      ws.off("room_joined", handleRoomJoined);
      ws.off("user_joined", handleUserJoined);
      ws.off("user_left", handleUserLeft);
    };
  }, []);

  return {
    ws: wsRef.current,
    connectionState,
    currentUser,
    roomUsers,
    currentRoom,
    isConnected: connectionState === ConnectionState.CONNECTED,
  };
}

// Export for external use
import React from "react";
export default WebSocketService;
