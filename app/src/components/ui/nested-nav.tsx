import { ChevronDown } from 'lucide-react'
import * as React from 'react'
import { NavLink, useLocation } from 'react-router-dom'

import { cn } from '@/lib/utils'

export type NavEntry =
  | { type: 'link'; to: string; label: string; end?: boolean }
  | { type: 'group'; label: string; items: { to: string; label: string }[] }

function NestedNavLink({ to, label, end }: { to: string; label: string; end?: boolean }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        cn(
          'px-[10px] py-[8px] rounded-[8px] text-[13px] font-medium no-underline transition-colors',
          isActive ? 'bg-surface-sunken text-ink' : 'text-ink-muted hover:text-ink hover:bg-surface-sunken',
        )
      }
    >
      {label}
    </NavLink>
  )
}

function NestedNavGroup({
  label,
  items,
  currentPath,
}: {
  label: string
  items: { to: string; label: string }[]
  currentPath: string
}) {
  const hasActiveChild = items.some((c) => currentPath === c.to || currentPath.startsWith(`${c.to}/`))
  // No effect needed: "open" is either the user's own last toggle, or — if
  // they haven't touched this group yet — follows the active route.
  const [userToggle, setUserToggle] = React.useState<boolean | null>(null)
  const open = userToggle ?? hasActiveChild

  return (
    <div className="flex flex-col">
      <button
        onClick={() => setUserToggle(!open)}
        className="flex items-center justify-between gap-2 px-[10px] py-[8px] rounded-[8px] text-[13px] font-medium text-ink-muted hover:text-ink hover:bg-surface-sunken bg-transparent border-none cursor-pointer"
      >
        <span>{label}</span>
        <ChevronDown size={14} className={cn('transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="flex flex-col pl-[12px] ml-[10px] border-l border-border-light gap-[1px] mt-[1px]">
          {items.map((c) => (
            <NestedNavLink key={c.to} to={c.to} label={c.label} />
          ))}
        </div>
      )}
    </div>
  )
}

// A secondary, in-content sidebar for a nested section of the app (e.g. one
// client's pages) — flat links for single-view destinations, expandable
// groups only where there's a real cluster of sub-pages to group, same
// pattern SE Ranking's own per-project nav uses.
export function NestedNav({ items }: { items: NavEntry[] }) {
  const location = useLocation()
  return (
    <nav className="flex flex-col gap-[2px]">
      {items.map((item, i) =>
        item.type === 'link' ? (
          <NestedNavLink key={i} to={item.to} label={item.label} end={item.end} />
        ) : (
          <NestedNavGroup key={i} label={item.label} items={item.items} currentPath={location.pathname} />
        ),
      )}
    </nav>
  )
}
