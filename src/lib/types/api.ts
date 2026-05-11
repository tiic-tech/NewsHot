/**
 * API Types
 *
 * API 响应类型定义，与 API_CONTRACT.md v1.2 完全一致
 */

// ============================================================
// 统一响应格式
// ============================================================

export interface ApiResponse<T> {
  data: T
  message: string
}

export interface ApiErrorResponse {
  error: string
  message: string
}

// ============================================================
// LLM 配置模块
// ============================================================

export type LLMProvider = 'openai' | 'anthropic' | 'deepseek'

export interface ValidateConfigRequest {
  provider: LLMProvider
  baseUrl: string
  apiKey: string
}

export interface ValidateConfigResponse {
  valid: boolean
  provider: LLMProvider
  baseUrl: string
  availableModels: string[]
  message: string
}

export interface SaveConfigRequest {
  provider: LLMProvider
  baseUrl: string
  apiKey: string
  model: string
}

export interface LlmConfigResponse {
  id: string
  provider: LLMProvider
  baseUrl: string
  apiKey: string
  model: string
  validatedAt: string | null
  availableModels: string[] | null
  updatedAt: string
}

export interface ModelInfo {
  id: string
  name: string
  status: 'active' | 'deprecated'
  recommended: boolean
  cost?: string
  description?: string
  deprecatedDate?: string
}

export interface ModelsResponse {
  provider: LLMProvider
  models: ModelInfo[]
}

// ============================================================
// 数据源模块
// ============================================================

export type Platform = 'x' | 'podcast' | 'blog'
export type ContentType = '争议型' | '恐虑型' | '干货型' | '故事型' | '其他'

export interface SourceListItem {
  id: string
  publishTime: string | null
  authorName: string | null
  platform: Platform | null
  title: string
  abstract: string
  coreInsights: string
  rawUrl: string
  contentType: ContentType
  importanceScore: number
}

export interface SourceDetail extends SourceListItem {
  keyEntities: string[] | null
  hashtags: string[] | null
  visualPotential: string | null
  rawTranscript: string | null
}

export interface SourcesListResponse {
  sources: SourceListItem[]
  total: number
  page: number
  pageSize: number
}

// ============================================================
// 文章模块
// ============================================================

export type OutputLanguage = 'zh' | 'en' | 'zh-en' | 'en-zh'

export interface ArticleListItem {
  id: string
  title: string
  summary: string
  publishTime: string
  language: OutputLanguage
  authorName: string | null
  platform: string | null
  rawUrl: string | null
}

export interface ArticleCluster {
  id: string
  clusterTheme: string
  coreInsight: string
}

export interface ArticleDetail extends ArticleListItem {
  content: string
  clusters: ArticleCluster[]
}

export interface ArticlesListResponse {
  articles: ArticleListItem[]
  total: number
  page: number
  pageSize: number
}

// ============================================================
// 语言切换模块
// ============================================================

export interface LanguageSwitchRequest {
  languages: OutputLanguage[]
}

export interface LanguageSwitchResponse {
  enabledLanguages: OutputLanguage[]
}

// ============================================================
// Draft 模块
// ============================================================

export type DraftStatus = 'draft' | 'approved' | 'rejected'

export interface GenerateDraftRequest {
  date: string
  forceRegenerate?: boolean
}

export interface GenerateDraftResponse {
  draftId: string
  status: DraftStatus
  totalItems: number
  newCount: number
  duplicateCount: number
  clustersCount: number
  estimatedCompletionTime: string
}

export interface ClusterItem {
  id: string
  sourceName: string
  sourceUrl: string
  viewpointSummary: string
  viewpointStance: string
}

export interface DraftCluster {
  id: string
  clusterTheme: string
  coreInsight: string
  clusterImportance: number
  viewpointConflict: string | null
  suggestedAngle: string | null
  items: ClusterItem[]
}

export interface DraftDetail {
  id: string
  date: string
  status: DraftStatus
  language: OutputLanguage
  totalItems: number
  newCount: number
  duplicateCount: number
  createdAt: string
  updatedAt: string
  approvedAt: string | null
  clusters: DraftCluster[]
}

export interface ApproveDraftRequest {
  feedback?: string
}

export interface ApproveDraftResponse {
  draftId: string
  status: 'approved'
  approvedAt: string
  pipelineTriggered: boolean
}

// ============================================================
// Tools 模块
// ============================================================

export interface ToolRequest {
  toolName: string
  params: Record<string, unknown>
}

export interface ToolResponse {
  result: Record<string, unknown>
  thinking?: string
  message: string
}

// SSE 流式响应事件类型
export interface SSEThinkingEvent {
  type: 'thinking'
  thinking: string
  timestamp: string
}

export interface SSEContentEvent {
  type: 'content'
  content: string
  timestamp: string
}

export interface SSEDoneEvent {
  type: 'done'
  message: string
  totalTokens: number
  thinkingTokens: number
}

export interface SSEErrorEvent {
  type: 'error'
  error: string
  message: string
}

export type SSEEvent = SSEThinkingEvent | SSEContentEvent | SSEDoneEvent | SSEErrorEvent

// ============================================================
// 分页参数
// ============================================================

export interface PaginationParams {
  page?: number
  pageSize?: number
}

export interface DateFilterParams {
  date?: string // 格式：YYYY-MM-DD
}