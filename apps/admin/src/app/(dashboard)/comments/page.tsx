'use client'

import { useState, useEffect } from 'react'
import {
  Search,
  Check,
  X,
  Trash2,
  User,
  ChevronLeft,
  ChevronRight,
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
import { formatDate, truncateText } from '@/lib/utils'
import { commentApi } from '@/lib/api'

interface Comment {
  id: string
  dealId: string
  userId: string
  userName: string
  userAvatar: string | null
  content: string
  status: string
  likes: number
  createdAt: string
}

const statusMap: Record<string, { label: string; variant: 'default' | 'secondary' | 'success' | 'warning' | 'destructive' }> = {
  pending: { label: '待审核', variant: 'warning' },
  approved: { label: '已通过', variant: 'success' },
  rejected: { label: '已驳回', variant: 'destructive' },
}

export default function CommentsPage() {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const pageSize = 10
  const [comments, setComments] = useState<Comment[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)

  const [actionLoading, setActionLoading] = useState(false)

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deletingComment, setDeletingComment] = useState<Comment | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    fetchComments()
  }, [page, status])

  const fetchComments = async () => {
    setLoading(true)
    try {
      const params: Record<string, any> = {
        page,
        pageSize,
      }
      if (search) params.keyword = search
      if (status) params.status = status

      const data = await commentApi.getComments(params)
      setComments(data?.items || [])
      setTotal(data?.total || 0)
    } catch (err) {
      console.error('获取评论列表失败:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = () => {
    setPage(1)
    fetchComments()
  }

  const handleApprove = async (comment: Comment) => {
    setActionLoading(true)
    try {
      await commentApi.approveComment(comment.id)
      fetchComments()
    } catch (err: any) {
      alert(err.message || '操作失败')
    } finally {
      setActionLoading(false)
    }
  }

  const handleReject = async (comment: Comment) => {
    setActionLoading(true)
    try {
      await commentApi.rejectComment(comment.id)
      fetchComments()
    } catch (err: any) {
      alert(err.message || '操作失败')
    } finally {
      setActionLoading(false)
    }
  }

  const handleDeleteClick = (comment: Comment) => {
    setDeletingComment(comment)
    setDeleteDialogOpen(true)
  }

  const handleDelete = async () => {
    if (!deletingComment) return

    setDeleting(true)
    try {
      await commentApi.deleteComment(deletingComment.id)
      setDeleteDialogOpen(false)
      setDeletingComment(null)
      fetchComments()
    } catch (err: any) {
      alert(err.message || '删除失败')
    } finally {
      setDeleting(false)
    }
  }

  const totalPages = Math.ceil(total / pageSize)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">评论管理</h1>
        <p className="text-muted-foreground">审核和管理用户评论</p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-4 md:flex-row md:items-center">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="搜索评论内容..."
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
                <option value="pending">待审核</option>
                <option value="approved">已通过</option>
                <option value="rejected">已驳回</option>
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
                <TableHead>评论内容</TableHead>
                <TableHead>关联折扣ID</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>点赞数</TableHead>
                <TableHead>时间</TableHead>
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
              ) : comments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    暂无数据
                  </TableCell>
                </TableRow>
              ) : (
                comments.map((comment) => (
                  <TableRow key={comment.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                          {comment.userAvatar ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={comment.userAvatar}
                              alt={comment.userName}
                              className="h-full w-full rounded-full object-cover"
                            />
                          ) : (
                            <User className="h-4 w-4" />
                          )}
                        </div>
                        <span className="font-medium text-sm">{comment.userName}</span>
                      </div>
                    </TableCell>
                    <TableCell className="max-w-[300px]">
                      <p className="truncate">{truncateText(comment.content, 60)}</p>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {comment.dealId?.slice(0, 16)}...
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusMap[comment.status]?.variant || 'default'}>
                        {statusMap[comment.status]?.label || comment.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{comment.likes || 0}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {formatDate(comment.createdAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        {comment.status === 'pending' && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-green-500"
                              onClick={() => handleApprove(comment)}
                              disabled={actionLoading}
                              title="通过审核"
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-red-500"
                              onClick={() => handleReject(comment)}
                              disabled={actionLoading}
                              title="驳回"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive"
                          onClick={() => handleDeleteClick(comment)}
                          title="删除"
                        >
                          <Trash2 className="h-4 w-4" />
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
              共 {total} 条评论
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

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>确认删除</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-muted-foreground">
              确定要删除这条评论吗？此操作不可恢复。
            </p>
            <p className="text-sm mt-2 text-muted-foreground">
              「{deletingComment ? truncateText(deletingComment.content, 40) : ''}」
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} disabled={deleting}>
              取消
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? '删除中...' : '确认删除'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
