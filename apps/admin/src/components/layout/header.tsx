'use client'

import { useState, useRef, useEffect } from 'react'
import {
  Bell,
  Search,
  Menu,
  ChevronDown,
  User,
  Lock,
  LogOut,
} from 'lucide-react'
import { useAuthStore } from '@/store/auth-store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface HeaderProps {
  onToggleSidebar?: () => void
}

export function Header({ onToggleSidebar }: HeaderProps) {
  const admin = useAuthStore((s) => s.admin)
  const logout = useAuthStore((s) => s.logout)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setDropdownOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleLogout = async () => {
    try {
      await logout()
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      window.location.href = '/login'
    }
  }

  return (
    <header className="flex h-16 items-center justify-between border-b bg-background px-4">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={onToggleSidebar}
        >
          <Menu className="h-5 w-5" />
        </Button>

        <div className="relative hidden w-72 md:block">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="搜索..."
            className="pl-10"
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          <Badge
            variant="destructive"
            className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center p-0 text-[10px]"
          >
            3
          </Badge>
        </Button>

        <div className="relative" ref={dropdownRef}>
          <Button
            variant="ghost"
            className="flex items-center gap-2"
            onClick={() => setDropdownOpen(!dropdownOpen)}
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
              {admin?.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={admin.avatarUrl}
                  alt={admin.nickname}
                  className="h-full w-full rounded-full object-cover"
                />
              ) : (
                <User className="h-4 w-4" />
              )}
            </div>
            <div className="hidden flex-col items-start text-left md:flex">
              <span className="text-sm font-medium">
                {admin?.nickname || '管理员'}
              </span>
              <span className="text-xs text-muted-foreground">
                {admin?.role?.displayName || admin?.role?.name || '超级管理员'}
              </span>
            </div>
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </Button>

          {dropdownOpen && (
            <div className="absolute right-0 top-full z-50 mt-2 w-48 rounded-lg border bg-background shadow-lg">
              <div className="p-2">
                <button
                  className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-left hover:bg-accent hover:text-accent-foreground"
                  onClick={() => setDropdownOpen(false)}
                >
                  <User className="h-4 w-4" />
                  <span>个人资料</span>
                </button>
                <button
                  className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-left hover:bg-accent hover:text-accent-foreground"
                  onClick={() => setDropdownOpen(false)}
                >
                  <Lock className="h-4 w-4" />
                  <span>修改密码</span>
                </button>
              </div>
              <div className="border-t p-2">
                <button
                  className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-left text-destructive hover:bg-destructive/10"
                  onClick={handleLogout}
                >
                  <LogOut className="h-4 w-4" />
                  <span>退出登录</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
