'use client'

/**
 * LLM 配置面板组件
 *
 * 用于配置 LLM Provider、API Key、模型选择
 * 样式严格遵循 DESIGN_SYSTEM.md 规范
 */

import { useState, useEffect } from 'react'
import { LLMProvider, LlmConfigResponse, ValidateConfigResponse, ModelInfo } from '@/lib/types/api'
import { buildApiUrl } from '@/lib/utils/api-base'

// ============================================================
// 类型定义
// ============================================================

export interface LLMConfigPanelProps {
  /** 配置保存回调 */
  onConfigSaved?: (config: LlmConfigResponse) => void
  /** 关闭回调（弹窗场景） */
  onClose?: () => void
  /** 是否为弹窗模式 */
  modal?: boolean
}

// ============================================================
// Provider 预设配置
// ============================================================

const PROVIDER_PRESETS: Record<LLMProvider, { baseUrl: string; name: string }> = {
  deepseek: { baseUrl: 'https://api.deepseek.com', name: 'Deepseek' },
  openai: { baseUrl: 'https://api.openai.com', name: 'OpenAI' },
  anthropic: { baseUrl: 'https://api.anthropic.com', name: 'Anthropic' }
}

// ============================================================
// 主组件：LLMConfigPanel
// ============================================================

export default function LLMConfigPanel({
  onConfigSaved,
  onClose,
  modal = false
}: LLMConfigPanelProps) {
  // 状态管理
  const [provider, setProvider] = useState<LLMProvider>('deepseek')
  const [baseUrl, setBaseUrl] = useState(PROVIDER_PRESETS['deepseek'].baseUrl)
  const [apiKey, setApiKey] = useState('')
  const [model, setModel] = useState('')
  const [availableModels, setAvailableModels] = useState<string[]>([])
  const [validationStatus, setValidationStatus] = useState<'idle' | 'validating' | 'success' | 'error'>('idle')
  const [validationMessage, setValidationMessage] = useState('')
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle')

  // 加载现有配置
  useEffect(() => {
    loadExistingConfig()
  }, [])

  // Provider 变化时更新 baseUrl
  useEffect(() => {
    setBaseUrl(PROVIDER_PRESETS[provider].baseUrl)
    setAvailableModels([])
    setModel('')
    setValidationStatus('idle')
  }, [provider])

  // 加载现有配置
  const loadExistingConfig = async () => {
    try {
      const response = await fetch(buildApiUrl('/api/v1/auth/config'))
      if (response.ok) {
        const data = await response.json()
        const config = data.data as LlmConfigResponse
        setProvider(config.provider as LLMProvider)
        setBaseUrl(config.baseUrl)
        setApiKey(config.apiKey)
        setModel(config.model)
        if (config.availableModels) {
          setAvailableModels(config.availableModels)
        }
      }
    } catch (error) {
      console.error('[LLMConfig] Failed to load existing config:', error)
    }
  }

  // 验证配置
  const handleValidate = async () => {
    if (!apiKey.trim()) {
      setValidationStatus('error')
      setValidationMessage('API Key 不能为空')
      return
    }

    setValidationStatus('validating')
    setValidationMessage('正在验证...')

    try {
      const response = await fetch(buildApiUrl('/api/v1/auth/config/validate'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider,
          baseUrl,
          apiKey
        })
      })

      const data = await response.json()

      if (response.ok && data.data.valid) {
        setValidationStatus('success')
        setValidationMessage(data.data.message)
        setAvailableModels(data.data.availableModels)
        // 默认选择推荐模型
        if (data.data.availableModels.length > 0 && !model) {
          setModel(data.data.availableModels[0])
        }
      } else {
        setValidationStatus('error')
        setValidationMessage(data.message || '验证失败')
      }
    } catch (error) {
      setValidationStatus('error')
      setValidationMessage('网络错误，请稍后重试')
    }
  }

  // 保存配置
  const handleSave = async () => {
    if (!model) {
      setSaveStatus('error')
      return
    }

    setSaveStatus('saving')

    try {
      const response = await fetch(buildApiUrl('/api/v1/auth/config'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider,
          baseUrl,
          apiKey,
          model
        })
      })

      const data = await response.json()

      if (response.ok) {
        setSaveStatus('success')
        onConfigSaved?.(data.data as LlmConfigResponse)
        onClose?.()
      } else {
        setSaveStatus('error')
      }
    } catch (error) {
      setSaveStatus('error')
    }
  }

  // 容器样式
  const containerClass = modal
    ? 'bg-bg-base border border-border-default rounded-lg shadow-xl p-6 max-w-md w-full'
    : 'bg-bg-subtle border border-border-default rounded-lg p-6'

  return (
    <div className={containerClass} role="region" aria-label="LLM 配置">
      {/* 标题 */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-text-primary">LLM 配置</h2>
        {modal && onClose && (
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

      {/* Provider 选择 */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-text-primary mb-1">
          Provider
        </label>
        <select
          value={provider}
          onChange={(e) => setProvider(e.target.value as LLMProvider)}
          className="input w-full"
          aria-label="选择 Provider"
        >
          {Object.entries(PROVIDER_PRESETS).map(([key, value]) => (
            <option key={key} value={key}>
              {value.name}
            </option>
          ))}
        </select>
      </div>

      {/* Base URL */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-text-primary mb-1">
          Base URL
        </label>
        <input
          type="text"
          value={baseUrl}
          onChange={(e) => setBaseUrl(e.target.value)}
          className="input w-full"
          placeholder="https://api.deepseek.com"
          aria-label="Base URL"
        />
      </div>

      {/* API Key */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-text-primary mb-1">
          API Key
        </label>
        <input
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          className="input w-full"
          placeholder="sk-xxx"
          aria-label="API Key"
        />
      </div>

      {/* 验证按钮 */}
      <div className="mb-4">
        <button
          onClick={handleValidate}
          disabled={validationStatus === 'validating'}
          className={`
            btn btn-secondary w-full
            ${validationStatus === 'validating' ? 'opacity-50 cursor-not-allowed' : ''}
          `}
          aria-label="验证配置"
        >
          {validationStatus === 'validating' ? (
            <span className="flex items-center gap-2">
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              验证中...
            </span>
          ) : '验证配置'}
        </button>

        {/* 验证状态显示 */}
        {validationStatus !== 'idle' && (
          <div
            className={`
              mt-2 text-sm p-2 rounded
              ${validationStatus === 'success' ? 'bg-success-50 text-success-600 border border-success-500' : ''}
              ${validationStatus === 'error' ? 'bg-danger-50 text-danger-600 border border-danger-500' : ''}
              ${validationStatus === 'validating' ? 'bg-info-50 text-info-600' : ''}
            `}
            role="status"
          >
            {validationMessage}
          </div>
        )}
      </div>

      {/* 模型选择（验证成功后显示） */}
      {validationStatus === 'success' && availableModels.length > 0 && (
        <div className="mb-4">
          <label className="block text-sm font-medium text-text-primary mb-1">
            选择模型
          </label>
          <select
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="input w-full"
            aria-label="选择模型"
          >
            {availableModels.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* 保存按钮 */}
      {validationStatus === 'success' && (
        <button
          onClick={handleSave}
          disabled={saveStatus === 'saving' || !model}
          className={`
            btn btn-primary w-full
            ${saveStatus === 'saving' || !model ? 'opacity-50 cursor-not-allowed' : ''}
          `}
          aria-label="保存配置"
        >
          {saveStatus === 'saving' ? (
            <span className="flex items-center gap-2">
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              保存中...
            </span>
          ) : '保存配置'}
        </button>
      )}

      {/* 保存成功提示 */}
      {saveStatus === 'success' && (
        <div className="mt-2 text-sm bg-success-50 text-success-600 p-2 rounded border border-success-500">
          配置已保存，后续 LLM 调用将使用新配置
        </div>
      )}
    </div>
  )
}