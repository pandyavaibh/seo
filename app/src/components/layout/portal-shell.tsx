import { Outlet } from 'react-router-dom'

import { PortalSidebar } from '@/components/layout/portal-sidebar'

export function PortalShell() {
  return (
    <div className="grid grid-cols-[216px_minmax(0,1fr)] min-h-screen bg-paper text-ink">
      <PortalSidebar />
      <main className="px-[clamp(16px,3vw,32px)] pt-[22px] pb-[56px] flex flex-col gap-[18px] min-w-0">
        <Outlet />
      </main>
    </div>
  )
}
