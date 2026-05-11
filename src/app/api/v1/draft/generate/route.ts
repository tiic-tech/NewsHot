/**
 * Draft Generate API
 *
 * POST /api/v1/draft/generate
 * 触发摘要生成（手动触发或Cron调用）
 *
 * 契约来源：API_CONTRACT.md v1.2 - Draft模块
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseClientService, getCurrentProjectId } from '@/lib/supabase'
import { runFetchPipeline } from '@/lib/fetcher'
import { runProcessorPipeline } from '@/lib/processor'
import { generateEmbeddings } from '@/lib/embedding'
import { getRedisClient, getBatchStats } from '@/lib/redis'

// ============================================================
// 类型定义
// ============================================================

interface GenerateRequest {
  date: string
  forceRegenerate?: boolean
}

// ============================================================
// Cron 鉴权验证
// ============================================================

const CRON_SECRET = process.env.CRON_SECRET || ''

function validateCronAuth(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return false
  }
  const token = authHeader.replace('Bearer ', '')
  return token === CRON_SECRET
}

// ============================================================
// POST Handler
// ============================================================

export async function POST(request: NextRequest) {
  try {
    // Cron 鉴权检查
    if (!validateCronAuth(request)) {
      return NextResponse.json(
        { error: 'unauthorized', message: '未提供有效CRON_SECRET' },
        { status: 401 }
      )
    }

    const body: GenerateRequest = await request.json()
    const { date, forceRegenerate = false } = body

    // 参数验证
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/
    if (!date || !dateRegex.test(date)) {
      return NextResponse.json(
        { error: 'validation_error', message: 'date格式不正确' },
        { status: 400 }
      )
    }

    if (forceRegenerate !== undefined && typeof forceRegenerate !== 'boolean') {
      return NextResponse.json(
        { error: 'validation_error', message: 'forceRegenerate非布尔值' },
        { status: 400 }
      )
    }

    // 检查是否已有Draft
    const supabase = getSupabaseClientService()
    const projectId = await getCurrentProjectId(supabase)

    if (!projectId) {
      return NextResponse.json(
        { error: 'internal_error', message: '无法获取project_id' },
        { status: 500 }
      )
    }

    if (!forceRegenerate) {
      const { data: existingDraft, error: draftError } = await supabase
        .from('drafts')
        .select('id')
        .eq('project_id', projectId)
        .eq('date', date)
        .is('deleted_at', null)
        .single()

      if (!draftError && existingDraft) {
        return NextResponse.json(
          { error: 'draft_already_exists', message: '指定日期draft已存在且forceRegenerate=false' },
          { status: 409 }
        )
      }
    }

    // 执行抓取流水线
    const fetchResult = await runFetchPipeline(date)
    if (fetchResult.totalItems === 0) {
      return NextResponse.json(
        { error: 'internal_error', message: '抓取失败：未获取到任何数据' },
        { status: 500 }
      )
    }

    // 为News Items生成Embedding
    const { data: itemsWithoutEmbedding, error: itemsError } = await supabase
      .from('news_items')
      .select('id, title, summary')
      .eq('project_id', projectId)
      .eq('date', date)
      .is('deleted_at', null)
      .is('embedding', null)

    if (itemsError) {
      return NextResponse.json(
        { error: 'internal_error', message: `Supabase查询失败：${itemsError.message}` },
        { status: 500 }
      )
    }

    if (itemsWithoutEmbedding && itemsWithoutEmbedding.length > 0) {
      const texts = itemsWithoutEmbedding.map(item => `${item.title}\n${item.summary}`)
      const embeddings = await generateEmbeddings(texts)
      for (let i = 0; i < itemsWithoutEmbedding.length; i++) {
        const embeddingStr = `[${embeddings[i].join(',')}]`
        await supabase
          .from('news_items')
          .update({ embedding: embeddingStr, embedding_source: 'bailian_api' })
          .eq('id', itemsWithoutEmbedding[i].id)
      }
    }

    // 执行处理流水线
    const language = 'zh' // 默认中文
    const processorResult = await runProcessorPipeline(date, language)
    if (!processorResult.draftId) {
      return NextResponse.json(
        { error: 'internal_error', message: '处理失败：未生成Draft' },
        { status: 500 }
      )
    }

    // 更新Redis统计
    const redis = getRedisClient()
    const stats = await getBatchStats(redis, date)
    const estimatedCompletionTime = new Date(Date.now() + 5 * 60 * 1000).toISOString()

    return NextResponse.json({
      data: {
        draftId: processorResult.draftId,
        status: 'draft',
        totalItems: processorResult.totalItems,
        newCount: stats?.newCount || fetchResult.newItems,
        duplicateCount: stats?.duplicateCount || fetchResult.duplicateItems,
        clustersCount: processorResult.clustersCount,
        estimatedCompletionTime
      },
      message: '摘要生成任务已启动'
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '未知错误'
    // 区分错误类型
    if (errorMessage.includes('Embedding') || errorMessage.includes('bailian')) {
      return NextResponse.json(
        { error: 'service_unavailable', message: 'Embedding API调用失败' },
        { status: 503 }
      )
    }
    if (errorMessage.includes('LLM') || errorMessage.includes('Deepseek') || errorMessage.includes('API')) {
      return NextResponse.json(
        { error: 'service_unavailable', message: 'LLM API调用失败' },
        { status: 503 }
      )
    }
    return NextResponse.json(
      { error: 'internal_error', message: `流水线执行失败：${errorMessage}` },
      { status: 500 }
    )
  }
}