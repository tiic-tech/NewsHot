/**
 * Cron Fetch API
 *
 * GET /api/v1/cron/fetch
 * 定时抓取任务（04:00触发）
 *
 * 契约来源: API_CONTRACT.md v1.2 - Cron Jobs模块
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseClientService, getCurrentProjectId } from '@/lib/supabase'
import { runFetchPipeline } from '@/lib/fetcher'
import { runProcessorPipeline } from '@/lib/processor'
import { getRedisClient } from '@/lib/redis'
import { generateEmbeddings } from '@/lib/embedding'

// ============================================================
// 环境变量
// ============================================================

const CRON_SECRET = process.env.CRON_SECRET || ''

// ============================================================
// Cron 鉴权验证
// ============================================================

function validateCronAuth(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return false
  }
  const token = authHeader.replace('Bearer ', '')
  return token === CRON_SECRET
}

// ============================================================
// GET Handler
// ============================================================

export async function GET(request: NextRequest) {
  try {
    // Cron 鉴权检查
    if (!validateCronAuth(request)) {
      return NextResponse.json(
        { error: 'unauthorized', message: '未提供有效 CRON_SECRET' },
        { status: 401 }
      )
    }

    // 获取当天日期
    const today = new Date()
    const dateStr = today.toISOString().split('T')[0]

    // 执行抓取流水线
    const fetchResult = await runFetchPipeline(dateStr)
    if (fetchResult.totalItems === 0) {
      return NextResponse.json(
        { error: 'internal_error', message: '抓取失败:未获取到任何数据' },
        { status: 500 }
      )
    }

    // 为 News Items 生成 Embedding
    const supabase = getSupabaseClientService()
    const projectId = await getCurrentProjectId(supabase)
    if (!projectId) {
      return NextResponse.json(
        { error: 'internal_error', message: '无法获取 project_id' },
        { status: 500 }
      )
    }

    const { data: itemsWithoutEmbedding, error: itemsError } = await supabase
      .from('news_items')
      .select('id, title, summary')
      .eq('project_id', projectId)
      .eq('date', dateStr)
      .is('deleted_at', null)
      .is('embedding', null)

    if (itemsError) {
      return NextResponse.json(
        { error: 'internal_error', message: `Supabase 查询失败: ${itemsError.message}` },
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
    const processorResult = await runProcessorPipeline(dateStr, language)
    if (!processorResult.draftId) {
      return NextResponse.json(
        { error: 'internal_error', message: '处理失败:未生成 Draft' },
        { status: 500 }
      )
    }

    // 成功响应
    return NextResponse.json({
      data: {
        draftId: processorResult.draftId,
        status: 'draft',
        totalItems: processorResult.totalItems,
        newCount: fetchResult.newItems,
        duplicateCount: fetchResult.duplicateItems,
        clustersCount: processorResult.clustersCount,
        executionTimeMs: fetchResult.totalTimeMs + processorResult.totalTimeMs
      },
      message: '定时抓取任务执行成功'
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '未知错误'
    // 区分错误类型
    if (errorMessage.includes('Feed') || errorMessage.includes('fetch')) {
      return NextResponse.json(
        { error: 'internal_error', message: `Feed 抓取失败: ${errorMessage}` },
        { status: 500 }
      )
    }
    if (errorMessage.includes('Embedding') || errorMessage.includes('bailian')) {
      return NextResponse.json(
        { error: 'service_unavailable', message: 'Embedding API 调用失败' },
        { status: 503 }
      )
    }
    if (errorMessage.includes('LLM') || errorMessage.includes('Deepseek') || errorMessage.includes('API')) {
      return NextResponse.json(
        { error: 'service_unavailable', message: 'LLM API 调用失败' },
        { status: 503 }
      )
    }
    return NextResponse.json(
      { error: 'internal_error', message: `Supabase 写入失败: ${errorMessage}` },
      { status: 500 }
    )
  }
}