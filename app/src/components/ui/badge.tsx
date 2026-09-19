import * as React from 'react'

import { cn } from '@/lib/utils'

type PillTone = 'green' | 'amber' | 'red' | 'neutral' | 'blue'

const TONE_CLASS: Record<PillTone, string> = {
  green: 'bg-pill-green-bg text-pill-green-fg',
  amber: 'bg-pill-amber-bg text-pill-amber-fg',
  red: 'bg-pill-red-bg text-pill-red-fg',
  neutral: 'bg-pill-neutral-bg text-pill-neutral-fg',
  blue: 'bg-pill-blue-bg text-pill-blue-fg',
}

interface BadgeProps extends React.ComponentProps<'span'> {
  tone?: PillTone
}

function Badge({ className, tone = 'neutral', ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-block text-[11.5px] font-medium px-[9px] py-[3px] rounded-full',
        TONE_CLASS[tone],
        className,
      )}
      {...props}
    />
  )
}

export { Badge }
export type { PillTone }
