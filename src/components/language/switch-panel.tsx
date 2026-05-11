'use client'

/**
 * 语言切换面板组件
 *
 * 用于切换输出语言（zh/en）
 * 样式严格遵循 DESIGN_SYSTEM.md 规范
 */

import { useState, useEffect } from 'react'
import { OutputLanguage, LanguageSwitchResponse } from '@/lib/types/api'
import { buildApiUrl } from '@/lib/utils/api-base'

// ============================================================
// 类型定义
// ============================================================

export interface LanguageSwitchPanelProps {
  /** 关闭回调（弹窗场景） */
  onClose?: () => void
}

// ============================================================
// 语言配置
// ============================================================

const LANGUAGE_OPTIONS: { value: OutputLanguage; label: string; description: string }[] = [
  { value: 'zh', label: '中文', description: '仅输出中文摘要' },
  { value: 'en', label: '英文', description: '仅输出英文摘要' },
  { value: 'zh-en', label: '中英双语', description: '中文为主，附英文版本' },
  { value: 'en-zh', label: '英中双语', description: '英文为主，附中文版本' }
]

// ============================================================
// 主组件：LanguageSwitchPanel
// ============================================================

export default function LanguageSwitchPanel({ onClose }: LanguageSwitchPanelProps) {
  const [selectedLanguages, setSelectedLanguages] = useState<OutputLanguage[]>(['zh'])
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)

  // 加载现有配置
  useEffect(() => {
    loadLanguages()
  }, [])

  // 加载现有配置
  const loadLanguages = async () => {
    try {
      const response = await fetch(buildApiUrl('/api/v1/language/switch'))
      if (response.ok) {
        const data = await response.json()
        setSelectedLanguages(data.data.enabledLanguages)
      }
    } catch (error) {
      console.error('[LanguageSwitch] Failed to load languages:', error)
    }
  }

  // 切换语言选择
  const handleToggle = (lang: OutputLanguage) => {
    setSelectedLanguages(prev => {
      if (prev.includes(lang)) {
        return prev.filter(l => l !== lang)
      } else {
        return [...prev, lang]
      }
    })
    setSaved(false)
  }

  // 保存配置
  const handleSave = async () => {
    if (selectedLanguages.length === 0) {
      return
    }

    setLoading(true)

    try {
      const response = await fetch(buildApiUrl('/api/v1/language/switch'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ languages: selectedLanguages })
      })

      if (response.ok) {
        setSaved(true)
        onClose?.()
      }
    } catch (error) {
      console.error('[LanguageSwitch] Failed to save languages:', error)
    }

    setLoading(false)
  }

  return (
    <div
      className="bg-bg-subtle border border-border-default rounded-lg p-6 max-w-md w-full"
      role="region"
      aria-label="语言切换"
    >
      {/* 标题 */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-text-primary">输出语言</h2>
        {onClose && (
          <button
            onClick={onClose}
            className="text-text-tertiary hover:text-text-primary"
            aria-label="关闭"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* 语言选项 */}
      <div className="space-y-3">
        {LANGUAGE_OPTIONS.map((option) => (
          <label
            key={option.value}
            className={`
              flex items-center gap-3 p-3 rounded-md border
              cursor-pointer transition-colors duration-150
              ${selectedLanguages.includes(option.value)
                ? 'bg-primary-50 border-primary-500'
                : 'bg-bg-base border-border-default hover:border-border-emphasis'
              }
            `}
          >
            {/* Checkbox */}
            <input
              type="checkbox"
              checked={selectedLanguages.includes(option.value)}
              onChange={() => handleToggle(option.value)}
              className="w-4 h-4 text-primary-500 rounded border-border-default focus:ring-primary-500"
              aria-label={option.label}
            />

            {/* 语言名称 */}
            <div className="flex-1">
              <span className="text-base font-medium text-text-primary">
                {option.label}
              </span>
              <span className="text-xs text-text-tertiary ml-2">
                {option.description}
              </span>
            </div>
          </label>
        ))}
      </div>

      {/* 提示 */}
      <p className="mt-4 text-xs text-text-tertiary">
        选择多种语言将同时输出对应版本的摘要和文章
      </p>

      {/* 保存按钮 */}
      <button
        onClick={handleSave}
        disabled={selectedLanguages.length === 0 || loading}
        className={`
          btn btn-primary w-full mt-4
          ${selectedLanguages.length === 0 || loading ? 'opacity-50 cursor-not-allowed' : ''}
        `}
        aria-label="保存语言配置"
      >
        {loading ? (
          <span className="flex items-center gap-2">
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            保存中...
          </span>
        ) : '保存配置'}
      </button>

      {/* 保存成功提示 */}
      {saved && (
        <div className="mt-2 text-sm bg-success-50 text-success-600 p-2 rounded border border-success-500">
          已启用 {selectedLanguages.length} 种语言输出
        </div>
      )}
    </div>
  )
}