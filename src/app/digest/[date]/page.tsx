'use client'

/**
 * 摘要页面 (/digest/:date)
 *
 * 按日期查看 Draft，展示 Markdown 摘要和 Clusters 概览
 */

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Header from '@/components/layout/header'
import MarkdownRenderer from '@/components/ui/markdown-renderer'
import ClusterCard, { ClusterCardSkeleton } from '@/components/ui/cluster-card'
import { DraftDetail } from '@/lib/types/api'
import { buildApiUrl } from '@/lib/utils/api-base'
import { Skeleton, PageHeaderSkeleton } from '@/components/ui/skeleton'

// ============================================================
// 主页面组件
// ============================================================

export default function DigestPage() {
  const params = useParams()
  const date = params.date as string

  const [draft, setDraft] = useState<DraftDetail | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDraft()
  }, [date])

  const loadDraft = async () => {
    setLoading(true)

    try {
      // 根据日期查找 draft（假设 API 支持按日期查询）
      // 实际需要后端支持 GET /api/v1/draft?date=xxx 或类似的接口
      // 这里简化处理，展示一个占位实现

      // 模拟数据（实际应调用 API）
      setDraft(null)
    } catch (error) {
      console.error('[DigestPage] Failed to load draft:', error)
    }

    setLoading(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-bg-muted">
        <Header currentPath="/digest" />
        <main className="max-w-4xl mx-auto px-4 py-6">
          <PageHeaderSkeleton />

          {/* Markdown 内容骨架 */}
          <div className="card mb-6">
            <div className="space-y-3">
              {Array.from({ length: 15 }).map((_, i) => (
                <Skeleton key={i} height={16} width={i % 3 === 2 ? '50%' : '100%'} />
              ))}
            </div>
          </div>

          {/* Clusters 骨架 */}
          <h2 className="text-xl font-semibold text-text-primary mb-4">Clusters 概览</h2>
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <ClusterCardSkeleton key={i} />
            ))}
          </div>
        </main>
      </div>
    )
  }

  if (!draft) {
    return (
      <div className="min-h-screen bg-bg-muted">
        <Header currentPath="/digest" />
        <main className="max-w-4xl mx-auto px-4 py-6">
          <div className="text-center py-12">
            <p className="text-text-tertiary">该日期暂无摘要</p>
            <a href="/" className="btn btn-primary mt-4 inline-flex">
              返回首页
            </a>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-bg-muted">
      {/* Header */}
      <Header currentPath="/digest" />

      {/* 主内容区域 */}
      <main className="max-w-4xl mx-auto px-4 py-6">
        {/* 页面标题 */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-text-primary">
            每日摘要 - {draft.date}
          </h1>
          <div className="flex items-center gap-4 mt-2 text-sm text-text-secondary">
            <span className={`label ${draft.status === 'approved' ? 'label-success' : draft.status === 'draft' ? 'label-warning' : 'label-danger'}`}>
              {draft.status === 'approved' ? '已审核' : draft.status === 'draft' ? '待审核' : '已拒绝'}
            </span>
            <span>语言：{draft.language}</span>
            <span>总计：{draft.totalItems} 条新闻</span>
          </div>
        </div>

        {/* Markdown 摘要内容 */}
        {draft.content && (
          <div className="card mb-6">
            <MarkdownRenderer content={draft.content} maxHeight={800} showToc />
          </div>
        )}

        {/* Clusters 概览 */}
        {draft.clusters.length > 0 && (
          <div>
            <h2 className="text-xl font-semibold text-text-primary mb-4">
              Clusters 概览
            </h2>
            <div className="space-y-4">
              {draft.clusters.map((cluster) => (
                <ClusterCard
                  key={cluster.id}
                  cluster={cluster}
                  defaultExpanded={false}
                />
              ))}
            </div>
          </div>
        )}

        {/* 统计信息 */}
        <div className="mt-6 card bg-bg-muted">
          <h3 className="text-lg font-semibold text-text-primary mb-3">统计信息</h3>
          <div className="grid grid-cols-4 gap-4">
            <div className="text-center">
              <span className="text-2xl font-bold text-primary-500">{draft.totalItems}</span>
              <span className="text-xs text-text-tertiary block">总新闻数</span>
            </div>
            <div className="text-center">
              <span className="text-2xl font-bold text-success-500">{draft.newCount}</span>
              <span className="text-xs text-text-tertiary block">新增</span>
            </div>
            <div className="text-center">
              <span className="text-2xl font-bold text-warning-500">{draft.duplicateCount}</span>
              <span className="text-xs text-text-tertiary block">重复</span>
            </div>
            <div className="text-center">
              <span className="text-2xl font-bold text-info-500">{draft.clusters.length}</span>
              <span className="text-xs text-text-tertiary block">聚类数</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}