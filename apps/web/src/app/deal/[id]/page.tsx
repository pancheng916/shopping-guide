'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Header from '@/components/Header';
import NavBar from '@/components/NavBar';
import Footer from '@/components/Footer';
import HotDeals from '@/components/HotDeals';
import DealCard from '@/components/DealCard';
import { mockDeals, mockProducts } from '@/lib/mock-data';
import { formatPrice, timeAgo } from '@/lib/utils';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth-store';
import type { Deal, Product, Comment } from '@shared/types';

interface DealDetailPageProps {
  params: { id: string };
}

export default function DealDetailPage({ params }: DealDetailPageProps) {
  const router = useRouter();
  const { isLoggedIn, user } = useAuthStore();
  const [deal, setDeal] = useState<Deal | null>(null);
  const [loading, setLoading] = useState(true);

  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [favorited, setFavorited] = useState(false);
  const [loadingLike, setLoadingLike] = useState(false);
  const [loadingFav, setLoadingFav] = useState(false);

  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState('');
  const [loadingComments, setLoadingComments] = useState(false);
  const [submittingComment, setSubmittingComment] = useState(false);
  const commentsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadDeal();
  }, [params.id]);

  useEffect(() => {
    if (deal) {
      loadInteractionStatus();
      loadComments();
    }
  }, [deal?.id, isLoggedIn]);

  const loadDeal = async () => {
    setLoading(true);
    try {
      const res = await api.deals.detail(params.id);
      setDeal(res as Deal);
    } catch (e) {
      const found = mockDeals.find((d) => d.id === params.id) || mockDeals[0];
      setDeal(found);
    } finally {
      setLoading(false);
    }
  };

  const loadInteractionStatus = async () => {
    if (!deal) return;
    try {
      const [likeRes, favRes] = await Promise.all([
        api.like.status(deal.id).catch(() => ({ liked: false, likeCount: 0 })),
        api.favorite.status(deal.id).catch(() => ({ favorited: false })),
      ]);
      setLiked(likeRes.liked || false);
      setLikeCount(likeRes.likeCount || deal.likeCount || 0);
      setFavorited(favRes.favorited || false);
    } catch (e) {
      // ignore
    }
  };

  const loadComments = async () => {
    if (!deal) return;
    setLoadingComments(true);
    try {
      const res = (await api.comments.list(deal.id)) as { comments: Comment[]; total: number };
      setComments(res.comments || []);
    } catch (e) {
      console.error('Load comments failed', e);
    } finally {
      setLoadingComments(false);
    }
  };

  const handleLike = async () => {
    if (!isLoggedIn) {
      router.push('/login');
      return;
    }
    if (loadingLike || !deal) return;
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

  const handleFavorite = async () => {
    if (!isLoggedIn) {
      router.push('/login');
      return;
    }
    if (loadingFav || !deal) return;
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

  const handleSubmitComment = async () => {
    if (!isLoggedIn) {
      router.push('/login');
      return;
    }
    if (!commentText.trim() || submittingComment || !deal) return;

    setSubmittingComment(true);
    try {
      const res = (await api.comments.add({
        dealId: deal.id,
        content: commentText.trim(),
        userName: user?.nickname || '匿名用户',
        userAvatar: user?.nickname?.charAt(0).toUpperCase() || 'U',
      })) as { comment: Comment };
      setComments([res.comment, ...comments]);
      setCommentText('');
    } catch (e) {
      console.error('Submit comment failed', e);
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleCopyCoupon = (code: string) => {
    navigator.clipboard.writeText(code);
  };

  if (loading || !deal) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-text-tertiary">加载中...</div>
      </div>
    );
  }

  const categoryName = (cat: string) => {
    switch (cat) {
      case 'electronics': return '电子电脑';
      case 'beauty': return '美妆护肤';
      case 'fashion': return '服饰手袋';
      case 'home-appliances': return '家居家电';
      case 'mom-baby': return '母婴儿童';
      case 'sports': return '运动户外';
      case 'toys': return '玩具游戏';
      default: return '全部';
    }
  };

  const tagColors: Record<string, string> = {
    discount: 'bg-red-50 text-red-600 border-red-100',
    hot: 'bg-orange-50 text-orange-600 border-orange-100',
    shipping: 'bg-green-50 text-green-600 border-green-100',
    new: 'bg-blue-50 text-blue-600 border-blue-100',
    limited: 'bg-purple-50 text-purple-600 border-purple-100',
  };

  const relatedDeals = mockDeals.filter((d) => d.id !== deal.id).slice(0, 3);

  return (
    <div className="min-h-screen bg-bg-body">
      <div className="bg-bg-body text-center py-1 px-4 text-[11px] font-normal tracking-wider text-[#C0B2A9]/95">
        <span>信息由用户或商家提供，本站核实后发布广告</span>
      </div>

      <Header />
      <NavBar />

      <main className="max-w-6xl mx-auto px-4 md:px-5 pb-10">
        <nav className="py-3 text-sm text-text-tertiary">
          <a href="/" className="hover:text-primary-500 transition-colors">首页</a>
          <span className="mx-2">/</span>
          <a href={`/category/${deal.category}`} className="hover:text-primary-500 transition-colors">
            {categoryName(deal.category)}
          </a>
          <span className="mx-2">/</span>
          <span className="text-text-primary line-clamp-1">{deal.title}</span>
        </nav>

        <div className="bg-white rounded-2xl shadow-sm border border-border-light overflow-hidden">
          <div className="p-5 md:p-8">
            <div className="flex items-center gap-2 mb-4 flex-wrap">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-orange-500 flex items-center justify-center text-white text-sm font-bold">
                {deal.store.charAt(0)}
              </div>
              <span className="text-base font-semibold text-text-primary">{deal.store}</span>
              <span className="text-xs text-text-tertiary">{timeAgo(deal.createdAt)}</span>
              <div className="flex items-center gap-1.5 flex-wrap ml-2">
                {deal.tags.map((tag, i) => (
                  <span
                    key={i}
                    className={`text-xs font-medium px-2.5 py-1 rounded-full border ${
                      tagColors[tag.type] || 'bg-gray-50 text-gray-600 border-gray-100'
                    }`}
                  >
                    {tag.name}
                  </span>
                ))}
              </div>
            </div>

            <h1 className="text-xl md:text-2xl font-bold text-text-primary leading-snug mb-3">
              {deal.title}
            </h1>

            {deal.maxDiscount > 0 && (
              <div className="bg-gradient-to-r from-primary-50 to-orange-50 rounded-xl px-5 py-4 mb-5 inline-flex items-center gap-4">
                <div className="text-3xl md:text-4xl font-extrabold text-primary-600">
                  -{deal.maxDiscount}%
                </div>
                <div className="text-sm text-text-secondary">
                  <div className="font-semibold text-text-primary mb-0.5">最高折扣</div>
                  <div>限时优惠，抓紧抢购</div>
                </div>
              </div>
            )}

            {deal.couponCode && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-5 mb-5 flex items-center justify-between">
                <div>
                  <div className="text-sm text-yellow-800 mb-1">🎁 专属优惠码</div>
                  <div className="text-2xl font-bold font-mono text-yellow-900">{deal.couponCode}</div>
                </div>
                <button
                  onClick={() => handleCopyCoupon(deal.couponCode!)}
                  className="px-6 py-2.5 bg-yellow-500 text-white rounded-full text-sm font-semibold hover:bg-yellow-600 transition-colors"
                >
                  复制优惠码
                </button>
              </div>
            )}

            <div className="flex items-center gap-5 pt-4 border-t border-border-light mt-5">
              <button
                onClick={handleLike}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-full cursor-pointer transition-all border ${
                  liked
                    ? 'bg-primary-50 border-primary-200 text-primary-500'
                    : 'border-border text-text-tertiary hover:bg-primary-50 hover:border-primary-200 hover:text-primary-500'
                }`}
              >
                <svg viewBox="0 0 24 24" fill={liked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={2} className="w-5 h-5">
                  <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
                </svg>
                <span className="text-sm font-medium">{liked ? '已点赞' : '点赞'}</span>
                {likeCount > 0 && <span className="text-sm">{likeCount}</span>}
              </button>

              <button
                onClick={handleFavorite}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-full cursor-pointer transition-all border ${
                  favorited
                    ? 'bg-pink-50 border-pink-200 text-pink-600'
                    : 'border-border text-text-tertiary hover:bg-pink-50 hover:border-pink-200 hover:text-pink-600'
                }`}
              >
                <svg viewBox="0 0 24 24" fill={favorited ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={2} className="w-5 h-5">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                </svg>
                <span className="text-sm font-medium">{favorited ? '已收藏' : '收藏'}</span>
              </button>

              <button className="flex items-center gap-2 px-5 py-2.5 rounded-full cursor-pointer transition-all border border-border text-text-tertiary hover:bg-primary-50 hover:border-primary-200 hover:text-primary-500">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
                  <circle cx="18" cy="5" r="3" />
                  <circle cx="6" cy="12" r="3" />
                  <circle cx="18" cy="19" r="3" />
                  <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                  <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                </svg>
                <span className="text-sm font-medium">分享</span>
              </button>

              <div className="ml-auto text-xs text-text-tertiary">
                {deal.viewCount?.toLocaleString()} 次浏览
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-border-light p-5 md:p-8 mt-6">
          <h2 className="text-xl font-bold text-text-primary mb-5 flex items-center gap-2.5">
            <div className="w-1 h-5 bg-primary-500 rounded-sm"></div>
            折扣详情
          </h2>
          <div
            className="prose prose-sm max-w-none text-text-secondary leading-relaxed
              prose-headings:text-text-primary
              prose-h3:text-lg prose-h3:font-bold prose-h3:mt-5 prose-h3:mb-3
              prose-p:my-3
              prose-ul:my-3 prose-ul:space-y-2
              prose-li:my-1
              prose-strong:text-primary-600"
            dangerouslySetInnerHTML={{ __html: deal.richContent || deal.description }}
          />
        </div>

        {deal.products && deal.products.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-border-light p-5 md:p-8 mt-6">
            <h2 className="text-xl font-bold text-text-primary mb-5 flex items-center gap-2.5">
              <div className="w-1 h-5 bg-primary-500 rounded-sm"></div>
              参与商品 ({deal.products.length})
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {deal.products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </div>
        )}

        <div id="comments" ref={commentsRef} className="bg-white rounded-2xl shadow-sm border border-border-light p-5 md:p-8 mt-6">
          <h2 className="text-xl font-bold text-text-primary mb-5 flex items-center gap-2.5">
            <div className="w-1 h-5 bg-primary-500 rounded-sm"></div>
            评论 ({comments.length})
          </h2>

          <div className="mb-6">
            <textarea
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder={isLoggedIn ? '说说你的看法...' : '登录后发表评论'}
              disabled={!isLoggedIn || submittingComment}
              className="w-full h-24 p-4 border border-border rounded-xl text-sm resize-none focus:border-primary-500 focus:outline-none transition-colors disabled:bg-bg-body disabled:cursor-not-allowed"
            />
            <div className="flex justify-end mt-3">
              <button
                onClick={handleSubmitComment}
                disabled={!commentText.trim() || submittingComment}
                className="px-6 py-2.5 bg-primary-500 text-white rounded-full text-sm font-semibold cursor-pointer transition-colors hover:bg-primary-600 disabled:bg-primary-300 disabled:cursor-not-allowed"
              >
                {submittingComment ? '发布中...' : '发表评论'}
              </button>
            </div>
          </div>

          {loadingComments ? (
            <div className="py-8 text-center text-text-tertiary text-sm">加载中...</div>
          ) : comments.length === 0 ? (
            <div className="py-8 text-center text-text-tertiary text-sm">暂无评论，快来抢沙发吧！</div>
          ) : (
            <div className="space-y-5">
              {comments.map((comment) => (
                <div key={comment.id} className="flex gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center text-white font-bold flex-shrink-0">
                    {comment.userAvatar || 'U'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2 mb-1">
                      <span className="text-sm font-semibold text-text-primary">{comment.userName}</span>
                      <span className="text-xs text-text-tertiary">{timeAgo(comment.createdAt)}</span>
                    </div>
                    <p className="text-sm text-text-secondary leading-relaxed">{comment.content}</p>
                    <div className="flex items-center gap-4 mt-2">
                      <button className="flex items-center gap-1 text-xs text-text-tertiary hover:text-primary-500 cursor-pointer transition-colors">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
                          <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
                        </svg>
                        <span>{comment.likes}</span>
                      </button>
                      <button className="text-xs text-text-tertiary hover:text-primary-500 cursor-pointer transition-colors">
                        回复
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-10">
          <h2 className="text-xl font-bold text-text-primary mb-4 flex items-center gap-2.5">
            <div className="w-1 h-5 bg-primary-500 rounded-sm"></div>
            相关折扣推荐
          </h2>
          {relatedDeals.map((d) => (
            <DealCard key={d.id} deal={d} />
          ))}
        </div>
      </main>

      <Footer />
    </div>
  );
}

function ProductCard({ product }: { product: Product }) {
  return (
    <a
      href={product.affiliateUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="group bg-bg-body rounded-xl overflow-hidden border border-border-light hover:border-primary-300 hover:shadow-md transition-all cursor-pointer"
    >
      <div className="w-full aspect-square relative bg-white flex items-center justify-center overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={product.imageUrl}
          alt={product.name}
          className="w-full h-full object-contain p-3 group-hover:scale-105 transition-transform"
        />
        {product.savingsPercent >= 20 && (
          <div
            className="absolute top-2 left-2 text-white text-xs font-bold px-2 py-0.5 rounded-md shadow"
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
      <div className="p-3">
        <div className="text-[11px] font-semibold text-text-tertiary uppercase tracking-wider mb-1">
          {product.brand}
        </div>
        <p className="text-sm text-text-primary line-clamp-2 leading-snug mb-2 h-10">
          {product.name}
        </p>
        <div className="flex items-baseline gap-2">
          <span className="text-lg font-bold text-text-price">{formatPrice(product.currentPrice)}</span>
          {product.originalPrice > product.currentPrice && (
            <span className="text-xs text-text-tertiary line-through">
              {formatPrice(product.originalPrice)}
            </span>
          )}
        </div>
        <div className="mt-2 text-xs text-center py-2 bg-primary-500 text-white rounded-lg font-medium group-hover:bg-primary-600 transition-colors">
          去购买 →
        </div>
      </div>
    </a>
  );
}
