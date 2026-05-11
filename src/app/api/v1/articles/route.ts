/**
 * Articles API - List
 *
 * GET /api/v1/articles
 * 获取文章列表（Bullet List展示）
 *
 * 契约来源：API_CONTRACT.md v1.2 - 文章模块
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseClientService, getCurrentProjectId } from '@/lib/supabase'

// ============================================================
// 类型定义
// ============================================================

interface ArticleItem {
  id: string
  title: string
  summary: string
  publishTime: string
  language: string
  authorName: string | null
  platform: string | null
  rawUrl: string | null
}

interface ArticlesResponse {
  articles: ArticleItem[]
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
    const language = searchParams.get('language') || 'zh'
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

    const validLanguages = ['zh', 'en', 'zh-en', 'en-zh']
    if (!validLanguages.includes(language)) {
      return NextResponse.json(
        {
          error: 'validation_error',
          message: 'language 不在枚举值范围内（zh | en | zh-en | en-zh）'
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

    // 查询 articles
    const offset = (page - 1) * pageSize

    const { data, error, count } = await supabase
      .from('articles')
      .select('id, title, summary, publish_time, language, author_name, platform, raw_url', { count: 'exact' })
      .eq('project_id', projectId)
      .eq('date', date)
      .eq('language', language)
      .is('deleted_at', null)
      .order('publish_time', { ascending: false })
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
          error: 'no_articles_found',
          message: '指定日期无文章'
        },
        { status: 404 }
      )
    }

    // 转换为契约格式
    const articles: ArticleItem[] = data.map(item => ({
      id: item.id,
      title: item.title,
      summary: item.summary,
      publishTime: item.publish_time,
      language: item.language,
      authorName: item.author_name,
      platform: item.platform,
      rawUrl: item.raw_url
    }))

    // 成功响应
    return NextResponse.json({
      data: {
        articles,
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