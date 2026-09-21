import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useInvoices } from '@/features/billing/use-billing'
import { useCurrentMember } from '@/features/team/use-current-member'
import { INVOICE_STATUS_LABEL, INVOICE_STATUS_TONE } from '@/lib/invoice-status'

function formatCents(cents: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(cents / 100)
}

export function PortalInvoicesPage() {
  const { data: currentMember, isLoading: memberLoading } = useCurrentMember()
  const { data, isLoading } = useInvoices(currentMember?.account_id ?? undefined)

  if (memberLoading) return <Skeleton className="h-[220px] w-full" />

  return (
    <div className="flex flex-col gap-4">
      <h1 className="m-0 text-[25px] font-semibold tracking-[-0.02em]">Invoices</h1>

      {isLoading && <Skeleton className="h-[220px] w-full" />}

      {!isLoading && (
        <Card>
          <CardContent className="overflow-x-auto p-0">
            {(data ?? []).length === 0 ? (
              <p className="m-0 p-[18px] text-[13px] text-ink-muted">No invoices yet.</p>
            ) : (
              <Table className="min-w-[480px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Period</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Due</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(data ?? []).map((inv) => (
                    <TableRow key={inv.id}>
                      <TableCell className="text-[12px] font-mono text-ink-muted">
                        {inv.periodStart ?? '—'} – {inv.periodEnd ?? '—'}
                      </TableCell>
                      <TableCell className="font-mono text-[12px]">{formatCents(inv.amountCents)}</TableCell>
                      <TableCell className="text-[12px] text-ink-muted">{inv.dueOn ?? '—'}</TableCell>
                      <TableCell>
                        <Badge tone={INVOICE_STATUS_TONE[inv.status]}>{INVOICE_STATUS_LABEL[inv.status]}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
