export interface Admin {
  id: number;
  username: string;
  email: string;
  nickname?: string;
  avatarUrl?: string;
  roleId: number;
  role?: AdminRole;
  status: 'active' | 'disabled';
  lastLoginAt?: string;
  lastLoginIp?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AdminRole {
  id: number;
  name: string;
  displayName: string;
  description?: string;
  permissions?: string[];
  createdAt?: string;
}

export interface AdminPermission {
  id: number;
  code: string;
  name: string;
  module: string;
  description?: string;
}

export interface AdminLoginResponse {
  token: string;
  expiresIn: number;
  admin: {
    id: number;
    username: string;
    email: string;
    nickname?: string;
    avatarUrl?: string;
    role: {
      id: number;
      name: string;
      displayName: string;
    };
  };
}

export interface AdminProfile {
  id: number;
  username: string;
  email: string;
  nickname?: string;
  avatarUrl?: string;
  role: {
    id: number;
    name: string;
    displayName: string;
    permissions: string[];
  };
  lastLoginAt?: string;
  lastLoginIp?: string;
}

export interface AuditLog {
  id: number;
  adminId: number;
  adminUsername: string;
  action: string;
  module: string;
  targetId?: string;
  targetType?: string;
  oldValue?: string;
  newValue?: string;
  ipAddress?: string;
  userAgent?: string;
  status: 'success' | 'failed';
  errorMessage?: string;
  createdAt: string;
}

export interface AdminListParams {
  keyword?: string;
  roleId?: number;
  status?: string;
  page?: number;
  pageSize?: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ApiResponse<T = unknown> {
  code: number;
  message: string;
  data?: T;
  timestamp: number;
}
