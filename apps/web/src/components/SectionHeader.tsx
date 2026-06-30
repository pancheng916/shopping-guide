interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  moreText?: string;
  moreHref?: string;
}

export default function SectionHeader({
  title,
  subtitle,
  moreText = '查看更多',
  moreHref = '#',
}: SectionHeaderProps) {
  return (
    <div className="flex items-baseline justify-between py-6 md:py-6 gap-3 flex-wrap">
      <div className="flex items-center gap-2.5">
        <div className="w-1 h-5 bg-primary-500 rounded-sm"></div>
        <h2 className="text-xl md:text-xl font-bold text-text-primary">{title}</h2>
        {subtitle && (
          <span className="text-sm text-text-tertiary font-normal ml-3.5">
            {subtitle}
          </span>
        )}
      </div>
      {moreText && (
        <a
          href={moreHref}
          className="text-sm text-text-tertiary cursor-pointer flex items-center gap-1 transition-colors hover:text-primary-500"
        >
          {moreText}
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3.5 h-3.5">
            <path d="M9 18l6-6-6-6" />
          </svg>
        </a>
      )}
    </div>
  );
}
