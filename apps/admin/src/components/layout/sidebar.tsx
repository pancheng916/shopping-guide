'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Tag,
  Package,
  FolderTree,
  Users,
  MessageSquare,
  Settings,
  Percent,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const menuItems = [
  {
    title: '数据看板',
    icon: LayoutDashboard,
    path: '/',
  },
  {
    title: '折扣管理',
    icon: Tag,
    path: '/deals',
  },
  {
    title: '商品管理',
    icon: Package,
    path: '/products',
  },
  {
    title: '分类管理',
    icon: FolderTree,
    path: '/categories',
  },
  {
    title: '用户管理',
    icon: Users,
    path: '/users',
  },
  {
    title: '评论管理',
    icon: MessageSquare,
    path: '/comments',
  },
  {
    title: '系统设置',
    icon: Settings,
    path: '/settings',
  },
]

interface SidebarProps {
  collapsed?: boolean
}

export function Sidebar({ collapsed = false }: SidebarProps) {
  const pathname = usePathname()

  return (
    <aside
      className={cn(
        'flex h-screen flex-col border-r bg-background transition-all duration-300',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      <div className="flex h-16 items-center border-b px-4">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Percent className="h-5 w-5" />
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="text-sm font-semibold">今日折扣</span>
              <span className="text-xs text-muted-foreground">运营后台</span>
            </div>
          )}
        </Link>
      </div>

      <nav className="flex-1 space-y-1 p-2">
        {menuItems.map((item) => {
          const isActive =
            item.path === '/'
              ? pathname === '/'
              : pathname.startsWith(item.path)

          return (
            <Link
              key={item.path}
              href={item.path}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                collapsed && 'justify-center px-2'
              )}
            >
              <item.icon className="h-5 w-5 shrink-0" />
              {!collapsed && <span>{item.title}</span>}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
