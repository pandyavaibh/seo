import {
  AlertTriangle,
  ArrowRight,
  Building2,
  CalendarDays,
  Clock,
  Receipt,
  TrendingDown,
  TrendingUp,
  Users,
  Wallet,
} from 'lucide-react'
import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, XAxis, YAxis } from 'recharts'
import { Link } from 'react-router-dom'

import { Badge, type PillTone } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ProgressBar } from '@/components/ui/progress-bar'
import { Skeleton } from '@/components/ui/skeleton'
import {
  useAgencyOverview,
  useBusinessOverview,
  useMyWorkToday,
} from '@/features/dashboard/use-dashboard'
import { useCurrentMember } from '@/features/team/use-current-member'
import { initials, tintFor } from '@/lib/avatar'
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

// ---------------------------------------------------------------------
// Shared bits
// ---------------------------------------------------------------------

const TILE_TINT: Record<string, { bg: string; fg: string }> = {
  brand: { bg: 'var(--color-pill-blue-bg)', fg: 'var(--color-pill-blue-fg)' },
  green: { bg: 'var(--color-pill-green-bg)', fg: 'var(--color-pill-green-fg)' },
  amber: { bg: 'var(--color-pill-amber-bg)', fg: 'var(--color-pill-amber-fg)' },
  red: { bg: 'var(--color-pill-red-bg)', fg: 'var(--color-pill-red-fg)' },
  neutral: { bg: 'var(--color-pill-neutral-bg)', fg: 'var(--color-pill-neutral-fg)' },
}

function IconTile({
  icon: Icon,
  tone = 'neutral',
}: {
  icon: React.ComponentType<{ size?: number; strokeWidth?: number }>
  tone?: keyof typeof TILE_TINT
}) {
  const { bg, fg } = TILE_TINT[tone]
  return (
    <span
      className="w-[30px] h-[30px] rounded-[9px] grid place-items-center flex-none"
      style={{ background: bg, color: fg }}
    >
      <Icon size={15} strokeWidth={2.25} />
    </span>
  )
}

function StatTile({
  label,
  value,
  note,
  icon,
  tone = 'neutral',
  to,
}: {
  label: string
  value: string
  note?: string
  icon: React.ComponentType<{ size?: number; strokeWidth?: number }>
  tone?: keyof typeof TILE_TINT
  to?: string
}) {
  const classes =
    'bg-surface-sunken-2 border border-border-light rounded-[11px] p-[13px_14px] flex items-start gap-[10px] flex-1 min-w-[150px] no-underline text-inherit'
  const inner = (
    <>
      <IconTile icon={icon} tone={tone} />
      <div className="flex flex-col gap-[2px] min-w-0">
        <span className="font-mono text-[9.5px] tracking-[0.1em] uppercase text-ink-muted">{label}</span>
        <span className="text-[20px] font-semibold tracking-[-0.02em] leading-tight truncate">{value}</span>
        {note && <span className="text-[11px] text-ink-muted">{note}</span>}
      </div>
    </>
  )
  if (to) {
    return (
      <Link to={to} className={`${classes} transition-colors hover:border-brand`}>
        {inner}
      </Link>
    )
  }
  return <div className={classes}>{inner}</div>
}

function SectionLabel({
  icon: Icon,
  children,
}: {
  icon: React.ComponentType<{ size?: number; strokeWidth?: number }>
  children: React.ReactNode
}) {
  return (
    <h3 className="m-0 flex items-center gap-[6px] font-mono text-[10.5px] uppercase tracking-[0.1em] text-ink-muted">
      <Icon size={12} strokeWidth={2.25} />
      {children}
    </h3>
  )
}

function EmptyNote({ children }: { children: React.ReactNode }) {
  return (
    <p className="m-0 py-[10px] text-[13px] text-ink-faint italic">{children}</p>
  )
}

function ListRow({
  to,
  leading,
  title,
  trailing,
}: {
  to: string
  leading?: React.ReactNode
  title: React.ReactNode
  trailing: React.ReactNode
}) {
  return (
    <Link
      to={to}
      className="group flex items-center gap-[10px] py-[9px] border-b border-border-light-2 last:border-b-0 text-ink no-underline"
    >
      {leading}
      <span className="text-[13px] font-medium truncate flex-1 min-w-0 group-hover:text-brand">{title}</span>
      {trailing}
      <ArrowRight
        size={13}
        className="text-ink-faint opacity-0 group-hover:opacity-100 transition-opacity flex-none"
      />
    </Link>
  )
}

// ---------------------------------------------------------------------
// Agency overview
// ---------------------------------------------------------------------

function renewalTone(daysUntil: number): PillTone {
  if (daysUntil <= 7) return 'red'
  if (daysUntil <= 30) return 'amber'
  return 'neutral'
}

function HealthMixChart({ healthy, watch, atRisk }: { healthy: number; watch: number; atRisk: number }) {
  const rows: { name: string; value: number; color: string; health: AccountHealth }[] = [
    { name: 'Healthy', value: healthy, color: 'var(--color-signal-green)', health: 'healthy' },
    { name: 'Watch', value: watch, color: 'var(--color-signal-amber)', health: 'watch' },
    { name: 'At risk', value: atRisk, color: 'var(--color-signal-red)', health: 'at_risk' },
  ]
  const data = rows.filter((r) => r.value > 0)
  const total = healthy + watch + atRisk

  if (total === 0) return null

  return (
    <div className="bg-surface-sunken-2 border border-border-light rounded-[11px] p-[13px_14px] flex items-center gap-[16px] flex-1 min-w-[220px]">
      <div className="w-[76px] h-[76px] flex-none">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" innerRadius={24} outerRadius={38} paddingAngle={3} stroke="none" isAnimationActive={false}>
              {data.map((d) => (
                <Cell key={d.name} fill={d.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="flex flex-col gap-[5px] min-w-0">
        <span className="font-mono text-[9.5px] tracking-[0.1em] uppercase text-ink-muted">Client health mix</span>
        {rows.map((r) => (
          <Link
            key={r.name}
            to={`/clients?health=${r.health}`}
            className="group flex items-center gap-[7px] text-[12.5px] no-underline text-inherit"
          >
            <span className="w-[8px] h-[8px] rounded-full flex-none" style={{ background: r.color }} />
            <span className="text-ink-secondary flex-1 group-hover:text-brand">{r.name}</span>
            <span className="font-mono text-ink-muted group-hover:text-brand">{r.value}</span>
          </Link>
        ))}
      </div>
    </div>
  )
}

function AgencyOverviewCard() {
  const { data, isLoading } = useAgencyOverview()

  return (
    <Card className="shadow-[0_1px_2px_rgba(23,25,28,0.04)]">
      <CardHeader>
        <CardTitle className="flex items-center gap-[8px]">
          <Building2 size={16} strokeWidth={2.25} className="text-ink-muted" />
          Agency overview
        </CardTitle>
      </CardHeader>
      <CardContent className="p-[18px] flex flex-col gap-[18px]">
        {isLoading && <Skeleton className="h-[72px] w-full" />}
        {!isLoading && data && (
          <>
            <div className="flex flex-wrap gap-[10px]">
              <StatTile label="Active clients" value={String(data.totalClients)} icon={Users} tone="brand" to="/clients" />
              <HealthMixChart healthy={data.healthy} watch={data.watch} atRisk={data.atRisk} />
            </div>

            <div className="flex flex-col gap-[2px]">
              <SectionLabel icon={CalendarDays}>Upcoming renewals · 60d</SectionLabel>
              {data.upcomingRenewals.length === 0 && (
                <EmptyNote>Nothing renewing in the next 60 days.</EmptyNote>
              )}
              {data.upcomingRenewals.map((r) => (
                <ListRow
                  key={r.accountId}
                  to={`/clients/${r.accountId}`}
                  title={r.name}
                  trailing={
                    <Badge tone={renewalTone(r.daysUntil)}>
                      {r.daysUntil <= 0 ? 'Due' : `${r.daysUntil}d`}
                    </Badge>
                  }
                />
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------------
// My work today
// ---------------------------------------------------------------------

function checklistTone(pct: number) {
  if (pct >= 100) return 'var(--color-signal-green)'
  if (pct >= 40) return 'var(--color-signal-amber)'
  return 'var(--color-signal-red)'
}

function MyWorkTodayCard() {
  const { data: currentMember } = useCurrentMember()
  const { data, isLoading } = useMyWorkToday(currentMember?.id)

  return (
    <Card className="shadow-[0_1px_2px_rgba(23,25,28,0.04)]">
      <CardHeader>
        <CardTitle className="flex items-center gap-[8px]">
          <Users size={16} strokeWidth={2.25} className="text-ink-muted" />
          My work today
        </CardTitle>
      </CardHeader>
      <CardContent className="p-[18px] flex flex-col gap-[18px]">
        <StatTile
          label="Hours this week"
          value={isLoading || !data ? '—' : `${data.hoursThisWeek.toFixed(1)}h`}
          icon={Clock}
          tone="brand"
        />

        <div className="flex flex-col gap-[2px]">
          <SectionLabel icon={Building2}>My clients</SectionLabel>
          {isLoading && <Skeleton className="h-[60px] w-full" />}
          {!isLoading && (data?.projects.length ?? 0) === 0 && (
            <EmptyNote>You're not assigned to any engagement yet.</EmptyNote>
          )}
          {(data?.projects ?? []).map((p, i) => {
            const label = p.accountName ?? p.name
            const done = p.totalChecklist - p.pendingChecklist
            const pct = p.totalChecklist > 0 ? Math.round((done / p.totalChecklist) * 100) : 0
            return (
              <Link
                key={p.id}
                to={p.accountId ? `/clients/${p.accountId}` : '/clients'}
                className="group flex flex-col gap-[6px] py-[9px] border-b border-border-light-2 last:border-b-0 text-ink no-underline"
              >
                <div className="flex items-center gap-[10px]">
                  <span
                    className="w-6 h-6 rounded-full grid place-items-center font-mono text-[9.5px] font-semibold flex-none"
                    style={{ background: tintFor(i) }}
                  >
                    {initials(label)}
                  </span>
                  <span className="text-[13px] font-medium truncate flex-1 min-w-0 group-hover:text-brand">
                    {label}
                  </span>
                  <span className="font-mono text-[11px] text-ink-muted flex-none">
                    {pct}% · {done}/{p.totalChecklist}
                  </span>
                </div>
                <ProgressBar pct={pct} color={checklistTone(pct)} />
              </Link>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------------
// Business overview
// ---------------------------------------------------------------------

function RetainerBreakdownChart({
  laborCostCents,
  expensesCents,
  profitCents,
}: {
  laborCostCents: number
  expensesCents: number
  profitCents: number
}) {
  const data = [
    { name: 'Labor', value: Math.round(laborCostCents / 100), color: 'var(--color-ink-faint)' },
    { name: 'Expenses', value: Math.round(expensesCents / 100), color: 'var(--color-signal-amber)' },
    {
      name: 'Profit',
      value: Math.round(profitCents / 100),
      color: profitCents >= 0 ? 'var(--color-signal-green)' : 'var(--color-signal-red)',
    },
  ]
  if (data.every((d) => d.value === 0)) return null

  return (
    <div className="flex flex-col gap-[6px]">
      <SectionLabel icon={Wallet}>Where the retainer went, this month ($)</SectionLabel>
      <div className="h-[104px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, bottom: 4, left: 0 }}>
            <XAxis type="number" hide />
            <YAxis
              type="category"
              dataKey="name"
              width={64}
              tick={{ fontSize: 11.5, fill: 'var(--color-ink-muted)' }}
              axisLine={false}
              tickLine={false}
            />
            <Bar dataKey="value" radius={5} barSize={16} isAnimationActive={false}>
              {data.map((d) => (
                <Cell key={d.name} fill={d.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

function BusinessOverviewCard() {
  const { data, isLoading } = useBusinessOverview(true)
  const profitPositive = (data?.totalProfitCents ?? 0) >= 0

  return (
    <Card className="shadow-[0_1px_2px_rgba(23,25,28,0.04)]">
      <CardHeader>
        <CardTitle className="flex items-center gap-[8px]">
          <Wallet size={16} strokeWidth={2.25} className="text-ink-muted" />
          Business overview
        </CardTitle>
      </CardHeader>
      <CardContent className="p-[18px] flex flex-col gap-[18px]">
        {isLoading && <Skeleton className="h-[72px] w-full" />}
        {!isLoading && data && (
          <>
            <div className="flex flex-wrap gap-[10px]">
              <StatTile
                label="Total retainer / mo."
                value={formatCents(data.totalRetainerCents)}
                icon={Wallet}
                tone="brand"
              />
              <StatTile
                label="Labor cost / mo."
                value={formatCents(data.totalLaborCostCents)}
                icon={Users}
                tone="neutral"
              />
              <StatTile
                label="Expenses / mo."
                value={formatCents(data.totalExpensesCents)}
                icon={Receipt}
                tone="neutral"
              />
              <StatTile
                label="Profit / mo."
                value={formatCents(data.totalProfitCents)}
                note={`${data.hoursLoggedThisMonth.toFixed(1)}h logged`}
                icon={profitPositive ? TrendingUp : TrendingDown}
                tone={profitPositive ? 'green' : 'red'}
              />
            </div>

            <RetainerBreakdownChart
              laborCostCents={data.totalLaborCostCents}
              expensesCents={data.totalExpensesCents}
              profitCents={data.totalProfitCents}
            />

            <div className="flex flex-col gap-[2px]">
              <SectionLabel icon={AlertTriangle}>Flagged accounts</SectionLabel>
              {data.atRiskAccounts.length === 0 && (
                <EmptyNote>No accounts marked Watch or At risk.</EmptyNote>
              )}
              {data.atRiskAccounts.map((a) => (
                <ListRow
                  key={a.id}
                  to={`/clients/${a.id}`}
                  title={a.name}
                  trailing={<Badge tone={HEALTH_TONE[a.health]}>{HEALTH_LABEL[a.health]}</Badge>}
                />
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

export function DashboardPage() {
  const { data: currentMember } = useCurrentMember()
  const isAdminOrManager = currentMember?.role === 'admin' || currentMember?.role === 'manager'
  const firstName = currentMember?.name?.split(' ')[0]

  return (
    <div className="flex flex-col gap-[18px]">
      <div className="flex flex-col gap-[3px]">
        <span className="font-mono text-[11px] tracking-[0.14em] uppercase text-ink-muted">
          {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
        </span>
        <h1 className="m-0 text-[26px] font-semibold tracking-[-0.02em]">
          {greeting()}{firstName ? `, ${firstName}` : ''}
        </h1>
      </div>

      <section className="grid gap-[14px]" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))' }}>
        <AgencyOverviewCard />
        <MyWorkTodayCard />
      </section>

      {isAdminOrManager && <BusinessOverviewCard />}
    </div>
  )
}
