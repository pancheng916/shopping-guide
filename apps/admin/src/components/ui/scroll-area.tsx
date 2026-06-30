import * as React from 'react'
import { cn } from '@/lib/utils'

export interface ScrollAreaProps extends React.HTMLAttributes<HTMLDivElement> {
  orientation?: 'vertical' | 'horizontal' | 'both'
}

const ScrollArea = React.forwardRef<HTMLDivElement, ScrollAreaProps>(
  ({ className, children, orientation = 'vertical', ...props }, ref) => (
    <div
      ref={ref}
      className={cn('relative overflow-hidden', className)}
      {...props}
    >
      <div
        className={cn(
          'h-full w-full rounded-[inherit]',
          orientation === 'vertical' && 'overflow-y-auto overflow-x-hidden',
          orientation === 'horizontal' && 'overflow-x-auto overflow-y-hidden',
          orientation === 'both' && 'overflow-auto'
        )}
      >
        {children}
      </div>
      {orientation !== 'horizontal' && (
        <div className="absolute right-0 top-0 bottom-0 w-2 pointer-events-none">
          <div className="h-full w-full rounded-full bg-gradient-to-l from-border/80 to-transparent opacity-0 hover:opacity-100 transition-opacity" />
        </div>
      )}
    </div>
  )
)
ScrollArea.displayName = 'ScrollArea'

export { ScrollArea }
