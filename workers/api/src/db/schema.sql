-- ============================================
-- 今日折扣 - D1 数据库 Schema
-- 数据库类型：Cloudflare D1 (SQLite)
-- 版本：v1.0
-- ============================================

-- ============================================
-- 一、管理员系统表
-- ============================================

-- 角色表
CREATE TABLE IF NOT EXISTS roles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 权限表
CREATE TABLE IF NOT EXISTS permissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  module TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 角色权限关联表
CREATE TABLE IF NOT EXISTS role_permissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  role_id INTEGER NOT NULL,
  permission_id INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(role_id, permission_id),
  FOREIGN KEY (role_id) REFERENCES roles(id),
  FOREIGN KEY (permission_id) REFERENCES permissions(id)
);

-- 管理员表
CREATE TABLE IF NOT EXISTS admins (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  nickname TEXT,
  avatar_url TEXT,
  role_id INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  last_login_at TIMESTAMP,
  last_login_ip TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (role_id) REFERENCES roles(id)
);

-- 操作日志表
CREATE TABLE IF NOT EXISTS audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  admin_id INTEGER NOT NULL,
  admin_username TEXT NOT NULL,
  action TEXT NOT NULL,
  module TEXT NOT NULL,
  target_id TEXT,
  target_type TEXT,
  old_value TEXT,
  new_value TEXT,
  ip_address TEXT,
  user_agent TEXT,
  status TEXT DEFAULT 'success',
  error_message TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 二、内容管理表
-- ============================================

-- 折扣表
CREATE TABLE IF NOT EXISTS deals (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  store TEXT NOT NULL,
  store_logo TEXT,
  category TEXT NOT NULL,
  sub_category TEXT,
  description TEXT,
  rich_content TEXT,
  max_discount INTEGER DEFAULT 0,
  coupon_code TEXT,
  expires_at TIMESTAMP,
  status TEXT NOT NULL DEFAULT 'draft',
  is_featured INTEGER DEFAULT 0,
  sort_order INTEGER DEFAULT 0,
  tags TEXT,
  like_count INTEGER DEFAULT 0,
  comment_count INTEGER DEFAULT 0,
  favorite_count INTEGER DEFAULT 0,
  view_count INTEGER DEFAULT 0,
  created_by INTEGER,
  updated_by INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 商品表
CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  platform TEXT NOT NULL,
  platform_id TEXT,
  deal_id TEXT,
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

-- 分类表
CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  parent_id INTEGER DEFAULT 0,
  icon TEXT,
  description TEXT,
  sort_order INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 三、用户相关表
-- ============================================

-- 用户表
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  nickname TEXT,
  avatar_url TEXT,
  password_hash TEXT,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 评论表
CREATE TABLE IF NOT EXISTS comments (
  id TEXT PRIMARY KEY,
  deal_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  user_name TEXT NOT NULL,
  user_avatar TEXT,
  content TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  likes INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 四、系统配置表
-- ============================================

-- 站点配置表
CREATE TABLE IF NOT EXISTS site_settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  key TEXT UNIQUE NOT NULL,
  value TEXT,
  type TEXT DEFAULT 'string',
  description TEXT,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 敏感词表
CREATE TABLE IF NOT EXISTS sensitive_words (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  word TEXT UNIQUE NOT NULL,
  category TEXT DEFAULT 'general',
  replacement TEXT DEFAULT '***',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 五、索引
-- ============================================

CREATE INDEX IF NOT EXISTS idx_admins_username ON admins(username);
CREATE INDEX IF NOT EXISTS idx_admins_email ON admins(email);
CREATE INDEX IF NOT EXISTS idx_admins_role ON admins(role_id);

CREATE INDEX IF NOT EXISTS idx_audit_logs_admin ON audit_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_module ON audit_logs(module);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at);

CREATE INDEX IF NOT EXISTS idx_deals_status ON deals(status);
CREATE INDEX IF NOT EXISTS idx_deals_category ON deals(category);
CREATE INDEX IF NOT EXISTS idx_deals_featured ON deals(is_featured);
CREATE INDEX IF NOT EXISTS idx_deals_created ON deals(created_at);

CREATE INDEX IF NOT EXISTS idx_products_deal ON products(deal_id);
CREATE INDEX IF NOT EXISTS idx_products_platform ON products(platform);

CREATE INDEX IF NOT EXISTS idx_categories_parent ON categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_categories_slug ON categories(slug);
CREATE INDEX IF NOT EXISTS idx_categories_sort ON categories(sort_order);

CREATE INDEX IF NOT EXISTS idx_comments_deal ON comments(deal_id);
CREATE INDEX IF NOT EXISTS idx_comments_user ON comments(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_status ON comments(status);
CREATE INDEX IF NOT EXISTS idx_comments_created ON comments(created_at);

CREATE INDEX IF NOT EXISTS idx_permissions_module ON permissions(module);
CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON role_permissions(role_id);

CREATE INDEX IF NOT EXISTS idx_sensitive_words_word ON sensitive_words(word);

-- ============================================
-- 六、初始化数据
-- ============================================

-- 初始化角色
INSERT OR IGNORE INTO roles (name, display_name, description) VALUES
  ('super_admin', '超级管理员', '拥有系统所有权限'),
  ('operator', '运营管理员', '折扣、商品、分类、评论、内容运营权限'),
  ('editor', '内容编辑', '折扣编辑、评论审核权限');

-- 初始化权限
INSERT OR IGNORE INTO permissions (code, name, module, description) VALUES
  ('deal:read', '查看折扣', 'deals', '查看折扣列表、详情'),
  ('deal:create', '创建折扣', 'deals', '新增折扣'),
  ('deal:update', '编辑折扣', 'deals', '编辑、上下架、推荐'),
  ('deal:delete', '删除折扣', 'deals', '删除折扣'),
  ('product:read', '查看商品', 'products', '查看商品列表、详情'),
  ('product:create', '创建商品', 'products', '新增商品'),
  ('product:update', '编辑商品', 'products', '编辑商品、关联折扣'),
  ('product:delete', '删除商品', 'products', '删除商品'),
  ('category:read', '查看分类', 'categories', '查看分类树'),
  ('category:create', '创建分类', 'categories', '新增分类'),
  ('category:update', '编辑分类', 'categories', '编辑、排序分类'),
  ('category:delete', '删除分类', 'categories', '删除分类'),
  ('user:read', '查看用户', 'users', '查看用户列表、详情'),
  ('user:update', '管理用户', 'users', '禁用、启用用户'),
  ('comment:read', '查看评论', 'comments', '查看评论列表'),
  ('comment:moderate', '评论审核', 'comments', '通过、驳回评论'),
  ('comment:delete', '删除评论', 'comments', '删除评论'),
  ('stats:read', '查看统计', 'stats', '查看所有统计数据'),
  ('content:manage', '内容运营', 'content', 'Banner、推荐位、公告'),
  ('settings:read', '查看设置', 'settings', '查看站点配置'),
  ('settings:update', '编辑设置', 'settings', '修改站点配置、缓存管理'),
  ('admin:manage', '管理员管理', 'admin', '管理员账号、角色、日志');

-- 超级管理员拥有所有权限
INSERT OR IGNORE INTO role_permissions (role_id, permission_id)
SELECT 1, id FROM permissions;

-- 运营管理员权限
INSERT OR IGNORE INTO role_permissions (role_id, permission_id)
SELECT 2, id FROM permissions WHERE code IN (
  'deal:read', 'deal:create', 'deal:update', 'deal:delete',
  'product:read', 'product:create', 'product:update', 'product:delete',
  'category:read', 'category:create', 'category:update', 'category:delete',
  'user:read', 'user:update',
  'comment:read', 'comment:moderate', 'comment:delete',
  'stats:read',
  'content:manage'
);

-- 内容编辑权限
INSERT OR IGNORE INTO role_permissions (role_id, permission_id)
SELECT 3, id FROM permissions WHERE code IN (
  'deal:read', 'deal:create', 'deal:update',
  'product:read',
  'category:read',
  'comment:read', 'comment:moderate'
);

-- 初始化站点配置
INSERT OR IGNORE INTO site_settings (key, value, type, description) VALUES
  ('site_name', '今日折扣', 'string', '站点名称'),
  ('site_description', '面向海外华人的电商导购平台', 'string', '站点描述'),
  ('site_keywords', '折扣,优惠券,亚马逊,电商导购', 'string', '站点关键词'),
  ('contact_email', 'contact@flasktoken.com', 'string', '联系邮箱'),
  ('enable_comment', 'true', 'boolean', '是否开启评论'),
  ('comment_need_review', 'true', 'boolean', '评论是否需要审核'),
  ('enable_register', 'true', 'boolean', '是否开启注册');

-- 初始化默认分类
INSERT OR IGNORE INTO categories (name, slug, parent_id, icon, sort_order, status) VALUES
  ('电子数码', 'electronics', 0, '📱', 1, 'active'),
  ('美妆护肤', 'beauty', 0, '💄', 2, 'active'),
  ('母婴玩具', 'baby-toys', 0, '🧸', 3, 'active'),
  ('家居家电', 'home-appliances', 0, '🏠', 4, 'active'),
  ('服饰鞋包', 'fashion', 0, '👗', 5, 'active'),
  ('食品保健', 'grocery', 0, '🍎', 6, 'active'),
  ('图书文具', 'books', 0, '📚', 7, 'active'),
  ('运动户外', 'sports', 0, '⚽', 8, 'active');
