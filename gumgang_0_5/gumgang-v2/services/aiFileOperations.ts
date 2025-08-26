import { invoke } from "@tauri-apps/api/core";
import { EventEmitter } from "events";
import { v4 as uuidv4 } from "uuid";
// import type { ID, CanonHeader } from "../../types/core"; // Removed: module not found

// Local type definitions
// type ID = string; // Unused type
// type CanonHeader = any; // Unused type

export type OperationType =
  | "create"
  | "modify"
  | "delete"
  | "rename"
  | "move"
  | "mkdir"
  | "batch";
export type OperationStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "executed"
  | "failed"
  | "rolled_back";
export type RiskLevel = "low" | "medium" | "high" | "critical";

export interface FileOperation {
  id: string;
  type: OperationType;
  path: string;
  content?: string;
  newPath?: string;
  timestamp: Date;
  status: OperationStatus;
  aiContext: string;
  aiRequestId?: string;
  riskLevel: RiskLevel;
  preview?: string;
  originalContent?: string;
  error?: string;
  executedAt?: Date;
  approvedBy?: string;
  rejectedBy?: string;
  rollbackable: boolean;
  metadata?: Record<string, any>;
}

export interface BatchOperation {
  id: string;
  operations: FileOperation[];
  description: string;
  totalRisk: RiskLevel;
  status: OperationStatus;
  timestamp: Date;
}

export interface OperationResult {
  success: boolean;
  operationId: string;
  error?: string;
  rollbackId?: string;
}

export interface ApprovalPolicy {
  autoApproveLevel: "none" | "low" | "medium";
  requireConfirmationForDelete: boolean;
  requireConfirmationForSystemFiles: boolean;
  maxAutoApproveSize: number; // in bytes
  blacklistedPaths: string[];
  whitelistedPaths: string[];
}

class AIFileOperationsService extends EventEmitter {
  private operations: Map<string, FileOperation> = new Map();
  private batchOperations: Map<string, BatchOperation> = new Map();
  private operationHistory: FileOperation[] = [];
  private approvalPolicy: ApprovalPolicy;
  private rollbackStack: FileOperation[] = [];
  private isProcessing: boolean = false;

  constructor() {
    super();
    this.approvalPolicy = this.getDefaultPolicy();
    this.loadOperationHistory();
  }

  private getDefaultPolicy(): ApprovalPolicy {
    return {
      autoApproveLevel: "none",
      requireConfirmationForDelete: true,
      requireConfirmationForSystemFiles: true,
      maxAutoApproveSize: 1024 * 1024, // 1MB
      blacklistedPaths: [
        "/etc",
        "/usr",
        "/bin",
        "/sbin",
        "/boot",
        "/System",
        "C:\\Windows",
        "C:\\Program Files",
      ],
      whitelistedPaths: ["/tmp", "/home/duksan/바탕화면/gumgang_0_5"],
    };
  }

  /**
   * AI가 파일 작업을 요청할 때 사용
   */
  public async requestOperation(
    type: OperationType,
    path: string,
    options: {
      content?: string;
      newPath?: string;
      aiContext: string;
      aiRequestId?: string;
      metadata?: Record<string, any>;
    },
  ): Promise<string> {
    const operationId = uuidv4();
    const riskLevel = await this.assessRisk(type, path, options.content);

    // 파일 미리보기 생성
    let preview: string | undefined;
    let originalContent: string | undefined;

    if (type === "modify" || type === "delete") {
      try {
        originalContent = await this.readFileContent(path);
        preview = this.generatePreview(originalContent, options.content);
      } catch (err) {
        console.warn("Failed to generate preview:", err);
      }
    } else if (type === "create" && options.content) {
      preview = this.truncateContent(options.content, 500);
    }

    const operation: FileOperation = {
      id: operationId,
      type,
      path,
      content: options.content,
      newPath: options.newPath,
      timestamp: new Date(),
      status: "pending",
      aiContext: options.aiContext,
      aiRequestId: options.aiRequestId,
      riskLevel,
      preview,
      originalContent,
      rollbackable: type !== "delete",
      metadata: options.metadata,
    };

    this.operations.set(operationId, operation);

    // 자동 승인 체크
    if (this.shouldAutoApprove(operation)) {
      await this.approveOperation(operationId, "auto-approval");
    } else {
      this.emit("operation-requested", operation);
    }

    return operationId;
  }

  /**
   * 여러 작업을 배치로 요청
   */
  public async requestBatchOperation(
    operations: Omit<
      FileOperation,
      "id" | "timestamp" | "status" | "rollbackable"
    >[],
    description: string,
  ): Promise<string> {
    const batchId = uuidv4();
    const batchOps: FileOperation[] = [];
    let maxRisk: RiskLevel = "low";

    for (const op of operations) {
      const operationId = uuidv4();
      const riskLevel = await this.assessRisk(op.type, op.path, op.content);

      if (this.getRiskPriority(riskLevel) > this.getRiskPriority(maxRisk)) {
        maxRisk = riskLevel;
      }

      const fullOp: FileOperation = {
        ...op,
        id: operationId,
        timestamp: new Date(),
        status: "pending",
        rollbackable: op.type !== "delete",
      };

      batchOps.push(fullOp);
      this.operations.set(operationId, fullOp);
    }

    const batch: BatchOperation = {
      id: batchId,
      operations: batchOps,
      description,
      totalRisk: maxRisk,
      status: "pending",
      timestamp: new Date(),
    };

    this.batchOperations.set(batchId, batch);
    this.emit("batch-requested", batch);

    return batchId;
  }

  /**
   * 작업 승인
   */
  public async approveOperation(
    operationId: string,
    approvedBy: string = "user",
  ): Promise<OperationResult> {
    const operation = this.operations.get(operationId);
    if (!operation) {
      return { success: false, operationId, error: "Operation not found" };
    }

    if (operation.status !== "pending") {
      return { success: false, operationId, error: "Operation is not pending" };
    }

    operation.status = "approved";
    operation.approvedBy = approvedBy;
    this.emit("operation-approved", operation);

    // 즉시 실행
    return await this.executeOperation(operation);
  }

  /**
   * 작업 거부
   */
  public rejectOperation(
    operationId: string,
    rejectedBy: string = "user",
  ): OperationResult {
    const operation = this.operations.get(operationId);
    if (!operation) {
      return { success: false, operationId, error: "Operation not found" };
    }

    operation.status = "rejected";
    operation.rejectedBy = rejectedBy;
    this.emit("operation-rejected", operation);

    this.moveToHistory(operation);
    return { success: true, operationId };
  }

  /**
   * 모든 대기 중인 작업 승인
   */
  public async approveAll(
    approvedBy: string = "user",
  ): Promise<OperationResult[]> {
    const results: OperationResult[] = [];
    const pendingOps = Array.from(this.operations.values()).filter(
      (op) => op.status === "pending",
    );

    for (const op of pendingOps) {
      const result = await this.approveOperation(op.id, approvedBy);
      results.push(result);
    }

    return results;
  }

  /**
   * 모든 대기 중인 작업 거부
   */
  public rejectAll(rejectedBy: string = "user"): OperationResult[] {
    const results: OperationResult[] = [];
    const pendingOps = Array.from(this.operations.values()).filter(
      (op) => op.status === "pending",
    );

    for (const op of pendingOps) {
      const result = this.rejectOperation(op.id, rejectedBy);
      results.push(result);
    }

    return results;
  }

  /**
   * 작업 실행
   */
  private async executeOperation(
    operation: FileOperation,
  ): Promise<OperationResult> {
    if (this.isProcessing) {
      return {
        success: false,
        operationId: operation.id,
        error: "Another operation is in progress",
      };
    }

    this.isProcessing = true;
    operation.status = "executed";
    operation.executedAt = new Date();

    try {
      switch (operation.type) {
        case "create":
          await this.createFile(operation.path, operation.content || "");
          break;

        case "modify":
          await this.modifyFile(operation.path, operation.content || "");
          break;

        case "delete":
          await this.deleteFile(operation.path);
          break;

        case "rename":
        case "move":
          if (!operation.newPath) {
            throw new Error("New path is required for rename/move operation");
          }
          await this.moveFile(operation.path, operation.newPath);
          break;

        case "mkdir":
          await this.createDirectory(operation.path);
          break;

        default:
          throw new Error(`Unknown operation type: ${operation.type}`);
      }

      // 롤백 가능한 경우 스택에 추가
      if (operation.rollbackable && operation.originalContent !== undefined) {
        this.rollbackStack.push(operation);
      }

      this.emit("operation-executed", operation);
      this.moveToHistory(operation);

      return { success: true, operationId: operation.id };
    } catch (error) {
      operation.status = "failed";
      operation.error = error instanceof Error ? error.message : String(error);
      this.emit("operation-failed", operation);

      return {
        success: false,
        operationId: operation.id,
        error: operation.error,
      };
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * 마지막 작업 롤백
   */
  public async rollback(): Promise<OperationResult> {
    const lastOperation = this.rollbackStack.pop();
    if (!lastOperation) {
      return {
        success: false,
        operationId: "",
        error: "No operation to rollback",
      };
    }

    const rollbackId = uuidv4();
    try {
      switch (lastOperation.type) {
        case "create":
          await this.deleteFile(lastOperation.path);
          break;

        case "modify":
          if (lastOperation.originalContent !== undefined) {
            await this.modifyFile(
              lastOperation.path,
              lastOperation.originalContent,
            );
          }
          break;

        case "move":
        case "rename":
          if (lastOperation.newPath) {
            await this.moveFile(lastOperation.newPath, lastOperation.path);
          }
          break;

        case "mkdir":
          await this.deleteDirectory(lastOperation.path);
          break;
      }

      lastOperation.status = "rolled_back";
      this.emit("operation-rolled-back", lastOperation);

      return { success: true, operationId: lastOperation.id, rollbackId };
    } catch (error) {
      return {
        success: false,
        operationId: lastOperation.id,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * 위험도 평가
   */
  private async assessRisk(
    type: OperationType,
    path: string,
    content?: string,
  ): Promise<RiskLevel> {
    // 시스템 파일 체크
    if (this.isSystemPath(path)) {
      return "critical";
    }

    // 블랙리스트 체크
    if (this.isBlacklisted(path)) {
      return "high";
    }

    // 화이트리스트 체크
    if (this.isWhitelisted(path)) {
      if (type === "delete") return "medium";
      return "low";
    }

    // 작업 타입별 위험도
    switch (type) {
      case "delete":
        return "high";
      case "move":
      case "rename":
        return "medium";
      case "modify":
        // 큰 파일 수정은 위험도 높음
        if (
          content &&
          content.length > this.approvalPolicy.maxAutoApproveSize
        ) {
          return "medium";
        }
        return "low";
      case "create":
      case "mkdir":
        return "low";
      default:
        return "medium";
    }
  }

  /**
   * 자동 승인 여부 판단
   */
  private shouldAutoApprove(operation: FileOperation): boolean {
    if (this.approvalPolicy.autoApproveLevel === "none") {
      return false;
    }

    const riskPriority = this.getRiskPriority(operation.riskLevel);
    const policyPriority = this.getRiskPriority(
      this.approvalPolicy.autoApproveLevel as RiskLevel,
    );

    return riskPriority <= policyPriority;
  }

  private getRiskPriority(level: RiskLevel | string): number {
    switch (level) {
      case "low":
        return 1;
      case "medium":
        return 2;
      case "high":
        return 3;
      case "critical":
        return 4;
      default:
        return 999;
    }
  }

  private isSystemPath(path: string): boolean {
    const systemPaths = [
      "/etc",
      "/usr",
      "/bin",
      "/sbin",
      "/System",
      "C:\\Windows",
      "C:\\Program Files",
    ];
    return systemPaths.some((sp) => path.startsWith(sp));
  }

  private isBlacklisted(path: string): boolean {
    return this.approvalPolicy.blacklistedPaths.some((bp) =>
      path.startsWith(bp),
    );
  }

  private isWhitelisted(path: string): boolean {
    return this.approvalPolicy.whitelistedPaths.some((wp) =>
      path.startsWith(wp),
    );
  }

  private truncateContent(content: string, maxLength: number): string {
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength) + "\n... (truncated)";
  }

  private generatePreview(original: string, modified?: string): string {
    if (!modified) {
      return this.truncateContent(original, 500);
    }

    // 간단한 diff 표시
    const originalLines = original.split("\n").slice(0, 10);
    const modifiedLines = modified.split("\n").slice(0, 10);

    let preview = "=== Original ===\n";
    preview += originalLines.join("\n");
    preview += "\n\n=== Modified ===\n";
    preview += modifiedLines.join("\n");

    if (originalLines.length > 10 || modifiedLines.length > 10) {
      preview += "\n... (truncated)";
    }

    return preview;
  }

  private moveToHistory(operation: FileOperation): void {
    this.operationHistory.push(operation);
    this.operations.delete(operation.id);

    // 히스토리 크기 제한 (최근 1000개만 유지)
    if (this.operationHistory.length > 1000) {
      this.operationHistory = this.operationHistory.slice(-1000);
    }

    this.saveOperationHistory();
  }

  private async loadOperationHistory(): Promise<void> {
    try {
      const history = await invoke<FileOperation[]>("load_operation_history");
      this.operationHistory = history;
    } catch (err) {
      console.warn("Failed to load operation history:", err);
    }
  }

  private async saveOperationHistory(): Promise<void> {
    try {
      await invoke("save_operation_history", {
        history: this.operationHistory,
      });
    } catch (err) {
      console.warn("Failed to save operation history:", err);
    }
  }

  // Tauri 파일 시스템 작업 래퍼
  private async readFileContent(path: string): Promise<string> {
    return await invoke<string>("read_file", { path });
  }

  private async createFile(path: string, content: string): Promise<void> {
    await invoke("write_file", { path, content });
  }

  private async modifyFile(path: string, content: string): Promise<void> {
    await invoke("write_file", { path, content });
  }

  private async deleteFile(path: string): Promise<void> {
    await invoke("remove_file", { path });
  }

  private async moveFile(
    sourcePath: string,
    targetPath: string,
  ): Promise<void> {
    await invoke("rename_file", { oldPath: sourcePath, newPath: targetPath });
  }

  private async createDirectory(path: string): Promise<void> {
    await invoke("create_dir", { path });
  }

  private async deleteDirectory(path: string): Promise<void> {
    await invoke("remove_dir", { path });
  }

  // Public getters
  public getPendingOperations(): FileOperation[] {
    return Array.from(this.operations.values()).filter(
      (op) => op.status === "pending",
    );
  }

  public getOperationHistory(): FileOperation[] {
    return [...this.operationHistory];
  }

  public getOperation(id: string): FileOperation | undefined {
    return this.operations.get(id);
  }

  public getApprovalPolicy(): ApprovalPolicy {
    return { ...this.approvalPolicy };
  }

  public updateApprovalPolicy(policy: Partial<ApprovalPolicy>): void {
    this.approvalPolicy = { ...this.approvalPolicy, ...policy };
    this.emit("policy-updated", this.approvalPolicy);
  }

  public canRollback(): boolean {
    return this.rollbackStack.length > 0;
  }

  public getRollbackStack(): FileOperation[] {
    return [...this.rollbackStack];
  }
}

// Singleton instance
export const aiFileOperations = new AIFileOperationsService();

export default aiFileOperations;
