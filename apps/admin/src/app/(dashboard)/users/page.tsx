'use client'

import { useState, useEffect } from 'react'
import {
  Search,
  User,
  Heart,
  MessageSquare,
  Eye,
  Ban,
  ChevronLeft,
  ChevronRight,
  UserCheck,
} from 'lucide-react'
import {
  Card,
  CardContent,
  CardHeader,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { formatNumber, formatDate } from '@/lib/utils'
import { userApi } from '@/lib/api'

interface UserItem {
  id: string
  nickname: string | null
  email: string
  avatarUrl: string | null
  status: string
  favoriteCount?: number
  commentCount?: number
  createdAt: string
}

const statusMap: Record<string, { label: string; variant: 'success' | 'destructive' | 'secondary' }> = {
  active: { label: '正常', variant: 'success' },
  disabled: { label: '禁用', variant: 'destructive' },
}

export default function UsersPage() {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const pageSize = 10
  const [users, setUsers] = useState<UserItem[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)

  const [actionDialogOpen, setActionDialogOpen] = useState(false)
  const [actionUser, setActionUser] = useState<UserItem | null>(null)
  const [actionType, setActionType] = useState<'disable' | 'enable'>('disable')
  const [actionLoading, setActionLoading] = useState(false)

  useEffect(() => {
    fetchUsers()
  }, [page, status])

  const fetchUsers = async () => {
    setLoading(true)
    try {
      const params: Record<string, any> = {
        page,
        pageSize,
      }
      if (search) params.keyword = search
      if (status) params.status = status

      const data = await userApi.getUsers(params)
      setUsers(data?.items || [])
      setTotal(data?.total || 0)
    } catch (err) {
      console.error('获取用户列表失败:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = () => {
    setPage(1)
    fetchUsers()
  }

  const handleToggleStatus = (user: UserItem) => {
    setActionUser(user)
    setActionType(user.status === 'active' ? 'disable' : 'enable')
    setActionDialogOpen(true)
  }

  const handleConfirmAction = async () => {
    if (!actionUser) return

    setActionLoading(true)
    try {
      const newStatus = actionType === 'disable' ? 'disabled' : 'active'
      await userApi.updateUserStatus(actionUser.id, newStatus)
      setActionDialogOpen(false)
      setActionUser(null)
      fetchUsers()
    } catch (err: any) {
      alert(err.message || '操作失败')
    } finally {
      setActionLoading(false)
    }
  }

  const totalPages = Math.ceil(total / pageSize)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">用户管理</h1>
        <p className="text-muted-foreground">管理注册用户和账号状态</p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-4 md:flex-row md:items-center">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="搜索昵称或邮箱..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <select
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value)
                  setPage(1)
                }}
                className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm w-36"
              >
                <option value="">全部状态</option>
                <option value="active">正常</option>
                <option value="disabled">禁用</option>
              </select>
              <Button onClick={handleSearch} variant="outline">
                搜索
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>用户</TableHead>
                <TableHead>邮箱</TableHead>
                <TableHead>状态</TableHead>
                <TableHead className="text-right">收藏数</TableHead>
                <TableHead className="text-right">评论数</TableHead>
                <TableHead>注册时间</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    加载中...
                  </TableCell>
                </TableRow>
              ) : users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    暂无数据
                  </TableCell>
                </TableRow>
              ) : (
                users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                          {user.avatarUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={user.avatarUrl}
                              alt={user.nickname || ''}
                              className="h-full w-full rounded-full object-cover"
                            />
                          ) : (
                            <User className="h-5 w-5 text-muted-foreground" />
                          )}
                        </div>
                        <span className="font-medium">{user.nickname || user.email}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {user.email}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusMap[user.status]?.variant || 'secondary'}>
                        {statusMap[user.status]?.label || user.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="flex items-center justify-end gap-1">
                        <Heart className="h-3 w-3 text-muted-foreground" />
                        {formatNumber(user.favoriteCount || 0)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="flex items-center justify-end gap-1">
                        <MessageSquare className="h-3 w-3 text-muted-foreground" />
                        {formatNumber(user.commentCount || 0)}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(user.createdAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className={user.status === 'active' ? 'text-yellow-500' : 'text-green-500'}
                          onClick={() => handleToggleStatus(user)}
                          title={user.status === 'active' ? '禁用用户' : '启用用户'}
                        >
                          {user.status === 'active' ? (
                            <Ban className="h-4 w-4" />
                          ) : (
                            <UserCheck className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          <div className="mt-4 flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              共 {total} 位用户
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1 || loading}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm">
                {page} / {totalPages || 1}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages || totalPages === 0 || loading}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={actionDialogOpen} onOpenChange={setActionDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {actionType === 'disable' ? '确认禁用用户' : '确认启用用户'}
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-muted-foreground">
              确定要{actionType === 'disable' ? '禁用' : '启用'}用户
              「<span className="font-medium text-foreground">{actionUser?.nickname || actionUser?.email}</span>」吗？
            </p>
            {actionType === 'disable' && (
              <p className="text-sm text-muted-foreground mt-2">
                禁用后，该用户将无法登录和使用平台功能。
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionDialogOpen(false)} disabled={actionLoading}>
              取消
            </Button>
            <Button
              variant={actionType === 'disable' ? 'destructive' : 'default'}
              onClick={handleConfirmAction}
              disabled={actionLoading}
            >
              {actionLoading ? '处理中...' : actionType === 'disable' ? '确认禁用' : '确认启用'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
