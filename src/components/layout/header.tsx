'use client'

/**
 * Header 组件
 *
 * 页面头部导航栏
 * 样式严格遵循 DESIGN_SYSTEM.md 规范
 */

import { useState } from 'react'
import LLMConfigPanel from '@/components/llm/config-panel'

// ============================================================
// 类型定义
// ============================================================

export interface HeaderProps {
  /** 当前页面路径 */
  currentPath?: string
}

// ============================================================
// 导航菜单配置
// ============================================================

const NAV_ITEMS = [
  { path: '/', label: '首页' },
  { path: '/sources', label: '数据源' },
  { path: '/articles', label: '文章' },
  { path: '/review', label: '审核' }
]

// ============================================================
// 主组件：Header
// ============================================================

export default function Header({ currentPath = '/' }: HeaderProps) {
  const [showLLMConfig, setShowLLMConfig] = useState(false)

  return (
    <header
      className="bg-bg-base border-b border-border-default px-4 py-3"
      role="banner"
      aria-label="页面头部"
    >
      <div className="flex items-center justify-between max-w-7xl mx-auto">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary-500 rounded-md flex items-center justify-center">
            <span className="text-white font-bold text-lg">N</span>
          </div>
          <span className="text-xl font-semibold text-text-primary">
            NewsHot
          </span>
        </div>

        {/* 导航菜单 */}
        <nav
          className="flex items-center gap-6"
          role="navigation"
          aria-label="主导航"
        >
          {NAV_ITEMS.map((item) => (
            <a
              key={item.path}
              href={item.path}
              className={`
                text-base font-medium transition-colors duration-150
                ${currentPath === item.path
                  ? 'text-primary-500'
                  : 'text-text-secondary hover:text-text-primary'
                }
              `}
              aria-current={currentPath === item.path ? 'page' : undefined}
            >
              {item.label}
            </a>
          ))}
        </nav>

        {/* 功能按钮 */}
        <div className="flex items-center gap-3">
          {/* LLM 配置按钮 */}
          <button
            onClick={() => setShowLLMConfig(true)}
            className="btn btn-secondary"
            aria-label="配置 LLM"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            LLM 配置
          </button>

          {/* 语言切换按钮（预留） */}
          <button
            className="btn btn-secondary"
            aria-label="切换语言"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 11.998 18.129A1.246 1.246 0 0115 21.747m0 0V21m0 0h.008" />
            </svg>
            语言
          </button>
        </div>
      </div>

      {/* LLM 配置弹窗 */}
      {showLLMConfig && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          role="dialog"
          aria-modal="true"
          aria-label="LLM 配置弹窗"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowLLMConfig(false)
          }}
        >
          <LLMConfigPanel
            modal
            onClose={() => setShowLLMConfig(false)}
          />
        </div>
      )}
    </header>
  )
}