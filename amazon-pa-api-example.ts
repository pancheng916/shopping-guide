/**
 * Amazon Product Advertising API (PA API 5.0) 接入示例
 *
 * 用途：从 Amazon 获取商品信息与折扣数据，生成联盟推广链接
 * 运行环境：Cloudflare Workers / Node.js 18+
 *
 * 前置条件：
 * 1. 注册 Amazon Associates 账号：https://affiliate-program.amazon.com/
 * 2. 在 Associates 后台申请 PA API 访问权限
 * 3. 获取 AWS Access Key ID、Secret Access Key、Partner Tag（Associate Tag）
 */

// ========================
// 配置
// ========================
const CONFIG = {
  // AWS 认证信息（从 Amazon Associates 后台获取）
  accessKey: '',     // 填入你的 AWS Access Key ID
  secretKey: '',     // 填入你的 AWS Secret Access Key
  partnerTag: '',    // 填入你的 Associate Tag（如 yourtag-20）
  // API 站点配置
  host: 'webservices.amazon.com',
  region: 'us-east-1',
  path: '/paapi5/searchitems',
};

// ========================
// 1. AWS Signature V4 签名
// ========================
async function getSignedHeaders(
  method: string,
  host: string,
  path: string,
  queryString: string,
  body: string
): Promise<Record<string, string>> {
  const service = 'ProductAdvertisingAPI';
  const now = new Date();
  const amzDate = now.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const dateStamp = amzDate.slice(0, 8);

  const payloadHash = await sha256(body);
  const canonicalHeaders = [
    `content-encoding:amz-1.0`,
    `content-type:application/json; charset=UTF-8`,
    `host:${host}`,
    `x-amz-date:${amzDate}`,
  ].join('\n');
  const signedHeaders = 'content-encoding;content-type;host;x-amz-date';
  const canonicalRequest = [
    method,
    path,
    queryString,
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join('\n');

  const credentialScope = `${dateStamp}/${CONFIG.region}/${service}/aws4_request`;
  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    credentialScope,
    await sha256(canonicalRequest),
  ].join('\n');

  const signingKey = await getSignatureKey(
    CONFIG.secretKey,
    dateStamp,
    CONFIG.region,
    service
  );
  const signature = await hmacSha256(signingKey, stringToSign);

  return {
    'Content-Encoding': 'amz-1.0',
    'Content-Type': 'application/json; charset=UTF-8',
    'X-Amz-Date': amzDate,
    'Authorization': `AWS4-HMAC-SHA256 Credential=${CONFIG.accessKey}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
  };
}

// ========================
// 2. 签名辅助函数
// ========================
async function sha256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

async function hmacSha256(key: ArrayBuffer | string, message: string): Promise<string> {
  const keyBuffer = typeof key === 'string' ? new TextEncoder().encode(key) : key;
  const msgBuffer = new TextEncoder().encode(message);
  const cryptoKey = await crypto.subtle.importKey('raw', keyBuffer, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sigBuffer = await crypto.subtle.sign('HMAC', cryptoKey, msgBuffer);
  return Array.from(new Uint8Array(sigBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

async function getSignatureKey(
  key: string,
  dateStamp: string,
  region: string,
  service: string
): Promise<ArrayBuffer> {
  const kDate = await hmacSha256Raw(`AWS4${key}`, dateStamp);
  const kRegion = await hmacSha256Raw(kDate, region);
  const kService = await hmacSha256Raw(kRegion, service);
  const kSigning = await hmacSha256Raw(kService, 'aws4_request');
  return kSigning;
}

async function hmacSha256Raw(key: ArrayBuffer | string, message: string): Promise<ArrayBuffer> {
  const keyBuffer = typeof key === 'string' ? new TextEncoder().encode(key) : key;
  const msgBuffer = new TextEncoder().encode(message);
  const cryptoKey = await crypto.subtle.importKey('raw', keyBuffer, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return crypto.subtle.sign('HMAC', cryptoKey, msgBuffer);
}

// ========================
// 3. 搜索折扣商品
// ========================
interface SearchParams {
  keywords: string;       // 搜索关键词
  searchIndex?: string;   // 商品分类（如 Fashion、Electronics）
  minDiscount?: number;   // 最低折扣百分比（0-100）
  minPrice?: number;      // 最低价格
  maxPrice?: number;      // 最高价格
  itemCount?: number;     // 返回数量（默认10）
  page?: number;          // 页码
}

interface DealItem {
  asin: string;
  title: string;
  brand: string;
  imageUrl: string;
  originalPrice: number;
  currentPrice: number;
  savingsAmount: number;
  savingsPercent: number;
  affiliateUrl: string;
  rating: string;
  reviewCount: number;
}

/**
 * 通过 PA API 搜索商品并筛选折扣
 */
async function searchDeals(params: SearchParams): Promise<DealItem[]> {
  const {
    keywords,
    searchIndex = 'All',
    minDiscount = 10,
    minPrice,
    maxPrice,
    itemCount = 10,
    page = 1,
  } = params;

  // 构建请求体
  const body: Record<string, unknown> = {
    Keywords: keywords,
    SearchIndex: searchIndex,
    ItemCount: itemCount,
    ItemPage: page,
    PartnerTag: CONFIG.partnerTag,
    PartnerType: 'Associates',
    Resources: [
      'ItemInfo.Title',
      'ItemInfo.Brand',
      'ItemInfo.Features',
      'Images.Primary.Large',
      'Offers.Listings.Price',
      'Offers.Listings.Savings',
      'Offers.Listings.DeliveryInfo',
      'CustomerReviews.Count',
      'CustomerReviews.StarRating',
    ],
  };

  // 添加价格区间筛选（如有）
  if (minPrice || maxPrice) {
    const priceFilter: Record<string, unknown> = {};
    if (minPrice) priceFilter.Min = { Amount: minPrice, Currency: 'USD' };
    if (maxPrice) priceFilter.Max = { Amount: maxPrice, Currency: 'USD' };
    // @ts-expect-error - 动态构建
    body.ValueFilter = { Type: 'Price', ValueRange: priceFilter };
  }

  const bodyStr = JSON.stringify(body);
  const signedHeaders = await getSignedHeaders('POST', CONFIG.host, CONFIG.path, '', bodyStr);

  const response = await fetch(`https://${CONFIG.host}${CONFIG.path}`, {
    method: 'POST',
    headers: signedHeaders,
    body: bodyStr,
  });

  if (!response.ok) {
    throw new Error(`PA API 请求失败: ${response.status} ${await response.text()}`);
  }

  const data = await response.json() as any;

  // 解析并筛选折扣商品
  const deals: DealItem[] = [];

  if (data?.SearchResult?.Items) {
    for (const item of data.SearchResult.Items) {
      const offer = item.Offers?.Listings?.[0];
      const savings = offer?.Savings;
      const price = offer?.Price;

      if (!savings || !price) continue;

      // 按折扣百分比筛选
      const savingsPercent = savings.Percentage ?? 0;
      if (savingsPercent < minDiscount) continue;

      const image = item.Images?.Primary?.Large?.URL ?? '';
      const title = item.ItemInfo?.Title?.DisplayValue ?? '';

      deals.push({
        asin: item.ASIN,
        title: title.substring(0, 100), // 截断过长标题
        brand: item.ItemInfo?.Brand?.DisplayValue ?? '',
        imageUrl: image,
        originalPrice: savings.AmountFrom?.Amount ?? price.Amount + savings.Amount?.Amount,
        currentPrice: price.Amount,
        savingsAmount: savings.Amount?.Amount ?? 0,
        savingsPercent,
        affiliateUrl: buildAffiliateUrl(item.ASIN),
        rating: item.CustomerReviews?.StarRating?.StarRating ?? '',
        reviewCount: item.CustomerReviews?.Count ?? 0,
      });
    }
  }

  return deals;
}

// ========================
// 4. 获取单个商品详情
// ========================
interface ProductDetail extends DealItem {
  description: string;
  features: string[];
  category: string;
  inStock: boolean;
}

async function getProductDetail(asin: string): Promise<ProductDetail | null> {
  const body = JSON.stringify({
    ItemIds: [asin],
    Resources: [
      'ItemInfo.Title',
      'ItemInfo.Brand',
      'ItemInfo.Description',
      'ItemInfo.Features',
      'ItemInfo.Classifications',
      'Images.Primary.Large',
      'Offers.Listings.Price',
      'Offers.Listings.Savings',
      'Offers.Listings.Availability',
      'CustomerReviews.Count',
      'CustomerReviews.StarRating',
    ],
    PartnerTag: CONFIG.partnerTag,
    PartnerType: 'Associates',
  });

  const signedHeaders = await getSignedHeaders(
    'POST', CONFIG.host,
    '/paapi5/getitems', '', body
  );

  const response = await fetch(`https://${CONFIG.host}/paapi5/getitems`, {
    method: 'POST',
    headers: signedHeaders,
    body,
  });

  if (!response.ok) throw new Error(`PA API 请求失败: ${response.status}`);

  const data = await response.json() as any;
  const item = data?.ItemsResult?.Items?.[0];

  if (!item) return null;

  const offer = item.Offers?.Listings?.[0];
  const savings = offer?.Savings;
  const price = offer?.Price;

  return {
    asin: item.ASIN,
    title: item.ItemInfo?.Title?.DisplayValue ?? '',
    brand: item.ItemInfo?.Brand?.DisplayValue ?? '',
    imageUrl: item.Images?.Primary?.Large?.URL ?? '',
    originalPrice: savings?.AmountFrom?.Amount ?? (price?.Amount ?? 0),
    currentPrice: price?.Amount ?? 0,
    savingsAmount: savings?.Amount?.Amount ?? 0,
    savingsPercent: savings?.Percentage ?? 0,
    affiliateUrl: buildAffiliateUrl(item.ASIN),
    rating: item.CustomerReviews?.StarRating?.StarRating ?? '',
    reviewCount: item.CustomerReviews?.Count ?? 0,
    description: item.ItemInfo?.Description?.DisplayValue ?? '',
    features: item.ItemInfo?.Features?.DisplayValues ?? [],
    category: item.ItemInfo?.Classifications?.Binding?.DisplayValue ?? '',
    inStock: offer?.Availability?.Type === 'Now',
  };
}

// ========================
// 5. 生成联盟推广链接
// ========================
/**
 * 构建带 Associate Tag 的推广链接
 * 用户通过此链接购买即可获得佣金
 */
function buildAffiliateUrl(asin: string): string {
  return `https://www.amazon.com/dp/${asin}?tag=${CONFIG.partnerTag}`;
}

// ========================
// 6. Cloudflare Worker 入口示例
// ========================
/**
 * 示例 Worker 路由：
 * GET /api/deals?keyword=shoes&minDiscount=20&maxPrice=100
 */
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    // 健康检查
    if (path === '/api/health') {
      return Response.json({ status: 'ok', timestamp: new Date().toISOString() });
    }

    // 搜索折扣商品
    if (path === '/api/deals' && request.method === 'GET') {
      const keyword = url.searchParams.get('keyword') ?? '';
      const minDiscount = Number(url.searchParams.get('minDiscount') ?? 10);
      const maxPrice = Number(url.searchParams.get('maxPrice') ?? 0) || undefined;

      if (!keyword) {
        return Response.json({ error: 'keyword 参数必填' }, { status: 400 });
      }

      try {
        const deals = await searchDeals({
          keywords: keyword,
          minDiscount,
          maxPrice: maxPrice,
          itemCount: 20,
        });

        // 缓存到 KV（Cloudflare Workers 环境）
        // await env.DEALS_CACHE.put(`deals:${keyword}`, JSON.stringify(deals), { expirationTtl: 300 });

        return Response.json({
          keyword,
          total: deals.length,
          deals,
        });
      } catch (error: any) {
        return Response.json({ error: error.message }, { status: 500 });
      }
    }

    // 获取商品详情
    if (path.startsWith('/api/product/') && request.method === 'GET') {
      const asin = path.replace('/api/product/', '');

      if (!/^[A-Z0-9]{10}$/i.test(asin)) {
        return Response.json({ error: '无效的 ASIN 格式' }, { status: 400 });
      }

      try {
        const detail = await getProductDetail(asin);
        if (!detail) {
          return Response.json({ error: '商品未找到' }, { status: 404 });
        }
        return Response.json(detail);
      } catch (error: any) {
        return Response.json({ error: error.message }, { status: 500 });
      }
    }

    return Response.json({ error: 'Not Found' }, { status: 404 });
  },
};

// ========================
// Env 类型声明
// ========================
interface Env {
  AMAZON_ACCESS_KEY: string;
  AMAZON_SECRET_KEY: string;
  AMAZON_PARTNER_TAG: string;
  DEALS_CACHE: KVNamespace;
}

// ========================
// 使用示例（Node.js 环境）
// ========================
/*
async function main() {
  // 1. 搜索折扣商品
  const deals = await searchDeals({
    keywords: 'wireless earbuds',
    searchIndex: 'Electronics',
    minDiscount: 15,  // 至少15%折扣
    maxPrice: 80,
    itemCount: 10,
  });

  console.log(`找到 ${deals.length} 个折扣商品：`);
  deals.forEach((deal, i) => {
    console.log(`  ${i + 1}. ${deal.title}`);
    console.log(`     原价: $${deal.originalPrice} → 现价: $${deal.currentPrice} (-${deal.savingsPercent}%)`);
    console.log(`     推广链接: ${deal.affiliateUrl}`);
  });

  // 2. 获取单个商品详情
  if (deals.length > 0) {
    const detail = await getProductDetail(deals[0].asin);
    console.log('\n商品详情:', detail);
  }
}
*/
