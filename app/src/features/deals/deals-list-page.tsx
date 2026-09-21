import { AlertTriangle, Handshake } from 'lucide-react'
import * as React from 'react'
import { useNavigate } from 'react-router-dom'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
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
import { useTeamMembers } from '@/features/accounts/use-account'
import { useAccounts } from '@/features/accounts/use-accounts'
import {
  useCreateDeal,
  useDeals,
  useUpdateDealStage,
  type DealRow,
  type NewDealInput,
} from '@/features/deals/use-deals'
import { DEAL_STAGE_LABEL, DEAL_STAGE_TONE, DEAL_STAGES } from '@/lib/deal-stage'
import { LEAD_SOURCES } from '@/lib/lead-source'

function formatMoney(cents: number | null) {
  if (cents == null) return '—'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(cents / 100)
}

function NewDealForm({ onClose }: { onClose: () => void }) {
  const createDeal = useCreateDeal()
  const { data: accounts } = useAccounts()
  const { data: teamMembers } = useTeamMembers()
  const [name, setName] = React.useState('')
  const [accountId, setAccountId] = React.useState('')
  const [valueDollars, setValueDollars] = React.useState('')
  const [source, setSource] = React.useState('')
  const [customSource, setCustomSource] = React.useState('')
  const [ownerId, setOwnerId] = React.useState('')
  const [expectedClose, setExpectedClose] = React.useState('')

  const fieldClass = 'text-[13px] rounded-[8px] border border-border px-3 py-2 bg-surface w-full'

  return (
    <Card>
      <CardHeader>
        <CardTitle>New deal</CardTitle>
      </CardHeader>
      <CardContent className="p-[16px_18px] flex flex-col gap-3">
        <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
          <label className="flex flex-col gap-1">
            <span className="font-mono text-[10px] tracking-[0.1em] uppercase text-ink-muted">Deal name *</span>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Acme Corp — SEO retainer" className={fieldClass} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="font-mono text-[10px] tracking-[0.1em] uppercase text-ink-muted">Account</span>
            <select value={accountId} onChange={(e) => setAccountId(e.target.value)} className={fieldClass}>
              <option value="">Not linked to an account yet</option>
              {(accounts ?? []).map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="font-mono text-[10px] tracking-[0.1em] uppercase text-ink-muted">Value ($)</span>
            <input value={valueDollars} onChange={(e) => setValueDollars(e.target.value)} placeholder="8000" inputMode="decimal" className={fieldClass} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="font-mono text-[10px] tracking-[0.1em] uppercase text-ink-muted">Source</span>
            <select value={source} onChange={(e) => setSource(e.target.value)} className={fieldClass}>
              <option value="">—</option>
              {LEAD_SOURCES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </label>
          {source === 'Other' && (
            <label className="flex flex-col gap-1">
              <span className="font-mono text-[10px] tracking-[0.1em] uppercase text-ink-muted">Other source</span>
              <input value={customSource} onChange={(e) => setCustomSource(e.target.value)} placeholder="Describe it" className={fieldClass} />
            </label>
          )}
          <label className="flex flex-col gap-1">
            <span className="font-mono text-[10px] tracking-[0.1em] uppercase text-ink-muted">Owner</span>
            <select value={ownerId} onChange={(e) => setOwnerId(e.target.value)} className={fieldClass}>
              <option value="">—</option>
              {(teamMembers ?? []).map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="font-mono text-[10px] tracking-[0.1em] uppercase text-ink-muted">Expected close</span>
            <input type="date" value={expectedClose} onChange={(e) => setExpectedClose(e.target.value)} className={fieldClass} />
          </label>
        </div>
        {createDeal.isError && (
          <p className="m-0 text-[12px] text-signal-red">
            {createDeal.error instanceof Error ? createDeal.error.message : 'Failed to create deal'}
          </p>
        )}
        <div className="flex items-center gap-2">
          <Button
            disabled={!name.trim() || createDeal.isPending}
            onClick={() => {
              const resolvedSource = source === 'Other' ? customSource : source
              const input: NewDealInput = { name, accountId, valueDollars, source: resolvedSource, ownerId, expectedClose }
              createDeal.mutate(input, { onSuccess: onClose })
            }}
          >
            {createDeal.isPending ? 'Creating…' : 'Create deal'}
          </Button>
          <Button variant="secondary" onClick={onClose} disabled={createDeal.isPending}>
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function DealRowView({ deal }: { deal: DealRow }) {
  const navigate = useNavigate()
  const updateStage = useUpdateDealStage()

  return (
    <TableRow>
      <TableCell>
        <span className="font-medium text-[13.5px]">{deal.name}</span>
      </TableCell>
      <TableCell>
        {deal.accountId ? (
          <button
            onClick={() => navigate(`/clients/${deal.accountId}`)}
            className="border-none bg-transparent p-0 cursor-pointer text-[13px] text-brand hover:underline"
          >
            {deal.accountName}
          </button>
        ) : (
          <span className="text-ink-muted text-[13px]">—</span>
        )}
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <Badge tone={DEAL_STAGE_TONE[deal.stage]}>{DEAL_STAGE_LABEL[deal.stage]}</Badge>
          <select
            value={deal.stage}
            onChange={(e) => updateStage.mutate({ id: deal.id, stage: e.target.value as DealRow['stage'] })}
            disabled={updateStage.isPending}
            className="font-mono text-[11px] border border-border rounded-[6px] px-1 py-[3px] bg-surface"
          >
            {DEAL_STAGES.map((s) => (
              <option key={s} value={s}>{DEAL_STAGE_LABEL[s]}</option>
            ))}
          </select>
        </div>
      </TableCell>
      <TableCell className="font-mono text-[12px]">{formatMoney(deal.valueCents)}</TableCell>
      <TableCell className="text-ink-muted text-[12.5px]">{deal.source ?? '—'}</TableCell>
      <TableCell className="text-ink-secondary text-[12.5px]">{deal.ownerName ?? '—'}</TableCell>
      <TableCell className="font-mono text-[12px] text-ink-muted">{deal.expectedClose ?? '—'}</TableCell>
    </TableRow>
  )
}

export function DealsListPage() {
  const { data, isLoading, isError, error, refetch, isFetching } = useDeals()
  const [showNewDeal, setShowNewDeal] = React.useState(false)

  const openCount = (data ?? []).filter((d) => d.stage !== 'won' && d.stage !== 'lost').length

  return (
    <div className="flex flex-col gap-[18px]">
      <div className="flex flex-wrap gap-3 items-end justify-between">
        <div className="flex flex-col gap-1">
          <span className="font-mono text-[11px] tracking-[0.14em] uppercase text-ink-muted">
            {data ? `${openCount} open · ${data.length} total` : 'Loading…'}
          </span>
          <h1 className="m-0 text-[25px] font-semibold tracking-[-0.02em]">Deals</h1>
        </div>
        {!showNewDeal && <Button onClick={() => setShowNewDeal(true)}>New deal</Button>}
      </div>

      {showNewDeal && <NewDealForm onClose={() => setShowNewDeal(false)} />}

      {isError && (
        <Alert variant="destructive">
          <AlertTitle className="flex items-center gap-2">
            <AlertTriangle size={14} /> Couldn't load deals
          </AlertTitle>
          <AlertDescription>
            {error instanceof Error ? error.message : 'Unknown error'}
          </AlertDescription>
          <div>
            <Button variant="secondary" size="sm" onClick={() => refetch()} disabled={isFetching}>
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

      {!isError && !isLoading && data && data.length === 0 && !showNewDeal && (
        <div className="bg-surface border border-border rounded-[12px] p-[40px] flex flex-col items-center gap-2 text-center">
          <Handshake className="text-ink-faint" size={28} />
          <p className="m-0 font-medium text-[14px]">No deals yet</p>
          <p className="m-0 text-[13px] text-ink-muted max-w-[40ch]">
            Track enquiries through to won or lost here, linked to an account once one exists.
          </p>
        </div>
      )}

      {!isError && !isLoading && data && data.length > 0 && (
        <div className="bg-surface border border-border rounded-[12px] overflow-hidden">
          <Table className="min-w-[820px]">
            <TableHeader>
              <TableRow>
                <TableHead>Deal</TableHead>
                <TableHead>Account</TableHead>
                <TableHead>Stage</TableHead>
                <TableHead>Value</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Expected close</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((d) => (
                <DealRowView key={d.id} deal={d} />
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
