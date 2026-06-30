-- ============================================
-- 开发环境种子数据
-- 包含：初始超级管理员、示例折扣、示例分类
-- 使用：wrangler d1 execute shopping-guide-db --local --file=./src/db/seed.sql
-- ============================================

-- ============================================
-- 初始超级管理员
-- 用户名: admin
-- 密码: admin123456
-- 注意：生产环境请立即修改密码！
-- ============================================

-- 密码哈希是 "admin123456" + pepper 的 PBKDF2 哈希
-- 使用 Node.js crypto.pbkdf2Sync 生成
-- 实际部署时请使用脚本生成正确的哈希

INSERT OR REPLACE INTO admins (id, username, email, password_hash, nickname, role_id, status)
VALUES (
  1,
  'admin',
  'admin@flasktoken.com',
  -- PBKDF2 hash of "admin123456" with pepper "your-super-secret-password-pepper-change-this"
-- 使用 Node.js crypto.pbkdf2Sync(password + pepper, salt, 100000, 32, 'sha256') 生成
-- salt 为随机 16 字节，格式: saltHex:hashHex
  'd0c6b87094904290511b0da3d3d4a69d:bee321ba112a8f294c8d3084d64b8526b976f5f9ce3899d6622962f8097c902c',
  '超级管理员',
  1,
  'active'
);

-- ============================================
-- 示例折扣数据
-- ============================================

INSERT OR IGNORE INTO deals (
  id, title, store, store_logo, category, sub_category, description, rich_content,
  max_discount, coupon_code, expires_at, status, is_featured, sort_order, tags,
  like_count, comment_count, favorite_count, view_count, created_by, updated_by
) VALUES
(
  'deal-demo-001',
  'Prime Day 限时特惠 - 电子数码低至5折',
  'Amazon',
  '',
  'electronics',
  '',
  'Amazon Prime Day 年度大促，电子数码类产品低至5折，限时48小时！',
  '<h3>活动详情</h3><p>Prime 会员专享，覆盖电子产品、家居、美妆等多个品类。</p>',
  50,
  '',
  datetime('now', '+7 days'),
  'published',
  1,
  1,
  '[{"name":"🔥 热卖","type":"hot"},{"name":"50% OFF","type":"discount"}]',
  128,
  23,
  256,
  3580,
  1,
  1
),
(
  'deal-demo-002',
  'Apple AirPods Pro 2 立减$60',
  'Amazon',
  '',
  'electronics',
  '',
  'Apple AirPods Pro 第二代，现价$189.99，原价$249，立减$60。',
  '<h3>商品详情</h3><p>主动降噪、自适应通透模式、空间音频。</p>',
  24,
  '',
  datetime('now', '+14 days'),
  'published',
  1,
  2,
  '[{"name":"限时特惠","type":"discount"}]',
  89,
  15,
  178,
  2340,
  1,
  1
),
(
  'deal-demo-003',
  '美妆护肤节 - 精选大牌8折起',
  'Sephora',
  '',
  'beauty',
  '',
  '丝芙兰美妆节，精选大牌护肤彩妆8折起，满$50免运费。',
  '<h3>活动详情</h3><p>涵盖 La Mer、SK-II、Estée Lauder 等一线品牌。</p>',
  20,
  'BEAUTY20',
  datetime('now', '+10 days'),
  'published',
  0,
  3,
  '[{"name":"🎁 满减","type":"discount"}]',
  56,
  8,
  92,
  1560,
  1,
  1
),
(
  'deal-demo-004',
  '母婴用品大促 - 奶粉尿裤囤货价',
  'Walmart',
  '',
  'baby-toys',
  '',
  '沃尔玛母婴用品大促，奶粉尿裤超低价，囤货好时机！',
  '<h3>参与品牌</h3><p>Pampers、Huggies、Enfamil、Similac 等。</p>',
  30,
  '',
  datetime('now', '+5 days'),
  'published',
  0,
  4,
  '[{"name":"👶 母婴","type":"hot"}]',
  42,
  5,
  67,
  980,
  1,
  1
),
(
  'deal-demo-005',
  '草稿：618年中大促预告',
  'Amazon',
  '',
  'electronics',
  '',
  '618年中大促活动预告，即将上线。',
  '',
  40,
  '',
  datetime('now', '+30 days'),
  'draft',
  0,
  0,
  '[]',
  0,
  0,
  0,
  0,
  1,
  1
);

-- ============================================
-- 示例商品数据
-- ============================================

INSERT OR IGNORE INTO products (
  id, platform, platform_id, deal_id, name, brand, image_url,
  original_price, current_price, savings_amount, savings_percent,
  affiliate_url, rating, review_count, in_stock, sort_order
) VALUES
(
  'prod-demo-001',
  'amazon',
  'B0CQW8PQHL',
  'deal-demo-001',
  'Apple AirPods Pro (2nd Generation)',
  'Apple',
  'https://m.media-amazon.com/images/I/61f1jHq+91L._AC_SX679_.jpg',
  249.00,
  189.99,
  59.01,
  24,
  'https://amazon.com/dp/B0CQW8PQHL?tag=flasktoken-20',
  '4.8',
  15234,
  1,
  1
),
(
  'prod-demo-002',
  'amazon',
  'B09V3K1YX2',
  'deal-demo-001',
  'Sony WH-1000XM5 Wireless Headphones',
  'Sony',
  'https://m.media-amazon.com/images/I/51P2B7k3FBL._AC_SX679_.jpg',
  399.99,
  298.00,
  101.99,
  25,
  'https://amazon.com/dp/B09V3K1YX2?tag=flasktoken-20',
  '4.7',
  8923,
  1,
  2
),
(
  'prod-demo-003',
  'amazon',
  'B0BD6KGFPM',
  'deal-demo-002',
  'Apple AirPods Pro (2nd Generation) USB-C',
  'Apple',
  'https://m.media-amazon.com/images/I/61f1jHq+91L._AC_SX679_.jpg',
  249.00,
  189.99,
  59.01,
  24,
  'https://amazon.com/dp/B0BD6KGFPM?tag=flasktoken-20',
  '4.8',
  23456,
  1,
  1
),
(
  'prod-demo-004',
  'amazon',
  'B07N2P4QZ8',
  'deal-demo-003',
  'La Mer Crème de la Mer Moisturizing Cream',
  'La Mer',
  'https://m.media-amazon.com/images/I/51H1H8M7H1L._AC_SX679_.jpg',
  195.00,
  156.00,
  39.00,
  20,
  'https://amazon.com/dp/B07N2P4QZ8?tag=flasktoken-20',
  '4.6',
  4521,
  1,
  1
),
(
  'prod-demo-005',
  'amazon',
  'B00K69EP5M',
  'deal-demo-004',
  'Pampers Swaddlers Disposable Baby Diapers',
  'Pampers',
  'https://m.media-amazon.com/images/I/71Oq3H+YJBL._AC_SX679_.jpg',
  49.99,
  34.99,
  15.00,
  30,
  'https://amazon.com/dp/B00K69EP5M?tag=flasktoken-20',
  '4.9',
  89723,
  1,
  1
);

-- ============================================
-- 示例评论数据
-- ============================================

INSERT OR IGNORE INTO comments (
  id, deal_id, user_id, user_name, user_avatar, content, status, likes, created_at
) VALUES
(
  'comment-demo-001',
  'deal-demo-001',
  'user-demo-001',
  '小明',
  '',
  '这个折扣力度真大，已经下单了！',
  'approved',
  12,
  datetime('now', '-2 days')
),
(
  'comment-demo-002',
  'deal-demo-001',
  'user-demo-002',
  '爱购物的猫',
  '',
  '请问这个活动到什么时候结束呀？',
  'approved',
  3,
  datetime('now', '-1 days')
),
(
  'comment-demo-003',
  'deal-demo-001',
  'user-demo-003',
  '购物达人',
  '',
  '求推荐更多好价产品！',
  'pending',
  1,
  datetime('now', '-1 hours')
),
(
  'comment-demo-004',
  'deal-demo-002',
  'user-demo-004',
  '果粉',
  '',
  'AirPods Pro 2 这个价格很值了！',
  'approved',
  8,
  datetime('now', '-3 days')
),
(
  'comment-demo-005',
  'deal-demo-003',
  'user-demo-005',
  '美妆控',
  '',
  '敏感肌可以用吗？',
  'pending',
  0,
  datetime('now', '-30 minutes')
);

-- ============================================
-- 示例用户数据
-- ============================================

INSERT OR IGNORE INTO users (
  id, email, nickname, avatar_url, status
) VALUES
  ('user-demo-001', 'user1@example.com', '小明', '', 'active'),
  ('user-demo-002', 'user2@example.com', '爱购物的猫', '', 'active'),
  ('user-demo-003', 'user3@example.com', '购物达人', '', 'active'),
  ('user-demo-004', 'user4@example.com', '果粉', '', 'active'),
  ('user-demo-005', 'user5@example.com', '美妆控', '', 'active');

-- ============================================
-- 示例操作日志
-- ============================================

INSERT OR IGNORE INTO audit_logs (
  admin_id, admin_username, action, module, target_id, target_type,
  new_value, ip_address, status, created_at
) VALUES
(1, 'admin', 'login', 'auth', null, null, '{}', '127.0.0.1', 'success', datetime('now', '-1 days')),
(1, 'admin', 'create', 'deals', 'deal-demo-001', 'deal', '{"title":"Prime Day 限时特惠"}', '127.0.0.1', 'success', datetime('now', '-5 days'));
