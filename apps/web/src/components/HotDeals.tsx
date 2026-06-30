import type { Product } from '@shared/types';
import { formatPrice } from '@/lib/utils';
import SectionHeader from './SectionHeader';

interface HotDealsProps {
  products: Product[];
}

const gradients = [
  { bg: '#FFF7ED', grad: 'linear-gradient(135deg,#F97316,#FB923C)' },
  { bg: '#FEF2F2', grad: 'linear-gradient(135deg,#EF4444,#F87171)' },
  { bg: '#EFF6FF', grad: 'linear-gradient(135deg,#3B82F6,#60A5FA)' },
  { bg: '#F0FDF4', grad: 'linear-gradient(135deg,#22C55E,#4ADE80)' },
  { bg: '#FAF5FF', grad: 'linear-gradient(135deg,#A855F7,#C084FC)' },
  { bg: '#FFFBEB', grad: 'linear-gradient(135deg,#F59E0B,#FBBF24)' },
  { bg: '#FDF2F8', grad: 'linear-gradient(135deg,#EC4899,#F472B6)' },
  { bg: '#FFF1F2', grad: 'linear-gradient(135deg,#F43F5E,#FB7185)' },
];

export default function HotDeals({ products }: HotDealsProps) {
  return (
    <section className="mt-4">
      <SectionHeader title="热门折扣" />
      <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-2">
        {products.map((product, index) => (
          <a
            key={product.id}
            href={product.affiliateUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="min-w-[160px] max-w-[180px] md:min-w-[260px] md:max-w-[280px] flex-shrink-0 bg-white rounded-2xl border border-border-light cursor-pointer transition-all hover:shadow-lg hover:-translate-y-1 flex flex-col relative"
            style={{
              background: `linear-gradient(to bottom, ${gradients[index % gradients.length].bg}, white)`,
            }}
          >
            <div className="w-full aspect-[4/3] flex items-center justify-center overflow-hidden relative rounded-t-2xl">
              {product.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={product.imageUrl}
                  alt={product.name}
                  className="w-full h-full object-contain p-3 md:p-4"
                />
              ) : (
                <div
                  className="text-4xl md:text-5xl font-extrabold text-white w-[72px] h-[72px] md:w-[88px] md:h-[88px] flex items-center justify-center rounded-full"
                  style={{
                    background: gradients[index % gradients.length].grad,
                    textShadow: '0 2px 8px rgba(0,0,0,0.1)',
                  }}
                >
                  {product.brand?.charAt(0) || '$'}
                </div>
              )}
              {product.savingsPercent >= 20 && (
                <div
                  className="absolute top-2.5 left-2.5 z-10 w-12 h-12 md:w-14 md:h-14 rounded-full flex flex-col items-center justify-center text-white font-extrabold leading-tight shadow-md"
                  style={{
                    background:
                      product.savingsPercent >= 40
                        ? 'linear-gradient(135deg, #DC2626, #EF4444)'
                        : 'linear-gradient(135deg, #EA580C, #F97316)',
                  }}
                >
                  <span className="text-sm md:text-base">{product.savingsPercent}%</span>
                  <span className="text-[9px] md:text-[10px] opacity-90">OFF</span>
                </div>
              )}
            </div>

            <div className="p-3.5 md:p-4 flex-1 flex flex-col">
              <div className="text-[11px] md:text-xs font-semibold text-text-tertiary uppercase tracking-wider mb-1">
                {product.brand || product.platform.toUpperCase()}
              </div>
              <h3 className="text-sm md:text-base font-semibold leading-snug text-text-primary line-clamp-2 mb-2">
                {product.name}
              </h3>
              <div className="text-xl md:text-2xl font-bold text-text-price mt-auto pt-2">
                {formatPrice(product.currentPrice)}
              </div>
            </div>
          </a>
        ))}
      </div>
    </section>
  );
}
