import type { Env } from '../../types';
import { Hono, type Context } from 'hono';
import { authenticateAdmin, requirePermission, getClientIp, getUserAgent } from '../middleware/admin-auth';
import { errorResponse, successResponse, paginatedResponse } from '../../utils/response';
import { createAuditLog } from '../../services/admin/audit.service';

const adminDealsRoutes = new Hono<{ Bindings: Env }>();

function generateDealId(): string {
  return 'deal-' + Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
}

adminDealsRoutes.get('/', async (c: Context<{ Bindings: Env }>) => {
  const authResult = await authenticateAdmin(c.req.raw, c.env);
  const permCheck = requirePermission(authResult, 'deal:read');
  if (!permCheck.allowed) {
    return errorResponse(permCheck.error?.code || 40301, permCheck.error?.message || '权限不足', 403);
  }

  const url = new URL(c.req.url);
  const keyword = url.searchParams.get('keyword') || '';
  const category = url.searchParams.get('category') || '';
  const status = url.searchParams.get('status') || '';
  const isFeatured = url.searchParams.get('isFeatured');
  const page = parseInt(url.searchParams.get('page') || '1', 10);
  const pageSize = parseInt(url.searchParams.get('pageSize') || '20', 10);
  const sortBy = url.searchParams.get('sortBy') || 'created_at';
  const sortOrder = url.searchParams.get('sortOrder') || 'desc';

  const offset = (page - 1) * pageSize;

  const conditions: string[] = [];
  const bindValues: (string | number)[] = [];

  if (keyword) {
    conditions.push('(title LIKE ? OR description LIKE ?)');
    bindValues.push(`%${keyword}%`, `%${keyword}%`);
  }
  if (category) {
    conditions.push('category = ?');
    bindValues.push(category);
  }
  if (status) {
    conditions.push('status = ?');
    bindValues.push(status);
  }
  if (isFeatured !== null && isFeatured !== '') {
    conditions.push('is_featured = ?');
    bindValues.push(isFeatured === 'true' ? 1 : 0);
  }

  const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

  const countResult = await c.env.DB.prepare(
    `SELECT COUNT(*) as total FROM deals ${whereClause}`
  )
    .bind(...bindValues)
    .first<{ total: number }>();

  const allowedSortFields = ['created_at', 'updated_at', 'sort_order', 'view_count', 'title', 'max_discount'];
  const safeSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'created_at';
  const safeSortOrder = sortOrder === 'asc' ? 'ASC' : 'DESC';

  const result = await c.env.DB.prepare(
    `SELECT id, title, store, store_logo, category, max_discount, status, 
            is_featured, sort_order, view_count, like_count, comment_count, 
            favorite_count, created_at, updated_at
     FROM deals ${whereClause}
     ORDER BY ${safeSortBy} ${safeSortOrder}
     LIMIT ? OFFSET ?`
  )
    .bind(...bindValues, pageSize, offset)
    .all<{
      id: string;
      title: string;
      store: string;
      store_logo: string | null;
      category: string;
      max_discount: number;
      status: string;
      is_featured: number;
      sort_order: number;
      view_count: number;
      like_count: number;
      comment_count: number;
      favorite_count: number;
      created_at: string;
      updated_at: string;
    }>();

  const items = (result.results || []).map((row) => ({
    id: row.id,
    title: row.title,
    store: row.store,
    storeLogo: row.store_logo,
    category: row.category,
    maxDiscount: row.max_discount,
    status: row.status,
    isFeatured: row.is_featured === 1,
    sortOrder: row.sort_order,
    viewCount: row.view_count,
    likeCount: row.like_count,
    commentCount: row.comment_count,
    favoriteCount: row.favorite_count,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));

  return paginatedResponse(items, countResult?.total || 0, page, pageSize);
});

adminDealsRoutes.get('/:id', async (c: Context<{ Bindings: Env }>) => {
  const authResult = await authenticateAdmin(c.req.raw, c.env);
  const permCheck = requirePermission(authResult, 'deal:read');
  if (!permCheck.allowed) {
    return errorResponse(permCheck.error?.code || 40301, permCheck.error?.message || '权限不足', 403);
  }

  const id = c.req.param('id');

  const deal = await c.env.DB.prepare(`SELECT * FROM deals WHERE id = ?`)
    .bind(id)
    .first();

  if (!deal) {
    return errorResponse(40401, '折扣不存在', 404);
  }

  const productsResult = await c.env.DB.prepare(
    `SELECT * FROM products WHERE deal_id = ? ORDER BY sort_order ASC, created_at ASC`
  )
    .bind(id)
    .all();

  return successResponse({
    ...deal,
    storeLogo: (deal as any).store_logo,
    subCategory: (deal as any).sub_category,
    richContent: (deal as any).rich_content,
    maxDiscount: (deal as any).max_discount,
    couponCode: (deal as any).coupon_code,
    expiresAt: (deal as any).expires_at,
    isFeatured: (deal as any).is_featured === 1,
    sortOrder: (deal as any).sort_order,
    tags: (deal as any).tags ? JSON.parse((deal as any).tags) : [],
    likeCount: (deal as any).like_count,
    commentCount: (deal as any).comment_count,
    favoriteCount: (deal as any).favorite_count,
    viewCount: (deal as any).view_count,
    createdBy: (deal as any).created_by,
    updatedBy: (deal as any).updated_by,
    createdAt: (deal as any).created_at,
    updatedAt: (deal as any).updated_at,
    products: (productsResult.results || []).map((p: any) => ({
      ...p,
      platformId: p.platform_id,
      dealId: p.deal_id,
      imageUrl: p.image_url,
      originalPrice: p.original_price,
      currentPrice: p.current_price,
      savingsAmount: p.savings_amount,
      savingsPercent: p.savings_percent,
      affiliateUrl: p.affiliate_url,
      reviewCount: p.review_count,
      inStock: p.in_stock === 1,
      sortOrder: p.sort_order,
      createdAt: p.created_at,
      updatedAt: p.updated_at,
    })),
  });
});

adminDealsRoutes.post('/', async (c: Context<{ Bindings: Env }>) => {
  const authResult = await authenticateAdmin(c.req.raw, c.env);
  const permCheck = requirePermission(authResult, 'deal:create');
  if (!permCheck.allowed) {
    return errorResponse(permCheck.error?.code || 40301, permCheck.error?.message || '权限不足', 403);
  }

  const body = await c.req.json<any>();
  const id = generateDealId();
  const admin = authResult.admin!;

  const tagsJson = body.tags ? JSON.stringify(body.tags) : null;

  await c.env.DB.prepare(
    `INSERT INTO deals 
     (id, title, store, store_logo, category, sub_category, description, rich_content,
      max_discount, coupon_code, expires_at, status, is_featured, sort_order, tags,
      created_by, updated_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(
      id,
      body.title,
      body.store,
      body.storeLogo || null,
      body.category,
      body.subCategory || null,
      body.description || '',
      body.richContent || null,
      body.maxDiscount || 0,
      body.couponCode || null,
      body.expiresAt || null,
      body.status || 'draft',
      body.isFeatured ? 1 : 0,
      body.sortOrder || 0,
      tagsJson,
      admin.id,
      admin.id
    )
    .run();

  if (body.products && body.products.length > 0) {
    for (const product of body.products) {
      const productId = product.id || ('prod-' + Math.random().toString(36).substring(2, 10));
      await c.env.DB.prepare(
        `INSERT INTO products 
         (id, platform, platform_id, deal_id, name, brand, image_url, original_price,
          current_price, savings_amount, savings_percent, affiliate_url, rating,
          review_count, in_stock, sort_order)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
        .bind(
          productId,
          product.platform,
          product.platformId || null,
          id,
          product.name,
          product.brand || null,
          product.imageUrl || null,
          product.originalPrice || null,
          product.currentPrice || null,
          product.savingsAmount || null,
          product.savingsPercent || null,
          product.affiliateUrl || null,
          product.rating || null,
          product.reviewCount || 0,
          product.inStock === false ? 0 : 1,
          product.sortOrder || 0
        )
        .run();
    }
  }

  await createAuditLog(c.env.DB, {
    adminId: admin.id,
    adminUsername: admin.username,
    action: 'create',
    module: 'deals',
    targetId: id,
    targetType: 'deal',
    newValue: { title: body.title, store: body.store, category: body.category },
    ipAddress: getClientIp(c.req.raw),
    userAgent: getUserAgent(c.req.raw),
    status: 'success',
  });

  return successResponse({ id }, '创建成功');
});

adminDealsRoutes.put('/:id', async (c: Context<{ Bindings: Env }>) => {
  const authResult = await authenticateAdmin(c.req.raw, c.env);
  const permCheck = requirePermission(authResult, 'deal:update');
  if (!permCheck.allowed) {
    return errorResponse(permCheck.error?.code || 40301, permCheck.error?.message || '权限不足', 403);
  }

  const id = c.req.param('id');
  const body = await c.req.json<any>();
  const admin = authResult.admin!;

  const existing = await c.env.DB.prepare(`SELECT id FROM deals WHERE id = ?`)
    .bind(id)
    .first();

  if (!existing) {
    return errorResponse(40401, '折扣不存在', 404);
  }

  const updateFields: string[] = [];
  const updateValues: any[] = [];

  const fieldMap: Record<string, string> = {
    title: 'title',
    store: 'store',
    storeLogo: 'store_logo',
    category: 'category',
    subCategory: 'sub_category',
    description: 'description',
    richContent: 'rich_content',
    maxDiscount: 'max_discount',
    couponCode: 'coupon_code',
    expiresAt: 'expires_at',
    status: 'status',
    sortOrder: 'sort_order',
  };

  for (const [key, dbField] of Object.entries(fieldMap)) {
    if (body[key] !== undefined) {
      updateFields.push(`${dbField} = ?`);
      updateValues.push(body[key] !== null ? body[key] : null);
    }
  }

  if (body.isFeatured !== undefined) {
    updateFields.push('is_featured = ?');
    updateValues.push(body.isFeatured ? 1 : 0);
  }

  if (body.tags !== undefined) {
    updateFields.push('tags = ?');
    updateValues.push(JSON.stringify(body.tags));
  }

  if (updateFields.length > 0) {
    updateFields.push('updated_by = ?');
    updateValues.push(admin.id);
    updateValues.push(id);

    await c.env.DB.prepare(
      `UPDATE deals SET ${updateFields.join(', ')} WHERE id = ?`
    )
      .bind(...updateValues)
      .run();
  }

  if (body.products !== undefined) {
    await c.env.DB.prepare(`DELETE FROM products WHERE deal_id = ?`).bind(id).run();

    for (const product of body.products) {
      const productId = product.id || ('prod-' + Math.random().toString(36).substring(2, 10));
      await c.env.DB.prepare(
        `INSERT INTO products 
         (id, platform, platform_id, deal_id, name, brand, image_url, original_price,
          current_price, savings_amount, savings_percent, affiliate_url, rating,
          review_count, in_stock, sort_order)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
        .bind(
          productId,
          product.platform,
          product.platformId || null,
          id,
          product.name,
          product.brand || null,
          product.imageUrl || null,
          product.originalPrice || null,
          product.currentPrice || null,
          product.savingsAmount || null,
          product.savingsPercent || null,
          product.affiliateUrl || null,
          product.rating || null,
          product.reviewCount || 0,
          product.inStock === false ? 0 : 1,
          product.sortOrder || 0
        )
        .run();
    }
  }

  await createAuditLog(c.env.DB, {
    adminId: admin.id,
    adminUsername: admin.username,
    action: 'update',
    module: 'deals',
    targetId: id,
    targetType: 'deal',
    newValue: body,
    ipAddress: getClientIp(c.req.raw),
    userAgent: getUserAgent(c.req.raw),
    status: 'success',
  });

  return successResponse({ id }, '更新成功');
});

adminDealsRoutes.patch('/:id/status', async (c: Context<{ Bindings: Env }>) => {
  const authResult = await authenticateAdmin(c.req.raw, c.env);
  const permCheck = requirePermission(authResult, 'deal:update');
  if (!permCheck.allowed) {
    return errorResponse(permCheck.error?.code || 40301, permCheck.error?.message || '权限不足', 403);
  }

  const id = c.req.param('id');
  const body = await c.req.json<{ status?: string; isFeatured?: boolean }>();
  const admin = authResult.admin!;

  const updateFields: string[] = [];
  const updateValues: any[] = [];

  if (body.status !== undefined) {
    updateFields.push('status = ?');
    updateValues.push(body.status);
  }
  if (body.isFeatured !== undefined) {
    updateFields.push('is_featured = ?');
    updateValues.push(body.isFeatured ? 1 : 0);
  }

  if (updateFields.length === 0) {
    return errorResponse(40001, '缺少更新字段');
  }

  updateFields.push('updated_by = ?');
  updateValues.push(admin.id);
  updateValues.push(id);

  const result = await c.env.DB.prepare(
    `UPDATE deals SET ${updateFields.join(', ')} WHERE id = ?`
  )
    .bind(...updateValues)
    .run();

  if (result.meta.changes === 0) {
    return errorResponse(40401, '折扣不存在', 404);
  }

  await createAuditLog(c.env.DB, {
    adminId: admin.id,
    adminUsername: admin.username,
    action: 'update_status',
    module: 'deals',
    targetId: id,
    targetType: 'deal',
    newValue: body,
    ipAddress: getClientIp(c.req.raw),
    userAgent: getUserAgent(c.req.raw),
    status: 'success',
  });

  return successResponse(null, '状态更新成功');
});

adminDealsRoutes.delete('/:id', async (c: Context<{ Bindings: Env }>) => {
  const authResult = await authenticateAdmin(c.req.raw, c.env);
  const permCheck = requirePermission(authResult, 'deal:delete');
  if (!permCheck.allowed) {
    return errorResponse(permCheck.error?.code || 40301, permCheck.error?.message || '权限不足', 403);
  }

  const id = c.req.param('id');
  const admin = authResult.admin!;

  const existing = await c.env.DB.prepare(
    `SELECT id, title FROM deals WHERE id = ?`
  )
    .bind(id)
    .first<{ id: string; title: string }>();

  if (!existing) {
    return errorResponse(40401, '折扣不存在', 404);
  }

  await c.env.DB.prepare(`DELETE FROM products WHERE deal_id = ?`).bind(id).run();
  await c.env.DB.prepare(`DELETE FROM deals WHERE id = ?`).bind(id).run();

  await createAuditLog(c.env.DB, {
    adminId: admin.id,
    adminUsername: admin.username,
    action: 'delete',
    module: 'deals',
    targetId: id,
    targetType: 'deal',
    oldValue: { title: existing.title },
    ipAddress: getClientIp(c.req.raw),
    userAgent: getUserAgent(c.req.raw),
    status: 'success',
  });

  return successResponse(null, '删除成功');
});

adminDealsRoutes.post('/batch', async (c: Context<{ Bindings: Env }>) => {
  const authResult = await authenticateAdmin(c.req.raw, c.env);
  const permCheck = requirePermission(authResult, 'deal:update');
  if (!permCheck.allowed) {
    return errorResponse(permCheck.error?.code || 40301, permCheck.error?.message || '权限不足', 403);
  }

  const body = await c.req.json<{ action: string; ids: string[] }>();
  const admin = authResult.admin!;

  if (!body.ids || !Array.isArray(body.ids) || body.ids.length === 0) {
    return errorResponse(40001, '请选择要操作的折扣');
  }

  const validActions = ['publish', 'offline', 'draft', 'feature', 'unfeature', 'delete'];
  if (!validActions.includes(body.action)) {
    return errorResponse(40002, '无效的操作类型');
  }

  const placeholders = body.ids.map(() => '?').join(',');
  const statusMap: Record<string, string> = {
    publish: 'published',
    offline: 'offline',
    draft: 'draft',
  };

  if (body.action === 'delete') {
    const deletePermCheck = requirePermission(authResult, 'deal:delete');
    if (!deletePermCheck.allowed) {
      return errorResponse(40301, '无删除权限', 403);
    }
    await c.env.DB.prepare(`DELETE FROM products WHERE deal_id IN (${placeholders})`)
      .bind(...body.ids)
      .run();
    await c.env.DB.prepare(`DELETE FROM deals WHERE id IN (${placeholders})`)
      .bind(...body.ids)
      .run();
  } else if (body.action === 'feature' || body.action === 'unfeature') {
    const featuredValue = body.action === 'feature' ? 1 : 0;
    await c.env.DB.prepare(
      `UPDATE deals SET is_featured = ?, updated_by = ? WHERE id IN (${placeholders})`
    )
      .bind(featuredValue, admin.id, ...body.ids)
      .run();
  } else {
    const status = statusMap[body.action];
    await c.env.DB.prepare(
      `UPDATE deals SET status = ?, updated_by = ? WHERE id IN (${placeholders})`
    )
      .bind(status, admin.id, ...body.ids)
      .run();
  }

  await createAuditLog(c.env.DB, {
    adminId: admin.id,
    adminUsername: admin.username,
    action: `batch_${body.action}`,
    module: 'deals',
    targetId: body.ids.join(','),
    targetType: 'deal',
    newValue: { count: body.ids.length, action: body.action },
    ipAddress: getClientIp(c.req.raw),
    userAgent: getUserAgent(c.req.raw),
    status: 'success',
  });

  return successResponse(null, '批量操作成功');
});

export default adminDealsRoutes;

// 折扣关联商品管理路由
adminDealsRoutes.get('/:id/products', async (c: Context<{ Bindings: Env }>) => {
  const authResult = await authenticateAdmin(c.req.raw, c.env);
  const permCheck = requirePermission(authResult, 'deal:read');
  if (!permCheck.allowed) {
    return errorResponse(permCheck.error?.code || 40301, permCheck.error?.message || '权限不足', 403);
  }

  const id = c.req.param('id');

  const deal = await c.env.DB.prepare(`SELECT id FROM deals WHERE id = ?`)
    .bind(id)
    .first();

  if (!deal) {
    return errorResponse(40401, '折扣不存在', 404);
  }

  const productsResult = await c.env.DB.prepare(
    `SELECT * FROM products WHERE deal_id = ? ORDER BY sort_order ASC, created_at ASC`
  )
    .bind(id)
    .all<any>();

  const products = (productsResult.results || []).map((p) => ({
    id: p.id,
    platform: p.platform,
    platformId: p.platform_id,
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
  }));

  return successResponse(products);
});

adminDealsRoutes.post('/:id/products', async (c: Context<{ Bindings: Env }>) => {
  const authResult = await authenticateAdmin(c.req.raw, c.env);
  const permCheck = requirePermission(authResult, 'deal:update');
  if (!permCheck.allowed) {
    return errorResponse(permCheck.error?.code || 40301, permCheck.error?.message || '权限不足', 403);
  }

  const id = c.req.param('id');
  const body = await c.req.json<{ productIds: string[] }>();
  const admin = authResult.admin!;

  const deal = await c.env.DB.prepare(`SELECT id, title FROM deals WHERE id = ?`)
    .bind(id)
    .first();

  if (!deal) {
    return errorResponse(40401, '折扣不存在', 404);
  }

  if (!body.productIds || !Array.isArray(body.productIds) || body.productIds.length === 0) {
    return errorResponse(40001, '请选择要关联的商品', 400);
  }

  // 批量关联商品
  for (const productId of body.productIds) {
    await c.env.DB.prepare(
      `UPDATE products SET deal_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`
    )
      .bind(id, productId)
      .run();
  }

  await createAuditLog(c.env.DB, {
    adminId: admin.id,
    adminUsername: admin.username,
    action: 'link_products',
    module: 'deals',
    targetId: id,
    targetType: 'deal',
    newValue: { productIds: body.productIds },
    ipAddress: getClientIp(c.req.raw),
    userAgent: getUserAgent(c.req.raw),
    status: 'success',
  });

  return successResponse({ count: body.productIds.length }, `成功关联 ${body.productIds.length} 个商品`);
});

adminDealsRoutes.delete('/:id/products/:productId', async (c: Context<{ Bindings: Env }>) => {
  const authResult = await authenticateAdmin(c.req.raw, c.env);
  const permCheck = requirePermission(authResult, 'deal:update');
  if (!permCheck.allowed) {
    return errorResponse(permCheck.error?.code || 40301, permCheck.error?.message || '权限不足', 403);
  }

  const id = c.req.param('id');
  const productId = c.req.param('productId');
  const admin = authResult.admin!;

  const deal = await c.env.DB.prepare(`SELECT id FROM deals WHERE id = ?`)
    .bind(id)
    .first();

  if (!deal) {
    return errorResponse(40401, '折扣不存在', 404);
  }

  await c.env.DB.prepare(
    `UPDATE products SET deal_id = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND deal_id = ?`
  )
    .bind(productId, id)
    .run();

  await createAuditLog(c.env.DB, {
    adminId: admin.id,
    adminUsername: admin.username,
    action: 'unlink_product',
    module: 'deals',
    targetId: id,
    targetType: 'deal',
    newValue: { productId },
    ipAddress: getClientIp(c.req.raw),
    userAgent: getUserAgent(c.req.raw),
    status: 'success',
  });

  return successResponse(null, '已取消关联');
});
