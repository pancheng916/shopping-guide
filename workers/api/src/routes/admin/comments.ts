import type { Env } from '../../types';
import { Hono, type Context } from 'hono';
import { authenticateAdmin, requirePermission, getClientIp, getUserAgent } from '../middleware/admin-auth';
import { errorResponse, successResponse, paginatedResponse } from '../../utils/response';
import { createAuditLog } from '../../services/admin/audit.service';

const adminCommentsRoutes = new Hono<{ Bindings: Env }>();

function generateCommentId(): string {
  return 'comment-' + Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
}

adminCommentsRoutes.get('/', async (c: Context<{ Bindings: Env }>) => {
  const authResult = await authenticateAdmin(c.req.raw, c.env);
  const permCheck = requirePermission(authResult, 'comment:read');
  if (!permCheck.allowed) {
    return errorResponse(permCheck.error?.code || 40301, permCheck.error?.message || '权限不足', 403);
  }

  const url = new URL(c.req.url);
  const dealId = url.searchParams.get('dealId') || '';
  const userId = url.searchParams.get('userId') || '';
  const status = url.searchParams.get('status') || '';
  const keyword = url.searchParams.get('keyword') || '';
  const page = parseInt(url.searchParams.get('page') || '1', 10);
  const pageSize = parseInt(url.searchParams.get('pageSize') || '20', 10);

  const offset = (page - 1) * pageSize;

  const conditions: string[] = [];
  const bindValues: (string | number)[] = [];

  if (dealId) {
    conditions.push('deal_id = ?');
    bindValues.push(dealId);
  }
  if (userId) {
    conditions.push('user_id = ?');
    bindValues.push(userId);
  }
  if (status) {
    conditions.push('status = ?');
    bindValues.push(status);
  }
  if (keyword) {
    conditions.push('content LIKE ?');
    bindValues.push(`%${keyword}%`);
  }

  const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

  const countResult = await c.env.DB.prepare(
    `SELECT COUNT(*) as total FROM comments ${whereClause}`
  )
    .bind(...bindValues)
    .first<{ total: number }>();

  const result = await c.env.DB.prepare(
    `SELECT * FROM comments ${whereClause}
     ORDER BY created_at DESC
     LIMIT ? OFFSET ?`
  )
    .bind(...bindValues, pageSize, offset)
    .all<{
      id: string;
      deal_id: string;
      user_id: string;
      user_name: string;
      user_avatar: string | null;
      content: string;
      status: string;
      likes: number;
      created_at: string;
    }>();

  const items = (result.results || []).map((row) => ({
    id: row.id,
    dealId: row.deal_id,
    userId: row.user_id,
    userName: row.user_name,
    userAvatar: row.user_avatar,
    content: row.content,
    status: row.status,
    likes: row.likes,
    createdAt: row.created_at,
  }));

  return paginatedResponse(items, countResult?.total || 0, page, pageSize);
});

adminCommentsRoutes.post('/:id/approve', async (c: Context<{ Bindings: Env }>) => {
  const authResult = await authenticateAdmin(c.req.raw, c.env);
  const permCheck = requirePermission(authResult, 'comment:moderate');
  if (!permCheck.allowed) {
    return errorResponse(permCheck.error?.code || 40301, permCheck.error?.message || '权限不足', 403);
  }

  const id = c.req.param('id');

  const existing = await c.env.DB.prepare(`SELECT id FROM comments WHERE id = ?`)
    .bind(id)
    .first();

  if (!existing) {
    return errorResponse(40401, '评论不存在', 404);
  }

  await c.env.DB.prepare(`UPDATE comments SET status = 'approved' WHERE id = ?`)
    .bind(id)
    .run();

  const admin = authResult.admin!;
  await createAuditLog(c.env.DB, {
    adminId: admin.id,
    adminUsername: admin.username,
    action: 'approve',
    module: 'comments',
    targetId: id,
    targetType: 'comment',
    ipAddress: getClientIp(c.req.raw),
    userAgent: getUserAgent(c.req.raw),
    status: 'success',
  });

  return successResponse(null, '审核通过');
});

adminCommentsRoutes.post('/:id/reject', async (c: Context<{ Bindings: Env }>) => {
  const authResult = await authenticateAdmin(c.req.raw, c.env);
  const permCheck = requirePermission(authResult, 'comment:moderate');
  if (!permCheck.allowed) {
    return errorResponse(permCheck.error?.code || 40301, permCheck.error?.message || '权限不足', 403);
  }

  const id = c.req.param('id');
  const body = await c.req.json<{ reason?: string }>();

  const existing = await c.env.DB.prepare(`SELECT id FROM comments WHERE id = ?`)
    .bind(id)
    .first();

  if (!existing) {
    return errorResponse(40401, '评论不存在', 404);
  }

  await c.env.DB.prepare(`UPDATE comments SET status = 'rejected' WHERE id = ?`)
    .bind(id)
    .run();

  const admin = authResult.admin!;
  await createAuditLog(c.env.DB, {
    adminId: admin.id,
    adminUsername: admin.username,
    action: 'reject',
    module: 'comments',
    targetId: id,
    targetType: 'comment',
    newValue: { reason: body.reason },
    ipAddress: getClientIp(c.req.raw),
    userAgent: getUserAgent(c.req.raw),
    status: 'success',
  });

  return successResponse(null, '已驳回');
});

adminCommentsRoutes.delete('/:id', async (c: Context<{ Bindings: Env }>) => {
  const authResult = await authenticateAdmin(c.req.raw, c.env);
  const permCheck = requirePermission(authResult, 'comment:delete');
  if (!permCheck.allowed) {
    return errorResponse(permCheck.error?.code || 40301, permCheck.error?.message || '权限不足', 403);
  }

  const id = c.req.param('id');

  const existing = await c.env.DB.prepare(
    `SELECT id, content FROM comments WHERE id = ?`
  )
    .bind(id)
    .first<{ id: string; content: string }>();

  if (!existing) {
    return errorResponse(40401, '评论不存在', 404);
  }

  await c.env.DB.prepare(`DELETE FROM comments WHERE id = ?`).bind(id).run();

  const admin = authResult.admin!;
  await createAuditLog(c.env.DB, {
    adminId: admin.id,
    adminUsername: admin.username,
    action: 'delete',
    module: 'comments',
    targetId: id,
    targetType: 'comment',
    oldValue: { content: existing.content },
    ipAddress: getClientIp(c.req.raw),
    userAgent: getUserAgent(c.req.raw),
    status: 'success',
  });

  return successResponse(null, '删除成功');
});

adminCommentsRoutes.post('/batch', async (c: Context<{ Bindings: Env }>) => {
  const authResult = await authenticateAdmin(c.req.raw, c.env);
  const permCheck = requirePermission(authResult, 'comment:moderate');
  if (!permCheck.allowed) {
    return errorResponse(permCheck.error?.code || 40301, permCheck.error?.message || '权限不足', 403);
  }

  const body = await c.req.json<{ action: string; ids: string[] }>();

  if (!body.ids || !Array.isArray(body.ids) || body.ids.length === 0) {
    return errorResponse(40001, '请选择要操作的评论');
  }

  const validActions = ['approve', 'reject', 'delete'];
  if (!validActions.includes(body.action)) {
    return errorResponse(40002, '无效的操作类型');
  }

  if (body.action === 'delete') {
    const deletePermCheck = requirePermission(authResult, 'comment:delete');
    if (!deletePermCheck.allowed) {
      return errorResponse(40301, '无删除权限', 403);
    }
  }

  const placeholders = body.ids.map(() => '?').join(',');

  if (body.action === 'delete') {
    await c.env.DB.prepare(`DELETE FROM comments WHERE id IN (${placeholders})`)
      .bind(...body.ids)
      .run();
  } else {
    const status = body.action === 'approve' ? 'approved' : 'rejected';
    await c.env.DB.prepare(
      `UPDATE comments SET status = ? WHERE id IN (${placeholders})`
    )
      .bind(status, ...body.ids)
      .run();
  }

  const admin = authResult.admin!;
  await createAuditLog(c.env.DB, {
    adminId: admin.id,
    adminUsername: admin.username,
    action: `batch_${body.action}`,
    module: 'comments',
    targetId: body.ids.join(','),
    targetType: 'comment',
    newValue: { count: body.ids.length, action: body.action },
    ipAddress: getClientIp(c.req.raw),
    userAgent: getUserAgent(c.req.raw),
    status: 'success',
  });

  return successResponse(null, '批量操作成功');
});

export default adminCommentsRoutes;
