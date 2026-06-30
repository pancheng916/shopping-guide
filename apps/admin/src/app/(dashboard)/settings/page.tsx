'use client'

import { useState, useEffect } from 'react'
import {
  Plus,
  Edit,
  Trash2,
  User,
  Shield,
  FileText,
  Save,
  RefreshCw,
} from 'lucide-react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { formatDate } from '@/lib/utils'
import { settingsApi } from '@/lib/api'

interface AdminItem {
  id: number
  username: string
  nickname: string | null
  email: string
  roleId: number
  roleName: string | null
  roleDisplayName: string | null
  status: string
  createdAt: string
}

interface AuditLogItem {
  id: number
  adminUsername: string
  action: string
  module: string
  ipAddress: string
  createdAt: string
}

export default function SettingsPage() {
  const [siteName, setSiteName] = useState('')
  const [siteDescription, setSiteDescription] = useState('')
  const [siteKeywords, setSiteKeywords] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [enableRegistration, setEnableRegistration] = useState(true)
  const [enableComment, setEnableComment] = useState(true)
  const [commentNeedReview, setCommentNeedReview] = useState(false)
  const [siteSaving, setSiteSaving] = useState(false)
  const [siteLoading, setSiteLoading] = useState(true)

  const [admins, setAdmins] = useState<AdminItem[]>([])
  const [adminsLoading, setAdminsLoading] = useState(false)

  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([])
  const [logsLoading, setLogsLoading] = useState(false)
  const [logsPage, setLogsPage] = useState(1)
  const [logsTotal, setLogsTotal] = useState(0)
  const pageSize = 20

  const [adminDialogOpen, setAdminDialogOpen] = useState(false)
  const [editingAdmin, setEditingAdmin] = useState<AdminItem | null>(null)
  const [adminForm, setAdminForm] = useState({
    username: '',
    email: '',
    nickname: '',
    password: '',
    roleId: 2,
    status: 'active',
  })
  const [adminSaving, setAdminSaving] = useState(false)

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deletingAdmin, setDeletingAdmin] = useState<AdminItem | null>(null)
  const [deleting, setDeleting] = useState(false)

  const [activeTab, setActiveTab] = useState('site')

  useEffect(() => {
    if (activeTab === 'site') {
      loadSiteSettings()
    } else if (activeTab === 'admins') {
      loadAdmins()
    } else if (activeTab === 'logs') {
      loadAuditLogs()
    }
  }, [activeTab])

  useEffect(() => {
    if (activeTab === 'logs') {
      loadAuditLogs()
    }
  }, [logsPage])

  const loadSiteSettings = async () => {
    setSiteLoading(true)
    try {
      const data = await settingsApi.getSiteSettings()
      setSiteName(data?.site_name?.value || '')
      setSiteDescription(data?.site_description?.value || '')
      setSiteKeywords(data?.site_keywords?.value || '')
      setContactEmail(data?.contact_email?.value || '')
      setEnableRegistration(data?.enable_register?.value !== false)
      setEnableComment(data?.enable_comment?.value !== false)
      setCommentNeedReview(data?.comment_need_review?.value === true)
    } catch (err) {
      console.error('获取站点设置失败:', err)
    } finally {
      setSiteLoading(false)
    }
  }

  const handleSaveSiteSettings = async () => {
    setSiteSaving(true)
    try {
      await settingsApi.updateSiteSettings({
        site_name: siteName,
        site_description: siteDescription,
        site_keywords: siteKeywords,
        contact_email: contactEmail,
        enable_register: enableRegistration,
        enable_comment: enableComment,
        comment_need_review: commentNeedReview,
      })
      alert('设置保存成功')
    } catch (err: any) {
      alert(err.message || '保存失败')
    } finally {
      setSiteSaving(false)
    }
  }

  const loadAdmins = async () => {
    setAdminsLoading(true)
    try {
      const data = await settingsApi.getAdmins({ pageSize: 100 })
      setAdmins(data?.items || [])
    } catch (err) {
      console.error('获取管理员列表失败:', err)
    } finally {
      setAdminsLoading(false)
    }
  }

  const handleAddAdmin = () => {
    setEditingAdmin(null)
    setAdminForm({
      username: '',
      email: '',
      nickname: '',
      password: '',
      roleId: 2,
      status: 'active',
    })
    setAdminDialogOpen(true)
  }

  const handleEditAdmin = (admin: AdminItem) => {
    setEditingAdmin(admin)
    setAdminForm({
      username: admin.username,
      email: admin.email,
      nickname: admin.nickname || '',
      password: '',
      roleId: admin.roleId,
      status: admin.status,
    })
    setAdminDialogOpen(true)
  }

  const handleSaveAdmin = async () => {
    if (!adminForm.username || !adminForm.email) {
      alert('用户名和邮箱不能为空')
      return
    }
    if (!editingAdmin && !adminForm.password) {
      alert('密码不能为空')
      return
    }

    setAdminSaving(true)
    try {
      if (editingAdmin) {
        const updateData: Record<string, any> = {
          email: adminForm.email,
          nickname: adminForm.nickname,
          roleId: adminForm.roleId,
          status: adminForm.status,
        }
        if (adminForm.password) {
          updateData.password = adminForm.password
        }
        await settingsApi.updateAdmin(String(editingAdmin.id), updateData)
      } else {
        await settingsApi.createAdmin({
          username: adminForm.username,
          email: adminForm.email,
          nickname: adminForm.nickname,
          password: adminForm.password,
          roleId: adminForm.roleId,
        })
      }
      setAdminDialogOpen(false)
      setEditingAdmin(null)
      loadAdmins()
    } catch (err: any) {
      alert(err.message || '保存失败')
    } finally {
      setAdminSaving(false)
    }
  }

  const handleDeleteClick = (admin: AdminItem) => {
    setDeletingAdmin(admin)
    setDeleteDialogOpen(true)
  }

  const handleDeleteAdmin = async () => {
    if (!deletingAdmin) return

    setDeleting(true)
    try {
      await settingsApi.deleteAdmin(String(deletingAdmin.id))
      setDeleteDialogOpen(false)
      setDeletingAdmin(null)
      loadAdmins()
    } catch (err: any) {
      alert(err.message || '删除失败')
    } finally {
      setDeleting(false)
    }
  }

  const loadAuditLogs = async () => {
    setLogsLoading(true)
    try {
      const data = await settingsApi.getAuditLogs({ page: logsPage, pageSize })
      setAuditLogs(data?.items || [])
      setLogsTotal(data?.total || 0)
    } catch (err) {
      console.error('获取操作日志失败:', err)
    } finally {
      setLogsLoading(false)
    }
  }

  const handleClearCache = async () => {
    if (!confirm('确定要清除所有缓存吗？')) return
    try {
      const data = await settingsApi.clearCache()
      alert(`缓存清除成功，共清除 ${data?.clearedCount || 0} 条缓存`)
    } catch (err: any) {
      alert(err.message || '清除缓存失败')
    }
  }

  const logTotalPages = Math.ceil(logsTotal / pageSize)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">系统设置</h1>
          <p className="text-muted-foreground">配置系统参数和管理选项</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleClearCache}>
          <RefreshCw className="mr-2 h-4 w-4" />
          清除缓存
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList>
          <TabsTrigger value="site">
            <Shield className="mr-2 h-4 w-4" />
            站点设置
          </TabsTrigger>
          <TabsTrigger value="admins">
            <User className="mr-2 h-4 w-4" />
            管理员管理
          </TabsTrigger>
          <TabsTrigger value="logs">
            <FileText className="mr-2 h-4 w-4" />
            操作日志
          </TabsTrigger>
        </TabsList>

        <TabsContent value="site" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>站点设置</CardTitle>
              <CardDescription>配置网站基本信息和功能开关</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {siteLoading ? (
                <div className="text-center py-8 text-muted-foreground">加载中...</div>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="siteName">站点名称</Label>
                    <Input
                      id="siteName"
                      value={siteName}
                      onChange={(e) => setSiteName(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="siteDescription">站点描述</Label>
                    <Textarea
                      id="siteDescription"
                      value={siteDescription}
                      onChange={(e) => setSiteDescription(e.target.value)}
                      rows={3}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="siteKeywords">关键词</Label>
                    <Input
                      id="siteKeywords"
                      value={siteKeywords}
                      onChange={(e) => setSiteKeywords(e.target.value)}
                      placeholder="多个关键词用逗号分隔"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="contactEmail">联系邮箱</Label>
                    <Input
                      id="contactEmail"
                      type="email"
                      value={contactEmail}
                      onChange={(e) => setContactEmail(e.target.value)}
                    />
                  </div>

                  <div className="space-y-4 pt-4 border-t">
                    <h3 className="text-lg font-medium">功能开关</h3>

                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">用户注册</p>
                        <p className="text-sm text-muted-foreground">
                          允许新用户注册账号
                        </p>
                      </div>
                      <Switch
                        checked={enableRegistration}
                        onCheckedChange={setEnableRegistration}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">评论功能</p>
                        <p className="text-sm text-muted-foreground">
                          允许用户发表评论
                        </p>
                      </div>
                      <Switch
                        checked={enableComment}
                        onCheckedChange={setEnableComment}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">评论需审核</p>
                        <p className="text-sm text-muted-foreground">
                          新评论需管理员审核后才能显示
                        </p>
                      </div>
                      <Switch
                        checked={commentNeedReview}
                        onCheckedChange={setCommentNeedReview}
                      />
                    </div>
                  </div>
                </>
              )}
            </CardContent>
            <CardFooter className="border-t px-6 py-4 flex justify-end">
              <Button onClick={handleSaveSiteSettings} disabled={siteSaving}>
                {siteSaving ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    保存中...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    保存设置
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="admins" className="mt-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>管理员管理</CardTitle>
                <CardDescription>管理系统管理员账号</CardDescription>
              </div>
              <Button onClick={handleAddAdmin}>
                <Plus className="mr-2 h-4 w-4" />
                新增管理员
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>用户名</TableHead>
                    <TableHead>昵称</TableHead>
                    <TableHead>邮箱</TableHead>
                    <TableHead>角色</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead>创建时间</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {adminsLoading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        加载中...
                      </TableCell>
                    </TableRow>
                  ) : admins.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        暂无数据
                      </TableCell>
                    </TableRow>
                  ) : (
                    admins.map((admin) => (
                      <TableRow key={admin.id}>
                        <TableCell className="font-medium">
                          {admin.username}
                        </TableCell>
                        <TableCell>{admin.nickname || '-'}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {admin.email}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">
                            {admin.roleDisplayName || admin.roleName || '-'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={admin.status === 'active' ? 'success' : 'destructive'}>
                            {admin.status === 'active' ? '正常' : '禁用'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatDate(admin.createdAt)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEditAdmin(admin)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive"
                              onClick={() => handleDeleteClick(admin)}
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
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>操作日志</CardTitle>
              <CardDescription>记录所有管理员操作</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>管理员</TableHead>
                    <TableHead>模块</TableHead>
                    <TableHead>操作内容</TableHead>
                    <TableHead>IP地址</TableHead>
                    <TableHead>操作时间</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logsLoading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        加载中...
                      </TableCell>
                    </TableRow>
                  ) : auditLogs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        暂无数据
                      </TableCell>
                    </TableRow>
                  ) : (
                    auditLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="font-medium">{log.adminUsername}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{log.module}</Badge>
                        </TableCell>
                        <TableCell>{log.action}</TableCell>
                        <TableCell className="text-muted-foreground font-mono text-sm">
                          {log.ipAddress}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatDate(log.createdAt)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>

              {logsTotal > pageSize && (
                <div className="mt-4 flex items-center justify-end gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setLogsPage(Math.max(1, logsPage - 1))}
                    disabled={logsPage === 1 || logsLoading}
                  >
                    上一页
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    {logsPage} / {logTotalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setLogsPage(Math.min(logTotalPages, logsPage + 1))}
                    disabled={logsPage === logTotalPages || logsLoading}
                  >
                    下一页
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={adminDialogOpen} onOpenChange={setAdminDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingAdmin ? '编辑管理员' : '新增管理员'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="admin-username">用户名 *</Label>
                <Input
                  id="admin-username"
                  value={adminForm.username}
                  onChange={(e) => setAdminForm({ ...adminForm, username: e.target.value })}
                  disabled={!!editingAdmin}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="admin-email">邮箱 *</Label>
                <Input
                  id="admin-email"
                  type="email"
                  value={adminForm.email}
                  onChange={(e) => setAdminForm({ ...adminForm, email: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="admin-nickname">昵称</Label>
              <Input
                id="admin-nickname"
                value={adminForm.nickname}
                onChange={(e) => setAdminForm({ ...adminForm, nickname: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="admin-password">
                {editingAdmin ? '新密码（留空则不修改）' : '密码 *'}
              </Label>
              <Input
                id="admin-password"
                type="password"
                value={adminForm.password}
                onChange={(e) => setAdminForm({ ...adminForm, password: e.target.value })}
                placeholder={editingAdmin ? '留空不修改密码' : '请输入密码'}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="admin-role">角色</Label>
                <select
                  id="admin-role"
                  value={adminForm.roleId}
                  onChange={(e) => setAdminForm({ ...adminForm, roleId: parseInt(e.target.value) })}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value={1}>超级管理员</option>
                  <option value={2}>内容编辑</option>
                  <option value={3}>审核员</option>
                </select>
              </div>
              {editingAdmin && (
                <div className="space-y-2">
                  <Label htmlFor="admin-status">状态</Label>
                  <select
                    id="admin-status"
                    value={adminForm.status}
                    onChange={(e) => setAdminForm({ ...adminForm, status: e.target.value })}
                    className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="active">正常</option>
                    <option value="disabled">禁用</option>
                  </select>
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdminDialogOpen(false)} disabled={adminSaving}>
              取消
            </Button>
            <Button onClick={handleSaveAdmin} disabled={adminSaving}>
              {adminSaving ? '保存中...' : '保存'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>确认删除</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-muted-foreground">
              确定要删除管理员
              「<span className="font-medium text-foreground">{deletingAdmin?.username}</span>」吗？
            </p>
            <p className="text-sm text-destructive mt-2">
              此操作不可恢复！
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} disabled={deleting}>
              取消
            </Button>
            <Button variant="destructive" onClick={handleDeleteAdmin} disabled={deleting}>
              {deleting ? '删除中...' : '确认删除'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
