// Enhanced API client for Gumgang 2.0 with retry logic and improved error handling
// import type { ApiResult, Telemetry } from "../../types/core"; // Removed: unused imports

const API_BASE = "http://localhost:8000";

// Configuration
const CONFIG = {
  maxRetries: 3,
  retryDelay: 1000, // Initial delay in ms
  maxRetryDelay: 10000, // Maximum delay in ms
  requestTimeout: 30000, // 30 seconds
  healthCheckInterval: 5000, // 5 seconds
};

// Types
export interface ChatMessage {
  role: "user" | "assistant" | "system" | "error";
  content: string;
  timestamp?: string;
  metadata?: Record<string, any>;
}

export interface ChatResponse {
  response?: string;
  message?: string;
  session_id?: string;
  metadata?: {
    memory_used?: boolean;
    memory_type?: string;
    confidence?: number;
    timestamp?: string;
    processing_time?: number;
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
  message?: string;
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
  type?: string;
  timestamp: string;
  accessCount?: number;
  importance?: number;
  metadata?: Record<string, any>;
}

export interface EvolutionEvent {
  id: string;
  type: "code_change" | "self_improvement" | "learning_update";
  description: string;
  timestamp: string;
  status: "pending" | "approved" | "rejected";
  impact?: {
    riskLevel: "low" | "medium" | "high";
    affectedComponents: string[];
    testCoverage: number;
  };
  diff?: string;
}

// Custom error class
export class APIError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public details?: any,
  ) {
    super(message);
    this.name = "APIError";
  }
}

// Connection state management
export type ConnectionState =
  | "connecting"
  | "connected"
  | "disconnected"
  | "error";

interface ConnectionStatus {
  state: ConnectionState;
  lastCheck: Date | null;
  errorCount: number;
  lastError?: string;
}

// Retry with exponential backoff
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  retries: number = CONFIG.maxRetries,
  delay: number = CONFIG.retryDelay,
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (retries === 0) {
      throw error;
    }

    const nextDelay = Math.min(delay * 2, CONFIG.maxRetryDelay);
    console.log(`Retrying in ${delay}ms... (${retries} retries left)`);

    await new Promise((resolve) => setTimeout(resolve, delay));
    return retryWithBackoff(fn, retries - 1, nextDelay);
  }
}

// Request with timeout
async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeout: number = CONFIG.requestTimeout,
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } catch (error: any) {
    if (error.name === "AbortError") {
      throw new APIError("Request timeout", 408, { url, timeout });
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

// Enhanced API Client
class EnhancedGumgangAPI {
  private headers = {
    "Content-Type": "application/json",
  };

  private connectionStatus: ConnectionStatus = {
    state: "disconnected",
    lastCheck: null,
    errorCount: 0,
  };

  private healthCheckTimer?: NodeJS.Timeout;
  private listeners: Map<string, Set<(status: ConnectionStatus) => void>> =
    new Map();

  constructor() {
    // Start health check on initialization
    this.startHealthCheck();
  }

  // Connection status management
  private updateConnectionStatus(update: Partial<ConnectionStatus>) {
    this.connectionStatus = { ...this.connectionStatus, ...update };
    this.notifyListeners();
  }

  private notifyListeners() {
    this.listeners.forEach((callbacks) => {
      callbacks.forEach((callback) => callback(this.connectionStatus));
    });
  }

  onConnectionChange(callback: (status: ConnectionStatus) => void): () => void {
    const id = Math.random().toString(36);
    if (!this.listeners.has(id)) {
      this.listeners.set(id, new Set());
    }
    this.listeners.get(id)!.add(callback);

    // Return unsubscribe function
    return () => {
      this.listeners.get(id)?.delete(callback);
      if (this.listeners.get(id)?.size === 0) {
        this.listeners.delete(id);
      }
    };
  }

  getConnectionStatus(): ConnectionStatus {
    return { ...this.connectionStatus };
  }

  // Health check
  private async performHealthCheck() {
    try {
      const response = await fetchWithTimeout(`${API_BASE}/health`, {}, 5000);

      if (response.ok) {
        this.updateConnectionStatus({
          state: "connected",
          lastCheck: new Date(),
          errorCount: 0,
          lastError: undefined,
        });
      } else {
        throw new Error(`Health check failed: ${response.status}`);
      }
    } catch (error: any) {
      this.updateConnectionStatus({
        state: "error",
        lastCheck: new Date(),
        errorCount: this.connectionStatus.errorCount + 1,
        lastError: error.message,
      });
    }
  }

  startHealthCheck() {
    this.stopHealthCheck();
    this.performHealthCheck(); // Initial check
    this.healthCheckTimer = setInterval(() => {
      this.performHealthCheck();
    }, CONFIG.healthCheckInterval);
  }

  stopHealthCheck() {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = undefined;
    }
  }

  // Enhanced request method with retry
  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<T> {
    return retryWithBackoff(async () => {
      const url = `${API_BASE}${endpoint}`;

      try {
        const response = await fetchWithTimeout(url, {
          ...options,
          headers: {
            ...this.headers,
            ...(options.headers || {}),
          },
        });

        if (!response.ok) {
          const errorBody = await response.text();
          throw new APIError(
            `HTTP ${response.status}: ${response.statusText}`,
            response.status,
            { url, body: errorBody },
          );
        }

        const data = await response.json();

        // Update connection status on successful request
        if (this.connectionStatus.state !== "connected") {
          this.updateConnectionStatus({
            state: "connected",
            lastCheck: new Date(),
            errorCount: 0,
            lastError: undefined,
          });
        }

        return data;
      } catch (error: any) {
        // Update connection status on error
        if (this.connectionStatus.state === "connected") {
          this.updateConnectionStatus({
            state: "error",
            lastCheck: new Date(),
            errorCount: this.connectionStatus.errorCount + 1,
            lastError: error.message,
          });
        }

        console.error(`API request failed: ${endpoint}`, error);
        throw error;
      }
    });
  }

  // Chat API
  async chat(
    message: string,
    sessionId: string = "default",
  ): Promise<ChatResponse> {
    return this.request<ChatResponse>("/ask", {
      method: "POST",
      body: JSON.stringify({
        query: message,
        session_id: sessionId,
      }),
    });
  }

  // Memory Status
  async getMemoryStatus(): Promise<MemoryStatus> {
    return this.request<MemoryStatus>("/memory/status");
  }

  // System Status
  async getSystemStatus(): Promise<SystemStatus> {
    return this.request<SystemStatus>("/status");
  }

  // User Profile
  async getUserProfile(userId: string = "default_user"): Promise<UserProfile> {
    return this.request<UserProfile>(`/memory/profile/${userId}`);
  }

  // Memory Search
  async searchMemories(query: string, level?: number): Promise<MemoryItem[]> {
    const params = new URLSearchParams({ query });
    if (level !== undefined) {
      params.append("level", level.toString());
    }
    return this.request<MemoryItem[]>(`/memory/search?${params}`);
  }

  // Add Memory
  async addMemory(
    content: string,
    level: number = 1,
    metadata?: Record<string, any>,
  ): Promise<{ success: boolean; id?: string; message?: string }> {
    return this.request<{ success: boolean; id?: string; message?: string }>(
      "/memory/add",
      {
        method: "POST",
        body: JSON.stringify({
          content,
          level,
          metadata,
        }),
      },
    );
  }

  // Evolution Events
  async getEvolutionEvents(limit: number = 50): Promise<EvolutionEvent[]> {
    try {
      return await this.request<EvolutionEvent[]>(
        `/evolution/events?limit=${limit}`,
      );
    } catch (error) {
      console.warn("Evolution events API not available, returning empty array");
      return [];
    }
  }

  // Approve/Reject Evolution
  async approveEvolution(
    eventId: string,
    approved: boolean,
  ): Promise<{ success: boolean; event_id: string; status: string }> {
    return this.request<{ success: boolean; event_id: string; status: string }>(
      `/evolution/approve/${eventId}`,
      {
        method: "POST",
        body: JSON.stringify({ approved }),
      },
    );
  }

  // Health Check (public)
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetchWithTimeout(`${API_BASE}/health`, {}, 5000);
      return response.ok;
    } catch {
      return false;
    }
  }

  // Test connection
  async testConnection(): Promise<{
    connected: boolean;
    latency?: number;
    error?: string;
  }> {
    const startTime = Date.now();

    try {
      const response = await fetchWithTimeout(`${API_BASE}/health`, {}, 5000);
      const latency = Date.now() - startTime;

      if (response.ok) {
        return { connected: true, latency };
      } else {
        return {
          connected: false,
          error: `HTTP ${response.status}`,
        };
      }
    } catch (error: any) {
      return {
        connected: false,
        error: error.message,
      };
    }
  }

  // Cleanup
  destroy() {
    this.stopHealthCheck();
    this.listeners.clear();
  }
}

// Singleton instance
let apiInstance: EnhancedGumgangAPI | null = null;

export function getGumgangAPI(): EnhancedGumgangAPI {
  if (!apiInstance) {
    apiInstance = new EnhancedGumgangAPI();
  }
  return apiInstance;
}

// Export singleton
export const gumgangAPI = getGumgangAPI();

// React Query keys
export const queryKeys = {
  chat: (sessionId: string) => ["chat", sessionId] as const,
  memoryStatus: () => ["memory", "status"] as const,
  systemStatus: () => ["system", "status"] as const,
  userProfile: (userId: string) => ["user", "profile", userId] as const,
  memorySearch: (query: string, level?: number) =>
    ["memory", "search", query, level] as const,
  evolutionEvents: (limit: number) => ["evolution", "events", limit] as const,
  connectionStatus: () => ["connection", "status"] as const,
};

// Hooks for React (optional)
export function useConnectionStatus() {
  if (typeof window === "undefined") return null;

  const [status, setStatus] = useState<ConnectionStatus>(
    gumgangAPI.getConnectionStatus(),
  );

  useEffect(() => {
    const unsubscribe = gumgangAPI.onConnectionChange(setStatus);
    return unsubscribe;
  }, []);

  return status;
}

// For React import
import { useState, useEffect } from "react";
