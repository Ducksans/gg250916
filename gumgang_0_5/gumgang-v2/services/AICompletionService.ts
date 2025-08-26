import * as monaco from "monaco-editor";
import { editor, languages, Position, Range } from "monaco-editor";
// import type { ID } from "../../types/core"; // Removed: unused import

// Types for AI completions
export interface AICompletionRequest {
  code: string;
  language: string;
  position: {
    line: number;
    column: number;
  };
  context?: {
    fileName?: string;
    projectPath?: string;
    beforeCode?: string;
    afterCode?: string;
  };
  maxSuggestions?: number;
  temperature?: number;
}

export interface AICompletionResponse {
  suggestions: AICompletion[];
  metadata?: {
    model?: string;
    processingTime?: number;
    confidence?: number;
  };
}

export interface AICompletion {
  label: string;
  insertText: string;
  detail?: string;
  documentation?: string;
  kind?: languages.CompletionItemKind;
  range?: Range;
  confidence?: number;
  sortText?: string;
  filterText?: string;
  preselect?: boolean;
  command?: {
    id: string;
    title: string;
    arguments?: any[];
  };
}

export interface CodeAnalysis {
  issues: CodeIssue[];
  suggestions: RefactoringSuggestion[];
  complexity?: number;
  qualityScore?: number;
}

export interface CodeIssue {
  severity: "error" | "warning" | "info" | "hint";
  message: string;
  range: Range;
  code?: string;
  source?: string;
  fixes?: QuickFix[];
}

export interface QuickFix {
  title: string;
  edits: TextEdit[];
}

export interface TextEdit {
  range: Range;
  text: string;
}

export interface RefactoringSuggestion {
  title: string;
  description?: string;
  edits: TextEdit[];
  priority?: "high" | "medium" | "low";
}

// Cache management
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

class CompletionCache {
  private cache = new Map<string, CacheEntry<AICompletionResponse>>();
  private maxSize = 100;
  private defaultTTL = 60000; // 1 minute

  set(key: string, data: AICompletionResponse, ttl?: number): void {
    // Implement LRU eviction
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) this.cache.delete(firstKey);
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTTL,
    });
  }

  get(key: string): AICompletionResponse | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const isExpired = Date.now() - entry.timestamp > entry.ttl;
    if (isExpired) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  clear(): void {
    this.cache.clear();
  }

  generateKey(request: AICompletionRequest): string {
    const { code, language, position } = request;
    const contextHash = this.hashCode(code.substring(0, 500));
    return `${language}:${position.line}:${position.column}:${contextHash}`;
  }

  private hashCode(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return hash;
  }
}

// Debouncer for API calls
class Debouncer {
  private timeouts = new Map<string, NodeJS.Timeout>();

  debounce<T extends (...args: any[]) => any>(
    key: string,
    func: T,
    delay: number,
  ): (...args: Parameters<T>) => void {
    return (...args: Parameters<T>) => {
      const existing = this.timeouts.get(key);
      if (existing) clearTimeout(existing);

      const timeout = setTimeout(() => {
        func(...args);
        this.timeouts.delete(key);
      }, delay);

      this.timeouts.set(key, timeout);
    };
  }

  cancel(key: string): void {
    const timeout = this.timeouts.get(key);
    if (timeout) {
      clearTimeout(timeout);
      this.timeouts.delete(key);
    }
  }

  cancelAll(): void {
    this.timeouts.forEach((timeout) => clearTimeout(timeout));
    this.timeouts.clear();
  }
}

// Main AI Completion Service
export class AICompletionService {
  private baseUrl: string;
  private cache: CompletionCache;
  private debouncer: Debouncer;
  private abortController: AbortController | null = null;
  private registeredProviders: Map<string, monaco.IDisposable> = new Map();

  constructor(baseUrl: string = "http://localhost:8001/api") {
    this.baseUrl = baseUrl;
    this.cache = new CompletionCache();
    this.debouncer = new Debouncer();
  }

  // Register AI completion provider for a language
  registerCompletionProvider(language: string): monaco.IDisposable {
    // Unregister existing provider for this language
    const existing = this.registeredProviders.get(language);
    if (existing) existing.dispose();

    const provider = languages.registerCompletionItemProvider(language, {
      provideCompletionItems: async (model, position, context, token) => {
        return this.provideCompletions(model, position, context, token);
      },
      resolveCompletionItem: async (item, token) => {
        return this.resolveCompletion(item, token);
      },
      triggerCharacters: [".", "(", "[", "{", " ", "\n", '"', "'", "`"],
    });

    this.registeredProviders.set(language, provider);
    return provider;
  }

  // Main completion provider method
  private async provideCompletions(
    model: editor.ITextModel,
    position: Position,
    _context: languages.CompletionContext,
    token: monaco.CancellationToken,
  ): Promise<languages.CompletionList> {
    const request: AICompletionRequest = {
      code: model.getValue(),
      language: model.getLanguageId(),
      position: {
        line: position.lineNumber,
        column: position.column,
      },
      context: {
        fileName: model.uri.path,
        beforeCode: this.getCodeBefore(model, position, 500),
        afterCode: this.getCodeAfter(model, position, 200),
      },
    };

    // Check cache first
    const cacheKey = this.cache.generateKey(request);
    const cached = this.cache.get(cacheKey);
    if (cached) {
      return this.formatCompletionList(cached, model, position);
    }

    // Cancel previous request if still pending
    if (this.abortController) {
      this.abortController.abort();
    }

    // Make API request with debouncing
    try {
      const response = await this.fetchCompletions(request, token);
      this.cache.set(cacheKey, response);
      return this.formatCompletionList(response, model, position);
    } catch (error) {
      console.error("AI completion error:", error);
      return { suggestions: [] };
    }
  }

  // Resolve additional information for a completion item
  private async resolveCompletion(
    item: languages.CompletionItem,
    _token: monaco.CancellationToken,
  ): Promise<languages.CompletionItem> {
    // Enhance completion item with additional documentation
    if (!item.documentation && item.label) {
      try {
        const doc = await this.fetchDocumentation(item.label.toString());
        if (doc) {
          item.documentation = {
            value: doc,
            supportHtml: true,
          };
        }
      } catch (error) {
        console.error("Failed to fetch documentation:", error);
      }
    }
    return item;
  }

  // Fetch completions from backend
  private async fetchCompletions(
    request: AICompletionRequest,
    _token: monaco.CancellationToken,
  ): Promise<AICompletionResponse> {
    this.abortController = new AbortController();

    const response = await fetch(`${this.baseUrl}/ai/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request),
      signal: this.abortController.signal,
    });

    if (!response.ok) {
      throw new Error(`AI service error: ${response.statusText}`);
    }

    const data = await response.json();
    this.abortController = null;
    return data;
  }

  // Fetch documentation for a symbol
  private async fetchDocumentation(symbol: string): Promise<string | null> {
    try {
      const response = await fetch(`${this.baseUrl}/ai/documentation`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ symbol }),
      });

      if (!response.ok) return null;
      const data = await response.json();
      return data.documentation || null;
    } catch {
      return null;
    }
  }

  // Format AI response to Monaco completion list
  private formatCompletionList(
    response: AICompletionResponse,
    _model: editor.ITextModel,
    position: Position,
  ): languages.CompletionList {
    const suggestions: languages.CompletionItem[] = response.suggestions.map(
      (suggestion, index) => ({
        label: suggestion.label,
        kind: suggestion.kind || languages.CompletionItemKind.Text,
        insertText: suggestion.insertText,
        detail: suggestion.detail,
        documentation: suggestion.documentation
          ? {
              value: suggestion.documentation,
              supportHtml: true,
            }
          : undefined,
        range: suggestion.range || {
          startLineNumber: position.lineNumber,
          startColumn: position.column,
          endLineNumber: position.lineNumber,
          endColumn: position.column,
        },
        sortText: suggestion.sortText || String(index).padStart(4, "0"),
        filterText: suggestion.filterText || suggestion.label,
        preselect: suggestion.preselect || index === 0,
        command: suggestion.command,
      }),
    );

    return {
      suggestions,
      incomplete: false,
    };
  }

  // Get code before cursor
  private getCodeBefore(
    model: editor.ITextModel,
    position: Position,
    maxChars: number,
  ): string {
    const startLine = Math.max(1, position.lineNumber - 10);
    const range = new Range(startLine, 1, position.lineNumber, position.column);
    const text = model.getValueInRange(range);
    return text.slice(-maxChars);
  }

  // Get code after cursor
  private getCodeAfter(
    model: editor.ITextModel,
    position: Position,
    maxChars: number,
  ): string {
    const endLine = Math.min(model.getLineCount(), position.lineNumber + 5);
    const range = new Range(
      position.lineNumber,
      position.column,
      endLine,
      model.getLineMaxColumn(endLine),
    );
    const text = model.getValueInRange(range);
    return text.slice(0, maxChars);
  }

  // Analyze code and provide issues/suggestions
  async analyzeCode(
    code: string,
    language: string,
    fileName?: string,
  ): Promise<CodeAnalysis> {
    try {
      const response = await fetch(`${this.baseUrl}/ai/analyze`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          code,
          language,
          fileName,
        }),
      });

      if (!response.ok) {
        throw new Error(`Analysis failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Code analysis error:", error);
      return {
        issues: [],
        suggestions: [],
      };
    }
  }

  // Generate code from natural language
  async generateCode(
    prompt: string,
    language: string,
    _context?: string,
  ): Promise<string> {
    try {
      const response = await fetch(`${this.baseUrl}/ai/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt,
          language,
          context: _context,
        }),
      });

      if (!response.ok) {
        throw new Error(`Generation failed: ${response.statusText}`);
      }

      const data = await response.json();
      return data.code || "";
    } catch (error) {
      console.error("Code generation error:", error);
      throw error;
    }
  }

  // Explain code functionality
  async explainCode(code: string, language: string): Promise<string> {
    try {
      const response = await fetch(`${this.baseUrl}/ai/explain`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          code,
          language,
        }),
      });

      if (!response.ok) {
        throw new Error(`Explanation failed: ${response.statusText}`);
      }

      const data = await response.json();
      return data.explanation || "Unable to explain this code.";
    } catch (error) {
      console.error("Code explanation error:", error);
      return "Error explaining code.";
    }
  }

  // Suggest refactorings
  async suggestRefactorings(
    code: string,
    language: string,
    selection?: Range,
  ): Promise<RefactoringSuggestion[]> {
    try {
      const response = await fetch(`${this.baseUrl}/ai/refactor`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          code,
          language,
          selection: selection
            ? {
                startLine: selection.startLineNumber,
                startColumn: selection.startColumn,
                endLine: selection.endLineNumber,
                endColumn: selection.endColumn,
              }
            : undefined,
        }),
      });

      if (!response.ok) {
        throw new Error(`Refactoring failed: ${response.statusText}`);
      }

      const data = await response.json();
      return data.suggestions || [];
    } catch (error) {
      console.error("Refactoring error:", error);
      return [];
    }
  }

  // Clear cache
  clearCache(): void {
    this.cache.clear();
  }

  // Dispose service
  dispose(): void {
    this.debouncer.cancelAll();
    if (this.abortController) {
      this.abortController.abort();
    }
    this.registeredProviders.forEach((provider) => provider.dispose());
    this.registeredProviders.clear();
    this.cache.clear();
  }
}

// Singleton instance
let aiCompletionService: AICompletionService | null = null;

export function getAICompletionService(): AICompletionService {
  if (!aiCompletionService) {
    aiCompletionService = new AICompletionService();
  }
  return aiCompletionService;
}

export function disposeAICompletionService(): void {
  if (aiCompletionService) {
    aiCompletionService.dispose();
    aiCompletionService = null;
  }
}

// Export default
export default AICompletionService;
