/**
 * Language Switch API
 *
 * POST /api/v1/language/switch
 * 切换输出语言（前端勾选多语言）
 *
 * 契约来源：API_CONTRACT.md v1.2 - 语言切换模块
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseClientService, getCurrentProjectId } from '@/lib/supabase'

// ============================================================
// 类型定义
// ============================================================

interface SwitchLanguageRequest {
  languages: string[]  // 元素枚举：zh | en | zh-en | en-zh
}

interface SwitchLanguageResponse {
  enabledLanguages: string[]
}

// ============================================================
// POST Handler
// ============================================================

export async function POST(request: NextRequest) {
  try {
    const body: SwitchLanguageRequest = await request.json()

    // 参数验证
    const { languages } = body

    if (!languages || languages.length === 0) {
      return NextResponse.json(
        {
          error: 'validation_error',
          message: 'languages 数组为空'
        },
        { status: 400 }
      )
    }

    const validLanguages = ['zh', 'en', 'zh-en', 'en-zh']
    for (const lang of languages) {
      if (!validLanguages.includes(lang)) {
        return NextResponse.json(
          {
            error: 'validation_error',
            message: `languages 包含无效枚举值：${lang}`
          },
          { status: 400 }
        )
      }
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

    // 更新 projects.settings.output_languages
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('settings')
      .eq('id', projectId)
      .single()

    if (projectError) {
      return NextResponse.json(
        {
          error: 'internal_error',
          message: `Supabase 查询失败：${projectError.message}`
        },
        { status: 500 }
      )
    }

    // 更新 settings
    const currentSettings = project?.settings as Record<string, unknown> || {}
    const newSettings = {
      ...currentSettings,
      output_languages: languages
    }

    const { error: updateError } = await supabase
      .from('projects')
      .update({ settings: newSettings })
      .eq('id', projectId)

    if (updateError) {
      return NextResponse.json(
        {
          error: 'internal_error',
          message: `Supabase 更新失败：${updateError.message}`
        },
        { status: 500 }
      )
    }

    // 成功响应
    return NextResponse.json({
      data: {
        enabledLanguages: languages
      },
      message: `已启用${languages.length}种语言输出`
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '未知错误'
    return NextResponse.json(
      {
        error: 'internal_error',
        message: `Supabase 更新失败：${errorMessage}`
      },
      { status: 500 }
    )
  }
}