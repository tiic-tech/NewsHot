'use client'

/**
 * 首页 (/)
 *
 * 展示今日摘要概览和快速导航入口
 */

import { useState, useEffect } from 'react'
import Header from '@/components/layout/header'
import { DraftDetail } from '@/lib/types/api'
import { buildApiUrl } from '@/lib/utils/api-base'
import { BulletListSkeleton, ClusterCardSkeleton } from '@/components/ui/skeleton'

// ============================================================
// 快速导航卡片
// ============================================================

function QuickNavCard({
  title,
  description,
  path,
  icon
}: {
  title: string
  description: string
  path: string
  icon: React.ReactNode
}) {
  return (
    <a
      href={path}
      className="card card-hover flex items-center gap-4 group"
      role="link"
      aria-label={title}
    >
      {/* 图标 */}
      <div className="w-12 h-12 bg-primary-50 rounded-md flex items-center justify-center text-primary-500 group-hover:bg-primary-100 transition-colors">
        {icon}
      </div>

      {/* 内容 */}
      <div className="flex-1">
        <h3 className="text-lg font-semibold text-text-primary">{title}</h3>
        <p className="text-sm text-text-secondary">{description}</p>
      </div>

      {/* 箭头 */}
      <svg
        className="w-5 h-5 text-text-tertiary group-hover:text-primary-500 transition-colors"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
      </svg>
    </a>
  )
}

// ============================================================
// 今日摘要概览卡片
// ============================================================

function TodayDigestCard({ draft }: { draft: DraftDetail | null }) {
  if (!draft) {
    return (
      <div className="card">
        <h2 className="text-xl font-semibold text-text-primary mb-2">今日摘要</h2>
        <p className="text-text-tertiary">暂无摘要，等待定时任务生成...</p>
      </div>
    )
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-text-primary">今日摘要</h2>
        <span className={`label ${draft.status === 'approved' ? 'label-success' : draft.status === 'draft' ? 'label-warning' : 'label-danger'}`}>
          {draft.status === 'approved' ? '已审核' : draft.status === 'draft' ? '待审核' : '已拒绝'}
        </span>
      </div>

      {/* 统计数据 */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div>
          <span className="text-2xl font-bold text-primary-500">{draft.totalItems}</span>
          <span className="text-xs text-text-tertiary ml-1">条新闻</span>
        </div>
        <div>
          <span className="text-2xl font-bold text-primary-500">{draft.newCount}</span>
          <span className="text-xs text-text-tertiary ml-1">新增</span>
        </div>
        <div>
          <span className="text-2xl font-bold text-primary-500">{draft.clusters.length}</span>
          <span className="text-xs text-text-tertiary ml-1">聚类</span>
        </div>
      </div>

      {/* 快速操作 */}
      {draft.status === 'draft' && (
        <a
          href={`/review/${draft.id}`}
          className="btn btn-primary inline-flex"
          aria-label="审核摘要"
        >
          开始审核
        </a>
      )}
    </div>
  )
}

// ============================================================
// 主页面组件
// ============================================================

export default function HomePage() {
  const [todayDraft, setTodayDraft] = useState<DraftDetail | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadTodayDraft()
  }, [])

  const loadTodayDraft = async () => {
    try {
      const today = new Date().toISOString().split('T')[0]
      // 尝试获取今日 draft（假设 API 支持按日期查询）
      // 这里简化处理，实际需要后端支持
      setLoading(false)
    } catch (error) {
      console.error('[HomePage] Failed to load draft:', error)
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-bg-muted">
      {/* Header */}
      <Header currentPath="/" />

      {/* 主内容区域 */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* 页面标题 */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-text-primary">NewsHot</h1>
          <p className="text-text-secondary">AI 新闻聚合与智能摘要平台</p>
        </div>

        {/* 今日摘要概览 */}
        <div className="mb-8">
          {loading ? (
            <ClusterCardSkeleton />
          ) : (
            <TodayDigestCard draft={todayDraft} />
          )}
        </div>

        {/* 快速导航 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <QuickNavCard
            title="数据源"
            description="查看今日抓取的所有数据源"
            path="/sources"
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            }
          />

          <QuickNavCard
            title="文章列表"
            description="查看今日生成的文章摘要"
            path="/articles"
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            }
          />

          <QuickNavCard
            title="审核中心"
            description="审核待处理的 Draft"
            path="/review"
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            }
          />
        </div>
      </main>
    </div>
  )
}