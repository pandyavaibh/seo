import { AlertTriangle, Building2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge, type PillTone } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useAccounts } from '@/features/accounts/use-accounts'
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

function isRenewalSoon(renewalOn: string | null) {
  if (!renewalOn) return false
  const days =
    (new Date(renewalOn).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  return days >= 0 && days <= 90
}

export function ClientsListPage() {
  const navigate = useNavigate()
  const { data, isLoading, isError, error, refetch, isFetching } =
    useAccounts()

  return (
    <div className="flex flex-col gap-[18px]">
      <div className="flex flex-wrap gap-3 items-end justify-between">
        <div className="flex flex-col gap-1">
          <span className="font-mono text-[11px] tracking-[0.14em] uppercase text-ink-muted">
            {data ? `${data.length} accounts` : 'Loading…'}
          </span>
          <h1 className="m-0 text-[25px] font-semibold tracking-[-0.02em]">
            Clients
          </h1>
        </div>
        <Button disabled title="Coming later in Stage 1">
          Add client
        </Button>
      </div>

      {isError && (
        <Alert variant="destructive">
          <AlertTitle className="flex items-center gap-2">
            <AlertTriangle size={14} /> Couldn't load clients
          </AlertTitle>
          <AlertDescription>
            {error instanceof Error ? error.message : 'Unknown error'}. Only
            admins and managers can see accounts — this could be a real
            permissions problem, not an empty table.
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

      {!isError && !isLoading && data && data.length === 0 && (
        <div className="bg-surface border border-border rounded-[12px] p-[40px] flex flex-col items-center gap-2 text-center">
          <Building2 className="text-ink-faint" size={28} />
          <p className="m-0 font-medium text-[14px]">No clients yet</p>
          <p className="m-0 text-[13px] text-ink-muted max-w-[40ch]">
            Accounts you add will show up here, with their engagements and
            staffed team members.
          </p>
        </div>
      )}

      {!isError && !isLoading && data && data.length > 0 && (
        <div className="bg-surface border border-border rounded-[12px] overflow-hidden">
          <Table className="min-w-[860px]">
            <TableHeader>
              <TableRow>
                <TableHead>Account</TableHead>
                <TableHead>Health</TableHead>
                <TableHead>Engagements</TableHead>
                <TableHead>Staffed</TableHead>
                <TableHead>Renewal</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((a) => (
                <TableRow
                  key={a.id}
                  clickable
                  onClick={() => navigate(`/clients/${a.id}`)}
                >
                  <TableCell>
                    <div className="flex flex-col gap-[2px]">
                      <span className="font-medium text-[13.5px]">
                        {a.name}
                      </span>
                      {a.website && (
                        <span className="font-mono text-[10.5px] text-ink-muted">
                          {a.website}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge tone={HEALTH_TONE[a.health]}>
                      {HEALTH_LABEL[a.health]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-ink-secondary">
                    {a.engagementCount}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-[3px]">
                      {a.staffed.map((m, i) => (
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
                  <TableCell
                    className={
                      'font-mono text-[12px] ' +
                      (isRenewalSoon(a.renewalOn)
                        ? 'text-signal-amber'
                        : 'text-ink-secondary')
                    }
                  >
                    {a.renewalOn ?? '—'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
