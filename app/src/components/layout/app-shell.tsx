import { Outlet } from 'react-router-dom'

import { Sidebar } from '@/components/layout/sidebar'

export function AppShell() {
  return (
    <div className="grid grid-cols-[216px_minmax(0,1fr)] min-h-screen bg-paper text-ink">
      <Sidebar />
      <main className="px-[clamp(16px,3vw,32px)] pt-[22px] pb-[56px] flex flex-col gap-[18px] min-w-0">
        <Outlet />
      </main>
    </div>
  )
}
