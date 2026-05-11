/**
 * Tools Types
 *
 * 14 个 Tool 的参数和返回类型定义，与 API_CONTRACT.md 完全一致
 */

// ============================================================
// Tool 1: list_clusters
// ============================================================

export interface ListClustersParams {
  draftId: string
}

export interface ListClustersResult {
  clusters: {
    id: string
    clusterTheme: string
    coreInsight: string
    clusterImportance: number
    itemsCount: number
  }[]
  totalClusters: number
}

// ============================================================
// Tool 2: get_cluster_detail
// ============================================================

export interface GetClusterDetailParams {
  clusterId: string
}

export interface GetClusterDetailResult {
  cluster: {
    id: string
    clusterTheme: string
    coreInsight: string
    clusterImportance: number
    viewpointConflict: string | null
    suggestedAngle: string | null
    items: {
      id: string
      sourceName: string
      sourceUrl: string
      viewpointSummary: string
      viewpointStance: string
    }[]
  }
}

// ============================================================
// Tool 3: edit_cluster_insight
// ============================================================

export interface EditClusterInsightParams {
  clusterId: string
  newInsight: string
}

export interface EditClusterInsightResult {
  clusterId: string
  updatedInsight: string
  message: string
}

// ============================================================
// Tool 4: delete_item
// ============================================================

export interface DeleteItemParams {
  itemId: string
}

export interface DeleteItemResult {
  deletedItemId: string
  affectedClusterId: string
  remainingItemsCount: number
  message: string
}

// ============================================================
// Tool 5: edit_item_summary
// ============================================================

export interface EditItemSummaryParams {
  itemId: string
  newSummary: string
}

export interface EditItemSummaryResult {
  itemId: string
  updatedSummary: string
  message: string
}

// ============================================================
// Tool 6: merge_clusters
// ============================================================

export interface MergeClustersParams {
  clusterIds: string[]
  newTheme: string
}

export interface MergeClustersResult {
  mergedClusterId: string
  newTheme: string
  mergedItemsCount: number
  deletedClusterIds: string[]
  message: string
}

// ============================================================
// Tool 7: approve_draft
// ============================================================

export interface ApproveDraftParams {
  draftId: string
}

export interface ApproveDraftResult {
  draftId: string
  status: 'approved'
  approvedAt: string
  pipelineTriggered: boolean
  message: string
}

// ============================================================
// Tool 8: add_item
// ============================================================

export interface AddItemParams {
  clusterId: string
  itemData: {
    sourceName: string
    sourceUrl: string
    viewpointSummary: string
    viewpointStance?: string
  }
}

export interface AddItemResult {
  addedItemId: string
  clusterId: string
  message: string
}

// ============================================================
// Tool 9: regenerate_draft
// ============================================================

export interface RegenerateDraftParams {
  draftId: string
}

export interface RegenerateDraftResult {
  draftId: string
  regenerationStarted: boolean
  estimatedCompletionTime: string
  message: string
}

// ============================================================
// Tool 10: reorder_items
// ============================================================

export interface ReorderItemsParams {
  clusterId: string
  itemOrder: string[]
}

export interface ReorderItemsResult {
  clusterId: string
  newOrder: string[]
  message: string
}

// ============================================================
// Tool 11: split_cluster
// ============================================================

export interface SplitClusterParams {
  clusterId: string
  splitGroups: {
    itemIds: string[]
    newTheme: string
  }[]
}

export interface SplitClusterResult {
  newClusterIds: string[]
  deletedClusterId: string
  message: string
}

// ============================================================
// Tool 12: list_items
// ============================================================

export interface ListItemsParams {
  clusterId: string
}

export interface ListItemsResult {
  items: {
    id: string
    sourceName: string
    sourceUrl: string
    viewpointSummary: string
    viewpointStance: string
  }[]
  totalItems: number
}

// ============================================================
// Tool 13: get_item_detail
// ============================================================

export interface GetItemDetailParams {
  itemId: string
}

export interface GetItemDetailResult {
  item: {
    id: string
    sourceName: string
    sourceUrl: string
    viewpointSummary: string
    viewpointStance: string
    contentType: string
    importanceScore: number
    keyEntities: string[] | null
    hashtags: string[] | null
    visualPotential: string | null
    rawTranscript: string | null
  }
}

// ============================================================
// Tool 14: delete_cluster
// ============================================================

export interface DeleteClusterParams {
  clusterId: string
}

export interface DeleteClusterResult {
  deletedClusterId: string
  deletedItemsCount: number
  affectedDraftId: string
  message: string
}

// ============================================================
// Tool Name 枚举
// ============================================================

export type ToolName =
  | 'list_clusters'
  | 'get_cluster_detail'
  | 'edit_cluster_insight'
  | 'delete_item'
  | 'edit_item_summary'
  | 'merge_clusters'
  | 'approve_draft'
  | 'add_item'
  | 'regenerate_draft'
  | 'reorder_items'
  | 'split_cluster'
  | 'list_items'
  | 'get_item_detail'
  | 'delete_cluster'

// ============================================================
// Tool 参数和返回类型映射
// ============================================================

export interface ToolParamsMap {
  list_clusters: ListClustersParams
  get_cluster_detail: GetClusterDetailParams
  edit_cluster_insight: EditClusterInsightParams
  delete_item: DeleteItemParams
  edit_item_summary: EditItemSummaryParams
  merge_clusters: MergeClustersParams
  approve_draft: ApproveDraftParams
  add_item: AddItemParams
  regenerate_draft: RegenerateDraftParams
  reorder_items: ReorderItemsParams
  split_cluster: SplitClusterParams
  list_items: ListItemsParams
  get_item_detail: GetItemDetailParams
  delete_cluster: DeleteClusterParams
}

export interface ToolResultMap {
  list_clusters: ListClustersResult
  get_cluster_detail: GetClusterDetailResult
  edit_cluster_insight: EditClusterInsightResult
  delete_item: DeleteItemResult
  edit_item_summary: EditItemSummaryResult
  merge_clusters: MergeClustersResult
  approve_draft: ApproveDraftResult
  add_item: AddItemResult
  regenerate_draft: RegenerateDraftResult
  reorder_items: ReorderItemsResult
  split_cluster: SplitClusterResult
  list_items: ListItemsResult
  get_item_detail: GetItemDetailResult
  delete_cluster: DeleteClusterResult
}