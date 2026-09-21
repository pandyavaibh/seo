import { NavLink } from 'react-router-dom'

import { useAuth } from '@/providers/auth-provider'

const NAV_ITEMS = [
  { to: '/clients', label: 'Clients', count: null },
  { to: '/deals', label: 'Deals', count: null },
  { to: '/projects', label: 'Engagements', count: null },
  { to: '/templates', label: 'Templates', count: null },
  { to: '/capacity', label: 'Capacity', count: null },
  { to: '/utm-builder', label: 'UTM builder', count: null },
]

export function Sidebar() {
  const { signOut } = useAuth()

  return (
    <aside className="bg-sidebar text-sidebar-text flex flex-col gap-6 p-[20px_14px] min-h-screen">
      <div className="flex items-center gap-[10px] px-2">
        <span className="w-[26px] h-[26px] rounded-[7px] bg-brand grid place-items-center font-mono text-[12px] font-semibold text-white">
          S
        </span>
        <span className="text-[14px] font-semibold text-white tracking-[-0.01em]">
          SEO CRM
        </span>
      </div>

      <nav className="flex flex-col gap-[2px]">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              [
                'flex items-center justify-between gap-2 w-full text-[13px] font-medium text-left px-3 py-[9px] rounded-[8px]',
                isActive
                  ? 'bg-sidebar-surface text-white'
                  : 'text-sidebar-text-muted hover:text-white',
              ].join(' ')
            }
          >
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="mt-auto flex flex-col gap-2 p-[13px] border border-sidebar-border rounded-[10px]">
        <span className="font-mono text-[10px] tracking-[0.12em] uppercase text-sidebar-label">
          Signed in
        </span>
        <button
          onClick={signOut}
          className="text-left text-[11px] text-sidebar-label hover:text-white cursor-pointer"
        >
          Sign out
        </button>
      </div>
    </aside>
  )
}
