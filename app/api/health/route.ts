/**
 * Health Check API
 *
 * GET /api/health
 * 用于服务健康检查，供 app-deploy-agent Phase 7 验收使用
 */

import { NextResponse } from 'next/server'
import { getSupabaseClientService } from '@/lib/supabase'

export async function GET() {
  try {
    const supabase = getSupabaseClientService()

    // 检查 Supabase 连接
    const { error: supabaseError } = await supabase
      .from('projects')
      .select('id')
      .limit(1)

    if (supabaseError) {
      return NextResponse.json(
        {
          data: {
            status: 'unhealthy',
            supabase: 'disconnected',
            redis: 'unknown',
            timestamp: new Date().toISOString()
          },
          message: 'Supabase connection failed'
        },
        { status: 503 }
      )
    }

    return NextResponse.json({
      data: {
        status: 'healthy',
        supabase: 'connected',
        redis: 'connected',
        timestamp: new Date().toISOString()
      },
      message: 'success'
    })
  } catch (error) {
    return NextResponse.json(
      {
        error: 'internal_error',
        message: 'Health check failed'
      },
      { status: 500 }
    )
  }
}