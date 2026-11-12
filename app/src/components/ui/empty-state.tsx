import type { ComponentType } from 'react'

import { cn } from '@/lib/utils'

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon: ComponentType<{ size?: number; strokeWidth?: number; className?: string }>
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex flex-col items-center gap-[10px] text-center p-[32px_20px]', className)}>
      <span className="w-[44px] h-[44px] rounded-full bg-surface-sunken grid place-items-center">
        <Icon size={20} strokeWidth={1.75} className="text-ink-faint" />
      </span>
      <h3 className="m-0 text-[14.5px] font-semibold">{title}</h3>
      {description && <p className="m-0 max-w-[360px] text-[13px] text-ink-muted">{description}</p>}
      {action && <div className="mt-[4px]">{action}</div>}
    </div>
  )
}
