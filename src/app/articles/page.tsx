'use client'

/**
 * 文章列表页面 (/articles)
 *
 * 展示文章列表，复用 Bullet List 组件，支持点击跳转
 */

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Header from '@/components/layout/header'
import BulletList, { BulletListSkeleton } from '@/components/ui/bullet-list'
import { ArticleListItem, ArticlesListResponse, OutputLanguage } from '@/lib/types/api'
import { buildApiUrl } from '@/lib/utils/api-base'

// ============================================================
// 语言选择器组件
// ============================================================

function LanguageFilter({
  value,
  onChange
}: {
  value: OutputLanguage
  onChange: (lang: OutputLanguage) => void
}) {
  const options: { value: OutputLanguage; label: string }[] = [
    { value: 'zh', label: '中文' },
    { value: 'en', label: '英文' },
    { value: 'zh-en', label: '中英双语' },
    { value: 'en-zh', label: '英中双语' }
  ]

  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as OutputLanguage)}
      className="input"
      aria-label="语言筛选"
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  )
}

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

export default function ArticlesPage() {
  const router = useRouter()
  const [articles, setArticles] = useState<ArticleListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [language, setLanguage] = useState<OutputLanguage>('zh')
  const [page, setPage] = useState(1)
  const [pageSize] = useState(20)
  const [total, setTotal] = useState(0)

  // 加载文章
  useEffect(() => {
    loadArticles()
  }, [date, language, page])

  const loadArticles = async () => {
    setLoading(true)

    try {
      const url = buildApiUrl(`/api/v1/articles?date=${date}&language=${language}&page=${page}&pageSize=${pageSize}`)
      const response = await fetch(url)

      if (response.ok) {
        const data: ArticlesListResponse = await response.json().then(r => r.data)
        setArticles(data.articles)
        setTotal(data.total)
      } else {
        setArticles([])
        setTotal(0)
      }
    } catch (error) {
      console.error('[ArticlesPage] Failed to load articles:', error)
      setArticles([])
    }

    setLoading(false)
  }

  // 点击跳转
  const handleItemClick = (id: string) => {
    router.push(`/articles/${id}`)
  }

  return (
    <div className="min-h-screen bg-bg-muted">
      {/* Header */}
      <Header currentPath="/articles" />

      {/* 主内容区域 */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* 页面标题 */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-text-primary">文章列表</h1>
          <p className="text-text-secondary">今日生成的 AI 新闻文章摘要</p>
        </div>

        {/* 过滤器 */}
        <div className="flex items-center gap-4 mb-4">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-text-primary">日期</label>
            <DatePicker value={date} onChange={(d) => { setDate(d); setPage(1) }} />
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-text-primary">语言</label>
            <LanguageFilter value={language} onChange={(l) => { setLanguage(l); setPage(1) }} />
          </div>
        </div>

        {/* 文章列表 */}
        {loading ? (
          <BulletListSkeleton count={pageSize} />
        ) : (
          <>
            <BulletList
              articles={articles}
              clickable
              onItemClick={handleItemClick}
              loading={false}
              emptyMessage="该日期暂无文章"
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