import type { Env } from '../../types';
import { verifyJwt } from '../../utils/jwt';
import { getAdminWithPermissions, type AdminWithPermissions } from '../../utils/permissions';

export interface AuthResult {
  authenticated: boolean;
  admin?: AdminWithPermissions;
  error?: { code: number; message: string };
}

export async function authenticateAdmin(
  request: Request,
  env: Env
): Promise<AuthResult> {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return {
      authenticated: false,
      error: { code: 40101, message: '未登录' },
    };
  }

  const token = authHeader.substring(7);
  const secret = env.ADMIN_JWT_SECRET;

  if (!secret) {
    return {
      authenticated: false,
      error: { code: 50001, message: '服务器配置错误' },
    };
  }

  const payload = await verifyJwt(token, secret);
  if (!payload) {
    return {
      authenticated: false,
      error: { code: 40101, message: 'Token 无效或已过期' },
    };
  }

  const blacklistKey = `admin:token:blacklist:${payload.jti}`;
  const isBlacklisted = await env.ADMIN_KV.get(blacklistKey);
  if (isBlacklisted) {
    return {
      authenticated: false,
      error: { code: 40102, message: 'Token 已失效' },
    };
  }

  const adminId = payload.adminId || parseInt(payload.sub?.replace('admin-', '') || '0', 10);
  const admin = await getAdminWithPermissions(env.DB, adminId);
  if (!admin) {
    return {
      authenticated: false,
      error: { code: 40101, message: '管理员不存在' },
    };
  }

  if (admin.status !== 'active') {
    return {
      authenticated: false,
      error: { code: 40301, message: '账号已被禁用' },
    };
  }

  return {
    authenticated: true,
    admin,
  };
}

export function requirePermission(
  authResult: AuthResult,
  requiredPermission: string
): { allowed: boolean; error?: { code: number; message: string } } {
  if (!authResult.authenticated || !authResult.admin) {
    return { allowed: false, error: authResult.error };
  }

  if (authResult.admin.role_name === 'super_admin') {
    return { allowed: true };
  }

  if (!authResult.admin.permissions.includes(requiredPermission)) {
    return {
      allowed: false,
      error: { code: 40301, message: '权限不足' },
    };
  }

  return { allowed: true };
}

export function getClientIp(request: Request): string {
  return (
    request.headers.get('CF-Connecting-IP') ||
    request.headers.get('X-Forwarded-For')?.split(',')[0].trim() ||
    request.headers.get('X-Real-IP') ||
    'unknown'
  );
}

export function getUserAgent(request: Request): string {
  return request.headers.get('User-Agent') || '';
}
