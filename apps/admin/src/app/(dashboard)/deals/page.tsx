'use client'

import { useState, useEffect } from 'react'
import {
  Search,
  Plus,
  Edit,
  Trash2,
  Eye,
  ThumbsUp,
  ChevronLeft,
  ChevronRight,
  X,
  Link2,
  Link2Off,
  Package,
  Check,
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
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Checkbox } from '@/components/ui/checkbox'
import { formatNumber, formatDate } from '@/lib/utils'
import { dealApi, categoryApi, productApi, dealProductsApi } from '@/lib/api'
import { ScrollArea } from '@/components/ui/scroll-area'

interface Deal {
  id: string
  title: string
  store: string
  storeLogo?: string
  category: string
  maxDiscount: number
  status: 'published' | 'draft' | 'pending' | 'rejected' | 'offline'
  isFeatured: boolean
  sortOrder: number
  viewCount: number
  likeCount: number
  commentCount: number
  favoriteCount: number
  createdAt: string
  updatedAt: string
}

interface Category {
  id: number
  name: string
  slug: string
  children?: Category[]
}

interface DealFormData {
  title: string
  store: string
  storeLogo: string
  category: string
  subCategory: string
  description: string
  richContent: string
  maxDiscount: number
  couponCode: string
  expiresAt: string
  status: string
  isFeatured: boolean
  sortOrder: number
  tags: string
}

interface Product {
  id: string
  platform: string
  name: string
  brand?: string
  imageUrl?: string
  originalPrice?: number
  currentPrice?: number
  savingsPercent?: number
}

const statusMap: Record<string, { label: string; variant: 'default' | 'secondary' | 'success' | 'warning' | 'destructive' }> = {
  published: { label: '已发布', variant: 'success' },
  draft: { label: '草稿', variant: 'secondary' },
  pending: { label: '待审核', variant: 'warning' },
  rejected: { label: '已驳回', variant: 'destructive' },
  offline: { label: '已下线', variant: 'default' },
}

const emptyFormData: DealFormData = {
  title: '',
  store: '',
  storeLogo: '',
  category: '',
  subCategory: '',
  description: '',
  richContent: '',
  maxDiscount: 0,
  couponCode: '',
  expiresAt: '',
  status: 'draft',
  isFeatured: false,
  sortOrder: 0,
  tags: '',
}

export default function DealsPage() {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [category, setCategory] = useState('')
  const [page, setPage] = useState(1)
  const pageSize = 10
  const [deals, setDeals] = useState<Deal[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [categories, setCategories] = useState<Category[]>([])

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingDeal, setEditingDeal] = useState<Deal | null>(null)
  const [formData, setFormData] = useState<DealFormData>(emptyFormData)
  const [submitting, setSubmitting] = useState(false)

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deletingDeal, setDeletingDeal] = useState<Deal | null>(null)
  const [deleting, setDeleting] = useState(false)

  // 关联商品弹窗状态
  const [linkProductsDialogOpen, setLinkProductsDialogOpen] = useState(false)
  const [linkProductsDeal, setLinkProductsDeal] = useState<Deal | null>(null)
  const [linkedProducts, setLinkedProducts] = useState<Product[]>([])
  const [availableProducts, setAvailableProducts] = useState<Product[]>([])
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([])
  const [productSearch, setProductSearch] = useState('')
  const [loadingLinked, setLoadingLinked] = useState(false)
  const [loadingAvailable, setLoadingAvailable] = useState(false)
  const [linkingProducts, setLinkingProducts] = useState(false)

  useEffect(() => {
    fetchCategories()
  }, [])

  useEffect(() => {
    fetchDeals()
  }, [page, status, category])

  const fetchCategories = async () => {
    try {
      const data = await categoryApi.getCategories()
      setCategories(data || [])
    } catch (err) {
      console.error('获取分类失败:', err)
    }
  }

  const fetchDeals = async () => {
    setLoading(true)
    try {
      const params: Record<string, any> = {
        page,
        pageSize,
      }
      if (search) params.keyword = search
      if (status) params.status = status
      if (category) params.category = category

      const data = await dealApi.getDeals(params)
      setDeals(data?.items || [])
      setTotal(data?.total || 0)
    } catch (err) {
      console.error('获取折扣列表失败:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = () => {
    setPage(1)
    fetchDeals()
  }

  const handleAdd = () => {
    setEditingDeal(null)
    setFormData(emptyFormData)
    setDialogOpen(true)
  }

  const handleEdit = async (deal: Deal) => {
    setEditingDeal(deal)
    setDialogOpen(true)
    setFormData({
      title: deal.title,
      store: deal.store,
      storeLogo: deal.storeLogo || '',
      category: deal.category,
      subCategory: '',
      description: '',
      richContent: '',
      maxDiscount: deal.maxDiscount,
      couponCode: '',
      expiresAt: '',
      status: deal.status,
      isFeatured: deal.isFeatured,
      sortOrder: deal.sortOrder,
      tags: '',
    })
    try {
      const detail = await dealApi.getDeal(deal.id)
      if (detail) {
        setFormData({
          title: detail.title || '',
          store: detail.store || '',
          storeLogo: detail.storeLogo || '',
          category: detail.category || '',
          subCategory: detail.subCategory || '',
          description: detail.description || '',
          richContent: detail.richContent || '',
          maxDiscount: detail.maxDiscount ?? 0,
          couponCode: detail.couponCode || '',
          expiresAt: detail.expiresAt || '',
          status: detail.status || 'draft',
          isFeatured: detail.isFeatured ?? false,
          sortOrder: detail.sortOrder ?? 0,
          tags: Array.isArray(detail.tags) ? detail.tags.join(', ') : (detail.tags || ''),
        })
      }
    } catch (err) {
      console.error('获取折扣详情失败:', err)
    }
  }

  const handleSubmit = async () => {
    if (!formData.title.trim()) {
      alert('请输入折扣标题')
      return
    }
    if (!formData.store.trim()) {
      alert('请输入商城名称')
      return
    }
    if (!formData.category) {
      alert('请选择分类')
      return
    }

    setSubmitting(true)
    try {
      const submitData = {
        ...formData,
        tags: formData.tags ? formData.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
      }

      if (editingDeal) {
        await dealApi.updateDeal(editingDeal.id, submitData)
      } else {
        await dealApi.createDeal(submitData)
      }

      setDialogOpen(false)
      fetchDeals()
    } catch (err: any) {
      alert(err.message || '操作失败')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteClick = (deal: Deal) => {
    setDeletingDeal(deal)
    setDeleteDialogOpen(true)
  }

  const handleDelete = async () => {
    if (!deletingDeal) return

    setDeleting(true)
    try {
      await dealApi.deleteDeal(deletingDeal.id)
      setDeleteDialogOpen(false)
      setDeletingDeal(null)
      fetchDeals()
    } catch (err: any) {
      alert(err.message || '删除失败')
    } finally {
      setDeleting(false)
    }
  }

  // 关联商品相关函数
  const handleLinkProducts = async (deal: Deal) => {
    setLinkProductsDeal(deal)
    setLinkProductsDialogOpen(true)
    setProductSearch('')
    setSelectedProductIds([])

    // 获取已关联的商品
    setLoadingLinked(true)
    try {
      const products = await dealProductsApi.getProducts(deal.id)
      setLinkedProducts(products || [])
    } catch (err) {
      console.error('获取已关联商品失败:', err)
      setLinkedProducts([])
    } finally {
      setLoadingLinked(false)
    }

    // 获取可关联的商品（未关联任何折扣的商品）
    setLoadingAvailable(true)
    try {
      const result = await productApi.getProducts({ pageSize: 100 })
      // 过滤掉已关联到其他折扣的商品
      const unlinkedProducts = (result?.items || []).filter(
        (p: Product) => !p.id || !linkedProducts.some(lp => lp.id === p.id)
      )
      setAvailableProducts(unlinkedProducts)
    } catch (err) {
      console.error('获取可关联商品失败:', err)
      setAvailableProducts([])
    } finally {
      setLoadingAvailable(false)
    }
  }

  const handleSearchProducts = async () => {
    if (!productSearch.trim()) {
      // 重置为所有未关联商品
      setLoadingAvailable(true)
      try {
        const result = await productApi.getProducts({ keyword: '', pageSize: 100 })
        setAvailableProducts((result?.items || []).filter(
          (p: Product) => !linkedProducts.some(lp => lp.id === p.id)
        ))
      } catch (err) {
        console.error('搜索商品失败:', err)
      } finally {
        setLoadingAvailable(false)
      }
      return
    }

    setLoadingAvailable(true)
    try {
      const result = await productApi.getProducts({ keyword: productSearch, pageSize: 50 })
      setAvailableProducts((result?.items || []).filter(
        (p: Product) => !linkedProducts.some(lp => lp.id === p.id)
      ))
    } catch (err) {
      console.error('搜索商品失败:', err)
    } finally {
      setLoadingAvailable(false)
    }
  }

  const handleToggleProductSelection = (productId: string) => {
    setSelectedProductIds(prev => {
      if (prev.includes(productId)) {
        return prev.filter(id => id !== productId)
      } else {
        return [...prev, productId]
      }
    })
  }

  const handleLinkSelectedProducts = async () => {
    if (!linkProductsDeal || selectedProductIds.length === 0) return

    setLinkingProducts(true)
    try {
      await dealProductsApi.linkProducts(linkProductsDeal.id, selectedProductIds)
      // 刷新已关联商品列表
      const products = await dealProductsApi.getProducts(linkProductsDeal.id)
      setLinkedProducts(products || [])
      // 从可选列表移除已关联的商品
      setAvailableProducts(prev => prev.filter(p => !selectedProductIds.includes(p.id)))
      setSelectedProductIds([])
      fetchDeals() // 刷新列表
    } catch (err: any) {
      alert(err.message || '关联失败')
    } finally {
      setLinkingProducts(false)
    }
  }

  const handleUnlinkProduct = async (productId: string) => {
    if (!linkProductsDeal) return

    try {
      await dealProductsApi.unlinkProduct(linkProductsDeal.id, productId)
      // 从已关联列表移除
      const unlinkedProduct = linkedProducts.find(p => p.id === productId)
      setLinkedProducts(prev => prev.filter(p => p.id !== productId))
      // 添加回可选列表
      if (unlinkedProduct) {
        setAvailableProducts(prev => [...prev, unlinkedProduct])
      }
      fetchDeals() // 刷新列表
    } catch (err: any) {
      alert(err.message || '取消关联失败')
    }
  }

  const totalPages = Math.ceil(total / pageSize)

  const allCategories = categories.flatMap(cat => [
    cat,
    ...(cat.children || []),
  ])

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold">折扣管理</h1>
          <p className="text-muted-foreground">管理所有折扣信息</p>
        </div>
        <Button onClick={handleAdd}>
          <Plus className="mr-2 h-4 w-4" />
          新增折扣
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-4 md:flex-row md:items-center">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="搜索折扣标题..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="pl-10"
              />
            </div>
            <div className="flex flex-wrap gap-3">
              <select
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value)
                  setPage(1)
                }}
                className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">全部状态</option>
                <option value="published">已发布</option>
                <option value="draft">草稿</option>
                <option value="pending">待审核</option>
                <option value="rejected">已驳回</option>
                <option value="offline">已下线</option>
              </select>
              <select
                value={category}
                onChange={(e) => {
                  setCategory(e.target.value)
                  setPage(1)
                }}
                className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">全部分类</option>
                {allCategories.map((cat) => (
                  <option key={cat.id} value={cat.slug}>
                    {cat.name}
                  </option>
                ))}
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
                <TableHead>标题</TableHead>
                <TableHead>商城</TableHead>
                <TableHead>分类</TableHead>
                <TableHead>最高折扣</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>推荐</TableHead>
                <TableHead className="text-right">浏览量</TableHead>
                <TableHead className="text-right">点赞数</TableHead>
                <TableHead>创建时间</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                    加载中...
                  </TableCell>
                </TableRow>
              ) : deals.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                    暂无数据
                  </TableCell>
                </TableRow>
              ) : (
                deals.map((deal) => (
                  <TableRow key={deal.id}>
                    <TableCell className="max-w-[250px]">
                      <p className="truncate font-medium">{deal.title}</p>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{deal.store}</Badge>
                    </TableCell>
                    <TableCell>{deal.category}</TableCell>
                    <TableCell>
                      <Badge variant="destructive">{deal.maxDiscount}%</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusMap[deal.status]?.variant || 'default'}>
                        {statusMap[deal.status]?.label || deal.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {deal.isFeatured ? (
                        <Badge variant="default">推荐</Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="flex items-center justify-end gap-1">
                        <Eye className="h-3 w-3 text-muted-foreground" />
                        {formatNumber(deal.viewCount)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="flex items-center justify-end gap-1">
                        <ThumbsUp className="h-3 w-3 text-muted-foreground" />
                        {formatNumber(deal.likeCount)}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(deal.createdAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleLinkProducts(deal)}
                          title="关联商品"
                        >
                          <Link2 className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(deal)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDeleteClick(deal)}>
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
              共 {total} 条记录
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingDeal ? '编辑折扣' : '新增折扣'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="title">折扣标题 <span className="text-destructive">*</span></Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="请输入折扣标题"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="store">商城名称 <span className="text-destructive">*</span></Label>
                <Input
                  id="store"
                  value={formData.store}
                  onChange={(e) => setFormData({ ...formData, store: e.target.value })}
                  placeholder="如：京东、天猫"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category">分类 <span className="text-destructive">*</span></Label>
                <select
                  id="category"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">请选择分类</option>
                  {categories.map((cat) => (
                    <optgroup key={cat.id} label={cat.name}>
                      <option value={cat.slug}>{cat.name}</option>
                      {cat.children?.map((child) => (
                        <option key={child.id} value={child.slug}>
                          └ {child.name}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxDiscount">最高折扣(%)</Label>
                <Input
                  id="maxDiscount"
                  type="number"
                  value={formData.maxDiscount}
                  onChange={(e) => setFormData({ ...formData, maxDiscount: Number(e.target.value) })}
                  placeholder="如：30"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="status">状态</Label>
                <select
                  id="status"
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="draft">草稿</option>
                  <option value="published">已发布</option>
                  <option value="pending">待审核</option>
                  <option value="offline">已下线</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="sortOrder">排序</Label>
                <Input
                  id="sortOrder"
                  type="number"
                  value={formData.sortOrder}
                  onChange={(e) => setFormData({ ...formData, sortOrder: Number(e.target.value) })}
                  placeholder="数字越小越靠前"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="couponCode">优惠码</Label>
                <Input
                  id="couponCode"
                  value={formData.couponCode}
                  onChange={(e) => setFormData({ ...formData, couponCode: e.target.value })}
                  placeholder="可选"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="expiresAt">过期时间</Label>
                <Input
                  id="expiresAt"
                  type="datetime-local"
                  value={formData.expiresAt}
                  onChange={(e) => setFormData({ ...formData, expiresAt: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="storeLogo">商城Logo URL</Label>
              <Input
                id="storeLogo"
                value={formData.storeLogo}
                onChange={(e) => setFormData({ ...formData, storeLogo: e.target.value })}
                placeholder="https://..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">简短描述</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="折扣简短描述"
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="richContent">详细内容</Label>
              <Textarea
                id="richContent"
                value={formData.richContent}
                onChange={(e) => setFormData({ ...formData, richContent: e.target.value })}
                placeholder="支持HTML富文本内容"
                rows={5}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tags">标签（逗号分隔）</Label>
              <Input
                id="tags"
                value={formData.tags}
                onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                placeholder="如：限时特惠,包邮,新品"
              />
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="isFeatured"
                  checked={formData.isFeatured}
                  onCheckedChange={(checked) => setFormData({ ...formData, isFeatured: checked })}
                />
                <Label htmlFor="isFeatured">设为推荐</Label>
              </div>
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
              确定要删除折扣「<span className="font-medium text-foreground">{deletingDeal?.title}</span>」吗？
              此操作不可恢复。
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

      {/* 关联商品弹窗 */}
      <Dialog open={linkProductsDialogOpen} onOpenChange={setLinkProductsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>
              关联商品 - {linkProductsDeal?.title}
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-hidden flex gap-4 py-4">
            {/* 左侧：已关联的商品 */}
            <div className="flex-1 flex flex-col border rounded-lg">
              <div className="p-3 border-b bg-muted/50">
                <h3 className="font-medium text-sm">已关联商品 ({linkedProducts.length})</h3>
              </div>
              <ScrollArea className="flex-1">
                {loadingLinked ? (
                  <div className="p-4 text-center text-muted-foreground">加载中...</div>
                ) : linkedProducts.length === 0 ? (
                  <div className="p-4 text-center text-muted-foreground">
                    暂无关联商品
                  </div>
                ) : (
                  <div className="p-2 space-y-2">
                    {linkedProducts.map((product) => (
                      <div
                        key={product.id}
                        className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 group"
                      >
                        {product.imageUrl && (
                          <img
                            src={product.imageUrl}
                            alt={product.name}
                            className="w-12 h-12 object-contain rounded border bg-white"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{product.name}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Badge variant="secondary" className="text-xs">{product.platform}</Badge>
                            {product.brand && <span>{product.brand}</span>}
                            {product.currentPrice && (
                              <span className="text-primary font-medium">${product.currentPrice}</span>
                            )}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8"
                          onClick={() => handleUnlinkProduct(product.id)}
                        >
                          <Link2Off className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>

            {/* 右侧：可选商品 */}
            <div className="flex-1 flex flex-col border rounded-lg">
              <div className="p-3 border-b bg-muted/50 space-y-2">
                <h3 className="font-medium text-sm">添加商品</h3>
                <div className="flex gap-2">
                  <Input
                    placeholder="搜索商品..."
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearchProducts()}
                    className="flex-1 h-8 text-sm"
                  />
                  <Button size="sm" onClick={handleSearchProducts} className="h-8">
                    <Search className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <ScrollArea className="flex-1">
                {loadingAvailable ? (
                  <div className="p-4 text-center text-muted-foreground">加载中...</div>
                ) : availableProducts.length === 0 ? (
                  <div className="p-4 text-center text-muted-foreground">
                    暂无可关联的商品
                  </div>
                ) : (
                  <div className="p-2 space-y-2">
                    {availableProducts.map((product) => (
                      <div
                        key={product.id}
                        className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                          selectedProductIds.includes(product.id)
                            ? 'bg-primary/10 border border-primary'
                            : 'hover:bg-muted/50'
                        }`}
                        onClick={() => handleToggleProductSelection(product.id)}
                      >
                        <Checkbox
                          checked={selectedProductIds.includes(product.id)}
                          className="pointer-events-none"
                        />
                        {product.imageUrl && (
                          <img
                            src={product.imageUrl}
                            alt={product.name}
                            className="w-12 h-12 object-contain rounded border bg-white"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{product.name}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Badge variant="secondary" className="text-xs">{product.platform}</Badge>
                            {product.brand && <span>{product.brand}</span>}
                            {product.currentPrice && (
                              <span className="text-primary font-medium">${product.currentPrice}</span>
                            )}
                          </div>
                        </div>
                        {selectedProductIds.includes(product.id) && (
                          <Check className="h-4 w-4 text-primary" />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>
          </div>

          <DialogFooter>
            <div className="flex items-center justify-between w-full">
              <p className="text-sm text-muted-foreground">
                已选择 {selectedProductIds.length} 个商品
              </p>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setLinkProductsDialogOpen(false)}>
                  关闭
                </Button>
                <Button
                  onClick={handleLinkSelectedProducts}
                  disabled={selectedProductIds.length === 0 || linkingProducts}
                >
                  {linkingProducts ? '关联中...' : `关联选中商品`}
                </Button>
              </div>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
