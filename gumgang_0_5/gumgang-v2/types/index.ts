// Global type definitions for Gumgang 2.0

// User and Session Types
export interface User {
  id: string
  name?: string
  avatar?: string
  preferences?: UserPreferences
  createdAt: string
  lastActiveAt: string
}

export interface UserPreferences {
  theme?: 'light' | 'dark' | 'auto'
  language?: string
  memoryLevel?: number
  autoApproveChanges?: boolean
}

export interface Session {
  id: string
  userId: string
  startedAt: string
  lastActivityAt: string
  messageCount: number
  memoryContext?: string[]
}

// Message and Chat Types
export interface Message {
  id: string
  sessionId: string
  role: 'user' | 'assistant' | 'system' | 'error'
  content: string
  timestamp: string
  metadata?: MessageMetadata
  attachments?: Attachment[]
}

export interface MessageMetadata {
  processingTime?: number
  memoryUsed?: boolean
  memoryType?: 'temporal' | 'episodic' | 'semantic' | 'procedural' | 'meta'
  confidence?: number
  reasoning?: string[]
  sources?: string[]
}

export interface Attachment {
  id: string
  type: 'code' | 'image' | 'file' | 'link'
  name: string
  content?: string
  url?: string
  size?: number
}

// Memory System Types
export interface Memory {
  id: string
  content: string
  level: 1 | 2 | 3 | 4 | 5
  type: MemoryType
  timestamp: string
  lastAccessed?: string
  accessCount: number
  importance: number
  embedding?: number[]
  metadata?: MemoryMetadata
  relationships?: MemoryRelation[]
}

export type MemoryType =
  | 'temporal'    // Level 1: 임시 기억
  | 'episodic'    // Level 2: 에피소드 기억
  | 'semantic'    // Level 3: 의미 기억
  | 'procedural'  // Level 4: 절차 기억
  | 'meta'        // Level 5: 메타인지

export interface MemoryMetadata {
  source?: string
  context?: string
  tags?: string[]
  userId?: string
  sessionId?: string
  confidence?: number
  decayRate?: number
}

export interface MemoryRelation {
  targetId: string
  type: 'related' | 'similar' | 'opposite' | 'parent' | 'child'
  strength: number
}

export interface MemoryCluster {
  id: string
  name: string
  memories: Memory[]
  centroid?: number[]
  coherence: number
  createdAt: string
  updatedAt: string
}

// Evolution and Self-Modification Types
export interface EvolutionEvent {
  id: string
  type: EvolutionEventType
  description: string
  timestamp: string
  status: 'pending' | 'approved' | 'rejected' | 'applied'
  diff?: CodeDiff
  impact?: ImpactAnalysis
  approvedBy?: string
  appliedAt?: string
}

export type EvolutionEventType =
  | 'code_modification'
  | 'self_improvement'
  | 'learning_update'
  | 'behavior_change'
  | 'memory_restructure'

export interface CodeDiff {
  file: string
  language: string
  before: string
  after: string
  additions: number
  deletions: number
  hunks: DiffHunk[]
}

export interface DiffHunk {
  oldStart: number
  oldLines: number
  newStart: number
  newLines: number
  content: string
}

export interface ImpactAnalysis {
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
  affectedComponents: string[]
  estimatedDowntime?: number
  rollbackPlan?: string
  testCoverage?: number
}

// Editor Types
export interface EditorState {
  content: string
  language: string
  theme: string
  readOnly: boolean
  markers?: EditorMarker[]
  decorations?: EditorDecoration[]
  selection?: EditorSelection
}

export interface EditorMarker {
  severity: 'error' | 'warning' | 'info' | 'hint'
  message: string
  startLine: number
  startColumn: number
  endLine: number
  endColumn: number
}

export interface EditorDecoration {
  range: EditorRange
  options: {
    className?: string
    hoverMessage?: string
    isWholeLine?: boolean
  }
}

export interface EditorSelection {
  startLine: number
  startColumn: number
  endLine: number
  endColumn: number
}

export interface EditorRange {
  startLine: number
  startColumn: number
  endLine: number
  endColumn: number
}

// UI State Types
export interface AppState {
  user?: User
  session?: Session
  theme: 'light' | 'dark' | 'auto'
  sidebarCollapsed: boolean
  activeView: AppView
  notifications: Notification[]
  isOnline: boolean
  backendStatus: BackendStatus
}

export type AppView =
  | 'chat'
  | 'memory'
  | 'evolution'
  | 'settings'
  | 'dashboard'

export interface Notification {
  id: string
  type: 'info' | 'success' | 'warning' | 'error'
  title: string
  message?: string
  timestamp: string
  read: boolean
  actionLabel?: string
  actionUrl?: string
}

export interface BackendStatus {
  connected: boolean
  version?: string
  memorySystem?: string
  lastPing?: string
  latency?: number
}

// Visualization Types
export interface MemoryNode {
  id: string
  label: string
  level: number
  type: MemoryType
  x?: number
  y?: number
  z?: number
  size?: number
  color?: string
  connections?: string[]
}

export interface MemoryEdge {
  source: string
  target: string
  weight: number
  type: 'related' | 'similar' | 'temporal' | 'causal'
}

export interface MemoryGraph {
  nodes: MemoryNode[]
  edges: MemoryEdge[]
  layout?: 'force' | 'hierarchy' | 'circular' | '3d'
}

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: ApiError
  metadata?: ResponseMetadata
}

export interface ApiError {
  code: string
  message: string
  details?: any
  timestamp: string
}

export interface ResponseMetadata {
  requestId: string
  timestamp: string
  processingTime: number
  version: string
}

// Pagination Types
export interface PaginationParams {
  page: number
  limit: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
  hasNext: boolean
  hasPrevious: boolean
}

// Filter Types
export interface MemoryFilter {
  levels?: number[]
  types?: MemoryType[]
  startDate?: string
  endDate?: string
  search?: string
  tags?: string[]
  minImportance?: number
  userId?: string
}

export interface MessageFilter {
  sessionId?: string
  roles?: Message['role'][]
  startDate?: string
  endDate?: string
  search?: string
  hasAttachments?: boolean
}

// Settings Types
export interface Settings {
  general: GeneralSettings
  memory: MemorySettings
  evolution: EvolutionSettings
  ui: UISettings
}

export interface GeneralSettings {
  language: string
  timezone: string
  autoSave: boolean
  autoSaveInterval: number
}

export interface MemorySettings {
  defaultLevel: number
  retentionDays: number
  autoCluster: boolean
  clusterThreshold: number
  decayEnabled: boolean
  decayRate: number
}

export interface EvolutionSettings {
  autoApprove: boolean
  approvalThreshold: number
  maxRiskLevel: 'low' | 'medium' | 'high' | 'critical'
  requireTests: boolean
  rollbackEnabled: boolean
}

export interface UISettings {
  theme: 'light' | 'dark' | 'auto'
  fontSize: number
  fontFamily: string
  compactMode: boolean
  animations: boolean
  soundEffects: boolean
}

// Utility Types
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P]
}

export type Nullable<T> = T | null

export type Optional<T> = T | undefined

export type AsyncState<T> = {
  data?: T
  loading: boolean
  error?: Error
}

export type ValueOf<T> = T[keyof T]

export type Entries<T> = {
  [K in keyof T]: [K, T[K]]
}[keyof T][]
