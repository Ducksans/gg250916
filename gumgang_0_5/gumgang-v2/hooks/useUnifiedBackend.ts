// import type { ApiResult } from "../../types/core"; // Removed: unused import
import { useState, useEffect, useCallback } from "react";

// Backend URL configuration
const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8001";

// Types
interface SystemStats {
  total_files: number;
  total_lines: number;
  active_sessions: number;
  memory_usage: {
    sensory: number;
    working: number;
    episodic: number;
    semantic: number;
  };
  system_health: string;
  last_update: string;
}

interface Task {
  task_id: string;
  task_name: string;
  status: string;
  progress: number;
}

interface MemoryStatus {
  layers: {
    sensory: { capacity: number; used: number };
    working: { capacity: number; used: number };
    episodic: { capacity: number; used: number };
    semantic: { capacity: number; used: number };
  };
  total_memories: number;
  last_cleanup: string;
}

interface BackendResponse<T> {
  status: string;
  data?: T;
  message?: string;
  error?: string;
}

export function useUnifiedBackend() {
  // State management
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [systemStats, setSystemStats] = useState<SystemStats | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [memoryStatus, setMemoryStatus] = useState<MemoryStatus | null>(null);

  // API helper function
  const apiCall = useCallback(
    async <T>(endpoint: string, options?: RequestInit): Promise<T | null> => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch(`${BACKEND_URL}${endpoint}`, {
          ...options,
          headers: {
            "Content-Type": "application/json",
            ...options?.headers,
          },
        });

        if (!response.ok) {
          throw new Error(`API call failed: ${response.statusText}`);
        }

        const data = await response.json();
        return data;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Unknown error occurred";
        setError(errorMessage);
        console.error("API call error:", errorMessage);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  // Health check
  const checkHealth = useCallback(async () => {
    const health = await apiCall<any>("/health");
    if (health) {
      setIsConnected(true);
      return health;
    }
    setIsConnected(false);
    return null;
  }, [apiCall]);

  // Fetch system statistics
  const fetchSystemStats = useCallback(async () => {
    const response = await apiCall<any>("/api/dashboard/stats");
    if (response?.stats) {
      setSystemStats(response.stats);
      return response.stats;
    }
    return null;
  }, [apiCall]);

  // Fetch tasks
  const fetchTasks = useCallback(async () => {
    const response = await apiCall<any>("/api/tasks");
    if (response?.tasks) {
      setTasks(response.tasks);
      return response.tasks;
    }
    return [];
  }, [apiCall]);

  // Create a new task
  const createTask = useCallback(
    async (task: Partial<Task>) => {
      const response = await apiCall<any>("/api/tasks", {
        method: "POST",
        body: JSON.stringify(task),
      });
      if (response?.status === "success") {
        await fetchTasks(); // Refresh task list
        return response;
      }
      return null;
    },
    [apiCall, fetchTasks],
  );

  // Fetch memory status
  const fetchMemoryStatus = useCallback(async () => {
    const response = await apiCall<any>("/api/memory/status");
    if (response?.memory) {
      setMemoryStatus(response.memory);
      return response.memory;
    }
    return null;
  }, [apiCall]);

  // Send chat message
  const sendChatMessage = useCallback(
    async (message: string) => {
      const response = await apiCall<any>("/api/echo", {
        method: "POST",
        body: JSON.stringify({
          message,
          timestamp: new Date().toISOString(),
        }),
      });
      return response;
    },
    [apiCall],
  );

  // Fetch file structure
  const fetchStructure = useCallback(async () => {
    const response = await apiCall<any>("/api/structure");
    return response?.structure || null;
  }, [apiCall]);

  // Execute command (for future use)
  const executeCommand = useCallback(
    async (command: string) => {
      const response = await apiCall<any>("/api/execute", {
        method: "POST",
        body: JSON.stringify({ command }),
      });
      return response;
    },
    [apiCall],
  );

  // Initialize connection and fetch initial data
  useEffect(() => {
    const initializeBackend = async () => {
      await checkHealth();
      if (isConnected) {
        await Promise.all([
          fetchSystemStats(),
          fetchTasks(),
          fetchMemoryStatus(),
        ]);
      }
    };

    initializeBackend();

    // Set up polling for real-time updates
    const interval = setInterval(() => {
      if (isConnected) {
        fetchSystemStats();
        fetchMemoryStatus();
      }
    }, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, []);

  // Periodic health check
  useEffect(() => {
    const healthCheckInterval = setInterval(() => {
      checkHealth();
    }, 10000); // Check every 10 seconds

    return () => clearInterval(healthCheckInterval);
  }, [checkHealth]);

  // Calculate memory usage percentage
  const getMemoryUsagePercentage = useCallback(() => {
    if (!memoryStatus) return 0;

    const totalCapacity = Object.values(memoryStatus.layers).reduce(
      (sum, layer) => sum + layer.capacity,
      0,
    );
    const totalUsed = Object.values(memoryStatus.layers).reduce(
      (sum, layer) => sum + layer.used,
      0,
    );

    return totalCapacity > 0 ? (totalUsed / totalCapacity) * 100 : 0;
  }, [memoryStatus]);

  // Calculate task completion percentage
  const getTaskCompletionPercentage = useCallback(() => {
    if (tasks.length === 0) return 0;

    const completedTasks = tasks.filter(
      (task) => task.status === "completed",
    ).length;
    return (completedTasks / tasks.length) * 100;
  }, [tasks]);

  return {
    // Connection status
    isConnected,
    isLoading,
    error,

    // Data
    systemStats,
    tasks,
    memoryStatus,

    // Methods
    checkHealth,
    fetchSystemStats,
    fetchTasks,
    createTask,
    fetchMemoryStatus,
    sendChatMessage,
    fetchStructure,
    executeCommand,

    // Computed values
    memoryUsagePercentage: getMemoryUsagePercentage(),
    taskCompletionPercentage: getTaskCompletionPercentage(),

    // Backend URL for direct access if needed
    backendUrl: BACKEND_URL,
  };
}

// Export types for external use
export type { SystemStats, Task, MemoryStatus, BackendResponse };
