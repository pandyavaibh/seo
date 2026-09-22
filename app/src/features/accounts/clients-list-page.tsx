import { AlertTriangle, Building2 } from 'lucide-react'
import * as React from 'react'
import { useNavigate } from 'react-router-dom'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge, type PillTone } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  useClientsAndEngagements,
  useOnboardClient,
  type EngagementListItem,
  type OnboardTeamRow,
} from '@/features/accounts/use-accounts'
import { useTeamMembers } from '@/features/accounts/use-account'
import { useCurrentMember } from '@/features/team/use-current-member'
import { initials, tintFor } from '@/lib/avatar'
import type { AccountHealth } from '@/lib/database.types'
import { PROJECT_TYPES, PROJECT_TYPE_LABEL } from '@/lib/project-type'

function AddClientForm({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate()
  const onboard = useOnboardClient()
  const { data: teamMembers } = useTeamMembers()

  // Client info
  const [name, setName] = React.useState('')
  const [website, setWebsite] = React.useState('')
  const [industry, setIndustry] = React.useState('')
  const [retainerDollars, setRetainerDollars] = React.useState('')
  const [hoursBudget, setHoursBudget] = React.useState('')
  const [renewalOn, setRenewalOn] = React.useState('')

  // First engagement — optional; skipped if left blank
  const [projectName, setProjectName] = React.useState('')
  const [projectType, setProjectType] = React.useState('')
  const [weeklyHours, setWeeklyHours] = React.useState('')
  const [billingCycle, setBillingCycle] = React.useState<'monthly' | 'one_time'>('monthly')
  const [renewalDay, setRenewalDay] = React.useState('')
  const [linkTarget, setLinkTarget] = React.useState('200')

  // Team staffing for that engagement
  const [team, setTeam] = React.useState<OnboardTeamRow[]>([{ memberId: '', weeklyHours: '' }])

  const fieldClass =
    'text-[13px] rounded-[8px] border border-border px-3 py-2 bg-surface w-full'

  const updateTeamRow = (i: number, patch: Partial<OnboardTeamRow>) =>
    setTeam((rows) => rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)))

  return (
    <Card>
      <CardHeader>
        <CardTitle>Add client</CardTitle>
      </CardHeader>
      <CardContent className="p-[16px_18px] flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <h3 className="m-0 font-mono text-[11px] tracking-[0.1em] uppercase text-ink-muted">
            Client information
          </h3>
          <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
            <label className="flex flex-col gap-1">
              <span className="font-mono text-[10px] tracking-[0.1em] uppercase text-ink-muted">
                Name *
              </span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Acme Corp"
                className={fieldClass}
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="font-mono text-[10px] tracking-[0.1em] uppercase text-ink-muted">
                Website
              </span>
              <input
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="acmecorp.com"
                className={fieldClass}
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="font-mono text-[10px] tracking-[0.1em] uppercase text-ink-muted">
                Industry
              </span>
              <input
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                placeholder="E-commerce"
                className={fieldClass}
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="font-mono text-[10px] tracking-[0.1em] uppercase text-ink-muted">
                Retainer ($/mo)
              </span>
              <input
                value={retainerDollars}
                onChange={(e) => setRetainerDollars(e.target.value)}
                placeholder="8000"
                inputMode="decimal"
                className={fieldClass}
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="font-mono text-[10px] tracking-[0.1em] uppercase text-ink-muted">
                Hours budget / mo
              </span>
              <input
                value={hoursBudget}
                onChange={(e) => setHoursBudget(e.target.value)}
                placeholder="80"
                inputMode="decimal"
                className={fieldClass}
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="font-mono text-[10px] tracking-[0.1em] uppercase text-ink-muted">
                Renewal date
              </span>
              <input
                type="date"
                value={renewalOn}
                onChange={(e) => setRenewalOn(e.target.value)}
                className={fieldClass}
              />
            </label>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <h3 className="m-0 font-mono text-[11px] tracking-[0.1em] uppercase text-ink-muted">
            First engagement (optional — leave the name blank to skip)
          </h3>
          <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))' }}>
            <label className="flex flex-col gap-1">
              <span className="font-mono text-[10px] tracking-[0.1em] uppercase text-ink-muted">
                Engagement name
              </span>
              <input
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="Monthly SEO Retainer"
                className={fieldClass}
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="font-mono text-[10px] tracking-[0.1em] uppercase text-ink-muted">
                Type
              </span>
              <select value={projectType} onChange={(e) => setProjectType(e.target.value)} className={fieldClass}>
                <option value="">—</option>
                {PROJECT_TYPES.map((t) => (
                  <option key={t} value={t}>{PROJECT_TYPE_LABEL[t]}</option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="font-mono text-[10px] tracking-[0.1em] uppercase text-ink-muted">
                Billing
              </span>
              <select
                value={billingCycle}
                onChange={(e) => setBillingCycle(e.target.value as 'monthly' | 'one_time')}
                className={fieldClass}
              >
                <option value="monthly">Monthly retainer</option>
                <option value="one_time">One-time project</option>
              </select>
            </label>
            {billingCycle === 'monthly' && (
              <label className="flex flex-col gap-1">
                <span className="font-mono text-[10px] tracking-[0.1em] uppercase text-ink-muted">
                  Renews on (day of month)
                </span>
                <input
                  value={renewalDay}
                  onChange={(e) => setRenewalDay(e.target.value)}
                  placeholder="1"
                  inputMode="numeric"
                  className={fieldClass}
                />
              </label>
            )}
            <label className="flex flex-col gap-1">
              <span className="font-mono text-[10px] tracking-[0.1em] uppercase text-ink-muted">
                Weekly hours
              </span>
              <input
                value={weeklyHours}
                onChange={(e) => setWeeklyHours(e.target.value)}
                placeholder="10"
                inputMode="decimal"
                className={fieldClass}
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="font-mono text-[10px] tracking-[0.1em] uppercase text-ink-muted">
                Backlink target / mo
              </span>
              <input
                value={linkTarget}
                onChange={(e) => setLinkTarget(e.target.value)}
                placeholder="200"
                inputMode="numeric"
                className={fieldClass}
              />
            </label>
          </div>
        </div>

        {projectName.trim() && (
          <div className="flex flex-col gap-2">
            <h3 className="m-0 font-mono text-[11px] tracking-[0.1em] uppercase text-ink-muted">
              Staff the team
            </h3>
            <div className="flex flex-col gap-2">
              {team.map((row, i) => (
                <div key={i} className="flex items-center gap-2">
                  <select
                    value={row.memberId}
                    onChange={(e) => updateTeamRow(i, { memberId: e.target.value })}
                    className={fieldClass}
                  >
                    <option value="">Choose a team member…</option>
                    {(teamMembers ?? []).map((m) => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                  <input
                    value={row.weeklyHours}
                    onChange={(e) => updateTeamRow(i, { weeklyHours: e.target.value })}
                    placeholder="Weekly hours"
                    inputMode="decimal"
                    className={fieldClass + ' w-[140px] flex-none'}
                  />
                  {team.length > 1 && (
                    <button
                      onClick={() => setTeam((rows) => rows.filter((_, idx) => idx !== i))}
                      className="border-none bg-transparent font-mono text-[10.5px] text-ink-muted hover:text-signal-red cursor-pointer p-0 flex-none"
                    >
                      Remove
                    </button>
                  )}
                </div>
              ))}
              <Button
                variant="secondary"
                size="sm"
                className="self-start"
                onClick={() => setTeam((rows) => [...rows, { memberId: '', weeklyHours: '' }])}
              >
                + Add team member
              </Button>
            </div>
          </div>
        )}

        {onboard.isError && (
          <p className="m-0 text-[12px] text-signal-red">
            {onboard.error instanceof Error ? onboard.error.message : 'Failed to create client'}
          </p>
        )}
        <div className="flex items-center gap-2">
          <Button
            disabled={!name.trim() || onboard.isPending}
            onClick={() =>
              onboard.mutate(
                {
                  account: { name, website, industry, retainerDollars, hoursBudget, renewalOn },
                  project: projectName.trim()
                    ? { name: projectName, projectType, weeklyHours, billingCycle, renewalDay, linkTarget }
                    : null,
                  team,
                },
                { onSuccess: ({ accountId }) => navigate(`/clients/${accountId}`) },
              )
            }
          >
            {onboard.isPending ? 'Creating…' : 'Create client'}
          </Button>
          <Button variant="secondary" onClick={onClose} disabled={onboard.isPending}>
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

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

const ENGAGEMENT_STATUS_TONE: Record<string, PillTone> = {
  active: 'green',
  paused: 'amber',
  shipped: 'neutral',
}

function isRenewalSoon(renewalOn: string | null) {
  if (!renewalOn) return false
  const days =
    (new Date(renewalOn).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  return days >= 0 && days <= 90
}

function EngagementsTable({ engagements }: { engagements: EngagementListItem[] }) {
  const navigate = useNavigate()

  if (engagements.length === 0) {
    return <p className="m-0 text-[12.5px] text-ink-muted">No engagements yet.</p>
  }

  return (
    <Table className="min-w-[560px]">
      <TableHeader>
        <TableRow>
          <TableHead>Engagement</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Staffed</TableHead>
          <TableHead>Link target</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {engagements.map((e) => (
          <TableRow key={e.id} clickable onClick={() => navigate(`/projects/${e.id}`)}>
            <TableCell className="font-medium text-[13.5px]">{e.name}</TableCell>
            <TableCell>
              <Badge tone={ENGAGEMENT_STATUS_TONE[e.status] ?? 'neutral'}>{e.status}</Badge>
            </TableCell>
            <TableCell>
              <div className="flex gap-[3px]">
                {e.staffed.map((m, i) => (
                  <span
                    key={m.id}
                    title={m.name}
                    className="w-6 h-6 rounded-full grid place-items-center font-mono text-[10px] font-semibold"
                    style={{ background: tintFor(i) }}
                  >
                    {initials(m.name)}
                  </span>
                ))}
              </div>
            </TableCell>
            <TableCell className="font-mono text-[12px] text-ink-secondary">{e.linkTarget}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

export function ClientsListPage() {
  const navigate = useNavigate()
  const { data, isLoading, isError, error, refetch, isFetching } =
    useClientsAndEngagements()
  const { data: currentMember } = useCurrentMember()
  const canAddClient = currentMember?.role === 'admin' || currentMember?.role === 'manager'
  const [showAddForm, setShowAddForm] = React.useState(false)

  const totalEngagements =
    data ? data.clients.reduce((s, c) => s + c.engagements.length, 0) + data.unlinkedEngagements.length : 0

  return (
    <div className="flex flex-col gap-[18px]">
      <div className="flex flex-wrap gap-3 items-end justify-between">
        <div className="flex flex-col gap-1">
          <span className="font-mono text-[11px] tracking-[0.14em] uppercase text-ink-muted">
            {data ? `${data.clients.length} clients · ${totalEngagements} engagements` : 'Loading…'}
          </span>
          <h1 className="m-0 text-[25px] font-semibold tracking-[-0.02em]">
            Clients
          </h1>
        </div>
        {canAddClient && !showAddForm && (
          <Button onClick={() => setShowAddForm(true)}>Add client</Button>
        )}
      </div>

      {showAddForm && <AddClientForm onClose={() => setShowAddForm(false)} />}

      {isError && (
        <Alert variant="destructive">
          <AlertTitle className="flex items-center gap-2">
            <AlertTriangle size={14} /> Couldn't load clients
          </AlertTitle>
          <AlertDescription>
            {error instanceof Error ? error.message : 'Unknown error'}
          </AlertDescription>
          <div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => refetch()}
              disabled={isFetching}
            >
              {isFetching ? 'Retrying…' : 'Retry'}
            </Button>
          </div>
        </Alert>
      )}

      {!isError && isLoading && (
        <div className="bg-surface border border-border rounded-[12px] p-[18px] flex flex-col gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-[38px] w-full" />
          ))}
        </div>
      )}

      {!isError && !isLoading && data && data.clients.length === 0 && (
        <div className="bg-surface border border-border rounded-[12px] p-[40px] flex flex-col items-center gap-2 text-center">
          <Building2 className="text-ink-faint" size={28} />
          <p className="m-0 font-medium text-[14px]">No clients yet</p>
          <p className="m-0 text-[13px] text-ink-muted max-w-[40ch]">
            Accounts you add will show up here, with their engagements and
            staffed team members.
          </p>
        </div>
      )}

      {!isError && !isLoading && data && data.clients.length > 0 && (
        <div className="flex flex-col gap-3">
          {data.clients.map((c) => (
            <Card key={c.id}>
              <CardHeader
                className="cursor-pointer"
                onClick={() => navigate(`/clients/${c.id}`)}
              >
                <div className="flex flex-wrap items-center justify-between gap-3 w-full">
                  <div className="flex flex-col gap-[2px]">
                    <CardTitle>{c.name}</CardTitle>
                    {c.website && (
                      <span className="font-mono text-[10.5px] text-ink-muted">{c.website}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge tone={HEALTH_TONE[c.health]}>{HEALTH_LABEL[c.health]}</Badge>
                    <span
                      className={
                        'font-mono text-[12px] ' +
                        (isRenewalSoon(c.renewalOn) ? 'text-signal-amber' : 'text-ink-secondary')
                      }
                    >
                      {c.renewalOn ? `Renews ${c.renewalOn}` : 'No renewal set'}
                    </span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0 overflow-x-auto">
                <EngagementsTable engagements={c.engagements} />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!isError && !isLoading && data && data.unlinkedEngagements.length > 0 && (
        <div className="flex flex-col gap-2">
          <h2 className="m-0 font-mono text-[12px] tracking-[0.08em] uppercase text-ink-muted">
            Unlinked engagements
          </h2>
          <p className="m-0 text-[12.5px] text-ink-muted">
            Not tied to a client account — internal or ops work.
          </p>
          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <EngagementsTable engagements={data.unlinkedEngagements} />
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
