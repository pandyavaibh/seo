import { NavLink } from 'react-router-dom'

import { useAgencySettings } from '@/features/settings/use-agency-settings'
import { initials } from '@/lib/avatar'
import { useAuth } from '@/providers/auth-provider'

const PORTAL_NAV_ITEMS = [
  { to: '/portal', label: 'Overview', end: true },
  { to: '/portal/reports', label: 'Reports', end: false },
  { to: '/portal/invoices', label: 'Invoices', end: false },
]

export function PortalSidebar() {
  const { signOut } = useAuth()
  const { data: settings } = useAgencySettings()
  const agencyName = settings?.agencyName ?? 'SEO CRM'

  return (
    <aside className="bg-sidebar text-sidebar-text flex flex-col gap-6 p-[20px_14px] min-h-screen">
      <div className="flex items-center gap-[10px] px-2">
        {settings?.logoUrl ? (
          <img src={settings.logoUrl} alt={agencyName} className="h-[26px] w-auto rounded-[4px]" />
        ) : (
          <span className="w-[26px] h-[26px] rounded-[7px] bg-brand grid place-items-center font-mono text-[12px] font-semibold text-white">
            {initials(agencyName)}
          </span>
        )}
        <span className="text-[14px] font-semibold text-white tracking-[-0.01em]">{agencyName} portal</span>
      </div>

      <nav className="flex flex-col gap-[2px]">
        {PORTAL_NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              [
                'flex items-center justify-between gap-2 w-full text-[13px] font-medium text-left px-3 py-[9px] rounded-[8px]',
                isActive ? 'bg-sidebar-surface text-white' : 'text-sidebar-text-muted hover:text-white',
              ].join(' ')
            }
          >
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="mt-auto flex flex-col gap-2 p-[13px] border border-sidebar-border rounded-[10px]">
        <span className="font-mono text-[10px] tracking-[0.12em] uppercase text-sidebar-label">Signed in</span>
        <button onClick={signOut} className="text-left text-[11px] text-sidebar-label hover:text-white cursor-pointer">
          Sign out
        </button>
      </div>
    </aside>
  )
}
