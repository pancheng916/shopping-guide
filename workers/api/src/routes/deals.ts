import type { Env } from '../types';
import { searchDeals, getProductDetail } from '../integrations/amazon-pa-api';
import { CacheManager } from '../cache/cache-manager';
import type { Deal, Product, DealTag } from '@shared/types';

function toProduct(amazonItem: any): Product {
  return {
    id: amazonItem.asin,
    platform: 'amazon',
    platformId: amazonItem.asin,
    name: amazonItem.title,
    brand: amazonItem.brand,
    imageUrl: amazonItem.imageUrl,
    originalPrice: amazonItem.originalPrice,
    currentPrice: amazonItem.currentPrice,
    savingsAmount: amazonItem.savingsAmount,
    savingsPercent: amazonItem.savingsPercent,
    affiliateUrl: amazonItem.affiliateUrl,
    rating: amazonItem.rating,
    reviewCount: amazonItem.reviewCount,
    inStock: amazonItem.inStock,
  };
}

function generateTags(maxDiscount: number): DealTag[] {
  const tags: DealTag[] = [];
  if (maxDiscount >= 30) {
    tags.push({ name: '🔥 热卖', type: 'hot' });
  }
  if (maxDiscount >= 40) {
    tags.push({ name: `${maxDiscount}% OFF`, type: 'discount' });
  }
  tags.push({ name: '免运费', type: 'shipping' });
  return tags;
}

function productsToDeal(products: Product[], category: string, title?: string): Deal {
  const maxDiscount = Math.max(...products.map((p) => p.savingsPercent), 0);
  const store = products[0]?.brand || 'Amazon';
  const mainProduct = products[0];

  return {
    id: `deal-${products.map(p => p.id).join('-')}`,
    title: title || `${store} ${maxDiscount}% OFF 限时特惠`,
    store,
    category,
    description: `${store} 精选商品限时 ${maxDiscount}% OFF，多款热门单品超值优惠，Prime会员免运费，数量有限，先到先得！`,
    richContent: `
      <h3>📢 活动介绍</h3>
      <p>本次${store} 限时特惠活动火热进行中！精选多款热门商品，最高享受 <strong>${maxDiscount}% OFF</strong> 折扣力度！</p>
      <h3>✨ 活动亮点</h3>
      <ul>
        <li>🔥 全场商品低至${Math.round(100 - maxDiscount)}折起</li>
        <li>🚚 Prime会员免运费</li>
        <li>⏰ 限时特惠，售完即止</li>
        <li>💯 官方正品保证</li>
      </ul>
      <h3>🛒 购买方式</h3>
      <p>点击下方商品卡片，直接跳转至${store}官方页面购买。</p>
    `,
    tags: generateTags(maxDiscount),
    maxDiscount,
    products,
    likeCount: Math.floor(Math.random() * 500) + 50,
    commentCount: Math.floor(Math.random() * 100) + 10,
    favoriteCount: Math.floor(Math.random() * 300) + 20,
    viewCount: Math.floor(Math.random() * 5000) + 500,
    createdAt: new Date(Date.now() - Math.random() * 86400000 * 7).toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export async function handleDealsList(
  request: Request,
  env: Env
): Promise<Response> {
  const url = new URL(request.url);
  const keyword = url.searchParams.get('keyword') || '';
  const category = url.searchParams.get('category') || undefined;
  const minDiscount = Number(url.searchParams.get('minDiscount') || 10);
  const page = Number(url.searchParams.get('page') || 1);

  const cache = new CacheManager(env.DEALS_CACHE, 300);
  const cacheKey = CacheManager.keys.deals.search(keyword, category, page);

  const cached = await cache.get<{ items: Deal[]; total: number }>(cacheKey);
  if (cached) {
    return Response.json(cached, {
      headers: { 'X-Cache': 'HIT' },
    });
  }

  let items: Deal[] = [];

  // 优先从 D1 数据库读取折扣数据
  if (env.DB) {
    try {
      const conditions: string[] = ['status = ?'];
      const bindValues: (string | number)[] = ['published'];

      if (keyword) {
        conditions.push('(title LIKE ? OR description LIKE ?)');
        bindValues.push(`%${keyword}%`, `%${keyword}%`);
      }
      if (category) {
        conditions.push('category = ?');
        bindValues.push(category);
      }

      const whereClause = 'WHERE ' + conditions.join(' AND ');

      const result = await env.DB.prepare(
        `SELECT * FROM deals ${whereClause} ORDER BY is_featured DESC, sort_order ASC, created_at DESC LIMIT 20 OFFSET ?`
      )
        .bind(...bindValues, (page - 1) * 20)
        .all<any>();

      if (result.results && result.results.length > 0) {
        // 批量获取所有折扣ID
        const dealIds = result.results.map((row) => row.id);
        
        // 批量查询这些折扣关联的商品
        let productsMap: Record<string, any[]> = {};
        if (dealIds.length > 0) {
          const placeholders = dealIds.map(() => '?').join(',');
          const productsResult = await env.DB.prepare(
            `SELECT * FROM products WHERE deal_id IN (${placeholders}) ORDER BY deal_id, sort_order ASC, created_at ASC`
          )
            .bind(...dealIds)
            .all<any>();
          
          if (productsResult.results) {
            for (const p of productsResult.results) {
              const dealId = p.deal_id;
              if (!productsMap[dealId]) {
                productsMap[dealId] = [];
              }
              productsMap[dealId].push({
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
              });
            }
          }
        }
        
        items = result.results.map((row) => ({
          id: row.id,
          title: row.title,
          store: row.store,
          storeLogo: row.store_logo,
          category: row.category,
          subCategory: row.sub_category,
          description: row.description,
          richContent: row.rich_content,
          tags: row.tags ? JSON.parse(row.tags) : [],
          maxDiscount: row.max_discount,
          couponCode: row.coupon_code,
          expiresAt: row.expires_at,
          products: productsMap[row.id] || [],
          likeCount: row.like_count,
          commentCount: row.comment_count,
          favoriteCount: row.favorite_count,
          viewCount: row.view_count,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        }));
      }
    } catch (error) {
      console.error('Failed to fetch deals from DB:', error);
    }
  }

  // 如果数据库没有数据，使用 Amazon API 或 mock 数据
  if (items.length === 0) {
    if (env.AMAZON_ACCESS_KEY && env.AMAZON_SECRET_KEY) {
      const amazonResults = await searchDeals(
        {
          keywords: keyword,
          searchIndex: category || 'All',
          minDiscount,
          itemCount: 20,
          page,
        },
        env
      );
      const products = amazonResults.map(toProduct);
      const deals: Deal[] = [];
      for (let i = 0; i < products.length; i += 4) {
        const group = products.slice(i, i + 4);
        if (group.length > 0) {
          deals.push(productsToDeal(group, category || 'electronics'));
        }
      }
      items = deals;
    }
  }

  const result = {
    items,
    total: items.length * 5,
    page,
    pageSize: 20,
  };

  await cache.set(cacheKey, result, 300);

  return Response.json(result, {
    headers: { 'X-Cache': 'MISS' },
  });
}

export async function handleDealDetail(
  request: Request,
  env: Env,
  id: string
): Promise<Response> {
  const cache = new CacheManager(env.DEALS_CACHE, 1800);
  const cacheKey = CacheManager.keys.deals.detail(id);

  const cached = await cache.get<Deal>(cacheKey);
  if (cached) {
    return Response.json(cached, {
      headers: { 'X-Cache': 'HIT' },
    });
  }

  let deal: Deal | null = null;

  // 优先从 D1 数据库查询
  if (env.DB) {
    try {
      const dealResult = await env.DB.prepare(`SELECT * FROM deals WHERE id = ?`)
        .bind(id)
        .first<any>();

      if (dealResult) {
        // 查询关联的商品
        const productsResult = await env.DB.prepare(
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

        deal = {
          id: dealResult.id,
          title: dealResult.title,
          store: dealResult.store,
          storeLogo: dealResult.store_logo,
          category: dealResult.category,
          subCategory: dealResult.sub_category,
          description: dealResult.description,
          richContent: dealResult.rich_content,
          tags: dealResult.tags ? JSON.parse(dealResult.tags) : [],
          maxDiscount: dealResult.max_discount,
          couponCode: dealResult.coupon_code,
          expiresAt: dealResult.expires_at,
          products,
          likeCount: dealResult.like_count,
          commentCount: dealResult.comment_count,
          favoriteCount: dealResult.favorite_count,
          viewCount: dealResult.view_count,
          createdAt: dealResult.created_at,
          updatedAt: dealResult.updated_at,
        };
      }
    } catch (error) {
      console.error('Failed to fetch deal from DB:', error);
    }
  }

  // 如果数据库没有且配置了 Amazon API，尝试从 Amazon 获取
  if (!deal && env.AMAZON_ACCESS_KEY && env.AMAZON_SECRET_KEY) {
    const amazonProduct = await getProductDetail(id, env);
    if (amazonProduct) {
      const product = toProduct(amazonProduct);
      deal = productsToDeal([product], amazonProduct.category || 'electronics', amazonProduct.title);
    }
  }

  if (!deal) {
    return Response.json({ error: 'Deal not found' }, { status: 404 });
  }

  await cache.set(cacheKey, deal, 1800);

  return Response.json(deal, {
    headers: { 'X-Cache': 'MISS' },
  });
}

