import { useMutation, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, ArrowLeft } from 'lucide-react'
import * as React from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge, type PillTone } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useAccount } from '@/features/accounts/use-account'
import {
  ProjectHoursPanel,
  ProjectHoursSummary,
} from '@/features/projects/project-hours-panel'
import { initials, tintFor } from '@/lib/avatar'
import type { AccountHealth, ActivityKind } from '@/lib/database.types'
import { STAGE_LABEL, STAGE_TONE } from '@/lib/project-stage'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/providers/auth-provider'

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

const ACTIVITY_DOT: Record<ActivityKind, string> = {
  issue: 'var(--color-signal-red)',
  report: 'var(--color-signal-green)',
  call: 'var(--color-ink-muted)',
  meeting: 'var(--color-ink-muted)',
  email: 'var(--color-ink-muted)',
  note: 'var(--color-ink-muted)',
}

function formatMoney(cents: number | null, currency: string) {
  if (cents == null) return '—'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(cents / 100)
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-surface border border-border rounded-[12px] p-[14px_16px] flex flex-col gap-[6px]">
      <span className="font-mono text-[10px] tracking-[0.12em] uppercase text-ink-muted">
        {label}
      </span>
      <span className="text-[23px] font-semibold tracking-[-0.02em] leading-none">
        {value}
      </span>
    </div>
  )
}

function LogActivityForm({ accountId }: { accountId: string }) {
  const { session } = useAuth()
  const queryClient = useQueryClient()
  const [body, setBody] = React.useState('')
  const [kind, setKind] = React.useState<ActivityKind>('note')

  const mutation = useMutation({
    mutationFn: async () => {
      const { data: member } = await supabase
        .from('team_members')
        .select('id')
        .eq('email', session!.user.email!.toLowerCase())
        .maybeSingle()
      const { error } = await supabase.from('activities').insert({
        account_id: accountId,
        kind,
        body,
        author_id: member?.id,
      })
      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      setBody('')
      queryClient.invalidateQueries({ queryKey: ['account', accountId] })
    },
  })

  return (
    <div className="flex flex-col gap-2 pt-2 border-t border-border-light">
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Log a call, meeting, note…"
        rows={2}
        className="w-full text-[13px] rounded-[8px] border border-border p-2 resize-none font-sans"
      />
      <div className="flex items-center justify-between gap-2">
        <select
          value={kind}
          onChange={(e) => setKind(e.target.value as ActivityKind)}
          className="text-[12px] font-mono border border-border rounded-[6px] px-2 py-1 bg-surface"
        >
          <option value="note">Note</option>
          <option value="call">Call</option>
          <option value="meeting">Meeting</option>
          <option value="email">Email</option>
          <option value="report">Report</option>
          <option value="issue">Issue</option>
        </select>
        <Button
          size="sm"
          disabled={!body.trim() || mutation.isPending}
          onClick={() => mutation.mutate()}
        >
          {mutation.isPending ? 'Logging…' : 'Log activity'}
        </Button>
      </div>
      {mutation.isError && (
        <p className="m-0 text-[12px] text-signal-red">
          {mutation.error instanceof Error
            ? mutation.error.message
            : 'Failed to log activity'}
        </p>
      )}
    </div>
  )
}

export function AccountRecordPage() {
  const { accountId } = useParams<{ accountId: string }>()
  const navigate = useNavigate()
  const { data: acc, isLoading, isError, error, refetch, isFetching } =
    useAccount(accountId)
  const [expandedProjectId, setExpandedProjectId] = React.useState<
    string | null
  >(null)

  if (isError) {
    return (
      <Alert variant="destructive">
        <AlertTitle className="flex items-center gap-2">
          <AlertTriangle size={14} /> Couldn't load this account
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
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <button
        onClick={() => navigate('/clients')}
        className="self-start flex items-center gap-1 border-none bg-transparent font-mono text-[11px] tracking-[0.1em] uppercase text-ink-muted hover:text-ink cursor-pointer p-0"
      >
        <ArrowLeft size={12} /> All clients
      </button>

      {isLoading && (
        <div className="flex flex-col gap-4">
          <Skeleton className="h-[60px] w-full" />
          <Skeleton className="h-[120px] w-full" />
        </div>
      )}

      {!isLoading && acc && (
        <>
          <div className="flex flex-wrap gap-3 items-end justify-between">
            <div className="flex flex-col gap-1">
              <span className="font-mono text-[11px] tracking-[0.14em] uppercase text-ink-muted">
                {[acc.industry, acc.website].filter(Boolean).join(' · ') ||
                  '—'}
              </span>
              <h1 className="m-0 text-[25px] font-semibold tracking-[-0.02em]">
                {acc.name}
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <Badge tone={HEALTH_TONE[acc.health]} className="text-[12px] px-[11px] py-[5px]">
                {HEALTH_LABEL[acc.health]}
              </Badge>
              <Button variant="secondary" disabled title="Log a note below">
                Log activity
              </Button>
              <Button
                variant="secondary"
                onClick={() => navigate(`/clients/${accountId}/search`)}
              >
                Search performance
              </Button>
              <Button disabled title="Coming in Stage 2">
                New engagement
              </Button>
            </div>
          </div>

          <section className="grid gap-[10px]" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(168px, 1fr))' }}>
            <StatTile label="Engagements" value={String(acc.projects.length)} />
            <StatTile label="Contacts" value={String(acc.contacts.length)} />
            <StatTile
              label="Hours budget"
              value={acc.hoursBudget != null ? `${acc.hoursBudget}h / mo` : '—'}
            />
            <StatTile
              label="Retainer"
              value={formatMoney(acc.retainerCents, acc.currency)}
            />
          </section>

          <section className="flex flex-wrap gap-3 items-start">
            <div className="flex-[1_1_420px] min-w-0 flex flex-col gap-3">
              <Card>
                <CardHeader>
                  <CardTitle>Engagements</CardTitle>
                </CardHeader>
                <CardContent className="p-[16px_18px] flex flex-col gap-2">
                  {acc.projects.length === 0 && (
                    <p className="m-0 text-[13px] text-ink-muted">
                      No engagements attached to this account yet.
                    </p>
                  )}
                  {acc.projects.map((p) => {
                    const expanded = expandedProjectId === p.id
                    return (
                      <div
                        key={p.id}
                        className="flex flex-col gap-2 p-[11px_12px] border border-border-light rounded-[10px] bg-surface-sunken-2"
                      >
                        <button
                          onClick={() => navigate(`/projects/${p.id}`)}
                          className="flex items-center gap-3 border-none bg-transparent p-0 cursor-pointer text-left w-full"
                        >
                          <div className="flex flex-col gap-[2px] flex-1 min-w-0">
                            <span className="text-[13.5px] font-medium">
                              {p.name}
                            </span>
                            {p.projectType && (
                              <span className="font-mono text-[10.5px] uppercase tracking-[0.08em] text-ink-muted">
                                {p.projectType}
                              </span>
                            )}
                          </div>
                          <div className="flex gap-[3px]">
                            {p.staffed.map((m, i) => (
                              <span
                                key={m.id}
                                title={m.name}
                                className="w-[22px] h-[22px] rounded-full grid place-items-center font-mono text-[9.5px] font-semibold"
                                style={{ background: tintFor(i) }}
                              >
                                {initials(m.name)}
                              </span>
                            ))}
                          </div>
                          {p.stage && (
                            <Badge tone={STAGE_TONE[p.stage] ?? 'neutral'}>
                              {STAGE_LABEL[p.stage] ?? p.stage}
                            </Badge>
                          )}
                          <span className="font-mono text-[11.5px] text-ink-muted min-w-[52px] text-right">
                            {p.dueOn ?? '—'}
                          </span>
                        </button>
                        <div className="flex items-center justify-between gap-2 pl-0">
                          <ProjectHoursSummary projectId={p.id} />
                          <button
                            onClick={() =>
                              setExpandedProjectId(expanded ? null : p.id)
                            }
                            className="border-none bg-transparent font-mono text-[11px] text-ink-muted hover:text-ink cursor-pointer p-0"
                          >
                            {expanded ? 'Hide log ▴' : 'Log hours ▾'}
                          </button>
                        </div>
                        {expanded && (
                          <ProjectHoursPanel
                            projectId={p.id}
                            staffed={p.staffed}
                          />
                        )}
                      </div>
                    )
                  })}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Activity</CardTitle>
                </CardHeader>
                <CardContent className="p-[16px_18px] flex flex-col gap-3">
                  {acc.activities.length === 0 && (
                    <p className="m-0 text-[13px] text-ink-muted">
                      No activity logged yet.
                    </p>
                  )}
                  {acc.activities.map((a) => (
                    <div key={a.id} className="flex gap-[11px] items-start">
                      <span
                        className="w-[7px] h-[7px] rounded-full mt-[6px] flex-none"
                        style={{ background: ACTIVITY_DOT[a.kind] }}
                      />
                      <div className="flex flex-col gap-[1px] min-w-0">
                        <span className="text-[13px] leading-[1.45]">
                          {a.body}
                        </span>
                        <span className="font-mono text-[10.5px] text-ink-muted">
                          {new Date(a.occurredAt).toLocaleDateString()}
                          {a.authorName ? ` · ${a.authorName}` : ''}
                        </span>
                      </div>
                    </div>
                  ))}
                  {accountId && <LogActivityForm accountId={accountId} />}
                </CardContent>
              </Card>
            </div>

            <div className="flex-[1_1_280px] max-w-[340px] flex flex-col gap-3">
              <Card>
                <CardHeader>
                  <CardTitle>Contract</CardTitle>
                </CardHeader>
                <CardContent className="p-[16px_18px] flex flex-col gap-3">
                  {[
                    ['Retainer', formatMoney(acc.retainerCents, acc.currency)],
                    ['Client since', acc.startedOn ?? '—'],
                    ['Renewal', acc.renewalOn ?? '—'],
                    ['Account manager', acc.accountManagerName ?? '—'],
                    [
                      'Hours budget',
                      acc.hoursBudget != null ? `${acc.hoursBudget}h / mo` : '—',
                    ],
                  ].map(([label, value]) => (
                    <div
                      key={label}
                      className="flex items-baseline justify-between gap-3"
                    >
                      <span className="font-mono text-[10.5px] uppercase tracking-[0.08em] text-ink-muted">
                        {label}
                      </span>
                      <span className="text-[13px] font-medium">{value}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Contacts</CardTitle>
                </CardHeader>
                <CardContent className="p-[16px_18px] flex flex-col gap-3">
                  {acc.contacts.length === 0 && (
                    <p className="m-0 text-[13px] text-ink-muted">
                      No contacts added yet.
                    </p>
                  )}
                  {acc.contacts.map((c) => (
                    <div key={c.id} className="flex items-center gap-[10px]">
                      <span className="w-7 h-7 flex-none rounded-full grid place-items-center font-mono text-[10px] font-semibold bg-border-light">
                        {initials(c.name)}
                      </span>
                      <div className="flex flex-col gap-[1px] min-w-0">
                        <span className="text-[13px] font-medium">{c.name}</span>
                        {c.role && (
                          <span className="text-[11.5px] text-ink-muted">
                            {c.role}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </section>
        </>
      )}
    </div>
  )
}
