/**
 * Tools API - Unified Entry
 *
 * POST /api/v1/tools
 * Chatbot调用Tool执行操作（统一入口，一次性响应）
 *
 * 契约来源：API_CONTRACT.md v1.2 - Chatbot Tools模块
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseClientService, getCurrentProjectId } from '@/lib/supabase'
import { getLLMAdapter, ChatMessage } from '@/lib/llm-adapter'
import { isValidUUID } from '@/lib/utils/format'

// ============================================================
// 类型定义
// ============================================================

interface ToolsRequest {
  toolName: string
  params: Record<string, unknown>
}

interface ToolsResponse {
  result: Record<string, unknown>
  thinking?: string
  message: string
}

// ============================================================
// 支持的Tool列表
// ============================================================

const SUPPORTED_TOOLS = [
  'list_clusters',
  'get_cluster_detail',
  'edit_cluster_insight',
  'delete_item',
  'edit_item_summary',
  'merge_clusters',
  'approve_draft',
  'add_item',
  'regenerate_draft',
  'reorder_items',
  'split_cluster',
  'list_items',
  'get_item_detail',
  'delete_cluster'
]

// ============================================================
// Tool实现
// ============================================================

async function executeTool(toolName: string, params: Record<string, unknown>): Promise<{ result: Record<string, unknown>; thinking?: string }> {
  const supabase = getSupabaseClientService()
  const projectId = await getCurrentProjectId(supabase)

  if (!projectId) {
    throw new Error('无法获取project_id')
  }

  switch (toolName) {
    // Tool 1: list_clusters
    case 'list_clusters': {
      const draftId = params.draftId as string
      if (!isValidUUID(draftId)) {
        throw new Error('draftId格式不正确')
      }

      const { data: draft, error: draftError } = await supabase
        .from('drafts')
        .select('clusters')
        .eq('id', draftId)
        .eq('project_id', projectId)
        .single()

      if (draftError || !draft) {
        return { result: { clusters: [], totalClusters: 0 } }
      }

      const clusterIds = draft.clusters || []
      const { data: clusters, error: clustersError } = await supabase
        .from('clusters')
        .select('id, cluster_theme, core_insight, cluster_importance, cluster_refs')
        .in('id', clusterIds)
        .eq('project_id', projectId)
        .is('deleted_at', null)

      if (clustersError) {
        throw new Error(`查询clusters失败：${clustersError.message}`)
      }

      const result = (clusters || []).map(c => ({
        id: c.id,
        clusterTheme: c.cluster_theme,
        coreInsight: c.core_insight,
        clusterImportance: c.cluster_importance,
        itemsCount: (c.cluster_refs || []).length
      }))

      return { result: { clusters: result, totalClusters: result.length } }
    }

    // Tool 2: get_cluster_detail
    case 'get_cluster_detail': {
      const clusterId = params.clusterId as string
      if (!isValidUUID(clusterId)) {
        throw new Error('clusterId格式不正确')
      }

      const { data: cluster, error: clusterError } = await supabase
        .from('clusters')
        .select('*')
        .eq('id', clusterId)
        .eq('project_id', projectId)
        .is('deleted_at', null)
        .single()

      if (clusterError || !cluster) {
        throw new Error('cluster不存在')
      }

      const items = (cluster.cluster_refs || []).map(ref => ({
        id: ref.item_id,
        sourceName: ref.source_name,
        sourceUrl: ref.source_url,
        viewpointSummary: ref.viewpoint_summary,
        viewpointStance: ref.viewpoint_stance
      }))

      return {
        result: {
          cluster: {
            id: cluster.id,
            clusterTheme: cluster.cluster_theme,
            coreInsight: cluster.core_insight,
            clusterImportance: cluster.cluster_importance,
            viewpointConflict: cluster.viewpoint_conflict,
            suggestedAngle: cluster.suggested_angle,
            items
          }
        }
      }
    }

    // Tool 3: edit_cluster_insight
    case 'edit_cluster_insight': {
      const clusterId = params.clusterId as string
      const newInsight = params.newInsight as string

      if (!isValidUUID(clusterId)) {
        throw new Error('clusterId格式不正确')
      }
      if (!newInsight || newInsight.trim() === '') {
        throw new Error('newInsight为空')
      }

      const { error: updateError } = await supabase
        .from('clusters')
        .update({ core_insight: newInsight })
        .eq('id', clusterId)
        .eq('project_id', projectId)

      if (updateError) {
        throw new Error(`更新失败：${updateError.message}`)
      }

      return {
        result: {
          clusterId,
          updatedInsight: newInsight,
          message: 'cluster核心洞察已更新'
        }
      }
    }

    // Tool 4: delete_item
    case 'delete_item': {
      const itemId = params.itemId as string
      if (!isValidUUID(itemId)) {
        throw new Error('itemId格式不正确')
      }

      // 先查询item所属的cluster
      const { data: clusters, error: clustersError } = await supabase
        .from('clusters')
        .select('id, cluster_refs')
        .eq('project_id', projectId)
        .is('deleted_at', null)

      if (clustersError) {
        throw new Error(`查询失败：${clustersError.message}`)
      }

      let affectedClusterId = ''
      let remainingItemsCount = 0

      for (const cluster of clusters || []) {
        const refs = cluster.cluster_refs || []
        const itemIndex = refs.findIndex(ref => ref.item_id === itemId)
        if (itemIndex !== -1) {
          // 从cluster_refs中移除该item
          const newRefs = refs.filter(ref => ref.item_id !== itemId)
          await supabase
            .from('clusters')
            .update({ cluster_refs: newRefs })
            .eq('id', cluster.id)
          affectedClusterId = cluster.id
          remainingItemsCount = newRefs.length
          break
        }
      }

      // 软删除news_item
      await supabase
        .from('news_items')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', itemId)
        .eq('project_id', projectId)

      return {
        result: {
          deletedItemId: itemId,
          affectedClusterId,
          remainingItemsCount,
          message: 'item已删除'
        }
      }
    }

    // Tool 5: edit_item_summary
    case 'edit_item_summary': {
      const itemId = params.itemId as string
      const newSummary = params.newSummary as string

      if (!isValidUUID(itemId)) {
        throw new Error('itemId格式不正确')
      }
      if (!newSummary || newSummary.trim() === '') {
        throw new Error('newSummary为空')
      }

      // 查询item所属的cluster并更新cluster_refs
      const { data: clusters, error: clustersError } = await supabase
        .from('clusters')
        .select('id, cluster_refs')
        .eq('project_id', projectId)
        .is('deleted_at', null)

      if (clustersError) {
        throw new Error(`查询失败：${clustersError.message}`)
      }

      for (const cluster of clusters || []) {
        const refs = cluster.cluster_refs || []
        const itemRef = refs.find(ref => ref.item_id === itemId)
        if (itemRef) {
          const newRefs = refs.map(ref =>
            ref.item_id === itemId
              ? { ...ref, viewpoint_summary: newSummary }
              : ref
          )
          await supabase
            .from('clusters')
            .update({ cluster_refs: newRefs })
            .eq('id', cluster.id)
          break
        }
      }

      return {
        result: {
          itemId,
          updatedSummary: newSummary,
          message: 'item观点摘要已更新'
        }
      }
    }

    // Tool 6: merge_clusters
    case 'merge_clusters': {
      const clusterIds = params.clusterIds as string[]
      const newTheme = params.newTheme as string

      if (!clusterIds || clusterIds.length < 2) {
        throw new Error('clusterIds至少需要2个')
      }
      if (!newTheme || newTheme.trim() === '') {
        throw new Error('newTheme为空')
      }

      // 查询所有要合并的clusters
      const { data: clusters, error: clustersError } = await supabase
        .from('clusters')
        .select('*')
        .in('id', clusterIds)
        .eq('project_id', projectId)
        .is('deleted_at', null)

      if (clustersError || !clusters || clusters.length < 2) {
        throw new Error('cluster不存在')
      }

      // 合并cluster_refs
      const mergedRefs = clusters.flatMap(c => c.cluster_refs || [])
      const avgImportance = Math.round(
        clusters.reduce((sum, c) => sum + c.cluster_importance, 0) / clusters.length
      )

      // 创建新cluster
      const { data: newCluster, error: createError } = await supabase
        .from('clusters')
        .insert({
          project_id: projectId,
          draft_id: clusters[0].draft_id,
          date: clusters[0].date,
          cluster_theme: newTheme,
          core_insight: '合并后的cluster，请编辑核心洞察',
          cluster_refs: mergedRefs,
          cluster_importance: avgImportance
        })
        .select('id')
        .single()

      if (createError || !newCluster) {
        throw new Error(`创建cluster失败：${createError?.message}`)
      }

      // 软删除旧clusters
      await supabase
        .from('clusters')
        .update({ deleted_at: new Date().toISOString() })
        .in('id', clusterIds)

      return {
        result: {
          mergedClusterId: newCluster.id,
          newTheme,
          mergedItemsCount: mergedRefs.length,
          deletedClusterIds: clusterIds,
          message: 'clusters已合并'
        }
      }
    }

    // Tool 7: approve_draft
    case 'approve_draft': {
      const draftId = params.draftId as string
      if (!isValidUUID(draftId)) {
        throw new Error('draftId格式不正确')
      }

      const { data: draft, error: draftError } = await supabase
        .from('drafts')
        .select('status')
        .eq('id', draftId)
        .eq('project_id', projectId)
        .single()

      if (draftError || !draft) {
        throw new Error('draft不存在')
      }

      if (draft.status === 'approved') {
        throw new Error('draft状态已为approved')
      }
      if (draft.status === 'rejected') {
        throw new Error('draft状态已为rejected')
      }

      const approvedAt = new Date().toISOString()
      await supabase
        .from('drafts')
        .update({ status: 'approved', approved_at: approvedAt })
        .eq('id', draftId)

      return {
        result: {
          draftId,
          status: 'approved',
          approvedAt,
          pipelineTriggered: true,
          message: 'draft已审核通过'
        }
      }
    }

    // Tool 8: add_item
    case 'add_item': {
      const clusterId = params.clusterId as string
      const itemData = params.itemData as {
        sourceName: string
        sourceUrl: string
        viewpointSummary: string
        viewpointStance?: string
      }

      if (!isValidUUID(clusterId)) {
        throw new Error('clusterId格式不正确')
      }
      if (!itemData?.sourceName || !itemData?.sourceUrl || !itemData?.viewpointSummary) {
        throw new Error('itemData缺少必填字段')
      }

      // 创建新的news_item
      const newItemId = crypto.randomUUID()
      const { data: cluster } = await supabase
        .from('clusters')
        .select('date, cluster_refs')
        .eq('id', clusterId)
        .single()

      if (!cluster) {
        throw new Error('cluster不存在')
      }

      // 添加到cluster_refs
      const newRef = {
        item_id: newItemId,
        source_name: itemData.sourceName,
        source_url: itemData.sourceUrl,
        viewpoint_summary: itemData.viewpointSummary,
        viewpoint_stance: itemData.viewpointStance || ''
      }

      const newRefs = [...(cluster.cluster_refs || []), newRef]
      await supabase
        .from('clusters')
        .update({ cluster_refs: newRefs })
        .eq('id', clusterId)

      return {
        result: {
          addedItemId: newItemId,
          clusterId,
          message: 'item已添加'
        }
      }
    }

    // Tool 9: regenerate_draft
    case 'regenerate_draft': {
      const draftId = params.draftId as string
      if (!isValidUUID(draftId)) {
        throw new Error('draftId格式不正确')
      }

      const { data: draft } = await supabase
        .from('drafts')
        .select('date')
        .eq('id', draftId)
        .eq('project_id', projectId)
        .single()

      if (!draft) {
        throw new Error('draft不存在')
      }

      // TODO: 实际重新生成逻辑需要调用fetcher和processor
      const estimatedCompletionTime = new Date(Date.now() + 5 * 60 * 1000).toISOString()

      return {
        result: {
          draftId,
          regenerationStarted: true,
          estimatedCompletionTime,
          message: 'draft重新生成已启动'
        }
      }
    }

    // Tool 10: reorder_items
    case 'reorder_items': {
      const clusterId = params.clusterId as string
      const itemOrder = params.itemOrder as string[]

      if (!isValidUUID(clusterId)) {
        throw new Error('clusterId格式不正确')
      }
      if (!itemOrder || itemOrder.length === 0) {
        throw new Error('itemOrder为空')
      }

      const { data: cluster } = await supabase
        .from('clusters')
        .select('cluster_refs')
        .eq('id', clusterId)
        .single()

      if (!cluster) {
        throw new Error('cluster不存在')
      }

      // 按新顺序排列cluster_refs
      const refsMap = new Map(
        (cluster.cluster_refs || []).map(ref => [ref.item_id, ref])
      )
      const newRefs = itemOrder
        .map(id => refsMap.get(id))
        .filter(ref => ref !== undefined)

      await supabase
        .from('clusters')
        .update({ cluster_refs: newRefs })
        .eq('id', clusterId)

      return {
        result: {
          clusterId,
          newOrder: itemOrder,
          message: 'items顺序已调整'
        }
      }
    }

    // Tool 11: split_cluster
    case 'split_cluster': {
      const clusterId = params.clusterId as string
      const splitGroups = params.splitGroups as Array<{
        itemIds: string[]
        newTheme: string
      }>

      if (!isValidUUID(clusterId)) {
        throw new Error('clusterId格式不正确')
      }
      if (!splitGroups || splitGroups.length < 2) {
        throw new Error('splitGroups至少需要2组')
      }

      const { data: cluster } = await supabase
        .from('clusters')
        .select('*')
        .eq('id', clusterId)
        .single()

      if (!cluster) {
        throw new Error('cluster不存在')
      }

      const refsMap = new Map(
        (cluster.cluster_refs || []).map(ref => [ref.item_id, ref])
      )

      const newClusterIds: string[] = []

      for (const group of splitGroups) {
        const newRefs = group.itemIds
          .map(id => refsMap.get(id))
          .filter(ref => ref !== undefined)

        const { data: newCluster } = await supabase
          .from('clusters')
          .insert({
            project_id: projectId,
            draft_id: cluster.draft_id,
            date: cluster.date,
            cluster_theme: group.newTheme,
            core_insight: '拆分后的cluster，请编辑核心洞察',
            cluster_refs: newRefs,
            cluster_importance: cluster.cluster_importance
          })
          .select('id')
          .single()

        if (newCluster) {
          newClusterIds.push(newCluster.id)
        }
      }

      // 软删除原cluster
      await supabase
        .from('clusters')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', clusterId)

      return {
        result: {
          newClusterIds,
          deletedClusterId: clusterId,
          message: 'cluster已拆分'
        }
      }
    }

    // Tool 12: list_items
    case 'list_items': {
      const clusterId = params.clusterId as string
      if (!isValidUUID(clusterId)) {
        throw new Error('clusterId格式不正确')
      }

      const { data: cluster } = await supabase
        .from('clusters')
        .select('cluster_refs')
        .eq('id', clusterId)
        .single()

      if (!cluster) {
        throw new Error('cluster不存在')
      }

      const items = (cluster.cluster_refs || []).map(ref => ({
        id: ref.item_id,
        sourceName: ref.source_name,
        sourceUrl: ref.source_url,
        viewpointSummary: ref.viewpoint_summary,
        viewpointStance: ref.viewpoint_stance
      }))

      return {
        result: {
          items,
          totalItems: items.length
        }
      }
    }

    // Tool 13: get_item_detail
    case 'get_item_detail': {
      const itemId = params.itemId as string
      if (!isValidUUID(itemId)) {
        throw new Error('itemId格式不正确')
      }

      const { data: item, error: itemError } = await supabase
        .from('news_items')
        .select('*')
        .eq('id', itemId)
        .eq('project_id', projectId)
        .is('deleted_at', null)
        .single()

      if (itemError || !item) {
        throw new Error('item不存在')
      }

      return {
        result: {
          item: {
            id: item.id,
            sourceName: item.source_name,
            sourceUrl: item.source_url,
            viewpointSummary: item.summary,
            viewpointStance: '',
            contentType: item.content_type,
            importanceScore: item.importance_score,
            keyEntities: item.key_entities,
            hashtags: item.hashtags,
            visualPotential: item.visual_potential,
            rawTranscript: item.raw_transcript
          }
        }
      }
    }

    // Tool 14: delete_cluster
    case 'delete_cluster': {
      const clusterId = params.clusterId as string
      if (!isValidUUID(clusterId)) {
        throw new Error('clusterId格式不正确')
      }

      const { data: cluster } = await supabase
        .from('clusters')
        .select('id, cluster_refs, draft_id')
        .eq('id', clusterId)
        .eq('project_id', projectId)
        .single()

      if (!cluster) {
        throw new Error('cluster不存在')
      }

      const deletedItemsCount = (cluster.cluster_refs || []).length

      // 软删除cluster
      await supabase
        .from('clusters')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', clusterId)

      return {
        result: {
          deletedClusterId: clusterId,
          deletedItemsCount,
          affectedDraftId: cluster.draft_id,
          message: 'cluster已删除'
        }
      }
    }

    default:
      throw new Error(`不支持的Tool：${toolName}`)
  }
}

// ============================================================
// POST Handler
// ============================================================

export async function POST(request: NextRequest) {
  try {
    const body: ToolsRequest = await request.json()
    const { toolName, params } = body

    // 参数验证
    if (!toolName || !SUPPORTED_TOOLS.includes(toolName)) {
      return NextResponse.json(
        { error: 'validation_error', message: 'toolName不在支持的Tool列表中' },
        { status: 400 }
      )
    }

    if (!params || typeof params !== 'object') {
      return NextResponse.json(
        { error: 'validation_error', message: 'params缺少必填字段' },
        { status: 400 }
      )
    }

    // 执行Tool
    const { result, thinking } = await executeTool(toolName, params)

    // 成功响应
    return NextResponse.json({
      data: {
        result,
        thinking,
        message: 'success'
      },
      message: 'success'
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '未知错误'

    // 区分错误类型
    if (errorMessage.includes('不存在') || errorMessage.includes('格式不正确')) {
      return NextResponse.json(
        { error: 'resource_not_found', message: errorMessage },
        { status: 404 }
      )
    }
    if (errorMessage.includes('已为') || errorMessage.includes('合并') || errorMessage.includes('拆分')) {
      return NextResponse.json(
        { error: 'operation_conflict', message: errorMessage },
        { status: 409 }
      )
    }
    if (errorMessage.includes('缺少') || errorMessage.includes('为空') || errorMessage.includes('至少')) {
      return NextResponse.json(
        { error: 'validation_error', message: errorMessage },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'internal_error', message: `Tool执行失败：${errorMessage}` },
      { status: 500 }
    )
  }
}