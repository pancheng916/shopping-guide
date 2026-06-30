import type { Env } from '../../types';
import { Hono, type Context } from 'hono';
import { authenticateAdmin, requirePermission, getClientIp, getUserAgent } from '../middleware/admin-auth';
import { errorResponse, successResponse, paginatedResponse } from '../../utils/response';
import { createAuditLog } from '../../services/admin/audit.service';

const adminUsersRoutes = new Hono<{ Bindings: Env }>();

adminUsersRoutes.get('/', async (c: Context<{ Bindings: Env }>) => {
  const authResult = await authenticateAdmin(c.req.raw, c.env);
  const permCheck = requirePermission(authResult, 'user:read');
  if (!permCheck.allowed) {
    return errorResponse(permCheck.error?.code || 40301, permCheck.error?.message || '权限不足', 403);
  }

  const url = new URL(c.req.url);
  const keyword = url.searchParams.get('keyword') || '';
  const status = url.searchParams.get('status') || '';
  const page = parseInt(url.searchParams.get('page') || '1', 10);
  const pageSize = parseInt(url.searchParams.get('pageSize') || '20', 10);

  const offset = (page - 1) * pageSize;

  const conditions: string[] = [];
  const bindValues: (string | number)[] = [];

  if (keyword) {
    conditions.push('(email LIKE ? OR nickname LIKE ?)');
    bindValues.push(`%${keyword}%`, `%${keyword}%`);
  }
  if (status) {
    conditions.push('status = ?');
    bindValues.push(status);
  }

  const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

  const countResult = await c.env.DB.prepare(
    `SELECT COUNT(*) as total FROM users ${whereClause}`
  )
    .bind(...bindValues)
    .first<{ total: number }>();

  const result = await c.env.DB.prepare(
    `SELECT id, email, nickname, avatar_url, status, created_at, updated_at
     FROM users ${whereClause}
     ORDER BY created_at DESC
     LIMIT ? OFFSET ?`
  )
    .bind(...bindValues, pageSize, offset)
    .all<{
      id: string;
      email: string;
      nickname: string | null;
      avatar_url: string | null;
      status: string;
      created_at: string;
      updated_at: string;
    }>();

  const items = (result.results || []).map((row) => ({
    id: row.id,
    email: row.email,
    nickname: row.nickname,
    avatarUrl: row.avatar_url,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));

  return paginatedResponse(items, countResult?.total || 0, page, pageSize);
});

adminUsersRoutes.get('/:id', async (c: Context<{ Bindings: Env }>) => {
  const authResult = await authenticateAdmin(c.req.raw, c.env);
  const permCheck = requirePermission(authResult, 'user:read');
  if (!permCheck.allowed) {
    return errorResponse(permCheck.error?.code || 40301, permCheck.error?.message || '权限不足', 403);
  }

  const id = c.req.param('id');

  const user = await c.env.DB.prepare(
    `SELECT * FROM users WHERE id = ?`
  )
    .bind(id)
    .first();

  if (!user) {
    return errorResponse(40401, '用户不存在', 404);
  }

  const favoriteCountResult = await c.env.DB.prepare(
    `SELECT COUNT(*) as count FROM user_favorites WHERE user_id = ?`
  )
    .bind(id)
    .first<{ count: number }>();

  const commentCountResult = await c.env.DB.prepare(
    `SELECT COUNT(*) as count FROM comments WHERE user_id = ?`
  )
    .bind(id)
    .first<{ count: number }>();

  const u = user as any;

  return successResponse({
    id: u.id,
    email: u.email,
    nickname: u.nickname,
    avatarUrl: u.avatar_url,
    status: u.status,
    favoriteCount: favoriteCountResult?.count || 0,
    commentCount: commentCountResult?.count || 0,
    createdAt: u.created_at,
    updatedAt: u.updated_at,
  });
});

adminUsersRoutes.patch('/:id/status', async (c: Context<{ Bindings: Env }>) => {
  const authResult = await authenticateAdmin(c.req.raw, c.env);
  const permCheck = requirePermission(authResult, 'user:update');
  if (!permCheck.allowed) {
    return errorResponse(permCheck.error?.code || 40301, permCheck.error?.message || '权限不足', 403);
  }

  const id = c.req.param('id');
  const body = await c.req.json<{ status: string; reason?: string }>();
  const admin = authResult.admin!;

  if (!body.status || !['active', 'disabled'].includes(body.status)) {
    return errorResponse(40001, '无效的状态值');
  }

  const existing = await c.env.DB.prepare(
    `SELECT id, email, status FROM users WHERE id = ?`
  )
    .bind(id)
    .first<{ id: string; email: string; status: string }>();

  if (!existing) {
    return errorResponse(40401, '用户不存在', 404);
  }

  if (existing.status === body.status) {
    return errorResponse(40002, '状态未改变');
  }

  await c.env.DB.prepare(
    `UPDATE users SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`
  )
    .bind(body.status, id)
    .run();

  await createAuditLog(c.env.DB, {
    adminId: admin.id,
    adminUsername: admin.username,
    action: 'update_status',
    module: 'users',
    targetId: id,
    targetType: 'user',
    newValue: { status: body.status, reason: body.reason },
    oldValue: { status: existing.status },
    ipAddress: getClientIp(c.req.raw),
    userAgent: getUserAgent(c.req.raw),
    status: 'success',
  });

  return successResponse(null, body.status === 'active' ? '用户已启用' : '用户已禁用');
});

export default adminUsersRoutes;
