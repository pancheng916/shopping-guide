import type { Env } from '../types';

interface RegisterRequest {
  email: string;
  password: string;
  nickname: string;
}

interface LoginRequest {
  email: string;
  password: string;
}

interface User {
  id: string;
  email: string;
  nickname: string;
  avatarUrl?: string;
}

const generateToken = (): string => {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};

export async function handleRegister(
  request: Request,
  env: Env
): Promise<Response> {
  try {
    const body: RegisterRequest = await request.json();

    if (!body.email || !body.password || !body.nickname) {
      return Response.json(
        { error: '缺少必填字段' },
        { status: 400 }
      );
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) {
      return Response.json(
        { error: '无效的邮箱格式' },
        { status: 400 }
      );
    }

    if (body.password.length < 6) {
      return Response.json(
        { error: '密码至少需要6位' },
        { status: 400 }
      );
    }

    const existingUser = await env.DEALS_CACHE.get(`user:email:${body.email}`);
    if (existingUser) {
      return Response.json(
        { error: '该邮箱已被注册' },
        { status: 400 }
      );
    }

    const userId = generateToken();
    const user: User = {
      id: userId,
      email: body.email,
      nickname: body.nickname,
    };

    await env.DEALS_CACHE.put(`user:id:${userId}`, JSON.stringify(user), {
      expirationTtl: 31536000,
    });
    await env.DEALS_CACHE.put(`user:email:${body.email}`, userId, {
      expirationTtl: 31536000,
    });
    await env.DEALS_CACHE.put(`user:password:${userId}`, body.password, {
      expirationTtl: 31536000,
    });

    return Response.json({
      message: '注册成功',
      user: { id: userId, email: body.email, nickname: body.nickname },
    });
  } catch (error) {
    console.error('Register error:', error);
    return Response.json(
      { error: '注册失败' },
      { status: 500 }
    );
  }
}

export async function handleLogin(
  request: Request,
  env: Env
): Promise<Response> {
  try {
    const body: LoginRequest = await request.json();

    if (!body.email || !body.password) {
      return Response.json(
        { error: '缺少邮箱或密码' },
        { status: 400 }
      );
    }

    const userId = await env.DEALS_CACHE.get(`user:email:${body.email}`);
    if (!userId) {
      return Response.json(
        { error: '邮箱或密码错误' },
        { status: 401 }
      );
    }

    const storedPassword = await env.DEALS_CACHE.get(`user:password:${userId}`);
    if (storedPassword !== body.password) {
      return Response.json(
        { error: '邮箱或密码错误' },
        { status: 401 }
      );
    }

    const userStr = await env.DEALS_CACHE.get(`user:id:${userId}`);
    if (!userStr) {
      return Response.json(
        { error: '用户不存在' },
        { status: 401 }
      );
    }

    const user: User = JSON.parse(userStr);
    const token = generateToken();

    await env.DEALS_CACHE.put(`session:${token}`, userId, {
      expirationTtl: 604800,
    });

    return Response.json({
      message: '登录成功',
      token,
      user: { id: user.id, email: user.email, nickname: user.nickname },
    });
  } catch (error) {
    console.error('Login error:', error);
    return Response.json(
      { error: '登录失败' },
      { status: 500 }
    );
  }
}

export async function handleUserProfile(
  request: Request,
  env: Env
): Promise<Response> {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return Response.json(
      { error: '未授权' },
      { status: 401 }
    );
  }

  const token = authHeader.substring(7);
  const userId = await env.DEALS_CACHE.get(`session:${token}`);

  if (!userId) {
    return Response.json(
      { error: '登录已过期' },
      { status: 401 }
    );
  }

  const userStr = await env.DEALS_CACHE.get(`user:id:${userId}`);
  if (!userStr) {
    return Response.json(
      { error: '用户不存在' },
      { status: 401 }
    );
  }

  const user: User = JSON.parse(userStr);
  return Response.json({
    user: { id: user.id, email: user.email, nickname: user.nickname },
  });
}
