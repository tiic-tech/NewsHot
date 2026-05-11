'use client'

/**
 * Sidebar 组件
 *
 * 审核页面右侧 Chatbot 交互区域
 * 样式严格遵循 DESIGN_SYSTEM.md 规范
 */

import { useState } from 'react'
import ChatbotInput, { ChatMessage } from '@/components/ui/chatbot-input'
import ThinkingDisplay from '@/components/ui/thinking-display'
import { useTools } from '@/hooks/use-tools'

// ============================================================
// 类型定义
// ============================================================

export interface SidebarProps {
  /** Draft ID */
  draftId: string
  /** 审核通过回调 */
  onApprove?: () => void
}

// ============================================================
// 意图识别映射（简化版）
// ============================================================

const INTENT_MAP: Record<string, { tool: string; paramsTemplate: (args: string[]) => Record<string, unknown> }> = {
  '删除': {
    tool: 'delete_item',
    paramsTemplate: (args) => ({ itemId: args[0] })
  },
  '编辑': {
    tool: 'edit_item_summary',
    paramsTemplate: (args) => ({ itemId: args[0], newSummary: args.slice(1).join(' ') })
  },
  '合并': {
    tool: 'merge_clusters',
    paramsTemplate: (args) => ({ clusterIds: args, newTheme: '合并主题' })
  },
  '列表': {
    tool: 'list_clusters',
    paramsTemplate: () => ({ draftId: '' })
  }
}

// ============================================================
// 简单意图解析
// ============================================================

function parseIntent(message: string, draftId: string): { toolName: string; params: Record<string, unknown> } | null {
  // 删除 item_xxx
  const deleteMatch = message.match(/删除\s+(item_\w+)/i)
  if (deleteMatch) {
    return {
      toolName: 'delete_item',
      params: { itemId: deleteMatch[1] }
    }
  }

  // 编辑 item_xxx 内容
  const editMatch = message.match(/编辑\s+(item_\w+)\s+(.+)/i)
  if (editMatch) {
    return {
      toolName: 'edit_item_summary',
      params: { itemId: editMatch[1], newSummary: editMatch[2] }
    }
  }

  // 列出 clusters
  if (message.match(/列出|列表|show/i)) {
    return {
      toolName: 'list_clusters',
      params: { draftId }
    }
  }

  // 合并 cluster_xxx cluster_yyy
  const mergeMatch = message.match(/合并\s+(cluster_\w+)\s+(cluster_\w+)/i)
  if (mergeMatch) {
    return {
      toolName: 'merge_clusters',
      params: { clusterIds: [mergeMatch[1], mergeMatch[2]], newTheme: '合并主题' }
    }
  }

  return null
}

// ============================================================
// 主组件：Sidebar
// ============================================================

export default function Sidebar({ draftId, onApprove }: SidebarProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const { callTool, executing, thinking, content, error, clearState } = useTools()

  // 发送消息
  const handleSend = async (message: string) => {
    // 添加用户消息
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: message,
      timestamp: new Date().toISOString()
    }
    setMessages(prev => [...prev, userMessage])

    // 解析意图
    const intent = parseIntent(message, draftId)

    if (!intent) {
      // 无法识别意图
      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: '无法识别您的指令。请尝试以下格式：\n- 删除 item_xxx\n- 编辑 item_xxx 新内容\n- 列出 clusters',
        timestamp: new Date().toISOString()
      }
      setMessages(prev => [...prev, assistantMessage])
      return
    }

    // 调用 Tool
    const result = await callTool(intent.toolName as any, intent.params as any)

    // 添加助手消息
    const assistantMessage: ChatMessage = {
      id: `assistant-${Date.now()}`,
      role: 'assistant',
      content: error
        ? `执行失败：${error}`
        : result
          ? content || '操作完成'
          : '执行中...',
      thinking: thinking || undefined,
      timestamp: new Date().toISOString()
    }
    setMessages(prev => [...prev, assistantMessage])

    // 清除状态
    clearState()
  }

  // 审核通过
  const handleApprove = () => {
    onApprove?.()
  }

  return (
    <aside
      className="h-full bg-bg-subtle border border-border-default rounded-lg flex flex-col"
      role="complementary"
      aria-label="Chatbot 交互区域"
    >
      {/* Chatbot 输入框 */}
      <div className="flex-1 min-h-0">
        <ChatbotInput
          messages={messages}
          onSend={handleSend}
          loading={executing}
          placeholder="输入指令调整内容..."
        />
      </div>

      {/* 审核按钮 */}
      <div className="p-4 border-t border-border-muted">
        <button
          onClick={handleApprove}
          disabled={executing}
          className="btn btn-success w-full"
          aria-label="审核通过"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          审核通过
        </button>
      </div>
    </aside>
  )
}