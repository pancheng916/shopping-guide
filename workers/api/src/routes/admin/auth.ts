import type { Env } from '../../types';
import { Hono, type Context } from 'hono';
import { signJwt, verifyJwt } from '../../utils/jwt';
import { verifyPassword, hashPassword, validatePasswordStrength } from '../../utils/password';
import {
  authenticateAdmin,
  requirePermission,
  getClientIp,
  getUserAgent,
} from '../middleware/admin-auth';
import { checkRateLimit } from '../middleware/rate-limit';
import { errorResponse, successResponse, jsonResponse } from '../../utils/response';
import { createAuditLog } from '../../services/admin/audit.service';

const adminAuthRoutes = new Hono<{ Bindings: Env }>();

adminAuthRoutes.post('/login', async (c: Context<{ Bindings: Env }>) => {
  const ip = getClientIp(c.req.raw);

  const rateLimit = await checkRateLimit(c.env, {
    key: `login:${ip}`,
    limit: 5,
    windowSeconds: 60,
  });

  if (!rateLimit.allowed) {
    return errorResponse(42901, '登录次数过多，请稍后再试', 429);
  }

  const body = await c.req.json<{ username?: string; password?: string }>();

  if (!body.username || !body.password) {
    return errorResponse(40001, '用户名和密码不能为空');
  }

  const adminResult = await c.env.DB.prepare(
    `SELECT id, username, email, password_hash, role_id, status, nickname, avatar_url
     FROM admins WHERE username = ? OR email = ?`
  )
    .bind(body.username, body.username)
    .first<{
      id: number;
      username: string;
      email: string;
      password_hash: string;
      role_id: number;
      status: string;
      nickname: string | null;
      avatar_url: string | null;
    }>();

  if (!adminResult) {
    await createAuditLog(c.env.DB, {
      adminId: 0,
      adminUsername: body.username,
      action: 'login_failed',
      module: 'auth',
      ipAddress: ip,
      userAgent: getUserAgent(c.req.raw),
      status: 'failed',
      errorMessage: '管理员不存在',
    });
    return errorResponse(40103, '用户名或密码错误', 401);
  }

  if (adminResult.status !== 'active') {
    await createAuditLog(c.env.DB, {
      adminId: adminResult.id,
      adminUsername: adminResult.username,
      action: 'login_failed',
      module: 'auth',
      ipAddress: ip,
      userAgent: getUserAgent(c.req.raw),
      status: 'failed',
      errorMessage: '账号已禁用',
    });
    return errorResponse(40301, '账号已被禁用', 403);
  }

  const pepper = c.env.ADMIN_PASSWORD_PEPPER || '';
  const isValid = await verifyPassword(body.password, adminResult.password_hash, pepper);

  if (!isValid) {
    await createAuditLog(c.env.DB, {
      adminId: adminResult.id,
      adminUsername: adminResult.username,
      action: 'login_failed',
      module: 'auth',
      ipAddress: ip,
      userAgent: getUserAgent(c.req.raw),
      status: 'failed',
      errorMessage: '密码错误',
    });
    return errorResponse(40103, '用户名或密码错误', 401);
  }

  const roleResult = await c.env.DB.prepare(
    `SELECT id, name, display_name FROM roles WHERE id = ?`
  )
    .bind(adminResult.role_id)
    .first<{ id: number; name: string; display_name: string }>();

  const expiresIn = parseInt(c.env.ADMIN_TOKEN_EXPIRES_IN || '86400', 10);
  const token = await signJwt(
    {
      sub: `admin-${adminResult.id}`,
      username: adminResult.username,
      role: roleResult?.name || '',
      roleId: adminResult.role_id,
      adminId: adminResult.id,
    },
    c.env.ADMIN_JWT_SECRET,
    expiresIn
  );

  await c.env.DB.prepare(
    `UPDATE admins SET last_login_at = CURRENT_TIMESTAMP, last_login_ip = ? WHERE id = ?`
  )
    .bind(ip, adminResult.id)
    .run();

  await createAuditLog(c.env.DB, {
    adminId: adminResult.id,
    adminUsername: adminResult.username,
    action: 'login',
    module: 'auth',
    ipAddress: ip,
    userAgent: getUserAgent(c.req.raw),
    status: 'success',
  });

  return successResponse({
    token,
    expiresIn,
    admin: {
      id: adminResult.id,
      username: adminResult.username,
      email: adminResult.email,
      nickname: adminResult.nickname,
      avatarUrl: adminResult.avatar_url,
      role: roleResult
        ? {
            id: roleResult.id,
            name: roleResult.name,
            displayName: roleResult.display_name,
          }
        : null,
    },
  });
});

adminAuthRoutes.post('/logout', async (c: Context<{ Bindings: Env }>) => {
  const authResult = await authenticateAdmin(c.req.raw, c.env);
  if (!authResult.authenticated || !authResult.admin) {
    return errorResponse(40101, '未登录', 401);
  }

  const authHeader = c.req.header('Authorization');
  const token = authHeader?.substring(7) || '';
  const payload = await verifyJwt(token, c.env.ADMIN_JWT_SECRET);

  if (payload) {
    const ttl = payload.exp - Math.floor(Date.now() / 1000);
    if (ttl > 0) {
      await c.env.ADMIN_KV.put(
        `admin:token:blacklist:${payload.jti}`,
        '1',
        { expirationTtl: ttl }
      );
    }
  }

  await createAuditLog(c.env.DB, {
    adminId: authResult.admin.id,
    adminUsername: authResult.admin.username,
    action: 'logout',
    module: 'auth',
    ipAddress: getClientIp(c.req.raw),
    userAgent: getUserAgent(c.req.raw),
    status: 'success',
  });

  return successResponse(null, '登出成功');
});

adminAuthRoutes.get('/profile', async (c: Context<{ Bindings: Env }>) => {
  const authResult = await authenticateAdmin(c.req.raw, c.env);
  if (!authResult.authenticated || !authResult.admin) {
    return errorResponse(40101, '未登录', 401);
  }

  const admin = authResult.admin;

  return successResponse({
    id: admin.id,
    username: admin.username,
    email: admin.email,
    nickname: admin.nickname,
    avatarUrl: admin.avatar_url,
    role: {
      id: admin.role_id,
      name: admin.role_name,
      displayName: admin.role_display_name,
      permissions: admin.permissions,
    },
    lastLoginAt: admin.last_login_at,
    lastLoginIp: admin.last_login_ip,
  });
});

adminAuthRoutes.put('/password', async (c: Context<{ Bindings: Env }>) => {
  const authResult = await authenticateAdmin(c.req.raw, c.env);
  if (!authResult.authenticated || !authResult.admin) {
    return errorResponse(40101, '未登录', 401);
  }

  const body = await c.req.json<{ oldPassword?: string; newPassword?: string }>();

  if (!body.oldPassword || !body.newPassword) {
    return errorResponse(40001, '旧密码和新密码不能为空');
  }

  const strengthCheck = validatePasswordStrength(body.newPassword);
  if (!strengthCheck.valid) {
    return errorResponse(40002, strengthCheck.message);
  }

  const adminData = await c.env.DB.prepare(
    `SELECT password_hash FROM admins WHERE id = ?`
  )
    .bind(authResult.admin.id)
    .first<{ password_hash: string }>();

  if (!adminData) {
    return errorResponse(40401, '管理员不存在', 404);
  }

  const pepper = c.env.ADMIN_PASSWORD_PEPPER || '';
  const isOldValid = await verifyPassword(body.oldPassword, adminData.password_hash, pepper);

  if (!isOldValid) {
    return errorResponse(40003, '旧密码错误');
  }

  const newHash = await hashPassword(body.newPassword, pepper);

  await c.env.DB.prepare(`UPDATE admins SET password_hash = ? WHERE id = ?`)
    .bind(newHash, authResult.admin.id)
    .run();

  await createAuditLog(c.env.DB, {
    adminId: authResult.admin.id,
    adminUsername: authResult.admin.username,
    action: 'change_password',
    module: 'auth',
    ipAddress: getClientIp(c.req.raw),
    userAgent: getUserAgent(c.req.raw),
    status: 'success',
  });

  return successResponse(null, '密码修改成功');
});

export default adminAuthRoutes;
