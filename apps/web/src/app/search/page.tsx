'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Header from '@/components/Header';
import NavBar from '@/components/NavBar';
import Footer from '@/components/Footer';
import DealCard from '@/components/DealCard';
import { api } from '@/lib/api';
import type { Deal, SearchResult } from '@shared/types';

export default function SearchPage() {
  const searchParams = useSearchParams();
  const query = searchParams.get('q') || '';
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSearchResults = async () => {
      if (!query) {
        setDeals([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const result = await api.deals.list({ keyword: query, page: 1 }) as SearchResult;
        if (result && Array.isArray(result.items)) {
          setDeals(result.items);
        }
      } catch (error) {
        console.error('Failed to fetch search results:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchSearchResults();
  }, [query]);

  return (
    <div className="min-h-screen bg-bg-body">
      <div className="bg-bg-body text-center py-1 px-4 text-[11px] font-normal tracking-wider text-[#C0B2A9]/95">
        <span>信息由用户或商家提供，本站核实后发布广告</span>
      </div>

      <Header />
      <NavBar />

      <main className="max-w-6xl mx-auto px-4 md:px-5 pb-10">
        <div className="py-6">
          <div className="flex items-center gap-2.5 mb-6">
            <div className="w-1 h-5 bg-primary-500 rounded-sm"></div>
            <h1 className="text-xl font-bold text-text-primary">
              搜索结果：<span className="text-primary-500">{query}</span>
            </h1>
            <span className="text-sm text-text-tertiary font-normal ml-2">
              共 {deals.length * 10} 条结果
            </span>
          </div>

          {loading ? (
            <div className="py-20 text-center text-text-tertiary">搜索中...</div>
          ) : deals.length > 0 ? (
            <div className="pb-10">
              {deals.map((deal) => (
                <DealCard key={deal.id} deal={deal} />
              ))}
            </div>
          ) : (
            <div className="text-center py-20">
              <div className="w-20 h-20 mx-auto mb-4 text-text-tertiary/30">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.35-4.35" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-text-primary mb-2">没有找到相关商品</h3>
              <p className="text-sm text-text-tertiary">试试其他关键词吧</p>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
