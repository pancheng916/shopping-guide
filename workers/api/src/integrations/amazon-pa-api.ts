import type { Env, AmazonDealItem, SearchParams } from '../types';

const PA_API_PATH = '/paapi5/searchitems';
const PA_API_GET_ITEMS_PATH = '/paapi5/getitems';
const SERVICE = 'ProductAdvertisingAPI';

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
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyBuffer,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sigBuffer = await crypto.subtle.sign('HMAC', cryptoKey, msgBuffer);
  return Array.from(new Uint8Array(sigBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

async function hmacSha256Raw(key: ArrayBuffer | string, message: string): Promise<ArrayBuffer> {
  const keyBuffer = typeof key === 'string' ? new TextEncoder().encode(key) : key;
  const msgBuffer = new TextEncoder().encode(message);
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyBuffer,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  return crypto.subtle.sign('HMAC', cryptoKey, msgBuffer);
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

async function getSignedHeaders(
  method: string,
  host: string,
  path: string,
  queryString: string,
  body: string,
  accessKey: string,
  secretKey: string,
  region: string
): Promise<Record<string, string>> {
  const now = new Date();
  const amzDate = now.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const dateStamp = amzDate.slice(0, 8);

  const payloadHash = await sha256(body);
  const canonicalHeaders = [
    'content-encoding:amz-1.0',
    'content-type:application/json; charset=UTF-8',
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

  const credentialScope = `${dateStamp}/${region}/${SERVICE}/aws4_request`;
  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    credentialScope,
    await sha256(canonicalRequest),
  ].join('\n');

  const signingKey = await getSignatureKey(secretKey, dateStamp, region, SERVICE);
  const signature = await hmacSha256(signingKey, stringToSign);

  return {
    'Content-Encoding': 'amz-1.0',
    'Content-Type': 'application/json; charset=UTF-8',
    'X-Amz-Date': amzDate,
    Authorization: `AWS4-HMAC-SHA256 Credential=${accessKey}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
  };
}

function buildAffiliateUrl(asin: string, partnerTag: string): string {
  return `https://www.amazon.com/dp/${asin}?tag=${partnerTag}`;
}

export async function searchDeals(
  params: SearchParams,
  env: Env
): Promise<AmazonDealItem[]> {
  const {
    keywords,
    searchIndex = 'All',
    minDiscount = 10,
    minPrice,
    maxPrice,
    itemCount = 10,
    page = 1,
  } = params;

  const accessKey = env.AMAZON_ACCESS_KEY;
  const secretKey = env.AMAZON_SECRET_KEY;
  const partnerTag = env.AMAZON_PARTNER_TAG;
  const host = env.AMAZON_HOST || 'webservices.amazon.com';
  const region = env.AMAZON_REGION || 'us-east-1';

  if (!accessKey || !secretKey || !partnerTag) {
    return [];
  }

  const body: Record<string, unknown> = {
    Keywords: keywords,
    SearchIndex: searchIndex,
    ItemCount: Math.min(itemCount, 10),
    ItemPage: page,
    PartnerTag: partnerTag,
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

  if (minPrice || maxPrice) {
    const priceFilter: Record<string, unknown> = {};
    if (minPrice) priceFilter.Min = { Amount: minPrice, Currency: 'USD' };
    if (maxPrice) priceFilter.Max = { Amount: maxPrice, Currency: 'USD' };
    (body as any).ValueFilter = { Type: 'Price', ValueRange: priceFilter };
  }

  const bodyStr = JSON.stringify(body);
  const signedHeaders = await getSignedHeaders(
    'POST',
    host,
    PA_API_PATH,
    '',
    bodyStr,
    accessKey,
    secretKey,
    region
  );

  try {
    const response = await fetch(`https://${host}${PA_API_PATH}`, {
      method: 'POST',
      headers: signedHeaders,
      body: bodyStr,
    });

    if (!response.ok) {
      console.error(`PA API error: ${response.status}`);
      return [];
    }

    const data: any = await response.json();
    const deals: AmazonDealItem[] = [];

    if (data?.SearchResult?.Items) {
      for (const item of data.SearchResult.Items) {
        const offer = item.Offers?.Listings?.[0];
        const savings = offer?.Savings;
        const price = offer?.Price;

        if (!savings || !price) continue;

        const savingsPercent = savings.Percentage ?? 0;
        if (savingsPercent < minDiscount) continue;

        const image = item.Images?.Primary?.Large?.URL ?? '';
        const title = item.ItemInfo?.Title?.DisplayValue ?? '';

        deals.push({
          asin: item.ASIN,
          title: title.substring(0, 100),
          brand: item.ItemInfo?.Brand?.DisplayValue ?? '',
          imageUrl: image,
          originalPrice: savings.AmountFrom?.Amount ?? price.Amount + (savings.Amount?.Amount || 0),
          currentPrice: price.Amount,
          savingsAmount: savings.Amount?.Amount ?? 0,
          savingsPercent,
          affiliateUrl: buildAffiliateUrl(item.ASIN, partnerTag),
          rating: item.CustomerReviews?.StarRating?.StarRating ?? '',
          reviewCount: item.CustomerReviews?.Count ?? 0,
          features: item.ItemInfo?.Features?.DisplayValues ?? [],
          category: item.ItemInfo?.Classifications?.Binding?.DisplayValue ?? '',
        });
      }
    }

    return deals;
  } catch (error) {
    console.error('PA API request failed:', error);
    return [];
  }
}

export async function getProductDetail(
  asin: string,
  env: Env
): Promise<AmazonDealItem | null> {
  const accessKey = env.AMAZON_ACCESS_KEY;
  const secretKey = env.AMAZON_SECRET_KEY;
  const partnerTag = env.AMAZON_PARTNER_TAG;
  const host = env.AMAZON_HOST || 'webservices.amazon.com';
  const region = env.AMAZON_REGION || 'us-east-1';

  if (!accessKey || !secretKey || !partnerTag) {
    return null;
  }

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
    PartnerTag: partnerTag,
    PartnerType: 'Associates',
  });

  const signedHeaders = await getSignedHeaders(
    'POST',
    host,
    PA_API_GET_ITEMS_PATH,
    '',
    body,
    accessKey,
    secretKey,
    region
  );

  try {
    const response = await fetch(`https://${host}${PA_API_GET_ITEMS_PATH}`, {
      method: 'POST',
      headers: signedHeaders,
      body,
    });

    if (!response.ok) return null;

    const data: any = await response.json();
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
      originalPrice: savings?.AmountFrom?.Amount ?? (price?.Amount ?? 0) + (savings?.Amount?.Amount || 0),
      currentPrice: price?.Amount ?? 0,
      savingsAmount: savings?.Amount?.Amount ?? 0,
      savingsPercent: savings?.Percentage ?? 0,
      affiliateUrl: buildAffiliateUrl(item.ASIN, partnerTag),
      rating: item.CustomerReviews?.StarRating?.StarRating ?? '',
      reviewCount: item.CustomerReviews?.Count ?? 0,
      description: item.ItemInfo?.Description?.DisplayValue ?? '',
      features: item.ItemInfo?.Features?.DisplayValues ?? [],
      category: item.ItemInfo?.Classifications?.Binding?.DisplayValue ?? '',
      inStock: offer?.Availability?.Type === 'Now',
    };
  } catch (error) {
    console.error('Get product detail failed:', error);
    return null;
  }
}
