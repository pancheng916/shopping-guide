import type { D1Database } from '@cloudflare/workers-types';

export interface AdminWithPermissions {
  id: number;
  username: string;
  email: string;
  nickname: string | null;
  avatar_url: string | null;
  role_id: number;
  role_name: string;
  role_display_name: string;
  status: string;
  last_login_at: string | null;
  last_login_ip: string | null;
  permissions: string[];
}

export async function getAdminWithPermissions(
  db: D1Database,
  adminId: number
): Promise<AdminWithPermissions | null> {
  const adminResult = await db
    .prepare(
      `SELECT a.id, a.username, a.email, a.nickname, a.avatar_url, a.role_id, a.status,
              a.last_login_at, a.last_login_ip,
              r.name as role_name, r.display_name as role_display_name
       FROM admins a
       JOIN roles r ON a.role_id = r.id
       WHERE a.id = ?`
    )
    .bind(adminId)
    .first<{
      id: number;
      username: string;
      email: string;
      nickname: string | null;
      avatar_url: string | null;
      role_id: number;
      status: string;
      last_login_at: string | null;
      last_login_ip: string | null;
      role_name: string;
      role_display_name: string;
    }>();

  if (!adminResult) return null;

  const permissionsResult = await db
    .prepare(
      `SELECT p.code
       FROM role_permissions rp
       JOIN permissions p ON rp.permission_id = p.id
       WHERE rp.role_id = ?`
    )
    .bind(adminResult.role_id)
    .all<{ code: string }>();

  const permissions = permissionsResult.results?.map((r) => r.code) || [];

  return {
    ...adminResult,
    permissions,
  };
}

export function hasPermission(
  admin: AdminWithPermissions | null,
  requiredPermission: string
): boolean {
  if (!admin) return false;
  if (admin.status !== 'active') return false;
  if (admin.role_name === 'super_admin') return true;
  return admin.permissions.includes(requiredPermission);
}

export function hasAllPermissions(
  admin: AdminWithPermissions | null,
  requiredPermissions: string[]
): boolean {
  if (!admin) return false;
  if (admin.status !== 'active') return false;
  if (admin.role_name === 'super_admin') return true;
  return requiredPermissions.every((p) => admin.permissions.includes(p));
}

export function hasAnyPermission(
  admin: AdminWithPermissions | null,
  requiredPermissions: string[]
): boolean {
  if (!admin) return false;
  if (admin.status !== 'active') return false;
  if (admin.role_name === 'super_admin') return true;
  return requiredPermissions.some((p) => admin.permissions.includes(p));
}
