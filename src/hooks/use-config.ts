'use client'

/**
 * useConfig Hook
 *
 * LLM 配置状态管理和 API 调用逻辑
 */

import { useState, useEffect, useCallback } from 'react'
import { LLMProvider, LlmConfigResponse, ValidateConfigResponse } from '@/lib/types/api'
import { buildApiUrl } from '@/lib/utils/api-base'

// ============================================================
// 类型定义
// ============================================================

export interface ConfigState {
  /** 当前配置 */
  config: LlmConfigResponse | null
  /** 是否正在加载 */
  loading: boolean
  /** 是否正在验证 */
  validating: boolean
  /** 是否正在保存 */
  saving: boolean
  /** 验证结果 */
  validationResult: ValidateConfigResponse | null
  /** 错误信息 */
  error: string | null
}

export interface UseConfigReturn extends ConfigState {
  /** 加载配置 */
  loadConfig: () => Promise<void>
  /** 验证配置 */
  validateConfig: (provider: LLMProvider, baseUrl: string, apiKey: string) => Promise<ValidateConfigResponse>
  /** 保存配置 */
  saveConfig: (provider: LLMProvider, baseUrl: string, apiKey: string, model: string) => Promise<void>
  /** 清除错误 */
  clearError: () => void
}

// ============================================================
// Hook 实现
// ============================================================

export function useConfig(): UseConfigReturn {
  const [state, setState] = useState<ConfigState>({
    config: null,
    loading: false,
    validating: false,
    saving: false,
    validationResult: null,
    error: null
  })

  // 初始化时加载配置
  useEffect(() => {
    loadConfig()
  }, [])

  // 加载配置
  const loadConfig = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }))

    try {
      const response = await fetch(buildApiUrl('/api/v1/auth/config'))

      if (response.ok) {
        const data = await response.json()
        setState(prev => ({
          ...prev,
          config: data.data,
          loading: false
        }))
      } else if (response.status === 404) {
        // 未配置（首次使用）
        setState(prev => ({
          ...prev,
          config: null,
          loading: false
        }))
      } else {
        const data = await response.json()
        setState(prev => ({
          ...prev,
          loading: false,
          error: data.message || '加载配置失败'
        }))
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: '网络错误，请稍后重试'
      }))
    }
  }, [])

  // 验证配置
  const validateConfig = useCallback(async (
    provider: LLMProvider,
    baseUrl: string,
    apiKey: string
  ): Promise<ValidateConfigResponse> => {
    setState(prev => ({ ...prev, validating: true, error: null }))

    try {
      const response = await fetch(buildApiUrl('/api/v1/auth/config/validate'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, baseUrl, apiKey })
      })

      const data = await response.json()

      if (response.ok && data.data.valid) {
        setState(prev => ({
          ...prev,
          validating: false,
          validationResult: data.data
        }))
        return data.data
      } else {
        setState(prev => ({
          ...prev,
          validating: false,
          error: data.message || '验证失败'
        }))
        return {
          valid: false,
          provider,
          baseUrl,
          availableModels: [],
          message: data.message || '验证失败'
        }
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        validating: false,
        error: '网络错误，请稍后重试'
      }))
      return {
        valid: false,
        provider,
        baseUrl,
        availableModels: [],
        message: '网络错误'
      }
    }
  }, [])

  // 保存配置
  const saveConfig = useCallback(async (
    provider: LLMProvider,
    baseUrl: string,
    apiKey: string,
    model: string
  ) => {
    setState(prev => ({ ...prev, saving: true, error: null }))

    try {
      const response = await fetch(buildApiUrl('/api/v1/auth/config'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, baseUrl, apiKey, model })
      })

      if (response.ok) {
        const data = await response.json()
        setState(prev => ({
          ...prev,
          saving: false,
          config: data.data
        }))
      } else {
        const data = await response.json()
        setState(prev => ({
          ...prev,
          saving: false,
          error: data.message || '保存失败'
        }))
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        saving: false,
        error: '网络错误，请稍后重试'
      }))
    }
  }, [])

  // 清除错误
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }))
  }, [])

  return {
    ...state,
    loadConfig,
    validateConfig,
    saveConfig,
    clearError
  }
}