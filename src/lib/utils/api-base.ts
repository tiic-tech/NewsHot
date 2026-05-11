/**
 * API Base 工具函数
 *
 * 用于子路径部署场景，确保 API 调用路径正确
 * 根据 NEXT_PUBLIC_APP_PATH 环境变量动态构建 API 基础路径
 */

/**
 * 获取 API 基础路径
 *
 * 本地开发：返回空字符串
 * 生产部署：返回 '/newshot' 等子路径前缀
 *
 * @returns API 基础路径字符串
 */
export function getApiBase(): string {
  const appPath = process.env.NEXT_PUBLIC_APP_PATH || ''
  return appPath ? `/${appPath}` : ''
}

/**
 * 构建完整 API URL
 *
 * @param path API 路径（不含前缀，如 '/api/v1/sources'）
 * @returns 完整 API URL
 *
 * @example
 * // 本地开发
 * buildApiUrl('/api/v1/sources') // '/api/v1/sources'
 *
 * @example
 * // 生产部署（NEXT_PUBLIC_APP_PATH=newshot）
 * buildApiUrl('/api/v1/sources') // '/newshot/api/v1/sources'
 */
export function buildApiUrl(path: string): string {
  const apiBase = getApiBase()
  // 确保 path 以 / 开头
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${apiBase}${normalizedPath}`
}

/**
 * 构建页面 URL（用于路由跳转）
 *
 * 注意：Next.js Router 自动处理 basePath，路由跳转时不需要手动拼接前缀
 * 此函数仅供特殊场景使用（如外部链接、静态资源等）
 *
 * @param path 页面路径（不含前缀，如 '/sources'）
 * @returns 完整页面 URL
 */
export function buildPageUrl(path: string): string {
  const apiBase = getApiBase()
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${apiBase}${normalizedPath}`
}

/**
 * 检查是否为子路径部署
 *
 * @returns 是否为子路径部署模式
 */
export function isSubPathDeployment(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_APP_PATH)
}

/**
 * 获取应用子路径名称
 *
 * @returns 应用子路径名称（如 'newshot'），本地开发返回空字符串
 */
export function getAppPath(): string {
  return process.env.NEXT_PUBLIC_APP_PATH || ''
}