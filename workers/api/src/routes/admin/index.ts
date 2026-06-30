import type { Env } from '../../types';
import { Hono, type Context } from 'hono';
import { cors } from 'hono/cors';
import adminAuthRoutes from './auth';
import adminDealsRoutes from './deals';
import adminCategoriesRoutes from './categories';
import adminCommentsRoutes from './comments';
import adminProductsRoutes from './products';
import adminUsersRoutes from './users';
import adminStatsRoutes from './stats';
import adminSettingsRoutes from './settings';
import { errorResponse } from '../../utils/response';

const adminApp = new Hono<{ Bindings: Env }>().basePath('/api/admin');

adminApp.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  exposeHeaders: ['X-RateLimit-Remaining', 'X-RateLimit-Reset'],
  credentials: false,
}));

adminApp.route('/auth', adminAuthRoutes);
adminApp.route('/deals', adminDealsRoutes);
adminApp.route('/categories', adminCategoriesRoutes);
adminApp.route('/comments', adminCommentsRoutes);
adminApp.route('/products', adminProductsRoutes);
adminApp.route('/users', adminUsersRoutes);
adminApp.route('/stats', adminStatsRoutes);
adminApp.route('/settings', adminSettingsRoutes);

adminApp.all('*', (c: Context<{ Bindings: Env }>) => {
  return errorResponse(40401, '接口不存在', 404);
});

adminApp.onError((err, c) => {
  console.error('Admin API Error:', err);
  return errorResponse(50001, '服务器内部错误', 500);
});

export default adminApp;
