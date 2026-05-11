/**
 * 格式化工具函数
 *
 * 用于数据格式转换、时间格式化等
 */

/**
 * 格式化日期为 ISO 8601 字符串
 *
 * @param date Date 对象或时间戳
 * @returns ISO 8601 字符串（UTC）
 */
export function formatISO8601(date: Date | number | string): string {
  const d = date instanceof Date ? date : new Date(date)
  return d.toISOString()
}

/**
 * 格式化日期为 YYYY-MM-DD
 *
 * @param date Date 对象或时间戳
 * @returns YYYY-MM-DD 字符串
 */
export function formatDate(date: Date | number | string): string {
  const d = date instanceof Date ? date : new Date(date)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * 格式化时间为 HH:MM:SS
 *
 * @param date Date 对象或时间戳
 * @returns HH:MM:SS 字符串（UTC）
 */
export function formatTime(date: Date | number | string): string {
  const d = date instanceof Date ? date : new Date(date)
  const hours = String(d.getUTCHours()).padStart(2, '0')
  const minutes = String(d.getUTCMinutes()).padStart(2, '0')
  const seconds = String(d.getUTCSeconds()).padStart(2, '0')
  return `${hours}:${minutes}:${seconds}`
}

/**
 * 格式化持续时间（毫秒转人类可读）
 *
 * @param ms 毫秒数
 * @returns 人类可读的时间字符串
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${ms}ms`
  }

  if (ms < 60000) {
    const seconds = Math.round(ms / 1000)
    return `${seconds}s`
  }

  if (ms < 3600000) {
    const minutes = Math.floor(ms / 60000)
    const seconds = Math.round((ms % 60000) / 1000)
    return seconds > 0 ? `${minutes}m ${seconds}s` : `${minutes}m`
  }

  const hours = Math.floor(ms / 3600000)
  const minutes = Math.round((ms % 3600000) / 60000)
  return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`
}

/**
 * 获取今天的日期（YYYY-MM-DD）
 *
 * @returns YYYY-MM-DD 字符串
 */
export function getToday(): string {
  return formatDate(new Date())
}

/**
 * 获取昨天的日期（YYYY-MM-DD）
 *
 * @returns YYYY-MM-DD 字符串
 */
export function getYesterday(): string {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return formatDate(d)
}

/**
 * 验证日期格式（YYYY-MM-DD）
 *
 * @param date 日期字符串
 * @returns 是否为有效日期格式
 */
export function isValidDateFormat(date: string): boolean {
  const regex = /^\d{4}-\d{2}-\d{2}$/
  if (!regex.test(date)) return false

  const parsed = new Date(date)
  return !isNaN(parsed.getTime())
}

/**
 * 验证 UUID 格式
 *
 * @param uuid UUID 字符串
 * @returns 是否为有效 UUID
 */
export function isValidUUID(uuid: string): boolean {
  const regex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  return regex.test(uuid)
}

/**
 * 格式化数字（添加千位分隔符）
 *
 * @param num 数字
 * @returns 格式化后的数字字符串
 */
export function formatNumber(num: number): string {
  return num.toLocaleString()
}

/**
 * 格式化百分比
 *
 * @param value 值（0-1）
 * @param decimals 小数位数
 * @returns 百分比字符串
 */
export function formatPercent(value: number, decimals: number = 2): string {
  return `${(value * 100).toFixed(decimals)}%`
}

/**
 * 截断文本
 *
 * @param text 文本
 * @param maxLength 最大长度
 * @param suffix 后缀（默认 '...'）
 * @returns 截断后的文本
 */
export function truncateText(text: string, maxLength: number, suffix: string = '...'): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength - suffix.length) + suffix
}

/**
 * 清理 HTML 标签
 *
 * @param text 包含 HTML 的文本
 * @returns 纯文本
 */
export function stripHtml(text: string): string {
  return text.replace(/<[^>]*>/g, '')
}

/**
 * 清理空白字符
 *
 * @param text 文本
 * @returns 清理后的文本
 */
export function stripWhitespace(text: string): string {
  return text.replace(/\s+/g, ' ').trim()
}

/**
 * 转换为 slug 格式
 *
 * @param text 文本
 * @returns slug 字符串
 */
export function toSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
}

/**
 * 格式化 JSON（美化输出）
 *
 * @param obj 对象
 * @returns JSON 字符串
 */
export function formatJSON(obj: unknown): string {
  return JSON.stringify(obj, null, 2)
}

/**
 * 格式化 Embedding 向量为 PostgreSQL vector 字符串
 *
 * @param vector 向量数组
 * @returns PostgreSQL vector 格式字符串
 */
export function formatVector(vector: number[]): string {
  return `[${vector.join(',')}]`
}

/**
 * 解析 PostgreSQL vector 字符串
 *
 * @param vectorStr vector 字符串
 * @returns 向量数组
 */
export function parseVector(vectorStr: string): number[] {
  const cleaned = vectorStr.replace(/^\[/, '').replace(/\]$/, '')
  return cleaned.split(',').map(parseFloat)
}