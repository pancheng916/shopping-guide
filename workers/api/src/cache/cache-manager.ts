import type { Env } from '../types';

export class CacheManager {
  private kv: KVNamespace;
  private defaultTtl: number = 300;

  constructor(kv: KVNamespace, defaultTtl?: number) {
    this.kv = kv;
    if (defaultTtl) this.defaultTtl = defaultTtl;
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await this.kv.get(key, 'json');
      return value as T | null;
    } catch (e) {
      return null;
    }
  }

  async set(key: string, value: unknown, ttl?: number): Promise<void> {
    try {
      await this.kv.put(key, JSON.stringify(value), {
        expirationTtl: ttl ?? this.defaultTtl,
      });
    } catch (e) {
      console.error('Cache set failed:', e);
    }
  }

  async delete(key: string): Promise<void> {
    try {
      await this.kv.delete(key);
    } catch (e) {
      console.error('Cache delete failed:', e);
    }
  }

  static keys = {
    deals: {
      search: (keyword: string, category?: string, page?: number) =>
        `deals:search:${keyword}:${category || 'all'}:${page || 1}`,
      detail: (asin: string) => `deals:detail:${asin}`,
      hot: (category?: string) => `deals:hot:${category || 'all'}`,
    },
    categories: 'categories:list',
    user: {
      favorites: (userId: string) => `user:favorites:${userId}`,
      session: (token: string) => `user:session:${token}`,
    },
    config: {
      siteSettings: 'config:site-settings',
    },
  };
}
