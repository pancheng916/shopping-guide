import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: '运营后台',
  description: '购物指南运营管理后台',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-CN">
      <body suppressHydrationWarning>{children}</body>
    </html>
  )
}
