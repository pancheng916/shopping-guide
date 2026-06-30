'use client';

import { useState, useEffect } from 'react';
import Header from '@/components/Header';
import NavBar from '@/components/NavBar';
import Footer from '@/components/Footer';
import DealCard from '@/components/DealCard';
import { api } from '@/lib/api';
import type { Category, Deal, SearchResult } from '@shared/types';

interface PageProps {
  params: { slug: string };
}

export default function CategoryPage({ params }: PageProps) {
  const [category, setCategory] = useState<Category | null>(null);
  const [subCats, setSubCats] = useState<Category[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [categoriesData, dealsResult] = await Promise.all([
          api.categories.list() as Promise<Category[]>,
          api.deals.list({ category: params.slug, page: 1 }) as Promise<SearchResult>,
        ]);

        if (Array.isArray(categoriesData)) {
          const cat = categoriesData.find((c) => c.slug === params.slug);
          setCategory(cat || null);
          setSubCats(cat?.subCategories || []);
        }

        if (dealsResult && Array.isArray(dealsResult.items)) {
          setDeals(dealsResult.items);
        }
      } catch (error) {
        console.error('Failed to fetch category data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [params.slug]);

  return (
    <div className="min-h-screen bg-bg-body">
      <div className="bg-bg-body text-center py-1 px-4 text-[11px] font-normal tracking-wider text-[#C0B2A9]/95">
        <span>信息由用户或商家提供，本站核实后发布广告</span>
      </div>

      <Header />
      <NavBar />

      <main className="max-w-6xl mx-auto px-4 md:px-5 pb-10">
        {subCats.length > 0 && (
          <div className="bg-white py-3 px-0">
            <div className="flex gap-2 overflow-x-auto scrollbar-hide">
              {subCats.map((cat, i) => (
                <button
                  key={cat.id}
                  className={`whitespace-nowrap px-3.5 py-1.5 text-sm rounded-full border transition-all cursor-pointer ${
                    i === 0
                      ? 'bg-primary-500 text-white border-primary-500 font-medium'
                      : 'bg-bg-body text-text-secondary border-transparent hover:border-primary-200 hover:text-primary-500 hover:bg-primary-50'
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="py-6 flex items-center gap-2.5">
          <div className="w-1 h-5 bg-primary-500 rounded-sm"></div>
          <h1 className="text-xl font-bold text-text-primary">
            {category?.name || '全部折扣'}
          </h1>
          <span className="text-sm text-text-tertiary font-normal ml-3.5">
            共 {deals.length * 100} 条折扣
          </span>
        </div>

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
