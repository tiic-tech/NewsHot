'use client'

/**
 * Thinking 显示组件
 *
 * 用于展示 LLM 的推理过程（Deepseek reasoning_content）
 * 样式严格遵循 DESIGN_SYSTEM.md 规范
 */

import { useState } from 'react'

// ============================================================
// 类型定义
// ============================================================

export interface ThinkingDisplayProps {
  /** Thinking 内容 */
  thinking: string
  /** 是否默认展开 */
  defaultExpanded?: boolean
  /** 消耗的 tokens */
  tokensUsed?: number
  /** 推理时间（秒） */
  durationSeconds?: number
}

// ============================================================
// 主组件：ThinkingDisplay
// ============================================================

export default function ThinkingDisplay({
  thinking,
  defaultExpanded = false,
  tokensUsed,
  durationSeconds
}: ThinkingDisplayProps) {
  const [expanded, setExpanded] = useState(defaultExpanded)

  // 计算推理时间显示
  const durationText = durationSeconds
    ? `已思考 ${durationSeconds.toFixed(1)} 秒`
    : '推理过程'

  return (
    <div
      className={`
        bg-bg-muted border border-border-muted rounded-md
        transition-all duration-300 ease-in-out
        ${expanded ? 'shadow-md' : 'shadow-sm'}
      `}
      role="region"
      aria-label="推理过程"
      aria-expanded={expanded}
    >
      {/* 头部栏 */}
      <div
        className={`
          flex items-center justify-between px-4 py-2
          border-b border-border-muted
          ${expanded ? '' : 'cursor-pointer hover:bg-bg-emphasis'}
        `}
        onClick={() => !expanded && setExpanded(true)}
      >
        {/* 图标 + 标题 */}
        <div className="flex items-center gap-2">
          {/* Brain 图标 */}
          <svg
            className="w-5 h-5 text-primary-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
            />
          </svg>

          <span className="text-sm font-medium text-text-tertiary">
            {expanded ? '推理过程' : durationText}
          </span>

          {/* Tokens 消耗 */}
          {tokensUsed && expanded && (
            <span className="text-xs text-text-tertiary ml-2">
              ({tokensUsed} tokens)
            </span>
          )}
        </div>

        {/* 展开/折叠按钮 */}
        {expanded && (
          <button
            onClick={() => setExpanded(false)}
            className={`
              text-xs font-medium text-primary-600 hover:text-primary-700
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500
              transition-colors duration-150
            `}
            aria-label="折叠推理过程"
          >
            折叠
          </button>
        )}

        {!expanded && (
          <svg
            className="w-4 h-4 text-text-tertiary"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        )}
      </div>

      {/* 内容区域（展开态） */}
      {expanded && (
        <div
          className="px-4 py-3 animate-fade-in"
          style={{ maxHeight: '300px', overflowY: 'auto', scrollbarWidth: 'thin' }}
        >
          <pre className="text-sm text-text-secondary whitespace-pre-wrap font-mono">
            {thinking}
          </pre>
        </div>
      )}
    </div>
  )
}

// ============================================================
// 独立使用的小型 Thinking 提示
// ============================================================

export function ThinkingBadge({ durationSeconds }: { durationSeconds?: number }) {
  return (
    <div
      className="inline-flex items-center gap-1 px-2 py-1 bg-primary-50 text-primary-600 rounded text-xs"
      role="status"
      aria-label="推理过程已完成"
    >
      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.574l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.574l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
      </svg>
      {durationSeconds ? `${durationSeconds.toFixed(1)}s` : '已思考'}
    </div>
  )
}