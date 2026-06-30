# 今日折扣 - Cloudflare 用户端架构规划

## 一、产品概述

**今日折扣** 是一款面向海外华人的电商导购产品，核心功能包括折扣信息聚合、商品分类浏览、搜索推荐、用户互动等。产品形态以移动端为主，兼顾PC端。

### 核心功能模块
- 首页信息流（折扣卡片Feed）
- 多级分类导航
- 商品/折扣搜索
- 热门折扣 & 攻略内容
- 用户系统（登录、收藏、消息通知）
- 商品详情页
- 互动功能（点赞、评论、分享）
- 导购跳转 & 优惠券
- 移动端App引导

---

## 二、整体架构设计

### 架构图（更新版）

```
┌────────────────────────────────────────────────────────────────────────┐
│                        Cloudflare CDN                                   │
│              (全球加速 / DDoS防护 / WAF / 缓存 / TLS / 图片优化)         │
└────────────────────────────────────────────────────────────────────────┘
                                  │
         ┌────────────────────────┼────────────────────────┐
         │                        │                        │
         ▼                        ▼                        ▼
┌─────────────────┐        ┌─────────────────┐        ┌─────────────────┐
│     Pages       │        │    Workers      │        │   R2 + CDN      │
│     (前端)      │        │    (BFF层)      │        │   (静态资源)    │
└────────┬────────┘        └────────┬────────┘        └─────────────────┘
         │                         │
         │                 ┌────────┴────────┐
         │                 │                 │
         │                 ▼                 ▼
         │         ┌─────────────────┐ ┌─────────────────┐
         │         │   KV Store      │ │      D1         │
         │         │  (缓存/配置)    │ │   (关系库)      │
         │         └─────────────────┘ └─────────────────┘
         │                         │
         │                 ┌────────┴────────┐
         │                 │                 │
         │                 ▼                 ▼
         │         ┌─────────────────┐ ┌─────────────────┐
         │         │  Workers AI     │ │ 电商数据集成层   │
         │         │  (搜索/推荐)    │ │ (多平台API聚合) │
         │         └─────────────────┘ └────────┬────────┘
         │                                         │
         │                         ┌───────────────┼───────────────┐
         │                         │               │               │
         │                         ▼               ▼               ▼
         │                   ┌──────────┐   ┌──────────┐   ┌──────────┐
         │                   │  Amazon  │   │  Walmart │   │  Target  │
         │                   │   PA API │   │    API   │   │    API   │
         │                   └──────────┘   └──────────┘   └──────────┘
         │
         ▼
┌─────────────────┐
│  内容数据库     │
│ (攻略/UGC/运营) │
└─────────────────┘
```

---

## 三、技术选型详解

### 3.1 前端层 - Cloudflare Pages

**用途**：前端应用静态托管与SSR/ISR

**技术栈建议**：
- **框架**：Next.js 14+ (App Router) 或 Nuxt 3
  - 推荐 Next.js：生态成熟，SSR/ISR支持好，适合内容导购类产品
  - Pages 原生支持 Next.js 构建与部署
- **语言**：TypeScript
- **UI组件库**：Shadcn UI + Tailwind CSS（轻量、可定制、设计系统友好）
- **状态管理**：Zustand（轻量）+ TanStack Query（服务端状态）
- **包管理**：pnpm

**Pages 核心能力利用**：
| 功能 | 用途 |
|------|------|
| 静态站点托管 | 构建产物全球分发 |
| SSR/ISR | 商品详情页、分类页服务端渲染，利于SEO |
| Preview Deployments | 功能分支预览，便于产品验收 |
| 自动部署 | Git Push 触发自动构建部署 |

**页面路由规划**：
```
/                          # 首页（信息流）
/category/[categorySlug]   # 分类页（支持多级）
/deal/[dealId]             # 折扣详情页
/product/[productId]       # 商品详情页
/search?q=xxx              # 搜索结果页
/guides                    # 攻略列表
/guide/[guideId]           # 攻略详情页
/user/favorites            # 我的收藏
/user/notifications        # 消息通知
/login                      # 登录页
```

---

### 3.2 BFF层 - Cloudflare Workers

**用途**：后端 For 前端，边缘API网关

**核心职责**：
1. **API聚合**：聚合多个后端服务接口，减少前端请求数
2. **边缘缓存**：利用边缘节点缓存高频数据
3. **A/B测试**：基于地理位置/用户分群做边缘分流
4. **请求鉴权**：JWT验证、用户身份注入
5. **数据转换**：后端数据 → 前端所需格式

**Worker 路由设计**：
```
/api/deals              # GET - 折扣列表（分页、筛选）
/api/deals/[id]         # GET - 折扣详情
/api/deals/[id]/like    # POST - 点赞
/api/categories         # GET - 分类树
/api/search             # GET - 搜索
/api/products/[id]      # GET - 商品详情
/api/guides             # GET - 攻略列表
/api/guides/[id]        # GET - 攻略详情
/api/user/profile       # GET - 用户信息
/api/user/favorites     # GET/POST - 收藏
/api/comments           # GET/POST - 评论
```

**性能优化策略**：
- 使用 `Cache API` 在边缘缓存GET请求
- 使用 `KV` 缓存热点数据（如首页信息流）
- 设置合理的 `stale-while-revalidate` 策略

---

### 3.3 数据层

#### 3.3.1 Cloudflare KV

**用途**：高频读、低频写的数据存储与缓存

**适用场景**：
| 数据类型 | Key设计 | TTL |
|----------|---------|-----|
| 首页信息流缓存 | `feed:home:[page]` | 5min |
| 分类页缓存 | `feed:category:[slug]:[page]` | 10min |
| 热门商品 | `hot:products:[category]` | 15min |
| 配置数据 | `config:site-settings` | 1h |
| 用户会话 | `session:[token]` | 7d |
| 限流计数 | `rate-limit:[ip]:[api]` | 1min |

#### 3.3.2 Cloudflare D1 (SQLite)

**用途**：关系型数据存储（用户、评论、收藏等）

**核心表设计（用户端相关）**：

```sql
-- 用户表
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE,
  nickname TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 收藏表
CREATE TABLE favorites (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  deal_id TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, deal_id)
);

-- 评论表
CREATE TABLE comments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  deal_id TEXT NOT NULL,
  content TEXT NOT NULL,
  parent_id INTEGER,
  likes INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 消息通知表
CREATE TABLE notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  type TEXT NOT NULL, -- deal_update, comment_reply, system
  title TEXT NOT NULL,
  content TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

### 3.4 静态资源 - Cloudflare R2 + CDN

**用途**：商品图片、用户头像、攻略配图等静态资源存储

**优势**：
- 零出口流量费用（相比S3）
- 全球CDN加速
- 支持图片转换（Resize）

**目录结构**：
```
/
├── products/           # 商品图片
│   ├── [productId]/
│   │   ├── main.jpg
│   │   ├── 1.jpg
│   │   └── 2.jpg
├── users/              # 用户头像
│   └── [userId].jpg
├── guides/             # 攻略配图
│   └── [guideId]/
└── banners/            # 运营Banner
    └── home/
```

**图片优化策略**：
- 使用 Cloudflare Image Resizing 动态调整尺寸
- 自动转换为 WebP/AVIF 格式
- 根据设备DPR提供合适分辨率
- 懒加载 + 渐进式加载

---

### 3.5 电商数据集成层 - 亚马逊 PA API

**用途**：实时获取亚马逊商品信息、折扣数据，生成联盟推广链接

#### 3.5.1 Amazon PA API 5.0 集成

**核心功能**：
| 功能 | API方法 | 用途 |
|------|---------|------|
| 搜索商品 | `SearchItems` | 根据关键词/分类搜索折扣商品 |
| 获取详情 | `GetItems` | 获取单个商品的详细信息 |
| 生成推广链接 | `buildAffiliateUrl()` | 带Associate Tag的联盟链接 |

**API配额限制**：
| 限制项 | 限制值 | 应对策略 |
|--------|--------|---------|
| 请求频率 | 1次/秒 | 严格限速 + 请求队列 |
| 每日请求量 | 1万次/天 | 缓存 + 按需调用 |
| 单次返回条数 | 最大10条 | 分页 + 增量获取 |

**Worker中的实现示例**：
```typescript
// 电商数据集成 Worker 路由
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    // 搜索折扣商品
    if (path === '/api/deals' && request.method === 'GET') {
      const keyword = url.searchParams.get('keyword') ?? '';
      
      // 1. 检查KV缓存
      const cached = await env.DEALS_CACHE.get(`deals:${keyword}`);
      if (cached) {
        return new Response(cached, {
          headers: { 'Content-Type': 'application/json', 'X-Cache': 'HIT' }
        });
      }

      // 2. 调用亚马逊PA API（带限速）
      const deals = await searchDealsWithRateLimit({
        keywords: keyword,
        minDiscount: 10,
        itemCount: 20,
      });

      // 3. 缓存结果（5分钟）
      await env.DEALS_CACHE.put(`deals:${keyword}`, JSON.stringify(deals), { 
        expirationTtl: 300 
      });

      return new Response(JSON.stringify(deals), {
        headers: { 'Content-Type': 'application/json', 'X-Cache': 'MISS' }
      });
    }
  }
}
```

**AWS Signature V4 签名**：
- PA API 5.0 必须使用 AWS Signature V4 签名
- Worker中可直接使用crypto.subtle（Cloudflare Workers支持）
- 签名流程：Canonical Request → String to Sign → Signature

#### 3.5.2 多平台API扩展

**扩展规划**：
| 平台 | API | 优先级 | 特点 |
|------|-----|--------|------|
| Amazon | PA API 5.0 | P0 | 折扣数据最全，佣金率高 |
| Walmart | Open API | P1 | 美国第二大电商 |
| Target | Product API | P2 | 家庭/母婴类目强 |
| eBay | Browse API | P3 | 二手/拍卖特色 |

**统一数据抽象层**：
```typescript
interface UnifiedDealItem {
  id: string;              // 平台商品ID
  platform: 'amazon' | 'walmart' | 'target';
  asin?: string;           // Amazon ASIN
  title: string;
  brand: string;
  imageUrl: string;
  originalPrice: number;
  currentPrice: number;
  discountPercent: number;
  affiliateUrl: string;    // 联盟推广链接
  rating: number;
  reviewCount: number;
  category: string;
  detailUrl: string;       // 商品详情页
}
```

#### 3.5.3 联盟合规性

**亚马逊联盟政策要求**：
1. **信息披露**：页面必须明确标注"这是亚马逊联盟链接"
2. **推广声明**：不得暗示亚马逊为您推荐或认可
3. **价格时效**：不得显示过期价格，需标注价格更新时间
4. **跳转限制**：不得使用弹窗、自动下载等干扰用户行为

**原型中的体现**：
- 顶部信息栏："信息由用户或商家提供，核实后发布广告"
- 商品卡片中展示折扣百分比和价格
- 按钮文案："去购买" / "领券购买"

---

### 3.6 搜索推荐 - Cloudflare Workers AI

**用途**：站内搜索、智能推荐

**能力规划**：
1. **向量搜索**：使用 `bge-small-en-v1.5` 或中文嵌入模型
   - 商品标题/描述向量化
   - 语义搜索，支持模糊匹配
2. **智能推荐**：
   - 基于用户浏览历史的个性化推荐
   - 相似商品推荐
3. **搜索建议**：输入时实时联想

**实现方式**：
- 商品数据索引存在 KV 或 Vectorize（未来可用）
- Worker 中调用 AI 模型生成嵌入
- 相似度计算在边缘完成

---

### 3.7 安全层 - Cloudflare WAF / Zero Trust

**安全防护**：
| 功能 | 用途 |
|------|------|
| WAF 托管规则集 | 防SQL注入、XSS、爬虫 |
| 速率限制 | 防暴力破解、防刷接口 |
| Bot Management | 识别并管理爬虫流量 |
| DDoS 防护 | 网络层 + 应用层防护 |
| TLS 1.3 | 加密传输 |

**API安全**：
- 关键接口（点赞、评论、收藏）需要登录验证
- 使用 JWT + HTTP-only Cookie
- CSRF Token 防护

---

## 四、性能优化策略

### 4.1 前端性能
- **SSR/ISR**：首屏服务端渲染，提升TTFB与SEO
- **代码分割**：路由级别的代码分割
- **图片优化**：WebP/AVIF + 懒加载 + 响应式图片
- **预加载**：关键资源预加载，预测性预取
- **骨架屏**：加载态骨架屏提升感知体验

### 4.2 缓存策略（针对电商API优化）

**电商API特殊性**：
- 亚马逊PA API 有严格的调用频率限制（1次/秒）
- 需要 aggressive 的缓存策略来节省配额
- 商品价格/库存变化快，需要平衡实时性和配额

| 层级 | 缓存对象 | 缓存时间 | 刷新策略 |
|------|---------|----------|----------|
| 浏览器 | 静态资源(JS/CSS/图片) | 30天 | 文件名哈希 |
| CDN | 静态页面 | 5-15min | SWR |
| 边缘(KV) | 折扣列表（搜索结果） | 5-10min | TTL + 主动失效 |
| 边缘(KV) | 商品详情 | 15-30min | TTL（价格时效敏感） |
| 边缘(KV) | 商品详情（含ASIN） | 30-60min | TTL（ASIN不变） |
| 边缘(KV) | 用户会话 | 7天 | JWT过期 |
| 应用 | 组件状态 | 会话级 | TanStack Query |

**缓存Key设计**：
```
# 搜索结果缓存
deals:search:{keyword}:{category}:{page}    # TTL: 5min

# 商品详情缓存（按ASIN）
product:amazon:{asin}                        # TTL: 30min

# 热门商品缓存
hot:category:{categorySlug}                 # TTL: 15min

# 用户相关
user:favorites:{userId}                     # TTL: 5min
user:session:{token}                        # TTL: 7days
```

### 4.3 边缘计算优化
- 热门页面在边缘节点缓存HTML
- API响应边缘缓存，减少回源
- 基于地理位置的内容本地化（币种、语言）

---

## 五、多端适配策略

### 5.1 响应式设计
- **移动端优先**：375px 起步（iPhone SE）
- **平板适配**：768px
- **桌面端**：1200px+
- 参考原型中的 `@media` 断点设计

### 5.2 PWA 支持
- 离线浏览已加载的折扣信息
- 消息推送（Web Push）
- 添加到主屏幕
- 渐进式升级为App体验

### 5.3 App 引导
- 下载Banner（顶部/底部）
- 深度链接（Universal Link / App Link）
- Smart App Banner

---

## 六、SEO 优化

### 6.1 技术SEO
- SSR渲染所有内容页
- 结构化数据（JSON-LD）：商品、折扣、面包屑
- Sitemap 自动生成
- Canonical URL 处理
- hreflang 多语言支持（中/英）

### 6.2 内容SEO
- 分类页TDK优化
- 折扣详情页丰富的结构化数据
- 攻略内容页长尾关键词

---

## 七、监控与分析

### 7.1 Cloudflare Analytics
- 流量分析（PV/UV/地域）
- 缓存命中率
- 错误率监控
- 性能指标（LCP、FID、CLS）

### 7.2 前端监控
- Web Vitals 采集
- 错误上报
- 用户行为分析（可选第三方如Amplitude）

---

## 八、项目目录结构建议

```
shopping-guide/
├── apps/
│   └── web/                    # 前端应用 (Next.js)
│       ├── src/
│       │   ├── app/            # App Router 页面
│       │   ├── components/     # 通用组件
│       │   ├── features/       # 业务模块
│       │   │   ├── deals/      # 折扣模块
│       │   │   ├── products/   # 商品模块
│       │   │   ├── search/     # 搜索模块
│       │   │   └── user/       # 用户模块
│       │   ├── lib/            # 工具库
│       │   └── types/          # TypeScript 类型
│       ├── public/             # 静态资源
│       └── package.json
├── workers/
│   └── api/                    # BFF API Worker
│       ├── src/
│       │   ├── routes/         # 路由处理器
│       │   │   ├── deals.ts    # 折扣路由
│       │   │   ├── products.ts # 商品路由
│       │   │   ├── search.ts   # 搜索路由
│       │   │   └── user.ts     # 用户路由
│       │   ├── middleware/     # 中间件
│       │   ├── services/      # 业务逻辑
│       │   ├── integrations/   # 电商API集成 ⭐新增
│       │   │   ├── amazon.ts   # 亚马逊PA API
│       │   │   ├── walmart.ts  # Walmart API
│       │   │   └── types.ts    # 统一数据类型
│       │   ├── cache/          # 缓存管理 ⭐新增
│       │   └── index.ts
│       └── package.json
├── packages/
│   ├── shared-types/           # 共享类型定义
│   └── ui/                     # 共享UI组件库
├── db/
│   └── schema.sql              # D1 数据库 schema
├── scripts/
│   └── seed-deals.ts          # 种子数据脚本
├── wrangler.toml               # Workers 配置
└── package.json                # 根 package (monorepo)
```

---

## 九、分阶段实施建议

### 阶段一：MVP（最小可用产品）⭐电商核心
- [ ] 前端框架搭建 + Pages 部署
- [ ] 亚马逊PA API集成（搜索商品、获取详情、联盟链接）
- [ ] **KV缓存层搭建（API限流应对）**
- [ ] 首页折扣信息流（实时数据 + KV缓存）
- [ ] 分类导航页
- [ ] 折扣详情页（含联盟跳转）
- [ ] 搜索功能（基础关键字搜索 + PA API）
- [ ] R2 图片托管 + CDN + Image Resizing
- [ ] WAF 基础防护
- [ ] 联盟合规性实现（顶部声明、价格时效标注）

### 阶段二：用户系统
- [ ] 用户登录/注册（邮箱/第三方登录）
- [ ] 收藏功能（MySQL/D1）
- [ ] 评论功能（MySQL/D1）
- [ ] 消息通知（MySQL/D1）
- [ ] D1 数据库上线

### 阶段三：智能化 + 多平台扩展
- [ ] Workers AI 语义搜索（向量嵌入）
- [ ] 个性化推荐
- [ ] 搜索联想
- [ ] Walmart API 集成
- [ ] Target API 集成
- [ ] 统一数据抽象层（Multi-platform）
- [ ] A/B测试框架

### 阶段四：运营增强
- [ ] PWA 支持
- [ ] Web Push 推送
- [ ] 攻略内容模块
- [ ] 榜单功能
- [ ] 数据分析平台
- [ ] 运营后台

---

## 十、成本估算（参考）

### 10.1 Cloudflare 服务成本

| 服务 | 免费额度 | 预估月费用（10万UV） | 说明 |
|------|---------|---------------------|------|
| Pages | 500次构建/月，无限带宽 | $0 | 静态站点 |
| Workers | 10万次/天 | $0 - $5 | API调用（电商API聚合） |
| KV | 1GB存储，10万读/天 | $0 - $3 | 缓存电商数据 |
| D1 | 5GB存储，500万读/天 | $0 - $2 | 用户数据、评论 |
| R2 | 10GB存储，100万读/月 | $0 - $5 | 图片存储 |
| Workers AI | 10,000次/天 | $0 - $10 | 语义搜索 |
| WAF | 基础规则免费 | $0 - $20 | 安全防护 |
| **小计** | - | **$0 - $45** | 起步成本极低 |

### 10.2 第三方API成本

| 平台 | API费用 | 联盟佣金 | 说明 |
|------|---------|---------|------|
| Amazon PA API | 免费（需 Associates 账号） | 1-10% | 佣金率视类目 |
| Walmart API | 免费（需申请） | 2-5% | 佣金率视类目 |
| **预估月收入** | - | **$0 - $500** | 取决于转化率 |

> **注**：
> 1. Cloudflare 费用为粗略估算，实际根据使用量而定
> 2. 亚马逊 Associates 账号需要真实流量才能保持活跃
> 3. 联盟佣金是主要盈利模式，初期可能为0

---

## 十一、运营后台架构

### 11.1 概述

运营后台是面向运营人员的内容管理系统，独立于用户端站点部署，提供折扣管理、商品管理、用户管理、评论审核、数据统计等功能。

**设计原则：**
- 独立部署、独立域名，与用户端站点物理隔离
- 复用现有 Worker API 服务，新增 `/api/admin/*` 路由
- 共用 KV/D1 数据存储，通过权限控制实现逻辑隔离
- 多层安全防护：JWT 认证 + 权限校验 + Cloudflare Access

**技术栈：**
- 前端：Next.js 14 App Router + Shadcn UI + Tailwind CSS + TanStack Query
- 后端：Cloudflare Workers（复用现有 API Worker）
- 数据库：Cloudflare D1（关系型） + KV（缓存）
- 认证：JWT + RBAC 权限模型
- 部署：Cloudflare Pages（独立项目）

**域名规划（flasktoken.com）：**

| 用途 | 域名 | 部署方式 |
|------|------|---------|
| 用户端主站 | `flasktoken.com` / `www.flasktoken.com` | Cloudflare Pages |
| 运营后台 | `admin.flasktoken.com` | Cloudflare Pages（独立项目） |
| API 服务 | `api.flasktoken.com` | Cloudflare Workers |
| 图片资源 | `cdn.flasktoken.com` | Cloudflare R2 + CDN |

---

### 11.2 部署架构

```
┌─────────────────────────────────────────────────────────────┐
│                    Cloudflare CDN / WAF                      │
│           (全球加速 / DDoS防护 / WAF / 缓存)                 │
└─────────────────────────────────────────────────────────────┘
            │                      │                      │
            ▼                      ▼                      ▼
┌──────────────────┐   ┌──────────────────┐   ┌──────────────────┐
│   Pages 项目 1    │   │   Pages 项目 2    │   │   Worker API     │
│   用户端站点      │   │   运营后台        │   │   （复用现有）    │
│ flasktoken.com   │   │ admin.flasktoken.com│  │ api.flasktoken.com│
└────────┬─────────┘   └────────┬─────────┘   └────────┬─────────┘
         │                      │                      │
         └──────────────────────┼──────────────────────┘
                                │
                                ▼
                  ┌──────────────────────────┐
                  │   KV / D1 / R2           │
                  │   （共用数据存储）        │
                  └──────────────────────────┘
```

**部署要点：**
- 运营后台部署为独立的 Cloudflare Pages 项目，与用户端完全分离
- 后端复用现有 Worker，新增 `/api/admin/*` 路由前缀
- 所有管理员 API 通过管理员权限中间件保护
- 可选：运营后台域名启用 Cloudflare Access（Zero Trust）双重认证

---

### 11.3 功能模块总览

```
运营后台 (admin.flasktoken.com)
├── 📊 数据看板 (Dashboard)
│   ├── 核心指标概览（PV/UV/新增用户/折扣数）
│   ├── 趋势图表（日活、新增、互动量）
│   ├── 热门折扣排行
│   └── 实时数据面板
├── 🛒 折扣管理 (Deals)
│   ├── 折扣列表（分页、筛选、搜索、排序）
│   ├── 新增折扣（富文本编辑、商品关联、标签配置）
│   ├── 编辑折扣
│   ├── 上下架 / 置顶 / 推荐位
│   └── 批量操作（批量上下架、批量分类）
├── 📦 商品管理 (Products)
│   ├── 商品列表
│   ├── 商品信息编辑
│   ├── 价格监控记录
│   └── 关联折扣
├── 📂 分类管理 (Categories)
│   ├── 分类树（拖拽排序）
│   ├── 新增/编辑/删除分类
│   ├── 分类图标管理
│   └── 分类排序
├── 👥 用户管理 (Users)
│   ├── 用户列表（搜索、筛选）
│   ├── 用户详情（收藏、评论、浏览记录）
│   ├── 禁用/启用账号
│   └── 用户角色查看
├── 💬 评论管理 (Comments)
│   ├── 评论审核列表（待审核/已通过/已驳回）
│   ├── 通过/驳回/删除操作
│   ├── 敏感词配置
│   └── 批量审核
├── 🎨 内容运营 (Content)
│   ├── 首页 Banner 管理
│   ├── 推荐位配置
│   ├── 系统公告 / 消息推送
│   └── 攻略文章管理
├── ⚙️ 系统设置 (Settings)
│   ├── 站点基础配置
│   ├── 管理员账号管理
│   ├── 角色与权限配置
│   ├── 操作日志
│   └── 缓存管理
└── 🔌 电商平台集成
    ├── 亚马逊 PA API 配置
    ├── 商品抓取任务管理
    └── 联盟追踪配置
```

---

### 11.4 后端架构概览

#### 11.4.1 API 路由设计

所有管理员 API 统一使用 `/api/admin/*` 前缀，经过管理员认证中间件：

| 模块 | 路由 | 方法 | 说明 |
|------|------|------|------|
| 认证 | `/api/admin/auth/login` | POST | 管理员登录 |
| 认证 | `/api/admin/auth/logout` | POST | 管理员登出 |
| 认证 | `/api/admin/auth/profile` | GET | 获取当前管理员信息 |
| 折扣 | `/api/admin/deals` | GET | 折扣列表（分页、筛选） |
| 折扣 | `/api/admin/deals` | POST | 新增折扣 |
| 折扣 | `/api/admin/deals/:id` | GET | 折扣详情 |
| 折扣 | `/api/admin/deals/:id` | PUT | 编辑折扣 |
| 折扣 | `/api/admin/deals/:id` | DELETE | 删除折扣 |
| 折扣 | `/api/admin/deals/:id/status` | PATCH | 上下架 / 置顶 |
| 商品 | `/api/admin/products` | GET | 商品列表 |
| 商品 | `/api/admin/products` | POST | 新增商品 |
| 商品 | `/api/admin/products/:id` | PUT | 编辑商品 |
| 分类 | `/api/admin/categories` | GET | 分类树 |
| 分类 | `/api/admin/categories` | POST | 新增分类 |
| 分类 | `/api/admin/categories/:id` | PUT/PATCH | 编辑分类 |
| 分类 | `/api/admin/categories/:id` | DELETE | 删除分类 |
| 用户 | `/api/admin/users` | GET | 用户列表 |
| 用户 | `/api/admin/users/:id` | GET | 用户详情 |
| 用户 | `/api/admin/users/:id/status` | PATCH | 禁用/启用 |
| 评论 | `/api/admin/comments` | GET | 评论列表（含审核状态） |
| 评论 | `/api/admin/comments/:id/approve` | POST | 通过审核 |
| 评论 | `/api/admin/comments/:id/reject` | POST | 驳回 |
| 评论 | `/api/admin/comments/:id` | DELETE | 删除评论 |
| 统计 | `/api/admin/stats/overview` | GET | 数据概览 |
| 统计 | `/api/admin/stats/trend` | GET | 趋势数据 |
| 设置 | `/api/admin/settings/site` | GET/PUT | 站点配置 |
| 设置 | `/api/admin/admins` | GET/POST | 管理员管理 |
| 设置 | `/api/admin/audit-logs` | GET | 操作日志 |

> **详细设计请见：** [运营后台后端架构详细设计](docs/admin-backend.md)

#### 11.4.2 权限模型

采用 **RBAC（基于角色的访问控制）** 模型：

```
超级管理员 (super_admin)
  └── 拥有所有权限

运营管理员 (operator)
  ├── 折扣管理（增删改查、上下架）
  ├── 商品管理
  ├── 分类管理
  ├── 评论审核
  └── 内容运营

内容编辑 (editor)
  ├── 折扣管理（查看、新增、编辑）
  ├── 分类管理（查看）
  └── 评论审核
```

#### 11.4.3 安全架构

```
多层安全防护：
┌─────────────────────────────────┐
│  Layer 1: Cloudflare WAF        │  - SQL注入/XSS防护
│                                  │  - 速率限制
│                                  │  - Bot管理
├─────────────────────────────────┤
│  Layer 2: Cloudflare Access     │  - 可选：企业级SSO
│  (可选，推荐开启)                │  - 双重认证
├─────────────────────────────────┤
│  Layer 3: JWT 认证              │  - 管理员登录Token
│                                  │  - Token过期机制
├─────────────────────────────────┤
│  Layer 4: 权限中间件            │  - RBAC权限校验
│                                  │  - 接口级权限控制
├─────────────────────────────────┤
│  Layer 5: 操作审计              │  - 所有写操作记录日志
│                                  │  - 敏感操作二次验证
└─────────────────────────────────┘
```

---

### 11.5 项目目录结构

```
shopping-guide/
├── apps/
│   ├── web/                    # 用户端（现有，不变）
│   └── admin/                  # ⭐ 运营后台（新增）
│       ├── src/
│       │   ├── app/
│       │   │   ├── layout.tsx          # 后台布局（侧边栏+顶栏）
│       │   │   ├── page.tsx            # 数据看板
│       │   │   ├── deals/              # 折扣管理
│       │   │   ├── products/           # 商品管理
│       │   │   ├── categories/         # 分类管理
│       │   │   ├── users/              # 用户管理
│       │   │   ├── comments/           # 评论管理
│       │   │   ├── content/            # 内容运营
│       │   │   └── settings/           # 系统设置
│       │   ├── components/    # 后台专用组件
│       │   ├── lib/           # API封装、工具函数
│       │   └── store/         # 状态管理
│       └── package.json
├── workers/
│   └── api/
│       └── src/
│           ├── routes/
│           │   ├── admin/               # ⭐ 管理员API（新增）
│           │   │   ├── auth.ts
│           │   │   ├── deals.ts
│           │   │   ├── products.ts
│           │   │   ├── categories.ts
│           │   │   ├── users.ts
│           │   │   ├── comments.ts
│           │   │   ├── stats.ts
│           │   │   └── settings.ts
│           │   ├── middleware/           # ⭐ 中间件（新增）
│           │   │   ├── admin-auth.ts     # 管理员权限校验
│           │   │   └── rate-limit.ts
│           │   └── ... (现有路由不变)
│           └── index.ts                  # 注册 /api/admin/* 路由
├── packages/
│   └── shared-types/
│       └── src/
│           ├── index.ts      # 现有类型（不变）
│           └── admin.ts      # ⭐ 管理员类型（新增）
├── docs/
│   └── admin-backend.md      # ⭐ 运营后台后端详细设计
└── ARCHITECTURE.md           # 本文件（架构全景）
```

---

### 11.6 分阶段实施计划

#### 阶段一：基础框架（1-2 周）
- [ ] 创建 `apps/admin` Next.js 项目骨架
- [ ] 搭建后台布局（侧边栏、顶栏、路由系统）
- [ ] 管理员登录页面 + JWT 认证
- [ ] 后端新增 admin 权限中间件
- [ ] 管理员表设计与 D1 迁移
- [ ] 部署到独立 Pages 项目验证

#### 阶段二：核心内容管理（2-3 周）
- [ ] 折扣管理（列表、新增、编辑、上下架）
- [ ] 分类管理（树形结构、拖拽排序）
- [ ] 商品管理
- [ ] 富文本编辑器集成
- [ ] 图片上传（R2）

#### 阶段三：用户与互动（1-2 周）
- [ ] 用户管理（列表、详情、禁用）
- [ ] 评论审核
- [ ] 数据统计看板
- [ ] 操作审计日志

#### 阶段四：运营增强（2 周）
- [ ] 首页 Banner / 推荐位配置
- [ ] 消息推送
- [ ] 管理员角色权限（RBAC）
- [ ] 缓存管理
- [ ] Cloudflare Access 集成

---

## 十二、架构优势总结

1. **全球极速体验**：Cloudflare 300+ 边缘节点，全球华人用户都能快速访问
2. **成本极低**：免费额度充足，按需付费，初创友好
3. **自动扩展**：Serverless架构，无需管理服务器，流量突增自动应对
4. **安全内置**：DDoS、WAF、Bot管理开箱即用
5. **开发效率高**：Pages + Workers 一体化部署，Git驱动
6. **未来扩展**：AI、R2、Zero Trust 等能力可随时启用
7. **电商集成**：边缘处理亚马逊API，节省配额 + 全球低延迟
8. **联盟变现**：PA API集成 + 佣金追踪，商业模式清晰
9. **运营独立**：运营后台独立部署、独立域名，与用户端隔离但数据互通
10. **权限完善**：RBAC + 多层安全防护，保障后台安全
