export interface Env {
  AMAZON_ACCESS_KEY: string;
  AMAZON_SECRET_KEY: string;
  AMAZON_PARTNER_TAG: string;
  AMAZON_REGION: string;
  AMAZON_HOST: string;
  DEALS_CACHE: KVNamespace;
  CONFIG_STORE: KVNamespace;
  ADMIN_KV: KVNamespace;
  DB: D1Database;
  ADMIN_JWT_SECRET: string;
  ADMIN_TOKEN_EXPIRES_IN: string;
  ADMIN_PASSWORD_PEPPER: string;
  RATE_LIMIT_ENABLED: string;
}

export interface AmazonDealItem {
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
  description?: string;
  features?: string[];
  category?: string;
  inStock?: boolean;
}

export interface SearchParams {
  keywords: string;
  searchIndex?: string;
  minDiscount?: number;
  minPrice?: number;
  maxPrice?: number;
  itemCount?: number;
  page?: number;
}
