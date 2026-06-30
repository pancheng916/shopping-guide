import type { Env } from '../types';

export interface LikeRecord {
  dealId: string;
  userId: string;
  createdAt: string;
}

export interface FavoriteRecord {
  dealId: string;
  userId: string;
  dealTitle: string;
  dealImage: string;
  dealPrice: number;
  dealDiscount: number;
  createdAt: string;
}

export interface Comment {
  id: string;
  dealId: string;
  userId: string;
  userName: string;
  userAvatar: string;
  content: string;
  likes: number;
  createdAt: string;
}

function getUserIdFromToken(authHeader: string | null, env: Env): string | null {
  if (!authHeader) return null;
  const token = authHeader.replace('Bearer ', '');
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.userId || null;
  } catch {
    return null;
  }
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
}

// ==================== 点赞 ====================

export async function handleToggleLike(request: Request, env: Env): Promise<Response> {
  const authHeader = request.headers.get('Authorization');
  const userId = getUserIdFromToken(authHeader, env);
  
  if (!userId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json() as { dealId: string };
  const { dealId } = body;

  if (!dealId) {
    return Response.json({ error: 'dealId is required' }, { status: 400 });
  }

  const likeKey = `like:${userId}:${dealId}`;
  const countKey = `likes:${dealId}`;

  const existing = await env.DEALS_CACHE.get(likeKey);
  const currentCount = parseInt(await env.DEALS_CACHE.get(countKey) || '0', 10);

  let liked: boolean;
  let likeCount: number;

  if (existing) {
    await env.DEALS_CACHE.delete(likeKey);
    liked = false;
    likeCount = Math.max(0, currentCount - 1);
  } else {
    await env.DEALS_CACHE.put(likeKey, JSON.stringify({
      dealId,
      userId,
      createdAt: new Date().toISOString(),
    } as LikeRecord));
    liked = true;
    likeCount = currentCount + 1;
  }

  await env.DEALS_CACHE.put(countKey, likeCount.toString());

  return Response.json({ liked, likeCount });
}

export async function handleGetLikeStatus(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const dealId = url.searchParams.get('dealId');
  const authHeader = request.headers.get('Authorization');
  const userId = getUserIdFromToken(authHeader, env);

  if (!dealId) {
    return Response.json({ error: 'dealId is required' }, { status: 400 });
  }

  const countKey = `likes:${dealId}`;
  const likeCount = parseInt(await env.DEALS_CACHE.get(countKey) || '0', 10);

  let liked = false;
  if (userId) {
    const likeKey = `like:${userId}:${dealId}`;
    liked = !!(await env.DEALS_CACHE.get(likeKey));
  }

  return Response.json({ liked, likeCount });
}

// ==================== 收藏 ====================

export async function handleToggleFavorite(request: Request, env: Env): Promise<Response> {
  const authHeader = request.headers.get('Authorization');
  const userId = getUserIdFromToken(authHeader, env);
  
  if (!userId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json() as {
    dealId: string;
    dealTitle: string;
    dealImage: string;
    dealPrice: number;
    dealDiscount: number;
  };
  const { dealId, dealTitle, dealImage, dealPrice, dealDiscount } = body;

  if (!dealId) {
    return Response.json({ error: 'dealId is required' }, { status: 400 });
  }

  const favKey = `fav:${userId}:${dealId}`;
  const listKey = `favlist:${userId}`;

  const existing = await env.DEALS_CACHE.get(favKey);
  let favorited: boolean;

  if (existing) {
    await env.DEALS_CACHE.delete(favKey);
    favorited = false;

    const favListStr = await env.DEALS_CACHE.get(listKey);
    if (favListStr) {
      const favList: FavoriteRecord[] = JSON.parse(favListStr);
      const newList = favList.filter(f => f.dealId !== dealId);
      await env.DEALS_CACHE.put(listKey, JSON.stringify(newList));
    }
  } else {
    const record: FavoriteRecord = {
      dealId,
      userId,
      dealTitle: dealTitle || '',
      dealImage: dealImage || '',
      dealPrice: dealPrice || 0,
      dealDiscount: dealDiscount || 0,
      createdAt: new Date().toISOString(),
    };
    await env.DEALS_CACHE.put(favKey, JSON.stringify(record));
    favorited = true;

    const favListStr = await env.DEALS_CACHE.get(listKey);
    const favList: FavoriteRecord[] = favListStr ? JSON.parse(favListStr) : [];
    favList.unshift(record);
    await env.DEALS_CACHE.put(listKey, JSON.stringify(favList));
  }

  return Response.json({ favorited });
}

export async function handleGetFavoriteStatus(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const dealId = url.searchParams.get('dealId');
  const authHeader = request.headers.get('Authorization');
  const userId = getUserIdFromToken(authHeader, env);

  if (!userId) {
    return Response.json({ favorited: false });
  }

  if (!dealId) {
    return Response.json({ error: 'dealId is required' }, { status: 400 });
  }

  const favKey = `fav:${userId}:${dealId}`;
  const favorited = !!(await env.DEALS_CACHE.get(favKey));

  return Response.json({ favorited });
}

export async function handleGetFavoriteList(request: Request, env: Env): Promise<Response> {
  const authHeader = request.headers.get('Authorization');
  const userId = getUserIdFromToken(authHeader, env);

  if (!userId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const listKey = `favlist:${userId}`;
  const favListStr = await env.DEALS_CACHE.get(listKey);
  const favorites: FavoriteRecord[] = favListStr ? JSON.parse(favListStr) : [];

  return Response.json({ favorites, total: favorites.length });
}

// ==================== 评论 ====================

export async function handleGetComments(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const dealId = url.searchParams.get('dealId');
  const page = parseInt(url.searchParams.get('page') || '1', 10);
  const pageSize = parseInt(url.searchParams.get('pageSize') || '20', 10);

  if (!dealId) {
    return Response.json({ error: 'dealId is required' }, { status: 400 });
  }

  const commentsKey = `comments:${dealId}`;
  const commentsStr = await env.DEALS_CACHE.get(commentsKey);
  let comments: Comment[] = commentsStr ? JSON.parse(commentsStr) : [];

  if (comments.length === 0) {
    comments = generateMockComments(dealId);
    await env.DEALS_CACHE.put(commentsKey, JSON.stringify(comments));
  }

  const total = comments.length;
  const start = (page - 1) * pageSize;
  const end = start + pageSize;
  const paginatedComments = comments.slice(start, end);

  return Response.json({
    comments: paginatedComments,
    total,
    page,
    pageSize,
  });
}

function generateMockComments(dealId: string): Comment[] {
  const mockUsers = [
    { name: '小明', avatar: 'M' },
    { name: '购物达人', avatar: '购' },
    { name: '省钱小能手', avatar: '省' },
    { name: 'Lisa', avatar: 'L' },
    { name: '华人妈妈', avatar: '妈' },
  ];
  const mockContents = [
    '这个价格真香，已经入手了！',
    '感谢分享，质量怎么样？',
    '刚买了一个，用着不错',
    '历史最低价了吗？',
    '这个牌子一直很喜欢',
    '有没有人一起拼单？',
    '比上次便宜了好多',
    '码住，等黑五再看看',
  ];

  return mockContents.slice(0, 5).map((content, i) => ({
    id: `mock-${dealId}-${i}`,
    dealId,
    userId: `user-${i}`,
    userName: mockUsers[i].name,
    userAvatar: mockUsers[i].avatar,
    content,
    likes: Math.floor(Math.random() * 50),
    createdAt: new Date(Date.now() - i * 86400000).toISOString(),
  }));
}

export async function handleAddComment(request: Request, env: Env): Promise<Response> {
  const authHeader = request.headers.get('Authorization');
  const userId = getUserIdFromToken(authHeader, env);
  
  if (!userId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json() as {
    dealId: string;
    content: string;
    userName: string;
    userAvatar: string;
  };
  const { dealId, content, userName, userAvatar } = body;

  if (!dealId || !content) {
    return Response.json({ error: 'dealId and content are required' }, { status: 400 });
  }

  const commentsKey = `comments:${dealId}`;
  const commentsStr = await env.DEALS_CACHE.get(commentsKey);
  const comments: Comment[] = commentsStr ? JSON.parse(commentsStr) : [];

  const newComment: Comment = {
    id: generateId(),
    dealId,
    userId,
    userName: userName || '匿名用户',
    userAvatar: userAvatar || 'U',
    content,
    likes: 0,
    createdAt: new Date().toISOString(),
  };

  comments.unshift(newComment);
  await env.DEALS_CACHE.put(commentsKey, JSON.stringify(comments));

  return Response.json({ comment: newComment }, { status: 201 });
}
