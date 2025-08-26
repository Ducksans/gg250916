/** TEMP stubs for build pass — replace with real defs */
declare interface SystemStats { cpuPct: number; memMb: number; gpuUtilPct?: number; tokens?: { in: number; out: number }; }
declare interface MemoryStatus { tier: 'ultra-short'|'short'|'mid'|'long'|'ultra-long'; size?: number; updatedAt?: string; }
declare interface Task { id: string; title: string; status: 'todo'|'doing'|'done'; priority?: 'low'|'med'|'high'; createdAt?: string; updatedAt?: string; }
