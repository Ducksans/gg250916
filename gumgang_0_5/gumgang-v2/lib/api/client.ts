// API client for Gumgang 2.0 backend communication
// import type { ApiResult } from "../../types/core"; // Removed: unused import

const API_BASE = "http://localhost:8000";

// Request deduplication tracking
const pendingRequests = new Map<string, Promise<unknown>>();
const requestTimestamps = new Map<string, number>();
const DEDUP_WINDOW_MS = 500; // 500ms window for deduplication

export interface ChatMessage {
  role: "user" | "assistant" | "system" | "error";
  content: string;
  timestamp?: string;
  metadata?: Record<string, any>;
  id?: string; // Add unique ID for message tracking
}

export interface ChatResponse {
  response?: string;
  message?: string;
  session_id?: string;
  metadata?: {
    memory_used?: boolean;
    memory_type?: string;
    confidence?: number;
  };
}

export interface MemoryStatus {
  total_memories: number;
  system_type: string;
  status: string;
  memories_by_level?: {
    level1?: number;
    level2?: number;
    level3?: number;
    level4?: number;
    level5?: number;
  };
}

export interface SystemStatus {
  status: string;
  backend_version?: string;
  memory_system?: string;
  chromadb_status?: string;
  openai_status?: string;
}

export interface UserProfile {
  user_id: string;
  interaction_count: number;
  memory_count: number;
  preferences?: Record<string, any>;
  last_interaction?: string;
}

export interface MemoryItem {
  id: string;
  content: string;
  level: number;
  timestamp: string;
  metadata?: Record<string, any>;
}

export interface EvolutionEvent {
  type: "code_change" | "self_modification" | "learning";
  description: string;
  timestamp: string;
  diff?: string;
  approved?: boolean;
}

class GumgangAPI {
  private headers = {
    "Content-Type": "application/json",
  };

  // 대화 관련 - 중복 요청 방지 로직 포함
  async chat(
    message: string,
    sessionId: string = "default",
  ): Promise<ChatResponse> {
    // Create a unique key for this request
    const requestKey = `chat:${sessionId}:${message}`;

    // Check if we have a recent request with the same key
    const lastRequestTime = requestTimestamps.get(requestKey);
    const now = Date.now();

    if (lastRequestTime && now - lastRequestTime < DEDUP_WINDOW_MS) {
      // If there's a pending request for the same message, return it
      const pendingRequest = pendingRequests.get(requestKey);
      if (pendingRequest) {
        console.log("Deduplicating chat request:", message.substring(0, 50));
        return pendingRequest;
      }
    }

    // Create the request promise
    const requestPromise = (async () => {
      try {
        const response = await fetch(`${API_BASE}/ask`, {
          method: "POST",
          headers: this.headers,
          body: JSON.stringify({
            query: message,
            session_id: sessionId,
          }),
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        return await response.json();
      } catch (error) {
        console.error("Chat API error:", error);
        throw error;
      } finally {
        // Clean up after request completes
        pendingRequests.delete(requestKey);
      }
    })();

    // Store the pending request and timestamp
    pendingRequests.set(requestKey, requestPromise);
    requestTimestamps.set(requestKey, now);

    // Clean up old timestamps periodically
    if (requestTimestamps.size > 100) {
      const cutoffTime = now - DEDUP_WINDOW_MS * 2;
      for (const [key, time] of requestTimestamps.entries()) {
        if (time < cutoffTime) {
          requestTimestamps.delete(key);
        }
      }
    }

    return requestPromise;
  }

  // 메모리 상태 조회
  async getMemoryStatus(): Promise<MemoryStatus> {
    try {
      const response = await fetch(`${API_BASE}/memory/status`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error("Memory status API error:", error);
      throw error;
    }
  }

  // 시스템 상태 조회
  async getSystemStatus(): Promise<SystemStatus> {
    try {
      const response = await fetch(`${API_BASE}/status`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error("System status API error:", error);
      throw error;
    }
  }

  // 사용자 프로필 조회
  async getUserProfile(userId: string = "default_user"): Promise<UserProfile> {
    try {
      const response = await fetch(`${API_BASE}/memory/profile/${userId}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error("User profile API error:", error);
      throw error;
    }
  }

  // 메모리 검색
  async searchMemories(query: string, level?: number): Promise<MemoryItem[]> {
    try {
      const params = new URLSearchParams({ query });
      if (level !== undefined) {
        params.append("level", level.toString());
      }

      const response = await fetch(`${API_BASE}/memory/search?${params}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error("Memory search API error:", error);
      throw error;
    }
  }

  // 메모리 추가
  async addMemory(
    content: string,
    level: number = 1,
    metadata?: Record<string, any>,
  ): Promise<{ success: boolean; id?: string }> {
    try {
      const response = await fetch(`${API_BASE}/memory/add`, {
        method: "POST",
        headers: this.headers,
        body: JSON.stringify({
          content,
          level,
          metadata,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Add memory API error:", error);
      throw error;
    }
  }

  // 진화 이벤트 조회
  async getEvolutionEvents(limit: number = 50): Promise<EvolutionEvent[]> {
    try {
      const response = await fetch(
        `${API_BASE}/evolution/events?limit=${limit}`,
      );
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error("Evolution events API error:", error);
      return []; // 백엔드에 아직 엔드포인트가 없을 수 있음
    }
  }

  // 코드 변경 승인/거절
  async approveCodeChange(
    eventId: string,
    approved: boolean,
  ): Promise<{ success: boolean }> {
    try {
      const response = await fetch(`${API_BASE}/evolution/approve/${eventId}`, {
        method: "POST",
        headers: this.headers,
        body: JSON.stringify({ approved }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Approve code change API error:", error);
      throw error;
    }
  }

  // Health check
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE}/health`);
      return response.ok;
    } catch (error) {
      return false;
    }
  }
}

// 싱글톤 인스턴스 export
export const gumgangAPI = new GumgangAPI();

// React Query 키 생성 함수들
export const queryKeys = {
  chat: (sessionId: string) => ["chat", sessionId] as const,
  memoryStatus: () => ["memory", "status"] as const,
  systemStatus: () => ["system", "status"] as const,
  userProfile: (userId: string) => ["user", "profile", userId] as const,
  memorySearch: (query: string, level?: number) =>
    ["memory", "search", query, level] as const,
  evolutionEvents: (limit: number) => ["evolution", "events", limit] as const,
};

/**
 * Standardized memory status schema (backend /memory/status)
 * - tiers.ultra_short, tiers.short_term, tiers.medium_term, tiers.long_term, tiers.meta
 * - ts_kst in "YYYY-MM-DD HH:mm" (KST)
 */
export interface MemoryTiers {
  ultra_short: number;
  short_term: number;
  medium_term: number;
  long_term: number;
  meta: number;
}

export interface MemoryStatusStandardized {
  tiers: MemoryTiers;
  ts_kst: string;
}

/**
 * Fetch standardized memory status directly (does not alter existing GumgangAPI).
 */
export async function getMemoryStatusStandardized(): Promise<MemoryStatusStandardized> {
  const response = await fetch(`${API_BASE}/memory/status`);
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  const data = (await response.json()) as MemoryStatusStandardized;

  // Minimal shape validation
  if (!data || !data.tiers || typeof data.ts_kst !== "string") {
    throw new Error("Invalid standardized memory status schema");
  }
  return data;
}

/**
 * React hook for polling standardized memory status.
 * - intervalMs defaults to 3000ms
 * - returns { data, error, loading, refresh }
 */
export function useMemoryStatusStandardized(intervalMs: number = 3000) {
  const [data, setData] = useState<MemoryStatusStandardized | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchOnce = async () => {
    try {
      const res = await fetch(`${API_BASE}/memory/status`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as MemoryStatusStandardized;
      if (!json || !json.tiers || typeof json.ts_kst !== "string") {
        throw new Error("Invalid standardized memory status schema");
      }
      setData(json);
      setError(null);
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOnce();
    const id = setInterval(fetchOnce, Math.max(1000, intervalMs));
    return () => clearInterval(id);
  }, [intervalMs]);

  return { data, error, loading, refresh: fetchOnce };
}

// Import React hooks (kept local to avoid altering existing imports above)
import { useEffect, useState } from "react";
