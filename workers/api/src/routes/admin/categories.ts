import type { Env } from '../../types';
import { Hono, type Context } from 'hono';
import { authenticateAdmin, requirePermission, getClientIp, getUserAgent } from '../middleware/admin-auth';
import { errorResponse, successResponse } from '../../utils/response';
import { createAuditLog } from '../../services/admin/audit.service';

const adminCategoriesRoutes = new Hono<{ Bindings: Env }>();

interface CategoryRow {
  id: number;
  name: string;
  slug: string;
  parent_id: number;
  icon: string | null;
  description: string | null;
  sort_order: number;
  status: string;
  created_at: string;
  updated_at: string;
}

interface CategoryTreeNode {
  id: number;
  name: string;
  slug: string;
  parentId: number;
  icon?: string;
  description?: string;
  sortOrder: number;
  status: string;
  children: CategoryTreeNode[];
}

function buildCategoryTree(categories: CategoryRow[]): CategoryTreeNode[] {
  const map = new Map<number, CategoryTreeNode>();
  const roots: CategoryTreeNode[] = [];

  for (const cat of categories) {
    const node: CategoryTreeNode = {
      id: cat.id,
      name: cat.name,
      slug: cat.slug,
      parentId: cat.parent_id,
      icon: cat.icon || undefined,
      description: cat.description || undefined,
      sortOrder: cat.sort_order,
      status: cat.status,
      children: [],
    };
    map.set(cat.id, node);
  }

  for (const cat of categories) {
    const node = map.get(cat.id)!;
    if (cat.parent_id === 0) {
      roots.push(node);
    } else {
      const parent = map.get(cat.parent_id);
      if (parent) {
        parent.children.push(node);
      } else {
        roots.push(node);
      }
    }
  }

  function sortRecursive(nodes: CategoryTreeNode[]) {
    nodes.sort((a, b) => a.sortOrder - b.sortOrder);
    for (const node of nodes) {
      sortRecursive(node.children);
    }
  }
  sortRecursive(roots);

  return roots;
}

adminCategoriesRoutes.get('/', async (c: Context<{ Bindings: Env }>) => {
  const authResult = await authenticateAdmin(c.req.raw, c.env);
  const permCheck = requirePermission(authResult, 'category:read');
  if (!permCheck.allowed) {
    return errorResponse(permCheck.error?.code || 40301, permCheck.error?.message || '权限不足', 403);
  }

  const result = await c.env.DB.prepare(
    `SELECT * FROM categories ORDER BY sort_order ASC, id ASC`
  ).all<CategoryRow>();

  const tree = buildCategoryTree(result.results || []);

  return successResponse(tree);
});

adminCategoriesRoutes.post('/', async (c: Context<{ Bindings: Env }>) => {
  const authResult = await authenticateAdmin(c.req.raw, c.env);
  const permCheck = requirePermission(authResult, 'category:create');
  if (!permCheck.allowed) {
    return errorResponse(permCheck.error?.code || 40301, permCheck.error?.message || '权限不足', 403);
  }

  const body = await c.req.json<{
    name: string;
    slug: string;
    parentId?: number;
    icon?: string;
    description?: string;
    sortOrder?: number;
    status?: string;
  }>();

  if (!body.name || !body.slug) {
    return errorResponse(40001, '分类名称和slug不能为空');
  }

  const existing = await c.env.DB.prepare(
    `SELECT id FROM categories WHERE slug = ?`
  )
    .bind(body.slug)
    .first();

  if (existing) {
    return errorResponse(40901, '该slug已存在', 409);
  }

  const result = await c.env.DB.prepare(
    `INSERT INTO categories (name, slug, parent_id, icon, description, sort_order, status)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(
      body.name,
      body.slug,
      body.parentId || 0,
      body.icon || null,
      body.description || null,
      body.sortOrder || 0,
      body.status || 'active'
    )
    .run();

  const admin = authResult.admin!;
  await createAuditLog(c.env.DB, {
    adminId: admin.id,
    adminUsername: admin.username,
    action: 'create',
    module: 'categories',
    targetId: String(result.meta.last_row_id),
    targetType: 'category',
    newValue: { name: body.name, slug: body.slug },
    ipAddress: getClientIp(c.req.raw),
    userAgent: getUserAgent(c.req.raw),
    status: 'success',
  });

  return successResponse({ id: result.meta.last_row_id }, '创建成功');
});

adminCategoriesRoutes.put('/:id', async (c: Context<{ Bindings: Env }>) => {
  const authResult = await authenticateAdmin(c.req.raw, c.env);
  const permCheck = requirePermission(authResult, 'category:update');
  if (!permCheck.allowed) {
    return errorResponse(permCheck.error?.code || 40301, permCheck.error?.message || '权限不足', 403);
  }

  const id = parseInt(c.req.param('id') || '0', 10);
  const body = await c.req.json<any>();

  const existing = await c.env.DB.prepare(`SELECT id FROM categories WHERE id = ?`)
    .bind(id)
    .first();

  if (!existing) {
    return errorResponse(40401, '分类不存在', 404);
  }

  const updateFields: string[] = [];
  const updateValues: any[] = [];

  const fieldMap: Record<string, string> = {
    name: 'name',
    slug: 'slug',
    icon: 'icon',
    description: 'description',
    status: 'status',
  };

  for (const [key, dbField] of Object.entries(fieldMap)) {
    if (body[key] !== undefined) {
      updateFields.push(`${dbField} = ?`);
      updateValues.push(body[key]);
    }
  }

  if (body.parentId !== undefined) {
    updateFields.push('parent_id = ?');
    updateValues.push(body.parentId);
  }

  if (body.sortOrder !== undefined) {
    updateFields.push('sort_order = ?');
    updateValues.push(body.sortOrder);
  }

  if (updateFields.length === 0) {
    return errorResponse(40001, '缺少更新字段');
  }

  updateFields.push('updated_at = CURRENT_TIMESTAMP');
  updateValues.push(id);

  await c.env.DB.prepare(
    `UPDATE categories SET ${updateFields.join(', ')} WHERE id = ?`
  )
    .bind(...updateValues)
    .run();

  const admin = authResult.admin!;
  await createAuditLog(c.env.DB, {
    adminId: admin.id,
    adminUsername: admin.username,
    action: 'update',
    module: 'categories',
    targetId: String(id),
    targetType: 'category',
    newValue: body,
    ipAddress: getClientIp(c.req.raw),
    userAgent: getUserAgent(c.req.raw),
    status: 'success',
  });

  return successResponse(null, '更新成功');
});

adminCategoriesRoutes.delete('/:id', async (c: Context<{ Bindings: Env }>) => {
  const authResult = await authenticateAdmin(c.req.raw, c.env);
  const permCheck = requirePermission(authResult, 'category:delete');
  if (!permCheck.allowed) {
    return errorResponse(permCheck.error?.code || 40301, permCheck.error?.message || '权限不足', 403);
  }

  const id = parseInt(c.req.param('id') || '0', 10);

  const existing = await c.env.DB.prepare(
    `SELECT id, name FROM categories WHERE id = ?`
  )
    .bind(id)
    .first<{ id: number; name: string }>();

  if (!existing) {
    return errorResponse(40401, '分类不存在', 404);
  }

  const childCount = await c.env.DB.prepare(
    `SELECT COUNT(*) as count FROM categories WHERE parent_id = ?`
  )
    .bind(id)
    .first<{ count: number }>();

  if (childCount && childCount.count > 0) {
    return errorResponse(40001, '该分类下有子分类，无法删除');
  }

  const dealCount = await c.env.DB.prepare(
    `SELECT COUNT(*) as count FROM deals WHERE category = (SELECT slug FROM categories WHERE id = ?)`
  )
    .bind(id)
    .first<{ count: number }>();

  if (dealCount && dealCount.count > 0) {
    return errorResponse(40002, '该分类下有关联的折扣，无法删除');
  }

  await c.env.DB.prepare(`DELETE FROM categories WHERE id = ?`).bind(id).run();

  const admin = authResult.admin!;
  await createAuditLog(c.env.DB, {
    adminId: admin.id,
    adminUsername: admin.username,
    action: 'delete',
    module: 'categories',
    targetId: String(id),
    targetType: 'category',
    oldValue: { name: existing.name },
    ipAddress: getClientIp(c.req.raw),
    userAgent: getUserAgent(c.req.raw),
    status: 'success',
  });

  return successResponse(null, '删除成功');
});

adminCategoriesRoutes.post('/sort', async (c: Context<{ Bindings: Env }>) => {
  const authResult = await authenticateAdmin(c.req.raw, c.env);
  const permCheck = requirePermission(authResult, 'category:update');
  if (!permCheck.allowed) {
    return errorResponse(permCheck.error?.code || 40301, permCheck.error?.message || '权限不足', 403);
  }

  const body = await c.req.json<{
    items: { id: number; sortOrder: number; parentId: number }[];
  }>();

  if (!body.items || !Array.isArray(body.items)) {
    return errorResponse(40001, '参数错误');
  }

  const stmt = await c.env.DB.prepare(
    `UPDATE categories SET sort_order = ?, parent_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`
  );

  for (const item of body.items) {
    await stmt.bind(item.sortOrder, item.parentId, item.id).run();
  }

  const admin = authResult.admin!;
  await createAuditLog(c.env.DB, {
    adminId: admin.id,
    adminUsername: admin.username,
    action: 'sort',
    module: 'categories',
    targetId: body.items.map((i) => i.id).join(','),
    targetType: 'category',
    newValue: { count: body.items.length },
    ipAddress: getClientIp(c.req.raw),
    userAgent: getUserAgent(c.req.raw),
    status: 'success',
  });

  return successResponse(null, '排序更新成功');
});

export default adminCategoriesRoutes;
