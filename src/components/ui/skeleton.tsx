'use client'

/**
 * Skeleton 加载组件
 *
 * 用于数据加载时的占位展示
 * 样式严格遵循 DESIGN_SYSTEM.md 规范
 */

// ============================================================
// 基础 Skeleton 组件
// ============================================================

export interface SkeletonProps {
  /** 宽度 */
  width?: string | number
  /** 高度 */
  height?: string | number
  /** 圆角 */
  rounded?: 'none' | 'sm' | 'default' | 'md' | 'lg' | 'full'
  /** 额外类名 */
  className?: string
}

export function Skeleton({
  width = '100%',
  height = '1rem',
  rounded = 'default',
  className = ''
}: SkeletonProps) {
  const roundedClass = {
    none: '',
    sm: 'rounded-sm',
    default: 'rounded',
    md: 'rounded-md',
    lg: 'rounded-lg',
    full: 'rounded-full'
  }[rounded]

  const widthStyle = typeof width === 'number' ? `${width}px` : width
  const heightStyle = typeof height === 'number' ? `${height}px` : height

  return (
    <div
      className={`skeleton ${roundedClass} ${className}`}
      style={{ width: widthStyle, height: heightStyle }}
      aria-hidden="true"
    />
  )
}

// ============================================================
// 文本 Skeleton
// ============================================================

export interface TextSkeletonProps {
  /** 行数 */
  lines?: number
  /** 最后一行宽度比例 */
  lastLineWidth?: string
}

export function TextSkeleton({
  lines = 1,
  lastLineWidth = '60%'
}: TextSkeletonProps) {
  return (
    <div className="space-y-2" aria-hidden="true">
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          height={16}
          width={i === lines - 1 ? lastLineWidth : '100%'}
        />
      ))}
    </div>
  )
}

// ============================================================
// Bullet List Skeleton
// ============================================================

export interface BulletListSkeletonProps {
  /** 数量 */
  count?: number
  /** 列数 */
  columns?: 1 | 2 | 3
}

export function BulletListSkeleton({
  count = 5,
  columns = 3
}: BulletListSkeletonProps) {
  const gridClass = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
  }[columns]

  return (
    <div className={`grid ${gridClass} gap-4`} aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="card">
          {/* 标题 */}
          <Skeleton height={24} width="75%" />

          {/* 作者信息 */}
          <div className="flex gap-2 mt-2">
            <Skeleton height={16} width="80px" />
            <Skeleton height={16} width="60px" />
          </div>

          {/* 摘要 */}
          <div className="mt-3 space-y-2">
            <Skeleton height={16} width="100%" />
            <Skeleton height={16} width="66%" />
          </div>
        </div>
      ))}
    </div>
  )
}

// ============================================================
// Cluster Card Skeleton
// ============================================================

export function ClusterCardSkeleton() {
  return (
    <div className="bg-bg-base border border-border-default rounded-md shadow-default" aria-hidden="true">
      <div className="flex">
        <div className="w-[3px] skeleton rounded-l-md" />
        <div className="flex-1 p-4">
          {/* 标题 */}
          <Skeleton height={24} width="75%" />

          {/* 核心洞察 */}
          <div className="mt-2 space-y-1">
            <Skeleton height={16} width="100%" />
            <Skeleton height={16} width="66%" />
          </div>

          {/* 重要度 */}
          <div className="flex gap-1 mt-3">
            <Skeleton height={16} width="80px" />
            <Skeleton height={16} width="96px" />
          </div>

          {/* 展开按钮 */}
          <Skeleton height={12} width="64px" className="mt-3" />
        </div>
      </div>
    </div>
  )
}

// ============================================================
// Page Header Skeleton
// ============================================================

export function PageHeaderSkeleton() {
  return (
    <div className="mb-6" aria-hidden="true">
      <Skeleton height={32} width="200px" />
      <Skeleton height={16} width="300px" className="mt-2" />
    </div>
  )
}

// ============================================================
// Sidebar Skeleton
// ============================================================

export function SidebarSkeleton() {
  return (
    <div className="h-full bg-bg-subtle border border-border-default rounded-lg p-4" aria-hidden="true">
      {/* 输入框 */}
      <Skeleton height={48} width="100%" rounded="lg" />

      {/* 消息占位 */}
      <div className="mt-4 space-y-3">
        <Skeleton height={60} width="80%" rounded="md" />
        <Skeleton height={60} width="60%" rounded="md" className="ml-auto" />
      </div>
    </div>
  )
}

// ============================================================
// LLM Config Panel Skeleton
// ============================================================

export function LLMConfigSkeleton() {
  return (
    <div className="bg-bg-subtle border border-border-default rounded-lg p-6" aria-hidden="true">
      {/* Provider */}
      <Skeleton height={40} width="100%" rounded="md" className="mb-4" />

      {/* Base URL */}
      <Skeleton height={40} width="100%" rounded="md" className="mb-4" />

      {/* API Key */}
      <Skeleton height={40} width="100%" rounded="md" className="mb-4" />

      {/* Buttons */}
      <div className="flex gap-3">
        <Skeleton height={40} width="100px" rounded="md" />
        <Skeleton height={40} width="100px" rounded="md" />
      </div>
    </div>
  )
}