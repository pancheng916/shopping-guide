const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || ''
const ADMIN_PREFIX = '/api/admin'

function getToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('admin_token')
}

function removeToken(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem('admin_token')
}

async function request<T = any>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken()
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  }
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }
  
  const response = await fetch(`${BASE_URL}${ADMIN_PREFIX}${url}`, {
    ...options,
    headers,
  })
  
  if (response.status === 401) {
    removeToken()
    if (typeof window !== 'undefined' && !url.includes('/auth/login')) {
      window.location.href = '/login'
    }
  }
  
  const contentType = response.headers.get('content-type')
  let data: any
  
  if (contentType && contentType.includes('application/json')) {
    data = await response.json()
  } else {
    const text = await response.text()
    if (!response.ok) {
      throw new Error(`请求失败 (${response.status})：服务器未返回有效数据`)
    }
    try {
      data = JSON.parse(text)
    } catch {
      throw new Error(`请求失败：响应格式错误`)
    }
  }
  
  if (!response.ok) {
    throw new Error(data?.message || data?.error || `HTTP error! status: ${response.status}`)
  }
  
  return data?.data ?? data
}

export const authApi = {
  login: (data: { username: string; password: string }) =>
    request<{ token: string; admin: any }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  
  logout: () =>
    request('/auth/logout', {
      method: 'POST',
    }),
  
  getProfile: () =>
    request<any>('/auth/profile'),
}

export const dealApi = {
  getDeals: (params?: Record<string, any>) => {
    const query = params ? new URLSearchParams(params).toString() : ''
    return request<any>(`/deals${query ? `?${query}` : ''}`)
  },
  
  getDeal: (id: string) =>
    request<any>(`/deals/${id}`),
  
  createDeal: (data: any) =>
    request<any>('/deals', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  
  updateDeal: (id: string, data: any) =>
    request<any>(`/deals/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  
  deleteDeal: (id: string) =>
    request<any>(`/deals/${id}`, {
      method: 'DELETE',
    }),
  
  updateDealStatus: (id: string, status: string) =>
    request<any>(`/deals/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),
  
  batchDeal: (data: { ids: string[]; action: string; [key: string]: any }) =>
    request<any>('/deals/batch', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
}

export const categoryApi = {
  getCategories: (params?: Record<string, any>) => {
    const query = params ? new URLSearchParams(params).toString() : ''
    return request<any>(`/categories${query ? `?${query}` : ''}`)
  },
  
  createCategory: (data: any) =>
    request<any>('/categories', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  
  updateCategory: (id: string, data: any) =>
    request<any>(`/categories/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  
  deleteCategory: (id: string) =>
    request<any>(`/categories/${id}`, {
      method: 'DELETE',
    }),
  
  sortCategories: (data: { id: string; sort: number }[]) =>
    request<any>('/categories/sort', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
}

export const commentApi = {
  getComments: (params?: Record<string, any>) => {
    const query = params ? new URLSearchParams(params).toString() : ''
    return request<any>(`/comments${query ? `?${query}` : ''}`)
  },
  
  approveComment: (id: string) =>
    request<any>(`/comments/${id}/approve`, {
      method: 'POST',
    }),
  
  rejectComment: (id: string) =>
    request<any>(`/comments/${id}/reject`, {
      method: 'POST',
    }),
  
  deleteComment: (id: string) =>
    request<any>(`/comments/${id}`, {
      method: 'DELETE',
    }),
  
  batchComment: (data: { ids: string[]; action: string }) =>
    request<any>('/comments/batch', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
}

export const productApi = {
  getProducts: (params?: Record<string, any>) => {
    const query = params ? new URLSearchParams(params).toString() : ''
    return request<any>(`/products${query ? `?${query}` : ''}`)
  },
  
  getProduct: (id: string) =>
    request<any>(`/products/${id}`),
  
  createProduct: (data: any) =>
    request<any>('/products', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  
  updateProduct: (id: string, data: any) =>
    request<any>(`/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  
  deleteProduct: (id: string) =>
    request<any>(`/products/${id}`, {
      method: 'DELETE',
    }),
}

// 折扣关联商品API
export const dealProductsApi = {
  getProducts: (dealId: string) =>
    request<any[]>(`/deals/${dealId}/products`),
  
  linkProducts: (dealId: string, productIds: string[]) =>
    request<any>(`/deals/${dealId}/products`, {
      method: 'POST',
      body: JSON.stringify({ productIds }),
    }),
  
  unlinkProduct: (dealId: string, productId: string) =>
    request<any>(`/deals/${dealId}/products/${productId}`, {
      method: 'DELETE',
    }),
}

export const userApi = {
  getUsers: (params?: Record<string, any>) => {
    const query = params ? new URLSearchParams(params).toString() : ''
    return request<any>(`/users${query ? `?${query}` : ''}`)
  },
  
  getUser: (id: string) =>
    request<any>(`/users/${id}`),
  
  updateUserStatus: (id: string, status: string) =>
    request<any>(`/users/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),
}

export const statsApi = {
  getStatsOverview: () =>
    request<any>('/stats/overview'),
  
  getStatsTrend: (params?: Record<string, any>) => {
    const query = params ? new URLSearchParams(params).toString() : ''
    return request<any>(`/stats/trend${query ? `?${query}` : ''}`)
  },
  
  getTopDeals: (params?: Record<string, any>) => {
    const query = params ? new URLSearchParams(params).toString() : ''
    return request<any>(`/stats/top-deals${query ? `?${query}` : ''}`)
  },

  getRecentComments: (params?: Record<string, any>) => {
    const query = params ? new URLSearchParams(params).toString() : ''
    return request<any>(`/stats/recent-comments${query ? `?${query}` : ''}`)
  },
}

export const settingsApi = {
  getSiteSettings: () =>
    request<any>('/settings/site'),
  
  updateSiteSettings: (data: any) =>
    request<any>('/settings/site', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  
  getAdmins: (params?: Record<string, any>) => {
    const query = params ? new URLSearchParams(params).toString() : ''
    return request<any>(`/settings/admins${query ? `?${query}` : ''}`)
  },
  
  createAdmin: (data: any) =>
    request<any>('/settings/admins', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  
  updateAdmin: (id: string, data: any) =>
    request<any>(`/settings/admins/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  
  deleteAdmin: (id: string) =>
    request<any>(`/settings/admins/${id}`, {
      method: 'DELETE',
    }),
  
  getRoles: () =>
    request<any>('/settings/roles'),
  
  getAuditLogs: (params?: Record<string, any>) => {
    const query = params ? new URLSearchParams(params).toString() : ''
    return request<any>(`/settings/audit-logs${query ? `?${query}` : ''}`)
  },
  
  clearCache: () =>
    request<any>('/settings/cache/clear', {
      method: 'POST',
    }),
}

export default {
  auth: authApi,
  deal: dealApi,
  category: categoryApi,
  comment: commentApi,
  product: productApi,
  user: userApi,
  stats: statsApi,
  settings: settingsApi,
}
