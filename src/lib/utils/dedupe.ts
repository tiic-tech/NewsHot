/**
 * 去重 Hash 计算工具
 *
 * 使用 SHA256 算法计算去重 Hash
 */

import crypto from 'crypto'

/**
 * 计算去重 Hash（SHA256）
 *
 * 使用 title + url 作为输入，确保同一新闻不会重复
 *
 * @param title 新闻标题
 * @param url 来源 URL
 * @returns SHA256 hash（hex string，64字符）
 */
export function computeDedupeHash(title: string, url: string): string {
  // 使用分隔符避免拼接歧义
  const content = `${title}|${url}`
  return crypto.createHash('sha256').update(content, 'utf-8').digest('hex')
}

/**
 * 计算 URL Hash（SHA256）
 *
 * 仅使用 URL 作为输入，用于 URL 映射
 *
 * @param url 来源 URL
 * * @returns SHA256 hash（hex string，64字符）
 */
export function computeUrlHash(url: string): string {
  return crypto.createHash('sha256').update(url, 'utf-8').digest('hex')
}

/**
 * 计算内容 Hash（SHA256）
 *
 * 使用完整内容作为输入，用于内容一致性检查
 *
 * @param content 内容文本
 * @returns SHA256 hash（hex string，64字符）
 */
export function computeContentHash(content: string): string {
  return crypto.createHash('sha256').update(content, 'utf-8').digest('hex')
}

/**
 * 批量计算去重 Hash
 *
 * @param items 新闻条目数组
 * @returns hash 数组
 */
export function batchComputeDedupeHash(
  items: { title: string; url: string }[]
): string[] {
  return items.map(item => computeDedupeHash(item.title, item.url))
}

/**
 * 验证 Hash 格式
 *
 * SHA256 hex string 应为 64 字符
 *
 * @param hash Hash 字符串
 * @returns 是否为有效的 SHA256 hash
 */
export function isValidHash(hash: string): boolean {
  return /^[a-f0-9]{64}$/i.test(hash)
}

/**
 * 生成短 Hash（前 16 字符）
 *
 * 用于日志显示或简化标识
 *
 * @param hash 完整 hash
 * @returns 短 hash（16字符）
 */
export function getShortHash(hash: string): string {
  return hash.slice(0, 16)
}