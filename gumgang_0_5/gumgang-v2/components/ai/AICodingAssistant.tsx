"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  SparklesIcon,
  BugIcon,
  BookOpenIcon,
  WandIcon,
  SendIcon,
  CopyIcon,
  CheckIcon,
  XIcon,
  MinimizeIcon,
  WrenchIcon,
  HistoryIcon,
  TrashIcon,
  FileCodeIcon,
  Loader2Icon,
} from "lucide-react";
import {
  useAIAssistant,
  AI_PROMPTS,
  detectLanguage,
} from "../../hooks/useAIAssistant";

interface AICodingAssistantProps {
  selectedCode?: string;
  currentFile?: string;
  language?: string;
  onCodeApply?: (code: string) => void;
  onClose?: () => void;
  className?: string;
  position?: "right" | "bottom" | "floating";
  defaultMinimized?: boolean;
}

interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
  code?: string;
  action?: string;
  error?: boolean;
}

interface QuickAction {
  id: string;
  title: string;
  icon: React.ReactNode;
  description: string;
  action: "explain" | "fix" | "refactor" | "complete" | "generate";
  color: string;
}

const QUICK_ACTIONS: QuickAction[] = [
  {
    id: "explain",
    title: "코드 설명",
    icon: <BookOpenIcon className="w-4 h-4" />,
    description: "선택한 코드 설명",
    action: "explain",
    color: "bg-blue-500",
  },
  {
    id: "fix",
    title: "버그 수정",
    icon: <BugIcon className="w-4 h-4" />,
    description: "에러 자동 수정",
    action: "fix",
    color: "bg-red-500",
  },
  {
    id: "refactor",
    title: "리팩토링",
    icon: <WrenchIcon className="w-4 h-4" />,
    description: "코드 개선 제안",
    action: "refactor",
    color: "bg-yellow-500",
  },
  {
    id: "complete",
    title: "자동 완성",
    icon: <SparklesIcon className="w-4 h-4" />,
    description: "코드 자동 완성",
    action: "complete",
    color: "bg-purple-500",
  },
  {
    id: "generate",
    title: "코드 생성",
    icon: <WandIcon className="w-4 h-4" />,
    description: "새 코드 생성",
    action: "generate",
    color: "bg-green-500",
  },
];

export const AICodingAssistant: React.FC<AICodingAssistantProps> = ({
  selectedCode = "",
  currentFile = "",
  language = "",
  onCodeApply,
  onClose,
  className = "",
  position = "right",
  defaultMinimized = false,
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isMinimized, setIsMinimized] = useState(defaultMinimized);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const { askAI, isLoading, error, cancelRequest, sessionId, clearError } =
    useAIAssistant();

  // Auto-detect language from file
  useEffect(() => {
    if (currentFile && !language) {
      // Language detection handled via props
    }
  }, [currentFile, language]);

  // Scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Handle quick action
  const handleQuickAction = useCallback(
    async (action: QuickAction["action"]) => {
      if (!selectedCode) {
        const userMessage: Message = {
          id: Date.now().toString(),
          role: "user",
          content: AI_PROMPTS[action].template,
          timestamp: new Date(),
          action,
        };
        setMessages((prev) => [...prev, userMessage]);
        return;
      }

      const userMessage: Message = {
        id: Date.now().toString(),
        role: "user",
        content: `${AI_PROMPTS[action].template}\n\n\`\`\`${language}\n${selectedCode}\n\`\`\``,
        timestamp: new Date(),
        action,
        code: selectedCode,
      };

      setMessages((prev) => [...prev, userMessage]);

      try {
        const response = await askAI({
          query: AI_PROMPTS[action].template,
          code: selectedCode,
          language: language || detectLanguage(currentFile),
          file: currentFile,
          action,
        });

        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: response.response,
          timestamp: new Date(),
          code: response.code_suggestion,
          error: !!response.error,
        };

        setMessages((prev) => [...prev, assistantMessage]);
      } catch (err) {
        console.error("AI request failed:", err);
      }
    },
    [selectedCode, language, currentFile, askAI],
  );

  // Handle send message
  const handleSend = useCallback(async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
      timestamp: new Date(),
      code: selectedCode,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");

    try {
      const response = await askAI({
        query: input,
        code: selectedCode,
        language: language || detectLanguage(currentFile),
        file: currentFile,
        action: "chat",
      });

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: response.response,
        timestamp: new Date(),
        code: response.code_suggestion,
        error: !!response.error,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      console.error("AI request failed:", err);
    }
  }, [input, isLoading, selectedCode, language, currentFile, askAI]);

  // Handle copy code
  const handleCopyCode = useCallback((code: string, messageId: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(messageId);
    setTimeout(() => setCopiedId(null), 2000);
  }, []);

  // Handle apply code
  const handleApplyCode = useCallback(
    (code: string) => {
      if (onCodeApply) {
        onCodeApply(code);
      }
    },
    [onCodeApply],
  );

  // Clear history
  const handleClearHistory = useCallback(() => {
    setMessages([]);
    setShowHistory(false);
  }, []);

  // Position styles
  const positionStyles = {
    right: "fixed right-0 top-0 h-full w-96 border-l",
    bottom: "fixed bottom-0 left-0 right-0 h-96 border-t",
    floating: "fixed bottom-4 right-4 w-96 h-[600px] rounded-lg shadow-2xl",
  };

  if (isMinimized) {
    return (
      <div
        className={`fixed ${position === "bottom" ? "bottom-0 right-4" : "bottom-4 right-4"} z-50`}
      >
        <button
          onClick={() => setIsMinimized(false)}
          className="p-3 bg-slate-800 hover:bg-slate-700 rounded-lg shadow-lg border border-slate-700 transition-all duration-200 flex items-center space-x-2"
        >
          <SparklesIcon className="w-5 h-5 text-blue-400" />
          <span className="text-sm text-white">AI Assistant</span>
          {messages.length > 0 && (
            <span className="px-2 py-0.5 bg-blue-600 text-white text-xs rounded-full">
              {messages.length}
            </span>
          )}
        </button>
      </div>
    );
  }

  return (
    <div
      className={`${positionStyles[position]} bg-slate-900 border-slate-800 z-50 flex flex-col ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-900/95 backdrop-blur">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg">
            <SparklesIcon className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">
              AI Coding Assistant
            </h3>
            <p className="text-xs text-slate-400">
              {sessionId
                ? `Session: ${sessionId.slice(0, 8)}...`
                : "Ready to help"}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="p-1.5 hover:bg-slate-800 rounded transition-colors"
            title="History"
          >
            <HistoryIcon className="w-4 h-4 text-slate-400" />
          </button>
          <button
            onClick={() => setIsMinimized(true)}
            className="p-1.5 hover:bg-slate-800 rounded transition-colors"
            title="Minimize"
          >
            <MinimizeIcon className="w-4 h-4 text-slate-400" />
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-slate-800 rounded transition-colors"
              title="Close"
            >
              <XIcon className="w-4 h-4 text-slate-400" />
            </button>
          )}
        </div>
      </div>

      {/* Current context */}
      {(selectedCode || currentFile) && (
        <div className="px-4 py-2 bg-slate-800/50 border-b border-slate-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-xs">
              <FileCodeIcon className="w-3 h-3 text-slate-400" />
              <span className="text-slate-400">
                {currentFile ? currentFile.split("/").pop() : "Selected code"}
              </span>
              {language && (
                <span className="px-1.5 py-0.5 bg-slate-700 rounded text-slate-300">
                  {language}
                </span>
              )}
            </div>
            {selectedCode && (
              <span className="text-xs text-slate-500">
                {selectedCode.split("\n").length} lines
              </span>
            )}
          </div>
        </div>
      )}

      {/* Quick actions */}
      {!showHistory && messages.length === 0 && (
        <div className="p-4 border-b border-slate-800">
          <p className="text-xs text-slate-400 mb-3">Quick Actions</p>
          <div className="grid grid-cols-3 gap-2">
            {QUICK_ACTIONS.map((action) => (
              <button
                key={action.id}
                onClick={() => handleQuickAction(action.action)}
                disabled={!selectedCode && action.action !== "generate"}
                className={`p-2 rounded-lg border border-slate-700 hover:border-slate-600 transition-all duration-200 flex flex-col items-center space-y-1 ${
                  !selectedCode && action.action !== "generate"
                    ? "opacity-50 cursor-not-allowed"
                    : "hover:bg-slate-800"
                }`}
                title={action.description}
              >
                <div className={`p-1.5 ${action.color} rounded`}>
                  {action.icon}
                </div>
                <span className="text-xs text-slate-300">{action.title}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {showHistory && messages.length > 0 && (
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400">
              History ({messages.length} messages)
            </span>
            <button
              onClick={handleClearHistory}
              className="text-xs text-red-400 hover:text-red-300 flex items-center space-x-1"
            >
              <TrashIcon className="w-3 h-3" />
              <span>Clear</span>
            </button>
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] rounded-lg p-3 ${
                message.role === "user"
                  ? "bg-blue-600 text-white"
                  : message.error
                    ? "bg-red-900/50 border border-red-700 text-red-200"
                    : "bg-slate-800 text-slate-200"
              }`}
            >
              {/* Message header */}
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs opacity-75">
                  {message.role === "user" ? "You" : "AI Assistant"}
                </span>
                <span className="text-xs opacity-50">
                  {message.timestamp.toLocaleTimeString()}
                </span>
              </div>

              {/* Message content */}
              <div className="text-sm whitespace-pre-wrap">
                {message.content}
              </div>

              {/* Code block if present */}
              {message.code && (
                <div className="mt-2">
                  <div className="bg-slate-900 rounded p-2 relative">
                    <pre className="text-xs overflow-x-auto">
                      <code>{message.code}</code>
                    </pre>
                    <div className="absolute top-2 right-2 flex space-x-1">
                      <button
                        onClick={() =>
                          handleCopyCode(message.code!, message.id)
                        }
                        className="p-1 bg-slate-800 hover:bg-slate-700 rounded transition-colors"
                        title="Copy code"
                      >
                        {copiedId === message.id ? (
                          <CheckIcon className="w-3 h-3 text-green-400" />
                        ) : (
                          <CopyIcon className="w-3 h-3 text-slate-400" />
                        )}
                      </button>
                      {onCodeApply && message.role === "assistant" && (
                        <button
                          onClick={() => handleApplyCode(message.code!)}
                          className="p-1 bg-blue-600 hover:bg-blue-700 rounded transition-colors"
                          title="Apply code"
                        >
                          <CheckIcon className="w-3 h-3 text-white" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Action indicator */}
              {message.action && (
                <div className="mt-2 flex items-center space-x-1">
                  <span className="text-xs opacity-75">Action:</span>
                  <span className="text-xs px-1.5 py-0.5 bg-slate-700 rounded">
                    {AI_PROMPTS[message.action as keyof typeof AI_PROMPTS]
                      ?.title || message.action}
                  </span>
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Loading indicator */}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-slate-800 rounded-lg p-3 flex items-center space-x-2">
              <Loader2Icon className="w-4 h-4 text-blue-400 animate-spin" />
              <span className="text-sm text-slate-300">AI is thinking...</span>
            </div>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="flex justify-start">
            <div className="bg-red-900/50 border border-red-700 rounded-lg p-3">
              <p className="text-sm text-red-200">{error}</p>
              <button
                onClick={clearError}
                className="mt-2 text-xs text-red-400 hover:text-red-300"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="p-4 border-t border-slate-800">
        <div className="flex space-x-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Ask AI anything about your code..."
            className="flex-1 bg-slate-800 text-white rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={2}
            disabled={isLoading}
          />
          <div className="flex flex-col space-y-2">
            <button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              className={`p-2 rounded-lg transition-all duration-200 ${
                !input.trim() || isLoading
                  ? "bg-slate-700 text-slate-500 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-700 text-white"
              }`}
              title="Send message"
            >
              {isLoading ? (
                <Loader2Icon className="w-4 h-4 animate-spin" />
              ) : (
                <SendIcon className="w-4 h-4" />
              )}
            </button>
            {isLoading && (
              <button
                onClick={cancelRequest}
                className="p-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                title="Cancel request"
              >
                <XIcon className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Keyboard shortcuts hint */}
        <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
          <span>Enter to send, Shift+Enter for new line</span>
          {selectedCode && <span>{selectedCode.length} chars selected</span>}
        </div>
      </div>
    </div>
  );
};

export default AICodingAssistant;
