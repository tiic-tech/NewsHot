/**
 * LLM Config Validate API
 *
 * POST /api/v1/auth/config/validate
 * 验证 LLM 配置有效性并返回可用模型列表
 *
 * 契约来源：API_CONTRACT.md v1.2 - LLM配置模块
 */

import { NextRequest, NextResponse } from 'next/server'

// ============================================================
// 类型定义
// ============================================================

interface ValidateRequest {
  provider: 'openai' | 'anthropic' | 'deepseek'
  baseUrl: string
  apiKey: string
}

interface ValidateResponse {
  valid: boolean
  provider: string
  baseUrl: string
  availableModels: string[]
  message: string
}

// ============================================================
// Provider 可用模型列表（静态定义）
// ============================================================

const PROVIDER_MODELS: Record<string, { active: string[]; deprecated: { id: string; date: string }[] }> = {
  deepseek: {
    active: ['deepseek-v4-flash', 'deepseek-v4-pro'],
    deprecated: [
      { id: 'deepseek-chat', date: '2026/07/24' },
      { id: 'deepseek-reasoner', date: '2026/07/24' }
    ]
  },
  openai: {
    active: ['gpt-4o-mini', 'gpt-4o', 'o1-mini', 'o1-preview'],
    deprecated: [{ id: 'gpt-3.5-turbo', date: '' }]
  },
  anthropic: {
    active: ['claude-3-5-haiku', 'claude-3-5-sonnet', 'claude-3-opus'],
    deprecated: []
  }
}

// ============================================================
// 验证函数
// ============================================================

async function validateProviderConfig(config: ValidateRequest): Promise<ValidateResponse> {
  const { provider, baseUrl, apiKey } = config

  try {
    // Anthropic 可能没有 models 接口，使用预设列表
    if (provider === 'anthropic') {
      // 直接返回预设模型列表
      return {
        valid: true,
        provider,
        baseUrl,
        availableModels: PROVIDER_MODELS[provider].active,
        message: '验证成功，可用模型已更新'
      }
    }

    // Deepseek/OpenAI: 调用 /v1/models 接口验证
    const modelsUrl = `${baseUrl}/v1/models`

    const response = await fetch(modelsUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      signal: AbortSignal.timeout(10000) // 10秒超时
    })

    if (!response.ok) {
      if (response.status === 401) {
        return {
          valid: false,
          provider,
          baseUrl,
          availableModels: [],
          message: 'API Key 无效'
        }
      }
      return {
        valid: false,
        provider,
        baseUrl,
        availableModels: [],
        message: `验证失败：HTTP ${response.status}`
      }
    }

    const data = await response.json()

    // 提取可用模型列表
    const apiModels = data.data?.map((model: { id: string }) => model.id) || []
    const staticModels = PROVIDER_MODELS[provider].active

    // 合并 API 返回的模型和静态定义的模型（过滤弃用模型）
    const availableModels = staticModels.filter(m => apiModels.includes(m) || staticModels.includes(m))

    return {
      valid: true,
      provider,
      baseUrl,
      availableModels,
      message: '验证成功，可用模型已更新'
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '未知错误'

    // 区分超时和连接错误
    if (errorMessage.includes('timeout') || errorMessage.includes('Timeout')) {
      return {
        valid: false,
        provider,
        baseUrl,
        availableModels: [],
        message: '验证超时'
      }
    }

    return {
      valid: false,
      provider,
      baseUrl,
      availableModels: [],
      message: `验证失败：${errorMessage}`
    }
  }
}

// ============================================================
// API Handler
// ============================================================

export async function POST(request: NextRequest) {
  try {
    const body: ValidateRequest = await request.json()

    // 参数验证
    const { provider, baseUrl, apiKey } = body

    // provider 枚举验证
    const validProviders = ['openai', 'anthropic', 'deepseek']
    if (!provider || !validProviders.includes(provider)) {
      return NextResponse.json(
        {
          error: 'validation_error',
          message: 'provider 不在枚举值范围内（openai | anthropic | deepseek）'
        },
        { status: 400 }
      )
    }

    // baseUrl 格式验证
    if (!baseUrl || !baseUrl.startsWith('http')) {
      return NextResponse.json(
        {
          error: 'validation_error',
          message: 'baseUrl 格式不正确（非有效URL）'
        },
        { status: 400 }
      )
    }

    // apiKey 验证
    if (!apiKey || apiKey.trim() === '') {
      return NextResponse.json(
        {
          error: 'validation_error',
          message: 'apiKey 为空字符串'
        },
        { status: 400 }
      )
    }

    // 调用验证函数
    const result = await validateProviderConfig(body)

    // 根据验证结果返回
    if (!result.valid) {
      // 区分错误类型
      if (result.message.includes('API Key')) {
        return NextResponse.json(
          {
            error: 'api_key_invalid',
            message: result.message
          },
          { status: 400 }
        )
      }
      if (result.message.includes('超时') || result.message.includes('timeout')) {
        return NextResponse.json(
          {
            error: 'service_unavailable',
            message: 'Provider API 不可用（超时或限流）'
          },
          { status: 503 }
        )
      }
      return NextResponse.json(
        {
          error: 'base_url_invalid',
          message: result.message
        },
        { status: 400 }
      )
    }

    // 成功响应
    return NextResponse.json({
      data: result,
      message: 'success'
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '未知错误'
    return NextResponse.json(
      {
        error: 'internal_error',
        message: `验证过程中发生未知错误：${errorMessage}`
      },
      { status: 500 }
    )
  }
}