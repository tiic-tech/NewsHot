/**
 * LLM Config API
 *
 * GET /api/v1/auth/config - 读取当前 LLM 配置
 * POST /api/v1/auth/config - 保存 LLM 配置
 *
 * 契约来源：API_CONTRACT.md v1.2 - LLM配置模块
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseClientService, getCurrentProjectId } from '@/lib/supabase'
import type { LlmConfigInsert, LlmConfigUpdate } from '@/lib/types/db'

// ============================================================
// 类型定义
// ============================================================

interface SaveConfigRequest {
  provider: 'openai' | 'anthropic' | 'deepseek'
  baseUrl: string
  apiKey: string
  model: string
}

// ============================================================
// Provider 可用模型列表（用于模型可用性检查）
// ============================================================

const PROVIDER_ACTIVE_MODELS: Record<string, string[]> = {
  deepseek: ['deepseek-v4-flash', 'deepseek-v4-pro'],
  openai: ['gpt-4o-mini', 'gpt-4o', 'o1-mini', 'o1-preview'],
  anthropic: ['claude-3-5-haiku', 'claude-3-5-sonnet', 'claude-3-opus']
}

/**
 * 遮蔽 API Key，只保留前3和后3字符
 * 例如：sk-proj-abc123xyz → sk-***...***xyz
 */
function maskApiKey(apiKey: string): string {
  if (!apiKey || apiKey.length <= 6) {
    return '***'
  }
  const prefix = apiKey.slice(0, 3)
  const suffix = apiKey.slice(-3)
  return `${prefix}***...***${suffix}`
}

// ============================================================
// GET Handler - 读取当前 LLM 配置
// ============================================================

export async function GET() {
  try {
    const supabase = getSupabaseClientService()
    const projectId = await getCurrentProjectId(supabase)

    if (!projectId) {
      return NextResponse.json(
        {
          error: 'internal_error',
          message: '无法获取 project_id'
        },
        { status: 500 }
      )
    }

    // 查询当前配置
    const { data, error } = await supabase
      .from('llm_config')
      .select('*')
      .eq('project_id', projectId)
      .single()

    if (error) {
      // 未找到配置
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          {
            error: 'config_not_found',
            message: '未配置 LLM（首次使用需先 POST 配置）'
          },
          { status: 404 }
        )
      }
      return NextResponse.json(
        {
          error: 'internal_error',
          message: `Supabase 读取失败：${error.message}`
        },
        { status: 500 }
      )
    }

    // 成功响应（遮蔽 API Key）
    return NextResponse.json({
      data: {
        id: data.id,
        provider: data.provider,
        baseUrl: data.base_url,
        apiKey: maskApiKey(data.api_key),
        model: data.model,
        validatedAt: data.validated_at,
        availableModels: data.available_models,
        updatedAt: data.updated_at
      },
      message: 'success'
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '未知错误'
    return NextResponse.json(
      {
        error: 'internal_error',
        message: `Supabase 读取失败：${errorMessage}`
      },
      { status: 500 }
    )
  }
}

// ============================================================
// POST Handler - 保存 LLM 配置
// ============================================================

export async function POST(request: NextRequest) {
  try {
    const body: SaveConfigRequest = await request.json()

    // 参数验证
    const { provider, baseUrl, apiKey, model } = body

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

    // model 验证
    if (!model || model.trim() === '') {
      return NextResponse.json(
        {
          error: 'validation_error',
          message: 'model 为空字符串'
        },
        { status: 400 }
      )
    }

    // 模型可用性检查
    const activeModels = PROVIDER_ACTIVE_MODELS[provider]
    if (!activeModels.includes(model)) {
      return NextResponse.json(
        {
          error: 'model_not_available',
          message: `model 不在该 Provider 的可用模型列表中（可用：${activeModels.join(', ')}）`
        },
        { status: 400 }
      )
    }

    // 获取 project_id
    const supabase = getSupabaseClientService()
    const projectId = await getCurrentProjectId(supabase)

    if (!projectId) {
      return NextResponse.json(
        {
          error: 'internal_error',
          message: '无法获取 project_id'
        },
        { status: 500 }
      )
    }

    // 检查是否已有配置
    const { data: existingConfig, error: checkError } = await supabase
      .from('llm_config')
      .select('id')
      .eq('project_id', projectId)
      .single()

    const now = new Date().toISOString()

    if (checkError && checkError.code !== 'PGRST116') {
      return NextResponse.json(
        {
          error: 'internal_error',
          message: `Supabase 查询失败：${checkError.message}`
        },
        { status: 500 }
      )
    }

    let savedConfig

    if (existingConfig) {
      // 更新现有配置
      const updateData: LlmConfigUpdate = {
        provider,
        base_url: baseUrl,
        api_key: apiKey,
        model,
        validated_at: now,
        available_models: activeModels,
        updated_at: now
      }

      const { data, error } = await supabase
        .from('llm_config')
        .update(updateData)
        .eq('id', existingConfig.id)
        .select()
        .single()

      if (error) {
        return NextResponse.json(
          {
            error: 'internal_error',
            message: `Supabase 更新失败：${error.message}`
          },
          { status: 500 }
        )
      }

      savedConfig = data
    } else {
      // 创建新配置
      const insertData: LlmConfigInsert = {
        project_id: projectId,
        provider,
        base_url: baseUrl,
        api_key: apiKey,
        model,
        validated_at: now,
        available_models: activeModels
      }

      const { data, error } = await supabase
        .from('llm_config')
        .insert(insertData)
        .select()
        .single()

      if (error) {
        return NextResponse.json(
          {
            error: 'internal_error',
            message: `Supabase 写入失败：${error.message}`
          },
          { status: 500 }
        )
      }

      savedConfig = data
    }

    // 成功响应（遮蔽 API Key）
    return NextResponse.json({
      data: {
        id: savedConfig.id,
        provider: savedConfig.provider,
        baseUrl: savedConfig.base_url,
        apiKey: maskApiKey(savedConfig.api_key),
        model: savedConfig.model,
        validatedAt: savedConfig.validated_at,
        availableModels: savedConfig.available_models,
        updatedAt: savedConfig.updated_at
      },
      message: 'LLM配置已保存'
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '未知错误'
    return NextResponse.json(
      {
        error: 'internal_error',
        message: `Supabase 写入失败：${errorMessage}`
      },
      { status: 500 }
    )
  }
}