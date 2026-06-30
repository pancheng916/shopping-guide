export interface Product {
  id: string;
  platform: 'amazon' | 'walmart' | 'target';
  platformId?: string;
  name: string;
  brand: string;
  imageUrl: string;
  originalPrice: number;
  currentPrice: number;
  savingsAmount: number;
  savingsPercent: number;
  affiliateUrl: string;
  rating?: string;
  reviewCount?: number;
  inStock?: boolean;
}

export interface Deal {
  id: string;
  title: string;
  store: string;
  storeLogo?: string;
  category: string;
  subCategory?: string;
  description: string;
  richContent?: string;
  tags: DealTag[];
  maxDiscount: number;
  couponCode?: string;
  expiresAt?: string;
  products: Product[];
  likeCount: number;
  commentCount: number;
  favoriteCount: number;
  viewCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface DealTag {
  name: string;
  type: 'discount' | 'shipping' | 'hot' | 'new' | 'limited';
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  icon?: string;
  subCategories?: Category[];
}

export interface SearchParams {
  keyword: string;
  category?: string;
  minDiscount?: number;
  store?: string;
  page?: number;
  pageSize?: number;
}

export interface SearchResult {
  items: Deal[];
  total: number;
  page: number;
  pageSize: number;
}

export interface User {
  id: string;
  email: string;
  nickname: string;
  avatarUrl?: string;
  createdAt: string;
}

export interface Comment {
  id: string;
  userId: string;
  dealId: string;
  userName: string;
  userAvatar: string;
  content: string;
  likes: number;
  createdAt: string;
}

export interface Notification {
  id: number;
  userId: string;
  type: 'deal_update' | 'comment_reply' | 'system';
  title: string;
  content?: string;
  isRead: boolean;
  createdAt: string;
}

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

export * from './admin';
