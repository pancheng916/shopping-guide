'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAuthStore } from '@/store/auth-store';
import Header from '@/components/Header';
import NavBar from '@/components/NavBar';
import Footer from '@/components/Footer';

interface MenuItemProps {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  onClick: () => void;
  showArrow?: boolean;
  danger?: boolean;
}

function MenuItem({ icon, title, subtitle, onClick, showArrow = true, danger = false }: MenuItemProps) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-4 p-4 hover:bg-bg-hover transition-colors cursor-pointer"
    >
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
        danger ? 'bg-danger-50' : 'bg-primary-50'
      }`}>
        <span className={danger ? 'text-danger-500' : 'text-primary-500'}>
          {icon}
        </span>
      </div>
      <div className="flex-1 text-left">
        <div className={`text-sm font-medium ${danger ? 'text-danger-600' : 'text-text-primary'}`}>
          {title}
        </div>
        {subtitle && (
          <div className="text-xs text-text-tertiary mt-0.5">{subtitle}</div>
        )}
      </div>
      {showArrow && (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5 text-text-tertiary">
          <polyline points="9 18 15 12 9 6" />
        </svg>
      )}
    </button>
  );
}

export default function ProfilePage() {
  const router = useRouter();
  const { user, logout, isLoggedIn } = useAuthStore();

  useEffect(() => {
    if (!isLoggedIn) {
      router.push('/login');
    }
  }, [isLoggedIn, router]);

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-text-tertiary">跳转中...</div>
      </div>
    );
  }

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-bg-body">
      <div className="bg-bg-body text-center py-1 px-4 text-[11px] font-normal tracking-wider text-[#C0B2A9]/95">
        <span>信息由用户或商家提供，本文核实后发布广告</span>
      </div>

      <Header />
      <NavBar />

      <main className="max-w-6xl mx-auto px-4 md:px-5 pb-10">
        {/* 用户信息卡片 */}
        <div className="bg-white rounded-2xl shadow-sm border border-border-light p-6 mt-6">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center text-white text-3xl font-extrabold">
              {user?.nickname?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold text-text-primary">
                {user?.nickname || '用户'}
              </h2>
              <p className="text-sm text-text-tertiary mt-1">
                {user?.email || '未设置邮箱'}
              </p>
              <div className="flex items-center gap-2 mt-2">
                <span className="px-2 py-0.5 bg-primary-50 text-primary-600 text-xs font-medium rounded-full">
                  普通会员
                </span>
                <span className="px-2 py-0.5 bg-success-50 text-success-600 text-xs font-medium rounded-full">
                  积分: 0
                </span>
              </div>
            </div>
            <button
              onClick={() => router.push('/user/profile/edit')}
              className="px-4 py-2 border border-primary-500 text-primary-500 rounded-full text-sm font-medium cursor-pointer transition-colors hover:bg-primary-50"
            >
              编辑资料
            </button>
          </div>
        </div>

        {/* 快捷入口 */}
        <div className="bg-white rounded-2xl shadow-sm border border-border-light mt-4 overflow-hidden">
          <div className="grid grid-cols-4 divide-x divide-border-light">
            <button
              onClick={() => router.push('/user/favorites')}
              className="flex flex-col items-center py-5 hover:bg-bg-hover transition-colors cursor-pointer"
            >
              <div className="w-12 h-12 rounded-full bg-danger-50 flex items-center justify-center mb-2">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-6 h-6 text-danger-500">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                </svg>
              </div>
              <span className="text-xs font-medium text-text-secondary">我的收藏</span>
            </button>

            <button
              onClick={() => router.push('/user/notifications')}
              className="flex flex-col items-center py-5 hover:bg-bg-hover transition-colors cursor-pointer"
            >
              <div className="w-12 h-12 rounded-full bg-warning-50 flex items-center justify-center mb-2">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-6 h-6 text-warning-500">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                  <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                </svg>
              </div>
              <span className="text-xs font-medium text-text-secondary">消息通知</span>
            </button>

            <button
              onClick={() => router.push('/user/history')}
              className="flex flex-col items-center py-5 hover:bg-bg-hover transition-colors cursor-pointer"
            >
              <div className="w-12 h-12 rounded-full bg-primary-50 flex items-center justify-center mb-2">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-6 h-6 text-primary-500">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
              </div>
              <span className="text-xs font-medium text-text-secondary">浏览历史</span>
            </button>

            <button
              onClick={() => router.push('/user/coupons')}
              className="flex flex-col items-center py-5 hover:bg-bg-hover transition-colors cursor-pointer"
            >
              <div className="w-12 h-12 rounded-full bg-info-50 flex items-center justify-center mb-2">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-6 h-6 text-info-500">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
              </div>
              <span className="text-xs font-medium text-text-secondary">我的优惠券</span>
            </button>
          </div>
        </div>

        {/* 功能菜单 */}
        <div className="bg-white rounded-2xl shadow-sm border border-border-light mt-4 overflow-hidden">
          <div className="divide-y divide-border-light">
            <MenuItem
              icon={
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              }
              title="个人资料"
              subtitle="修改昵称、头像等信息"
              onClick={() => router.push('/user/profile/edit')}
            />

            <MenuItem
              icon={
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              }
              title="账户安全"
              subtitle="登录密码、支付密码设置"
              onClick={() => router.push('/user/security')}
            />

            <MenuItem
              icon={
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                  <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                </svg>
              }
              title="通知设置"
              subtitle="价格提醒、优惠通知"
              onClick={() => router.push('/user/notification-settings')}
            />

            <MenuItem
              icon={
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
                  <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
                  <line x1="12" y1="18" x2="12.01" y2="18" />
                </svg>
              }
              title="第三方账号"
              subtitle="绑定 Google / Facebook / Apple"
              onClick={() => router.push('/user/bindings')}
            />
          </div>
        </div>

        {/* 帮助与关于 */}
        <div className="bg-white rounded-2xl shadow-sm border border-border-light mt-4 overflow-hidden">
          <div className="divide-y divide-border-light">
            <MenuItem
              icon={
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
              }
              title="帮助与反馈"
              subtitle="遇到问题？联系我们"
              onClick={() => router.push('/help')}
            />

            <MenuItem
              icon={
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="16" x2="12" y2="12" />
                  <line x1="12" y1="8" x2="12.01" y2="8" />
                </svg>
              }
              title="关于我们"
              subtitle="了解今日折扣"
              onClick={() => router.push('/about')}
            />

            <MenuItem
              icon={
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                  <polyline points="10 9 9 9 8 9" />
                </svg>
              }
              title="用户协议"
              subtitle="服务条款、隐私政策"
              onClick={() => router.push('/terms')}
            />
          </div>
        </div>

        {/* 退出登录 */}
        <button
          onClick={handleLogout}
          className="w-full mt-6 py-4 bg-white rounded-2xl shadow-sm border border-border-light text-danger-600 text-base font-semibold cursor-pointer transition-colors hover:bg-danger-50"
        >
          退出登录
        </button>

        {/* 版本信息 */}
        <p className="text-center text-xs text-text-tertiary mt-6 pb-10">
          今日折扣 v1.0.0
        </p>
      </main>

      <Footer />
    </div>
  );
}
