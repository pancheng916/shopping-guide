# 运营后台 - 后端架构详细设计

> **文档版本**：v1.0
> **最后更新**：2026-06-29
> **相关文档**：[整体架构](../ARCHITECTURE.md)

---

## 一、技术架构

### 1.1 技术栈

| 层级 | 技术 | 版本/说明 |
|------|------|-----------|
| 运行时 | Cloudflare Workers | - |
| 语言 | TypeScript | 5.x |
| 数据库 | Cloudflare D1 | SQLite 兼容 |
| 缓存 | Cloudflare KV | 键值存储 |
| 认证 | JWT (HS256) | 无状态 Token |
| 权限模型 | RBAC | 基于角色的访问控制 |
| 部署 | Wrangler CLI | 3.x |

### 1.2 设计原则

1. **最小权限原则**：每个管理员角色只分配必要的权限
2. **审计追踪**：所有写操作必须记录操作日志
3. **防御性编程**：输入校验、SQL 注入防护、CSRF 防护
4. **高内聚低耦合**：业务逻辑与路由处理分离
5. **可扩展性**：权限、角色、模块可灵活扩展

### 1.3 项目目录结构

```
workers/api/src/
├── routes/
│   ├── admin/                    # 管理员 API 模块
│   │   ├── auth.ts               # 认证相关
│   │   ├── deals.ts              # 折扣管理
│   │   ├── products.ts           # 商品管理
│   │   ├── categories.ts         # 分类管理
│   │   ├── users.ts              # 用户管理
│   │   ├── comments.ts           # 评论管理
│   │   ├── stats.ts              # 数据统计
│   │   └── settings.ts           # 系统设置
│   ├── middleware/               # 中间件
│   │   ├── admin-auth.ts         # 管理员认证中间件
│   │   ├── admin-role.ts         # 角色权限中间件
│   │   └── rate-limit.ts         # 速率限制中间件
│   └── ... (现有用户端路由)
├── services/                     # 业务逻辑层（新增）
│   ├── admin/
│   │   ├── admin-auth.service.ts
│   │   ├── deal.service.ts
│   │   ├── product.service.ts
│   │   ├── category.service.ts
│   │   ├── user.service.ts
│   │   ├── comment.service.ts
│   │   ├── stats.service.ts
│   │   └── audit.service.ts
│   └── ...
├── db/                           # 数据库访问层（新增）
│   ├── schema.sql                # D1 表结构
│   ├── migrations/               # 迁移脚本
│   └── repositories/             # 数据访问对象
│       ├── admin.repository.ts
│       ├── role.repository.ts
│       └── audit-log.repository.ts
├── types/
│   ├── admin.ts                  # 管理员类型定义
│   └── ...
├── utils/
│   ├── jwt.ts                    # JWT 工具
│   ├── password.ts               # 密码哈希
│   └── permissions.ts            # 权限校验工具
└── index.ts                      # 入口（注册 admin 路由）
```

---

## 二、数据模型设计

### 2.1 数据库表设计（D1 / SQLite）

#### 2.1.1 管理员表 (admins)

```sql
CREATE TABLE admins (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  nickname TEXT,
  avatar_url TEXT,
  role_id INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',  -- active / disabled
  last_login_at TIMESTAMP,
  last_login_ip TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (role_id) REFERENCES roles(id)
);

CREATE INDEX idx_admins_username ON admins(username);
CREATE INDEX idx_admins_email ON admins(email);
CREATE INDEX idx_admins_role ON admins(role_id);
```

#### 2.1.2 角色表 (roles)

```sql
CREATE TABLE roles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL,          -- super_admin / operator / editor
  display_name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 预置角色
INSERT INTO roles (name, display_name, description) VALUES
  ('super_admin', '超级管理员', '拥有系统所有权限'),
  ('operator', '运营管理员', '折扣、商品、分类、评论、内容运营权限'),
  ('editor', '内容编辑', '折扣编辑、评论审核权限');
```

#### 2.1.3 权限表 (permissions)

```sql
CREATE TABLE permissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT UNIQUE NOT NULL,      -- 权限标识，如 deal:create
  name TEXT NOT NULL,             -- 权限名称
  module TEXT NOT NULL,           -- 所属模块
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_permissions_module ON permissions(module);
```

#### 2.1.4 角色权限关联表 (role_permissions)

```sql
CREATE TABLE role_permissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  role_id INTEGER NOT NULL,
  permission_id INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(role_id, permission_id),
  FOREIGN KEY (role_id) REFERENCES roles(id),
  FOREIGN KEY (permission_id) REFERENCES permissions(id)
);

CREATE INDEX idx_role_permissions_role ON role_permissions(role_id);
```

#### 2.1.5 操作日志表 (audit_logs)

```sql
CREATE TABLE audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  admin_id INTEGER NOT NULL,
  admin_username TEXT NOT NULL,
  action TEXT NOT NULL,           -- 操作类型：create / update / delete / login
  module TEXT NOT NULL,           -- 操作模块：deal / product / category / user ...
  target_id TEXT,                 -- 操作对象ID
  target_type TEXT,               -- 操作对象类型
  old_value TEXT,                 -- 变更前数据（JSON）
  new_value TEXT,                 -- 变更后数据（JSON）
  ip_address TEXT,
  user_agent TEXT,
  status TEXT DEFAULT 'success',  -- success / failed
  error_message TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_logs_admin ON audit_logs(admin_id);
CREATE INDEX idx_audit_logs_module ON audit_logs(module);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at);
```

#### 2.1.6 折扣表 (deals) - 扩展现有模型

```sql
-- 折扣主表（运营后台管理用，与用户端展示共用）
CREATE TABLE deals (
  id TEXT PRIMARY KEY,             -- 折扣ID，如 deal-xxx
  title TEXT NOT NULL,
  store TEXT NOT NULL,
  store_logo TEXT,
  category TEXT NOT NULL,
  sub_category TEXT,
  description TEXT,
  rich_content TEXT,               -- 富文本内容
  max_discount INTEGER DEFAULT 0,
  coupon_code TEXT,
  expires_at TIMESTAMP,
  status TEXT NOT NULL DEFAULT 'draft',  -- draft / published / offline
  is_featured INTEGER DEFAULT 0,   -- 是否置顶/推荐
  sort_order INTEGER DEFAULT 0,    -- 排序权重
  like_count INTEGER DEFAULT 0,
  comment_count INTEGER DEFAULT 0,
  favorite_count INTEGER DEFAULT 0,
  view_count INTEGER DEFAULT 0,
  created_by INTEGER,              -- 创建管理员ID
  updated_by INTEGER,              -- 最后更新管理员ID
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_deals_status ON deals(status);
CREATE INDEX idx_deals_category ON deals(category);
CREATE INDEX idx_deals_featured ON deals(is_featured);
CREATE INDEX idx_deals_created ON deals(created_at);
```

#### 2.1.7 商品表 (products)

```sql
CREATE TABLE products (
  id TEXT PRIMARY KEY,             -- 商品ID
  platform TEXT NOT NULL,          -- amazon / walmart / target
  platform_id TEXT,                -- 平台商品ID (ASIN等)
  deal_id TEXT,                    -- 所属折扣ID
  name TEXT NOT NULL,
  brand TEXT,
  image_url TEXT,
  original_price REAL,
  current_price REAL,
  savings_amount REAL,
  savings_percent REAL,
  affiliate_url TEXT,
  rating TEXT,
  review_count INTEGER,
  in_stock INTEGER DEFAULT 1,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_products_deal ON products(deal_id);
CREATE INDEX idx_products_platform ON products(platform);
```

#### 2.1.8 分类表 (categories)

```sql
CREATE TABLE categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  parent_id INTEGER DEFAULT 0,     -- 父分类ID，0为一级分类
  icon TEXT,
  description TEXT,
  sort_order INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active',    -- active / disabled
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_categories_parent ON categories(parent_id);
CREATE INDEX idx_categories_slug ON categories(slug);
CREATE INDEX idx_categories_sort ON categories(sort_order);
```

#### 2.1.9 站点配置表 (site_settings)

```sql
CREATE TABLE site_settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  key TEXT UNIQUE NOT NULL,
  value TEXT,
  type TEXT DEFAULT 'string',      -- string / number / boolean / json
  description TEXT,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### 2.1.10 敏感词表 (sensitive_words)

```sql
CREATE TABLE sensitive_words (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  word TEXT UNIQUE NOT NULL,
  category TEXT DEFAULT 'general', -- general / political / porn / ad
  replacement TEXT DEFAULT '***',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_sensitive_words_word ON sensitive_words(word);
```

### 2.2 与现有 KV 数据的关系

| 数据类型 | 现有存储 | 迁移方案 | 说明 |
|---------|---------|---------|------|
| 用户信息 | KV | 迁移到 D1 users 表 | 关系型查询更高效 |
| 折扣信息 | KV + PA API | 运营创建的存在 D1，PA API 同步的存 KV | 双轨制 |
| 评论 | KV | 迁移到 D1 comments 表 | 需要审核状态 |
| 收藏/点赞 | KV | 保留 KV | 读写简单，KV 足够 |
| 管理员 | 无 | D1 admins 表 | 新增 |
| 操作日志 | 无 | D1 audit_logs 表 | 新增 |

---

## 三、API 详细设计

### 3.1 通用约定

- **Base URL**：`https://api.flasktoken.com/api/admin`
- **认证方式**：Header 中携带 `Authorization: Bearer <token>`
- **请求格式**：`application/json`
- **响应格式**：

```json
{
  "code": 0,
  "message": "success",
  "data": {},
  "timestamp": 1234567890
}
```

- **分页参数**：`page`（页码，从1开始）、`pageSize`（每页条数）
- **分页响应**：

```json
{
  "code": 0,
  "data": {
    "items": [],
    "total": 100,
    "page": 1,
    "pageSize": 20
  }
}
```

- **错误码**：

| 错误码 | 说明 |
|--------|------|
| 0 | 成功 |
| 40001 | 参数错误 |
| 40101 | 未登录 / Token 无效 |
| 40102 | Token 已过期 |
| 40301 | 权限不足 |
| 40401 | 资源不存在 |
| 40901 | 资源已存在 |
| 50001 | 服务器内部错误 |

---

### 3.2 认证模块

#### 3.2.1 管理员登录

- **路由**：`POST /api/admin/auth/login`
- **权限**：公开（无需登录）
- **限流**：5次/分钟/IP

**请求体：**
```json
{
  "username": "admin",
  "password": "password123"
}
```

**响应：**
```json
{
  "code": 0,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "expiresIn": 86400,
    "admin": {
      "id": 1,
      "username": "admin",
      "email": "admin@flasktoken.com",
      "nickname": "超级管理员",
      "avatarUrl": "",
      "role": {
        "id": 1,
        "name": "super_admin",
        "displayName": "超级管理员"
      }
    }
  }
}
```

#### 3.2.2 管理员登出

- **路由**：`POST /api/admin/auth/logout`
- **权限**：已登录管理员

**响应：**
```json
{
  "code": 0,
  "message": "登出成功"
}
```

#### 3.2.3 获取当前管理员信息

- **路由**：`GET /api/admin/auth/profile`
- **权限**：已登录管理员

**响应：**
```json
{
  "code": 0,
  "data": {
    "id": 1,
    "username": "admin",
    "email": "admin@flasktoken.com",
    "nickname": "超级管理员",
    "avatarUrl": "",
    "role": {
      "id": 1,
      "name": "super_admin",
      "displayName": "超级管理员",
      "permissions": [
        "deal:read", "deal:create", "deal:update", "deal:delete",
        "product:read", "product:create",
        "user:read", "user:update",
        "comment:read", "comment:moderate",
        "settings:read", "settings:update",
        "admin:manage"
      ]
    },
    "lastLoginAt": "2026-06-29T10:00:00Z",
    "lastLoginIp": "192.168.1.1"
  }
}
```

#### 3.2.4 修改密码

- **路由**：`PUT /api/admin/auth/password`
- **权限**：已登录管理员

**请求体：**
```json
{
  "oldPassword": "oldpass123",
  "newPassword": "newpass456"
}
```

---

### 3.3 折扣管理模块

#### 3.3.1 折扣列表

- **路由**：`GET /api/admin/deals`
- **权限**：`deal:read`

**查询参数：**
| 参数 | 类型 | 说明 |
|------|------|------|
| keyword | string | 搜索关键词（标题/描述） |
| category | string | 分类 |
| status | string | 状态（draft/published/offline） |
| isFeatured | boolean | 是否推荐 |
| page | number | 页码 |
| pageSize | number | 每页条数 |
| sortBy | string | 排序字段（created_at/sort_order/view_count） |
| sortOrder | string | 排序方向（asc/desc） |

**响应：**
```json
{
  "code": 0,
  "data": {
    "items": [
      {
        "id": "deal-001",
        "title": "Prime Day 电子数码特惠",
        "store": "Amazon",
        "category": "electronics",
        "maxDiscount": 50,
        "status": "published",
        "isFeatured": true,
        "sortOrder": 1,
        "viewCount": 5000,
        "likeCount": 300,
        "commentCount": 50,
        "createdAt": "2026-06-29T00:00:00Z",
        "updatedAt": "2026-06-29T12:00:00Z"
      }
    ],
    "total": 100,
    "page": 1,
    "pageSize": 20
  }
}
```

#### 3.3.2 折扣详情

- **路由**：`GET /api/admin/deals/:id`
- **权限**：`deal:read`

**响应：** 返回完整的折扣信息（含商品列表、富文本内容）

#### 3.3.3 新增折扣

- **路由**：`POST /api/admin/deals`
- **权限**：`deal:create`

**请求体：**
```json
{
  "title": "Prime Day 电子数码特惠",
  "store": "Amazon",
  "storeLogo": "",
  "category": "electronics",
  "subCategory": "",
  "description": "活动描述...",
  "richContent": "<h3>活动介绍</h3>...",
  "maxDiscount": 50,
  "couponCode": "",
  "expiresAt": "2026-07-01T23:59:59Z",
  "status": "draft",
  "isFeatured": false,
  "sortOrder": 0,
  "tags": [
    { "name": "🔥 热卖", "type": "hot" },
    { "name": "50% OFF", "type": "discount" }
  ],
  "products": [
    {
      "id": "B0CQW8PQHL",
      "platform": "amazon",
      "platformId": "B0CQW8PQHL",
      "name": "Apple AirPods Pro",
      "brand": "Apple",
      "imageUrl": "...",
      "originalPrice": 249,
      "currentPrice": 189.99,
      "savingsPercent": 24,
      "affiliateUrl": "...",
      "sortOrder": 1
    }
  ]
}
```

#### 3.3.4 编辑折扣

- **路由**：`PUT /api/admin/deals/:id`
- **权限**：`deal:update`
- **说明**：请求体同新增，支持部分更新

#### 3.3.5 删除折扣

- **路由**：`DELETE /api/admin/deals/:id`
- **权限**：`deal:delete`

#### 3.3.6 更新折扣状态

- **路由**：`PATCH /api/admin/deals/:id/status`
- **权限**：`deal:update`

**请求体：**
```json
{
  "status": "published",   // draft / published / offline
  "isFeatured": true       // 可选，同时更新推荐状态
}
```

#### 3.3.7 批量操作

- **路由**：`POST /api/admin/deals/batch`
- **权限**：`deal:update`

**请求体：**
```json
{
  "action": "publish",      // publish / offline / delete / feature / unfeature
  "ids": ["deal-001", "deal-002"]
}
```

---

### 3.4 商品管理模块

#### 3.4.1 商品列表

- **路由**：`GET /api/admin/products`
- **权限**：`product:read`

**查询参数：** keyword, platform, dealId, category, page, pageSize

#### 3.4.2 商品详情

- **路由**：`GET /api/admin/products/:id`
- **权限**：`product:read`

#### 3.4.3 新增商品

- **路由**：`POST /api/admin/products`
- **权限**：`product:create`

#### 3.4.4 编辑商品

- **路由**：`PUT /api/admin/products/:id`
- **权限**：`product:update`

#### 3.4.5 删除商品

- **路由**：`DELETE /api/admin/products/:id`
- **权限**：`product:delete`

#### 3.4.6 关联折扣

- **路由**：`POST /api/admin/products/:id/link-deal`
- **权限**：`product:update`

**请求体：**
```json
{
  "dealId": "deal-001",
  "sortOrder": 1
}
```

---

### 3.5 分类管理模块

#### 3.5.1 分类树

- **路由**：`GET /api/admin/categories`
- **权限**：`category:read`

**响应：**
```json
{
  "code": 0,
  "data": [
    {
      "id": 1,
      "name": "电子数码",
      "slug": "electronics",
      "icon": "📱",
      "sortOrder": 1,
      "status": "active",
      "children": [
        {
          "id": 2,
          "name": "耳机音响",
          "slug": "audio",
          "parentId": 1,
          "sortOrder": 1,
          "children": []
        }
      ]
    }
  ]
}
```

#### 3.5.2 新增分类

- **路由**：`POST /api/admin/categories`
- **权限**：`category:create`

**请求体：**
```json
{
  "name": "电子数码",
  "slug": "electronics",
  "parentId": 0,
  "icon": "📱",
  "description": "电子数码类产品",
  "sortOrder": 1,
  "status": "active"
}
```

#### 3.5.3 编辑分类

- **路由**：`PUT /api/admin/categories/:id`
- **权限**：`category:update`

#### 3.5.4 删除分类

- **路由**：`DELETE /api/admin/categories/:id`
- **权限**：`category:delete`
- **说明**：有子分类或关联折扣时不允许删除

#### 3.5.5 分类排序

- **路由**：`POST /api/admin/categories/sort`
- **权限**：`category:update`

**请求体：**
```json
{
  "items": [
    { "id": 1, "sortOrder": 1, "parentId": 0 },
    { "id": 2, "sortOrder": 2, "parentId": 0 }
  ]
}
```

---

### 3.6 用户管理模块

#### 3.6.1 用户列表

- **路由**：`GET /api/admin/users`
- **权限**：`user:read`

**查询参数：** keyword, status, page, pageSize, sortBy, sortOrder

**响应：**
```json
{
  "code": 0,
  "data": {
    "items": [
      {
        "id": "user-001",
        "email": "user@example.com",
        "nickname": "测试用户",
        "avatarUrl": "",
        "status": "active",
        "favoriteCount": 10,
        "commentCount": 5,
        "createdAt": "2026-06-01T00:00:00Z",
        "lastActiveAt": "2026-06-29T00:00:00Z"
      }
    ],
    "total": 1000,
    "page": 1,
    "pageSize": 20
  }
}
```

#### 3.6.2 用户详情

- **路由**：`GET /api/admin/users/:id`
- **权限**：`user:read`

**响应：** 包含用户基本信息、收藏列表、评论记录、浏览记录

#### 3.6.3 启用/禁用用户

- **路由**：`PATCH /api/admin/users/:id/status`
- **权限**：`user:update`

**请求体：**
```json
{
  "status": "disabled",  // active / disabled
  "reason": "违规操作"    // 禁用原因（可选）
}
```

---

### 3.7 评论管理模块

#### 3.7.1 评论列表

- **路由**：`GET /api/admin/comments`
- **权限**：`comment:read`

**查询参数：**
| 参数 | 类型 | 说明 |
|------|------|------|
| dealId | string | 折扣ID |
| userId | string | 用户ID |
| status | string | 审核状态（pending/approved/rejected） |
| keyword | string | 搜索关键词 |
| page | number | 页码 |
| pageSize | number | 每页条数 |

#### 3.7.2 评论审核通过

- **路由**：`POST /api/admin/comments/:id/approve`
- **权限**：`comment:moderate`

#### 3.7.3 评论审核驳回

- **路由**：`POST /api/admin/comments/:id/reject`
- **权限**：`comment:moderate`

**请求体：**
```json
{
  "reason": "包含违规内容"
}
```

#### 3.7.4 删除评论

- **路由**：`DELETE /api/admin/comments/:id`
- **权限**：`comment:delete`

#### 3.7.5 批量审核

- **路由**：`POST /api/admin/comments/batch`
- **权限**：`comment:moderate`

**请求体：**
```json
{
  "action": "approve",    // approve / reject / delete
  "ids": ["comment-001", "comment-002"]
}
```

#### 3.7.6 敏感词管理

- **路由**：`GET /api/admin/sensitive-words`
- **权限**：`settings:read`

- **路由**：`POST /api/admin/sensitive-words`
- **权限**：`settings:update`

- **路由**：`DELETE /api/admin/sensitive-words/:id`
- **权限**：`settings:update`

---

### 3.8 数据统计模块

#### 3.8.1 数据概览

- **路由**：`GET /api/admin/stats/overview`
- **权限**：`stats:read`

**响应：**
```json
{
  "code": 0,
  "data": {
    "today": {
      "pv": 15000,
      "uv": 3000,
      "newUsers": 50,
      "newDeals": 5,
      "comments": 30,
      "favorites": 200
    },
    "total": {
      "users": 10000,
      "deals": 500,
      "comments": 3000,
      "products": 2000
    },
    "trend": {
      "pvGrowth": 12.5,
      "uvGrowth": 8.3,
      "userGrowth": 5.2
    }
  }
}
```

#### 3.8.2 趋势数据

- **路由**：`GET /api/admin/stats/trend`
- **权限**：`stats:read`

**查询参数：**
| 参数 | 类型 | 说明 |
|------|------|------|
| metric | string | 指标（pv/uv/newUsers/deals/comments） |
| range | string | 时间范围（7d/30d/90d） |
| groupBy | string | 分组（day/hour） |

**响应：**
```json
{
  "code": 0,
  "data": {
    "dates": ["2026-06-23", "2026-06-24", "..."],
    "values": [12000, 13500, 15000]
  }
}
```

#### 3.8.3 热门折扣排行

- **路由**：`GET /api/admin/stats/top-deals`
- **权限**：`stats:read`

**查询参数：** limit, range, sortBy (view/like/favorite/comment)

---

### 3.9 系统设置模块

#### 3.9.1 站点配置

- **路由**：`GET /api/admin/settings/site`
- **权限**：`settings:read`

**响应：**
```json
{
  "code": 0,
  "data": {
    "siteName": "今日折扣",
    "siteDescription": "面向海外华人的电商导购平台",
    "siteKeywords": "折扣,优惠券,亚马逊",
    "contactEmail": "contact@flasktoken.com",
    "icp": "",
    "enableComment": true,
    "commentNeedReview": true,
    "enableRegister": true
  }
}
```

- **路由**：`PUT /api/admin/settings/site`
- **权限**：`settings:update`

#### 3.9.2 管理员列表

- **路由**：`GET /api/admin/admins`
- **权限**：`admin:manage`

#### 3.9.3 新增管理员

- **路由**：`POST /api/admin/admins`
- **权限**：`admin:manage`

**请求体：**
```json
{
  "username": "editor01",
  "email": "editor01@flasktoken.com",
  "password": "temporary123",
  "nickname": "编辑01",
  "roleId": 3
}
```

#### 3.9.4 编辑管理员

- **路由**：`PUT /api/admin/admins/:id`
- **权限**：`admin:manage`

#### 3.9.5 删除管理员

- **路由**：`DELETE /api/admin/admins/:id`
- **权限**：`admin:manage`
- **说明**：不能删除自己，不能删除超级管理员

#### 3.9.6 角色列表

- **路由**：`GET /api/admin/roles`
- **权限**：`admin:manage`

#### 3.9.7 操作日志

- **路由**：`GET /api/admin/audit-logs`
- **权限**：`admin:manage`

**查询参数：** adminId, module, action, startDate, endDate, page, pageSize

#### 3.9.8 缓存管理

- **路由**：`POST /api/admin/cache/clear`
- **权限**：`settings:update`

**请求体：**
```json
{
  "type": "all",   // all / deals / categories / config
  "keys": []       // 指定清除的 key
}
```

---

## 四、权限设计

### 4.1 RBAC 权限模型

```
权限 (Permission)
  ↑ 多对多
角色 (Role)
  ↑ 多对一
管理员 (Admin)
```

### 4.2 权限清单

| 权限代码 | 权限名称 | 所属模块 | 说明 |
|---------|---------|---------|------|
| `deal:read` | 查看折扣 | 折扣管理 | 查看折扣列表、详情 |
| `deal:create` | 创建折扣 | 折扣管理 | 新增折扣 |
| `deal:update` | 编辑折扣 | 折扣管理 | 编辑、上下架、推荐 |
| `deal:delete` | 删除折扣 | 折扣管理 | 删除折扣 |
| `product:read` | 查看商品 | 商品管理 | 查看商品列表、详情 |
| `product:create` | 创建商品 | 商品管理 | 新增商品 |
| `product:update` | 编辑商品 | 商品管理 | 编辑商品、关联折扣 |
| `product:delete` | 删除商品 | 商品管理 | 删除商品 |
| `category:read` | 查看分类 | 分类管理 | 查看分类树 |
| `category:create` | 创建分类 | 分类管理 | 新增分类 |
| `category:update` | 编辑分类 | 分类管理 | 编辑、排序分类 |
| `category:delete` | 删除分类 | 分类管理 | 删除分类 |
| `user:read` | 查看用户 | 用户管理 | 查看用户列表、详情 |
| `user:update` | 管理用户 | 用户管理 | 禁用、启用用户 |
| `comment:read` | 查看评论 | 评论管理 | 查看评论列表 |
| `comment:moderate` | 评论审核 | 评论管理 | 通过、驳回评论 |
| `comment:delete` | 删除评论 | 评论管理 | 删除评论 |
| `stats:read` | 查看统计 | 数据统计 | 查看所有统计数据 |
| `content:manage` | 内容运营 | 内容运营 | Banner、推荐位、公告 |
| `settings:read` | 查看设置 | 系统设置 | 查看站点配置 |
| `settings:update` | 编辑设置 | 系统设置 | 修改站点配置、缓存管理 |
| `admin:manage` | 管理员管理 | 系统设置 | 管理员账号、角色、日志 |

### 4.3 角色权限矩阵

| 权限 | 超级管理员 | 运营管理员 | 内容编辑 |
|------|----------|----------|---------|
| deal:read | ✅ | ✅ | ✅ |
| deal:create | ✅ | ✅ | ✅ |
| deal:update | ✅ | ✅ | ✅ |
| deal:delete | ✅ | ✅ | ❌ |
| product:read | ✅ | ✅ | ✅ |
| product:create | ✅ | ✅ | ❌ |
| product:update | ✅ | ✅ | ❌ |
| product:delete | ✅ | ✅ | ❌ |
| category:read | ✅ | ✅ | ✅ |
| category:create | ✅ | ✅ | ❌ |
| category:update | ✅ | ✅ | ❌ |
| category:delete | ✅ | ✅ | ❌ |
| user:read | ✅ | ✅ | ❌ |
| user:update | ✅ | ✅ | ❌ |
| comment:read | ✅ | ✅ | ✅ |
| comment:moderate | ✅ | ✅ | ✅ |
| comment:delete | ✅ | ✅ | ❌ |
| stats:read | ✅ | ✅ | ❌ |
| content:manage | ✅ | ✅ | ❌ |
| settings:read | ✅ | ❌ | ❌ |
| settings:update | ✅ | ❌ | ❌ |
| admin:manage | ✅ | ❌ | ❌ |

---

## 五、安全设计

### 5.1 认证机制

#### 5.1.1 JWT Token 设计

```
Header:
{
  "alg": "HS256",
  "typ": "JWT"
}

Payload:
{
  "sub": "admin-1",           // 管理员ID
  "username": "admin",        // 用户名
  "role": "super_admin",      // 角色
  "iat": 1234567890,          // 签发时间
  "exp": 1234576490,          // 过期时间（24小时）
  "jti": "unique-token-id"    // Token唯一标识
}
```

**Token 有效期策略：**
- Access Token：24 小时
- Refresh Token：7 天（可选，暂不实现）
- 支持主动失效（将 jti 加入黑名单 KV）

#### 5.1.2 密码安全

- 使用 **bcrypt** 进行密码哈希（Cloudflare Workers 支持 Web Crypto）
- 密码强度要求：至少 8 位，包含字母和数字
- 密码错误 5 次锁定账号 30 分钟

### 5.2 中间件设计

#### 5.2.1 认证中间件 (admin-auth.ts)

```
请求 → 提取 Authorization Header
     → 验证 JWT 签名
     → 检查 Token 是否在黑名单
     → 查询管理员信息和角色权限
     → 挂载到 ctx.state.admin
     → 继续执行
```

#### 5.2.2 权限中间件 (admin-role.ts)

```
验证所需权限 → 检查 ctx.state.admin.role.permissions
            → 有权限 → 继续
            → 无权限 → 返回 403
```

#### 5.2.3 速率限制中间件 (rate-limit.ts)

- 登录接口：5 次/分钟/IP
- 写操作接口：60 次/分钟/管理员
- 读操作接口：300 次/分钟/管理员
- 使用 KV 存储限流计数

### 5.3 操作审计

**审计日志记录规则：**
- 所有写操作（POST/PUT/PATCH/DELETE）必须记录
- 登录/登出必须记录
- 敏感操作（修改密码、删除数据）记录详细的新旧值
- 读操作不记录（除访问统计外）

**审计日志内容：**
- 操作管理员、操作时间、IP 地址
- 操作类型、操作模块、操作对象
- 变更前数据、变更后数据（JSON 格式）
- 操作结果（成功/失败）、错误信息

### 5.4 输入安全

- **SQL 注入防护**：使用参数化查询（D1 预编译语句）
- **XSS 防护**：富文本内容使用白名单过滤
- **CSRF 防护**：验证 Referer/Origin Header
- **输入校验**：所有接口参数进行类型、长度、格式校验

### 5.5 Cloudflare Access 集成（可选）

推荐在 Cloudflare 层面再加一层保护：

1. 启用 Cloudflare Zero Trust → Access
2. 配置 `admin.flasktoken.com` 受 Access 保护
3. 支持邮箱验证码、Google SSO 等登录方式
4. 实现双重认证：Access SSO + 后台账号密码

---

## 六、缓存策略

### 6.1 缓存层级

```
┌─────────────────────────┐
│  Level 1: CDN 缓存       │  静态资源、API响应缓存
├─────────────────────────┤
│  Level 2: KV 缓存        │  热点数据、配置、Token黑名单
├─────────────────────────┤
│  Level 3: D1 数据库      │  持久化存储
└─────────────────────────┘
```

### 6.2 缓存设计

| 数据 | 缓存位置 | TTL | 失效策略 |
|------|---------|-----|---------|
| 站点配置 | KV | 1 小时 | 修改后主动失效 |
| 分类树 | KV | 30 分钟 | 修改后主动失效 |
| 折扣详情（用户端） | KV | 15 分钟 | 编辑后主动失效 |
| 折扣列表（用户端） | KV | 5 分钟 | 新增/编辑后按分页失效 |
| Token 黑名单 | KV | Token 剩余有效期 | 自动过期 |
| 限流计数 | KV | 1 分钟 | 自动过期 |
| 管理员信息 | 内存（请求级） | 请求周期 | 每次请求刷新 |

### 6.3 缓存 Key 设计

```
admin:site-settings              # 站点配置
admin:categories:tree           # 分类树
admin:deals:detail:{id}         # 折扣详情
admin:deals:list:{hash}         # 折扣列表（参数hash）
admin:token:blacklist:{jti}     # Token黑名单
admin:ratelimit:{ip}:{api}      # 限流计数
```

### 6.4 缓存失效机制

- **主动失效**：数据修改后立即删除对应缓存 Key
- **被动失效**：TTL 到期自动失效
- **批量失效**：如折扣列表缓存，可按分类维度批量失效

---

## 七、部署方案

### 7.1 环境配置

#### wrangler.toml 扩展配置

```toml
# 现有配置不变，新增以下内容

[[d1_databases]]
binding = "DB"
database_name = "shopping-guide-db"
database_id = "<your-database-id>"

[[kv_namespaces]]
binding = "ADMIN_KV"
id = "admin-kv"
preview_id = "admin-kv-preview"

[vars]
ADMIN_JWT_SECRET = ""
ADMIN_TOKEN_EXPIRES_IN = "86400"
```

#### 环境变量

| 变量 | 说明 | 示例 |
|------|------|------|
| ADMIN_JWT_SECRET | JWT 签名密钥 | 随机字符串（至少 32 位） |
| ADMIN_TOKEN_EXPIRES_IN | Token 有效期（秒） | 86400 |
| ADMIN_PASSWORD_PEPPER | 密码哈希附加盐 | 随机字符串 |

### 7.2 D1 数据库初始化

```bash
# 创建数据库
wrangler d1 create shopping-guide-db

# 执行迁移
wrangler d1 execute shopping-guide-db --file=./workers/api/src/db/schema.sql

# 本地开发
wrangler d1 execute shopping-guide-db --local --file=./workers/api/src/db/schema.sql
```

### 7.3 初始化超级管理员

部署后首次初始化超级管理员账号：

```bash
# 使用 wrangler 执行 SQL 插入初始管理员
wrangler d1 execute shopping-guide-db --command="INSERT INTO admins (username, email, password_hash, role_id) VALUES ('admin', 'admin@flasktoken.com', '<bcrypt_hash>', 1)"
```

或者提供一个初始化脚本：
```bash
pnpm run db:seed
```

### 7.4 域名与 DNS 配置

| 域名 | CNAME 目标 | 代理状态 |
|------|-----------|---------|
| `admin.flasktoken.com` | `<pages-project>.pages.dev` | 橙色云朵（开启代理） |
| `api.flasktoken.com` | 自定义域（Worker） | 橙色云朵（开启代理） |

**配置步骤：**
1. Cloudflare Pages 创建 `shopping-guide-admin` 项目
2. 绑定自定义域 `admin.flasktoken.com`
3. Worker 绑定自定义域 `api.flasktoken.com`
4. （可选）配置 Cloudflare Access 保护 `admin.flasktoken.com`

### 7.5 部署命令

```bash
# 部署 API Worker（包含 admin 路由）
pnpm run deploy:api

# 部署运营后台前端
cd apps/admin
pnpm build
wrangler pages deploy .next
```

### 7.6 CI/CD 建议

```yaml
# 示例：GitHub Actions
name: Deploy Admin
on:
  push:
    branches: [main]
    paths:
      - 'apps/admin/**'
      - 'packages/shared-types/**'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - run: pnpm install
      - run: pnpm build:admin
      - uses: cloudflare/pages-action@v1
        with:
          apiToken: ${{ secrets.CF_API_TOKEN }}
          accountId: ${{ secrets.CF_ACCOUNT_ID }}
          projectName: shopping-guide-admin
          directory: apps/admin/.next
```

---

## 八、与现有系统的集成点

### 8.1 用户端数据复用

| 数据 | 用户端读取 | 管理后台写入 | 同步机制 |
|------|-----------|-------------|---------|
| 折扣信息 | KV 缓存 / D1 | D1 | 写 D1 → 失效 KV 缓存 |
| 分类信息 | KV 缓存 / D1 | D1 | 写 D1 → 失效 KV 缓存 |
| 商品信息 | KV 缓存 / D1 | D1 | 写 D1 → 失效 KV 缓存 |
| 评论 | KV → D1 | D1 | 统一存 D1 |
| 用户 | KV → D1 | D1 | 统一存 D1 |
| 收藏/点赞 | KV | KV | 保持不变 |

### 8.2 现有 API 兼容性

- 用户端 API（`/api/deals`、`/api/categories` 等）保持不变
- 管理后台 API 使用 `/api/admin/*` 前缀，完全隔离
- 底层逐步从 KV 迁移到 D1，但用户端 API 响应格式保持不变

### 8.3 共享代码

- `@shared/types` 包新增管理员相关类型
- Worker 内的工具函数（JWT、密码哈希等）可复用
- 数据访问层分离，用户端和管理端各自调用

---

## 九、性能优化建议

### 9.1 数据库优化

- 为常用查询字段建立索引
- 分页查询使用 LIMIT + OFFSET，大数据量考虑游标分页
- 复杂查询使用预编译语句
- 定期 VACUUM / ANALYZE 优化数据库

### 9.2 缓存优化

- 热点数据多层缓存（CDN + KV + D1）
- 管理后台列表页适当缓存（1-5分钟）
- 配置类数据长缓存 + 主动失效

### 9.3 Worker 优化

- 减少冷启动：保持使用频率
- 请求批处理：减少 D1 查询次数
- 异步操作：审计日志等非关键路径可延迟写入

---

## 十、附录

### 10.1 术语表

| 术语 | 说明 |
|------|------|
| RBAC | Role-Based Access Control，基于角色的访问控制 |
| D1 | Cloudflare 的 Serverless SQL 数据库（SQLite） |
| KV | Cloudflare 的键值存储 |
| JWT | JSON Web Token，无状态认证令牌 |
| Audit Log | 审计日志，记录操作历史 |

### 10.2 参考资源

- [Cloudflare D1 文档](https://developers.cloudflare.com/d1/)
- [Cloudflare Workers 文档](https://developers.cloudflare.com/workers/)
- [Cloudflare Access 文档](https://developers.cloudflare.com/cloudflare-one/applications/configure-apps/self-hosted-apps/)
- [JWT 最佳实践](https://jwt.io/introduction/)

### 10.3 变更记录

| 版本 | 日期 | 变更内容 |
|------|------|---------|
| v1.0 | 2026-06-29 | 初始版本，完成整体设计 |
