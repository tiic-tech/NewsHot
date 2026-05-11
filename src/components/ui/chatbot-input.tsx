'use client'

/**
 * Chatbot 输入框组件
 *
 * 用于审核页面 Chatbot 交互
 * 样式严格遵循 DESIGN_SYSTEM.md 规范
 */

import { useState, useRef, useEffect } from 'react'

// ============================================================
// 类型定义
// ============================================================

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  thinking?: string
  timestamp: string
}

export interface ChatbotInputProps {
  /** 消息列表 */
  messages: ChatMessage[]
  /** 发送消息回调 */
  onSend: (message: string) => void
  /** 是否正在处理 */
  loading?: boolean
  /** 占位符文本 */
  placeholder?: string
  /** 最大输入长度 */
  maxLength?: number
}

// ============================================================
// 子组件：ChatMessageBubble
// ============================================================

function ChatMessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user'

  return (
    <div
      className={`
        flex ${isUser ? 'justify-end' : 'justify-start'}
        animate-fade-in
      `}
      role="article"
      aria-label={`${isUser ? '用户' : '助手'}消息`}
    >
      <div
        className={`
          max-w-[80%] p-3 rounded-md
          ${isUser
            ? 'bg-primary-500 text-white'
            : 'bg-bg-subtle text-text-primary border border-border-default'
          }
        `}
      >
        {/* 消息内容 */}
        <p className="text-base whitespace-pre-wrap break-words">
          {message.content}
        </p>

        {/* Thinking 显示（仅助手消息） */}
        {!isUser && message.thinking && (
          <ThinkingDisplay thinking={message.thinking} />
        )}

        {/* 时间戳 */}
        <span
          className={`
            block mt-1 text-xs
            ${isUser ? 'text-white/80' : 'text-text-tertiary'}
          `}
        >
          {new Date(message.timestamp).toLocaleTimeString('zh-CN', {
            hour: '2-digit',
            minute: '2-digit'
          })}
        </span>
      </div>
    </div>
  )
}

// ============================================================
// 子组件：ThinkingDisplay
// ============================================================

function ThinkingDisplay({ thinking: thinkingContent }: { thinking: string }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div
      className="mt-2 bg-bg-muted border-l-2 border-primary-500 rounded px-2 py-1"
      role="region"
      aria-label="推理过程"
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="text-xs text-text-tertiary hover:text-text-secondary w-full text-left"
        aria-expanded={expanded}
      >
        {expanded ? '隐藏推理过程' : '显示推理过程'}
      </button>

      {expanded && (
        <div
          className="mt-1 text-xs text-text-secondary whitespace-pre-wrap max-h-[300px] overflow-y-auto"
          style={{ scrollbarWidth: 'thin' }}
        >
          {thinkingContent}
        </div>
      )}
    </div>
  )
}

// ============================================================
// 主组件：ChatbotInput
// ============================================================

export default function ChatbotInput({
  messages,
  onSend,
  loading = false,
  placeholder = '输入指令调整内容...',
  maxLength = 1000
}: ChatbotInputProps) {
  const [inputValue, setInputValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // 自动滚动到最新消息
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // 发送消息
  const handleSend = () => {
    if (inputValue.trim() && !loading) {
      onSend(inputValue.trim())
      setInputValue('')
      inputRef.current?.focus()
    }
  }

  // 键盘提交
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div
      className="flex flex-col h-full bg-bg-base border border-border-default rounded-lg"
      role="region"
      aria-label="Chatbot 交互区域"
    >
      {/* 消息列表区域 */}
      <div
        className="flex-1 overflow-y-auto p-4 space-y-3"
        style={{ scrollbarWidth: 'thin' }}
      >
        {messages.length === 0 ? (
          <div className="text-center text-text-tertiary py-8">
            <p>开始对话以调整内容</p>
            <p className="text-xs mt-1">例如："删除 item_005"</p>
          </div>
        ) : (
          messages.map((msg) => (
            <ChatMessageBubble key={msg.id} message={msg} />
          ))
        )}

        {/* 加载状态 */}
        {loading && (
          <div className="flex justify-start animate-fade-in">
            <div className="bg-bg-subtle border border-border-default rounded-md p-3">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-primary-500 rounded-full animate-bounce" />
                <span className="text-sm text-text-tertiary">正在处理...</span>
              </div>
            </div>
          </div>
        )}

        {/* 滚动锚点 */}
        <div ref={messagesEndRef} />
      </div>

      {/* 输入框区域 */}
      <div className="border-t border-border-muted p-4">
        <div className="flex items-center gap-3">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            maxLength={maxLength}
            disabled={loading}
            className={`
              flex-1 h-[48px] px-4 bg-bg-muted border border-border-default rounded-lg
              text-base text-text-primary placeholder:text-text-tertiary
              focus:outline-none focus:border-primary-500 focus:bg-bg-base
              disabled:opacity-50 disabled:cursor-not-allowed
              transition-colors duration-150
            `}
            aria-label="Chatbot 输入框"
          />

          {/* 发送按钮 */}
          <button
            onClick={handleSend}
            disabled={!inputValue.trim() || loading}
            className={`
              w-[48px] h-[48px] rounded-full flex items-center justify-center
              bg-primary-500 hover:bg-primary-600 active:bg-primary-700
              disabled:bg-bg-muted disabled:text-text-disabled disabled:cursor-not-allowed
              transition-colors duration-150
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500
            `}
            aria-label="发送消息"
          >
            {loading ? (
              <svg className="w-5 h-5 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            ) : (
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            )}
          </button>
        </div>

        {/* 字数提示 */}
        <div className="mt-1 text-xs text-text-tertiary text-right">
          {inputValue.length}/{maxLength}
        </div>
      </div>
    </div>
  )
}