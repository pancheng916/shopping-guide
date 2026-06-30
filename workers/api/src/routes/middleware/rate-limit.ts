import type { Env } from '../../types';

export interface RateLimitConfig {
  key: string;
  limit: number;
  windowSeconds: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

export async function checkRateLimit(
  env: Env,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const now = Date.now();
  const windowStart = Math.floor(now / (config.windowSeconds * 1000)) * (config.windowSeconds * 1000);
  const key = `admin:ratelimit:${config.key}:${windowStart}`;

  const current = await env.ADMIN_KV.get<number>(key, { type: 'json' });
  const count = current || 0;

  if (count >= config.limit) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: windowStart + config.windowSeconds * 1000,
    };
  }

  await env.ADMIN_KV.put(key, JSON.stringify(count + 1), {
    expirationTtl: config.windowSeconds,
  });

  return {
    allowed: true,
    remaining: config.limit - count - 1,
    resetAt: windowStart + config.windowSeconds * 1000,
  };
}
