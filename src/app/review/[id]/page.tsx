'use client'

/**
 * 审核页面 (/review/:id)
 *
 * 展示 Draft 详情，Clusters 按重要性排序，集成 Chatbot 交互
 */

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Header from '@/components/layout/header'
import Sidebar from '@/components/layout/sidebar'
import ClusterCard, { ClusterCardSkeleton } from '@/components/ui/cluster-card'
import { DraftDetail, DraftCluster } from '@/lib/types/api'
import { useDraft } from '@/hooks/use-draft'
import { buildApiUrl } from '@/lib/utils/api-base'
import { PageHeaderSkeleton } from '@/components/ui/skeleton'

// ============================================================
// 主页面组件
// ============================================================

export default function ReviewPage() {
  const params = useParams()
  const router = useRouter()
  const draftId = params.id as string

  const { draft, loading, approving, approveDraft, error } = useDraft()

  useEffect(() => {
    loadDraft()
  }, [draftId])

  const loadDraft = async () => {
    try {
      const response = await fetch(buildApiUrl(`/api/v1/draft/${draftId}`))

      if (response.ok) {
        const data = await response.json()
        // 这里需要手动设置 draft，因为 useDraft 的 loadDraft 需要被调用
        // 实际使用时应该直接调用 useDraft().loadDraft(draftId)
      }
    } catch (error) {
      console.error('[ReviewPage] Failed to load draft:', error)
    }
  }

  // 审核通过
  const handleApprove = async () => {
    const success = await approveDraft(draftId)
    if (success) {
      // 跳转到摘要页面
      router.push(`/digest/${draft?.date || new Date().toISOString().split('T')[0]}`)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-bg-muted">
        <Header currentPath="/review" />
        <main className="max-w-7xl mx-auto px-4 py-6">
          <PageHeaderSkeleton />
          <div className="grid grid-cols-3 gap-6">
            <div className="col-span-2 space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <ClusterCardSkeleton key={i} />
              ))}
            </div>
            <div>
              {/* Sidebar skeleton */}
              <div className="h-[600px] bg-bg-subtle border border-border-default rounded-lg" />
            </div>
          </div>
        </main>
      </div>
    )
  }

  if (!draft) {
    return (
      <div className="min-h-screen bg-bg-muted">
        <Header currentPath="/review" />
        <main className="max-w-7xl mx-auto px-4 py-6">
          <div className="text-center py-12">
            <p className="text-text-tertiary">Draft 不存在或已删除</p>
            <button
              onClick={() => router.push('/')}
              className="btn btn-primary mt-4"
            >
              返回首页
            </button>
          </div>
        </main>
      </div>
    )
  }

  // 按重要性排序 clusters
  const sortedClusters = [...draft.clusters].sort(
    (a, b) => b.clusterImportance - a.clusterImportance
  )

  return (
    <div className="min-h-screen bg-bg-muted">
      {/* Header */}
      <Header currentPath="/review" />

      {/* 主内容区域 */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* 页面标题 */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-text-primary">
            审核 Draft - {draft.date}
          </h1>
          <div className="flex items-center gap-4 mt-2 text-sm text-text-secondary">
            <span>状态：{draft.status}</span>
            <span>语言：{draft.language}</span>
            <span>总计：{draft.totalItems} 条新闻</span>
            <span>新增：{draft.newCount} 条</span>
          </div>
        </div>

        {/* 双栏布局 */}
        <div className="grid grid-cols-3 gap-6">
          {/* 左栏：Clusters 列表 */}
          <div className="col-span-2 space-y-4">
            {sortedClusters.map((cluster) => (
              <ClusterCard
                key={cluster.id}
                cluster={cluster}
                defaultExpanded={cluster.clusterImportance >= 8}
              />
            ))}
          </div>

          {/* 右栏：Sidebar（Chatbot 交互） */}
          <div className="h-[600px]">
            <Sidebar
              draftId={draftId}
              onApprove={handleApprove}
            />
          </div>
        </div>

        {/* 错误提示 */}
        {error && (
          <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-danger-50 border border-danger-500 text-danger-600 px-4 py-2 rounded-md">
            {error}
          </div>
        )}
      </main>
    </div>
  )
}