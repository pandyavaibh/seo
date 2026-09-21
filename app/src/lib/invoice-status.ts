import type { PillTone } from '@/components/ui/badge'
import type { InvoiceStatus } from '@/lib/database.types'

export const INVOICE_STATUS_TONE: Record<InvoiceStatus, PillTone> = {
  draft: 'neutral',
  sent: 'blue',
  paid: 'green',
  overdue: 'red',
}
export const INVOICE_STATUS_LABEL: Record<InvoiceStatus, string> = {
  draft: 'Draft',
  sent: 'Sent',
  paid: 'Paid',
  overdue: 'Overdue',
}
export const INVOICE_STATUSES: InvoiceStatus[] = ['draft', 'sent', 'paid', 'overdue']
