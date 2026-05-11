/**
 * Upstash Redis Client
 *
 * 用于去重、批量统计、重试队列等
 * Key 设计遵循 TECH_SPEC.md 规范
 */

import { Redis } from '@upstash/redis'

// ============================================================
// 环境变量
// ============================================================

const UPSTASH_REST_URL = process.env.UPSTASH_REST_URL!
const UPSTASH_REST_TOKEN = process.env.UPSTASH_REST_TOKEN!

// ============================================================
// Redis Client 初始化
// ============================================================

/**
 * 创建 Upstash Redis Client
 *
 * 使用 REST API，支持 Vercel Edge Runtime
 */
export function createRedisClient(): Redis {
  return new Redis({
    url: UPSTASH_REST_URL,
    token: UPSTASH_REST_TOKEN
  })
}

// 单例 Client
let _redisClient: Redis | null = null

/**
 * 获取 Redis Client 单例
 */
export function getRedisClient(): Redis {
  if (!_redisClient) {
    _redisClient = createRedisClient()
  }
  return _redisClient
}

// ============================================================
// Key 设计规范
// ============================================================

/**
 * Redis Key 前缀设计
 *
 * news:dedupe:{hash} - 去重 hash（48小时 TTL）
 * news:url:{url_hash} - URL 映射（48小时 TTL）
 * news:batch:{date} - 批量统计（24小时 TTL）
 * news:retry:{date} - 重试队列（24小时 TTL）
 */
export const REDIS_KEY_PREFIX = 'news'

// TTL 设置（秒）
export const TTL_DEDUPE = 48 * 60 * 60  // 48小时
export const TTL_BATCH = 24 * 60 * 60   // 24小时
export const TTL_RETRY = 24 * 60 * 60   // 24小时

/**
 * 去重 Key 格式：news:dedupe:{hash}
 */
export function getDedupeKey(hash: string): string {
  return `${REDIS_KEY_PREFIX}:dedupe:${hash}`
}

/**
 * URL 映射 Key 格式：news:url:{url_hash}
 */
export function getUrlKey(urlHash: string): string {
  return `${REDIS_KEY_PREFIX}:url:${urlHash}`
}

/**
 * 批量统计 Key 格式：news:batch:{date}
 */
export function getBatchKey(date: string): string {
  return `${REDIS_KEY_PREFIX}:batch:${date}`
}

/**
 * 重试队列 Key 格式：news:retry:{date}
 */
export function getRetryKey(date: string): string {
  return `${REDIS_KEY_PREFIX}:retry:${date}`
}

// ============================================================
// 去重 Hash 计算
// ============================================================

import crypto from 'crypto'

/**
 * 计算去重 Hash（SHA256）
 *
 * @param title 新闻标题
 * @param url 来源 URL
 * @returns SHA256 hash（hex string）
 */
export function computeDedupeHash(title: string, url: string): string {
  const content = `${title}|${url}`
  return crypto.createHash('sha256').update(content).digest('hex')
}

/**
 * 计算 URL Hash（SHA256）
 *
 * @param url 来源 URL
 * @returns SHA256 hash（hex string）
 */
export function computeUrlHash(url: string): string {
  return crypto.createHash('sha256').update(url).digest('hex')
}

// ============================================================
// 去重操作
// ============================================================

/**
 * 检查是否已存在（去重）
 *
 * @param redis Redis Client
 * @param hash 去重 hash
 * @returns true 表示已存在（重复），false 表示新条目
 */
export async function isDuplicate(redis: Redis, hash: string): Promise<boolean> {
  const key = getDedupeKey(hash)
  const exists = await redis.exists(key)
  return exists === 1
}

/**
 * 标记为已存在（写入去重 Key）
 *
 * @param redis Redis Client
 * @param hash 去重 hash
 * @param ttl TTL（秒），默认 48小时
 */
export async function markAsDuplicate(
  redis: Redis,
  hash: string,
  ttl: number = TTL_DEDUPE
): Promise<void> {
  const key = getDedupeKey(hash)
  await redis.setex(key, ttl, '1')
}

/**
 * 批量去重检查
 *
 * @param redis Redis Client
 * @param hashes 去重 hash 数组
 * @returns Map<hash, isDuplicate>
 */
export async function batchCheckDuplicates(
  redis: Redis,
  hashes: string[]
): Promise<Map<string, boolean>> {
  const keys = hashes.map(h => getDedupeKey(h))
  const results = await redis.mexists(...keys)

  const map = new Map<string, boolean>()
  for (let i = 0; i < hashes.length; i++) {
    map.set(hashes[i], results[i] === 1)
  }
  return map
}

/**
 * 批量标记为已存在
 *
 * @param redis Redis Client
 * @param hashes 去重 hash 数组
 * @param ttl TTL（秒），默认 48小时
 */
export async function batchMarkAsDuplicate(
  redis: Redis,
  hashes: string[],
  ttl: number = TTL_DEDUPE
): Promise<void> {
  const pipeline = redis.pipeline()
  for (const hash of hashes) {
    const key = getDedupeKey(hash)
    pipeline.setex(key, ttl, '1')
  }
  await pipeline.exec()
}

// ============================================================
// URL 映射操作
// ============================================================

/**
 * 存储 URL 映射（用于快速查找 news_item）
 *
 * @param redis Redis Client
 * @param urlHash URL hash
 * @param itemId news_item UUID
 * @param ttl TTL（秒），默认 48小时
 */
export async function setUrlMapping(
  redis: Redis,
  urlHash: string,
  itemId: string,
  ttl: number = TTL_DEDUPE
): Promise<void> {
  const key = getUrlKey(urlHash)
  await redis.setex(key, ttl, itemId)
}

/**
 * 获取 URL 映射的 news_item ID
 *
 * @param redis Redis Client
 * @param urlHash URL hash
 * @returns news_item UUID 或 null
 */
export async function getUrlMapping(
  redis: Redis,
  urlHash: string
): Promise<string | null> {
  const key = getUrlKey(urlHash)
  return await redis.get<string>(key)
}

// ============================================================
// 批量统计操作
// ============================================================

interface BatchStats {
  totalItems: number
  newCount: number
  duplicateCount: number
  clustersCount: number
  startTime: number
}

/**
 * 获取批量统计
 *
 * @param redis Redis Client
 * @param date 日期（YYYY-MM-DD）
 * @returns BatchStats 或 null
 */
export async function getBatchStats(
  redis: Redis,
  date: string
): Promise<BatchStats | null> {
  const key = getBatchKey(date)
  const data = await redis.get<string>(key)
  if (!data) return null
  try {
    return JSON.parse(data) as BatchStats
  } catch {
    return null
  }
}

/**
 * 设置批量统计
 *
 * @param redis Redis Client
 * @param date 日期（YYYY-MM-DD）
 * @param stats 批量统计数据
 * @param ttl TTL（秒），默认 24小时
 */
export async function setBatchStats(
  redis: Redis,
  date: string,
  stats: BatchStats,
  ttl: number = TTL_BATCH
): Promise<void> {
  const key = getBatchKey(date)
  await redis.setex(key, ttl, JSON.stringify(stats))
}

/**
 * 增加批量统计字段
 *
 * @param redis Redis Client
 * @param date 日期（YYYY-MM-DD）
 * @param field 字段名
 * @param increment 增量（默认 1）
 */
export async function incrementBatchStats(
  redis: Redis,
  date: string,
  field: keyof BatchStats,
  increment: number = 1
): Promise<void> {
  const stats = await getBatchStats(redis, date)
  if (!stats) {
    // 初始化统计
    const newStats: BatchStats = {
      totalItems: 0,
      newCount: 0,
      duplicateCount: 0,
      clustersCount: 0,
      startTime: Date.now()
    }
    newStats[field] = (newStats[field] as number) + increment
    await setBatchStats(redis, date, newStats)
  } else {
    stats[field] = (stats[field] as number) + increment
    await setBatchStats(redis, date, stats)
  }
}

// ============================================================
// 重试队列操作
// ============================================================

interface RetryItem {
  itemData: unknown
  reason: string
  timestamp: number
  retryCount: number
}

/**
 * 添加到重试队列
 *
 * @param redis Redis Client
 * @param date 日期（YYYY-MM-DD）
 * @param item 重试条目
 */
export async function addToRetryQueue(
  redis: Redis,
  date: string,
  item: RetryItem
): Promise<void> {
  const key = getRetryKey(date)
  await redis.rpush(key, JSON.stringify(item))
  // 设置 TTL
  await redis.expire(key, TTL_RETRY)
}

/**
 * 获取重试队列
 *
 * @param redis Redis Client
 * @param date 日期（YYYY-MM-DD）
 * @returns RetryItem 数组
 */
export async function getRetryQueue(
  redis: Redis,
  date: string
): Promise<RetryItem[]> {
  const key = getRetryKey(date)
  const items = await redis.lrange<string>(key, 0, -1)
  return items.map(item => {
    try {
      return JSON.parse(item) as RetryItem
    } catch {
      return { itemData: null, reason: 'parse_error', timestamp: 0, retryCount: 0 }
    }
  })
}

/**
 * 清空重试队列
 *
 * @param redis Redis Client
 * @param date 日期（YYYY-MM-DD）
 */
export async function clearRetryQueue(
  redis: Redis,
  date: string
): Promise<void> {
  const key = getRetryKey(date)
  await redis.del(key)
}

// ============================================================
// 清理操作（Cron Jobs）
// ============================================================

/**
 * 清理过期的 Redis Key
 *
 * 扫描匹配模式的 Key，删除超过指定 TTL 的 Key
 *
 * @param redis Redis Client
 * @param pattern Key 模式（如 news:*）
 * @param maxAge 最大年龄（秒）
 * @returns 清理的 Key 数量
 */
export async function cleanupExpiredKeys(
  redis: Redis,
  pattern: string,
  maxAge: number
): Promise<number> {
  const now = Date.now()
  const cutoffTime = now - maxAge * 1000

  let cleanedCount = 0
  let cursor = '0'

  do {
    const result = await redis.scan(cursor, { match: pattern, count: 100 })
    cursor = result[0]
    const keys = result[1]

    for (const key of keys) {
      // 检查 TTL，如果 TTL < maxAge 且 > 0，则可能已过期
      const ttl = await redis.ttl(key)
      if (ttl === -1) {
        // Key 无 TTL，手动检查创建时间
        // 注意：Upstash Redis 不支持 OBJECT IDLETIME，使用简单删除策略
        await redis.del(key)
        cleanedCount++
      } else if (ttl === -2) {
        // Key 已不存在，计入清理
        cleanedCount++
      }
    }
  } while (cursor !== '0')

  return cleanedCount
}

/**
 * 清理指定日期之前的批量数据
 *
 * @param redis Redis Client
 * @param beforeDate 日期阈值（YYYY-MM-DD）
 * @returns 清理的 Key 数量
 */
export async function cleanupBeforeDate(
  redis: Redis,
  beforeDate: string
): Promise<number> {
  const patterns = [
    `${REDIS_KEY_PREFIX}:batch:*`,
    `${REDIS_KEY_PREFIX}:retry:*`
  ]

  let totalCleaned = 0
  for (const pattern of patterns) {
    let cursor = '0'
    do {
      const result = await redis.scan(cursor, { match: pattern, count: 100 })
      cursor = result[0]
      const keys = result[1]

      for (const key of keys) {
        // 从 key 中提取日期
        const parts = key.split(':')
        const date = parts[parts.length - 1]
        if (date < beforeDate) {
          await redis.del(key)
          totalCleaned++
        }
      }
    } while (cursor !== '0')
  }

  return totalCleaned
}