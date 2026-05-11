'use client'

/**
 * 数据源页面 (/sources)
 *
 * 展示数据源列表，Bullet List 形式，无点击跳转
 */

import { useState, useEffect } from 'react'
import Header from '@/components/layout/header'
import BulletList, { BulletListSkeleton } from '@/components/ui/bullet-list'
import { SourceListItem, SourcesListResponse } from '@/lib/types/api'
import { buildApiUrl } from '@/lib/utils/api-base'

// ============================================================
// 日期选择器组件
// ============================================================

function DatePicker({
  value,
  onChange
}: {
  value: string
  onChange: (date: string) => void
}) {
  return (
    <input
      type="date"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="input"
      aria-label="选择日期"
    />
  )
}

// ============================================================
// 分页组件
// ============================================================

function Pagination({
  page,
  pageSize,
  total,
  onPageChange
}: {
  page: number
  pageSize: number
  total: number
  onPageChange: (page: number) => void
}) {
  const totalPages = Math.ceil(total / pageSize)

  if (totalPages <= 1) return null

  return (
    <div className="flex items-center justify-center gap-2 mt-6">
      <button
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
        className={`btn btn-secondary ${page <= 1 ? 'opacity-50 cursor-not-allowed' : ''}`}
        aria-label="上一页"
      >
        上一页
      </button>

      <span className="text-sm text-text-secondary">
        第 {page} / {totalPages} 页
      </span>

      <button
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages}
        className={`btn btn-secondary ${page >= totalPages ? 'opacity-50 cursor-not-allowed' : ''}`}
        aria-label="下一页"
      >
        下一页
      </button>
    </div>
  )
}

// ============================================================
// 主页面组件
// ============================================================

export default function SourcesPage() {
  const [sources, setSources] = useState<SourceListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [page, setPage] = useState(1)
  const [pageSize] = useState(20)
  const [total, setTotal] = useState(0)

  // 加载数据源
  useEffect(() => {
    loadSources()
  }, [date, page])

  const loadSources = async () => {
    setLoading(true)

    try {
      const url = buildApiUrl(`/api/v1/sources?date=${date}&page=${page}&pageSize=${pageSize}`)
      const response = await fetch(url)

      if (response.ok) {
        const data: SourcesListResponse = await response.json().then(r => r.data)
        setSources(data.sources)
        setTotal(data.total)
      } else {
        setSources([])
        setTotal(0)
      }
    } catch (error) {
      console.error('[SourcesPage] Failed to load sources:', error)
      setSources([])
    }

    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-bg-muted">
      {/* Header */}
      <Header currentPath="/sources" />

      {/* 主内容区域 */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* 页面标题 */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-text-primary">数据源</h1>
          <p className="text-text-secondary">今日抓取的所有 AI 新闻数据源</p>
        </div>

        {/* 过滤器 */}
        <div className="flex items-center gap-4 mb-4">
          <label className="text-sm font-medium text-text-primary">日期筛选</label>
          <DatePicker value={date} onChange={(d) => { setDate(d); setPage(1) }} />
        </div>

        {/* 数据源列表 */}
        {loading ? (
          <BulletListSkeleton count={pageSize} />
        ) : (
          <>
            <BulletList
              sources={sources}
              loading={false}
              emptyMessage="该日期暂无数据源"
            />

            {/* 分页 */}
            <Pagination
              page={page}
              pageSize={pageSize}
              total={total}
              onPageChange={setPage}
            />
          </>
        )}
      </main>
    </div>
  )
}