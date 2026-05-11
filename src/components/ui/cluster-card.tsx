'use client'

/**
 * Cluster Card 组件
 *
 * 用于展示 Cluster 聚合主题单元
 * 样式严格遵循 DESIGN_SYSTEM.md 规范
 */

import { useState } from 'react'
import { DraftCluster, ClusterItem } from '@/lib/types/api'

// ============================================================
// 类型定义
// ============================================================

export interface ClusterCardProps {
  /** Cluster 数据 */
  cluster: DraftCluster
  /** 是否默认展开 */
  defaultExpanded?: boolean
  /** Item 点击回调 */
  onItemClick?: (item: ClusterItem) => void
  /** 编辑核心洞察回调 */
  onEditInsight?: (clusterId: string, newInsight: string) => void
}

// ============================================================
// 子组件：ClusterItemView
// ============================================================

function ClusterItemView({
  item,
  onClick
}: {
  item: ClusterItem
  onClick?: () => void
}) {
  return (
    <div
      className="py-2 px-3 bg-bg-muted rounded border border-border-muted hover:border-border-emphasis transition-colors"
      role="article"
      aria-label={`观点来源：${item.sourceName}`}
    >
      {/* 来源信息 */}
      <div className="flex items-center gap-2 text-xs text-text-secondary">
        <span className="font-medium">{item.sourceName}</span>
        {item.viewpointStance && (
          <span className="label label-info">{item.viewpointStance}</span>
        )}
      </div>

      {/* 观点摘要 */}
      <p className="mt-1 text-sm text-text-primary line-clamp-2">
        {item.viewpointSummary}
      </p>

      {/* 原文链接 */}
      <a
        href={item.sourceUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-1 text-xs text-primary-500 hover:text-primary-600 inline-block"
      >
        查看原文
      </a>
    </div>
  )
}

// ============================================================
// 主组件：ClusterCard
// ============================================================

export default function ClusterCard({
  cluster,
  defaultExpanded = false,
  onItemClick,
  onEditInsight
}: ClusterCardProps) {
  const [expanded, setExpanded] = useState(defaultExpanded)

  // 展开折叠处理
  const handleToggle = () => {
    setExpanded(!expanded)
  }

  // 键盘导航
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      handleToggle()
    }
  }

  return (
    <div
      className={`
        bg-bg-base border border-border-default rounded-md
        shadow-default transition-all duration-200 ease-out
        ${expanded ? 'shadow-md' : ''}
      `}
      role="article"
      aria-expanded={expanded}
      aria-label={`Cluster：${cluster.clusterTheme}`}
    >
      {/* 左侧主色竖条 */}
      <div className="flex">
        <div
          className={`
            w-[3px] rounded-l-md transition-colors duration-150
            ${expanded ? 'bg-primary-600' : 'bg-primary-500'}
          `}
        />

        <div className="flex-1 p-4">
          {/* Cluster 标题 */}
          <h3 className="text-xl font-semibold text-text-primary line-clamp-2">
            {cluster.clusterTheme}
          </h3>

          {/* 核心洞察 */}
          <p className="mt-2 text-base font-medium text-primary-700 line-clamp-3">
            {cluster.coreInsight}
          </p>

          {/* Importance Score */}
          <div className="flex items-center gap-2 mt-3">
            <span className="text-xs text-text-tertiary">重要度</span>
            <div className="flex items-center gap-1">
              {/* 星级图标 */}
              {Array.from({ length: 5 }).map((_, i) => (
                <svg
                  key={i}
                  className={`w-4 h-4 ${i < Math.round(cluster.clusterImportance / 2) ? 'text-primary-500' : 'text-text-disabled'}`}
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              ))}
              <span className="text-sm font-medium text-text-primary ml-1">
                {cluster.clusterImportance}/10
              </span>
            </div>
          </div>

          {/* 观点冲突提示（如有） */}
          {cluster.viewpointConflict && (
            <div className="mt-3 text-sm text-warning-600 bg-warning-50 px-2 py-1 rounded">
              观点冲突：{cluster.viewpointConflict}
            </div>
          )}

          {/* 展开/折叠按钮 */}
          <button
            onClick={handleToggle}
            onKeyDown={handleKeyDown}
            className={`
              mt-3 text-xs font-medium text-primary-600 hover:text-primary-700
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500
              transition-colors duration-150
            `}
            aria-expanded={expanded}
            aria-controls={`cluster-items-${cluster.id}`}
          >
            {expanded ? '收起' : `展开 ${cluster.items.length} 个来源`}
          </button>

          {/* Items 列表（展开态） */}
          {expanded && (
            <div
              id={`cluster-items-${cluster.id}`}
              className="mt-3 space-y-2 animate-fade-in"
            >
              {cluster.items.map((item) => (
                <ClusterItemView
                  key={item.id}
                  item={item}
                  onClick={() => onItemClick?.(item)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ============================================================
// Skeleton 加载组件
// ============================================================

export function ClusterCardSkeleton() {
  return (
    <div className="bg-bg-base border border-border-default rounded-md shadow-default" aria-hidden="true">
      <div className="flex">
        <div className="w-[3px] skeleton rounded-l-md" />
        <div className="flex-1 p-4">
          {/* 标题骨架 */}
          <div className="skeleton h-6 w-3/4 rounded" />

          {/* 核心洞察骨架 */}
          <div className="mt-2 space-y-1">
            <div className="skeleton h-4 w-full rounded" />
            <div className="skeleton h-4 w-2/3 rounded" />
          </div>

          {/* 重要度骨架 */}
          <div className="flex gap-1 mt-3">
            <div className="skeleton h-4 w-20 rounded" />
            <div className="skeleton h-4 w-24 rounded" />
          </div>

          {/* 展开按钮骨架 */}
          <div className="skeleton h-3 w-16 rounded mt-3" />
        </div>
      </div>
    </div>
  )
}