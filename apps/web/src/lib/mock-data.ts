import type { Deal, Product, DealTag, Category } from '@shared/types';

export const mockProducts: Product[] = [
  {
    id: 'B0CQW8PQHL',
    platform: 'amazon',
    platformId: 'B0CQW8PQHL',
    name: 'Apple AirPods Pro (第二代) USB-C 充电盒 无线蓝牙耳机 主动降噪',
    brand: 'Apple',
    imageUrl: 'https://m.media-amazon.com/images/I/6fQ+KjZ7XZL._AC_UY218_.jpg',
    originalPrice: 249,
    currentPrice: 189.99,
    savingsAmount: 59.01,
    savingsPercent: 24,
    affiliateUrl: 'https://www.amazon.com/dp/B0CQW8PQHL?tag=todaydeal-20',
    rating: '4.7',
    reviewCount: 28456,
    inStock: true,
  },
  {
    id: 'B09Q6Z1X7V',
    platform: 'amazon',
    platformId: 'B09Q6Z1X7V',
    name: 'Kindle Paperwhite (16 GB) 6.8英寸显示屏 可调节暖光',
    brand: 'Amazon',
    imageUrl: 'https://m.media-amazon.com/images/I/51Tq+XQeTGL._AC_UY218_.jpg',
    originalPrice: 159.99,
    currentPrice: 99.99,
    savingsAmount: 60,
    savingsPercent: 38,
    affiliateUrl: 'https://www.amazon.com/dp/B09Q6Z1X7V?tag=todaydeal-20',
    rating: '4.6',
    reviewCount: 15234,
    inStock: true,
  },
  {
    id: 'B0C7K5LQHL',
    platform: 'amazon',
    platformId: 'B0C7K5LQHL',
    name: 'SK-II 神仙水 230ml 护肤精华露 提亮肤色',
    brand: 'SK-II',
    imageUrl: 'https://m.media-amazon.com/images/I/61R3yQZ7QvL._AC_UY218_.jpg',
    originalPrice: 235,
    currentPrice: 179.99,
    savingsAmount: 55.01,
    savingsPercent: 23,
    affiliateUrl: 'https://www.amazon.com/dp/B0C7K5LQHL?tag=todaydeal-20',
    rating: '4.8',
    reviewCount: 8765,
    inStock: true,
  },
  {
    id: 'B08N5KK5PZ',
    platform: 'amazon',
    platformId: 'B08N5KK5PZ',
    name: 'LEGO 乐高经典创意系列 积木玩具套装',
    brand: 'LEGO',
    imageUrl: 'https://m.media-amazon.com/images/I/71Fj6d7yGbL._AC_UY218_.jpg',
    originalPrice: 59.99,
    currentPrice: 35.99,
    savingsAmount: 24,
    savingsPercent: 40,
    affiliateUrl: 'https://www.amazon.com/dp/B08N5KK5PZ?tag=todaydeal-20',
    rating: '4.9',
    reviewCount: 12543,
    inStock: true,
  },
];

export const mockDeals: Deal[] = [
  {
    id: 'deal-amazon-electronics-001',
    title: 'Amazon Prime Day 电子数码特惠 低至5折起',
    store: 'Amazon',
    category: 'electronics',
    description: 'Amazon Prime Day 大促！精选电子数码产品低至5折起，多款热门单品超值优惠，Prime会员免运费，数量有限先到先得！',
    richContent: `
      <h3>🎊 Prime Day 电子数码大促</h3>
      <p>一年一度的 Prime Day 终于来了！本次活动期间，精选 <strong>电子数码产品低至5折</strong>，更有超多爆款单品限时秒杀！</p>
      <h3>✨ 活动亮点</h3>
      <ul>
        <li>🎧 耳机音响低至6折</li>
        <li>📱 手机配件最高省$100</li>
        <li>⌚ 智能手表特惠</li>
        <li>💻 笔记本电脑直降</li>
      </ul>
      <h3>🚚 配送说明</h3>
      <p>Prime会员免运费，非会员满$25免运费。</p>
      <h3>⏰ 活动时间</h3>
      <p>限时2025年6月24日 - 6月25日，仅限两天！</p>
    `,
    tags: [
      { name: '🔥 热卖', type: 'hot' },
      { name: '50% OFF', type: 'discount' },
      { name: '免运费', type: 'shipping' },
      { name: '限时', type: 'limited' },
    ],
    maxDiscount: 50,
    products: mockProducts.slice(0, 2),
    likeCount: 328,
    commentCount: 86,
    favoriteCount: 156,
    viewCount: 4521,
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'deal-amazon-beauty-002',
    title: '美妆护肤大促 SK-II 低至7折 + 额外8折券',
    store: 'Amazon',
    category: 'beauty',
    description: '美妆护肤精选特惠，SK-II、雅诗兰黛等大牌低至7折，叠加额外8折优惠码，Prime会员免运费！',
    richContent: `
      <h3>💄 美妆护肤大促</h3>
      <p>精选大牌美妆护肤产品限时特惠，<strong>低至7折</strong>起！</p>
      <h3>✨ 参与品牌</h3>
      <ul>
        <li>SK-II 神仙水 230ml $179.99</li>
        <li>Estée Lauder 小棕瓶 50ml $68</li>
        <li>La Mer 海蓝之谜 面霜 60ml $215</li>
      </ul>
      <h3>🎁 优惠码</h3>
      <p>使用优惠码 <strong>BEAUTY20</strong> 额外8折</p>
    `,
    tags: [
      { name: '30% OFF', type: 'discount' },
      { name: '免运费', type: 'shipping' },
    ],
    maxDiscount: 30,
    couponCode: 'BEAUTY20',
    products: mockProducts.slice(2, 3),
    likeCount: 256,
    commentCount: 45,
    favoriteCount: 189,
    viewCount: 3210,
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'deal-amazon-toys-003',
    title: 'LEGO 乐高精选 低至6折 Prime Day特惠',
    store: 'Amazon',
    category: 'toys',
    description: 'LEGO 乐高精选积木玩具低至6折，热门系列均参与活动，Prime会员免运费，送礼自用两相宜！',
    richContent: `
      <h3>🧱 LEGO 乐高特惠</h3>
      <p>LEGO 乐高精选积木玩具 <strong>低至6折</strong>！</p>
      <h3>✨ 推荐系列</h3>
      <ul>
        <li>经典创意系列 6折起</li>
        <li>城市系列 7折起</li>
        <li>好朋友系列 65折起</li>
        <li>机械组 75折起</li>
      </ul>
      <p>数量有限，售完即止！</p>
    `,
    tags: [
      { name: '40% OFF', type: 'discount' },
      { name: '🔥 热卖', type: 'hot' },
      { name: '免运费', type: 'shipping' },
    ],
    maxDiscount: 40,
    products: mockProducts.slice(3, 4),
    likeCount: 178,
    commentCount: 32,
    favoriteCount: 98,
    viewCount: 2156,
    createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'deal-amazon-home-004',
    title: '家居家电大清仓 低至4折 数量有限',
    store: 'Amazon',
    category: 'home-appliances',
    description: '家居家电大清仓！多款热门单品低至4折，厨房小家电、生活电器超值特惠，Prime会员免运费！',
    richContent: `
      <h3>🏠 家居家电大清仓</h3>
      <p>多款家居家电产品 <strong>低至4折</strong>清仓特惠！</p>
      <h3>✨ 品类</h3>
      <ul>
        <li>厨房小家电</li>
        <li>生活电器</li>
        <li>厨房餐具</li>
        <li>收纳整理</li>
      </ul>
      <p>数量有限，先到先得！</p>
    `,
    tags: [
      { name: '60% OFF', type: 'discount' },
      { name: '清仓', type: 'limited' },
    ],
    maxDiscount: 60,
    products: mockProducts.slice(0, 2),
    likeCount: 445,
    commentCount: 112,
    favoriteCount: 267,
    viewCount: 5678,
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export const mockCategories: Category[] = [
  { id: '1', name: '美妆护肤', slug: 'beauty', icon: '💄' },
  { id: '2', name: '服饰手袋', slug: 'fashion', icon: '👗' },
  { id: '3', name: '电子电脑', slug: 'electronics', icon: '💻' },
  { id: '4', name: '家居家电', slug: 'home-appliances', icon: '🏠' },
  { id: '5', name: '母婴儿童', slug: 'mom-baby', icon: '👶' },
  { id: '6', name: '运动户外', slug: 'sports', icon: '⚽' },
  { id: '7', name: '食品保健', slug: 'grocery', icon: '🍎' },
  { id: '8', name: '图书音像', slug: 'books', icon: '📚' },
];

export const subCategories: Record<string, Category[]> = {
  beauty: [
    { id: 'b1', name: '全部', slug: 'beauty' },
    { id: 'b2', name: '护肤', slug: 'skincare' },
    { id: 'b3', name: '彩妆', slug: 'makeup' },
    { id: 'b4', name: '香水', slug: 'perfume' },
    { id: 'b5', name: '美发', slug: 'hair' },
    { id: 'b6', name: '个护', slug: 'personal-care' },
  ],
  electronics: [
    { id: 'e1', name: '全部', slug: 'electronics' },
    { id: 'e2', name: '手机', slug: 'phones' },
    { id: 'e3', name: '电脑', slug: 'computers' },
    { id: 'e4', name: '耳机音响', slug: 'audio' },
    { id: 'e5', name: '智能穿戴', slug: 'wearable' },
    { id: 'e6', name: '相机', slug: 'camera' },
  ],
  fashion: [
    { id: 'f1', name: '全部', slug: 'fashion' },
    { id: 'f2', name: '女装', slug: 'women' },
    { id: 'f3', name: '男装', slug: 'men' },
    { id: 'f4', name: '鞋靴', slug: 'shoes' },
    { id: 'f5', name: '箱包', slug: 'bags' },
    { id: 'f6', name: '配饰', slug: 'accessories' },
  ],
  'home-appliances': [
    { id: 'h1', name: '全部', slug: 'home-appliances' },
    { id: 'h2', name: '厨房电器', slug: 'kitchen' },
    { id: 'h3', name: '生活电器', slug: 'living' },
    { id: 'h4', name: '家具', slug: 'furniture' },
    { id: 'h5', name: '收纳', slug: 'storage' },
  ],
};
