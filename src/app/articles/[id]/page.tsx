'use client'

/**
 * 文章详情页面 (/articles/:id)
 *
 * 展示完整文章内容和关联 clusters
 */

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Header from '@/components/layout/header'
import MarkdownRenderer from '@/components/ui/markdown-renderer'
import ClusterCard, { ClusterCardSkeleton } from '@/components/ui/cluster-card'
import { ArticleDetail, ArticleCluster } from '@/lib/types/api'
import { buildApiUrl } from '@/lib/utils/api-base'
import { Skeleton } from '@/components/ui/skeleton'

// ============================================================
// 主页面组件
// ============================================================

export default function ArticleDetailPage() {
  const params = useParams()
  const router = useRouter()
  const articleId = params.id as string

  const [article, setArticle] = useState<ArticleDetail | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadArticle()
  }, [articleId])

  const loadArticle = async () => {
    setLoading(true)

    try {
      const response = await fetch(buildApiUrl(`/api/v1/articles/${articleId}`))

      if (response.ok) {
        const data = await response.json()
        setArticle(data.data)
      } else {
        setArticle(null)
      }
    } catch (error) {
      console.error('[ArticleDetailPage] Failed to load article:', error)
    }

    setLoading(false)
  }

  // 返回列表
  const handleBack = () => {
    router.push('/articles')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-bg-muted">
        <Header currentPath="/articles" />
        <main className="max-w-4xl mx-auto px-4 py-6">
          {/* 标题骨架 */}
          <Skeleton height={32} width="60%" className="mb-4" />
          <Skeleton height={16} width="30%" className="mb-6" />

          {/* 内容骨架 */}
          <div className="card mb-6">
            <div className="space-y-3">
              {Array.from({ length: 10 }).map((_, i) => (
                <Skeleton key={i} height={16} width={i === 9 ? '50%' : '100%'} />
              ))}
            </div>
          </div>

          {/* Clusters 骨架 */}
          <h2 className="text-xl font-semibold text-text-primary mb-4">关联 Clusters</h2>
          <div className="space-y-4">
            {Array.from({ length: 2 }).map((_, i) => (
              <ClusterCardSkeleton key={i} />
            ))}
          </div>
        </main>
      </div>
    )
  }

  if (!article) {
    return (
      <div className="min-h-screen bg-bg-muted">
        <Header currentPath="/articles" />
        <main className="max-w-4xl mx-auto px-4 py-6">
          <div className="text-center py-12">
            <p className="text-text-tertiary">文章不存在或已删除</p>
            <button onClick={handleBack} className="btn btn-primary mt-4">
              返回列表
            </button>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-bg-muted">
      {/* Header */}
      <Header currentPath="/articles" />

      {/* 主内容区域 */}
      <main className="max-w-4xl mx-auto px-4 py-6">
        {/* 返回按钮 */}
        <button
          onClick={handleBack}
          className="btn btn-secondary mb-4"
          aria-label="返回文章列表"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          返回列表
        </button>

        {/* 文章标题 */}
        <h1 className="text-3xl font-bold text-text-primary mb-4">
          {article.title}
        </h1>

        {/* 文章元信息 */}
        <div className="flex items-center gap-3 mb-6 text-sm text-text-secondary">
          <span>{new Date(article.publishTime).toLocaleDateString('zh-CN')}</span>
          <span className={`label ${article.language === 'zh' ? 'label-info' : 'label-primary'}`}>
            {article.language === 'zh' ? '中文' : article.language === 'en' ? '英文' : '双语'}
          </span>
          {article.authorName && (
            <span>作者：{article.authorName}</span>
          )}
          {article.rawUrl && (
            <a
              href={article.rawUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary-500 hover:text-primary-600"
            >
              查看原文
            </a>
          )}
        </div>

        {/* 文章摘要 */}
        <p className="text-lg text-text-secondary mb-6">
          {article.summary}
        </p>

        {/* 文章内容（Markdown） */}
        <div className="card mb-6">
          <MarkdownRenderer content={article.content} maxHeight={600} />
        </div>

        {/* 关联 Clusters */}
        {article.clusters.length > 0 && (
          <div>
            <h2 className="text-xl font-semibold text-text-primary mb-4">
              关联 Clusters
            </h2>
            <div className="space-y-4">
              {article.clusters.map((cluster) => (
                <div
                  key={cluster.id}
                  className="card border-l-4 border-primary-500"
                >
                  <h3 className="text-lg font-semibold text-text-primary mb-2">
                    {cluster.clusterTheme}
                  </h3>
                  <p className="text-text-secondary">
                    {cluster.coreInsight}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}