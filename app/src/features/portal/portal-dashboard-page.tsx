import { Link } from 'react-router-dom'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useAccount } from '@/features/accounts/use-account'
import { PortalCommentsThread } from '@/features/portal/portal-comments-thread'
import { useDeliverables } from '@/features/portal/use-deliverables'
import { useReports } from '@/features/reports/use-reports'
import { useCurrentMember } from '@/features/team/use-current-member'

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
                <span className="text-[15px] font-semibold">{latest.snapshot.linksPlaced.length}</span>
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

      <section className="flex flex-wrap gap-3 items-start">
        <div className="flex-[1_1_300px] min-w-0">
          <DeliverablesList accountId={currentMember.account_id} />
        </div>
        <div className="flex-[1_1_300px] min-w-0">
          <LatestReportCard accountId={currentMember.account_id} />
        </div>
      </section>

      <PortalCommentsThread accountId={currentMember.account_id} canModerate={false} />
    </div>
  )
}
