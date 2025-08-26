"use client";

import { useState, useEffect, useCallback } from "react";
// import { invoke } from "@tauri-apps/api/tauri"; // Removed: Tauri not available
import { listen } from "@tauri-apps/api/event";
import { UnlistenFn } from "@tauri-apps/api/event";

// Stub for invoke when Tauri is not available
const invoke = async <T = any>(command: string, args?: any): Promise<T> => {
  console.warn(`Tauri invoke called but not available: ${command}`, args);
  return Promise.resolve({} as T);
};

// Types matching Rust structures
export interface EvolutionEvent {
  id: string;
  timestamp: string;
  event_type: EvolutionType;
  severity: Severity;
  title: string;
  description: string;
  changes?: CodeChange;
  metrics?: CodeMetrics;
  impact: ImpactAnalysis;
  status: EvolutionStatus;
}

export type EvolutionType =
  | "Mutation"
  | "Optimization"
  | "Adaptation"
  | "Learning"
  | "Refactor"
  | "Security"
  | "Feature";

export type Severity = "Low" | "Medium" | "High" | "Critical";

export interface CodeChange {
  before: string;
  after: string;
  language: string;
  filename: string;
  line_start: number;
  line_end: number;
  diff: string;
}

export interface CodeMetrics {
  complexity: number;
  performance: number;
  maintainability: number;
  security: number;
  test_coverage: number;
  lines_of_code: number;
  technical_debt: number;
}

export interface ImpactAnalysis {
  affected_files: string[];
  affected_functions: string[];
  dependencies: string[];
  estimated_risk: RiskLevel;
  rollback_available: boolean;
  backup_path?: string;
}

export type RiskLevel = "Low" | "Medium" | "High";

export type EvolutionStatus =
  | "Pending"
  | "InProgress"
  | "Completed"
  | "Failed"
  | "RolledBack";

export interface OptimizationSuggestion {
  title: string;
  description: string;
  priority: Priority;
  estimated_improvement: number;
}

export type Priority = "Low" | "Medium" | "High";

// Hook state interface
interface EvolutionState {
  events: EvolutionEvent[];
  currentEvent: EvolutionEvent | null;
  suggestions: OptimizationSuggestion[];
  isAnalyzing: boolean;
  isEvolving: boolean;
  error: string | null;
  autoEvolutionEnabled: boolean;
  watchedFiles: string[];
}

// Evolution hook
export function useEvolution() {
  const [state, setState] = useState<EvolutionState>({
    events: [],
    currentEvent: null,
    suggestions: [],
    isAnalyzing: false,
    isEvolving: false,
    error: null,
    autoEvolutionEnabled: false,
    watchedFiles: [],
  });

  // Load evolution history on mount
  useEffect(() => {
    loadEvolutionHistory();

    // Listen for evolution events
    let unlistenEvolution: UnlistenFn | null = null;
    let unlistenFileChange: UnlistenFn | null = null;

    const setupListeners = async () => {
      // Listen for new evolution events
      unlistenEvolution = await listen<EvolutionEvent>(
        "evolution-event",
        (event) => {
          setState((prev) => ({
            ...prev,
            events: [event.payload, ...prev.events],
            currentEvent: event.payload,
          }));
        },
      );

      // Listen for file change events
      unlistenFileChange = await listen<{ path: string; change_type: string }>(
        "file-change",
        async (event) => {
          if (state.autoEvolutionEnabled) {
            await _handleReset(event.payload.path);
          }
        },
      );
    };

    setupListeners();

    // Cleanup
    return () => {
      unlistenEvolution?.();
      unlistenFileChange?.();
    };
  }, [state.autoEvolutionEnabled]);

  // Load evolution history
  const loadEvolutionHistory = async () => {
    try {
      const history = await invoke<EvolutionEvent[]>("get_evolution_history");
      setState((prev) => ({ ...prev, events: history }));
    } catch (error) {
      console.error("Failed to load evolution history:", error);
      setState((prev) => ({
        ...prev,
        error: "Failed to load evolution history",
      }));
    }
  };

  // Analyze code
  const analyzeCode = useCallback(
    async (code: string, language: string): Promise<CodeMetrics | null> => {
      setState((prev) => ({ ...prev, isAnalyzing: true, error: null }));

      try {
        const metrics = await invoke<CodeMetrics>("analyze_code", {
          code,
          language,
        });

        setState((prev) => ({ ...prev, isAnalyzing: false }));
        return metrics;
      } catch (error) {
        console.error("Code analysis failed:", error);
        setState((prev) => ({
          ...prev,
          isAnalyzing: false,
          error: `Analysis failed: ${error}`,
        }));
        return null;
      }
    },
    [],
  );

  // Get optimization suggestions
  const getSuggestions = useCallback(
    async (
      code: string,
      language: string,
    ): Promise<OptimizationSuggestion[]> => {
      setState((prev) => ({ ...prev, isAnalyzing: true, error: null }));

      try {
        const suggestions = await invoke<OptimizationSuggestion[]>(
          "suggest_improvements",
          {
            code,
            language,
          },
        );

        setState((prev) => ({
          ...prev,
          suggestions,
          isAnalyzing: false,
        }));

        return suggestions;
      } catch (error) {
        console.error("Failed to get suggestions:", error);
        setState((prev) => ({
          ...prev,
          isAnalyzing: false,
          error: `Failed to get suggestions: ${error}`,
        }));
        return [];
      }
    },
    [],
  );

  // Auto-improve code
  const autoImprove = useCallback(
    async (code: string, language: string): Promise<string | null> => {
      setState((prev) => ({ ...prev, isEvolving: true, error: null }));

      try {
        const improvedCode = await invoke<string>("auto_improve_code", {
          code,
          language,
        });

        setState((prev) => ({ ...prev, isEvolving: false }));

        // Create evolution event
        const event: EvolutionEvent = {
          id: crypto.randomUUID(),
          timestamp: new Date().toISOString(),
          event_type: "Optimization",
          severity: "Low",
          title: "Automatic Code Improvement",
          description: "AI has optimized the code",
          changes: {
            before: code,
            after: improvedCode,
            language,
            filename: "untitled",
            line_start: 0,
            line_end: code.split("\n").length,
            diff: generateDiff(code, improvedCode),
          },
          metrics: await analyzeCode(improvedCode, language),
          impact: {
            affected_files: [],
            affected_functions: [],
            dependencies: [],
            estimated_risk: "Low",
            rollback_available: true,
          },
          status: "Completed",
        };

        setState((prev) => ({
          ...prev,
          events: [event, ...prev.events],
          currentEvent: event,
        }));

        return improvedCode;
      } catch (error) {
        console.error("Auto-improvement failed:", error);
        setState((prev) => ({
          ...prev,
          isEvolving: false,
          error: `Auto-improvement failed: ${error}`,
        }));
        return null;
      }
    },
    [analyzeCode],
  );

  // Watch file for changes
  const watchFile = useCallback(async (path: string) => {
    try {
      await invoke("watch_file_changes", { path });
      setState((prev) => ({
        ...prev,
        watchedFiles: [...prev.watchedFiles, path],
      }));
    } catch (error) {
      console.error("Failed to watch file:", error);
      setState((prev) => ({
        ...prev,
        error: `Failed to watch file: ${error}`,
      }));
    }
  }, []);

  // Unwatch file
  const unwatchFile = useCallback((path: string) => {
    setState((prev) => ({
      ...prev,
      watchedFiles: prev.watchedFiles.filter((f) => f !== path),
    }));
  }, []);

  // Self-modify code
  const selfModify = useCallback(
    async (targetFile: string, modifications: string): Promise<boolean> => {
      setState((prev) => ({ ...prev, isEvolving: true, error: null }));

      try {
        const success = await invoke<boolean>("self_modify", {
          target_file: targetFile,
          modifications,
        });

        setState((prev) => ({ ...prev, isEvolving: false }));

        if (success) {
          // Create success event
          const event: EvolutionEvent = {
            id: crypto.randomUUID(),
            timestamp: new Date().toISOString(),
            event_type: "Mutation",
            severity: "High",
            title: "Self-Modification Applied",
            description: `Successfully modified ${targetFile}`,
            status: "Completed",
            impact: {
              affected_files: [targetFile],
              affected_functions: [],
              dependencies: [],
              estimated_risk: "High",
              rollback_available: true,
            },
          };

          setState((prev) => ({
            ...prev,
            events: [event, ...prev.events],
            currentEvent: event,
          }));
        }

        return success;
      } catch (error) {
        console.error("Self-modification failed:", error);
        setState((prev) => ({
          ...prev,
          isEvolving: false,
          error: `Self-modification failed: ${error}`,
        }));
        return false;
      }
    },
    [],
  );

  // Toggle auto-evolution
  const toggleAutoEvolution = useCallback(() => {
    setState((prev) => ({
      ...prev,
      autoEvolutionEnabled: !prev.autoEvolutionEnabled,
    }));
  }, []);

  // Handle file change (for auto-evolution)
  const _handleReset = async (_path: string) => {
    try {
      // Read file content (this would need actual file reading implementation)
      const content = await readFile(_path);
      const language = detectLanguage(_path);

      // Get suggestions
      const suggestions = await getSuggestions(content, language);

      // Auto-apply safe improvements
      if (suggestions.some((s) => s.priority === "Low")) {
        await autoImprove(content, language);
      }
    } catch (error) {
      console.error("Failed to handle file change:", error);
    }
  };

  // Rollback evolution
  const rollbackEvolution = useCallback(
    async (eventId: string): Promise<boolean> => {
      const event = state.events.find((e) => e.id === eventId);
      if (!event || !event.changes) return false;

      try {
        // Apply the "before" state
        const success = await selfModify(
          event.changes.filename,
          event.changes.before,
        );

        if (success) {
          // Update event status
          setState((prev) => ({
            ...prev,
            events: prev.events.map((e) =>
              e.id === eventId ? { ...e, status: "RolledBack" } : e,
            ),
          }));
        }

        return success;
      } catch (error) {
        console.error("Rollback failed:", error);
        return false;
      }
    },
    [state.events, selfModify],
  );

  // Clear error
  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  return {
    // State
    events: state.events,
    currentEvent: state.currentEvent,
    suggestions: state.suggestions,
    isAnalyzing: state.isAnalyzing,
    isEvolving: state.isEvolving,
    error: state.error,
    autoEvolutionEnabled: state.autoEvolutionEnabled,
    watchedFiles: state.watchedFiles,

    // Actions
    analyzeCode,
    getSuggestions,
    autoImprove,
    selfModify,
    watchFile,
    unwatchFile,
    toggleAutoEvolution,
    rollbackEvolution,
    clearError,
    loadEvolutionHistory,
  };
}

// Helper functions
function generateDiff(before: string, after: string): string {
  const beforeLines = before.split("\n");
  const afterLines = after.split("\n");
  let diff = "";

  const maxLines = Math.max(beforeLines.length, afterLines.length);
  for (let i = 0; i < maxLines; i++) {
    if (i >= beforeLines.length) {
      diff += `+ ${afterLines[i]}\n`;
    } else if (i >= afterLines.length) {
      diff += `- ${beforeLines[i]}\n`;
    } else if (beforeLines[i] !== afterLines[i]) {
      diff += `- ${beforeLines[i]}\n`;
      diff += `+ ${afterLines[i]}\n`;
    } else {
      diff += `  ${beforeLines[i]}\n`;
    }
  }

  return diff;
}

function detectLanguage(filepath: string): string {
  const ext = filepath.split(".").pop()?.toLowerCase();
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
    rb: "ruby",
    php: "php",
    swift: "swift",
    kt: "kotlin",
    scala: "scala",
    r: "r",
    m: "matlab",
    sql: "sql",
    sh: "shell",
    bash: "shell",
    html: "html",
    css: "css",
    scss: "scss",
    json: "json",
    yaml: "yaml",
    yml: "yaml",
    xml: "xml",
    md: "markdown",
  };

  return languageMap[ext || ""] || "plaintext";
}

async function readFile(_path: string): Promise<string> {
  // This would need actual Tauri file system API implementation
  // For now, return placeholder
  return "";
}

export default useEvolution;
