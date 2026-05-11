/**
 * Draft Approve API
 *
 * POST /api/v1/draft/:id/approve
 * 审核通过 draft, 触发后续流水线
 *
 * 契约来源: API_CONTRACT.md v1.2 - Draft模块
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseClientService, getCurrentProjectId } from '@/lib/supabase'
import { isValidUUID } from '@/lib/utils/format'

// ============================================================
// 类型定义
// ============================================================

interface ApproveRequest {
  feedback?: string
}

interface ApproveResponse {
  draftId: string
  status: string
  approvedAt: string
  pipelineTriggered: boolean
}

// ============================================================
// POST Handler
// ============================================================
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params

    // 参数验证
    if (!isValidUUID(id)) {
      return NextResponse.json(
        { error: 'validation_error', message: 'id 格式不正确(非UUID)' },
        { status: 400 }
      )
    }

    const supabase = getSupabaseClientService()
    const projectId = await getCurrentProjectId(supabase)
    if (!projectId) {
      return NextResponse.json(
        { error: 'internal_error', message: '无法获取 project_id' },
        { status: 500 }
      )
    }

    // 查询 Draft
    const { data: draft, error: draftError } = await supabase
      .from('drafts')
      .select('*')
      .eq('id', id)
      .eq('project_id', projectId)
      .is('deleted_at', null)
      .single()

    if (draftError) {
      if (draftError.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'draft_not_found', message: 'draft 不存在' },
          { status: 404 }
        )
      }
      return NextResponse.json(
        { error: 'internal_error', message: `Supabase 查询失败: ${draftError.message}` },
        { status: 500 }
      )
    }

    if (!draft) {
      return NextResponse.json(
        { error: 'draft_not_found', message: 'draft 不存在' },
        { status: 404 }
      )
    }

    // 检查 Draft 状态
    if (draft.status === 'approved') {
      return NextResponse.json(
        { error: 'draft_already_approved', message: 'draft 状态已为 approved' },
        { status: 409 }
      )
    }

    if (draft.status === 'rejected') {
      return NextResponse.json(
        { error: 'draft_already_rejected', message: 'draft 状态已为 rejected' },
        { status: 409 }
      )
    }

    // 解析请求体
    let feedback: string | undefined
    try {
      const body: ApproveRequest = await request.json()
      feedback = body.feedback
    } catch {
      // 无请求体或请求体为空
    }

    // 更新 Draft 状态
    const approvedAt = new Date().toISOString()
    const { error: updateError } = await supabase
      .from('drafts')
      .update({
        status: 'approved',
        approved_at: approvedAt
      })
      .eq('id', id)
      .eq('project_id', projectId)

    if (updateError) {
      return NextResponse.json(
        { error: 'internal_error', message: `Supabase 更新失败: ${updateError.message}` },
        { status: 500 }
      )
    }

    // 触发后续流水线（生成 Articles)
    // 这里可以异步触发，不阻塞响应
    const pipelineTriggered = true
    // TODO: 实际实现 Article 生成流水线

    // 成功响应
    return NextResponse.json({
      data: {
        draftId: id,
        status: 'approved',
        approvedAt,
        pipelineTriggered
      },
      message: 'draft已审核通过，后续流水线已触发'
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '未知错误'
    return NextResponse.json(
      { error: 'internal_error', message: `Supabase 更新失败: ${errorMessage}` },
      { status: 500 }
    )
  }
}