'use client'

import { useEffect, useState, useRef } from 'react'
import { Sidebar } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/header'
import QueryProvider from '@/components/providers/query-provider'
import { useAuthStore } from '@/store/auth-store'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const token = useAuthStore((s) => s.token)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const initializedRef = useRef(false)
  const checkedRef = useRef(false)

  useEffect(() => {
    if (initializedRef.current) return
    initializedRef.current = true
    useAuthStore.getState().initialize?.()

    if (!useAuthStore.getState().token) {
      window.location.href = '/login'
    }
  }, [])

  useEffect(() => {
    if (!token) return
    if (checkedRef.current) return
    checkedRef.current = true

    useAuthStore.getState().checkAuth?.().catch(() => {
      window.location.href = '/login'
    })
  }, [token])

  if (!token) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    )
  }

  return (
    <QueryProvider>
      <div className="flex h-screen overflow-hidden">
        <div className="hidden md:block">
          <Sidebar collapsed={sidebarCollapsed} />
        </div>
        <div className="flex flex-1 flex-col overflow-hidden">
          <Header onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)} />
          <main className="flex-1 overflow-auto bg-muted/30 p-6">
            {children}
          </main>
        </div>
      </div>
    </QueryProvider>
  )
}
