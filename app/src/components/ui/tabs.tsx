import { NavLink } from 'react-router-dom'

import { cn } from '@/lib/utils'

export interface TabItem {
  to: string
  label: string
  end?: boolean
}

// Router-driven underline tabs — each tab is a real route (not client-side
// state), so the URL always reflects which tab is open: bookmarkable,
// survives a refresh, and back/forward work like every other page.
export function Tabs({ items, className }: { items: TabItem[]; className?: string }) {
  return (
    <nav className={cn('flex items-center gap-[2px] border-b border-border overflow-x-auto', className)}>
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          className="relative px-[14px] py-[10px] text-[13px] font-medium whitespace-nowrap no-underline text-ink-muted hover:text-ink transition-colors aria-[current=page]:text-ink"
        >
          {({ isActive }) => (
            <>
              {item.label}
              <span
                className={cn(
                  'absolute left-[10px] right-[10px] -bottom-px h-[2px] rounded-full transition-opacity',
                  isActive ? 'bg-brand opacity-100' : 'opacity-0',
                )}
              />
            </>
          )}
        </NavLink>
      ))}
    </nav>
  )
}
