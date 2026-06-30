'use client';

import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '@/store/auth-store';

export default function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isLoggedIn, logout } = useAuthStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [showUserMenu, setShowUserMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const url = new URL(window.location.href);
    const q = url.searchParams.get('q');
    if (q) {
      setSearchQuery(q);
    } else {
      setSearchQuery('');
    }
  }, [pathname]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const handleLogout = () => {
    logout();
    setShowUserMenu(false);
    router.push('/');
  };

  const handleProtectedAction = (path: string) => {
    if (!isLoggedIn) {
      router.push('/login');
    } else {
      router.push(path);
    }
  };

  return (
    <header className="bg-white border-b border-border shadow-sm sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 md:px-5">
        <div className="flex items-center h-16 gap-6">
          <Link href="/" className="flex items-center gap-2.5 flex-shrink-0">
            <div className="w-9 h-9 bg-gradient-to-br from-primary-500 to-primary-600 rounded-md flex items-center justify-center text-white font-extrabold text-lg">
              $
            </div>
            <div className="text-xl font-bold text-text-primary tracking-tight">
              <span className="text-primary-500">今日</span>折扣
            </div>
          </Link>

          <form onSubmit={handleSearch} className="flex-1 max-w-md relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索商品、品牌、折扣..."
              className="w-full h-10 border-2 border-border rounded-full px-4 pr-11 text-sm bg-bg-body focus:border-primary-500 focus:bg-white focus:outline-none transition-all font-sans"
            />
            <button
              type="submit"
              className="absolute right-1 top-1 w-8 h-8 bg-primary-500 border-none rounded-full cursor-pointer flex items-center justify-center transition-colors hover:bg-primary-600"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-4 h-4 text-white">
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
              </svg>
            </button>
          </form>

          <div className="flex items-center gap-2 flex-shrink-0">
            <button className="hidden sm:flex items-center gap-1.5 px-4 py-2 bg-primary-50 border border-primary-200 rounded-full text-xs font-semibold text-primary-500 cursor-pointer transition-all hover:bg-primary-100 hover:border-primary-300">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              <span>下载App</span>
            </button>

            <button
              onClick={() => handleProtectedAction('/user/favorites')}
              className="relative w-10 h-10 flex items-center justify-center bg-none border-none rounded-full cursor-pointer transition-colors text-text-secondary hover:bg-bg-body hover:text-primary-500"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
              {isLoggedIn && (
                <span className="absolute top-0.5 right-0.5 min-w-4 h-4 bg-primary-500 text-white text-xs font-bold rounded-full flex items-center justify-center px-1">
                  3
                </span>
              )}
            </button>

            <button
              onClick={() => handleProtectedAction('/user/notifications')}
              className="relative w-10 h-10 flex items-center justify-center bg-none border-none rounded-full cursor-pointer transition-colors text-text-secondary hover:bg-bg-body hover:text-primary-500"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
              {isLoggedIn && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-danger-500 rounded-full border-2 border-white"></span>
              )}
            </button>

            {isLoggedIn ? (
              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-2 px-1 py-1 pr-3 bg-bg-body rounded-full cursor-pointer transition-colors hover:bg-primary-50"
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center text-white text-sm font-bold">
                    {user?.nickname?.charAt(0).toUpperCase() || 'U'}
                  </div>
                  <span className="text-sm font-medium text-text-primary hidden md:block">
                    {user?.nickname || '用户'}
                  </span>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4 text-text-tertiary">
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>

                {showUserMenu && (
                  <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-lg border border-border-light overflow-hidden z-50">
                    <div className="px-4 py-3 border-b border-border-light bg-primary-50/50">
                      <p className="text-sm font-semibold text-text-primary">{user?.nickname}</p>
                      <p className="text-xs text-text-tertiary truncate">{user?.email}</p>
                    </div>
                    <div className="py-1">
                      <button
                        onClick={() => {
                          setShowUserMenu(false);
                          router.push('/user/profile');
                        }}
                        className="w-full px-4 py-2.5 text-left text-sm text-text-secondary hover:bg-bg-body hover:text-primary-500 transition-colors flex items-center gap-2"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
                          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                          <circle cx="12" cy="7" r="4" />
                        </svg>
                        个人中心
                      </button>
                      <button
                        onClick={() => {
                          setShowUserMenu(false);
                          router.push('/user/favorites');
                        }}
                        className="w-full px-4 py-2.5 text-left text-sm text-text-secondary hover:bg-bg-body hover:text-primary-500 transition-colors flex items-center gap-2"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
                          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                        </svg>
                        我的收藏
                      </button>
                      <button
                        onClick={() => {
                          setShowUserMenu(false);
                          router.push('/user/notifications');
                        }}
                        className="w-full px-4 py-2.5 text-left text-sm text-text-secondary hover:bg-bg-body hover:text-primary-500 transition-colors flex items-center gap-2"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
                          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                        </svg>
                        消息通知
                      </button>
                    </div>
                    <div className="py-1 border-t border-border-light">
                      <button
                        onClick={handleLogout}
                        className="w-full px-4 py-2.5 text-left text-sm text-danger-600 hover:bg-danger-50 transition-colors flex items-center gap-2"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
                          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                          <polyline points="16 17 21 12 16 7" />
                          <line x1="21" y1="12" x2="9" y2="12" />
                        </svg>
                        退出登录
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={() => router.push('/login')}
                className="px-5 py-2 bg-primary-500 text-white border-none rounded-full text-xs font-semibold cursor-pointer transition-colors hover:bg-primary-600 font-sans"
              >
                登录
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
