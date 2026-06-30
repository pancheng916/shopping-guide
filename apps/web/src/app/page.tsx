'use client';

import { useState, useEffect } from 'react';
import Header from '@/components/Header';
import NavBar from '@/components/NavBar';
import Footer from '@/components/Footer';
import HotDeals from '@/components/HotDeals';
import SectionHeader from '@/components/SectionHeader';
import DealCard from '@/components/DealCard';
import { api } from '@/lib/api';
import type { Deal, Product, SearchResult } from '@shared/types';

export default function Home() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [hotProducts, setHotProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const result = await api.deals.list({ page: 1 }) as SearchResult;
        if (result && Array.isArray(result.items)) {
          setDeals(result.items);
          const allProducts = result.items.flatMap((d: Deal) => d.products);
          const uniqueProducts = allProducts.filter(
            (p: Product, i: number, arr: Product[]) =>
              arr.findIndex((x) => x.id === p.id) === i
          );
          setHotProducts(uniqueProducts.slice(0, 8));
        }
      } catch (error) {
        console.error('Failed to fetch deals:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  return (
    <div className="min-h-screen bg-bg-body">
      <div className="bg-bg-body text-center py-1 px-4 text-[11px] font-normal tracking-wider text-[#C0B2A9]/95">
        <span>信息由用户或商家提供，本站核实后发布广告</span>
      </div>

      <Header />
      <NavBar />

      <main className="max-w-6xl mx-auto px-4 md:px-5 pb-10">
        <HotDeals products={hotProducts} />

        <SectionHeader title="推荐折扣" subtitle="实时更新，帮你蹲到好价" />

        {loading ? (
          <div className="py-20 text-center text-text-tertiary">加载中...</div>
        ) : (
          <div className="pb-10">
            {deals.map((deal) => (
              <DealCard key={deal.id} deal={deal} />
            ))}
          </div>
        )}

        <div className="flex justify-center pt-4">
          <button className="px-8 py-3 bg-white border border-border rounded-full text-sm font-medium text-text-secondary cursor-pointer transition-all hover:bg-primary-50 hover:border-primary-200 hover:text-primary-500">
            加载更多
          </button>
        </div>
      </main>

      <Footer />
    </div>
  );
}
