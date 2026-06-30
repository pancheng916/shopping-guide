'use client'

import { useState, useEffect } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import {
  Users,
  Tag,
  ShoppingBag,
  MessageSquare,
  Eye,
  ThumbsUp,
} from 'lucide-react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatNumber, formatDate } from '@/lib/utils'
import { statsApi } from '@/lib/api'

interface OverviewData {
  today: {
    newUsers: number
    newDeals: number
    comments: number
    totalViews: number
  }
  total: {
    users: number
    deals: number
    comments: number
    products: number
  }
  growth: {
    users: number
    deals: number
    comments: number
  }
}

interface TopDealItem {
  id: string
  title: string
  store: string
  category: string
  maxDiscount: number
  viewCount: number
  likeCount: number
  commentCount: number
  favoriteCount: number
  createdAt: string
}

interface RecentCommentItem {
  id: string
  userId: string
  userName: string
  userAvatar: string | null
  content: string
  dealId: string
  dealTitle: string | null
  createdAt: string
}

interface TrendDataPoint {
  date: string
  value: number
}

export default function DashboardPage() {
  const [overview, setOverview] = useState<OverviewData | null>(null)
  const [trendData, setTrendData] = useState<TrendDataPoint[]>([])
  const [topDeals, setTopDeals] = useState<TopDealItem[]>([])
  const [recentComments, setRecentComments] = useState<RecentCommentItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    setLoading(true)
    try {
      const [overviewData, trendResult, topDealsResult, recentCommentsResult] = await Promise.all([
        statsApi.getStatsOverview(),
        statsApi.getStatsTrend({ metric: 'newDeals', range: '7d' }),
        statsApi.getTopDeals({ limit: 5, sortBy: 'view_count' }),
        statsApi.getRecentComments({ limit: 5 }),
      ])

      setOverview(overviewData)
      setTrendData(trendResult?.data || [])
      setTopDeals(topDealsResult?.items || [])
      setRecentComments(recentCommentsResult?.items || [])
    } catch (err) {
      console.error('加载看板数据失败:', err)
    } finally {
      setLoading(false)
    }
  }

  const statCards = overview
    ? [
        {
          title: '总用户数',
          value: overview.total.users,
          change: overview.growth.users,
          icon: Users,
          color: 'text-green-500',
          bgColor: 'bg-green-500/10',
        },
        {
          title: '总折扣数',
          value: overview.total.deals,
          change: overview.growth.deals,
          icon: Tag,
          color: 'text-purple-500',
          bgColor: 'bg-purple-500/10',
        },
        {
          title: '总商品数',
          value: overview.total.products,
          change: 0,
          icon: ShoppingBag,
          color: 'text-blue-500',
          bgColor: 'bg-blue-500/10',
        },
        {
          title: '总评论数',
          value: overview.total.comments,
          change: overview.growth.comments,
          icon: MessageSquare,
          color: 'text-orange-500',
          bgColor: 'bg-orange-500/10',
        },
      ]
    : []

  const chartData = trendData.map((item) => ({
    date: item.date.slice(5),
    visits: item.value,
  }))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">数据看板</h1>
        <p className="text-muted-foreground">
          欢迎回来，这是您的运营数据概览
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          加载中...
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {statCards.map((stat) => (
              <Card key={stat.title}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">
                        {stat.title}
                      </p>
                      <p className="mt-2 text-3xl font-bold">
                        {formatNumber(stat.value)}
                      </p>
                      <p
                        className={`mt-2 text-sm ${
                          stat.change >= 0 ? 'text-green-500' : 'text-red-500'
                        }`}
                      >
                        {stat.change >= 0 ? '+' : ''}
                        {stat.change}% 较昨日
                      </p>
                    </div>
                    <div className={`flex h-12 w-12 items-center justify-center rounded-lg ${stat.bgColor}`}>
                      <stat.icon className={`h-6 w-6 ${stat.color}`} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>7天新增折扣趋势</CardTitle>
                <CardDescription>最近一周的折扣发布数据</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis
                        dataKey="date"
                        className="text-xs"
                        stroke="currentColor"
                      />
                      <YAxis
                        className="text-xs"
                        stroke="currentColor"
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--background))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="visits"
                        stroke="hsl(var(--primary))"
                        strokeWidth={2}
                        dot={{ fill: 'hsl(var(--primary))' }}
                        activeDot={{ r: 6 }}
                        name="新增折扣"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>热门折扣排行榜</CardTitle>
                <CardDescription>按浏览量排序</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {topDeals.length === 0 ? (
                    <div className="py-8 text-center text-muted-foreground text-sm">
                      暂无数据
                    </div>
                  ) : (
                    topDeals.map((deal, index) => (
                      <div
                        key={deal.id}
                        className="flex items-center gap-4"
                      >
                        <div
                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                            index < 3
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          {index + 1}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium">{deal.title}</p>
                          <div className="mt-1 flex items-center gap-2">
                            <Badge variant="secondary" className="text-xs">
                              {deal.store}
                            </Badge>
                            <span className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Eye className="h-3 w-3" />
                              {formatNumber(deal.viewCount)}
                            </span>
                            <span className="flex items-center gap-1 text-xs text-muted-foreground">
                              <ThumbsUp className="h-3 w-3" />
                              {formatNumber(deal.likeCount)}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>最近评论</CardTitle>
                <CardDescription>最新的用户评论</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentComments.length === 0 ? (
                    <div className="py-8 text-center text-muted-foreground text-sm">
                      暂无评论
                    </div>
                  ) : (
                    recentComments.map((comment) => (
                      <div key={comment.id} className="flex gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
                          <span className="text-xs font-medium">
                            {comment.userName.charAt(0)}
                          </span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">{comment.userName}</span>
                            <span className="text-xs text-muted-foreground">
                              {formatDate(comment.createdAt)}
                            </span>
                          </div>
                          <p className="mt-1 truncate text-sm text-muted-foreground">
                            {comment.content}
                          </p>
                          {comment.dealTitle && (
                            <p className="mt-1 text-xs text-primary">
                              关联: {comment.dealTitle}
                            </p>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  )
}
