import type { Env } from '../../types';
import { Hono, type Context } from 'hono';
import { authenticateAdmin, requirePermission } from '../middleware/admin-auth';
import { errorResponse, successResponse } from '../../utils/response';

const adminStatsRoutes = new Hono<{ Bindings: Env }>();

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

function getTodayRange(): { start: string; end: string } {
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return {
    start: start.toISOString(),
    end: end.toISOString(),
  };
}

function getYesterdayRange(): { start: string; end: string } {
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return {
    start: start.toISOString(),
    end: end.toISOString(),
  };
}

adminStatsRoutes.get('/overview', async (c: Context<{ Bindings: Env }>) => {
  const authResult = await authenticateAdmin(c.req.raw, c.env);
  const permCheck = requirePermission(authResult, 'stats:read');
  if (!permCheck.allowed) {
    return errorResponse(permCheck.error?.code || 40301, permCheck.error?.message || '权限不足', 403);
  }

  const today = getTodayRange();
  const yesterday = getYesterdayRange();

  const [
    totalUsersResult,
    totalDealsResult,
    totalProductsResult,
    totalCommentsResult,
    todayNewUsersResult,
    todayNewDealsResult,
    todayNewCommentsResult,
    yesterdayNewUsersResult,
    yesterdayNewDealsResult,
    yesterdayNewCommentsResult,
  ] = await Promise.all([
    c.env.DB.prepare(`SELECT COUNT(*) as count FROM users`).first<{ count: number }>(),
    c.env.DB.prepare(`SELECT COUNT(*) as count FROM deals`).first<{ count: number }>(),
    c.env.DB.prepare(`SELECT COUNT(*) as count FROM products`).first<{ count: number }>(),
    c.env.DB.prepare(`SELECT COUNT(*) as count FROM comments`).first<{ count: number }>(),
    c.env.DB.prepare(
      `SELECT COUNT(*) as count FROM users WHERE created_at >= ? AND created_at < ?`
    )
      .bind(today.start, today.end)
      .first<{ count: number }>(),
    c.env.DB.prepare(
      `SELECT COUNT(*) as count FROM deals WHERE created_at >= ? AND created_at < ?`
    )
      .bind(today.start, today.end)
      .first<{ count: number }>(),
    c.env.DB.prepare(
      `SELECT COUNT(*) as count FROM comments WHERE created_at >= ? AND created_at < ?`
    )
      .bind(today.start, today.end)
      .first<{ count: number }>(),
    c.env.DB.prepare(
      `SELECT COUNT(*) as count FROM users WHERE created_at >= ? AND created_at < ?`
    )
      .bind(yesterday.start, yesterday.end)
      .first<{ count: number }>(),
    c.env.DB.prepare(
      `SELECT COUNT(*) as count FROM deals WHERE created_at >= ? AND created_at < ?`
    )
      .bind(yesterday.start, yesterday.end)
      .first<{ count: number }>(),
    c.env.DB.prepare(
      `SELECT COUNT(*) as count FROM comments WHERE created_at >= ? AND created_at < ?`
    )
      .bind(yesterday.start, yesterday.end)
      .first<{ count: number }>(),
  ]);

  const totalUsers = totalUsersResult?.count || 0;
  const totalDeals = totalDealsResult?.count || 0;
  const totalProducts = totalProductsResult?.count || 0;
  const totalComments = totalCommentsResult?.count || 0;

  const todayNewUsers = todayNewUsersResult?.count || 0;
  const todayNewDeals = todayNewDealsResult?.count || 0;
  const todayNewComments = todayNewCommentsResult?.count || 0;

  const yesterdayNewUsers = yesterdayNewUsersResult?.count || 0;
  const yesterdayNewDeals = yesterdayNewDealsResult?.count || 0;
  const yesterdayNewComments = yesterdayNewCommentsResult?.count || 0;

  function calcGrowth(today: number, yesterday: number): number {
    if (yesterday === 0) return today > 0 ? 100 : 0;
    return parseFloat(((today - yesterday) / yesterday * 100).toFixed(1));
  }

  const userGrowth = calcGrowth(todayNewUsers, yesterdayNewUsers);
  const dealGrowth = calcGrowth(todayNewDeals, yesterdayNewDeals);
  const commentGrowth = calcGrowth(todayNewComments, yesterdayNewComments);

  return successResponse({
    today: {
      newUsers: todayNewUsers,
      newDeals: todayNewDeals,
      comments: todayNewComments,
      totalViews: 0,
    },
    total: {
      users: totalUsers,
      deals: totalDeals,
      comments: totalComments,
      products: totalProducts,
    },
    growth: {
      users: userGrowth,
      deals: dealGrowth,
      comments: commentGrowth,
    },
  });
});

adminStatsRoutes.get('/trend', async (c: Context<{ Bindings: Env }>) => {
  const authResult = await authenticateAdmin(c.req.raw, c.env);
  const permCheck = requirePermission(authResult, 'stats:read');
  if (!permCheck.allowed) {
    return errorResponse(permCheck.error?.code || 40301, permCheck.error?.message || '权限不足', 403);
  }

  const url = new URL(c.req.url);
  const metric = url.searchParams.get('metric') || 'newDeals';
  const range = url.searchParams.get('range') || '7d';

  let days = 7;
  if (range === '30d') days = 30;
  else if (range === '90d') days = 90;

  let table = 'deals';
  let dateField = 'created_at';

  if (metric === 'newUsers') {
    table = 'users';
  } else if (metric === 'comments') {
    table = 'comments';
  }

  const dataPoints: { date: string; value: number }[] = [];
  const now = new Date();

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    const nextDate = new Date(date.getTime() + 24 * 60 * 60 * 1000);
    const dateStr = formatDate(date);

    const result = await c.env.DB.prepare(
      `SELECT COUNT(*) as count FROM ${table} WHERE ${dateField} >= ? AND ${dateField} < ?`
    )
      .bind(date.toISOString(), nextDate.toISOString())
      .first<{ count: number }>();

    dataPoints.push({
      date: dateStr,
      value: result?.count || 0,
    });
  }

  return successResponse({
    metric,
    range,
    data: dataPoints,
  });
});

adminStatsRoutes.get('/top-deals', async (c: Context<{ Bindings: Env }>) => {
  const authResult = await authenticateAdmin(c.req.raw, c.env);
  const permCheck = requirePermission(authResult, 'stats:read');
  if (!permCheck.allowed) {
    return errorResponse(permCheck.error?.code || 40301, permCheck.error?.message || '权限不足', 403);
  }

  const url = new URL(c.req.url);
  const limit = parseInt(url.searchParams.get('limit') || '10', 10);
  const sortBy = url.searchParams.get('sortBy') || 'view_count';

  const validSortFields: Record<string, string> = {
    view_count: 'view_count',
    like_count: 'like_count',
    comment_count: 'comment_count',
    favorite_count: 'favorite_count',
  };

  const orderField = validSortFields[sortBy] || 'view_count';

  const result = await c.env.DB.prepare(
    `SELECT id, title, store, category, max_discount, view_count, like_count, comment_count, favorite_count, created_at
     FROM deals
     WHERE status = 'published'
     ORDER BY ${orderField} DESC
     LIMIT ?`
  )
    .bind(limit)
    .all<{
      id: string;
      title: string;
      store: string;
      category: string;
      max_discount: number;
      view_count: number;
      like_count: number;
      comment_count: number;
      favorite_count: number;
      created_at: string;
    }>();

  const items = (result.results || []).map((row) => ({
    id: row.id,
    title: row.title,
    store: row.store,
    category: row.category,
    maxDiscount: row.max_discount,
    viewCount: row.view_count,
    likeCount: row.like_count,
    commentCount: row.comment_count,
    favoriteCount: row.favorite_count,
    createdAt: formatDate(new Date(row.created_at)),
  }));

  return successResponse({
    sortBy,
    items,
  });
});

adminStatsRoutes.get('/recent-comments', async (c: Context<{ Bindings: Env }>) => {
  const authResult = await authenticateAdmin(c.req.raw, c.env);
  const permCheck = requirePermission(authResult, 'stats:read');
  if (!permCheck.allowed) {
    return errorResponse(permCheck.error?.code || 40301, permCheck.error?.message || '权限不足', 403);
  }

  const url = new URL(c.req.url);
  const limit = parseInt(url.searchParams.get('limit') || '5', 10);

  const result = await c.env.DB.prepare(
    `SELECT c.id, c.user_id, c.user_name, c.user_avatar, c.content, c.created_at,
            c.deal_id, d.title as deal_title
     FROM comments c
     LEFT JOIN deals d ON c.deal_id = d.id
     ORDER BY c.created_at DESC
     LIMIT ?`
  )
    .bind(limit)
    .all<{
      id: string;
      user_id: string;
      user_name: string;
      user_avatar: string | null;
      content: string;
      created_at: string;
      deal_id: string;
      deal_title: string | null;
    }>();

  const items = (result.results || []).map((row) => ({
    id: row.id,
    userId: row.user_id,
    userName: row.user_name,
    userAvatar: row.user_avatar,
    content: row.content,
    dealId: row.deal_id,
    dealTitle: row.deal_title,
    createdAt: row.created_at,
  }));

  return successResponse({
    items,
  });
});

export default adminStatsRoutes;
