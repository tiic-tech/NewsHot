import type { Metadata } from 'next'
import '../styles/globals.css'

export const metadata: Metadata = {
  title: 'NewsHot - AI新闻聚合平台',
  description: 'AI新闻聚合与智能摘要平台',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-CN">
      <body className="bg-bg-base text-text-primary antialiased">
        {children}
      </body>
    </html>
  )
}