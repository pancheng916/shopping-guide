import { useAuthStore } from '@/store/auth-store';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8787';

function getAuthHeaders(): Record<string, string> {
  if (typeof window !== 'undefined') {
    const token = useAuthStore.getState().token;
    if (token) {
      return { Authorization: `Bearer ${token}` };
    }
  }
  return {};
}

export async function fetchApi<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const authHeaders = getAuthHeaders();
  const fullUrl = path.startsWith('http') ? path : `${API_BASE_URL}/api${path.startsWith('/') ? path : '/' + path}`;
  const response = await fetch(fullUrl, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders,
      ...options?.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`API Error: ${response.status}`);
  }

  return response.json();
}

export const api = {
  deals: {
    list: (params: {
      keyword?: string;
      category?: string;
      minDiscount?: number;
      page?: number;
    }) => {
      const searchParams = new URLSearchParams();
      if (params.keyword) searchParams.set('keyword', params.keyword);
      if (params.category) searchParams.set('category', params.category);
      if (params.minDiscount) searchParams.set('minDiscount', String(params.minDiscount));
      if (params.page) searchParams.set('page', String(params.page));
      return fetchApi(`/deals?${searchParams.toString()}`);
    },
    detail: (id: string) => fetchApi(`/deals/${id}`),
  },
  categories: {
    list: () => fetchApi('/categories'),
  },
  search: {
    suggest: (keyword: string) => fetchApi(`/search/suggest?keyword=${encodeURIComponent(keyword)}`),
  },
  user: {
    register: (data: { email: string; password: string; nickname: string }) =>
      fetchApi('/user/register', { method: 'POST', body: JSON.stringify(data) }),
    login: (data: { email: string; password: string }) =>
      fetchApi('/user/login', { method: 'POST', body: JSON.stringify(data) }),
    profile: () => fetchApi('/user/profile'),
  },
  like: {
    toggle: (dealId: string) =>
      fetchApi('/like/toggle', { method: 'POST', body: JSON.stringify({ dealId }) }),
    status: (dealId: string) => fetchApi(`/like/status?dealId=${encodeURIComponent(dealId)}`),
  },
  favorite: {
    toggle: (data: {
      dealId: string;
      dealTitle: string;
      dealImage: string;
      dealPrice: number;
      dealDiscount: number;
    }) =>
      fetchApi('/favorite/toggle', { method: 'POST', body: JSON.stringify(data) }),
    status: (dealId: string) => fetchApi(`/favorite/status?dealId=${encodeURIComponent(dealId)}`),
    list: () => fetchApi('/favorite/list'),
  },
  comments: {
    list: (dealId: string, page = 1, pageSize = 20) =>
      fetchApi(`/comments?dealId=${encodeURIComponent(dealId)}&page=${page}&pageSize=${pageSize}`),
    add: (data: { dealId: string; content: string; userName: string; userAvatar: string }) =>
      fetchApi('/comments', { method: 'POST', body: JSON.stringify(data) }),
  },
};
