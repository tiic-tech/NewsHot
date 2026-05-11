/**
 * 重试策略工具
 *
 * 支持指数退避重试
 * 可配置重试次数、间隔、可重试错误类型
 */

/**
 * 重试配置
 */
export interface RetryConfig {
  maxRetries: number           // 最大重试次数
  intervals: number[]          // 重试间隔（毫秒）
  retryableErrors: string[]    // 可重试错误类型
}

/**
 * 默认重试配置
 *
 * 最多 3 次重试
 * 间隔：5分钟、15分钟、30分钟（指数退避）
 * 可重试错误：网络超时、限流、临时不可用、SSL错误
 */
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  intervals: [5 * 60 * 1000, 15 * 60 * 1000, 30 * 60 * 1000], // 5min, 15min, 30min
  retryableErrors: [
    'network_timeout',
    'rate_limit',
    'temporary_unavailable',
    'ssl_error',
    'api_error',
    'connection_refused'
  ]
}

/**
 * 快速重试配置
 *
 * 用于短时间可恢复的错误
 */
export const QUICK_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  intervals: [1000, 3000, 5000], // 1s, 3s, 5s
  retryableErrors: [
    'network_timeout',
    'rate_limit',
    'temporary_unavailable'
  ]
}

/**
 * 重试错误类型
 */
export class RetryableError extends Error {
  type: string

  constructor(message: string, type: string) {
    super(message)
    this.type = type
    this.name = 'RetryableError'
  }
}

/**
 * 等待指定时间
 *
 * @param ms 毫秒数
 */
export async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * 带重试的异步函数执行
 *
 * @param fn 要执行的异步函数
 * @param config 重试配置
 * @returns 函数返回值
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  config: RetryConfig = DEFAULT_RETRY_CONFIG
): Promise<T> {
  let lastError: Error | null = null

  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error('Unknown error')

      // 检查是否为可重试错误
      const errorType = extractErrorType(err)
      if (!config.retryableErrors.includes(errorType)) {
        // 不可重试错误直接抛出
        throw err
      }

      lastError = err

      // 达到最大重试次数
      if (attempt === config.maxRetries) {
        console.error(`[retry] Max retries (${config.maxRetries}) reached for error: ${err.message}`)
        throw err
      }

      // 等待重试间隔
      const interval = config.intervals[attempt] || config.intervals[config.intervals.length - 1]
      console.warn(`[retry] Attempt ${attempt + 1}/${config.maxRetries + 1} failed: ${err.message}. Retrying in ${interval}ms...`)
      await sleep(interval)
    }
  }

  // 不应该到达这里
  throw lastError || new Error('Unexpected retry loop exit')
}

/**
 * 提取错误类型
 *
 * 从错误信息中识别错误类型
 *
 * @param error Error 对象
 * @returns 错误类型字符串
 */
function extractErrorType(error: Error): string {
  const message = error.message.toLowerCase()

  // 网络超时
  if (message.includes('timeout') || message.includes('timed out')) {
    return 'network_timeout'
  }

  // 限流
  if (message.includes('rate limit') || message.includes('429') || message.includes('too many requests')) {
    return 'rate_limit'
  }

  // 临时不可用
  if (message.includes('503') || message.includes('service unavailable') || message.includes('temporary')) {
    return 'temporary_unavailable'
  }

  // SSL 错误
  if (message.includes('ssl') || message.includes('certificate') || message.includes('tls')) {
    return 'ssl_error'
  }

  // 连接拒绝
  if (message.includes('connection refused') || message.includes('econnrefused')) {
    return 'connection_refused'
  }

  // API 错误（通用）
  if (message.includes('api error') || message.includes('api_error')) {
    return 'api_error'
  }

  // 默认不可重试
  return 'unknown'
}

/**
 * 带指数退避的重试
 *
 * 间隔自动按指数增长
 *
 * @param fn 要执行的异步函数
 * @param maxRetries 最大重试次数
 * @param baseInterval 基础间隔（毫秒）
 * @param maxInterval 最大间隔（毫秒）
 * @returns 函数返回值
 */
export async function withExponentialBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseInterval: number = 1000,
  maxInterval: number = 30000
): Promise<T> {
  const intervals: number[] = []
  for (let i = 0; i < maxRetries; i++) {
    const interval = Math.min(baseInterval * Math.pow(2, i), maxInterval)
    intervals.push(interval)
  }

  return withRetry(fn, {
    maxRetries,
    intervals,
    retryableErrors: DEFAULT_RETRY_CONFIG.retryableErrors
  })
}

/**
 * 批量重试（并发限制）
 *
 * 对多个任务进行重试，限制并发数
 *
 * @param tasks 任务数组
 * @param config 重试配置
 * @param concurrentLimit 并发限制
 * @returns 结果数组（Promise.allSettled 格式）
 */
export async function batchWithRetry<T>(
  tasks: (() => Promise<T>)[],
  config: RetryConfig = DEFAULT_RETRY_CONFIG,
  concurrentLimit: number = 5
): Promise<PromiseSettledResult<T>[]> {
  const results: PromiseSettledResult<T>[] = []
  const batchSize = concurrentLimit

  for (let i = 0; i < tasks.length; i += batchSize) {
    const batch = tasks.slice(i, i + batchSize)
    const batchResults = await Promise.allSettled(
      batch.map(task => withRetry(task, config))
    )
    results.push(...batchResults)
  }

  return results
}