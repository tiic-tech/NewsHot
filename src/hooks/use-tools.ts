'use client'

/**
 * useTools Hook
 *
 * Tool 调用状态管理和 SSE 流式调用支持
 */

import { useState, useCallback, useRef } from 'react'
import { ToolName, ToolParamsMap, ToolResultMap } from '@/lib/types/tools'
import { SSEEvent } from '@/lib/types/api'
import { buildApiUrl } from '@/lib/utils/api-base'

// ============================================================
// 类型定义
// ============================================================

export interface ToolCallState {
  /** Tool 执行中 */
  executing: boolean
  /** 当前执行的 Tool 名称 */
  currentTool: ToolName | null
  /** Thinking 内容 */
  thinking: string
  /** 输出内容 */
  content: string
  /** 执行结果 */
  result: Record<string, unknown> | null
  /** 错误信息 */
  error: string | null
  /** 总 tokens */
  totalTokens: number
  /** Thinking tokens */
  thinkingTokens: number
}

export interface UseToolsReturn extends ToolCallState {
  /** 调用 Tool（一次性响应） */
  callTool: <K extends ToolName>(toolName: K, params: ToolParamsMap[K]) => Promise<ToolResultMap[K] | null>
  /** 调用 Tool（流式响应） */
  callToolStream: <K extends ToolName>(
    toolName: K,
    params: ToolParamsMap[K],
    onThinking?: (thinking: string) => void,
    onContent?: (content: string) => void
  ) => Promise<ToolResultMap[K] | null>
  /** 清除状态 */
  clearState: () => void
}

// ============================================================
// Hook 实现
// ============================================================

export function useTools(): UseToolsReturn {
  const [state, setState] = useState<ToolCallState>({
    executing: false,
    currentTool: null,
    thinking: '',
    content: '',
    result: null,
    error: null,
    totalTokens: 0,
    thinkingTokens: 0
  })

  const eventSourceRef = useRef<EventSource | null>(null)

  // 调用 Tool（一次性响应）
  const callTool = useCallback(async <K extends ToolName>(
    toolName: K,
    params: ToolParamsMap[K]
  ): Promise<ToolResultMap[K] | null> => {
    setState(prev => ({
      ...prev,
      executing: true,
      currentTool: toolName,
      error: null,
      thinking: '',
      content: ''
    }))

    try {
      const response = await fetch(buildApiUrl('/api/v1/tools'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ toolName, params })
      })

      if (response.ok) {
        const data = await response.json()
        setState(prev => ({
          ...prev,
          executing: false,
          result: data.data.result,
          thinking: data.data.thinking || '',
          content: data.message
        }))
        return data.data.result as ToolResultMap[K]
      } else {
        const data = await response.json()
        setState(prev => ({
          ...prev,
          executing: false,
          error: data.message || 'Tool 执行失败'
        }))
        return null
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        executing: false,
        error: '网络错误，请稍后重试'
      }))
      return null
    }
  }, [])

  // 调用 Tool（流式响应 SSE）
  const callToolStream = useCallback(async <K extends ToolName>(
    toolName: K,
    params: ToolParamsMap[K],
    onThinking?: (thinking: string) => void,
    onContent?: (content: string) => void
  ): Promise<ToolResultMap[K] | null> => {
    setState(prev => ({
      ...prev,
      executing: true,
      currentTool: toolName,
      error: null,
      thinking: '',
      content: ''
    }))

    // 使用 fetch + POST 发起 SSE 请求
    // 注意：标准 EventSource 只支持 GET，需要使用 fetch API 处理 POST SSE
    try {
      const response = await fetch(buildApiUrl('/api/v1/tools/stream'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ toolName, params })
      })

      if (!response.ok) {
        const data = await response.json()
        setState(prev => ({
          ...prev,
          executing: false,
          error: data.message || 'Tool 执行失败'
        }))
        return null
      }

      const reader = response.body?.getReader()
      if (!reader) {
        setState(prev => ({
          ...prev,
          executing: false,
          error: '无法读取响应流'
        }))
        return null
      }

      const decoder = new TextDecoder()
      let accumulatedThinking = ''
      let accumulatedContent = ''
      let finalResult: Record<string, unknown> | null = null

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        const lines = chunk.split('\n').filter(line => line.trim())

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const jsonStr = line.slice(6)
              const event: SSEEvent = JSON.parse(jsonStr)

              switch (event.type) {
                case 'thinking':
                  accumulatedThinking += event.thinking
                  setState(prev => ({ ...prev, thinking: accumulatedThinking }))
                  onThinking?.(event.thinking)
                  break

                case 'content':
                  accumulatedContent += event.content
                  setState(prev => ({ ...prev, content: accumulatedContent }))
                  onContent?.(event.content)
                  break

                case 'done':
                  setState(prev => ({
                    ...prev,
                    executing: false,
                    totalTokens: event.totalTokens,
                    thinkingTokens: event.thinkingTokens
                  }))
                  break

                case 'error':
                  setState(prev => ({
                    ...prev,
                    executing: false,
                    error: event.message
                  }))
                  return null
              }
            } catch (e) {
              console.error('[useTools] Failed to parse SSE event:', e)
            }
          }
        }
      }

      setState(prev => ({
        ...prev,
        executing: false,
        result: finalResult
      }))

      return finalResult as ToolResultMap[K]
    } catch (error) {
      setState(prev => ({
        ...prev,
        executing: false,
        error: '网络错误，请稍后重试'
      }))
      return null
    }
  }, [])

  // 清除状态
  const clearState = useCallback(() => {
    // 关闭 EventSource
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
      eventSourceRef.current = null
    }

    setState({
      executing: false,
      currentTool: null,
      thinking: '',
      content: '',
      result: null,
      error: null,
      totalTokens: 0,
      thinkingTokens: 0
    })
  }, [])

  return {
    ...state,
    callTool,
    callToolStream,
    clearState
  }
}