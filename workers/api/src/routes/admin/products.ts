import type { Env } from '../../types';
import { Hono, type Context } from 'hono';
import { authenticateAdmin, requirePermission, getClientIp, getUserAgent } from '../middleware/admin-auth';
import { errorResponse, successResponse, paginatedResponse } from '../../utils/response';
import { createAuditLog } from '../../services/admin/audit.service';

const adminProductsRoutes = new Hono<{ Bindings: Env }>();

function generateProductId(): string {
  return 'prod-' + Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
}

adminProductsRoutes.get('/', async (c: Context<{ Bindings: Env }>) => {
  const authResult = await authenticateAdmin(c.req.raw, c.env);
  const permCheck = requirePermission(authResult, 'product:read');
  if (!permCheck.allowed) {
    return errorResponse(permCheck.error?.code || 40301, permCheck.error?.message || '权限不足', 403);
  }

  const url = new URL(c.req.url);
  const keyword = url.searchParams.get('keyword') || '';
  const platform = url.searchParams.get('platform') || '';
  const dealId = url.searchParams.get('dealId') || '';
  const category = url.searchParams.get('category') || '';
  const page = parseInt(url.searchParams.get('page') || '1', 10);
  const pageSize = parseInt(url.searchParams.get('pageSize') || '20', 10);
  const sortBy = url.searchParams.get('sortBy') || 'created_at';
  const sortOrder = url.searchParams.get('sortOrder') || 'desc';

  const offset = (page - 1) * pageSize;

  const conditions: string[] = [];
  const bindValues: (string | number)[] = [];

  if (keyword) {
    conditions.push('(name LIKE ? OR brand LIKE ?)');
    bindValues.push(`%${keyword}%`, `%${keyword}%`);
  }
  if (platform) {
    conditions.push('platform = ?');
    bindValues.push(platform);
  }
  if (dealId) {
    conditions.push('deal_id = ?');
    bindValues.push(dealId);
  }
  if (category) {
    conditions.push('deal_id IN (SELECT id FROM deals WHERE category = ?)');
    bindValues.push(category);
  }

  const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

  const countResult = await c.env.DB.prepare(
    `SELECT COUNT(*) as total FROM products ${whereClause}`
  )
    .bind(...bindValues)
    .first<{ total: number }>();

  const allowedSortFields = ['created_at', 'updated_at', 'sort_order', 'name', 'current_price', 'savings_percent'];
  const safeSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'created_at';
  const safeSortOrder = sortOrder === 'asc' ? 'ASC' : 'DESC';

  const result = await c.env.DB.prepare(
    `SELECT id, platform, platform_id, deal_id, name, brand, image_url, 
            original_price, current_price, savings_amount, savings_percent, 
            affiliate_url, rating, review_count, in_stock, sort_order, 
            created_at, updated_at
     FROM products ${whereClause}
     ORDER BY ${safeSortBy} ${safeSortOrder}
     LIMIT ? OFFSET ?`
  )
    .bind(...bindValues, pageSize, offset)
    .all<{
      id: string;
      platform: string;
      platform_id: string | null;
      deal_id: string | null;
      name: string;
      brand: string | null;
      image_url: string | null;
      original_price: number | null;
      current_price: number | null;
      savings_amount: number | null;
      savings_percent: number | null;
      affiliate_url: string | null;
      rating: string | null;
      review_count: number | null;
      in_stock: number;
      sort_order: number;
      created_at: string;
      updated_at: string;
    }>();

  const items = (result.results || []).map((row) => ({
    id: row.id,
    platform: row.platform,
    platformId: row.platform_id,
    dealId: row.deal_id,
    name: row.name,
    brand: row.brand,
    imageUrl: row.image_url,
    originalPrice: row.original_price,
    currentPrice: row.current_price,
    savingsAmount: row.savings_amount,
    savingsPercent: row.savings_percent,
    affiliateUrl: row.affiliate_url,
    rating: row.rating,
    reviewCount: row.review_count,
    inStock: row.in_stock === 1,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));

  return paginatedResponse(items, countResult?.total || 0, page, pageSize);
});

adminProductsRoutes.get('/:id', async (c: Context<{ Bindings: Env }>) => {
  const authResult = await authenticateAdmin(c.req.raw, c.env);
  const permCheck = requirePermission(authResult, 'product:read');
  if (!permCheck.allowed) {
    return errorResponse(permCheck.error?.code || 40301, permCheck.error?.message || '权限不足', 403);
  }

  const id = c.req.param('id');

  const product = await c.env.DB.prepare(
    `SELECT * FROM products WHERE id = ?`
  )
    .bind(id)
    .first();

  if (!product) {
    return errorResponse(40401, '商品不存在', 404);
  }

  const p = product as any;

  return successResponse({
    id: p.id,
    platform: p.platform,
    platformId: p.platform_id,
    dealId: p.deal_id,
    name: p.name,
    brand: p.brand,
    imageUrl: p.image_url,
    originalPrice: p.original_price,
    currentPrice: p.current_price,
    savingsAmount: p.savings_amount,
    savingsPercent: p.savings_percent,
    affiliateUrl: p.affiliate_url,
    rating: p.rating,
    reviewCount: p.review_count,
    inStock: p.in_stock === 1,
    sortOrder: p.sort_order,
    createdAt: p.created_at,
    updatedAt: p.updated_at,
  });
});

adminProductsRoutes.post('/', async (c: Context<{ Bindings: Env }>) => {
  const authResult = await authenticateAdmin(c.req.raw, c.env);
  const permCheck = requirePermission(authResult, 'product:create');
  if (!permCheck.allowed) {
    return errorResponse(permCheck.error?.code || 40301, permCheck.error?.message || '权限不足', 403);
  }

  const body = await c.req.json<any>();
  const id = body.id || generateProductId();
  const admin = authResult.admin!;

  await c.env.DB.prepare(
    `INSERT INTO products 
     (id, platform, platform_id, deal_id, name, brand, image_url, original_price,
      current_price, savings_amount, savings_percent, affiliate_url, rating,
      review_count, in_stock, sort_order)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(
      id,
      body.platform,
      body.platformId || null,
      body.dealId || null,
      body.name,
      body.brand || null,
      body.imageUrl || null,
      body.originalPrice || null,
      body.currentPrice || null,
      body.savingsAmount || null,
      body.savingsPercent || null,
      body.affiliateUrl || null,
      body.rating || null,
      body.reviewCount || 0,
      body.inStock === false ? 0 : 1,
      body.sortOrder || 0
    )
    .run();

  await createAuditLog(c.env.DB, {
    adminId: admin.id,
    adminUsername: admin.username,
    action: 'create',
    module: 'products',
    targetId: id,
    targetType: 'product',
    newValue: { name: body.name, platform: body.platform },
    ipAddress: getClientIp(c.req.raw),
    userAgent: getUserAgent(c.req.raw),
    status: 'success',
  });

  return successResponse({ id }, '创建成功');
});

adminProductsRoutes.put('/:id', async (c: Context<{ Bindings: Env }>) => {
  const authResult = await authenticateAdmin(c.req.raw, c.env);
  const permCheck = requirePermission(authResult, 'product:update');
  if (!permCheck.allowed) {
    return errorResponse(permCheck.error?.code || 40301, permCheck.error?.message || '权限不足', 403);
  }

  const id = c.req.param('id');
  const body = await c.req.json<any>();
  const admin = authResult.admin!;

  const existing = await c.env.DB.prepare(`SELECT id FROM products WHERE id = ?`)
    .bind(id)
    .first();

  if (!existing) {
    return errorResponse(40401, '商品不存在', 404);
  }

  const updateFields: string[] = [];
  const updateValues: any[] = [];

  const fieldMap: Record<string, string> = {
    platform: 'platform',
    platformId: 'platform_id',
    dealId: 'deal_id',
    name: 'name',
    brand: 'brand',
    imageUrl: 'image_url',
    originalPrice: 'original_price',
    currentPrice: 'current_price',
    savingsAmount: 'savings_amount',
    savingsPercent: 'savings_percent',
    affiliateUrl: 'affiliate_url',
    rating: 'rating',
    reviewCount: 'review_count',
    sortOrder: 'sort_order',
  };

  for (const [key, dbField] of Object.entries(fieldMap)) {
    if (body[key] !== undefined) {
      updateFields.push(`${dbField} = ?`);
      updateValues.push(body[key] !== null ? body[key] : null);
    }
  }

  if (body.inStock !== undefined) {
    updateFields.push('in_stock = ?');
    updateValues.push(body.inStock ? 1 : 0);
  }

  if (updateFields.length === 0) {
    return errorResponse(40001, '缺少更新字段');
  }

  updateFields.push('updated_at = CURRENT_TIMESTAMP');
  updateValues.push(id);

  await c.env.DB.prepare(
    `UPDATE products SET ${updateFields.join(', ')} WHERE id = ?`
  )
    .bind(...updateValues)
    .run();

  await createAuditLog(c.env.DB, {
    adminId: admin.id,
    adminUsername: admin.username,
    action: 'update',
    module: 'products',
    targetId: id,
    targetType: 'product',
    newValue: body,
    ipAddress: getClientIp(c.req.raw),
    userAgent: getUserAgent(c.req.raw),
    status: 'success',
  });

  return successResponse({ id }, '更新成功');
});

adminProductsRoutes.delete('/:id', async (c: Context<{ Bindings: Env }>) => {
  const authResult = await authenticateAdmin(c.req.raw, c.env);
  const permCheck = requirePermission(authResult, 'product:delete');
  if (!permCheck.allowed) {
    return errorResponse(permCheck.error?.code || 40301, permCheck.error?.message || '权限不足', 403);
  }

  const id = c.req.param('id');
  const admin = authResult.admin!;

  const existing = await c.env.DB.prepare(
    `SELECT id, name FROM products WHERE id = ?`
  )
    .bind(id)
    .first<{ id: string; name: string }>();

  if (!existing) {
    return errorResponse(40401, '商品不存在', 404);
  }

  await c.env.DB.prepare(`DELETE FROM products WHERE id = ?`).bind(id).run();

  await createAuditLog(c.env.DB, {
    adminId: admin.id,
    adminUsername: admin.username,
    action: 'delete',
    module: 'products',
    targetId: id,
    targetType: 'product',
    oldValue: { name: existing.name },
    ipAddress: getClientIp(c.req.raw),
    userAgent: getUserAgent(c.req.raw),
    status: 'success',
  });

  return successResponse(null, '删除成功');
});

adminProductsRoutes.post('/:id/link-deal', async (c: Context<{ Bindings: Env }>) => {
  const authResult = await authenticateAdmin(c.req.raw, c.env);
  const permCheck = requirePermission(authResult, 'product:update');
  if (!permCheck.allowed) {
    return errorResponse(permCheck.error?.code || 40301, permCheck.error?.message || '权限不足', 403);
  }

  const id = c.req.param('id');
  const body = await c.req.json<{ dealId: string; sortOrder?: number }>();
  const admin = authResult.admin!;

  const existing = await c.env.DB.prepare(`SELECT id FROM products WHERE id = ?`)
    .bind(id)
    .first();

  if (!existing) {
    return errorResponse(40401, '商品不存在', 404);
  }

  const deal = await c.env.DB.prepare(`SELECT id FROM deals WHERE id = ?`)
    .bind(body.dealId)
    .first();

  if (!deal) {
    return errorResponse(40402, '折扣不存在', 404);
  }

  await c.env.DB.prepare(
    `UPDATE products SET deal_id = ?, sort_order = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`
  )
    .bind(body.dealId, body.sortOrder || 0, id)
    .run();

  await createAuditLog(c.env.DB, {
    adminId: admin.id,
    adminUsername: admin.username,
    action: 'link_deal',
    module: 'products',
    targetId: id,
    targetType: 'product',
    newValue: { dealId: body.dealId, sortOrder: body.sortOrder || 0 },
    ipAddress: getClientIp(c.req.raw),
    userAgent: getUserAgent(c.req.raw),
    status: 'success',
  });

  return successResponse(null, '关联成功');
});

export default adminProductsRoutes;
