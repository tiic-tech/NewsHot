'use client'

/**
 * useDraft Hook
 *
 * Draft 状态管理和 API 调用逻辑
 */

import { useState, useCallback } from 'react'
import { DraftDetail, DraftStatus, GenerateDraftResponse } from '@/lib/types/api'
import { buildApiUrl } from '@/lib/utils/api-base'

// ============================================================
// 类型定义
// ============================================================

export interface DraftState {
  /** Draft 详情 */
  draft: DraftDetail | null
  /** 是否正在加载 */
  loading: boolean
  /** 是否正在生成 */
  generating: boolean
  /** 是否正在审核 */
  approving: boolean
  /** 错误信息 */
  error: string | null
}

export interface UseDraftReturn extends DraftState {
  /** 加载 Draft 详情 */
  loadDraft: (draftId: string) => Promise<void>
  /** 生成 Draft */
  generateDraft: (date: string, forceRegenerate?: boolean) => Promise<GenerateDraftResponse | null>
  /** 审核 Draft */
  approveDraft: (draftId: string, feedback?: string) => Promise<boolean>
  /** 清除错误 */
  clearError: () => void
  /** 清除 Draft */
  clearDraft: () => void
}

// ============================================================
// Hook 实现
// ============================================================

export function useDraft(): UseDraftReturn {
  const [state, setState] = useState<DraftState>({
    draft: null,
    loading: false,
    generating: false,
    approving: false,
    error: null
  })

  // 加载 Draft 详情
  const loadDraft = useCallback(async (draftId: string) => {
    setState(prev => ({ ...prev, loading: true, error: null }))

    try {
      const response = await fetch(buildApiUrl(`/api/v1/draft/${draftId}`))

      if (response.ok) {
        const data = await response.json()
        setState(prev => ({
          ...prev,
          draft: data.data,
          loading: false
        }))
      } else {
        const data = await response.json()
        setState(prev => ({
          ...prev,
          loading: false,
          error: data.message || '加载 Draft 失败'
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

  // 生成 Draft
  const generateDraft = useCallback(async (
    date: string,
    forceRegenerate = false
  ): Promise<GenerateDraftResponse | null> => {
    setState(prev => ({ ...prev, generating: true, error: null }))

    try {
      const response = await fetch(buildApiUrl('/api/v1/draft/generate'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date, forceRegenerate })
      })

      if (response.ok) {
        const data = await response.json()
        setState(prev => ({
          ...prev,
          generating: false
        }))
        return data.data
      } else {
        const data = await response.json()
        setState(prev => ({
          ...prev,
          generating: false,
          error: data.message || '生成 Draft 失败'
        }))
        return null
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        generating: false,
        error: '网络错误，请稍后重试'
      }))
      return null
    }
  }, [])

  // 审核 Draft
  const approveDraft = useCallback(async (
    draftId: string,
    feedback?: string
  ): Promise<boolean> => {
    setState(prev => ({ ...prev, approving: true, error: null }))

    try {
      const response = await fetch(buildApiUrl(`/api/v1/draft/${draftId}/approve`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feedback })
      })

      if (response.ok) {
        const data = await response.json()
        setState(prev => ({
          ...prev,
          approving: false,
          draft: prev.draft ? {
            ...prev.draft,
            status: 'approved' as DraftStatus,
            approvedAt: data.data.approvedAt
          } : null
        }))
        return true
      } else {
        const data = await response.json()
        setState(prev => ({
          ...prev,
          approving: false,
          error: data.message || '审核失败'
        }))
        return false
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        approving: false,
        error: '网络错误，请稍后重试'
      }))
      return false
    }
  }, [])

  // 清除错误
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }))
  }, [])

  // 清除 Draft
  const clearDraft = useCallback(() => {
    setState(prev => ({ ...prev, draft: null }))
  }, [])

  return {
    ...state,
    loadDraft,
    generateDraft,
    approveDraft,
    clearError,
    clearDraft
  }
}