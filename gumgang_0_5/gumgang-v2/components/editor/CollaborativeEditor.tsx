"use client";

import React, { useEffect, useRef, useState } from "react";
import { editor } from "monaco-editor";
import dynamic from "next/dynamic";
import {
  getWebSocketService,
  WebSocketService,
  User,
  Room,
  DocumentChange,
  CursorPosition,
  Selection,
  ConnectionState,
} from "../../services/WebSocketService";
import {
  UsersIcon,
  CircleIcon,
  WifiIcon,
  WifiOffIcon,
  SaveIcon,
  RefreshCwIcon,
  GitBranchIcon,
  MessageSquareIcon,
  EyeIcon,
  EyeOffIcon,
} from "lucide-react";

// Dynamically import Monaco to avoid SSR issues
const MonacoEditor = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
});

interface CollaborativeEditorProps {
  roomId: string;
  roomName?: string;
  initialValue?: string;
  language?: string;
  height?: string;
  onSave?: (content: string) => void;
  className?: string;
}

// interface UserCursor {
//   userId: string;
//   username: string;
//   color: string;
//   position: CursorPosition;
//   decorationId?: string;
// }

// interface UserSelection {
//   userId: string;
//   username: string;
//   color: string;
//   selection: Selection;
//   decorationId?: string;
// }

export const CollaborativeEditor: React.FC<CollaborativeEditorProps> = ({
  roomId,
  roomName,
  initialValue = "",
  language = "javascript",
  height = "600px",
  onSave,
  className = "",
}) => {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<any>(null);
  const wsServiceRef = useRef<WebSocketService | null>(null);

  const [value, setValue] = useState(initialValue);
  const [connectionState, setConnectionState] = useState<ConnectionState>(
    ConnectionState.DISCONNECTED,
  );
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [roomUsers, setRoomUsers] = useState<User[]>([]);
  const [currentRoom, setCurrentRoom] = useState<Room | null>(null);
  const [showPresence, setShowPresence] = useState(true);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const [isSaving, setIsSaving] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date>(new Date());

  // Cursor and selection tracking
  // const userCursors = useRef<Map<string, UserCursor>>(new Map());
  // const userSelections = useRef<Map<string, UserSelection>>(new Map());
  const cursorDecorations = useRef<Map<string, string[]>>(new Map());
  const selectionDecorations = useRef<Map<string, string[]>>(new Map());

  // Change tracking
  const localChanges = useRef<DocumentChange[]>([]);
  const isApplyingRemoteChange = useRef(false);
  const typingTimeout = useRef<NodeJS.Timeout | null>(null);

  // Initialize WebSocket connection
  useEffect(() => {
    const wsService = getWebSocketService({
      url: "ws://localhost:8001/ws",
      reconnect: true,
    });
    wsServiceRef.current = wsService;

    // Connection state handler
    const handleConnectionStateChange = (state: ConnectionState) => {
      setConnectionState(state);
    };

    // Authentication success handler
    const handleAuthSuccess = (data: any) => {
      setCurrentUser(data.user);
      // Join room after authentication
      wsService.joinRoom(roomId, roomName);
    };

    // Room joined handler
    const handleRoomJoined = (data: any) => {
      setCurrentRoom(data.room);
      setRoomUsers(data.users);
      setLastSyncTime(new Date());
    };

    // User joined handler
    const handleUserJoined = (data: any) => {
      setRoomUsers((prev) => [...prev, data.user]);
      showNotification(`${data.user.username} joined the room`, "info");
    };

    // User left handler
    const handleUserLeft = (data: any) => {
      setRoomUsers((prev) => prev.filter((u) => u.id !== data.user.id));
      // Clean up user's cursor and selection
      removeUserDecorations(data.user.id);
      showNotification(`${data.user.username} left the room`, "info");
    };

    // Document change handler
    const handleDocumentChange = (data: any) => {
      if (!editorRef.current || !data.changes) return;

      isApplyingRemoteChange.current = true;
      applyRemoteChanges(data.changes);
      setLastSyncTime(new Date());
      isApplyingRemoteChange.current = false;
    };

    // Cursor position handler
    const handleCursorPosition = (data: any) => {
      if (!editorRef.current || data.user.id === currentUser?.id) return;
      updateUserCursor(data.user, data.position);
    };

    // Selection change handler
    const handleSelectionChange = (data: any) => {
      if (!editorRef.current || data.user.id === currentUser?.id) return;
      updateUserSelection(data.user, data.selection);
    };

    // Typing status handler
    const handleUserTyping = (data: any) => {
      setTypingUsers((prev) => new Set(prev).add(data.user.id));
    };

    const handleUserIdle = (data: any) => {
      setTypingUsers((prev) => {
        const newSet = new Set(prev);
        newSet.delete(data.user.id);
        return newSet;
      });
    };

    // Register event listeners
    wsService.on("connection_state_changed", handleConnectionStateChange);
    wsService.on("auth_success", handleAuthSuccess);
    wsService.on("room_joined", handleRoomJoined);
    wsService.on("user_joined", handleUserJoined);
    wsService.on("user_left", handleUserLeft);
    wsService.on("document_change", handleDocumentChange);
    wsService.on("cursor_position", handleCursorPosition);
    wsService.on("selection_change", handleSelectionChange);
    wsService.on("user_typing", handleUserTyping);
    wsService.on("user_idle", handleUserIdle);

    // Connect to WebSocket
    wsService.connect().catch(console.error);

    // Cleanup
    return () => {
      wsService.leaveRoom(roomId);
      wsService.off("connection_state_changed", handleConnectionStateChange);
      wsService.off("auth_success", handleAuthSuccess);
      wsService.off("room_joined", handleRoomJoined);
      wsService.off("user_joined", handleUserJoined);
      wsService.off("user_left", handleUserLeft);
      wsService.off("document_change", handleDocumentChange);
      wsService.off("cursor_position", handleCursorPosition);
      wsService.off("selection_change", handleSelectionChange);
      wsService.off("user_typing", handleUserTyping);
      wsService.off("user_idle", handleUserIdle);
    };
  }, [roomId, roomName]);

  // Monaco editor mount handler
  const handleEditorDidMount = (editor: any, monaco: any) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    // Track cursor position changes
    editor.onDidChangeCursorPosition((e: any) => {
      if (!wsServiceRef.current || !currentRoom) return;

      const position: CursorPosition = {
        line: e.position.lineNumber,
        column: e.position.column,
      };

      wsServiceRef.current.sendCursorPosition(roomId, position);
    });

    // Track selection changes
    editor.onDidChangeCursorSelection((e: any) => {
      if (!wsServiceRef.current || !currentRoom) return;

      const selection = e.selection;
      if (!selection.isEmpty()) {
        const selectionData: Selection = {
          start: {
            line: selection.startLineNumber,
            column: selection.startColumn,
          },
          end: {
            line: selection.endLineNumber,
            column: selection.endColumn,
          },
        };

        wsServiceRef.current.sendSelectionChange(roomId, selectionData);
      }
    });

    // Track content changes
    editor.onDidChangeModelContent((e: any) => {
      if (isApplyingRemoteChange.current) return;

      handleLocalChange(e);
    });
  };

  // Handle local content changes
  const handleLocalChange = (event: any) => {
    if (!wsServiceRef.current || !currentRoom) return;

    // Send typing status
    wsServiceRef.current.sendTypingStatus(roomId, true);

    // Clear previous typing timeout
    if (typingTimeout.current) {
      clearTimeout(typingTimeout.current);
    }

    // Set idle status after 2 seconds
    typingTimeout.current = setTimeout(() => {
      wsServiceRef.current?.sendTypingStatus(roomId, false);
    }, 2000);

    // Convert Monaco changes to our format
    const changes: DocumentChange[] = event.changes.map((change: any) => ({
      type: change.text ? "insert" : "delete",
      range: {
        start: {
          line: change.range.startLineNumber,
          column: change.range.startColumn,
        },
        end: {
          line: change.range.endLineNumber,
          column: change.range.endColumn,
        },
      },
      text: change.text,
      timestamp: Date.now(),
    }));

    // Store local changes
    localChanges.current.push(...changes);

    // Send changes to server
    wsServiceRef.current.sendDocumentChange(roomId, changes);
  };

  // Apply remote changes to editor
  const applyRemoteChanges = (changes: DocumentChange[]) => {
    if (!editorRef.current) return;

    const model = editorRef.current.getModel();
    if (!model) return;

    const edits = changes.map((change) => {
      const range = new monacoRef.current.Range(
        change.range.start.line,
        change.range.start.column,
        change.range.end.line,
        change.range.end.column,
      );

      return {
        range,
        text: change.text || "",
        forceMoveMarkers: true,
      } as any; // Type assertion for IIdentifiedSingleEditOperation
    });

    // Monaco API call with type assertion
    (model as any).pushEditOperations([], edits, (): null => null);
  };

  // Update user cursor decoration
  const updateUserCursor = (user: User, position: CursorPosition) => {
    if (!editorRef.current || !monacoRef.current) return;

    // Remove old cursor decoration
    const oldDecorationIds = cursorDecorations.current.get(user.id);
    if (oldDecorationIds) {
      editorRef.current.deltaDecorations(oldDecorationIds, []);
    }

    // Create new cursor decoration with type assertion
    const decoration = {
      range: new monacoRef.current.Range(
        position.line,
        position.column,
        position.line,
        position.column,
      ),
      options: {
        className: `user-cursor user-cursor-${user.id}`,
        hoverMessage: { value: `${user.username}'s cursor` },
        stickiness: 1, // AlwaysGrowsWhenTypingAtEdges
        afterContentClassName: `cursor-widget cursor-${user.id}`,
      },
    } as any;

    // Monaco deltaDecorations with type assertion
    const newDecorationIds = (editorRef.current as any).deltaDecorations(
      oldDecorationIds || [],
      [decoration],
    );
    cursorDecorations.current.set(user.id, newDecorationIds);

    // Add custom CSS for cursor
    addCursorStyles(user.id, user.color);
  };

  // Update user selection decoration
  const updateUserSelection = (user: User, selection: Selection) => {
    if (!editorRef.current || !monacoRef.current) return;

    // Remove old selection decoration
    const oldDecorationIds = selectionDecorations.current.get(user.id);
    if (oldDecorationIds) {
      editorRef.current.deltaDecorations(oldDecorationIds, []);
    }

    // Create new selection decoration with type assertion
    const decoration = {
      range: new monacoRef.current.Range(
        selection.start.line,
        selection.start.column,
        selection.end.line,
        selection.end.column,
      ),
      options: {
        className: `user-selection user-selection-${user.id}`,
        hoverMessage: { value: `${user.username}'s selection` },
        stickiness: 1,
      },
    } as any;

    // Monaco deltaDecorations with type assertion
    const newDecorationIds = (editorRef.current as any).deltaDecorations(
      oldDecorationIds || [],
      [decoration],
    );
    selectionDecorations.current.set(user.id, newDecorationIds);

    // Add custom CSS for selection
    addSelectionStyles(user.id, user.color);
  };

  // Remove user decorations
  const removeUserDecorations = (userId: string) => {
    if (!editorRef.current) return;

    const cursorIds = cursorDecorations.current.get(userId);
    if (cursorIds) {
      editorRef.current.deltaDecorations(cursorIds, []);
      cursorDecorations.current.delete(userId);
    }

    const selectionIds = selectionDecorations.current.get(userId);
    if (selectionIds) {
      editorRef.current.deltaDecorations(selectionIds, []);
      selectionDecorations.current.delete(userId);
    }
  };

  // Add cursor styles
  const addCursorStyles = (userId: string, color: string) => {
    const styleId = `cursor-style-${userId}`;
    let styleElement = document.getElementById(styleId);

    if (!styleElement) {
      styleElement = document.createElement("style");
      styleElement.id = styleId;
      document.head.appendChild(styleElement);
    }

    styleElement.textContent = `
      .cursor-${userId}::after {
        content: '';
        position: absolute;
        top: 0;
        width: 2px;
        height: 20px;
        background-color: ${color};
        animation: cursor-blink 1s infinite;
      }

      .user-cursor-${userId} {
        background-color: ${color}20;
      }

      @keyframes cursor-blink {
        0%, 50% { opacity: 1; }
        51%, 100% { opacity: 0; }
      }
    `;
  };

  // Add selection styles
  const addSelectionStyles = (userId: string, color: string) => {
    const styleId = `selection-style-${userId}`;
    let styleElement = document.getElementById(styleId);

    if (!styleElement) {
      styleElement = document.createElement("style");
      styleElement.id = styleId;
      document.head.appendChild(styleElement);
    }

    styleElement.textContent = `
      .user-selection-${userId} {
        background-color: ${color}30;
        border-left: 2px solid ${color};
      }
    `;
  };

  // Show notification
  const showNotification = (
    message: string,
    type: "info" | "success" | "error",
  ) => {
    // Implementation would depend on your notification system
    console.log(`[${type}] ${message}`);
  };

  // Handle save
  const handleSave = async () => {
    if (!editorRef.current) return;

    setIsSaving(true);
    const content = editorRef.current.getValue();

    if (onSave) {
      await onSave(content);
    }

    setIsSaving(false);
    showNotification("Document saved", "success");
  };

  // Connection status color
  const getConnectionColor = () => {
    switch (connectionState) {
      case ConnectionState.CONNECTED:
        return "text-green-500";
      case ConnectionState.CONNECTING:
        return "text-yellow-500";
      case ConnectionState.RECONNECTING:
        return "text-orange-500";
      case ConnectionState.ERROR:
        return "text-red-500";
      default:
        return "text-gray-500";
    }
  };

  return (
    <div
      className={`flex flex-col bg-slate-900 rounded-lg overflow-hidden ${className}`}
    >
      {/* Header */}
      <div className="bg-slate-800 border-b border-slate-700 px-4 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {/* Room info */}
            <div className="flex items-center space-x-2">
              <GitBranchIcon className="w-4 h-4 text-slate-400" />
              <span className="text-sm font-semibold text-white">
                {currentRoom?.name || roomName || "Collaborative Session"}
              </span>
            </div>

            {/* Connection status */}
            <div className="flex items-center space-x-1">
              {connectionState === ConnectionState.CONNECTED ? (
                <WifiIcon className={`w-4 h-4 ${getConnectionColor()}`} />
              ) : (
                <WifiOffIcon className={`w-4 h-4 ${getConnectionColor()}`} />
              )}
              <span className={`text-xs ${getConnectionColor()}`}>
                {connectionState}
              </span>
            </div>

            {/* Last sync time */}
            <div className="text-xs text-slate-500">
              Last sync: {lastSyncTime.toLocaleTimeString()}
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {/* Save button */}
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-sm text-white transition-colors disabled:opacity-50 flex items-center space-x-1"
            >
              {isSaving ? (
                <RefreshCwIcon className="w-3 h-3 animate-spin" />
              ) : (
                <SaveIcon className="w-3 h-3" />
              )}
              <span>Save</span>
            </button>

            {/* Toggle presence */}
            <button
              onClick={() => setShowPresence(!showPresence)}
              className="p-1 hover:bg-slate-700 rounded transition-colors"
              title="Toggle user presence"
            >
              {showPresence ? (
                <EyeIcon className="w-4 h-4 text-slate-400" />
              ) : (
                <EyeOffIcon className="w-4 h-4 text-slate-400" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Users bar */}
      {showPresence && (
        <div className="bg-slate-800/50 border-b border-slate-700 px-4 py-2">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <UsersIcon className="w-4 h-4 text-slate-400" />
              <span className="text-xs text-slate-400">
                {roomUsers.length} {roomUsers.length === 1 ? "user" : "users"}{" "}
                online
              </span>
            </div>

            <div className="flex items-center space-x-2">
              {roomUsers.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center space-x-1 px-2 py-1 bg-slate-700 rounded-full"
                  title={`${user.username}${typingUsers.has(user.id) ? " (typing...)" : ""}`}
                >
                  <CircleIcon
                    className={`w-2 h-2 fill-current`}
                    style={{ color: user.color }}
                  />
                  <span className="text-xs text-white">{user.username}</span>
                  {typingUsers.has(user.id) && (
                    <span className="text-xs text-slate-400 animate-pulse">
                      ...
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Editor */}
      <div className="flex-1">
        <MonacoEditor
          height={height}
          language={language}
          value={value}
          onChange={(value) => setValue(value || "")}
          onMount={handleEditorDidMount}
          theme="vs-dark"
          options={{
            fontSize: 14,
            minimap: { enabled: true },
            scrollBeyondLastLine: false,
            automaticLayout: true,
            padding: { top: 10, bottom: 10 },
            suggestOnTriggerCharacters: true,
            quickSuggestions: true,
            folding: true,
            bracketPairColorization: { enabled: true },
          }}
        />
      </div>

      {/* Typing indicators */}
      {typingUsers.size > 0 && (
        <div className="absolute bottom-4 left-4 bg-slate-800 rounded-lg px-3 py-2 shadow-lg">
          <div className="flex items-center space-x-2">
            <MessageSquareIcon className="w-4 h-4 text-slate-400" />
            <span className="text-xs text-slate-300">
              {Array.from(typingUsers)
                .map((id) => roomUsers.find((u) => u.id === id)?.username)
                .filter(Boolean)
                .join(", ")}{" "}
              {typingUsers.size === 1 ? "is" : "are"} typing...
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default CollaborativeEditor;
