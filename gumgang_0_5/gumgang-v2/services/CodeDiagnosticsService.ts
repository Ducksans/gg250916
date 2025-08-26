import * as monaco from "monaco-editor";
import { editor, MarkerSeverity, languages, Range } from "monaco-editor";
// import type { Telemetry } from "../../types/core"; // Removed: unused import

// Types for diagnostics
export interface DiagnosticResult {
  diagnostics: Diagnostic[];
  metrics?: CodeMetrics;
  suggestions?: Suggestion[];
}

export interface Diagnostic {
  severity: "error" | "warning" | "info" | "hint";
  message: string;
  range: {
    startLine: number;
    startColumn: number;
    endLine: number;
    endColumn: number;
  };
  code?: string;
  source?: string;
  tags?: string[];
  relatedInformation?: RelatedInformation[];
  quickFixes?: QuickFix[];
}

export interface RelatedInformation {
  location: {
    uri: string;
    range: Range;
  };
  message: string;
}

export interface QuickFix {
  title: string;
  kind?: "quickfix" | "refactor" | "source";
  isPreferred?: boolean;
  edits: TextEdit[];
}

export interface TextEdit {
  range: Range;
  text: string;
}

export interface CodeMetrics {
  complexity: number;
  maintainability: number;
  lines: number;
  statements: number;
  functions: number;
  classes: number;
  duplicates?: DuplicateBlock[];
  coverage?: number;
}

export interface DuplicateBlock {
  range: Range;
  duplicateLocations: Range[];
}

export interface Suggestion {
  type: "performance" | "security" | "style" | "best-practice";
  title: string;
  description: string;
  impact: "high" | "medium" | "low";
  examples?: CodeExample[];
}

export interface CodeExample {
  before: string;
  after: string;
  explanation?: string;
}

// Real-time diagnostic manager
class DiagnosticManager {
  private diagnostics = new Map<string, Diagnostic[]>();
  private markers = new Map<string, editor.IMarkerData[]>();
  private updateQueue = new Map<string, NodeJS.Timeout>();
  private updateDelay = 500; // ms

  queueUpdate(model: editor.ITextModel, diagnostics: Diagnostic[]): void {
    const uri = model.uri.toString();

    // Clear existing timeout
    const existing = this.updateQueue.get(uri);
    if (existing) clearTimeout(existing);

    // Schedule new update
    const timeout = setTimeout(() => {
      this.applyDiagnostics(model, diagnostics);
      this.updateQueue.delete(uri);
    }, this.updateDelay);

    this.updateQueue.set(uri, timeout);
  }

  private applyDiagnostics(
    model: editor.ITextModel,
    diagnostics: Diagnostic[],
  ): void {
    const uri = model.uri.toString();
    this.diagnostics.set(uri, diagnostics);

    // Convert to Monaco markers
    const markers: editor.IMarkerData[] = diagnostics.map((d) => ({
      severity: this.getSeverity(d.severity),
      message: d.message,
      startLineNumber: d.range.startLine,
      startColumn: d.range.startColumn,
      endLineNumber: d.range.endLine,
      endColumn: d.range.endColumn,
      code: d.code,
      source: d.source || "AI Diagnostics",
      tags: d.tags
        ?.map((tag) => this.getMarkerTag(tag))
        .filter((t) => t !== undefined) as number[],
      relatedInformation: d.relatedInformation?.map((info) => ({
        resource: monaco.Uri.parse(info.location.uri),
        message: info.message,
        startLineNumber: info.location.range.startLineNumber,
        startColumn: info.location.range.startColumn,
        endLineNumber: info.location.range.endLineNumber,
        endColumn: info.location.range.endColumn,
      })),
    }));

    this.markers.set(uri, markers);
    editor.setModelMarkers(model, "ai-diagnostics", markers);
  }

  private getSeverity(severity: string): MarkerSeverity {
    switch (severity) {
      case "error":
        return MarkerSeverity.Error;
      case "warning":
        return MarkerSeverity.Warning;
      case "info":
        return MarkerSeverity.Info;
      case "hint":
        return MarkerSeverity.Hint;
      default:
        return MarkerSeverity.Info;
    }
  }

  private getMarkerTag(tag: string): number | undefined {
    switch (tag) {
      case "unnecessary":
        return 1; // MarkerTag.Unnecessary
      case "deprecated":
        return 2; // MarkerTag.Deprecated
      default:
        return undefined;
    }
  }

  getDiagnostics(uri: string): Diagnostic[] {
    return this.diagnostics.get(uri) || [];
  }

  clearDiagnostics(model: editor.ITextModel): void {
    const uri = model.uri.toString();
    this.diagnostics.delete(uri);
    this.markers.delete(uri);
    editor.setModelMarkers(model, "ai-diagnostics", []);
  }

  clearAll(): void {
    this.diagnostics.clear();
    this.markers.clear();
    this.updateQueue.forEach((timeout) => clearTimeout(timeout));
    this.updateQueue.clear();
  }
}

// Code action provider for quick fixes
class CodeActionProvider implements languages.CodeActionProvider {
  constructor(
    private diagnosticManager: DiagnosticManager,
    private service: CodeDiagnosticsService,
  ) {}

  async provideCodeActions(
    model: editor.ITextModel,
    range: Range,
    context: languages.CodeActionContext,
    _token: monaco.CancellationToken,
  ): Promise<languages.CodeActionList> {
    const uri = model.uri.toString();
    const diagnostics = this.diagnosticManager.getDiagnostics(uri);
    const actions: languages.CodeAction[] = [];

    // Find diagnostics in the current range
    for (const diagnostic of diagnostics) {
      if (this.isInRange(diagnostic.range, range)) {
        // Add quick fixes
        if (diagnostic.quickFixes) {
          for (const fix of diagnostic.quickFixes) {
            actions.push({
              title: fix.title,
              kind: fix.kind || "quickfix",
              isPreferred: fix.isPreferred,
              edit: {
                edits: [
                  {
                    resource: model.uri,
                    textEdit: {
                      range: fix.edits[0].range,
                      text: fix.edits[0].text,
                    },
                    versionId: model.getVersionId(),
                  },
                ],
              },
              diagnostics: [diagnostic as any],
            });
          }
        }
      }
    }

    // Add general refactoring actions
    if (context.trigger === languages.CodeActionTriggerType.Invoke) {
      const refactorings = await this.service.getRefactorings(
        model.getValue(),
        model.getLanguageId(),
        range,
      );

      for (const refactoring of refactorings) {
        actions.push({
          title: refactoring.title,
          kind: "refactor",
          edit: {
            edits: refactoring.edits.map((edit) => ({
              resource: model.uri,
              textEdit: {
                range: edit.range,
                text: edit.text,
              },
              versionId: model.getVersionId(),
            })),
          },
        });
      }
    }

    return {
      actions,
      dispose: () => {},
    };
  }

  private isInRange(
    diagnosticRange: Diagnostic["range"],
    targetRange: Range,
  ): boolean {
    return (
      diagnosticRange.startLine >= targetRange.startLineNumber &&
      diagnosticRange.startLine <= targetRange.endLineNumber &&
      diagnosticRange.endLine >= targetRange.startLineNumber &&
      diagnosticRange.endLine <= targetRange.endLineNumber
    );
  }
}

// Main Code Diagnostics Service
export class CodeDiagnosticsService {
  private baseUrl: string;
  private diagnosticManager: DiagnosticManager;
  private codeActionProviders = new Map<string, monaco.IDisposable>();
  private analysisTimeouts = new Map<string, NodeJS.Timeout>();
  private analysisDelay = 1000; // ms
  private abortControllers = new Map<string, AbortController>();

  constructor(baseUrl: string = "http://localhost:8001/api") {
    this.baseUrl = baseUrl;
    this.diagnosticManager = new DiagnosticManager();
  }

  // Register diagnostic provider for a model
  registerDiagnostics(model: editor.ITextModel): void {
    const uri = model.uri.toString();
    const language = model.getLanguageId();

    // Register code action provider if not already registered
    if (!this.codeActionProviders.has(language)) {
      const provider = languages.registerCodeActionProvider(
        language,
        new CodeActionProvider(this.diagnosticManager, this),
      );
      this.codeActionProviders.set(language, provider);
    }

    // Set up change listener
    const disposable = model.onDidChangeContent(() => {
      this.scheduleDiagnostics(model);
    });

    // Initial analysis
    this.scheduleDiagnostics(model);

    // Store disposable for cleanup
    model.onWillDispose(() => {
      disposable.dispose();
      this.diagnosticManager.clearDiagnostics(model);
      this.cancelAnalysis(uri);
    });
  }

  // Schedule diagnostic analysis
  private scheduleDiagnostics(model: editor.ITextModel): void {
    const uri = model.uri.toString();

    // Cancel existing timeout
    const existing = this.analysisTimeouts.get(uri);
    if (existing) clearTimeout(existing);

    // Cancel ongoing request
    this.cancelAnalysis(uri);

    // Schedule new analysis
    const timeout = setTimeout(async () => {
      await this.analyzeDiagnostics(model);
      this.analysisTimeouts.delete(uri);
    }, this.analysisDelay);

    this.analysisTimeouts.set(uri, timeout);
  }

  // Perform diagnostic analysis
  private async analyzeDiagnostics(model: editor.ITextModel): Promise<void> {
    const uri = model.uri.toString();
    const abortController = new AbortController();
    this.abortControllers.set(uri, abortController);

    try {
      const result = await this.analyze(
        model.getValue(),
        model.getLanguageId(),
        model.uri.path,
        abortController.signal,
      );

      if (!abortController.signal.aborted) {
        this.diagnosticManager.queueUpdate(model, result.diagnostics);
      }
    } catch (error) {
      if (!abortController.signal.aborted) {
        console.error("Diagnostic analysis error:", error);
      }
    } finally {
      this.abortControllers.delete(uri);
    }
  }

  // Cancel analysis for a URI
  private cancelAnalysis(uri: string): void {
    const controller = this.abortControllers.get(uri);
    if (controller) {
      controller.abort();
      this.abortControllers.delete(uri);
    }
  }

  // Analyze code for diagnostics
  async analyze(
    code: string,
    language: string,
    fileName?: string,
    signal?: AbortSignal,
  ): Promise<DiagnosticResult> {
    try {
      const response = await fetch(`${this.baseUrl}/ai/diagnostics`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          code,
          language,
          fileName,
        }),
        signal,
      });

      if (!response.ok) {
        throw new Error(`Diagnostic service error: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      if (signal?.aborted) {
        throw new Error("Analysis cancelled");
      }
      console.error("Diagnostic analysis error:", error);
      return { diagnostics: [] };
    }
  }

  // Get refactoring suggestions
  async getRefactorings(
    code: string,
    language: string,
    range?: Range,
  ): Promise<QuickFix[]> {
    try {
      const response = await fetch(`${this.baseUrl}/ai/refactorings`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          code,
          language,
          range: range
            ? {
                startLine: range.startLineNumber,
                startColumn: range.startColumn,
                endLine: range.endLineNumber,
                endColumn: range.endColumn,
              }
            : undefined,
        }),
      });

      if (!response.ok) {
        throw new Error(`Refactoring service error: ${response.statusText}`);
      }

      const data = await response.json();
      return data.refactorings || [];
    } catch (error) {
      console.error("Refactoring error:", error);
      return [];
    }
  }

  // Calculate code metrics
  async calculateMetrics(code: string, language: string): Promise<CodeMetrics> {
    try {
      const response = await fetch(`${this.baseUrl}/ai/metrics`, {
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
        throw new Error(`Metrics service error: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Metrics calculation error:", error);
      return {
        complexity: 0,
        maintainability: 0,
        lines: 0,
        statements: 0,
        functions: 0,
        classes: 0,
      };
    }
  }

  // Find duplicate code blocks
  async findDuplicates(
    code: string,
    language: string,
    minLines: number = 5,
  ): Promise<DuplicateBlock[]> {
    try {
      const response = await fetch(`${this.baseUrl}/ai/duplicates`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          code,
          language,
          minLines,
        }),
      });

      if (!response.ok) {
        throw new Error(`Duplicate detection error: ${response.statusText}`);
      }

      const data = await response.json();
      return data.duplicates || [];
    } catch (error) {
      console.error("Duplicate detection error:", error);
      return [];
    }
  }

  // Get security vulnerabilities
  async checkSecurity(code: string, language: string): Promise<Diagnostic[]> {
    try {
      const response = await fetch(`${this.baseUrl}/ai/security`, {
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
        throw new Error(`Security check error: ${response.statusText}`);
      }

      const data = await response.json();
      return data.vulnerabilities || [];
    } catch (error) {
      console.error("Security check error:", error);
      return [];
    }
  }

  // Clear all diagnostics
  clearAll(): void {
    this.diagnosticManager.clearAll();
    this.analysisTimeouts.forEach((timeout) => clearTimeout(timeout));
    this.analysisTimeouts.clear();
    this.abortControllers.forEach((controller) => controller.abort());
    this.abortControllers.clear();
  }

  // Dispose service
  dispose(): void {
    this.clearAll();
    this.codeActionProviders.forEach((provider) => provider.dispose());
    this.codeActionProviders.clear();
  }
}

// Singleton instance
let diagnosticsService: CodeDiagnosticsService | null = null;

export function getCodeDiagnosticsService(): CodeDiagnosticsService {
  if (!diagnosticsService) {
    diagnosticsService = new CodeDiagnosticsService();
  }
  return diagnosticsService;
}

export function disposeCodeDiagnosticsService(): void {
  if (diagnosticsService) {
    diagnosticsService.dispose();
    diagnosticsService = null;
  }
}

export default CodeDiagnosticsService;
