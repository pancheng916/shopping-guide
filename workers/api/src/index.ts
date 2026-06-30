import type { Env } from './types';
import { handleDealsList, handleDealDetail } from './routes/deals';
import { handleCategoriesList } from './routes/categories';
import { handleSearchSuggest, handleSearch } from './routes/search';
import { handleRegister, handleLogin, handleUserProfile } from './routes/user';
import {
  handleToggleLike,
  handleGetLikeStatus,
  handleToggleFavorite,
  handleGetFavoriteStatus,
  handleGetFavoriteList,
  handleGetComments,
  handleAddComment,
} from './routes/interactions';
import adminApp from './routes/admin';

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    if (path.startsWith('/api/admin/')) {
      return adminApp.fetch(request, env, ctx);
    }

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {

      if (path === '/api/health' || path === '/health') {
        return Response.json(
          { status: 'ok', timestamp: new Date().toISOString() },
          { headers: corsHeaders }
        );
      }

      // 清除分类缓存
      if (path === '/api/cache/clear' && request.method === 'DELETE') {
        const url = new URL(request.url);
        const key = url.searchParams.get('key');
        if (key) {
          await env.DEALS_CACHE.delete(key);
          return Response.json({ success: true, message: `Cache cleared: ${key}` }, { headers: corsHeaders });
        }
        return Response.json({ error: 'Missing key parameter' }, { status: 400, headers: corsHeaders });
      }

      if (path === '/api/deals' && request.method === 'GET') {
        const response = await handleDealsList(request, env);
        return new Response(response.body, {
          headers: { ...Object.fromEntries(response.headers), ...corsHeaders },
          status: response.status,
        });
      }

      if (path.startsWith('/api/deals/') && request.method === 'GET') {
        const id = path.replace('/api/deals/', '');
        if (id && id.length > 0) {
          const response = await handleDealDetail(request, env, id);
          return new Response(response.body, {
            headers: { ...Object.fromEntries(response.headers), ...corsHeaders },
            status: response.status,
          });
        }
      }

      if (path === '/api/categories' && request.method === 'GET') {
        const response = await handleCategoriesList(request, env);
        return new Response(response.body, {
          headers: { ...Object.fromEntries(response.headers), ...corsHeaders },
          status: response.status,
        });
      }

      if (path === '/api/search' && request.method === 'GET') {
        const response = await handleSearch(request, env);
        return new Response(response.body, {
          headers: { ...Object.fromEntries(response.headers), ...corsHeaders },
          status: response.status,
        });
      }

      if (path === '/api/search/suggest' && request.method === 'GET') {
        const response = await handleSearchSuggest(request, env);
        return new Response(response.body, {
          headers: { ...Object.fromEntries(response.headers), ...corsHeaders },
          status: response.status,
        });
      }

      if (path === '/api/user/register' && request.method === 'POST') {
        const response = await handleRegister(request, env);
        return new Response(response.body, {
          headers: { ...Object.fromEntries(response.headers), ...corsHeaders },
          status: response.status,
        });
      }

      if (path === '/api/user/login' && request.method === 'POST') {
        const response = await handleLogin(request, env);
        return new Response(response.body, {
          headers: { ...Object.fromEntries(response.headers), ...corsHeaders },
          status: response.status,
        });
      }

      if (path === '/api/user/profile' && request.method === 'GET') {
        const response = await handleUserProfile(request, env);
        return new Response(response.body, {
          headers: { ...Object.fromEntries(response.headers), ...corsHeaders },
          status: response.status,
        });
      }

      // 点赞
      if (path === '/api/like/toggle' && request.method === 'POST') {
        const response = await handleToggleLike(request, env);
        return new Response(response.body, {
          headers: { ...Object.fromEntries(response.headers), ...corsHeaders },
          status: response.status,
        });
      }

      if (path === '/api/like/status' && request.method === 'GET') {
        const response = await handleGetLikeStatus(request, env);
        return new Response(response.body, {
          headers: { ...Object.fromEntries(response.headers), ...corsHeaders },
          status: response.status,
        });
      }

      // 收藏
      if (path === '/api/favorite/toggle' && request.method === 'POST') {
        const response = await handleToggleFavorite(request, env);
        return new Response(response.body, {
          headers: { ...Object.fromEntries(response.headers), ...corsHeaders },
          status: response.status,
        });
      }

      if (path === '/api/favorite/status' && request.method === 'GET') {
        const response = await handleGetFavoriteStatus(request, env);
        return new Response(response.body, {
          headers: { ...Object.fromEntries(response.headers), ...corsHeaders },
          status: response.status,
        });
      }

      if (path === '/api/favorite/list' && request.method === 'GET') {
        const response = await handleGetFavoriteList(request, env);
        return new Response(response.body, {
          headers: { ...Object.fromEntries(response.headers), ...corsHeaders },
          status: response.status,
        });
      }

      // 评论
      if (path === '/api/comments' && request.method === 'GET') {
        const response = await handleGetComments(request, env);
        return new Response(response.body, {
          headers: { ...Object.fromEntries(response.headers), ...corsHeaders },
          status: response.status,
        });
      }

      if (path === '/api/comments' && request.method === 'POST') {
        const response = await handleAddComment(request, env);
        return new Response(response.body, {
          headers: { ...Object.fromEntries(response.headers), ...corsHeaders },
          status: response.status,
        });
      }

      return Response.json(
        { error: 'Not Found', path },
        { status: 404, headers: corsHeaders }
      );
    } catch (error: any) {
      console.error('API Error:', error);
      return Response.json(
        { error: 'Internal Server Error', message: error.message },
        { status: 500, headers: corsHeaders }
      );
    }
  },
};
