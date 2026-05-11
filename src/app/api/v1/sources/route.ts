/**
 * Sources API - List
 *
 * GET /api/v1/sources
 * 获取数据源列表（Bullet List展示）
 *
 * 契约来源：API_CONTRACT.md v1.2 - 数据源模块
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseClientService, getCurrentProjectId } from '@/lib/supabase'

// ============================================================
// 类型定义
// ============================================================

interface SourceItem {
  id: string
  publishTime: string | null
  authorName: string | null
  platform: string
  title: string
  abstract: string
  coreInsights: string
  rawUrl: string
  contentType: string
  importanceScore: number
}

interface SourcesResponse {
  sources: SourceItem[]
  total: number
  page: number
  pageSize: number
}

// ============================================================
// GET Handler
// ============================================================

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)

    // 查询参数
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0]
    const page = parseInt(searchParams.get('page') || '1', 10)
    const pageSize = parseInt(searchParams.get('pageSize') || '20', 10)

    // 参数验证
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json(
        {
          error: 'validation_error',
          message: 'date 格式不正确（应为 YYYY-MM-DD）'
        },
        { status: 400 }
      )
    }

    if (page < 1 || pageSize < 1) {
      return NextResponse.json(
        {
          error: 'validation_error',
          message: 'page/pageSize 为负数'
        },
        { status: 400 }
      )
    }

    // 获取 project_id
    const supabase = getSupabaseClientService()
    const projectId = await getCurrentProjectId(supabase)

    if (!projectId) {
      return NextResponse.json(
        {
          error: 'internal_error',
          message: '无法获取 project_id'
        },
        { status: 500 }
      )
    }

    // 查询 news_items
    const offset = (page - 1) * pageSize

    const { data, error, count } = await supabase
      .from('news_items')
      .select('id, publish_time, author_name, platform, title, summary, source_url, content_type, importance_score', { count: 'exact' })
      .eq('project_id', projectId)
      .eq('date', date)
      .is('deleted_at', null)
      .order('importance_score', { ascending: false })
      .range(offset, offset + pageSize - 1)

    if (error) {
      return NextResponse.json(
        {
          error: 'internal_error',
          message: `Supabase 查询失败：${error.message}`
        },
        { status: 500 }
      )
    }

    // 404 处理
    if (!data || data.length === 0) {
      return NextResponse.json(
        {
          error: 'no_sources_found',
          message: '指定日期无数据源'
        },
        { status: 404 }
      )
    }

    // 转换为契约格式
    const sources: SourceItem[] = data.map(item => ({
      id: item.id,
      publishTime: item.publish_time,
      authorName: item.author_name,
      platform: item.platform || 'x',
      title: item.title,
      abstract: item.summary,
      coreInsights: item.summary, // summary 作为 coreInsights
      rawUrl: item.source_url,
      contentType: item.content_type,
      importanceScore: item.importance_score
    }))

    // 成功响应
    return NextResponse.json({
      data: {
        sources,
        total: count || 0,
        page,
        pageSize
      },
      message: 'success'
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '未知错误'
    return NextResponse.json(
      {
        error: 'internal_error',
        message: `Supabase 查询失败：${errorMessage}`
      },
      { status: 500 }
    )
  }
}