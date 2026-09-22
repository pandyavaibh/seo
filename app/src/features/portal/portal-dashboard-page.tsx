import { Link } from 'react-router-dom'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useAccount } from '@/features/accounts/use-account'
import { PortalCommentsThread } from '@/features/portal/portal-comments-thread'
import { useDeliverables } from '@/features/portal/use-deliverables'
import { usePortalComments } from '@/features/portal/use-portal-comments'
import { usePortalPerformance } from '@/features/portal/use-portal-performance'
import { useReports } from '@/features/reports/use-reports'
import { useCurrentMember } from '@/features/team/use-current-member'

function StatTile({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="bg-surface border border-border rounded-[12px] p-[14px_16px] flex flex-col gap-[6px]">
      <span className="font-mono text-[10px] tracking-[0.12em] uppercase text-ink-muted">{label}</span>
      <span className="text-[23px] font-semibold tracking-[-0.02em] leading-none">{value}</span>
      {note && <span className="text-[11.5px] text-ink-muted">{note}</span>}
    </div>
  )
}

function PerformanceTiles({ accountId }: { accountId: string }) {
  const { data: perf, isLoading } = usePortalPerformance(accountId)

  if (isLoading || !perf) return <Skeleton className="h-[76px] w-full" />

  return (
    <section className="grid gap-[10px]" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(168px, 1fr))' }}>
      <StatTile
        label="Organic clicks (28d)"
        value={perf.gscConnected ? (perf.organicClicks28d ?? 0).toLocaleString() : '—'}
        note={perf.gscConnected ? undefined : 'Search not connected yet'}
      />
      <StatTile
        label="Organic impressions (28d)"
        value={perf.gscConnected ? (perf.organicImpressions28d ?? 0).toLocaleString() : '—'}
        note={perf.gscConnected ? undefined : 'Search not connected yet'}
      />
      <StatTile
        label="Conversions (28d)"
        value={perf.ga4Connected ? (perf.conversions28d ?? 0).toLocaleString() : '—'}
        note={perf.ga4Connected ? undefined : 'Analytics not connected yet'}
      />
      <StatTile
        label="Keywords in top 10"
        value={perf.keywordsTop10 != null ? String(perf.keywordsTop10) : '—'}
      />
      <StatTile
        label="Backlinks placed"
        value={String(perf.backlinksPlacedTotal)}
        note={`${perf.backlinksPlacedThisMonth} this month`}
      />
    </section>
  )
}

function ConversationPreviewCard({ accountId }: { accountId: string }) {
  const { data: comments, isLoading } = usePortalComments(accountId)
  const latest = (comments ?? [])[comments && comments.length > 0 ? comments.length - 1 : 0]

  return (
    <Card>
      <CardHeader>
        <CardTitle>Client conversation</CardTitle>
      </CardHeader>
      <CardContent className="p-[16px_18px] flex flex-col gap-2">
        {isLoading && <Skeleton className="h-[50px] w-full" />}
        {!isLoading && (comments ?? []).length === 0 && (
          <p className="m-0 text-[13px] text-ink-muted">No messages yet — say hello below.</p>
        )}
        {!isLoading && latest && (
          <div className="flex flex-col gap-[2px]">
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-[12.5px] font-medium">{latest.authorName ?? 'Someone'}</span>
              <span className="font-mono text-[10.5px] text-ink-muted">
                {new Date(latest.createdAt).toLocaleString()}
              </span>
            </div>
            <p className="m-0 text-[13px] whitespace-pre-wrap line-clamp-2">{latest.body}</p>
          </div>
        )}
        {!isLoading && comments && comments.length > 0 && (
          <span className="font-mono text-[11px] text-ink-muted">
            {comments.length} message{comments.length === 1 ? '' : 's'} total — full thread below
          </span>
        )}
      </CardContent>
    </Card>
  )
}

function DeliverablesList({ accountId }: { accountId: string }) {
  const { data, isLoading } = useDeliverables(accountId)
  return (
    <Card>
      <CardHeader>
        <CardTitle>Deliverables</CardTitle>
      </CardHeader>
      <CardContent className="p-[16px_18px] flex flex-col gap-2">
        {isLoading && <Skeleton className="h-[60px] w-full" />}
        {!isLoading && (data ?? []).length === 0 && (
          <p className="m-0 text-[13px] text-ink-muted">Nothing delivered yet.</p>
        )}
        {!isLoading &&
          (data ?? []).map((d) => (
            <div key={d.id} className="flex flex-col gap-[1px]">
              {d.url ? (
                <a href={d.url} target="_blank" rel="noreferrer" className="text-[13px] text-brand hover:underline">
                  {d.title}
                </a>
              ) : (
                <span className="text-[13px]">{d.title}</span>
              )}
              <span className="font-mono text-[10.5px] text-ink-muted">{d.deliveredOn}</span>
            </div>
          ))}
      </CardContent>
    </Card>
  )
}

function LatestReportCard({ accountId }: { accountId: string }) {
  const { data, isLoading } = useReports(accountId)
  const latest = (data ?? [])[0]

  return (
    <Card>
      <CardHeader>
        <CardTitle>Latest report</CardTitle>
      </CardHeader>
      <CardContent className="p-[16px_18px] flex flex-col gap-2">
        {isLoading && <Skeleton className="h-[60px] w-full" />}
        {!isLoading && !latest && <p className="m-0 text-[13px] text-ink-muted">No reports yet.</p>}
        {!isLoading && latest && (
          <>
            <p className="m-0 text-[13px]">
              {latest.periodStart} to {latest.periodEnd}
            </p>
            <div className="grid gap-[8px]" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))' }}>
              {latest.snapshot.search && (
                <div className="flex flex-col gap-[2px]">
                  <span className="font-mono text-[10px] uppercase text-ink-muted">Search clicks</span>
                  <span className="text-[15px] font-semibold">{latest.snapshot.search.clicks.toLocaleString()}</span>
                </div>
              )}
              <div className="flex flex-col gap-[2px]">
                <span className="font-mono text-[10px] uppercase text-ink-muted">Links built</span>
                <span className="text-[15px] font-semibold">{latest.snapshot.linksPlaced}</span>
              </div>
            </div>
            <Link to="/portal/reports" className="text-[12.5px] text-brand hover:underline">
              View all reports →
            </Link>
          </>
        )}
      </CardContent>
    </Card>
  )
}

export function PortalDashboardPage() {
  const { data: currentMember, isLoading } = useCurrentMember()
  const { data: acc } = useAccount(currentMember?.account_id ?? undefined)

  if (isLoading) return <Skeleton className="h-[220px] w-full" />

  if (!currentMember?.account_id) {
    return (
      <p className="m-0 text-[13px] text-ink-muted">
        Your account isn't linked to a client yet — ask your account manager to connect it.
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <span className="font-mono text-[11px] tracking-[0.14em] uppercase text-ink-muted">
          {acc?.website ?? '—'}
        </span>
        <h1 className="m-0 text-[25px] font-semibold tracking-[-0.02em]">{acc?.name ?? 'Your account'}</h1>
      </div>

      <PerformanceTiles accountId={currentMember.account_id} />

      <section className="flex flex-wrap gap-3 items-start">
        <div className="flex-[1_1_300px] min-w-0">
          <DeliverablesList accountId={currentMember.account_id} />
        </div>
        <div className="flex-[1_1_300px] min-w-0">
          <LatestReportCard accountId={currentMember.account_id} />
        </div>
        <div className="flex-[1_1_300px] min-w-0">
          <ConversationPreviewCard accountId={currentMember.account_id} />
        </div>
      </section>

      <PortalCommentsThread accountId={currentMember.account_id} canModerate={false} />
    </div>
  )
}
