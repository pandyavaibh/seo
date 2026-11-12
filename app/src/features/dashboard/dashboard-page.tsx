import { Link } from 'react-router-dom'

import { Badge, type PillTone } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  useAgencyOverview,
  useBusinessOverview,
  useMyWorkToday,
} from '@/features/dashboard/use-dashboard'
import { useCurrentMember } from '@/features/team/use-current-member'
import type { AccountHealth } from '@/lib/database.types'

const HEALTH_TONE: Record<AccountHealth, PillTone> = {
  healthy: 'green',
  watch: 'amber',
  at_risk: 'red',
}
const HEALTH_LABEL: Record<AccountHealth, string> = {
  healthy: 'Healthy',
  watch: 'Watch',
  at_risk: 'At risk',
}

function formatCents(cents: number | null) {
  if (cents == null) return '—'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(cents / 100)
}

function StatTile({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="bg-surface-sunken border border-border-light rounded-[10px] p-[12px_14px] flex flex-col gap-[4px] flex-1 min-w-[140px]">
      <span className="font-mono text-[10px] tracking-[0.1em] uppercase text-ink-muted">{label}</span>
      <span className="text-[21px] font-semibold tracking-[-0.02em] leading-none">{value}</span>
      {note && <span className="text-[11.5px] text-ink-muted">{note}</span>}
    </div>
  )
}

function AgencyOverviewCard() {
  const { data, isLoading } = useAgencyOverview()

  return (
    <Card>
      <CardHeader>
        <CardTitle>Agency overview</CardTitle>
      </CardHeader>
      <CardContent className="p-[16px_18px] flex flex-col gap-4">
        {isLoading && <Skeleton className="h-[90px] w-full" />}
        {!isLoading && data && (
          <>
            <div className="flex flex-wrap gap-[10px]">
              <StatTile label="Active clients" value={String(data.totalClients)} />
              <StatTile label="Healthy" value={String(data.healthy)} />
              <StatTile label="Watch" value={String(data.watch)} />
              <StatTile label="At risk" value={String(data.atRisk)} />
            </div>

            <div className="flex flex-col gap-1">
              <h3 className="m-0 font-mono text-[11px] uppercase tracking-[0.08em] text-ink-muted">
                Upcoming renewals (60d)
              </h3>
              {data.upcomingRenewals.length === 0 && (
                <p className="m-0 text-[13px] text-ink-muted">Nothing renewing in the next 60 days.</p>
              )}
              {data.upcomingRenewals.map((r) => (
                <Link
                  key={r.accountId}
                  to={`/clients/${r.accountId}`}
                  className="flex items-center justify-between gap-2 py-[6px] border-b border-border-light-2 last:border-b-0 text-ink no-underline hover:text-brand"
                >
                  <span className="text-[13px] font-medium truncate">{r.name}</span>
                  <span className="font-mono text-[11.5px] text-ink-muted">
                    {r.daysUntil <= 0 ? 'Due' : `${r.daysUntil}d`}
                  </span>
                </Link>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}

function MyWorkTodayCard() {
  const { data: currentMember } = useCurrentMember()
  const { data, isLoading } = useMyWorkToday(currentMember?.id)

  return (
    <Card>
      <CardHeader>
        <CardTitle>My work today</CardTitle>
      </CardHeader>
      <CardContent className="p-[16px_18px] flex flex-col gap-4">
        <StatTile
          label="Hours this week"
          value={isLoading || !data ? '—' : data.hoursThisWeek.toFixed(1)}
        />

        <div className="flex flex-col gap-1">
          <h3 className="m-0 font-mono text-[11px] uppercase tracking-[0.08em] text-ink-muted">
            My clients
          </h3>
          {isLoading && <Skeleton className="h-[60px] w-full" />}
          {!isLoading && (data?.projects.length ?? 0) === 0 && (
            <p className="m-0 text-[13px] text-ink-muted">You're not assigned to any engagement yet.</p>
          )}
          {(data?.projects ?? []).map((p) => (
            <Link
              key={p.id}
              to={p.accountId ? `/clients/${p.accountId}` : '/clients'}
              className="flex items-center justify-between gap-2 py-[6px] border-b border-border-light-2 last:border-b-0 text-ink no-underline hover:text-brand"
            >
              <span className="text-[13px] font-medium truncate">{p.accountName ?? p.name}</span>
              <span className="font-mono text-[11.5px] text-ink-muted">
                {p.pendingChecklist} pending / {p.totalChecklist}
              </span>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

function BusinessOverviewCard() {
  const { data, isLoading } = useBusinessOverview(true)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Business overview</CardTitle>
      </CardHeader>
      <CardContent className="p-[16px_18px] flex flex-col gap-4">
        {isLoading && <Skeleton className="h-[90px] w-full" />}
        {!isLoading && data && (
          <>
            <div className="flex flex-wrap gap-[10px]">
              <StatTile label="Total retainer (mo.)" value={formatCents(data.totalRetainerCents)} />
              <StatTile label="Labor cost (mo.)" value={formatCents(data.totalLaborCostCents)} />
              <StatTile label="Expenses (mo.)" value={formatCents(data.totalExpensesCents)} />
              <StatTile
                label="Profit (mo.)"
                value={formatCents(data.totalProfitCents)}
                note={`${data.hoursLoggedThisMonth.toFixed(1)}h logged`}
              />
            </div>

            <div className="flex flex-col gap-1">
              <h3 className="m-0 font-mono text-[11px] uppercase tracking-[0.08em] text-ink-muted">
                Flagged accounts
              </h3>
              {data.atRiskAccounts.length === 0 && (
                <p className="m-0 text-[13px] text-ink-muted">No accounts marked Watch or At risk.</p>
              )}
              {data.atRiskAccounts.map((a) => (
                <Link
                  key={a.id}
                  to={`/clients/${a.id}`}
                  className="flex items-center justify-between gap-2 py-[6px] border-b border-border-light-2 last:border-b-0 text-ink no-underline hover:text-brand"
                >
                  <span className="text-[13px] font-medium truncate">{a.name}</span>
                  <Badge tone={HEALTH_TONE[a.health]}>{HEALTH_LABEL[a.health]}</Badge>
                </Link>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}

export function DashboardPage() {
  const { data: currentMember } = useCurrentMember()
  const isAdminOrManager = currentMember?.role === 'admin' || currentMember?.role === 'manager'

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <span className="font-mono text-[11px] tracking-[0.14em] uppercase text-ink-muted">
          At a glance
        </span>
        <h1 className="m-0 text-[25px] font-semibold tracking-[-0.02em]">Dashboard</h1>
      </div>

      <section className="flex flex-wrap gap-3 items-start">
        <div className="flex-[1_1_420px] min-w-0">
          <AgencyOverviewCard />
        </div>
        <div className="flex-[1_1_420px] min-w-0">
          <MyWorkTodayCard />
        </div>
      </section>

      {isAdminOrManager && <BusinessOverviewCard />}
    </div>
  )
}
