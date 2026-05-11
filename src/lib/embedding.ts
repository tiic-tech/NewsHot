/**
 * 阿里云百炼 Embedding Service
 *
 * 使用 text-embedding-v4 API
 * 支持 batch_size=25 批量处理
 * 支持 exponential_backoff 重试（最多3次）
 * 返回 1024 维向量
 */

import { withRetry, RetryConfig } from './utils/retry'

// ============================================================
// 环境变量
// ============================================================

const BAILIAN_API_KEY = process.env.BAILIAN_API_KEY!
const BAILIAN_ENDPOINT = process.env.BAILIAN_ENDPOINT ||
  'https://dashscope.aliyuncs.com/api/v1/services/embeddings/text-embedding/text-embedding-v4'

// ============================================================
// 常量配置
// ============================================================

/**
 * Batch Size：单次请求最大文本数
 * 阿里云百炼 API 限制为 25
 */
export const BATCH_SIZE = 25

/**
 * 向量维度：1024
 */
export const VECTOR_DIMENSION = 1024

/**
 * Embedding API 超时（毫秒）
 */
export const EMBEDDING_TIMEOUT_MS = 10000

/**
 * Embedding 重试配置
 */
export const EMBEDDING_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  intervals: [5000, 15000, 30000], // 5s, 15s, 30s
  retryableErrors: [
    'network_timeout',
    'rate_limit',
    'temporary_unavailable',
    'ssl_error'
  ]
}

// ============================================================
// 类型定义
// ============================================================

export interface EmbeddingRequest {
  texts: string[]
  model?: string
}

export interface EmbeddingResponse {
  embeddings: number[][]  // 1024维向量数组
  model: string
  usage: {
    totalTokens: number
  }
}

export interface EmbeddingError {
  code: string
  message: string
}

// ============================================================
// Embedding API 调用
// ============================================================

/**
 * 调用阿里云百炼 Embedding API
 *
 * @param texts 文本数组（最多 25 条）
 * @returns EmbeddingResponse
 */
async function callEmbeddingAPI(texts: string[]): Promise<EmbeddingResponse> {
  if (texts.length > BATCH_SIZE) {
    throw new Error(`Batch size exceeds limit: ${texts.length} > ${BATCH_SIZE}`)
  }

  if (texts.length === 0) {
    return {
      embeddings: [],
      model: 'text-embedding-v4',
      usage: { totalTokens: 0 }
    }
  }

  const response = await fetch(BAILIAN_ENDPOINT, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${BAILIAN_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'text-embedding-v4',
      input: {
        texts
      },
      parameters: {
        text_type: 'document'  // 文档类型，适合新闻摘要
      }
    }),
    signal: AbortSignal.timeout(EMBEDDING_TIMEOUT_MS)
  })

  if (!response.ok) {
    const errorText = await response.text()
    const error: EmbeddingError = {
      code: 'api_error',
      message: `Embedding API error: ${response.status} - ${errorText}`
    }

    // 判断是否可重试
    if (response.status === 429) {
      error.code = 'rate_limit'
    } else if (response.status >= 500) {
      error.code = 'temporary_unavailable'
    }

    throw new Error(`${error.code}: ${error.message}`)
  }

  const data = await response.json()

  // 解析阿里云百炼响应格式
  // 格式：{ output: { embeddings: [...], model: "..." }, usage: { total_tokens: ... } }
  const embeddings = data.output?.embeddings || []
  const model = data.output?.model || 'text-embedding-v4'
  const totalTokens = data.usage?.total_tokens || 0

  // 提取向量数据（阿里云返回格式：{ text_index: number, embedding: number[] }）
  const vectors = embeddings.map((item: { embedding: number[] }) => item.embedding)

  return {
    embeddings: vectors,
    model,
    usage: { totalTokens }
  }
}

// ============================================================
// 批量 Embedding 生成
// ============================================================

/**
 * 批量生成 Embedding（带重试）
 *
 * @param texts 文本数组
 * @returns Embedding 数组（1024维向量）
 */
export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) {
    return []
  }

  // 分批处理（每批最多 25 条）
  const batches: string[][] = []
  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    batches.push(texts.slice(i, i + BATCH_SIZE))
  }

  // 逐批调用（避免 API 限流）
  const allEmbeddings: number[][] = []

  for (const batch of batches) {
    const embeddings = await withRetry(
      () => callEmbeddingAPI(batch),
      EMBEDDING_RETRY_CONFIG
    )
    allEmbeddings.push(...embeddings.embeddings)
  }

  return allEmbeddings
}

/**
 * 生成单个文本的 Embedding
 *
 * @param text 文本内容
 * @returns 1024维向量
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const response = await withRetry(
    () => callEmbeddingAPI([text]),
    EMBEDDING_RETRY_CONFIG
  )
  return response.embeddings[0] || []
}

// ============================================================
// Embedding 存储到 Supabase
// ============================================================

import { getSupabaseClientService } from './supabase'
import { NewsItem } from './types/db'

/**
 * 为 News Items 生成 Embedding 并存储
 *
 * @param items News Item 数组
 * @param projectId 项目 ID
 * @returns 更新后的 News Item 数组
 */
export async function generateAndStoreEmbeddings(
  items: NewsItem[],
  projectId: string
): Promise<NewsItem[]> {
  if (items.length === 0) {
    return items
  }

  // 生成文本：title + summary
  const texts = items.map(item => `${item.title}\n${item.summary}`)

  // 批量生成 Embedding
  const embeddings = await generateEmbeddings(texts)

  // 更新 Supabase
  const supabase = getSupabaseClientService()

  const updatePromises = items.map((item, index) => {
    const embedding = embeddings[index]
    if (!embedding || embedding.length === 0) {
      return Promise.resolve(null)
    }

    // 将向量数组转换为 PostgreSQL vector 格式字符串
    const embeddingStr = `[${embedding.join(',')}]`

    return supabase
      .from('news_items')
      .update({
        embedding: embeddingStr,
        embedding_source: 'bailian_api'
      })
      .eq('id', item.id)
      .eq('project_id', projectId)
  })

  await Promise.all(updatePromises)

  // 返回更新后的 items
  return items.map((item, index) => ({
    ...item,
    embedding: embeddings[index] ? `[${embeddings[index].join(',')}]` : null,
    embedding_source: 'bailian_api'
  }))
}

// ============================================================
// 向量计算工具
// ============================================================

/**
 * 计算余弦相似度
 *
 * @param a 向量 A
 * @param b 向量 B
 * @returns 相似度（0-1）
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('Vector dimensions must match')
  }

  let dotProduct = 0
  let normA = 0
  let normB = 0

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }

  normA = Math.sqrt(normA)
  normB = Math.sqrt(normB)

  if (normA === 0 || normB === 0) {
    return 0
  }

  return dotProduct / (normA * normB)
}

/**
 * 解析 Supabase vector 字符串
 *
 * @param vectorStr PostgreSQL vector 字符串（如 "[0.1,0.2,...]"）
 * @returns number[] 数组
 */
export function parseVectorString(vectorStr: string | null): number[] | null {
  if (!vectorStr) return null

  try {
    // Supabase 返回 vector 字段为字符串格式
    // 格式：[0.1,0.2,...] 或直接逗号分隔
    const cleaned = vectorStr.replace(/^\[/, '').replace(/\]$/, '')
    return cleaned.split(',').map(parseFloat)
  } catch {
    return null
  }
}

// ============================================================
// Embedding 健康检查
// ============================================================

/**
 * 检查 Embedding API 是否可用
 *
 * @returns true 表示可用
 */
export async function checkEmbeddingHealth(): Promise<boolean> {
  if (!BAILIAN_API_KEY) {
    return false
  }

  try {
    const response = await callEmbeddingAPI(['test'])
    return response.embeddings.length > 0
  } catch (error) {
    console.error('[embedding] Health check failed:', error)
    return false
  }
}