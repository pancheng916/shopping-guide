'use client'

import { useState, useEffect } from 'react'
import {
  Search,
  Plus,
  Edit,
  Trash2,
  Package,
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
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { formatNumber, truncateText, formatDate } from '@/lib/utils'
import { productApi, dealApi } from '@/lib/api'

interface Product {
  id: string
  platform: string
  platformId?: string
  dealId?: string
  name: string
  brand?: string
  imageUrl?: string
  originalPrice?: number
  currentPrice?: number
  savingsAmount?: number
  savingsPercent?: number
  affiliateUrl?: string
  rating?: string
  reviewCount?: number
  inStock: boolean
  sortOrder: number
  createdAt: string
  updatedAt: string
}

interface Deal {
  id: string
  title: string
}

interface ProductFormData {
  platform: string
  platformId: string
  dealId: string
  name: string
  brand: string
  imageUrl: string
  originalPrice: string
  currentPrice: string
  savingsAmount: string
  savingsPercent: string
  affiliateUrl: string
  rating: string
  reviewCount: string
  inStock: boolean
  sortOrder: string
}

const platformOptions = [
  { value: '京东', label: '京东' },
  { value: '天猫', label: '天猫' },
  { value: '淘宝', label: '淘宝' },
  { value: '拼多多', label: '拼多多' },
  { value: '亚马逊', label: '亚马逊' },
  { value: '苹果官网', label: '苹果官网' },
  { value: '华为商城', label: '华为商城' },
  { value: '小米商城', label: '小米商城' },
  { value: '其他', label: '其他' },
]

const emptyFormData: ProductFormData = {
  platform: '京东',
  platformId: '',
  dealId: '',
  name: '',
  brand: '',
  imageUrl: '',
  originalPrice: '',
  currentPrice: '',
  savingsAmount: '',
  savingsPercent: '',
  affiliateUrl: '',
  rating: '',
  reviewCount: '0',
  inStock: true,
  sortOrder: '0',
}

export default function ProductsPage() {
  const [search, setSearch] = useState('')
  const [platform, setPlatform] = useState('')
  const [page, setPage] = useState(1)
  const pageSize = 10
  const [products, setProducts] = useState<Product[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [deals, setDeals] = useState<Deal[]>([])

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [formData, setFormData] = useState<ProductFormData>(emptyFormData)
  const [submitting, setSubmitting] = useState(false)

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    fetchProducts()
  }, [page, platform])

  useEffect(() => {
    if (dialogOpen) {
      fetchDeals()
    }
  }, [dialogOpen])

  const fetchDeals = async () => {
    try {
      const data = await dealApi.getDeals({ pageSize: 100 })
      setDeals(data?.items || [])
    } catch (err) {
      console.error('获取折扣列表失败:', err)
    }
  }

  const fetchProducts = async () => {
    setLoading(true)
    try {
      const params: Record<string, any> = {
        page,
        pageSize,
      }
      if (search) params.keyword = search
      if (platform) params.platform = platform

      const data = await productApi.getProducts(params)
      setProducts(data?.items || [])
      setTotal(data?.total || 0)
    } catch (err) {
      console.error('获取商品列表失败:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = () => {
    setPage(1)
    fetchProducts()
  }

  const handleAdd = () => {
    setEditingProduct(null)
    setFormData(emptyFormData)
    setDialogOpen(true)
  }

  const handleEdit = (product: Product) => {
    setEditingProduct(product)
    setFormData({
      platform: product.platform,
      platformId: product.platformId || '',
      dealId: product.dealId || '',
      name: product.name,
      brand: product.brand || '',
      imageUrl: product.imageUrl || '',
      originalPrice: product.originalPrice?.toString() || '',
      currentPrice: product.currentPrice?.toString() || '',
      savingsAmount: product.savingsAmount?.toString() || '',
      savingsPercent: product.savingsPercent?.toString() || '',
      affiliateUrl: product.affiliateUrl || '',
      rating: product.rating || '',
      reviewCount: product.reviewCount?.toString() || '0',
      inStock: product.inStock,
      sortOrder: product.sortOrder?.toString() || '0',
    })
    setDialogOpen(true)
  }

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      alert('请输入商品名称')
      return
    }
    if (!formData.platform) {
      alert('请选择平台')
      return
    }

    setSubmitting(true)
    try {
      const submitData = {
        ...formData,
        originalPrice: formData.originalPrice ? parseFloat(formData.originalPrice) : null,
        currentPrice: formData.currentPrice ? parseFloat(formData.currentPrice) : null,
        savingsAmount: formData.savingsAmount ? parseFloat(formData.savingsAmount) : null,
        savingsPercent: formData.savingsPercent ? parseFloat(formData.savingsPercent) : null,
        reviewCount: formData.reviewCount ? parseInt(formData.reviewCount, 10) : 0,
        sortOrder: formData.sortOrder ? parseInt(formData.sortOrder, 10) : 0,
      }

      if (editingProduct) {
        await productApi.updateProduct(editingProduct.id, submitData)
      } else {
        await productApi.createProduct(submitData)
      }

      setDialogOpen(false)
      fetchProducts()
    } catch (err: any) {
      alert(err.message || '操作失败')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteClick = (product: Product) => {
    setDeletingProduct(product)
    setDeleteDialogOpen(true)
  }

  const handleDelete = async () => {
    if (!deletingProduct) return

    setDeleting(true)
    try {
      await productApi.deleteProduct(deletingProduct.id)
      setDeleteDialogOpen(false)
      setDeletingProduct(null)
      fetchProducts()
    } catch (err: any) {
      alert(err.message || '删除失败')
    } finally {
      setDeleting(false)
    }
  }

  const totalPages = Math.ceil(total / pageSize)

  const discountPercent = (original: number | undefined, current: number | undefined) => {
    if (!original || !current || original <= 0) return 0
    return Math.round((1 - current / original) * 100)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold">商品管理</h1>
          <p className="text-muted-foreground">管理所有商品信息</p>
        </div>
        <Button onClick={handleAdd}>
          <Plus className="mr-2 h-4 w-4" />
          新增商品
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-4 md:flex-row md:items-center">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="搜索商品名称或品牌..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <select
                value={platform}
                onChange={(e) => {
                  setPlatform(e.target.value)
                  setPage(1)
                }}
                className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">全部平台</option>
                {platformOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
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
                <TableHead className="w-[80px]">图片</TableHead>
                <TableHead>商品名称</TableHead>
                <TableHead>品牌</TableHead>
                <TableHead>平台</TableHead>
                <TableHead className="text-right">原价</TableHead>
                <TableHead className="text-right">现价</TableHead>
                <TableHead className="text-right">折扣</TableHead>
                <TableHead>库存</TableHead>
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
              ) : products.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                    暂无数据
                  </TableCell>
                </TableRow>
              ) : (
                products.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell>
                      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted">
                        {product.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={product.imageUrl}
                            alt={product.name}
                            className="h-full w-full rounded-lg object-cover"
                          />
                        ) : (
                          <Package className="h-6 w-6 text-muted-foreground" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="max-w-[250px]">
                      <p className="truncate font-medium">
                        {truncateText(product.name, 40)}
                      </p>
                    </TableCell>
                    <TableCell>{product.brand || '-'}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{product.platform}</Badge>
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground line-through">
                      {product.originalPrice ? `¥${formatNumber(product.originalPrice)}` : '-'}
                    </TableCell>
                    <TableCell className="text-right font-semibold text-destructive">
                      {product.currentPrice ? `¥${formatNumber(product.currentPrice)}` : '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant="destructive">
                        {discountPercent(product.originalPrice, product.currentPrice)}% OFF
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={product.inStock ? 'success' : 'destructive'}>
                        {product.inStock ? '有货' : '缺货'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(product.createdAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(product)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDeleteClick(product)}>
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
              共 {total} 件商品
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
            <DialogTitle>{editingProduct ? '编辑商品' : '新增商品'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">商品名称 <span className="text-destructive">*</span></Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="请输入商品名称"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="platform">平台 <span className="text-destructive">*</span></Label>
                <select
                  id="platform"
                  value={formData.platform}
                  onChange={(e) => setFormData({ ...formData, platform: e.target.value })}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  {platformOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="brand">品牌</Label>
                <Input
                  id="brand"
                  value={formData.brand}
                  onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                  placeholder="商品品牌"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="originalPrice">原价(¥)</Label>
                <Input
                  id="originalPrice"
                  type="number"
                  step="0.01"
                  value={formData.originalPrice}
                  onChange={(e) => setFormData({ ...formData, originalPrice: e.target.value })}
                  placeholder="原价"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="currentPrice">现价(¥)</Label>
                <Input
                  id="currentPrice"
                  type="number"
                  step="0.01"
                  value={formData.currentPrice}
                  onChange={(e) => setFormData({ ...formData, currentPrice: e.target.value })}
                  placeholder="现价"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="savingsAmount">节省金额(¥)</Label>
                <Input
                  id="savingsAmount"
                  type="number"
                  step="0.01"
                  value={formData.savingsAmount}
                  onChange={(e) => setFormData({ ...formData, savingsAmount: e.target.value })}
                  placeholder="节省金额"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="savingsPercent">折扣率(%)</Label>
                <Input
                  id="savingsPercent"
                  type="number"
                  step="0.1"
                  value={formData.savingsPercent}
                  onChange={(e) => setFormData({ ...formData, savingsPercent: e.target.value })}
                  placeholder="如：30"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="imageUrl">商品图片URL</Label>
              <Input
                id="imageUrl"
                value={formData.imageUrl}
                onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                placeholder="https://..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="affiliateUrl">推广链接</Label>
              <Input
                id="affiliateUrl"
                value={formData.affiliateUrl}
                onChange={(e) => setFormData({ ...formData, affiliateUrl: e.target.value })}
                placeholder="联盟推广链接"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="platformId">平台商品ID</Label>
                <Input
                  id="platformId"
                  value={formData.platformId}
                  onChange={(e) => setFormData({ ...formData, platformId: e.target.value })}
                  placeholder="平台上的商品ID"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dealId">关联折扣</Label>
                <select
                  id="dealId"
                  value={formData.dealId}
                  onChange={(e) => setFormData({ ...formData, dealId: e.target.value })}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">不关联</option>
                  {deals.map((deal) => (
                    <option key={deal.id} value={deal.id}>
                      {deal.title.length > 30 ? deal.title.slice(0, 30) + '...' : deal.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="rating">评分</Label>
                <Input
                  id="rating"
                  value={formData.rating}
                  onChange={(e) => setFormData({ ...formData, rating: e.target.value })}
                  placeholder="如：4.5"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reviewCount">评论数</Label>
                <Input
                  id="reviewCount"
                  type="number"
                  value={formData.reviewCount}
                  onChange={(e) => setFormData({ ...formData, reviewCount: e.target.value })}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sortOrder">排序</Label>
                <Input
                  id="sortOrder"
                  type="number"
                  value={formData.sortOrder}
                  onChange={(e) => setFormData({ ...formData, sortOrder: e.target.value })}
                  placeholder="0"
                />
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="inStock"
                  checked={formData.inStock}
                  onCheckedChange={(checked) => setFormData({ ...formData, inStock: checked })}
                />
                <Label htmlFor="inStock">有库存</Label>
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
              确定要删除商品「<span className="font-medium text-foreground">{deletingProduct?.name}</span>」吗？
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
    </div>
  )
}
