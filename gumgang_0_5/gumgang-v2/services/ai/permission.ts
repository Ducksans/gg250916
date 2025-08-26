import type { CanonHeader } from "../../types/core";
export interface AIPermissionQuery {
  fileId: string;
  action: "read" | "write" | "exec";
  context?: { user: string; reason?: string };
  canon?: CanonHeader;
}
export interface AIPermissionDecision {
  allowed: boolean;
  rationale: string;
  policyRef: string;
}
export type AIPermissionService = (q: AIPermissionQuery) => Promise<AIPermissionDecision>;
