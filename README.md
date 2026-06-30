# 今日折扣 - Shopping Guide

面向海外华人的电商导购平台，基于 Cloudflare 全栈 Serverless 架构。包含用户端站点、运营管理后台和 API 服务。

## 项目结构

```
shopping-guide/
├── apps/
│   ├── web/                    # 前端 Next.js 应用（用户端）
│   └── admin/                  # ⭐ 运营后台 Next.js 应用
├── workers/
│   └── api/                    # Cloudflare Workers API
│       └── src/
│           ├── routes/
│           │   ├── admin/      # 运营后台 API
│           │   ├── middleware/ # 中间件
│           │   └── ...         # 用户端 API
│           ├── db/             # D1 数据库 schema / seed
│           ├── services/       # 业务服务层
│           └── utils/          # 工具函数
├── packages/
│   └── shared-types/           # 共享 TypeScript 类型
│       └── src/
│           ├── admin.ts        # 管理员类型
│           └── index.ts
├── docs/
│   └── admin-backend.md        # 运营后台后端架构文档
├── ARCHITECTURE.md             # 整体架构文档
└── package.json                # 根 package (monorepo)
```

## 技术栈

### 用户端前端
- Next.js 14 (App Router)
- React 18
- TypeScript
- Tailwind CSS
- Zustand (状态管理)
- TanStack Query (数据获取)

### 运营管理后台
- 前端：Next.js 14 + Shadcn UI 风格组件 + Recharts
- 后端：Cloudflare Workers + Hono
- 数据库：Cloudflare D1 (SQLite)
- 缓存：Cloudflare KV
- 认证：JWT + RBAC 权限模型

### 后端 (Cloudflare Workers)
- TypeScript
- Cloudflare Workers
- Hono（管理端路由）
- Cloudflare KV (缓存)
- Cloudflare D1 (关系型数据库)
- Amazon PA API 5.0 (电商数据)

## 域名规划（flasktoken.com）

| 用途 | 域名 | 部署方式 |
|------|------|---------|
| 用户端主站 | `flasktoken.com` / `www.flasktoken.com` | Cloudflare Pages |
| 运营后台 | `admin.flasktoken.com` | Cloudflare Pages（独立项目） |
| API 服务 | `api.flasktoken.com` | Cloudflare Workers |

## 快速开始

### 前置要求
- Node.js 18+
- pnpm 9+
- Cloudflare 账号 (部署用)
- Amazon Associates 账号 (电商数据)

### 安装依赖

```bash
pnpm install
```

### 开发

#### 一键启动所有服务
```bash
pnpm dev:all
```
- 用户端：`http://localhost:3000`
- 运营后台：`http://localhost:3001`
- API：`http://localhost:8787`

#### 单独启动

**启动 API Worker**
```bash
cd workers/api
cp .dev.vars.example .dev.vars  # 配置环境变量
pnpm dev
```
API 将运行在 `http://localhost:8787`

**初始化本地数据库（首次开发）**
```bash
# 创建数据库表结构
pnpm db:init

# 插入种子数据（示例折扣、用户、评论、管理员）
pnpm db:seed

# 或者一条命令完成
pnpm db:setup
```

> **初始管理员账号**：用户名 `admin`，密码 `admin123456`
> 登录后请立即修改密码！

**启动用户端**
```bash
cd apps/web
cp .env.example .env.local
pnpm dev
```
用户端将运行在 `http://localhost:3000`

**启动运营后台**
```bash
cd apps/admin
cp .env.example .env.local
pnpm dev
```
运营后台将运行在 `http://localhost:3001`

### 部署

#### 部署 API 到 Cloudflare Workers
```bash
cd workers/api
pnpm deploy
```

#### 部署用户端到 Cloudflare Pages
1. 将项目推送到 GitHub
2. 在 Cloudflare Pages 中连接仓库
3. 构建命令：`pnpm build:web`
4. 输出目录：`apps/web/.next`

#### 部署运营后台到 Cloudflare Pages
1. 在 Cloudflare Pages 中创建新项目 `shopping-guide-admin`
2. 构建命令：`pnpm build:admin`
3. 输出目录：`apps/admin/.next`
4. 绑定自定义域 `admin.flasktoken.com`

#### 初始化生产环境数据库
```bash
# 创建 D1 数据库
wrangler d1 create shopping-guide-db

# 执行 schema
wrangler d1 execute shopping-guide-db --file=./workers/api/src/db/schema.sql

# 插入种子数据（可选）
wrangler d1 execute shopping-guide-db --file=./workers/api/src/db/seed.sql
```

## 环境变量

### 用户端 (apps/web/.env.local)
| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| NEXT_PUBLIC_API_BASE_URL | API 基础地址 | http://localhost:8787 |

### 运营后台 (apps/admin/.env.local)
| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| NEXT_PUBLIC_API_BASE_URL | API 基础地址 | http://localhost:8787 |

### API Worker (workers/api/.dev.vars)
| 变量名 | 说明 |
|--------|------|
| AMAZON_ACCESS_KEY | Amazon PA API Access Key |
| AMAZON_SECRET_KEY | Amazon PA API Secret Key |
| AMAZON_PARTNER_TAG | Amazon Associate Tag |
| AMAZON_REGION | Amazon API 区域 |
| AMAZON_HOST | Amazon API 域名 |
| ADMIN_JWT_SECRET | 管理员 JWT 签名密钥（至少32位随机字符串） |
| ADMIN_TOKEN_EXPIRES_IN | 管理员 Token 有效期（秒），默认 86400 |
| ADMIN_PASSWORD_PEPPER | 密码哈希附加盐（随机字符串） |

## 运营后台 API

### 认证
- `POST /api/admin/auth/login` - 管理员登录
- `POST /api/admin/auth/logout` - 管理员登出
- `GET /api/admin/auth/profile` - 获取当前管理员信息
- `PUT /api/admin/auth/password` - 修改密码

### 折扣管理
- `GET /api/admin/deals` - 折扣列表（分页、筛选、搜索）
- `GET /api/admin/deals/:id` - 折扣详情
- `POST /api/admin/deals` - 新增折扣
- `PUT /api/admin/deals/:id` - 编辑折扣
- `PATCH /api/admin/deals/:id/status` - 更新状态/推荐
- `DELETE /api/admin/deals/:id` - 删除折扣
- `POST /api/admin/deals/batch` - 批量操作

### 商品管理
- `GET /api/admin/products` - 商品列表
- `GET /api/admin/products/:id` - 商品详情
- `POST /api/admin/products` - 新增商品
- `PUT /api/admin/products/:id` - 编辑商品
- `DELETE /api/admin/products/:id` - 删除商品
- `POST /api/admin/products/:id/link-deal` - 关联折扣

### 分类管理
- `GET /api/admin/categories` - 分类树
- `POST /api/admin/categories` - 新增分类
- `PUT /api/admin/categories/:id` - 编辑分类
- `DELETE /api/admin/categories/:id` - 删除分类
- `POST /api/admin/categories/sort` - 分类排序

### 用户管理
- `GET /api/admin/users` - 用户列表
- `GET /api/admin/users/:id` - 用户详情
- `PATCH /api/admin/users/:id/status` - 禁用/启用用户

### 评论管理
- `GET /api/admin/comments` - 评论列表
- `POST /api/admin/comments/:id/approve` - 审核通过
- `POST /api/admin/comments/:id/reject` - 审核驳回
- `DELETE /api/admin/comments/:id` - 删除评论
- `POST /api/admin/comments/batch` - 批量操作

### 数据统计
- `GET /api/admin/stats/overview` - 数据概览
- `GET /api/admin/stats/trend` - 趋势数据
- `GET /api/admin/stats/top-deals` - 热门折扣排行

### 系统设置
- `GET /api/admin/settings/site` - 获取站点配置
- `PUT /api/admin/settings/site` - 更新站点配置
- `GET /api/admin/settings/admins` - 管理员列表
- `POST /api/admin/settings/admins` - 新增管理员
- `PUT /api/admin/settings/admins/:id` - 编辑管理员
- `DELETE /api/admin/settings/admins/:id` - 删除管理员
- `GET /api/admin/settings/roles` - 角色列表
- `GET /api/admin/settings/audit-logs` - 操作日志
- `POST /api/admin/settings/cache/clear` - 清除缓存

## 主要功能

### 用户端
- ✅ 首页折扣信息流
- ✅ 多级分类导航
- ✅ 商品搜索
- ✅ 折扣详情页
- ✅ 热门折扣
- ✅ 用户收藏
- ✅ 消息通知
- ✅ 用户登录
- ✅ Amazon PA API 集成
- ✅ KV 缓存策略

### 运营后台（后端 API）
- ✅ 管理员登录/登出（JWT 认证）
- ✅ RBAC 权限模型（超级管理员/运营/编辑）
- ✅ 折扣管理（CRUD、上下架、推荐、批量操作）
- ✅ 商品管理（CRUD、关联折扣）
- ✅ 分类管理（CRUD、排序、树形结构）
- ✅ 用户管理（列表、详情、禁用/启用）
- ✅ 评论管理（审核、驳回、删除、批量操作）
- ✅ 数据统计（概览、趋势、排行榜）
- ✅ 系统设置（站点配置、管理员管理、操作日志）
- ✅ 操作审计日志
- ✅ 限流保护

### 运营后台（前端）
- ✅ 登录页面
- ✅ 布局框架（侧边栏 + 顶栏）
- ✅ 数据看板（统计卡片 + 趋势图 + 排行榜 + 最近评论）
- ✅ 折扣管理页面
- ✅ 商品管理页面
- ✅ 分类管理页面（树形表格）
- ✅ 用户管理页面
- ✅ 评论管理页面
- ✅ 系统设置页面（站点设置 + 管理员 + 操作日志）

## 权限模型（RBAC）

| 权限 | 超级管理员 | 运营管理员 | 内容编辑 |
|------|----------|----------|---------|
| 折扣 CRUD | ✅ | ✅ | ✅（无删除） |
| 商品 CRUD | ✅ | ✅ | ❌ |
| 分类 CRUD | ✅ | ✅ | ❌ |
| 用户管理 | ✅ | ✅ | ❌ |
| 评论审核 | ✅ | ✅ | ✅ |
| 数据统计 | ✅ | ✅ | ❌ |
| 系统设置 | ✅ | ❌ | ❌ |
| 管理员管理 | ✅ | ❌ | ❌ |

## 开发规范

### 代码风格
- 使用 TypeScript
- 遵循 ESLint 规则
- 组件使用函数式组件 + Hooks

### Git 提交规范
使用 Conventional Commits：
- `feat`: 新功能
- `fix`: 修复bug
- `docs`: 文档更新
- `style`: 样式调整
- `refactor`: 重构
- `perf`: 性能优化
- `test`: 测试相关

## 架构文档

- [整体架构](./ARCHITECTURE.md)
- [运营后台后端架构](./docs/admin-backend.md)

## 部署架构

```
flasktoken.com 域名
    │
    ├── 用户端 (Cloudflare Pages)   → flasktoken.com
    ├── 运营后台 (Cloudflare Pages) → admin.flasktoken.com
    └── API (Cloudflare Worker)     → api.flasktoken.com
                                        │
                                        ▼
                              共用数据存储 (KV / D1 / R2)
```

三个独立的 Cloudflare 项目，共用底层数据存储，通过 API 权限控制隔离。

## 许可证

MIT
