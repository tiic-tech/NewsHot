/**
 * Cron Cleanup API
 *
 * GET /api/v1/cron/cleanup
 * Redis 清理任务（03:00触发）
 *
 * 契约来源: API_CONTRACT.md v1.2 - Cron Jobs模块
 */

import { NextRequest, NextResponse } from 'next/server'
import { getRedisClient, cleanupBeforeDate } from '@/lib/redis'

// ============================================================
// 环境变量
// ============================================================

const CRON_SECRET = process.env.CRON_SECRET || ''

// ============================================================
// Cron 鉴权验证
// ============================================================

function validateCronAuth(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return false
  }
  const token = authHeader.replace('Bearer ', '')
  return token === CRON_SECRET
}

// ============================================================
// GET Handler
// ============================================================
export async function GET(request: NextRequest) {
  try {
    // Cron 鉴权检查
    if (!validateCronAuth(request)) {
      return NextResponse.json(
        { error: 'unauthorized', message: '未提供有效 CRON_SECRET' },
        { status: 401 }
      )
    }

    const redis = getRedisClient()
    const startTime = Date.now()

    // 计算清理日期阈值（清理3天前的数据）
    const cleanupDate = new Date()
    cleanupDate.setDate(cleanupDate.getDate() - 3)
    const beforeDate = cleanupDate.toISOString().split('T')[0]

    // 执行清理
    const cleanedKeysCount = await cleanupBeforeDate(redis, beforeDate)

    const cleanupDurationMs = Date.now() - startTime

    // 成功响应
    return NextResponse.json({
      data: {
        cleanedKeysCount,
        cleanupDurationMs
      },
      message: 'Redis 清理任务执行成功'
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '未知错误'
    return NextResponse.json(
      { error: 'internal_error', message: `Redis 清理失败: ${errorMessage}` },
      { status: 500 }
    )
  }
}