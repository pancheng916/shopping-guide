'use client'

import { useState, useEffect } from 'react'
import {
  Plus,
  Edit,
  Trash2,
  ChevronRight,
  ChevronDown,
  Folder,
  FolderOpen,
} from 'lucide-react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
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
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { formatNumber, formatDate } from '@/lib/utils'
import { categoryApi } from '@/lib/api'

interface Category {
  id: number
  name: string
  slug: string
  parentId: number
  icon?: string
  description?: string
  sortOrder: number
  status: string
  createdAt?: string
  updatedAt?: string
  children?: Category[]
}

interface CategoryFormData {
  name: string
  slug: string
  parentId: number
  icon: string
  description: string
  sortOrder: string
  status: string
}

const emptyFormData: CategoryFormData = {
  name: '',
  slug: '',
  parentId: 0,
  icon: '',
  description: '',
  sortOrder: '0',
  status: 'active',
}

interface CategoryRowProps {
  category: Category
  level: number
  expandedIds: Set<number>
  onToggle: (id: number) => void
  onAddChild: (category: Category) => void
  onEdit: (category: Category) => void
  onDelete: (category: Category) => void
}

function CategoryRow({ category, level, expandedIds, onToggle, onAddChild, onEdit, onDelete }: CategoryRowProps) {
  const hasChildren = category.children && category.children.length > 0
  const isExpanded = expandedIds.has(category.id)

  return (
    <>
      <TableRow>
        <TableCell>
          <div
            className="flex items-center gap-2"
            style={{ paddingLeft: `${level * 24}px` }}
          >
            {hasChildren ? (
              <button
                className="flex h-6 w-6 items-center justify-center rounded hover:bg-accent"
                onClick={() => onToggle(category.id)}
              >
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </button>
            ) : (
              <div className="w-6" />
            )}
            {isExpanded ? (
              <FolderOpen className="h-5 w-5 text-yellow-500" />
            ) : (
              <Folder className="h-5 w-5 text-yellow-500" />
            )}
            <span className="font-medium">{category.name}</span>
          </div>
        </TableCell>
        <TableCell className="text-muted-foreground">{category.slug}</TableCell>
        <TableCell className="text-muted-foreground">{category.sortOrder}</TableCell>
        <TableCell>
          <Badge variant={category.status === 'active' ? 'success' : 'secondary'}>
            {category.status === 'active' ? '启用' : '禁用'}
          </Badge>
        </TableCell>
        <TableCell className="text-muted-foreground">
          {formatDate(category.createdAt as any)}
        </TableCell>
        <TableCell className="text-right">
          <div className="flex justify-end gap-1">
            <Button
              variant="ghost"
              size="icon"
              title="添加子分类"
              onClick={() => onAddChild(category)}
            >
              <Plus className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              title="编辑"
              onClick={() => onEdit(category)}
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="text-destructive"
              title="删除"
              onClick={() => onDelete(category)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </TableCell>
      </TableRow>
      {hasChildren &&
        isExpanded &&
        category.children!.map((child) => (
          <CategoryRow
            key={child.id}
            category={child}
            level={level + 1}
            expandedIds={expandedIds}
            onToggle={onToggle}
            onAddChild={onAddChild}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))}
    </>
  )
}

function getAllCategoryIds(categories: Category[]): number[] {
  const ids: number[] = []
  for (const cat of categories) {
    ids.push(cat.id)
    if (cat.children) {
      ids.push(...getAllCategoryIds(cat.children))
    }
  }
  return ids
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(false)
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set())

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [isAddingChild, setIsAddingChild] = useState(false)
  const [parentCategory, setParentCategory] = useState<Category | null>(null)
  const [formData, setFormData] = useState<CategoryFormData>(emptyFormData)
  const [submitting, setSubmitting] = useState(false)

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deletingCategory, setDeletingCategory] = useState<Category | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    fetchCategories()
  }, [])

  const fetchCategories = async () => {
    setLoading(true)
    try {
      const data = await categoryApi.getCategories()
      setCategories(data || [])
      const allIds = getAllCategoryIds(data || [])
      setExpandedIds(new Set(allIds))
    } catch (err) {
      console.error('获取分类列表失败:', err)
    } finally {
      setLoading(false)
    }
  }

  const toggleExpand = (id: number) => {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const expandAll = () => {
    const allIds = getAllCategoryIds(categories)
    setExpandedIds(new Set(allIds))
  }

  const collapseAll = () => {
    setExpandedIds(new Set())
  }

  const handleAddRoot = () => {
    setEditingCategory(null)
    setIsAddingChild(false)
    setParentCategory(null)
    setFormData({ ...emptyFormData })
    setDialogOpen(true)
  }

  const handleAddChild = (category: Category) => {
    setEditingCategory(null)
    setIsAddingChild(true)
    setParentCategory(category)
    setFormData({
      ...emptyFormData,
      parentId: category.id,
    })
    setDialogOpen(true)
  }

  const handleEdit = (category: Category) => {
    setEditingCategory(category)
    setIsAddingChild(false)
    setParentCategory(null)
    setFormData({
      name: category.name,
      slug: category.slug,
      parentId: category.parentId,
      icon: category.icon || '',
      description: category.description || '',
      sortOrder: category.sortOrder?.toString() || '0',
      status: category.status,
    })
    setDialogOpen(true)
  }

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      alert('请输入分类名称')
      return
    }
    if (!formData.slug.trim()) {
      alert('请输入分类别名(slug)')
      return
    }

    setSubmitting(true)
    try {
      const submitData = {
        ...formData,
        sortOrder: formData.sortOrder ? parseInt(formData.sortOrder, 10) : 0,
      }

      if (editingCategory) {
        await categoryApi.updateCategory(String(editingCategory.id), submitData)
      } else {
        await categoryApi.createCategory(submitData)
      }

      setDialogOpen(false)
      fetchCategories()
    } catch (err: any) {
      alert(err.message || '操作失败')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteClick = (category: Category) => {
    setDeletingCategory(category)
    setDeleteDialogOpen(true)
  }

  const handleDelete = async () => {
    if (!deletingCategory) return

    setDeleting(true)
    try {
      await categoryApi.deleteCategory(String(deletingCategory.id))
      setDeleteDialogOpen(false)
      setDeletingCategory(null)
      fetchCategories()
    } catch (err: any) {
      alert(err.message || '删除失败')
    } finally {
      setDeleting(false)
    }
  }

  const getDialogTitle = () => {
    if (editingCategory) return '编辑分类'
    if (isAddingChild && parentCategory) return `添加子分类 - ${parentCategory.name}`
    return '新增分类'
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold">分类管理</h1>
          <p className="text-muted-foreground">管理折扣分类和层级结构</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={expandAll}>
            全部展开
          </Button>
          <Button variant="outline" onClick={collapseAll}>
            全部收起
          </Button>
          <Button onClick={handleAddRoot}>
            <Plus className="mr-2 h-4 w-4" />
            新增分类
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>分类列表</CardTitle>
          <CardDescription>支持多级分类，点击 + 添加子分类</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>分类名称</TableHead>
                <TableHead>别名</TableHead>
                <TableHead>排序</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>创建时间</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    加载中...
                  </TableCell>
                </TableRow>
              ) : categories.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    暂无分类，点击右上角「新增分类」开始添加
                  </TableCell>
                </TableRow>
              ) : (
                categories.map((category) => (
                  <CategoryRow
                    key={category.id}
                    category={category}
                    level={0}
                    expandedIds={expandedIds}
                    onToggle={toggleExpand}
                    onAddChild={handleAddChild}
                    onEdit={handleEdit}
                    onDelete={handleDeleteClick}
                  />
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{getDialogTitle()}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">分类名称 <span className="text-destructive">*</span></Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="请输入分类名称"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="slug">别名(slug) <span className="text-destructive">*</span></Label>
                <Input
                  id="slug"
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  placeholder="如：digital"
                />
              </div>
            </div>
            {!editingCategory && (
              <div className="space-y-2">
                <Label>上级分类</Label>
                <div className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm flex items-center">
                  {parentCategory ? `└ ${parentCategory.name}` : '顶级分类'}
                </div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="sortOrder">排序</Label>
                <Input
                  id="sortOrder"
                  type="number"
                  value={formData.sortOrder}
                  onChange={(e) => setFormData({ ...formData, sortOrder: e.target.value })}
                  placeholder="数字越小越靠前"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">状态</Label>
                <select
                  id="status"
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="active">启用</option>
                  <option value="inactive">禁用</option>
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="icon">图标</Label>
              <Input
                id="icon"
                value={formData.icon}
                onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                placeholder="图标名称或URL（可选）"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">描述</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="分类描述（可选）"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={submitting}>
              取消
            </Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? '保存中...' : '保存'}
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
              确定要删除分类「<span className="font-medium text-foreground">{deletingCategory?.name}</span>」吗？
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              注意：如果该分类下有子分类或关联的折扣，将无法删除。
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
