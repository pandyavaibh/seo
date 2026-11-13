import * as React from 'react'

import { cn } from '@/lib/utils'

function Card({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      className={cn(
        'bg-white/65 backdrop-blur-xl backdrop-saturate-150 border border-white/60 rounded-[16px] overflow-hidden shadow-[var(--shadow-md)]',
        className,
      )}
      {...props}
    />
  )
}

function CardHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      className={cn(
        'flex items-baseline justify-between gap-3 px-[18px] py-[15px] border-b border-white/50 bg-white/15',
        className,
      )}
      {...props}
    />
  )
}

function CardTitle({ className, ...props }: React.ComponentProps<'h2'>) {
  return (
    <h2
      className={cn('text-[14.5px] font-semibold m-0 tracking-[-0.01em]', className)}
      {...props}
    />
  )
}

function CardContent({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn(className)} {...props} />
}

export { Card, CardHeader, CardTitle, CardContent }
