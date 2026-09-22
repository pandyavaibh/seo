import { Download } from 'lucide-react'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useAccount } from '@/features/accounts/use-account'
import { downloadReportPdf } from '@/features/reports/report-pdf'
import { useReports } from '@/features/reports/use-reports'
import { useCurrentMember } from '@/features/team/use-current-member'

export function PortalReportsPage() {
  const { data: currentMember, isLoading: memberLoading } = useCurrentMember()
  const { data: acc } = useAccount(currentMember?.account_id ?? undefined)
  const { data, isLoading } = useReports(currentMember?.account_id ?? undefined)

  if (memberLoading) return <Skeleton className="h-[220px] w-full" />

  return (
    <div className="flex flex-col gap-4">
      <h1 className="m-0 text-[25px] font-semibold tracking-[-0.02em]">Reports</h1>

      {isLoading && <Skeleton className="h-[220px] w-full" />}
      {!isLoading && (data ?? []).length === 0 && (
        <p className="m-0 text-[13px] text-ink-muted">No reports yet.</p>
      )}
      {!isLoading &&
        (data ?? []).map((r) => (
          <Card key={r.id}>
            <CardHeader>
              <CardTitle>
                {r.periodStart} — {r.periodEnd}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-[16px_18px] flex flex-col gap-3">
              <div className="grid gap-[10px]" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))' }}>
                {r.snapshot.search && (
                  <div className="flex flex-col gap-[2px]">
                    <span className="font-mono text-[10px] uppercase text-ink-muted">Search clicks</span>
                    <span className="text-[16px] font-semibold">{r.snapshot.search.clicks.toLocaleString()}</span>
                  </div>
                )}
                {r.snapshot.ga4 && (
                  <div className="flex flex-col gap-[2px]">
                    <span className="font-mono text-[10px] uppercase text-ink-muted">GA4 sessions</span>
                    <span className="text-[16px] font-semibold">{r.snapshot.ga4.sessions.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex flex-col gap-[2px]">
                  <span className="font-mono text-[10px] uppercase text-ink-muted">Links built</span>
                  <span className="text-[16px] font-semibold">{r.snapshot.linksPlaced.length}</span>
                </div>
                <div className="flex flex-col gap-[2px]">
                  <span className="font-mono text-[10px] uppercase text-ink-muted">Tasks done</span>
                  <span className="text-[16px] font-semibold">{r.snapshot.tasksCompleted.length}</span>
                </div>
              </div>
              {r.snapshot.commentary && r.snapshot.commentary.length > 0 && (
                <ul className="m-0 pl-[18px] flex flex-col gap-[3px] text-[12.5px] text-ink-secondary">
                  {r.snapshot.commentary.map((line, i) => (
                    <li key={i}>{line}</li>
                  ))}
                </ul>
              )}
              {r.nextMonthPlan && (
                <p className="m-0 text-[12.5px] text-ink-secondary whitespace-pre-wrap">{r.nextMonthPlan}</p>
              )}
              <div>
                <Button variant="secondary" size="sm" onClick={() => downloadReportPdf(acc?.name ?? 'Client', r)}>
                  <Download size={13} /> Download PDF
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
    </div>
  )
}
