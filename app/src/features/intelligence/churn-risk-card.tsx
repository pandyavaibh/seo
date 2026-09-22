import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useChurnRisk } from '@/features/intelligence/use-churn-risk'
import type { PillTone } from '@/components/ui/badge'

const LEVEL_TONE: Record<string, PillTone> = { low: 'green', medium: 'amber', high: 'red' }
const LEVEL_LABEL: Record<string, string> = { low: 'Low risk', medium: 'Medium risk', high: 'High risk' }

export function ChurnRiskCard({ accountId }: { accountId: string }) {
  const { data, isLoading } = useChurnRisk(accountId)

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>Churn risk</CardTitle>
        {data && <Badge tone={LEVEL_TONE[data.level]}>{LEVEL_LABEL[data.level]}</Badge>}
      </CardHeader>
      <CardContent className="p-[16px_18px] flex flex-col gap-2">
        {isLoading && <Skeleton className="h-[60px] w-full" />}
        {!isLoading && data && data.factors.length === 0 && (
          <p className="m-0 text-[13px] text-ink-muted">No risk factors detected.</p>
        )}
        {!isLoading &&
          data &&
          data.factors.map((f) => (
            <div key={f.label} className="flex items-baseline justify-between gap-2">
              <span className="text-[12.5px]">{f.detail}</span>
              <span className="font-mono text-[11px] text-ink-muted">+{f.points}</span>
            </div>
          ))}
        <p className="m-0 mt-2 text-[11px] text-ink-faint">
          Fixed point rubric (health, traffic trend, overdue invoices, delivery and portal
          activity) — not a trained model. See docs/STAGE_8.md for the exact scoring.
        </p>
      </CardContent>
    </Card>
  )
}
