/**
 * Draft Detail API
 *
 * GET /api/v1/draft/:id
 * 获取 draft 详情（审核页面展示)
 *
 * 契约来源： API_CONTRACT.md v1.2 - Draft模块
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseClientService, getCurrentProjectId } from '@/lib/supabase'
import type { Draft, Cluster, NewsItem } from '@/lib/types/db'

import { isValidUUID } from '@/lib/utils/format'

// ============================================================
// 类型定义
// ============================================================

interface DraftDetailResponse {
  id: string
  date: string
  status: string
  language: string
  totalItems: number
  newCount: number
  duplicateCount: number
  createdAt: string
  updatedAt: string
  approvedAt: string | null
  clusters: ClusterDetail[]
}

interface ClusterDetail {
  id: string
  clusterTheme: string
  coreInsight: string
  clusterImportance: number
  viewpointConflict: string | null
  suggestedAngle: string | null
  items: ClusterItemDetail[]
}

interface ClusterItemDetail {
  id: string
  sourceName: string
  sourceUrl: string
  viewpointSummary: string
  viewpointStance: string
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

    // 参数验证
    if (!isValidUUID(id)) {
      return NextResponse.json(
        { error: 'validation_error', message: 'id 格式不正确（非UUID)' },
        { status: 400 }
      )
    }

    const supabase = getSupabaseClientService()
    const projectId = await getCurrentProjectId(supabase)

    if (!projectId) {
      return NextResponse.json(
        { error: 'internal_error', message: '无法获取 project_id' },
        { status: 500 }
      )
    }

    // 查询 Draft
    const { data: draft, error: draftError } = await supabase
      .from('drafts')
      .select('*')
      .eq('id', id)
      .eq('project_id', projectId)
      .is('deleted_at', null)
      .single()

    if (draftError) {
      if (draftError.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'draft_not_found', message: 'draft 不存在' },
          { status: 404 }
        )
      }
      return NextResponse.json(
        { error: 'internal_error', message: `Supabase 查询失败: ${draftError.message}` },
        { status: 500 }
      )
    }

    if (!draft) {
      return NextResponse.json(
        { error: 'draft_not_found', message: 'draft 不存在' },
        { status: 404 }
      )
    }

    // 查询关联的 Clusters
    const clusterIds = draft.clusters || []
    const { data: clusters, error: clustersError } = await supabase
      .from('clusters')
      .select('id, cluster_theme, core_insight, cluster_importance, viewpoint_conflict, suggested_angle, cluster_refs')
      .in('id', clusterIds)
      .eq('project_id', projectId)
      .is('deleted_at', null)

    if (clustersError) {
      return NextResponse.json(
        { error: 'internal_error', message: `Supabase 查询失败: ${clustersError.message}` },
        { status: 500 }
      )
    }

    // 构建响应
    const clusterDetails: ClusterDetail[] = clusters.map((cluster) => {
      const items: ClusterItemDetail[] = (cluster.cluster_refs || []).map((ref) => ({
        id: ref.item_id,
        sourceName: ref.source_name,
        sourceUrl: ref.source_url,
        viewpointSummary: ref.viewpoint_summary,
        viewpointStance: ref.viewpoint_stance
      }))
      return {
        id: cluster.id,
        clusterTheme: cluster.cluster_theme,
        coreInsight: cluster.core_insight,
        clusterImportance: cluster.cluster_importance,
        viewpointConflict: cluster.viewpoint_conflict,
        suggestedAngle: cluster.suggested_angle,
        items
      }
    })
    const response: DraftDetailResponse = {
      id: draft.id,
      date: draft.date,
      status: draft.status,
      language: draft.language,
      totalItems: draft.total_items,
      newCount: draft.new_count,
      duplicateCount: draft.duplicate_count,
      createdAt: draft.created_at,
      updatedAt: draft.updated_at,
      approvedAt: draft.approved_at,
      clusters: clusterDetails
    }
    return NextResponse.json({
      data: response,
      message: 'success'
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '未知错误'
    return NextResponse.json(
      { error: 'internal_error', message: `Supabase 查询失败: ${errorMessage}` },
      { status: 500 }
    )
  }
}