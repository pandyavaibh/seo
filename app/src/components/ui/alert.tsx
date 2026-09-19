import * as React from 'react'

import { cn } from '@/lib/utils'

function Alert({
  className,
  variant = 'default',
  ...props
}: React.ComponentProps<'div'> & { variant?: 'default' | 'destructive' }) {
  return (
    <div
      role="alert"
      className={cn(
        'rounded-[10px] border px-4 py-3 text-[13px] flex flex-col gap-1',
        variant === 'destructive'
          ? 'border-pill-red-fg/30 bg-pill-red-bg text-pill-red-fg'
          : 'border-border bg-surface-sunken text-ink-secondary',
        className,
      )}
      {...props}
    />
  )
}

function AlertTitle({ className, ...props }: React.ComponentProps<'p'>) {
  return (
    <p className={cn('font-medium text-[13.5px] m-0', className)} {...props} />
  )
}

function AlertDescription({ className, ...props }: React.ComponentProps<'p'>) {
  return <p className={cn('m-0 opacity-90', className)} {...props} />
}

export { Alert, AlertTitle, AlertDescription }
