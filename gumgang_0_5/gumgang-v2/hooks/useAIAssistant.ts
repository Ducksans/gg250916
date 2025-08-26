"use client";

import { useState, useCallback, useRef } from "react";
import axios, { CancelTokenSource } from "axios";
// import type { ApiResult } from "../../types/core"; // Removed: unused import

export interface AIRequest {
  query: string;
  code?: string;
  language?: string;
  file?: string;
  action?: "explain" | "fix" | "refactor" | "complete" | "generate" | "chat";
  context?: Record<string, any>;
}

export interface AIResponse {
  response: string;
  source?: string;
  suggest_ingest?: boolean;
  session_id?: string;
  context_info?: any;
  code_suggestion?: string;
  explanation?: string;
  error?: string;
}

export interface UseAIAssistantReturn {
  askAI: (request: AIRequest) => Promise<AIResponse>;
  isLoading: boolean;
  error: string | null;
  cancelRequest: () => void;
  sessionId: string | null;
  clearError: () => void;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001";

export function useAIAssistant(): UseAIAssistantReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const cancelTokenRef = useRef<CancelTokenSource | null>(null);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const cancelRequest = useCallback(() => {
    if (cancelTokenRef.current) {
      cancelTokenRef.current.cancel("Request cancelled by user");
      cancelTokenRef.current = null;
    }
  }, []);

  const askAI = useCallback(
    async (request: AIRequest): Promise<AIResponse> => {
      setIsLoading(true);
      setError(null);

      // Cancel any pending request
      if (cancelTokenRef.current) {
        cancelTokenRef.current.cancel();
      }

      // Create new cancel token
      cancelTokenRef.current = axios.CancelToken.source();

      try {
        // Build the query based on action type
        let query = request.query;

        if (request.action) {
          switch (request.action) {
            case "explain":
              query = `다음 코드를 설명해주세요:\n\`\`\`${request.language || ""}\n${request.code}\n\`\`\``;
              break;
            case "fix":
              query = `다음 코드의 버그를 수정해주세요:\n\`\`\`${request.language || ""}\n${request.code}\n\`\`\`\n\n${request.query}`;
              break;
            case "refactor":
              query = `다음 코드를 리팩토링해주세요:\n\`\`\`${request.language || ""}\n${request.code}\n\`\`\`\n\n개선 사항: ${request.query}`;
              break;
            case "complete":
              query = `다음 코드를 완성해주세요:\n\`\`\`${request.language || ""}\n${request.code}\n\`\`\``;
              break;
            case "generate":
              query = `다음 요구사항에 맞는 ${request.language || "JavaScript"} 코드를 생성해주세요:\n${request.query}`;
              break;
            default:
              // 'chat' or default case
              if (request.code) {
                query = `${request.query}\n\n참고 코드:\n\`\`\`${request.language || ""}\n${request.code}\n\`\`\``;
              }
          }
        }

        // Add file context if available
        if (request.file) {
          query += `\n\n파일: ${request.file}`;
        }

        // Make API request
        const response = await axios.post<AIResponse>(
          `${API_BASE_URL}/ask`,
          {
            query,
            session_id: sessionId,
            ...request.context,
          },
          {
            cancelToken: cancelTokenRef.current.token,
            headers: {
              "Content-Type": "application/json",
            },
            timeout: 30000, // 30 second timeout
          },
        );

        // Update session ID if returned
        if (response.data.session_id) {
          setSessionId(response.data.session_id);
        }

        // Extract code from response if present
        const codeMatch = response.data.response.match(
          /```[\w]*\n([\s\S]*?)```/,
        );
        if (codeMatch) {
          response.data.code_suggestion = codeMatch[1];
        }

        setIsLoading(false);
        return response.data;
      } catch (err) {
        if (axios.isCancel(err)) {
          const cancelError = "Request was cancelled";
          setError(cancelError);
          setIsLoading(false);
          return { response: "", error: cancelError };
        }

        const errorMessage =
          err instanceof Error ? err.message : "An unknown error occurred";
        setError(errorMessage);
        setIsLoading(false);

        // Return error response
        return {
          response: "",
          error: errorMessage,
        };
      } finally {
        cancelTokenRef.current = null;
      }
    },
    [sessionId],
  );

  return {
    askAI,
    isLoading,
    error,
    cancelRequest,
    sessionId,
    clearError,
  };
}

// Preset prompts for common tasks
export const AI_PROMPTS = {
  explain: {
    title: "코드 설명",
    icon: "📖",
    template: "이 코드가 무엇을 하는지 설명해주세요.",
  },
  fix: {
    title: "버그 수정",
    icon: "🐛",
    template: "이 코드의 문제를 찾아서 수정해주세요.",
  },
  refactor: {
    title: "리팩토링",
    icon: "🔧",
    template: "이 코드를 더 깔끔하고 효율적으로 개선해주세요.",
  },
  complete: {
    title: "코드 완성",
    icon: "✨",
    template: "이 코드를 완성해주세요.",
  },
  generate: {
    title: "코드 생성",
    icon: "🎯",
    template: "다음 기능을 구현하는 코드를 작성해주세요:",
  },
  optimize: {
    title: "최적화",
    icon: "⚡",
    template: "이 코드의 성능을 최적화해주세요.",
  },
  test: {
    title: "테스트 작성",
    icon: "🧪",
    template: "이 코드에 대한 테스트를 작성해주세요.",
  },
  document: {
    title: "문서화",
    icon: "📝",
    template: "이 코드에 JSDoc 주석을 추가해주세요.",
  },
};

// Language detection utility
export function detectLanguage(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase();
  const languageMap: Record<string, string> = {
    js: "javascript",
    jsx: "javascript",
    ts: "typescript",
    tsx: "typescript",
    py: "python",
    rs: "rust",
    go: "go",
    java: "java",
    cpp: "cpp",
    c: "c",
    cs: "csharp",
    php: "php",
    rb: "ruby",
    swift: "swift",
    kt: "kotlin",
    scala: "scala",
    sh: "shell",
    bash: "shell",
    json: "json",
    xml: "xml",
    html: "html",
    css: "css",
    scss: "scss",
    sass: "sass",
    less: "less",
    sql: "sql",
    md: "markdown",
    yaml: "yaml",
    yml: "yaml",
    toml: "toml",
    ini: "ini",
    dockerfile: "dockerfile",
    makefile: "makefile",
    cmake: "cmake",
    gradle: "gradle",
    vue: "vue",
    svelte: "svelte",
  };
  return languageMap[ext || ""] || "plaintext";
}
