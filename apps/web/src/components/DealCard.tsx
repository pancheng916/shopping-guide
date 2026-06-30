'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { formatPrice, timeAgo } from '@/lib/utils';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth-store';
import type { Deal, Product } from '@shared/types';

interface DealCardProps {
  deal: Deal;
}

export default function DealCard({ deal }: DealCardProps) {
  const router = useRouter();
  const { isLoggedIn } = useAuthStore();
  const [liked, setLiked] = useState(false);
  const [favorited, setFavorited] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [loadingLike, setLoadingLike] = useState(false);
  const [loadingFav, setLoadingFav] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    loadStatus();
  }, [deal.id, isLoggedIn]);

  const loadStatus = async () => {
    try {
      const [likeRes, favRes] = await Promise.all([
        api.like.status(deal.id).catch(() => ({ liked: false, likeCount: 0 })),
        api.favorite.status(deal.id).catch(() => ({ favorited: false })),
      ]) as [{ liked: boolean; likeCount: number }, { favorited: boolean }];
      setLiked(likeRes.liked || false);
      setLikeCount(likeRes.likeCount || deal.likeCount || 0);
      setFavorited(favRes.favorited || false);
    } catch (e) {
      // ignore
    }
  };

  const handleLike = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isLoggedIn) {
      router.push('/login');
      return;
    }
    if (loadingLike) return;
    setLoadingLike(true);
    try {
      const res = (await api.like.toggle(deal.id)) as { liked: boolean; likeCount: number };
      setLiked(res.liked);
      setLikeCount(res.likeCount);
    } catch (e) {
      console.error('Like failed', e);
    } finally {
      setLoadingLike(false);
    }
  };

  const handleFavorite = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isLoggedIn) {
      router.push('/login');
      return;
    }
    if (loadingFav) return;
    setLoadingFav(true);
    try {
      const mainProduct = deal.products[0];
      const res = (await api.favorite.toggle({
        dealId: deal.id,
        dealTitle: deal.title,
        dealImage: mainProduct?.imageUrl || '',
        dealPrice: mainProduct?.currentPrice || 0,
        dealDiscount: deal.maxDiscount,
      })) as { favorited: boolean };
      setFavorited(res.favorited);
    } catch (e) {
      console.error('Favorite failed', e);
    } finally {
      setLoadingFav(false);
    }
  };

  const tagColors: Record<string, string> = {
    discount: 'bg-red-50 text-red-600 border-red-100',
    hot: 'bg-orange-50 text-orange-600 border-orange-100',
    shipping: 'bg-green-50 text-green-600 border-green-100',
    new: 'bg-blue-50 text-blue-600 border-blue-100',
    limited: 'bg-purple-50 text-purple-600 border-purple-100',
  };

  return (
    <div className="bg-white rounded-2xl mb-4 shadow-sm border border-border-light hover:shadow-md hover:border-primary-200 transition-all overflow-hidden">
      <div className="p-4 md:p-5">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-primary-500 to-orange-500 flex items-center justify-center text-white text-xs font-bold">
            {deal.store.charAt(0)}
          </div>
          <span className="text-sm font-semibold text-text-primary">{deal.store}</span>
          <span className="text-xs text-text-tertiary">{timeAgo(deal.createdAt)}</span>
          <div className="ml-auto flex items-center gap-1.5">
            {deal.tags.slice(0, 3).map((tag, i) => (
              <span
                key={i}
                className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${
                  tagColors[tag.type] || 'bg-gray-50 text-gray-600 border-gray-100'
                }`}
              >
                {tag.name}
              </span>
            ))}
          </div>
        </div>

        <Link href={`/deal/${deal.id}`} className="block">
          <h2 className="text-lg font-bold text-text-primary leading-snug mb-2 hover:text-primary-500 transition-colors line-clamp-2">
            {deal.title}
          </h2>
        </Link>

        <p
          className={`text-sm text-text-secondary leading-relaxed mb-4 ${
            expanded ? '' : 'line-clamp-2'
          }`}
        >
          {deal.description}
        </p>
        {deal.description.length > 80 && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-xs text-primary-500 mb-3 hover:underline"
          >
            {expanded ? '收起' : '展开更多'}
          </button>
        )}

        {deal.couponCode && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2 mb-4 flex items-center justify-between">
            <span className="text-sm text-yellow-800 font-medium">
              🎁 优惠码：<span className="font-bold font-mono">{deal.couponCode}</span>
            </span>
            <button
              onClick={() => navigator.clipboard.writeText(deal.couponCode!)}
              className="text-xs bg-yellow-500 text-white px-3 py-1 rounded-full hover:bg-yellow-600 transition-colors"
            >
              复制
            </button>
          </div>
        )}

        {deal.products && deal.products.length > 0 && (
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1">
            {deal.products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}

        <div className="flex items-center gap-4 pt-3 border-t border-border-light mt-2">
          <button
            onClick={handleLike}
            className={`flex items-center gap-1.5 text-sm cursor-pointer px-3 py-1.5 rounded-md transition-all border ${
              liked
                ? 'bg-primary-50 border-primary-200 text-primary-500'
                : 'border-border text-text-tertiary hover:bg-primary-50 hover:border-primary-200 hover:text-primary-500'
            }`}
          >
            <svg viewBox="0 0 24 24" fill={liked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={2} className="w-4 h-4">
              <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
            </svg>
            <span className="text-xs font-medium">{liked ? '已点赞' : '点赞'}</span>
            {likeCount > 0 && <span className="text-xs">{likeCount}</span>}
          </button>

          <Link
            href={`/deal/${deal.id}#comments`}
            className="flex items-center gap-1.5 text-sm text-text-tertiary cursor-pointer hover:text-primary-500 transition-colors"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            <span className="text-xs">{deal.commentCount || 0}</span>
          </Link>

          <button
            onClick={handleFavorite}
            className={`flex items-center gap-1.5 text-sm cursor-pointer px-3 py-1.5 rounded-md transition-all border ${
              favorited
                ? 'bg-pink-50 border-pink-200 text-pink-600'
                : 'border-border text-text-tertiary hover:bg-pink-50 hover:border-pink-200 hover:text-pink-600'
            }`}
          >
            <svg viewBox="0 0 24 24" fill={favorited ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={2} className="w-4 h-4">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
            <span className="text-xs font-medium">{favorited ? '已收藏' : '收藏'}</span>
          </button>

          <Link
            href={`/deal/${deal.id}`}
            className="ml-auto px-5 py-2 bg-primary-500 text-white border-none rounded-full text-xs font-semibold cursor-pointer transition-colors hover:bg-primary-600 font-sans inline-flex items-center gap-1"
          >
            查看详情
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-3.5 h-3.5">
              <path d="M9 18l6-6-6-6" />
            </svg>
          </Link>
        </div>
      </div>
    </div>
  );
}

function ProductCard({ product }: { product: Product }) {
  return (
    <a
      href={product.affiliateUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="flex-shrink-0 w-[120px] md:w-[150px] bg-bg-body rounded-xl overflow-hidden border border-border-light hover:border-primary-300 hover:shadow-md transition-all cursor-pointer group"
    >
      <div className="w-full aspect-[4/3] relative bg-white flex items-center justify-center overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={product.imageUrl}
          alt={product.name}
          className="w-full h-full object-contain p-2.5 group-hover:scale-105 transition-transform"
        />
        {product.savingsPercent >= 20 && (
          <div
            className="absolute top-1.5 left-1.5 text-white text-[11px] font-bold px-2 py-0.5 rounded-md shadow-sm"
            style={{
              background:
                product.savingsPercent >= 40
                  ? 'linear-gradient(135deg, #DC2626, #EF4444)'
                  : 'linear-gradient(135deg, #EA580C, #F97316)',
            }}
          >
            -{product.savingsPercent}%
          </div>
        )}
      </div>
      <div className="p-2.5">
        <p className="text-xs text-text-primary line-clamp-2 leading-snug mb-1.5 h-9">
          {product.name}
        </p>
        <div className="flex items-baseline gap-1.5">
          <span className="text-base font-bold text-text-price">{formatPrice(product.currentPrice)}</span>
          {product.originalPrice > product.currentPrice && (
            <span className="text-xs text-text-tertiary line-through">
              {formatPrice(product.originalPrice)}
            </span>
          )}
        </div>
      </div>
    </a>
  );
}
