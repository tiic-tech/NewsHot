/**
 * LLM Models API
 *
 * GET /api/v1/auth/models
 * 获取 Provider 的可用模型列表（静态数据）
 *
 * 契约来源：API_CONTRACT.md v1.2 - LLM配置模块
 */

import { NextRequest, NextResponse } from 'next/server'

// ============================================================
// 类型定义
// ============================================================

interface ModelInfo {
  id: string
  name: string
  status: 'active' | 'deprecated'
  recommended: boolean
  cost: string
  description: string
  deprecatedDate?: string
}

interface ProviderModelsResponse {
  provider: string
  models: ModelInfo[]
}

// ============================================================
// Provider 模型列表（静态定义）
// ============================================================

const PROVIDER_MODELS_DATA: Record<string, ModelInfo[]> = {
  deepseek: [
    {
      id: 'deepseek-v4-flash',
      name: 'Deepseek V4 Flash',
      status: 'active',
      recommended: true,
      cost: '0.001元/1K tokens（输入）',
      description: '默认模型，性能足够，成本最低'
    },
    {
      id: 'deepseek-v4-pro',
      name: 'Deepseek V4 Pro',
      status: 'active',
      recommended: false,
      cost: '0.002元/1K tokens（输入）',
      description: '高性能模型，复杂任务'
    },
    {
      id: 'deepseek-chat',
      name: 'Deepseek Chat',
      status: 'deprecated',
      recommended: false,
      cost: '',
      description: '已弃用，不建议使用',
      deprecatedDate: '2026/07/24'
    },
    {
      id: 'deepseek-reasoner',
      name: 'Deepseek Reasoner',
      status: 'deprecated',
      recommended: false,
      cost: '',
      description: '已弃用，不建议使用',
      deprecatedDate: '2026/07/24'
    }
  ],
  openai: [
    {
      id: 'gpt-4o-mini',
      name: 'GPT-4o Mini',
      status: 'active',
      recommended: true,
      cost: '$0.15/1M tokens（输入）',
      description: '性价比最高，适合日常任务'
    },
    {
      id: 'gpt-4o',
      name: 'GPT-4o',
      status: 'active',
      recommended: false,
      cost: '$2.50/1M tokens（输入）',
      description: '高性能模型，复杂任务'
    },
    {
      id: 'o1-mini',
      name: 'O1 Mini',
      status: 'active',
      recommended: false,
      cost: '$1.50/1M tokens（输入）',
      description: 'Thinking 模型，推理能力强'
    },
    {
      id: 'o1-preview',
      name: 'O1 Preview',
      status: 'active',
      recommended: false,
      cost: '$15/1M tokens（输入）',
      description: 'Thinking 模型，深度推理'
    },
    {
      id: 'gpt-3.5-turbo',
      name: 'GPT-3.5 Turbo',
      status: 'deprecated',
      recommended: false,
      cost: '',
      description: '已弃用，不建议使用',
      deprecatedDate: ''
    }
  ],
  anthropic: [
    {
      id: 'claude-3-5-haiku',
      name: 'Claude 3.5 Haiku',
      status: 'active',
      recommended: true,
      cost: '$0.25/1M tokens（输入）',
      description: '性价比最高，速度快'
    },
    {
      id: 'claude-3-5-sonnet',
      name: 'Claude 3.5 Sonnet',
      status: 'active',
      recommended: false,
      cost: '$3/1M tokens（输入）',
      description: '平衡性能与成本'
    },
    {
      id: 'claude-3-opus',
      name: 'Claude 3 Opus',
      status: 'active',
      recommended: false,
      cost: '$15/1M tokens（输入）',
      description: '最高性能，复杂任务'
    }
  ]
}

// ============================================================
// API Handler
// ============================================================

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const provider = searchParams.get('provider')

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

    // 获取模型列表
    const models = PROVIDER_MODELS_DATA[provider]

    // 成功响应
    return NextResponse.json({
      data: {
        provider,
        models
      },
      message: 'success'
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '未知错误'
    return NextResponse.json(
      {
        error: 'internal_error',
        message: `查询失败：${errorMessage}`
      },
      { status: 500 }
    )
  }
}