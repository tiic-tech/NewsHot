'use client'

/**
 * Bullet List 组件
 *
 * 用于展示数据源列表（F11）和文章列表（F12）
 * 样式严格遵循 DESIGN_SYSTEM.md 规范
 */

import { SourceListItem, ArticleListItem, Platform, ContentType } from '@/lib/types/api'
import { formatPublishTime, formatPlatform, getContentTypeColor } from '@/lib/utils/format'

// ============================================================
// 类型定义
// ============================================================

export interface BulletListProps {
  /** 数据源列表（F11场景） */
  sources?: SourceListItem[]
  /** 文章列表（F12场景） */
  articles?: ArticleListItem[]
  /** 是否支持点击跳转（文章场景） */
  clickable?: boolean
  /** 点击回调（文章场景） */
  onItemClick?: (id: string) => void
  /** 加载状态 */
  loading?: boolean
  /** 空状态提示 */
  emptyMessage?: string
}

// ============================================================
// 子组件：BulletItem
// ============================================================

interface BulletItemProps {
  title: string
  summary: string
  publishTime?: string | null
  authorName?: string | null
  platform?: Platform | null
  contentType?: ContentType
  importanceScore?: number
  rawUrl?: string | null
  coreInsights?: string
  clickable?: boolean
  onClick?: () => void
}

function BulletItem({
  title,
  summary,
  publishTime,
  authorName,
  platform,
  contentType,
  importanceScore,
  rawUrl,
  coreInsights,
  clickable = false,
  onClick
}: BulletItemProps) {
  // 点击区域最小高度 44px
  const handleClick = () => {
    if (clickable && onClick) {
      onClick()
    }
  }

  // 键盘导航支持
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (clickable && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault()
      onClick?.()
    }
  }

  return (
    <div
      className={`
        card card-hover
        ${clickable ? 'cursor-pointer focus-visible:ring-2 focus-visible:ring-primary-500' : ''}
      `}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      role={clickable ? 'button' : 'article'}
      tabIndex={clickable ? 0 : -1}
      aria-label={clickable ? `查看文章：${title}` : undefined}
    >
      {/* 标题行 - 最小高度44px */}
      <div className="flex items-start justify-between min-h-[44px]">
        <h3 className="text-lg font-semibold text-text-primary line-clamp-2 flex-1">
          {title}
        </h3>

        {/* 重要性评分（仅数据源） */}
        {importanceScore !== undefined && (
          <div className="flex items-center gap-1 ml-2 shrink-0">
            <span className="text-xs text-text-tertiary">重要度</span>
            <span className="text-sm font-medium text-primary-600">
              {importanceScore}/10
            </span>
          </div>
        )}
      </div>

      {/* 作者/平台/时间信息 */}
      <div className="flex items-center gap-3 mt-2 text-sm text-text-secondary">
        {authorName && (
          <span className="font-medium">{authorName}</span>
        )}

        {platform && (
          <span className="label label-primary">
            {formatPlatform(platform)}
          </span>
        )}

        {contentType && (
          <span className={`label ${getContentTypeColor(contentType)}`}>
            {contentType}
          </span>
        )}

        {publishTime && (
          <span className="text-xs text-text-tertiary">
            {formatPublishTime(publishTime)}
          </span>
        )}
      </div>

      {/* 摘要/摘要 */}
      <p className="mt-3 text-base text-text-secondary line-clamp-3">
        {summary}
      </p>

      {/* 核心洞察（仅数据源） */}
      {coreInsights && (
        <div className="mt-3 text-sm font-medium text-primary-700 line-clamp-2">
          {coreInsights}
        </div>
      )}

      {/* 原文链接（仅数据源） */}
      {rawUrl && (
        <div className="mt-3">
          <a
            href={rawUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-primary-500 hover:text-primary-600 underline"
            onClick={(e) => e.stopPropagation()} // 阻止冒泡，避免触发卡片点击
          >
            查看原文
          </a>
        </div>
      )}
    </div>
  )
}

// ============================================================
// 主组件：BulletList
// ============================================================

export default function BulletList({
  sources,
  articles,
  clickable = false,
  onItemClick,
  loading = false,
  emptyMessage = '暂无数据'
}: BulletListProps) {
  // 加载状态
  if (loading) {
    return <BulletListSkeleton count={5} />
  }

  // 空状态
  const hasData = (sources && sources.length > 0) || (articles && articles.length > 0)
  if (!hasData) {
    return (
      <div className="text-center py-12">
        <p className="text-text-tertiary">{emptyMessage}</p>
      </div>
    )
  }

  // 渲染数据源列表
  if (sources) {
    return (
      <div
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
        role="list"
        aria-label="数据源列表"
      >
        {sources.map((source) => (
          <BulletItem
            key={source.id}
            title={source.title}
            summary={source.abstract}
            publishTime={source.publishTime}
            authorName={source.authorName}
            platform={source.platform}
            contentType={source.contentType}
            importanceScore={source.importanceScore}
            rawUrl={source.rawUrl}
            coreInsights={source.coreInsights}
            clickable={false}
          />
        ))}
      </div>
    )
  }

  // 渲染文章列表
  if (articles) {
    return (
      <div
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
        role="list"
        aria-label="文章列表"
      >
        {articles.map((article) => (
          <BulletItem
            key={article.id}
            title={article.title}
            summary={article.summary}
            publishTime={article.publishTime}
            authorName={article.authorName}
            platform={article.platform as Platform}
            clickable={clickable}
            onClick={() => onItemClick?.(article.id)}
          />
        ))}
      </div>
    )
  }

  return null
}

// ============================================================
// Skeleton 加载组件
// ============================================================

export function BulletListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="card">
          {/* 标题骨架 */}
          <div className="skeleton h-6 w-3/4 rounded" />

          {/* 作者信息骨架 */}
          <div className="flex gap-2 mt-2">
            <div className="skeleton h-4 w-20 rounded" />
            <div className="skeleton h-4 w-16 rounded" />
          </div>

          {/* 摘要骨架 */}
          <div className="mt-3 space-y-2">
            <div className="skeleton h-4 w-full rounded" />
            <div className="skeleton h-4 w-2/3 rounded" />
          </div>
        </div>
      ))}
    </div>
  )
}