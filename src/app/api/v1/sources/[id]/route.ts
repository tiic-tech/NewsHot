/**
 * Sources API - Detail
 *
 * GET /api/v1/sources/:id
 * 获取单个数据源详情
 *
 * 契约来源：API_CONTRACT.md v1.2 - 数据源模块
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseClientService, getCurrentProjectId } from '@/lib/supabase'

// ============================================================
// 类型定义
// ============================================================

interface SourceDetailResponse {
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
  keyEntities: string[] | null
  hashtags: string[] | null
  visualPotential: string | null
  rawTranscript: string | null
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

    // 查询 news_item
    const { data, error } = await supabase
      .from('news_items')
      .select('*')
      .eq('id', id)
      .eq('project_id', projectId)
      .is('deleted_at', null)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          {
            error: 'source_not_found',
            message: '数据源不存在'
          },
          { status: 404 }
        )
      }
      return NextResponse.json(
        {
          error: 'internal_error',
          message: `Supabase 查询失败：${error.message}`
        },
        { status: 500 }
      )
    }

    // 转换为契约格式
    const sourceDetail: SourceDetailResponse = {
      id: data.id,
      publishTime: data.publish_time,
      authorName: data.author_name,
      platform: data.platform || 'x',
      title: data.title,
      abstract: data.summary,
      coreInsights: data.summary,
      rawUrl: data.source_url,
      contentType: data.content_type,
      importanceScore: data.importance_score,
      keyEntities: data.key_entities,
      hashtags: data.hashtags,
      visualPotential: data.visual_potential,
      rawTranscript: data.raw_transcript
    }

    // 成功响应
    return NextResponse.json({
      data: sourceDetail,
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