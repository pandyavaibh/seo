import { BarChart3, CheckSquare, Gauge, LayoutDashboard, Settings, UserCog, Users } from 'lucide-react'
import { NavLink } from 'react-router-dom'

import { useCurrentMember } from '@/features/team/use-current-member'
import { useMyOverdueTaskCount } from '@/features/tasks/use-tasks'
import { useAuth } from '@/providers/auth-provider'

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/clients', label: 'Clients', icon: Users },
  { to: '/tasks', label: 'Tasks', icon: CheckSquare },
]

export function Sidebar() {
  const { signOut } = useAuth()
  const { data: currentMember } = useCurrentMember()
  const { data: overdueCount } = useMyOverdueTaskCount(currentMember?.id)
  const isAdminOrManager = currentMember?.role === 'admin' || currentMember?.role === 'manager'
  let navItems = NAV_ITEMS
  if (isAdminOrManager) {
    navItems = [
      ...navItems,
      { to: '/assignments', label: 'Assignments', icon: UserCog },
      { to: '/workload', label: 'Workload', icon: Gauge },
      { to: '/performance', label: 'Performance', icon: BarChart3 },
    ]
  }
  if (currentMember?.role === 'admin') {
    navItems = [...navItems, { to: '/settings', label: 'Settings', icon: Settings }]
  }

  return (
    <aside className="bg-sidebar/90 backdrop-blur-xl border-r border-white/5 text-sidebar-text flex flex-col gap-6 p-[20px_14px] min-h-screen">
      <div className="flex items-center gap-[10px] px-2">
        <span className="w-[28px] h-[28px] rounded-[8px] bg-brand grid place-items-center font-mono text-[12px] font-semibold text-white shadow-[var(--shadow-sm)]">
          S
        </span>
        <span className="text-[14px] font-semibold text-white tracking-[-0.01em]">
          SEO CRM
        </span>
      </div>

      <nav className="flex flex-col gap-[2px]">
        {navItems.map((item) => {
          const Icon = item.icon
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                [
                  'relative flex items-center gap-[10px] w-full text-[13px] font-medium text-left pl-[11px] pr-3 py-[9px] rounded-[9px] transition-colors',
                  isActive
                    ? 'bg-sidebar-surface/80 backdrop-blur-sm text-white'
                    : 'text-sidebar-text-muted hover:text-white hover:bg-sidebar-surface/50',
                ].join(' ')
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <span className="absolute left-0 top-[6px] bottom-[6px] w-[3px] rounded-full bg-brand" />
                  )}
                  <Icon size={15} strokeWidth={2} className="flex-none opacity-80" />
                  <span className="flex-1">{item.label}</span>
                  {item.to === '/tasks' && !!overdueCount && (
                    <span className="flex-none min-w-[18px] h-[18px] px-[5px] rounded-full bg-signal-red text-white text-[10px] font-mono font-semibold grid place-items-center">
                      {overdueCount}
                    </span>
                  )}
                </>
              )}
            </NavLink>
          )
        })}
      </nav>

      <div className="mt-auto flex flex-col gap-2 p-[13px] border border-sidebar-border rounded-[11px] bg-sidebar-surface/40 backdrop-blur-sm">
        <span className="font-mono text-[10px] tracking-[0.12em] uppercase text-sidebar-label">
          Signed in{currentMember?.name ? ` as ${currentMember.name.split(' ')[0]}` : ''}
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
