import { Inbox } from 'lucide-react'

import { Badge, type PillTone } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useConvertLead, useLeads, useSetLeadStatus, type LeadRow, type LeadStatus } from '@/features/leads/use-leads'

const STATUS_TONE: Record<LeadStatus, PillTone> = {
  new: 'blue',
  converted: 'green',
  spam: 'red',
  archived: 'neutral',
}
const STATUS_LABEL: Record<LeadStatus, string> = {
  new: 'New',
  converted: 'Converted',
  spam: 'Spam',
  archived: 'Archived',
}

function LeadCard({ lead }: { lead: LeadRow }) {
  const convert = useConvertLead()
  const setStatus = useSetLeadStatus()

  return (
    <Card>
      <CardContent className="p-[16px_18px] flex flex-col gap-2">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-[2px]">
            <span className="text-[14px] font-semibold">{lead.name}</span>
            <span className="font-mono text-[11.5px] text-ink-muted">{lead.email}{lead.phone ? ` · ${lead.phone}` : ''}</span>
            {lead.company && <span className="text-[12.5px] text-ink-secondary">{lead.company}</span>}
          </div>
          <div className="flex items-center gap-2 flex-none">
            <Badge tone={STATUS_TONE[lead.status]}>{STATUS_LABEL[lead.status]}</Badge>
            <span className="font-mono text-[10.5px] text-ink-faint">{new Date(lead.createdAt).toLocaleString()}</span>
          </div>
        </div>
        {lead.message && <p className="m-0 text-[13px] text-ink-secondary whitespace-pre-wrap">{lead.message}</p>}
        {lead.status === 'new' && (
          <div className="flex items-center gap-2 mt-1">
            <Button
              size="sm"
              disabled={convert.isPending}
              onClick={() => convert.mutate(lead)}
            >
              {convert.isPending ? 'Converting…' : 'Mark converted'}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={setStatus.isPending}
              onClick={() => setStatus.mutate({ id: lead.id, status: 'spam' })}
            >
              Mark spam
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={setStatus.isPending}
              onClick={() => setStatus.mutate({ id: lead.id, status: 'archived' })}
            >
              Archive
            </Button>
          </div>
        )}
        {convert.isError && (
          <p className="m-0 text-[12px] text-signal-red">
            {convert.error instanceof Error ? convert.error.message : 'Failed to convert'}
          </p>
        )}
      </CardContent>
    </Card>
  )
}

export function LeadsInboxPage() {
  const { data: leads, isLoading } = useLeads()
  const newCount = (leads ?? []).filter((l) => l.status === 'new').length

  return (
    <div className="flex flex-col gap-[18px]">
      <div className="flex flex-col gap-1">
        <span className="font-mono text-[11px] tracking-[0.14em] uppercase text-ink-muted">
          {leads ? `${newCount} new · ${leads.length} total` : 'Loading…'}
        </span>
        <h1 className="m-0 text-[25px] font-semibold tracking-[-0.02em]">Leads</h1>
        <p className="m-0 text-[13px] text-ink-muted">
          Submissions from the public lead form. Mark real inquiries converted, or mark spam or
          archive the rest.
        </p>
      </div>

      {isLoading && (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-[80px] w-full" />
          ))}
        </div>
      )}

      {!isLoading && (leads ?? []).length === 0 && (
        <div className="bg-surface border border-border rounded-[12px] p-[40px] flex flex-col items-center gap-2 text-center">
          <Inbox className="text-ink-faint" size={28} />
          <p className="m-0 font-medium text-[14px]">No leads yet</p>
          <p className="m-0 text-[13px] text-ink-muted max-w-[40ch]">
            Submissions from the public form at /lead will show up here.
          </p>
        </div>
      )}

      <div className="flex flex-col gap-3">
        {(leads ?? []).map((lead) => (
          <LeadCard key={lead.id} lead={lead} />
        ))}
      </div>
    </div>
  )
}
