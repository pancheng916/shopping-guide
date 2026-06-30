import type { D1Database } from '@cloudflare/workers-types';
import type { AuditLog } from '@shared/types';

export interface CreateAuditLogParams {
  adminId: number;
  adminUsername: string;
  action: string;
  module: string;
  targetId?: string;
  targetType?: string;
  oldValue?: unknown;
  newValue?: unknown;
  ipAddress?: string;
  userAgent?: string;
  status?: 'success' | 'failed';
  errorMessage?: string;
}

export async function createAuditLog(
  db: D1Database,
  params: CreateAuditLogParams
): Promise<void> {
  try {
    await db
      .prepare(
        `INSERT INTO audit_logs 
         (admin_id, admin_username, action, module, target_id, target_type, 
          old_value, new_value, ip_address, user_agent, status, error_message)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        params.adminId,
        params.adminUsername,
        params.action,
        params.module,
        params.targetId || null,
        params.targetType || null,
        params.oldValue ? JSON.stringify(params.oldValue) : null,
        params.newValue ? JSON.stringify(params.newValue) : null,
        params.ipAddress || null,
        params.userAgent || null,
        params.status || 'success',
        params.errorMessage || null
      )
      .run();
  } catch (error) {
    console.error('Failed to create audit log:', error);
  }
}

export async function getAuditLogs(
  db: D1Database,
  params: {
    adminId?: number;
    module?: string;
    action?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    pageSize?: number;
  }
): Promise<{ items: AuditLog[]; total: number }> {
  const page = params.page || 1;
  const pageSize = params.pageSize || 20;
  const offset = (page - 1) * pageSize;

  const conditions: string[] = [];
  const bindValues: (string | number)[] = [];

  if (params.adminId) {
    conditions.push('admin_id = ?');
    bindValues.push(params.adminId);
  }
  if (params.module) {
    conditions.push('module = ?');
    bindValues.push(params.module);
  }
  if (params.action) {
    conditions.push('action = ?');
    bindValues.push(params.action);
  }
  if (params.startDate) {
    conditions.push('created_at >= ?');
    bindValues.push(params.startDate);
  }
  if (params.endDate) {
    conditions.push('created_at <= ?');
    bindValues.push(params.endDate);
  }

  const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

  const countResult = await db
    .prepare(`SELECT COUNT(*) as total FROM audit_logs ${whereClause}`)
    .bind(...bindValues)
    .first<{ total: number }>();

  const result = await db
    .prepare(
      `SELECT * FROM audit_logs ${whereClause} 
       ORDER BY created_at DESC 
       LIMIT ? OFFSET ?`
    )
    .bind(...bindValues, pageSize, offset)
    .all<{
      id: number;
      admin_id: number;
      admin_username: string;
      action: string;
      module: string;
      target_id: string | null;
      target_type: string | null;
      old_value: string | null;
      new_value: string | null;
      ip_address: string | null;
      user_agent: string | null;
      status: string;
      error_message: string | null;
      created_at: string;
    }>();

  const items: AuditLog[] = (result.results || []).map((row) => ({
    id: row.id,
    adminId: row.admin_id,
    adminUsername: row.admin_username,
    action: row.action,
    module: row.module,
    targetId: row.target_id || undefined,
    targetType: row.target_type || undefined,
    oldValue: row.old_value || undefined,
    newValue: row.new_value || undefined,
    ipAddress: row.ip_address || undefined,
    userAgent: row.user_agent || undefined,
    status: row.status as 'success' | 'failed',
    errorMessage: row.error_message || undefined,
    createdAt: row.created_at,
  }));

  return {
    items,
    total: countResult?.total || 0,
  };
}
