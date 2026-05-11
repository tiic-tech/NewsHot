'use client'

/**
 * Markdown 渲染组件
 *
 * 用于展示 Draft 的 Markdown 内容
 * 样式严格遵循 DESIGN_SYSTEM.md 规范
 */

import { useMemo } from 'react'

// ============================================================
// 类型定义
// ============================================================

export interface MarkdownRendererProps {
  /** Markdown 内容 */
  content: string
  /** 最大高度（超出后滚动） */
  maxHeight?: number | string
  /** 是否显示目录 */
  showToc?: boolean
}

// ============================================================
// 简化版 Markdown 解析器
// ============================================================

interface MarkdownNode {
  type: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'p' | 'ul' | 'ol' | 'blockquote' | 'code' | 'hr'
  content: string | MarkdownNode[]
  level?: number
}

function parseMarkdown(content: string): MarkdownNode[] {
  const lines = content.split('\n')
  const nodes: MarkdownNode[] = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    // 空行跳过
    if (!line.trim()) {
      i++
      continue
    }

    // 标题
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/)
    if (headingMatch) {
      const level = headingMatch[1].length
      nodes.push({
        type: `h${level}` as MarkdownNode['type'],
        content: headingMatch[2]
      })
      i++
      continue
    }

    // 代码块
    if (line.startsWith('```')) {
      const codeLines: string[] = []
      i++
      while (i < lines.length && !lines[i].startsWith('```')) {
        codeLines.push(lines[i])
        i++
      }
      i++ // 跳过结束标记
      nodes.push({
        type: 'code',
        content: codeLines.join('\n')
      })
      continue
    }

    // 引用块
    if (line.startsWith('>')) {
      nodes.push({
        type: 'blockquote',
        content: line.slice(1).trim()
      })
      i++
      continue
    }

    // 无序列表
    if (line.match(/^[-*]\s+/)) {
      const listItems: MarkdownNode[] = []
      while (i < lines.length && lines[i].match(/^[-*]\s+/)) {
        listItems.push({
          type: 'p',
          content: lines[i].replace(/^[-*]\s+/, '')
        })
        i++
      }
      nodes.push({
        type: 'ul',
        content: listItems
      })
      continue
    }

    // 有序列表
    if (line.match(/^\d+\.\s+/)) {
      const listItems: MarkdownNode[] = []
      while (i < lines.length && lines[i].match(/^\d+\.\s+/)) {
        listItems.push({
          type: 'p',
          content: lines[i].replace(/^\d+\.\s+/, '')
        })
        i++
      }
      nodes.push({
        type: 'ol',
        content: listItems
      })
      continue
    }

    // 水平线
    if (line.match(/^-{3,}$/) || line.match(/^\*{3,}$/)) {
      nodes.push({
        type: 'hr',
        content: ''
      })
      i++
      continue
    }

    // 普通段落
    nodes.push({
      type: 'p',
      content: line
    })
    i++
  }

  return nodes
}

// ============================================================
// Markdown 渲染器
// ============================================================

function renderNode(node: MarkdownNode, key: number): React.ReactNode {
  // 处理内联样式（链接、粗体、斜体）
  const processInline = (text: string): React.ReactNode => {
    // 链接 [text](url)
    const linkMatch = text.match(/\[([^\]]+)\]\(([^)]+)\)/)
    if (linkMatch) {
      const before = text.slice(0, text.indexOf(linkMatch[0]))
      const after = text.slice(text.indexOf(linkMatch[0]) + linkMatch[0].length)
      return (
        <>
          {before && processInline(before)}
          <a
            href={linkMatch[2]}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary-500 hover:text-primary-600 underline"
          >
            {linkMatch[1]}
          </a>
          {after && processInline(after)}
        </>
      )
    }

    // 粗体 **text**
    const boldMatch = text.match(/\*\*([^*]+)\*\*/)
    if (boldMatch) {
      const before = text.slice(0, text.indexOf(boldMatch[0]))
      const after = text.slice(text.indexOf(boldMatch[0]) + boldMatch[0].length)
      return (
        <>
          {before && processInline(before)}
          <strong className="font-semibold">{boldMatch[1]}</strong>
          {after && processInline(after)}
        </>
      )
    }

    // 斜体 *text*
    const italicMatch = text.match(/\*([^*]+)\*/)
    if (italicMatch) {
      const before = text.slice(0, text.indexOf(italicMatch[0]))
      const after = text.slice(text.indexOf(italicMatch[0]) + italicMatch[0].length)
      return (
        <>
          {before && processInline(before)}
          <em className="italic">{italicMatch[1]}</em>
          {after && processInline(after)}
        </>
      )
    }

    return text
  }

  switch (node.type) {
    case 'h1':
      return (
        <h1 key={key} className="text-2xl font-bold text-text-primary mt-6 mb-4">
          {processInline(node.content as string)}
        </h1>
      )

    case 'h2':
      return (
        <h2 key={key} className="text-xl font-semibold text-text-primary mt-5 mb-3">
          {processInline(node.content as string)}
        </h2>
      )

    case 'h3':
      return (
        <h3 key={key} className="text-lg font-medium text-text-primary mt-4 mb-2">
          {processInline(node.content as string)}
        </h3>
      )

    case 'h4':
    case 'h5':
    case 'h6':
      return (
        <h4 key={key} className="text-base font-medium text-text-primary mt-3 mb-2">
          {processInline(node.content as string)}
        </h4>
      )

    case 'p':
      return (
        <p key={key} className="text-base text-text-secondary leading-relaxed mb-3">
          {processInline(node.content as string)}
        </p>
      )

    case 'blockquote':
      return (
        <blockquote
          key={key}
          className="bg-bg-muted border-l-4 border-primary-300 rounded px-4 py-2 my-3 text-sm text-text-secondary italic"
        >
          {processInline(node.content as string)}
        </blockquote>
      )

    case 'code':
      return (
        <pre
          key={key}
          className="bg-bg-muted font-mono text-sm rounded-md p-4 overflow-x-auto my-3 border border-border-muted"
        >
          <code className="text-text-primary">{node.content}</code>
        </pre>
      )

    case 'ul':
      return (
        <ul key={key} className="list-disc list-inside space-y-2 my-3 pl-4">
          {(node.content as MarkdownNode[]).map((item, idx) => (
            <li key={idx} className="text-base text-text-secondary">
              {processInline(item.content as string)}
            </li>
          ))}
        </ul>
      )

    case 'ol':
      return (
        <ol key={key} className="list-decimal list-inside space-y-2 my-3 pl-4">
          {(node.content as MarkdownNode[]).map((item, idx) => (
            <li key={idx} className="text-base text-text-secondary">
              {processInline(item.content as string)}
            </li>
          ))}
        </ol>
      )

    case 'hr':
      return (
        <hr key={key} className="border-t border-border-muted my-6" />
      )

    default:
      return null
  }
}

// ============================================================
// 主组件：MarkdownRenderer
// ============================================================

export default function MarkdownRenderer({
  content,
  maxHeight,
  showToc = false
}: MarkdownRendererProps) {
  // 解析 Markdown
  const nodes = useMemo(() => parseMarkdown(content), [content])

  // 提取标题用于目录
  const headings = useMemo(() => {
    if (!showToc) return []
    return nodes
      .filter(n => n.type.startsWith('h'))
      .map(n => ({
        level: parseInt(n.type.slice(1)),
        content: n.content as string
      }))
  }, [nodes, showToc])

  return (
    <div
      className="markdown-content"
      style={maxHeight ? { maxHeight, overflowY: 'auto', scrollbarWidth: 'thin' } : undefined}
    >
      {/* 目录 */}
      {showToc && headings.length > 0 && (
        <nav className="bg-bg-muted border border-border-muted rounded-md p-4 mb-6">
          <h3 className="text-sm font-semibold text-text-primary mb-2">目录</h3>
          <ul className="space-y-1">
            {headings.map((h, idx) => (
              <li
                key={idx}
                className={`text-xs text-text-secondary hover:text-primary-500 cursor-pointer`}
                style={{ paddingLeft: `${(h.level - 1) * 12}px` }}
              >
                {h.content}
              </li>
            ))}
          </ul>
        </nav>
      )}

      {/* 内容渲染 */}
      {nodes.map((node, idx) => renderNode(node, idx))}
    </div>
  )
}