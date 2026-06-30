'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import NavBar from '@/components/NavBar';
import Footer from '@/components/Footer';
import DealCard from '@/components/DealCard';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth-store';
import type { Deal, Product } from '@shared/types';

interface FavoriteRecord {
  dealId: string;
  dealTitle: string;
  dealImage: string;
  dealPrice: number;
  dealDiscount: number;
  createdAt: string;
}

export default function FavoritesPage() {
  const router = useRouter();
  const { isLoggedIn } = useAuthStore();
  const [favorites, setFavorites] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoggedIn) {
      router.push('/login');
      return;
    }
    loadFavorites();
  }, [isLoggedIn]);

  const loadFavorites = async () => {
    setLoading(true);
    try {
      const res = (await api.favorite.list()) as { favorites: FavoriteRecord[]; total: number };
      const deals: Deal[] = res.favorites.map((fav) => {
        const product: Product = {
          id: `fav-${fav.dealId}`,
          platform: 'amazon',
          platformId: fav.dealId,
          name: fav.dealTitle,
          brand: '',
          imageUrl: fav.dealImage,
          originalPrice: Math.round(fav.dealPrice / (1 - fav.dealDiscount / 100)),
          currentPrice: fav.dealPrice,
          savingsAmount: Math.round(fav.dealPrice * fav.dealDiscount / 100),
          savingsPercent: fav.dealDiscount,
          affiliateUrl: `https://www.amazon.com/dp/${fav.dealId}?tag=todaydeal-20`,
          rating: '4.5',
          reviewCount: 0,
          inStock: true,
        };
        return {
          id: fav.dealId,
          title: fav.dealTitle,
          store: 'Amazon',
          category: 'favorites',
          description: fav.dealTitle,
          richContent: '',
          tags: [{ name: `${fav.dealDiscount}% OFF`, type: 'discount' as const }],
          maxDiscount: fav.dealDiscount,
          products: [product],
          likeCount: 0,
          commentCount: 0,
          favoriteCount: 1,
          viewCount: 0,
          createdAt: fav.createdAt,
          updatedAt: fav.createdAt,
        };
      });
      setFavorites(deals);
    } catch (e) {
      console.error('Load favorites failed', e);
    } finally {
      setLoading(false);
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-text-tertiary">跳转中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-body">
      <div className="bg-bg-body text-center py-1 px-4 text-[11px] font-normal tracking-wider text-[#C0B2A9]/95">
        <span>信息由用户或商家提供，本站核实后发布广告</span>
      </div>

      <Header />
      <NavBar />

      <main className="max-w-6xl mx-auto px-4 md:px-5 pb-10">
        <div className="py-6 flex items-center gap-2.5">
          <div className="w-1 h-5 bg-primary-500 rounded-sm"></div>
          <h1 className="text-xl font-bold text-text-primary">我的收藏</h1>
          <span className="text-sm text-text-tertiary font-normal ml-3.5">
            共 {favorites.length} 条折扣
          </span>
        </div>

        {loading ? (
          <div className="text-center py-20 text-text-tertiary text-sm">加载中...</div>
        ) : favorites.length > 0 ? (
          <div className="pb-10">
            {favorites.map((deal) => (
              <DealCard key={deal.id} deal={deal} />
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <div className="w-20 h-20 mx-auto mb-4 text-text-tertiary/30">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-text-primary mb-2">还没有收藏</h3>
            <p className="text-sm text-text-tertiary mb-6">快去发现你喜欢的折扣吧</p>
            <a
              href="/"
              className="inline-block px-6 py-2.5 bg-primary-500 text-white rounded-full text-sm font-semibold hover:bg-primary-600 transition-colors"
            >
              去逛逛
            </a>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
