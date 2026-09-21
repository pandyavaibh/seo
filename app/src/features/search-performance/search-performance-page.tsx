import { AlertTriangle, ArrowLeft } from 'lucide-react'
import * as React from 'react'
import { useNavigate, useParams } from 'react-router-dom'

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
import { useAccount } from '@/features/accounts/use-account'
import {
  useSearchPerformance,
  useSetSearchConnection,
  useSyncSearchPerformance,
  type ConnectionInfo,
} from '@/features/search-performance/use-search-performance'

function windowTotal(values: number[]) {
  return values.reduce((s, v) => s + v, 0)
}

function StatTile({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="bg-surface border border-border rounded-[12px] p-[14px_16px] flex flex-col gap-[6px]">
      <span className="font-mono text-[10px] tracking-[0.12em] uppercase text-ink-muted">
        {label}
      </span>
      <span className="text-[23px] font-semibold tracking-[-0.02em] leading-none">
        {value}
      </span>
      {note && <span className="text-[11.5px] font-medium text-ink-muted">{note}</span>}
    </div>
  )
}

function ConnectionPill({ label, info }: { label: string; info: ConnectionInfo }) {
  const granted = info.status === 'granted'
  return (
    <Badge tone={granted ? 'green' : 'amber'} className="flex items-center gap-[6px] px-[11px] py-[5px]">
      <span
        className="w-[6px] h-[6px] rounded-full"
        style={{ background: 'currentColor' }}
      />
      {label} — {granted ? 'Access granted' : 'Needs access'}
    </Badge>
  )
}

function ConnectionSetupCard({
  accountId,
  source,
  label,
  info,
  placeholder,
  helpText,
}: {
  accountId: string
  source: 'gsc' | 'ga4'
  label: string
  info: ConnectionInfo
  placeholder: string
  helpText: string
}) {
  const [property, setProperty] = React.useState(info.property ?? '')
  const setConnection = useSetSearchConnection(accountId)
  const sync = useSyncSearchPerformance(accountId)
  const result = sync.data?.results?.[source]

  return (
    <Card>
      <CardContent className="p-[20px_22px] flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="m-0 text-[14.5px] font-semibold">{label} access needed</h2>
          <p className="m-0 text-[13px] leading-[1.55] text-ink-muted max-w-[64ch]">
            {helpText}
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <div className="flex flex-col gap-1 flex-1 min-w-[240px]">
            <span className="font-mono text-[10px] tracking-[0.1em] uppercase text-ink-muted">
              {source === 'gsc' ? 'Search Console property (site URL)' : 'GA4 property (properties/…)'}
            </span>
            <input
              value={property}
              onChange={(e) => setProperty(e.target.value)}
              placeholder={placeholder}
              className="text-[13px] rounded-[8px] border border-border px-3 py-2 font-mono bg-surface"
            />
          </div>
          <Button
            variant="secondary"
            disabled={!property.trim() || setConnection.isPending}
            onClick={() => setConnection.mutate({ source, property: property.trim() })}
          >
            {setConnection.isPending ? 'Saving…' : 'Save'}
          </Button>
          <Button
            disabled={!info.property || sync.isPending}
            onClick={() => sync.mutate()}
          >
            {sync.isPending ? 'Checking…' : 'Check access'}
          </Button>
        </div>
        {result && (
          <p className={`m-0 text-[12px] ${result.status === 'granted' ? 'text-signal-green' : 'text-signal-red'}`}>
            {result.status === 'granted'
              ? 'Access confirmed — data will appear after the next sync.'
              : (result.error ?? 'Still no access.')}
          </p>
        )}
        {sync.isError && (
          <p className="m-0 text-[12px] text-signal-red">
            {sync.error instanceof Error ? sync.error.message : 'Sync failed'}
          </p>
        )}
      </CardContent>
    </Card>
  )
}

export function SearchPerformancePage() {
  const { accountId } = useParams<{ accountId: string }>()
  const navigate = useNavigate()
  const { data: acc } = useAccount(accountId)
  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useSearchPerformance(accountId)
  const sync = useSyncSearchPerformance(accountId!)

  if (isError) {
    return (
      <Alert variant="destructive">
        <AlertTitle className="flex items-center gap-2">
          <AlertTriangle size={14} /> Couldn't load search performance
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
    )
  }

  const last28Gsc = (data?.gscDaily ?? []).slice(-28)
  const clicks = windowTotal(last28Gsc.map((d) => d.clicks))
  const impressions = windowTotal(last28Gsc.map((d) => d.impressions))
  const avgCtr = last28Gsc.length > 0 ? windowTotal(last28Gsc.map((d) => d.ctr)) / last28Gsc.length : 0
  const avgPosition = last28Gsc.length > 0 ? windowTotal(last28Gsc.map((d) => d.avgPosition)) / last28Gsc.length : 0
  const last28Ga4 = (data?.ga4Daily ?? []).slice(-28)
  const sessions = windowTotal(last28Ga4.map((d) => d.sessions))
  const conversions = windowTotal(last28Ga4.map((d) => d.conversions))

  return (
    <div className="flex flex-col gap-4">
      <button
        onClick={() => navigate(accountId ? `/clients/${accountId}` : '/clients')}
        className="self-start flex items-center gap-1 border-none bg-transparent font-mono text-[11px] tracking-[0.1em] uppercase text-ink-muted hover:text-ink cursor-pointer p-0"
      >
        <ArrowLeft size={12} /> {acc?.name ?? 'Account'}
      </button>

      <div className="flex flex-wrap gap-3 items-end justify-between">
        <div className="flex flex-col gap-1">
          <span className="font-mono text-[11px] tracking-[0.14em] uppercase text-ink-muted">
            {acc?.website ?? '—'} · Search &amp; Analytics
          </span>
          <h1 className="m-0 text-[25px] font-semibold tracking-[-0.02em]">Search performance</h1>
        </div>
        {data && (
          <div className="flex items-center gap-2">
            <ConnectionPill label="Search Console" info={data.gsc} />
            <ConnectionPill label="GA4" info={data.ga4} />
            <Button
              variant="secondary"
              disabled={sync.isPending || (!data.gsc.property && !data.ga4.property)}
              onClick={() => sync.mutate()}
            >
              {sync.isPending ? 'Syncing…' : 'Sync now'}
            </Button>
          </div>
        )}
      </div>

      {isLoading && (
        <div className="flex flex-col gap-4">
          <Skeleton className="h-[90px] w-full" />
          <Skeleton className="h-[220px] w-full" />
        </div>
      )}

      {!isLoading && data && (
        <>
          {data.gsc.status === 'granted' && last28Gsc.length > 0 ? (
            <div className="flex flex-col gap-4">
              {data.gsc.lastSyncedAt && (
                <span className="font-mono text-[10.5px] text-ink-faint">
                  Synced {new Date(data.gsc.lastSyncedAt).toLocaleString()} · nightly refresh, free Search Console API
                </span>
              )}
              <section
                className="grid gap-[10px]"
                style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(168px, 1fr))' }}
              >
                <StatTile label="Clicks (28d)" value={clicks.toLocaleString()} />
                <StatTile label="Impressions (28d)" value={impressions.toLocaleString()} />
                <StatTile label="Average CTR" value={`${(avgCtr * 100).toFixed(1)}%`} />
                <StatTile label="Average position" value={avgPosition.toFixed(1)} />
              </section>

              <Card>
                <CardHeader>
                  <CardTitle>Top queries</CardTitle>
                </CardHeader>
                <CardContent className="overflow-x-auto">
                  {data.queries.length === 0 ? (
                    <p className="m-0 p-[16px_18px] text-[13px] text-ink-muted">
                      No query data yet — appears after the first sync.
                    </p>
                  ) : (
                    <Table className="min-w-[480px]">
                      <TableHeader>
                        <TableRow>
                          <TableHead>Query</TableHead>
                          <TableHead>Clicks</TableHead>
                          <TableHead>CTR</TableHead>
                          <TableHead>Avg pos</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {data.queries.map((q) => (
                          <TableRow key={q.query}>
                            <TableCell>{q.query}</TableCell>
                            <TableCell className="font-mono text-[12px]">{q.clicks}</TableCell>
                            <TableCell className="font-mono text-[12px] text-ink-muted">
                              {(q.ctr * 100).toFixed(1)}%
                            </TableCell>
                            <TableCell className="font-mono text-[12px] text-ink-muted">
                              {q.avgPosition.toFixed(1)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </div>
          ) : (
            <ConnectionSetupCard
              accountId={accountId!}
              source="gsc"
              label="Search Console"
              info={data.gsc}
              placeholder="https://example.com/"
              helpText="Add the sync service account as a user on this property in Search Console (Settings → Users and permissions — Restricted is enough), enter the site URL exactly as it's registered there, then check access."
            />
          )}

          {data.ga4.status === 'granted' && last28Ga4.length > 0 ? (
            <div className="bg-brand rounded-[12px] p-[18px_20px] flex flex-wrap gap-6 items-center text-white">
              <div className="flex flex-col gap-1 min-w-[160px]">
                <h2 className="m-0 text-[14.5px] font-semibold">GA4 — sessions</h2>
                <span className="text-[26px] font-semibold">{sessions.toLocaleString()}</span>
                <span className="text-[11px] opacity-80">{conversions.toLocaleString()} conversions · 28 days</span>
              </div>
            </div>
          ) : (
            <ConnectionSetupCard
              accountId={accountId!}
              source="ga4"
              label="GA4"
              info={data.ga4}
              placeholder="properties/123456789"
              helpText="Add the same sync service account as a Viewer on this GA4 property (Admin → Property Access Management), enter its property ID, then check access."
            />
          )}
        </>
      )}
    </div>
  )
}
