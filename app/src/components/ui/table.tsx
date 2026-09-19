import * as React from 'react'

import { cn } from '@/lib/utils'

function Table({ className, ...props }: React.ComponentProps<'table'>) {
  return (
    <div className="overflow-x-auto">
      <table
        className={cn('w-full border-collapse text-[13px]', className)}
        {...props}
      />
    </div>
  )
}

function TableHeader({ className, ...props }: React.ComponentProps<'thead'>) {
  return (
    <thead
      className={cn('bg-surface-sunken text-left', className)}
      {...props}
    />
  )
}

function TableBody({ className, ...props }: React.ComponentProps<'tbody'>) {
  return <tbody className={cn(className)} {...props} />
}

function TableRow({
  className,
  clickable,
  ...props
}: React.ComponentProps<'tr'> & { clickable?: boolean }) {
  return (
    <tr
      className={cn(
        'border-b border-border-light-2',
        clickable && 'cursor-pointer hover:bg-surface-sunken',
        className,
      )}
      {...props}
    />
  )
}

function TableHead({ className, ...props }: React.ComponentProps<'th'>) {
  return (
    <th
      className={cn(
        'font-mono text-[10px] font-medium uppercase tracking-[0.1em] text-ink-muted px-[18px] py-[10px] border-b border-border-light',
        className,
      )}
      {...props}
    />
  )
}

function TableCell({ className, ...props }: React.ComponentProps<'td'>) {
  return (
    <td className={cn('px-[18px] py-[12px]', className)} {...props} />
  )
}

export { Table, TableHeader, TableBody, TableRow, TableHead, TableCell }
