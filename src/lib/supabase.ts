/**
 * Supabase Client
 *
 * 提供两种 Client 创建方式：
 * 1. Service Client：使用 Service Key，绑过 RLS，用于后端逻辑和 Cron Jobs
 * 2. Public Client：使用 Anon Key，受 RLS 保护，用于前端请求
 *
 * 所有 Client 都注入 x-app-id header，用于多应用共享数据隔离
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { Database } from './types/db'

// ============================================================
// 环境变量
// ============================================================

const SUPABASE_URL = process.env.SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY!
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY!

// 前端环境变量（Next.js 公开环境变量）
const NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const NEXT_PUBLIC_SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// 应用标识（从环境变量读取，默认为 'newshot'）
const APP_ID = process.env.SUPABASE_APP_ID || 'newshot'

// ============================================================
// Service Client（后端专用，绑过 RLS）
// ============================================================

/**
 * 创建 Service Supabase Client
 *
 * 使用 Service Key，绑过 RLS 策略
 * 用于 Cron Jobs、后端定时任务、管理员操作
 *
 * @returns Supabase Client（Service Key）
 */
export function createSupabaseClientService(): SupabaseClient<Database> {
  return createClient<Database>(
    SUPABASE_URL,
    SUPABASE_SERVICE_KEY,
    {
      global: {
        headers: {
          'x-app-id': APP_ID
        }
      }
    }
  )
}

// ============================================================
// Public Client（前端专用，受 RLS 保护）
// ============================================================

/**
 * 创建 Public Supabase Client
 *
 * 使用 Anon Key，受 RLS 策略保护
 * 用于前端请求，自动按 project_id 隔离数据
 *
 * @returns Supabase Client（Anon Key）
 */
export function createSupabaseClientPublic(): SupabaseClient<Database> {
  // 前端使用 NEXT_PUBLIC_ 前缀的环境变量
  const url = NEXT_PUBLIC_SUPABASE_URL || SUPABASE_URL
  const key = NEXT_PUBLIC_SUPABASE_ANON_KEY || SUPABASE_ANON_KEY

  return createClient<Database>(
    url,
    key,
    {
      global: {
        headers: {
          'x-app-id': APP_ID
        }
      }
    }
  )
}

// ============================================================
// 单例 Client（可选，减少重复创建）
// ============================================================

let _serviceClient: SupabaseClient<Database> | null = null
let _publicClient: SupabaseClient<Database> | null = null

/**
 * 获取 Service Client 单例
 *
 * 推荐在后端逻辑中使用单例，减少重复创建
 *
 * @returns Supabase Client（Service Key）
 */
export function getSupabaseClientService(): SupabaseClient<Database> {
  if (!_serviceClient) {
    _serviceClient = createSupabaseClientService()
  }
  return _serviceClient
}

/**
 * 获取 Public Client 单例
 *
 * 推荐在前端组件中使用单例，减少重复创建
 *
 * @returns Supabase Client（Anon Key）
 */
export function getSupabaseClientPublic(): SupabaseClient<Database> {
  if (!_publicClient) {
    _publicClient = createSupabaseClientPublic()
  }
  return _publicClient
}

// ============================================================
// 辅助函数
// ============================================================

/**
 * 获取当前应用的 project_id
 *
 * 用于 Service Client 操作时手动注入 project_id
 *
 * @param client Supabase Client
 * @returns project_id UUID
 */
export async function getCurrentProjectId(
  client: SupabaseClient<Database>
): Promise<string | null> {
  const { data, error } = await client
    .from('projects')
    .select('id')
    .eq('name', APP_ID)
    .single()

  if (error) {
    console.error('[supabase] Failed to get project_id:', error)
    return null
  }

  return data?.id || null
}

/**
 * 软删除记录（设置 deleted_at）
 *
 * 用于软删除操作，不实际删除数据
 *
 * @param client Supabase Client
 * @param table 表名
 * @param id 记录 ID
 * @returns 是否成功
 */
export async function softDelete(
  client: SupabaseClient<Database>,
  table: keyof Database['public']['Tables'],
  id: string
): Promise<boolean> {
  const { error } = await client
    .from(table)
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)

  if (error) {
    console.error(`[supabase] Failed to soft delete ${table}:`, error)
    return false
  }

  return true
}

/**
 * 查询未软删除的记录（过滤 deleted_at IS NULL）
 *
 * 用于查询时自动过滤已软删除数据
 *
 * 注意：RLS 策略已包含 deleted_at IS NULL 条件，此函数用于 Service Client
 *
 * @param client Supabase Client
 * @param table 表名
 * @returns 查询构建器（已添加 deleted_at IS NULL 过滤）
 */
export function queryActive<T extends keyof Database['public']['Tables']>(
  client: SupabaseClient<Database>,
  table: T
) {
  return client
    .from(table)
    .select('*')
    .is('deleted_at', null)
}