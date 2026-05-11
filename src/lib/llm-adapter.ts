/**
 * LLM Adapter
 *
 * 支持 Deepseek/OpenAI/Anthropic 三家 Provider
 * 支持流式调用（SSE）和 Thinking 输出
 *
 * 设计遵循 TECH_SPEC.md v1.2 规范
 */

import { getSupabaseClientService } from './supabase'
import { LlmConfig } from './types/db'

// ============================================================
// 类型定义
// ============================================================

export type LLMProvider = 'openai' | 'anthropic' | 'deepseek'

export interface LLMConfigInput {
  provider: LLMProvider
  baseUrl: string
  apiKey: string
  model: string
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface LLMResponse {
  content: string
  thinking?: string          // Thinking/Reasoning 内容
  thinkingTokens?: number    // Thinking 消耗的 tokens
  totalTokens?: number       // 总 tokens 消耗
}

export interface StreamCallbacks {
  onThinking?: (thinking: string) => void
  onContent?: (content: string) => void
  onError?: (error: Error) => void
  onDone?: (stats: { totalTokens?: number; thinkingTokens?: number }) => void
}

// ============================================================
// LLM Adapter 接口
// ============================================================

export interface LLMAdapter {
  config: LLMConfigInput

  // 核心方法
  chat(messages: ChatMessage[]): Promise<LLMResponse>

  // 流式方法
  chatStream(messages: ChatMessage[], callbacks: StreamCallbacks): Promise<void>

  // 配置管理
  updateConfig(newConfig: Partial<LLMConfigInput>): void
}

// ============================================================
// OpenAI/Deepseek Compatible Adapter
// ============================================================

/**
 * OpenAI Compatible Adapter
 *
 * 支持 OpenAI 和 Deepseek（兼容 OpenAI 接口）
 * 支持 include_reasoning 参数获取 Thinking 输出
 */
export class OpenAICompatibleAdapter implements LLMAdapter {
  config: LLMConfigInput

  constructor(config: LLMConfigInput) {
    this.config = config
  }

  async chat(messages: ChatMessage[]): Promise<LLMResponse> {
    const url = `${this.config.baseUrl}/v1/chat/completions`

    const body: Record<string, unknown> = {
      model: this.config.model,
      messages,
      stream: false
    }

    // Deepseek 支持 include_reasoning
    if (this.config.provider === 'deepseek') {
      body.include_reasoning = true
    }

    // OpenAI o1 系列支持 reasoning_effort
    if (this.config.provider === 'openai' && this.config.model.startsWith('o1')) {
      body.reasoning_effort = 'medium'
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`LLM API error: ${response.status} - ${errorText}`)
    }

    const data = await response.json()

    return {
      content: data.choices?.[0]?.message?.content || '',
      thinking: data.choices?.[0]?.message?.reasoning_content,
      thinkingTokens: data.usage?.reasoning_tokens,
      totalTokens: data.usage?.total_tokens
    }
  }

  async chatStream(messages: ChatMessage[], callbacks: StreamCallbacks): Promise<void> {
    const url = `${this.config.baseUrl}/v1/chat/completions`

    const body: Record<string, unknown> = {
      model: this.config.model,
      messages,
      stream: true
    }

    // Deepseek 支持 include_reasoning
    if (this.config.provider === 'deepseek') {
      body.include_reasoning = true
    }

    // OpenAI o1 系列支持 reasoning_effort
    if (this.config.provider === 'openai' && this.config.model.startsWith('o1')) {
      body.reasoning_effort = 'medium'
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    })

    if (!response.ok) {
      const errorText = await response.text()
      callbacks.onError?.(new Error(`LLM API error: ${response.status} - ${errorText}`))
      return
    }

    const reader = response.body?.getReader()
    if (!reader) {
      callbacks.onError?.(new Error('Response body is null'))
      return
    }

    const decoder = new TextDecoder()
    let totalTokens = 0
    let thinkingTokens = 0

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value)
        const lines = chunk.split('\n').filter(line => line.trim().startsWith('data: '))

        for (const line of lines) {
          const dataStr = line.slice(5).trim()
          if (dataStr === '[DONE]') continue

          try {
            const data = JSON.parse(dataStr)

            // 处理 reasoning/thinking 内容
            if (data.choices?.[0]?.delta?.reasoning_content) {
              callbacks.onThinking?.(data.choices[0].delta.reasoning_content)
            }

            // 处理正文内容
            if (data.choices?.[0]?.delta?.content) {
              callbacks.onContent?.(data.choices[0].delta.content)
            }

            // 统计 tokens
            if (data.usage?.reasoning_tokens) {
              thinkingTokens = data.usage.reasoning_tokens
            }
            if (data.usage?.total_tokens) {
              totalTokens = data.usage.total_tokens
            }
          } catch {
            // 解析失败，跳过
          }
        }
      }

      callbacks.onDone?.({ totalTokens, thinkingTokens })
    } catch (error) {
      callbacks.onError?.(error instanceof Error ? error : new Error('Stream error'))
    }
  }

  updateConfig(newConfig: Partial<LLMConfigInput>): void {
    this.config = { ...this.config, ...newConfig }
  }
}

// ============================================================
// Anthropic Adapter
// ============================================================

/**
 * Anthropic Adapter
 *
 * 支持 Anthropic Claude API
 * 支持 thinking block 获取 Thinking 输出
 */
export class AnthropicAdapter implements LLMAdapter {
  config: LLMConfigInput

  constructor(config: LLMConfigInput) {
    this.config = config
  }

  async chat(messages: ChatMessage[]): Promise<LLMResponse> {
    // Anthropic API 格式转换
    const systemMessage = messages.find(m => m.role === 'system')
    const userMessages = messages.filter(m => m.role !== 'system')

    const url = `${this.config.baseUrl}/v1/messages`

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'x-api-key': this.config.apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: this.config.model,
        max_tokens: 4096,
        system: systemMessage?.content,
        messages: userMessages.map(m => ({
          role: m.role,
          content: m.content
        })),
        thinking: { budget_tokens: 1024 }  // Anthropic thinking 配置
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Anthropic API error: ${response.status} - ${errorText}`)
    }

    const data = await response.json()

    // Anthropic 返回格式：content 数组，包含 thinking 和 text block
    const thinkingBlock = data.content?.find((block: { type: string }) => block.type === 'thinking')
    const textBlock = data.content?.find((block: { type: string }) => block.type === 'text')

    return {
      content: textBlock?.text || '',
      thinking: thinkingBlock?.thinking || '',
      thinkingTokens: thinkingBlock?.tokens_used,
      totalTokens: data.usage?.output_tokens
    }
  }

  async chatStream(messages: ChatMessage[], callbacks: StreamCallbacks): Promise<void> {
    // Anthropic API 格式转换
    const systemMessage = messages.find(m => m.role === 'system')
    const userMessages = messages.filter(m => m.role !== 'system')

    const url = `${this.config.baseUrl}/v1/messages`

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'x-api-key': this.config.apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: this.config.model,
        max_tokens: 4096,
        system: systemMessage?.content,
        messages: userMessages.map(m => ({
          role: m.role,
          content: m.content
        })),
        thinking: { budget_tokens: 1024 },
        stream: true
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      callbacks.onError?.(new Error(`Anthropic API error: ${response.status} - ${errorText}`))
      return
    }

    const reader = response.body?.getReader()
    if (!reader) {
      callbacks.onError?.(new Error('Response body is null'))
      return
    }

    const decoder = new TextDecoder()
    let totalTokens = 0
    let thinkingTokens = 0

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value)
        const lines = chunk.split('\n').filter(line => line.trim().startsWith('data: '))

        for (const line of lines) {
          const dataStr = line.slice(5).trim()
          if (!dataStr) continue

          try {
            const data = JSON.parse(dataStr)

            // Anthropic 流式格式：content_block_delta
            if (data.type === 'content_block_delta') {
              if (data.content_block?.type === 'thinking') {
                callbacks.onThinking?.(data.delta?.thinking || '')
              }
              if (data.content_block?.type === 'text') {
                callbacks.onContent?.(data.delta?.text || '')
              }
            }

            // message_delta 包含 usage
            if (data.type === 'message_delta') {
              if (data.usage?.output_tokens) {
                totalTokens = data.usage.output_tokens
              }
            }

            // thinking block tokens
            if (data.type === 'content_block_start' && data.content_block?.type === 'thinking') {
              thinkingTokens = data.content_block?.tokens_used || 0
            }
          } catch {
            // 解析失败，跳过
          }
        }
      }

      callbacks.onDone?.({ totalTokens, thinkingTokens })
    } catch (error) {
      callbacks.onError?.(error instanceof Error ? error : new Error('Stream error'))
    }
  }

  updateConfig(newConfig: Partial<LLMConfigInput>): void {
    this.config = { ...this.config, ...newConfig }
  }
}

// ============================================================
// 工厂函数
// ============================================================

/**
 * 创建 LLM Adapter
 *
 * @param config LLM 配置
 * @returns LLMAdapter 实例
 */
export function createLLMAdapter(config: LLMConfigInput): LLMAdapter {
  switch (config.provider) {
    case 'openai':
      return new OpenAICompatibleAdapter(config)
    case 'anthropic':
      return new AnthropicAdapter(config)
    case 'deepseek':
      // Deepseek 兼容 OpenAI 接口
      return new OpenAICompatibleAdapter(config)
    default:
      throw new Error(`Unsupported LLM provider: ${config.provider}`)
  }
}

// ============================================================
// 默认配置
// ============================================================

/**
 * 获取默认 LLM 配置（从环境变量读取）
 */
export function getDefaultLLMConfig(): LLMConfigInput {
  const provider = (process.env.LLM_PROVIDER as LLMProvider) || 'deepseek'

  let apiKey = ''
  switch (provider) {
    case 'deepseek':
      apiKey = process.env.DEEPSEEK_API_KEY || ''
      break
    case 'openai':
      apiKey = process.env.OPENAI_API_KEY || ''
      break
    case 'anthropic':
      apiKey = process.env.ANTHROPIC_API_KEY || ''
      break
  }

  return {
    provider,
    baseUrl: process.env.LLM_BASE_URL || 'https://api.deepseek.com',
    apiKey,
    model: process.env.LLM_MODEL || 'deepseek-v4-flash'
  }
}

// ============================================================
// 从数据库读取配置
// ============================================================

/**
 * 从 Supabase 读取 LLM 配置
 *
 * @param projectId 项目 ID
 * @returns LLMConfig 或 null
 */
export async function getLLMConfigFromDB(projectId: string): Promise<LlmConfig | null> {
  const supabase = getSupabaseClientService()

  const { data, error } = await supabase
    .from('llm_config')
    .select('*')
    .eq('project_id', projectId)
    .single()

  if (error) {
    console.error('[llm-adapter] Failed to get LLM config:', error)
    return null
  }

  return data
}

/**
 * 创建 LLM Adapter（从数据库配置）
 *
 * @param projectId 项目 ID
 * @returns LLMAdapter 实例（使用数据库配置）或默认配置
 */
export async function createLLMAdapterFromDB(projectId: string): Promise<LLMAdapter> {
  const dbConfig = await getLLMConfigFromDB(projectId)

  if (!dbConfig) {
    // 使用默认配置
    console.log('[llm-adapter] No DB config found, using default')
    return createLLMAdapter(getDefaultLLMConfig())
  }

  return createLLMAdapter({
    provider: dbConfig.provider as LLMProvider,
    baseUrl: dbConfig.base_url,
    apiKey: dbConfig.api_key,
    model: dbConfig.model
  })
}

// ============================================================
// 单例 Adapter
// ============================================================

let _llmAdapter: LLMAdapter | null = null

/**
 * 获取 LLM Adapter 单例
 *
 * 使用默认配置创建
 */
export function getLLMAdapter(): LLMAdapter {
  if (!_llmAdapter) {
    _llmAdapter = createLLMAdapter(getDefaultLLMConfig())
  }
  return _llmAdapter
}

/**
 * 重置 LLM Adapter 单例
 *
 * 用于配置更新后重新创建
 */
export function resetLLMAdapter(): void {
  _llmAdapter = null
}

/**
 * 更新 LLM Adapter 配置
 *
 * @param newConfig 新配置
 */
export function updateLLMAdapterConfig(newConfig: Partial<LLMConfigInput>): void {
  const adapter = getLLMAdapter()
  adapter.updateConfig(newConfig)
}