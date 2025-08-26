export type ID = string & { readonly brand: "ID" };
export type ApiResult<T> = { ok: true; data: T } | { ok: false; error: string; code?: string };
export interface Telemetry { at: string; source: "ui" | "agent" | "system"; }
export interface CanonHeader { "X-Rules-Id": string; "X-Rules-Hash": string; }
