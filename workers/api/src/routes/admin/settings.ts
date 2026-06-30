import type { Env } from '../../types';
import { Hono, type Context } from 'hono';
import { authenticateAdmin, requirePermission, getClientIp, getUserAgent } from '../middleware/admin-auth';
import { errorResponse, successResponse, paginatedResponse } from '../../utils/response';
import { createAuditLog, getAuditLogs } from '../../services/admin/audit.service';
import { hashPassword, validatePasswordStrength } from '../../utils/password';

const adminSettingsRoutes = new Hono<{ Bindings: Env }>();

adminSettingsRoutes.get('/site', async (c: Context<{ Bindings: Env }>) => {
  const authResult = await authenticateAdmin(c.req.raw, c.env);
  const permCheck = requirePermission(authResult, 'settings:read');
  if (!permCheck.allowed) {
    return errorResponse(permCheck.error?.code || 40301, permCheck.error?.message || '权限不足', 403);
  }

  const result = await c.env.DB.prepare(
    `SELECT key, value, type, description FROM site_settings ORDER BY id ASC`
  ).all<{ key: string; value: string | null; type: string; description: string | null }>();

  const settings: Record<string, { value: unknown; type: string; description?: string }> = {};

  for (const row of result.results || []) {
    let parsedValue: unknown = row.value;
    if (row.type === 'boolean') {
      parsedValue = row.value === 'true';
    } else if (row.type === 'number') {
      parsedValue = row.value ? parseFloat(row.value) : 0;
    } else if (row.type === 'json') {
      try {
        parsedValue = row.value ? JSON.parse(row.value) : null;
      } catch {
        parsedValue = row.value;
      }
    }

    settings[row.key] = {
      value: parsedValue,
      type: row.type,
      description: row.description || undefined,
    };
  }

  return successResponse(settings);
});

adminSettingsRoutes.put('/site', async (c: Context<{ Bindings: Env }>) => {
  const authResult = await authenticateAdmin(c.req.raw, c.env);
  const permCheck = requirePermission(authResult, 'settings:update');
  if (!permCheck.allowed) {
    return errorResponse(permCheck.error?.code || 40301, permCheck.error?.message || '权限不足', 403);
  }

  const body = await c.req.json<Record<string, unknown>>();
  const admin = authResult.admin!;

  const allowedKeys = [
    'site_name',
    'site_description',
    'site_keywords',
    'contact_email',
    'enable_comment',
    'comment_need_review',
    'enable_register',
  ];

  const updates: { key: string; value: string }[] = [];

  for (const key of Object.keys(body)) {
    if (!allowedKeys.includes(key)) continue;

    const value = body[key];
    let storedValue = '';

    if (typeof value === 'boolean') {
      storedValue = value ? 'true' : 'false';
    } else if (typeof value === 'number') {
      storedValue = String(value);
    } else if (typeof value === 'object' && value !== null) {
      storedValue = JSON.stringify(value);
    } else {
      storedValue = String(value ?? '');
    }

    updates.push({ key, value: storedValue });
  }

  if (updates.length === 0) {
    return errorResponse(40001, '没有有效的更新字段');
  }

  for (const update of updates) {
    await c.env.DB.prepare(
      `INSERT INTO site_settings (key, value, updated_at)
       VALUES (?, ?, CURRENT_TIMESTAMP)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP`
    )
      .bind(update.key, update.value)
      .run();
  }

  await createAuditLog(c.env.DB, {
    adminId: admin.id,
    adminUsername: admin.username,
    action: 'update',
    module: 'settings',
    targetType: 'site_settings',
    newValue: body,
    ipAddress: getClientIp(c.req.raw),
    userAgent: getUserAgent(c.req.raw),
    status: 'success',
  });

  return successResponse(null, '设置更新成功');
});

adminSettingsRoutes.get('/admins', async (c: Context<{ Bindings: Env }>) => {
  const authResult = await authenticateAdmin(c.req.raw, c.env);
  const permCheck = requirePermission(authResult, 'admin:manage');
  if (!permCheck.allowed) {
    return errorResponse(permCheck.error?.code || 40301, permCheck.error?.message || '权限不足', 403);
  }

  const url = new URL(c.req.url);
  const keyword = url.searchParams.get('keyword') || '';
  const roleId = url.searchParams.get('roleId') || '';
  const status = url.searchParams.get('status') || '';
  const page = parseInt(url.searchParams.get('page') || '1', 10);
  const pageSize = parseInt(url.searchParams.get('pageSize') || '20', 10);

  const offset = (page - 1) * pageSize;

  const conditions: string[] = [];
  const bindValues: (string | number)[] = [];

  if (keyword) {
    conditions.push('(a.username LIKE ? OR a.email LIKE ? OR a.nickname LIKE ?)');
    bindValues.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
  }
  if (roleId) {
    conditions.push('a.role_id = ?');
    bindValues.push(parseInt(roleId, 10));
  }
  if (status) {
    conditions.push('a.status = ?');
    bindValues.push(status);
  }

  const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

  const countResult = await c.env.DB.prepare(
    `SELECT COUNT(*) as total FROM admins a ${whereClause}`
  )
    .bind(...bindValues)
    .first<{ total: number }>();

  const result = await c.env.DB.prepare(
    `SELECT a.id, a.username, a.email, a.nickname, a.avatar_url, a.role_id, 
            a.status, a.last_login_at, a.last_login_ip, a.created_at, a.updated_at,
            r.name as role_name, r.display_name as role_display_name
     FROM admins a
     LEFT JOIN roles r ON a.role_id = r.id
     ${whereClause}
     ORDER BY a.id ASC
     LIMIT ? OFFSET ?`
  )
    .bind(...bindValues, pageSize, offset)
    .all<{
      id: number;
      username: string;
      email: string;
      nickname: string | null;
      avatar_url: string | null;
      role_id: number;
      status: string;
      last_login_at: string | null;
      last_login_ip: string | null;
      created_at: string;
      updated_at: string;
      role_name: string | null;
      role_display_name: string | null;
    }>();

  const items = (result.results || []).map((row) => ({
    id: row.id,
    username: row.username,
    email: row.email,
    nickname: row.nickname,
    avatarUrl: row.avatar_url,
    roleId: row.role_id,
    roleName: row.role_name,
    roleDisplayName: row.role_display_name,
    status: row.status,
    lastLoginAt: row.last_login_at,
    lastLoginIp: row.last_login_ip,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));

  return paginatedResponse(items, countResult?.total || 0, page, pageSize);
});

adminSettingsRoutes.post('/admins', async (c: Context<{ Bindings: Env }>) => {
  const authResult = await authenticateAdmin(c.req.raw, c.env);
  const permCheck = requirePermission(authResult, 'admin:manage');
  if (!permCheck.allowed) {
    return errorResponse(permCheck.error?.code || 40301, permCheck.error?.message || '权限不足', 403);
  }

  const body = await c.req.json<{
    username: string;
    email: string;
    password: string;
    nickname?: string;
    roleId: number;
  }>();
  const admin = authResult.admin!;

  if (!body.username || !body.email || !body.password || !body.roleId) {
    return errorResponse(40001, '用户名、邮箱、密码、角色不能为空');
  }

  const strengthCheck = validatePasswordStrength(body.password);
  if (!strengthCheck.valid) {
    return errorResponse(40002, strengthCheck.message);
  }

  const existing = await c.env.DB.prepare(
    `SELECT id FROM admins WHERE username = ? OR email = ?`
  )
    .bind(body.username, body.email)
    .first();

  if (existing) {
    return errorResponse(40901, '用户名或邮箱已存在', 409);
  }

  const pepper = c.env.ADMIN_PASSWORD_PEPPER || '';
  const passwordHash = await hashPassword(body.password, pepper);

  const result = await c.env.DB.prepare(
    `INSERT INTO admins (username, email, password_hash, nickname, role_id, status)
     VALUES (?, ?, ?, ?, ?, 'active')`
  )
    .bind(
      body.username,
      body.email,
      passwordHash,
      body.nickname || null,
      body.roleId
    )
    .run();

  const newAdminId = result.meta.last_row_id;

  await createAuditLog(c.env.DB, {
    adminId: admin.id,
    adminUsername: admin.username,
    action: 'create',
    module: 'admins',
    targetId: String(newAdminId),
    targetType: 'admin',
    newValue: { username: body.username, email: body.email, roleId: body.roleId },
    ipAddress: getClientIp(c.req.raw),
    userAgent: getUserAgent(c.req.raw),
    status: 'success',
  });

  return successResponse({ id: newAdminId }, '创建成功');
});

adminSettingsRoutes.put('/admins/:id', async (c: Context<{ Bindings: Env }>) => {
  const authResult = await authenticateAdmin(c.req.raw, c.env);
  const permCheck = requirePermission(authResult, 'admin:manage');
  if (!permCheck.allowed) {
    return errorResponse(permCheck.error?.code || 40301, permCheck.error?.message || '权限不足', 403);
  }

  const id = parseInt(c.req.param('id') || '0', 10);
  const body = await c.req.json<{
    email?: string;
    nickname?: string;
    avatarUrl?: string;
    roleId?: number;
    status?: string;
    password?: string;
  }>();
  const admin = authResult.admin!;

  const existing = await c.env.DB.prepare(
    `SELECT id, username, role_id FROM admins WHERE id = ?`
  )
    .bind(id)
    .first<{ id: number; username: string; role_id: number }>();

  if (!existing) {
    return errorResponse(40401, '管理员不存在', 404);
  }

  const roleResult = await c.env.DB.prepare(
    `SELECT name FROM roles WHERE id = ?`
  )
    .bind(existing.role_id)
    .first<{ name: string }>();

  if (roleResult?.name === 'super_admin' && admin.role_name !== 'super_admin') {
    return errorResponse(40302, '无权编辑超级管理员', 403);
  }

  const updateFields: string[] = [];
  const updateValues: any[] = [];

  if (body.email !== undefined) {
    updateFields.push('email = ?');
    updateValues.push(body.email);
  }
  if (body.nickname !== undefined) {
    updateFields.push('nickname = ?');
    updateValues.push(body.nickname);
  }
  if (body.avatarUrl !== undefined) {
    updateFields.push('avatar_url = ?');
    updateValues.push(body.avatarUrl);
  }
  if (body.roleId !== undefined) {
    updateFields.push('role_id = ?');
    updateValues.push(body.roleId);
  }
  if (body.status !== undefined) {
    updateFields.push('status = ?');
    updateValues.push(body.status);
  }

  if (body.password) {
    const strengthCheck = validatePasswordStrength(body.password);
    if (!strengthCheck.valid) {
      return errorResponse(40002, strengthCheck.message);
    }
    const pepper = c.env.ADMIN_PASSWORD_PEPPER || '';
    const passwordHash = await hashPassword(body.password, pepper);
    updateFields.push('password_hash = ?');
    updateValues.push(passwordHash);
  }

  if (updateFields.length === 0) {
    return errorResponse(40001, '缺少更新字段');
  }

  updateFields.push('updated_at = CURRENT_TIMESTAMP');
  updateValues.push(id);

  await c.env.DB.prepare(
    `UPDATE admins SET ${updateFields.join(', ')} WHERE id = ?`
  )
    .bind(...updateValues)
    .run();

  await createAuditLog(c.env.DB, {
    adminId: admin.id,
    adminUsername: admin.username,
    action: 'update',
    module: 'admins',
    targetId: String(id),
    targetType: 'admin',
    newValue: body,
    ipAddress: getClientIp(c.req.raw),
    userAgent: getUserAgent(c.req.raw),
    status: 'success',
  });

  return successResponse(null, '更新成功');
});

adminSettingsRoutes.delete('/admins/:id', async (c: Context<{ Bindings: Env }>) => {
  const authResult = await authenticateAdmin(c.req.raw, c.env);
  const permCheck = requirePermission(authResult, 'admin:manage');
  if (!permCheck.allowed) {
    return errorResponse(permCheck.error?.code || 40301, permCheck.error?.message || '权限不足', 403);
  }

  const id = parseInt(c.req.param('id') || '0', 10);
  const admin = authResult.admin!;

  if (id === admin.id) {
    return errorResponse(40001, '不能删除自己');
  }

  const existing = await c.env.DB.prepare(
    `SELECT a.id, a.username, r.name as role_name
     FROM admins a
     JOIN roles r ON a.role_id = r.id
     WHERE a.id = ?`
  )
    .bind(id)
    .first<{ id: number; username: string; role_name: string }>();

  if (!existing) {
    return errorResponse(40401, '管理员不存在', 404);
  }

  if (existing.role_name === 'super_admin') {
    return errorResponse(40302, '不能删除超级管理员', 403);
  }

  await c.env.DB.prepare(`DELETE FROM admins WHERE id = ?`).bind(id).run();

  await createAuditLog(c.env.DB, {
    adminId: admin.id,
    adminUsername: admin.username,
    action: 'delete',
    module: 'admins',
    targetId: String(id),
    targetType: 'admin',
    oldValue: { username: existing.username },
    ipAddress: getClientIp(c.req.raw),
    userAgent: getUserAgent(c.req.raw),
    status: 'success',
  });

  return successResponse(null, '删除成功');
});

adminSettingsRoutes.get('/roles', async (c: Context<{ Bindings: Env }>) => {
  const authResult = await authenticateAdmin(c.req.raw, c.env);
  const permCheck = requirePermission(authResult, 'admin:manage');
  if (!permCheck.allowed) {
    return errorResponse(permCheck.error?.code || 40301, permCheck.error?.message || '权限不足', 403);
  }

  const rolesResult = await c.env.DB.prepare(
    `SELECT id, name, display_name, description, created_at FROM roles ORDER BY id ASC`
  ).all<{
    id: number;
    name: string;
    display_name: string;
    description: string | null;
    created_at: string;
  }>();

  const permissionsResult = await c.env.DB.prepare(
    `SELECT rp.role_id, p.code, p.name, p.module, p.description
     FROM role_permissions rp
     JOIN permissions p ON rp.permission_id = p.id
     ORDER BY p.module, p.id`
  ).all<{
    role_id: number;
    code: string;
    name: string;
    module: string;
    description: string | null;
  }>();

  const permissionMap = new Map<number, Array<{ code: string; name: string; module: string; description?: string }>>();
  for (const perm of permissionsResult.results || []) {
    if (!permissionMap.has(perm.role_id)) {
      permissionMap.set(perm.role_id, []);
    }
    permissionMap.get(perm.role_id)!.push({
      code: perm.code,
      name: perm.name,
      module: perm.module,
      description: perm.description || undefined,
    });
  }

  const roles = (rolesResult.results || []).map((role) => ({
    id: role.id,
    name: role.name,
    displayName: role.display_name,
    description: role.description || undefined,
    createdAt: role.created_at,
    permissions: permissionMap.get(role.id) || [],
  }));

  return successResponse(roles);
});

adminSettingsRoutes.get('/audit-logs', async (c: Context<{ Bindings: Env }>) => {
  const authResult = await authenticateAdmin(c.req.raw, c.env);
  const permCheck = requirePermission(authResult, 'admin:manage');
  if (!permCheck.allowed) {
    return errorResponse(permCheck.error?.code || 40301, permCheck.error?.message || '权限不足', 403);
  }

  const url = new URL(c.req.url);
  const adminId = url.searchParams.get('adminId') || '';
  const module = url.searchParams.get('module') || '';
  const action = url.searchParams.get('action') || '';
  const startDate = url.searchParams.get('startDate') || '';
  const endDate = url.searchParams.get('endDate') || '';
  const page = parseInt(url.searchParams.get('page') || '1', 10);
  const pageSize = parseInt(url.searchParams.get('pageSize') || '20', 10);

  const result = await getAuditLogs(c.env.DB, {
    adminId: adminId ? parseInt(adminId, 10) : undefined,
    module: module || undefined,
    action: action || undefined,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
    page,
    pageSize,
  });

  return paginatedResponse(result.items, result.total, page, pageSize);
});

adminSettingsRoutes.post('/cache/clear', async (c: Context<{ Bindings: Env }>) => {
  const authResult = await authenticateAdmin(c.req.raw, c.env);
  const permCheck = requirePermission(authResult, 'settings:update');
  if (!permCheck.allowed) {
    return errorResponse(permCheck.error?.code || 40301, permCheck.error?.message || '权限不足', 403);
  }

  const admin = authResult.admin!;

  try {
    const cacheList = await c.env.DEALS_CACHE.list();
    const deletePromises = cacheList.keys.map((key) => c.env.DEALS_CACHE.delete(key.name));
    await Promise.all(deletePromises);

    await createAuditLog(c.env.DB, {
      adminId: admin.id,
      adminUsername: admin.username,
      action: 'clear_cache',
      module: 'settings',
      targetType: 'cache',
      newValue: { clearedCount: cacheList.keys.length },
      ipAddress: getClientIp(c.req.raw),
      userAgent: getUserAgent(c.req.raw),
      status: 'success',
    });

    return successResponse({ clearedCount: cacheList.keys.length }, '缓存清除成功');
  } catch (error) {
    await createAuditLog(c.env.DB, {
      adminId: admin.id,
      adminUsername: admin.username,
      action: 'clear_cache',
      module: 'settings',
      targetType: 'cache',
      ipAddress: getClientIp(c.req.raw),
      userAgent: getUserAgent(c.req.raw),
      status: 'failed',
      errorMessage: error instanceof Error ? error.message : '未知错误',
    });

    return errorResponse(50001, '缓存清除失败', 500);
  }
});

export default adminSettingsRoutes;
