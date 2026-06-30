import type { Env } from '../types';
import { handleDealsList } from './deals';

export async function handleSearchSuggest(
  request: Request,
  env: Env
): Promise<Response> {
  const url = new URL(request.url);
  const keyword = url.searchParams.get('keyword') || '';

  if (!keyword || keyword.length < 2) {
    return Response.json({ suggestions: [] });
  }

  const suggestions = [
    `${keyword} 折扣`,
    `${keyword} coupon`,
    `${keyword} 促销`,
    `${keyword} deal`,
    `${keyword} 便宜`,
  ];

  return Response.json({ suggestions, keyword });
}

export async function handleSearch(
  request: Request,
  env: Env
): Promise<Response> {
  return handleDealsList(request, env);
}
