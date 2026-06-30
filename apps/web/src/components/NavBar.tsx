'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
import type { Category } from '@shared/types';

export default function NavBar() {
  const pathname = usePathname();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const data = await api.categories.list();
        if (Array.isArray(data)) {
          setCategories(data);
        }
      } catch (error) {
        console.error('Failed to fetch categories:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchCategories();
  }, []);

  const navItems = [
    { id: 'home', name: '首页', href: '/' },
    ...categories.map((c) => ({
      id: c.id,
      name: c.name,
      href: `/category/${c.slug}`,
    })),
  ];

  const isActive = (item: typeof navItems[0]) => {
    if (item.id === 'home') return pathname === '/';
    return pathname.startsWith(item.href);
  };

  if (loading) {
    return (
      <nav className="bg-primary-500 border-b border-border sticky top-16 z-40">
        <div className="max-w-6xl mx-auto px-4 md:px-5">
          <div className="flex items-center h-12 gap-0.5 overflow-x-auto scrollbar-hide">
            <div className="whitespace-nowrap px-4 py-2.5 text-sm font-medium text-white/75">
              加载中...
            </div>
          </div>
        </div>
      </nav>
    );
  }

  return (
    <nav className="bg-primary-500 border-b border-border sticky top-16 z-40">
      <div className="max-w-6xl mx-auto px-4 md:px-5">
        <div className="flex items-center h-12 gap-0.5 overflow-x-auto scrollbar-hide">
          {navItems.map((item) => (
            <Link
              key={item.id}
              href={item.href}
              className={cn(
                'whitespace-nowrap px-4 py-2.5 text-sm font-medium cursor-pointer transition-all border-b-2 border-transparent',
                isActive(item)
                  ? 'text-white border-b-white font-semibold'
                  : 'text-white/75 hover:text-white hover:bg-white/15'
              )}
            >
              {item.name}
            </Link>
          ))}
          <div className="ml-auto flex items-center gap-1 text-white/75 text-xs cursor-pointer px-3 py-2.5 whitespace-nowrap hover:text-white">
            更多
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3 h-3">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </div>
        </div>
      </div>
    </nav>
  );
}
