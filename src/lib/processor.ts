/**
 * Processor Service（Cluster 聚合 + 摘要生成）
 *
 * 基于 Embedding 相似度进行 Cluster 聚合
 * 使用 LLM 生成摘要
 * 创建 Draft 流程
 */

import { getSupabaseClientService, getCurrentProjectId } from './supabase'
import { getLLMAdapter, ChatMessage, LLMResponse } from './llm-adapter'
import { cosineSimilarity, parseVectorString, VECTOR_DIMENSION, generateEmbedding } from './embedding'
import { incrementBatchStats, getRedisClient } from './redis'
import { NewsItem, Cluster, ClusterRef, DraftInsert } from './types/db'

// ============================================================
// 常量配置
// ============================================================

/**
 * Cluster 聚合相似度阈值
 * 相似度 > 0.7 认为属于同一 Cluster
 */
export const CLUSTER_SIMILARITY_THRESHOLD = 0.7

/**
 * Cluster 最小条目数
 * 条目数 >= 2 才形成 Cluster
 */
export const CLUSTER_MIN_ITEMS = 2

/**
 * LLM 并发限制
 * 同时最多 5 个 LLM 调用
 */
export const LLM_CONCURRENT_LIMIT = 5

// ============================================================
// 类型定义
// ============================================================

export interface ClusterInput {
  items: NewsItem[]
  date: string
}

export interface ClusterResult {
  clusters: Cluster[]
  unclusteredItems: NewsItem[]
  totalClusters: number
  totalItems: number
}

export interface DraftGenerationInput {
  clusters: Cluster[]
  date: string
  language: string
}

export interface DraftGenerationResult {
  draftId: string
  status: string
  content: string
  totalClusters: number
}

// ============================================================
// Cluster 聚合算法
// ============================================================

/**
 * 基于 Embedding 相似度的 Cluster 聚合
 *
 * 使用阈值聚类算法：
 * 1. 对每个 item 计算与其他 item 的相似度
 * 2. 相似度 > threshold 的 item 归入同一 cluster
 * 3. 使用贪心策略，从重要性最高的 item 开始聚类
 *
 * @param items News Item 数组（含 embedding）
 * @returns ClusterResult
 */
export async function clusterItems(items: NewsItem[]): Promise<ClusterResult> {
  if (items.length === 0) {
    return {
      clusters: [],
      unclusteredItems: [],
      totalClusters: 0,
      totalItems: 0
    }
  }

  // 过滤有 embedding 的 items
  const itemsWithEmbedding = items.filter(item => item.embedding)

  if (itemsWithEmbedding.length < CLUSTER_MIN_ITEMS) {
    return {
      clusters: [],
      unclusteredItems: items,
      totalClusters: 0,
      totalItems: items.length
    }
  }

  // 解析 embedding 向量
  const vectors: { item: NewsItem; vector: number[] }[] = []
  for (const item of itemsWithEmbedding) {
    const vector = parseVectorString(item.embedding)
    if (vector && vector.length === VECTOR_DIMENSION) {
      vectors.push({ item, vector })
    }
  }

  if (vectors.length < CLUSTER_MIN_ITEMS) {
    return {
      clusters: [],
      unclusteredItems: items,
      totalClusters: 0,
      totalItems: items.length
    }
  }

  // 按重要性排序（降序）
  vectors.sort((a, b) => b.item.importance_score - a.item.importance_score)

  // 聚类算法（贪心策略）
  const clusters: { items: NewsItem[]; theme: string }[] = []
  const clusteredIds = new Set<string>()

  for (let i = 0; i < vectors.length; i++) {
    if (clusteredIds.has(vectors[i].item.id)) continue

    // 创建新 cluster
    const clusterItems: NewsItem[] = [vectors[i].item]
    clusteredIds.add(vectors[i].item.id)

    // 查找相似 items
    for (let j = i + 1; j < vectors.length; j++) {
      if (clusteredIds.has(vectors[j].item.id)) continue

      const similarity = cosineSimilarity(vectors[i].vector, vectors[j].vector)

      if (similarity >= CLUSTER_SIMILARITY_THRESHOLD) {
        clusterItems.push(vectors[j].item)
        clusteredIds.add(vectors[j].item.id)
      }
    }

    // 只有条目数 >= 2 才形成 cluster
    if (clusterItems.length >= CLUSTER_MIN_ITEMS) {
      // 生成 cluster 主题（使用第一个 item 的标题）
      const theme = generateClusterTheme(clusterItems)
      clusters.push({ items: clusterItems, theme })
    }
  }

  // 未聚类的 items
  const unclusteredItems = items.filter(item => !clusteredIds.has(item.id))

  // 构建 Cluster 对象
  const supabase = getSupabaseClientService()
  const projectId = await getCurrentProjectId(supabase)

  const clusterObjects: Cluster[] = clusters.map((cluster, index) => ({
    id: '', // 待插入后生成
    project_id: projectId || '',
    draft_id: null,
    date: cluster.items[0].date,
    cluster_theme: cluster.theme,
    core_insight: '', // 待 LLM 生成
    cluster_refs: cluster.items.map(item => ({
      item_id: item.id,
      source_name: item.source_name,
      source_url: item.source_url,
      viewpoint_summary: item.summary,
      viewpoint_stance: '' // 待 LLM 分析
    })),
    viewpoint_conflict: null,
    cluster_importance: Math.round(cluster.items.reduce((sum, item) => sum + item.importance_score, 0) / cluster.items.length),
    suggested_angle: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    deleted_at: null
  }))

  return {
    clusters: clusterObjects,
    unclusteredItems,
    totalClusters: clusterObjects.length,
    totalItems: items.length
  }
}

/**
 * 生成 Cluster 主题
 *
 * 使用 LLM 生成吸引人的标题
 *
 * @param items Cluster 中的 News Items
 * @returns Cluster 主题
 */
function generateClusterTheme(items: NewsItem[]): string {
  // 使用最重要的 item 的标题作为初步主题
  // 后续通过 LLM 生成更好的主题
  if (items.length === 0) return 'Unknown Theme'

  // 合并标题关键词
  const titles = items.slice(0, 3).map(item => item.title)
  return titles.join(' | ').slice(0, 100)
}

// ============================================================
// LLM 摘要生成
// ============================================================

/**
 * 使用 LLM 生成 Cluster 核心洞察
 *
 * @param cluster Cluster 对象
 * @param items Cluster 中的 News Items
 * @returns 核心洞察文本
 */
export async function generateClusterInsight(
  cluster: Cluster,
  items: NewsItem[]
): Promise<string> {
  if (items.length === 0) return ''

  const llmAdapter = getLLMAdapter()

  // 构建 Prompt
  const systemPrompt = `你是一个专业的新闻分析师，擅长从多条相关新闻中提炼核心洞察。

请分析以下新闻条目，生成 2-3 句话的核心洞察总结。
洞察应该：
1. 揭示事件的本质和意义
2. 指出关键观点的冲突或共识
3. 提供独特的视角或建议

输出格式要求：
- 使用中文
- 2-3 句话
- 简洁有力，避免废话`

  const itemsContent = items.map(item =>
    `【${item.source_name}】${item.title}\n摘要：${item.summary}`
  ).join('\n\n')

  const userPrompt = `新闻条目：\n${itemsContent}\n\n请生成核心洞察。`

  const messages: ChatMessage[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt }
  ]

  try {
    const response = await llmAdapter.chat(messages)
    return response.content.trim()
  } catch (error) {
    console.error('[processor] Failed to generate cluster insight:', error)
    return '生成洞察失败，请手动编辑'
  }
}

/**
 * 批量生成 Clusters 洞察（并发限制）
 *
 * @param clusters Cluster 数组（含 items）
 * @param itemsMap NewsItem ID -> NewsItem 映射
 * @returns 更新后的 Cluster 数组（含 core_insight）
 */
export async function generateClusterInsights(
  clusters: Cluster[],
  itemsMap: Map<string, NewsItem>
): Promise<Cluster[]> {
  if (clusters.length === 0) return clusters

  // 使用 Promise.allSettled 并发调用（限制并发数）
  const batchSize = LLM_CONCURRENT_LIMIT
  const updatedClusters: Cluster[] = []

  for (let i = 0; i < clusters.length; i += batchSize) {
    const batch = clusters.slice(i, i + batchSize)

    // 获取每个 cluster 的 items
    const batchWithItems = batch.map(cluster => {
      const items = cluster.cluster_refs
        .map(ref => itemsMap.get(ref.item_id))
        .filter((item): item is NewsItem => item !== undefined)
      return { cluster, items }
    })

    // 并发生成洞察
    const results = await Promise.allSettled(
      batchWithItems.map(({ cluster, items }) =>
        generateClusterInsight(cluster, items)
      )
    )

    // 更新 cluster
    for (let j = 0; j < batch.length; j++) {
      const result = results[j]
      const cluster = batch[j]

      if (result.status === 'fulfilled') {
        cluster.core_insight = result.value
      } else {
        cluster.core_insight = '生成洞察失败，请手动编辑'
      }

      updatedClusters.push(cluster)
    }
  }

  return updatedClusters
}

// ============================================================
// Draft 创建流程
// ============================================================

/**
 * 创建 Draft
 *
 * @param clusters Cluster 数组
 * @param date 日期
 * @param language 语言
 * @param totalItems 总条目数
 * @param newCount 新条目数
 * @param duplicateCount 重复条目数
 * @returns Draft ID
 */
export async function createDraft(
  clusters: Cluster[],
  date: string,
  language: string,
  totalItems: number,
  newCount: number,
  duplicateCount: number
): Promise<string> {
  const supabase = getSupabaseClientService()
  const projectId = await getCurrentProjectId(supabase)

  if (!projectId) {
    throw new Error('Project ID not found')
  }

  // 1. 先插入 Clusters（不含 draft_id）
  const clusterInserts = clusters.map(cluster => ({
    project_id: projectId,
    date,
    cluster_theme: cluster.cluster_theme,
    core_insight: cluster.core_insight,
    cluster_refs: cluster.cluster_refs,
    viewpoint_conflict: cluster.viewpoint_conflict,
    cluster_importance: cluster.cluster_importance,
    suggested_angle: cluster.suggested_angle
  }))

  const { data: insertedClusters, error: clusterError } = await supabase
    .from('clusters')
    .insert(clusterInserts)
    .select('id')

  if (clusterError) {
    console.error('[processor] Failed to insert clusters:', clusterError)
    throw clusterError
  }

  const clusterIds = (insertedClusters || []).map(c => c.id)

  // 2. 插入 Draft
  const draftInsert: DraftInsert = {
    project_id: projectId,
    date,
    status: 'draft',
    language,
    total_items: totalItems,
    new_count: newCount,
    duplicate_count: duplicateCount,
    clusters: clusterIds,
    content: null // 待后续生成
  }

  const { data: insertedDraft, error: draftError } = await supabase
    .from('drafts')
    .insert(draftInsert)
    .select('id')
    .single()

  if (draftError) {
    console.error('[processor] Failed to insert draft:', draftError)
    throw draftError
  }

  const draftId = insertedDraft?.id || ''

  // 3. 更新 Clusters 的 draft_id
  const updatePromises = clusterIds.map(clusterId =>
    supabase
      .from('clusters')
      .update({ draft_id: draftId })
      .eq('id', clusterId)
  )

  await Promise.all(updatePromises)

  // 4. 更新统计
  const redis = getRedisClient()
  await incrementBatchStats(redis, date, 'clustersCount', clusters.length)

  return draftId
}

// ============================================================
// 完整处理流水线
// ============================================================

/**
 * 完整处理流水线
 *
 * 1. 查询 News Items
 * 2. Cluster 聚合
 * 3. 生成洞察
 * 4. 创建 Draft
 *
 * @param date 日期
 * @param language 语言
 * @returns Draft ID 和统计信息
 */
export async function runProcessorPipeline(
  date: string,
  language: string = 'zh'
): Promise<{
  draftId: string
  totalItems: number
  clustersCount: number
  totalTimeMs: number
}> {
  const startTime = Date.now()

  console.log(`[processor] Starting processor pipeline for ${date}`)

  const supabase = getSupabaseClientService()
  const projectId = await getCurrentProjectId(supabase)

  if (!projectId) {
    throw new Error('Project ID not found')
  }

  // 1. 查询当天的 News Items（含 embedding）
  const { data: items, error: itemsError } = await supabase
    .from('news_items')
    .select('*')
    .eq('project_id', projectId)
    .eq('date', date)
    .is('deleted_at', null)
    .not('embedding', 'is', null)

  if (itemsError) {
    console.error('[processor] Failed to query news items:', itemsError)
    throw itemsError
  }

  console.log(`[processor] Found ${items?.length || 0} items with embedding`)

  if (!items || items.length === 0) {
    return {
      draftId: '',
      totalItems: 0,
      clustersCount: 0,
      totalTimeMs: Date.now() - startTime
    }
  }

  // 2. Cluster 聚合
  const clusterResult = await clusterItems(items)

  console.log(`[processor] Clustered into ${clusterResult.totalClusters} clusters`)

  if (clusterResult.clusters.length === 0) {
    return {
      draftId: '',
      totalItems: items.length,
      clustersCount: 0,
      totalTimeMs: Date.now() - startTime
    }
  }

  // 3. 构建 items 映射
  const itemsMap = new Map<string, NewsItem>()
  for (const item of items) {
    itemsMap.set(item.id, item)
  }

  // 4. 生成 Cluster 洞察
  const clustersWithInsight = await generateClusterInsights(
    clusterResult.clusters,
    itemsMap
  )

  console.log(`[processor] Generated insights for ${clustersWithInsight.length} clusters`)

  // 5. 创建 Draft
  const draftId = await createDraft(
    clustersWithInsight,
    date,
    language,
    items.length,
    items.length, // 假设所有都是新的（Fetcher 已去重）
    0
  )

  console.log(`[processor] Created draft ${draftId}`)

  const totalTimeMs = Date.now() - startTime

  return {
    draftId,
    totalItems: items.length,
    clustersCount: clustersWithInsight.length,
    totalTimeMs
  }
}