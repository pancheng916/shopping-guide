import type { Env } from '../types';
import type { Category } from '@shared/types';

interface CategoryRow {
  id: number;
  name: string;
  slug: string;
  parent_id: number;
  icon: string | null;
  description: string | null;
  sort_order: number;
  status: string;
}

interface CategoryTreeNode {
  id: string;
  name: string;
  slug: string;
  icon?: string;
  subCategories: CategoryTreeNode[];
}

function buildCategoryTree(categories: CategoryRow[]): CategoryTreeNode[] {
  const map = new Map<number, CategoryTreeNode>();
  const roots: CategoryTreeNode[] = [];

  for (const cat of categories) {
    const node: CategoryTreeNode = {
      id: cat.slug,
      name: cat.name,
      slug: cat.slug,
      icon: cat.icon || undefined,
      subCategories: [],
    };
    map.set(cat.id, node);
  }

  for (const cat of categories) {
    const node = map.get(cat.id)!;
    if (cat.parent_id === 0) {
      roots.push(node);
    } else {
      const parent = map.get(cat.parent_id);
      if (parent) {
        parent.subCategories.push(node);
      } else {
        roots.push(node);
      }
    }
  }

  function sortRecursive(nodes: CategoryTreeNode[]) {
    nodes.sort((a, b) => a.name.localeCompare(b.name));
    for (const node of nodes) {
      sortRecursive(node.subCategories);
    }
  }
  sortRecursive(roots);

  return roots;
}

export async function handleCategoriesList(
  request: Request,
  env: Env
): Promise<Response> {
  const cacheKey = 'categories:list';
  const cached = await env.DEALS_CACHE.get(cacheKey, 'json');

  if (cached) {
    return Response.json(cached, {
      headers: { 'X-Cache': 'HIT' },
    });
  }

  let categories: CategoryTreeNode[] = [];

  // 优先从 D1 数据库读取
  if (env.DB) {
    try {
      const result = await env.DB.prepare(
        `SELECT * FROM categories WHERE status = 'active' ORDER BY sort_order ASC, id ASC`
      ).all<CategoryRow>();

      if (result.results && result.results.length > 0) {
        categories = buildCategoryTree(result.results);
      }
    } catch (error) {
      console.error('Failed to fetch categories from DB:', error);
    }
  }

  // 如果数据库没有数据，使用硬编码的默认分类
  if (categories.length === 0) {
    const defaultCategories: Category[] = [
      {
        id: 'beauty',
        name: '美妆护肤',
        slug: 'beauty',
        icon: '💄',
        subCategories: [
          { id: 'b1', name: '全部', slug: 'beauty' },
          { id: 'b2', name: '护肤', slug: 'skincare' },
          { id: 'b3', name: '彩妆', slug: 'makeup' },
          { id: 'b4', name: '香水', slug: 'perfume' },
          { id: 'b5', name: '美发', slug: 'hair' },
          { id: 'b6', name: '个护', slug: 'personal-care' },
        ],
      },
      {
        id: 'fashion',
        name: '服饰手袋',
        slug: 'fashion',
        icon: '👗',
        subCategories: [
          { id: 'f1', name: '全部', slug: 'fashion' },
          { id: 'f2', name: '女装', slug: 'women' },
          { id: 'f3', name: '男装', slug: 'men' },
          { id: 'f4', name: '鞋靴', slug: 'shoes' },
          { id: 'f5', name: '箱包', slug: 'bags' },
          { id: 'f6', name: '配饰', slug: 'accessories' },
        ],
      },
      {
        id: 'electronics',
        name: '电子电脑',
        slug: 'electronics',
        icon: '💻',
        subCategories: [
          { id: 'e1', name: '全部', slug: 'electronics' },
          { id: 'e2', name: '手机', slug: 'phones' },
          { id: 'e3', name: '电脑', slug: 'computers' },
          { id: 'e4', name: '耳机音响', slug: 'audio' },
          { id: 'e5', name: '智能穿戴', slug: 'wearable' },
          { id: 'e6', name: '相机', slug: 'camera' },
        ],
      },
      {
        id: 'home-appliances',
        name: '家居家电',
        slug: 'home-appliances',
        icon: '🏠',
        subCategories: [
          { id: 'h1', name: '全部', slug: 'home-appliances' },
          { id: 'h2', name: '厨房电器', slug: 'kitchen' },
          { id: 'h3', name: '生活电器', slug: 'living' },
          { id: 'h4', name: '家具', slug: 'furniture' },
          { id: 'h5', name: '收纳', slug: 'storage' },
        ],
      },
      {
        id: 'mom-baby',
        name: '母婴儿童',
        slug: 'mom-baby',
        icon: '👶',
        subCategories: [
          { id: 'm1', name: '全部', slug: 'mom-baby' },
          { id: 'm2', name: '婴儿用品', slug: 'baby' },
          { id: 'm3', name: '童装', slug: 'kids-clothes' },
          { id: 'm4', name: '玩具', slug: 'toys' },
          { id: 'm5', name: '孕妇用品', slug: 'maternity' },
        ],
      },
      {
        id: 'sports',
        name: '运动户外',
        slug: 'sports',
        icon: '⚽',
        subCategories: [
          { id: 's1', name: '全部', slug: 'sports' },
          { id: 's2', name: '运动服饰', slug: 'sportswear' },
          { id: 's3', name: '健身器材', slug: 'fitness' },
          { id: 's4', name: '户外装备', slug: 'outdoor' },
          { id: 's5', name: '运动鞋', slug: 'sports-shoes' },
        ],
      },
      {
        id: 'grocery',
        name: '食品保健',
        slug: 'grocery',
        icon: '🍎',
        subCategories: [
          { id: 'g1', name: '全部', slug: 'grocery' },
          { id: 'g2', name: '零食', slug: 'snacks' },
          { id: 'g3', name: '保健品', slug: 'supplements' },
          { id: 'g4', name: '饮料', slug: 'beverages' },
        ],
      },
      {
        id: 'books',
        name: '图书音像',
        slug: 'books',
        icon: '📚',
        subCategories: [
          { id: 'k1', name: '全部', slug: 'books' },
          { id: 'k2', name: '图书', slug: 'books' },
          { id: 'k3', name: '音像', slug: 'music' },
        ],
      },
    ];
    categories = defaultCategories as unknown as CategoryTreeNode[];
  }

  await env.DEALS_CACHE.put(cacheKey, JSON.stringify(categories), {
    expirationTtl: 300, // 缓存5分钟，运营后台修改后能及时生效
  });

  return Response.json(categories, {
    headers: { 'X-Cache': 'MISS' },
  });
}
