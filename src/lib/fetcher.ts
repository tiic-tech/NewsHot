/**
 * Fetcher Service（Feed 抓取）
 *
 * 从 follow-builders feed URL 抓取新闻数据
 * 使用 Upstash 去重
 * 增量统计
 * 重试策略
 */

import { getRedisClient, computeDedupeHash, batchCheckDuplicates, batchMarkAsDuplicate, setUrlMapping, computeUrlHash, incrementBatchStats } from './redis'
import { generateEmbeddings, VECTOR_DIMENSION } from './embedding'
import { getSupabaseClientService, getCurrentProjectId } from './supabase'
import { withRetry, RetryConfig } from './utils/retry'
import { NewsItemInsert } from './types/db'

// ============================================================
// 环境变量
// ============================================================

const FEED_X_URL = process.env.FEED_X_URL
const FEED_PODCASTS_URL = process.env.FEED_PODCASTS_URL
const FEED_BLOGS_URL = process.env.FEED_BLOGS_URL

// ============================================================
// 常量配置
// ============================================================

/**
 * Feed 抓取超时（毫秒）
 */
export const FETCH_TIMEOUT_MS = 30000

/**
 * Feed 抓取重试配置
 */
export const FETCH_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  intervals: [5000, 15000, 30000],
  retryableErrors: [
    'network_timeout',
    'temporary_unavailable',
    'ssl_error'
  ]
}

// ============================================================
// 类型定义
// ============================================================

export type SourceType = 'x' | 'podcast' | 'blog'

export interface FeedItem {
  title: string
  originalTitle?: string
  summary: string
  contentType?: string  // 争议型/恐虑型/干货型/故事型/其他
  emotionScore?: string // 高唤醒/低唤醒
  sourceType: SourceType
  sourceName: string
  sourceUrl: string
  importanceScore?: number
  keyEntities?: string[]
  hashtags?: string[]
  visualPotential?: string  // 高/中/低
  rawTranscript?: string
  publishTime?: string
  authorName?: string
  platform?: string
}

export interface FetchResult {
  totalItems: number
  newItems: number
  duplicateItems: number
  items: FeedItem[]
  sourceType: SourceType
  fetchTimeMs: number
}

export interface BatchFetchResult {
  totalItems: number
  newItems: number
  duplicateItems: number
  results: FetchResult[]
  totalTimeMs: number
}

// ============================================================
// Feed 抓取
// ============================================================

/**
 * 抓取单个 Feed
 *
 * @param url Feed URL
 * @param sourceType 来源类型
 * @returns Feed Item 数组
 */
async function fetchFeed(url: string, sourceType: SourceType): Promise<FeedItem[]> {
  if (!url) {
    console.warn(`[fetcher] Feed URL not configured for ${sourceType}`)
    return []
  }

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Accept': 'application/json'
    },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS)
  })

  if (!response.ok) {
    throw new Error(`Feed fetch error: ${response.status}`)
  }

  const data = await response.json()

  // 解析 Feed 数据格式（假设为 JSON 数组）
  const items: FeedItem[] = (data.items || data || []).map((item: Record<string, unknown>) => ({
    title: item.title as string || '',
    originalTitle: item.original_title as string || item.title as string || '',
    summary: item.summary as string || item.abstract as string || '',
    contentType: item.content_type as string || '其他',
    emotionScore: item.emotion_score as string || undefined,
    sourceType,
    sourceName: item.source_name as string || sourceType,
    sourceUrl: item.source_url as string || item.url as string || '',
    importanceScore: (item.importance_score as number) || 5,
    keyEntities: (item.key_entities as string[]) || [],
    hashtags: (item.hashtags as string[]) || [],
    visualPotential: item.visual_potential as string || '中',
    rawTranscript: item.raw_transcript as string || undefined,
    publishTime: item.publish_time as string || undefined,
    authorName: item.author_name as string || undefined,
    platform: item.platform as string || sourceType
  }))

  return items
}

/**
 * 抓取单个 Feed（带重试）
 *
 * @param url Feed URL
 * @param sourceType 来源类型
 * @returns FetchResult
 */
export async function fetchFeedWithRetry(
  url: string,
  sourceType: SourceType
): Promise<FetchResult> {
  const startTime = Date.now()

  try {
    const items = await withRetry(
      () => fetchFeed(url, sourceType),
      FETCH_RETRY_CONFIG
    )

    return {
      totalItems: items.length,
      newItems: items.length, // 后续去重会更新
      duplicateItems: 0,
      items,
      sourceType,
      fetchTimeMs: Date.now() - startTime
    }
  } catch (error) {
    console.error(`[fetcher] Failed to fetch ${sourceType} feed:`, error)
    return {
      totalItems: 0,
      newItems: 0,
      duplicateItems: 0,
      items: [],
      sourceType,
      fetchTimeMs: Date.now() - startTime
    }
  }
}

/**
 * 抓取所有 Feed（并行）
 *
 * @returns BatchFetchResult
 */
export async function fetchAllFeeds(): Promise<BatchFetchResult> {
  const startTime = Date.now()

  // 并行抓取
  const results = await Promise.all([
    fetchFeedWithRetry(FEED_X_URL || '', 'x'),
    fetchFeedWithRetry(FEED_PODCASTS_URL || '', 'podcast'),
    fetchFeedWithRetry(FEED_BLOGS_URL || '', 'blog')
  ])

  // 合并统计
  const totalItems = results.reduce((sum, r) => sum + r.totalItems, 0)

  return {
    totalItems,
    newItems: totalItems, // 后续去重会更新
    duplicateItems: 0,
    results,
    totalTimeMs: Date.now() - startTime
  }
}

// ============================================================
// 去重处理
// ============================================================

/**
 * 去重处理 Feed Items
 *
 * @param items Feed Item 数组
 * @param date 日期（YYYY-MM-DD）
 * @returns 去重后的 Feed Item 数组
 */
export async function deduplicateFeedItems(
  items: FeedItem[],
  date: string
): Promise<{ newItems: FeedItem[]; duplicates: FeedItem[] }> {
  if (items.length === 0) {
    return { newItems: [], duplicates: [] }
  }

  const redis = getRedisClient()

  // 计算所有去重 Hash
  const hashes = items.map(item => computeDedupeHash(item.title, item.sourceUrl))

  // 批量检查重复
  const duplicateMap = await batchCheckDuplicates(redis, hashes)

  // 分离新条目和重复条目
  const newItems: FeedItem[] = []
  const duplicates: FeedItem[] = []

  for (let i = 0; i < items.length; i++) {
    const item = items[i]
    const hash = hashes[i]

    if (duplicateMap.get(hash)) {
      duplicates.push(item)
    } else {
      newItems.push(item)
    }
  }

  // 标记新条目为已存在（写入 Redis）
  if (newItems.length > 0) {
    const newHashes = newItems.map(item => computeDedupeHash(item.title, item.sourceUrl))
    await batchMarkAsDuplicate(redis, newHashes)

    // 更新统计
    await incrementBatchStats(redis, date, 'newCount', newItems.length)
    await incrementBatchStats(redis, date, 'totalItems', items.length)
    await incrementBatchStats(redis, date, 'duplicateCount', duplicates.length)
  }

  return { newItems, duplicates }
}

// ============================================================
// Feed Item 转换为 NewsItemInsert
// ============================================================

/**
 * 转换 FeedItem 为 NewsItemInsert
 *
 * @param item Feed Item
 * @param projectId 项目 ID
 * @param date 日期
 * @returns NewsItemInsert
 */
export function feedItemToNewsItemInsert(
  item: FeedItem,
  projectId: string,
  date: string
): NewsItemInsert {
  return {
    project_id: projectId,
    date,
    title: item.title,
    original_title: item.originalTitle || item.title,
    summary: item.summary,
    content_type: item.contentType || '其他',
    emotion_score: item.emotionScore || null,
    source_type: item.sourceType,
    source_name: item.sourceName,
    source_url: item.sourceUrl,
    importance_score: item.importanceScore || 5,
    key_entities: item.keyEntities || null,
    hashtags: item.hashtags || null,
    visual_potential: item.visualPotential || null,
    raw_transcript: item.rawTranscript || null,
    publish_time: item.publishTime || null,
    author_name: item.authorName || null,
    platform: item.platform || item.sourceType,
    embedding: null,
    embedding_source: null
  }
}

// ============================================================
// 存储到 Supabase
// ============================================================

/**
 * 存储 Feed Items 到 Supabase
 *
 * @param items Feed Item 数组
 * @param date 日期
 * @returns 存储成功的 News Item 数组（含 ID）
 */
export async function storeFeedItems(
  items: FeedItem[],
  date: string
): Promise<NewsItemInsert[]> {
  if (items.length === 0) {
    return []
  }

  // 获取项目 ID
  const supabase = getSupabaseClientService()
  const projectId = await getCurrentProjectId(supabase)

  if (!projectId) {
    throw new Error('Project ID not found')
  }

  // 转换为 NewsItemInsert
  const newsItemInserts = items.map(item =>
    feedItemToNewsItemInsert(item, projectId, date)
  )

  // 批量插入
  const { data, error } = await supabase
    .from('news_items')
    .insert(newsItemInserts)
    .select('id, title, source_url')

  if (error) {
    console.error('[fetcher] Failed to store feed items:', error)
    throw error
  }

  // 存储 URL 映射到 Redis
  const redis = getRedisClient()
  for (const storedItem of data || []) {
    const urlHash = computeUrlHash(storedItem.source_url)
    await setUrlMapping(redis, urlHash, storedItem.id)
  }

  return newsItemInserts
}

// ============================================================
// 完整抓取流水线
// ============================================================

/**
 * 完整抓取流水线
 *
 * 1. 抓取 Feed
 * 2. 去重处理
 * 3. 生成 Embedding
 * 4. 存储到 Supabase
 *
 * @param date 日期（YYYY-MM-DD）
 * @returns 流水线结果
 */
export async function runFetchPipeline(date: string): Promise<{
  totalItems: number
  newItems: number
  duplicateItems: number
  storedItems: number
  totalTimeMs: number
}> {
  const startTime = Date.now()

  console.log(`[fetcher] Starting fetch pipeline for ${date}`)

  // 1. 抓取所有 Feed
  const fetchResult = await fetchAllFeeds()
  const allItems = fetchResult.results.flatMap(r => r.items)

  console.log(`[fetcher] Fetched ${allItems.length} items`)

  // 2. 去重处理
  const { newItems, duplicates } = await deduplicateFeedItems(allItems, date)

  console.log(`[fetcher] Deduplicated: ${newItems.length} new, ${duplicates.length} duplicates`)

  // 3. 存储到 Supabase（不含 Embedding）
  const storedItems = await storeFeedItems(newItems, date)

  console.log(`[fetcher] Stored ${storedItems.length} items`)

  // 4. 生成 Embedding（异步，不阻塞返回）
  // 注意：Embedding 生成耗时较长，建议在后续阶段处理
  // 此处仅记录需要生成 Embedding 的数量

  const totalTimeMs = Date.now() - startTime

  return {
    totalItems: allItems.length,
    newItems: newItems.length,
    duplicateItems: duplicates.length,
    storedItems: storedItems.length,
    totalTimeMs
  }
}

// ============================================================
// Fetcher 健康检查
// ============================================================

/**
 * 检查 Feed URL 是否配置
 *
 * @returns 配置状态
 */
export function checkFeedConfig(): {
  x: boolean
  podcasts: boolean
  blogs: boolean
} {
  return {
    x: Boolean(FEED_X_URL),
    podcasts: Boolean(FEED_PODCASTS_URL),
    blogs: Boolean(FEED_BLOGS_URL)
  }
}