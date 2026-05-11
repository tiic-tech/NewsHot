/**
 * Articles API - Detail
 *
 * GET /api/v1/articles/:id
 * 获取文章详情（点击跳转查看完整文章）
 *
 * 契约来源：API_CONTRACT.md v1.2 - 文章模块
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseClientService, getCurrentProjectId } from '@/lib/supabase'

// ============================================================
// 类型定义
// ============================================================

interface ClusterInfo {
  id: string
  clusterTheme: string
  coreInsight: string
}

interface ArticleDetailResponse {
  id: string
  title: string
  content: string
  summary: string
  publishTime: string
  language: string
  authorName: string | null
  platform: string | null
  rawUrl: string | null
  clusters: ClusterInfo[]
}

// ============================================================
// UUID 验证
// ============================================================

function isValidUUID(uuid: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(uuid)
}

// ============================================================
// GET Handler
// ============================================================

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params

    // UUID 验证
    if (!isValidUUID(id)) {
      return NextResponse.json(
        {
          error: 'validation_error',
          message: 'id 格式不正确（非UUID）'
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

    // 查询 article
    const { data: article, error: articleError } = await supabase
      .from('articles')
      .select('*')
      .eq('id', id)
      .eq('project_id', projectId)
      .is('deleted_at', null)
      .single()

    if (articleError) {
      if (articleError.code === 'PGRST116') {
        return NextResponse.json(
          {
            error: 'article_not_found',
            message: '文章不存在'
          },
          { status: 404 }
        )
      }
      return NextResponse.json(
        {
          error: 'internal_error',
          message: `Supabase 查询失败：${articleError.message}`
        },
        { status: 500 }
      )
    }

    // 查询关联的 draft
    const { data: draft } = await supabase
      .from('drafts')
      .select('clusters')
      .eq('id', article.draft_id)
      .single()

    // 查询关联的 clusters
    let clusters: ClusterInfo[] = []
    if (draft && draft.clusters && draft.clusters.length > 0) {
      const { data: clusterData } = await supabase
        .from('clusters')
        .select('id, cluster_theme, core_insight')
        .in('id', draft.clusters)
        .is('deleted_at', null)

      if (clusterData) {
        clusters = clusterData.map(c => ({
          id: c.id,
          clusterTheme: c.cluster_theme,
          coreInsight: c.core_insight
        }))
      }
    }

    // 转换为契约格式
    const articleDetail: ArticleDetailResponse = {
      id: article.id,
      title: article.title,
      content: article.content,
      summary: article.summary,
      publishTime: article.publish_time,
      language: article.language,
      authorName: article.author_name,
      platform: article.platform,
      rawUrl: article.raw_url,
      clusters
    }

    // 成功响应
    return NextResponse.json({
      data: articleDetail,
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