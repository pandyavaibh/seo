import { ArrowLeft, Download } from 'lucide-react'
import * as React from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useAccount } from '@/features/accounts/use-account'
import { downloadReportPdf } from '@/features/reports/report-pdf'
import {
  useReportSchedule,
  useSaveReportSchedule,
  useSetReportScheduleActive,
  type ReportSchedule,
} from '@/features/reports/use-report-schedule'
import {
  useDeleteReport,
  useGenerateReport,
  useMarkReportSent,
  useReports,
  useSendReportEmail,
  type ReportRow,
} from '@/features/reports/use-reports'

function currentMonthRange() {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), 1)
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  const iso = (d: Date) => d.toISOString().slice(0, 10)
  return { start: iso(start), end: iso(end) }
}

function GenerateReportForm({ accountId, onClose }: { accountId: string; onClose: () => void }) {
  const generate = useGenerateReport(accountId)
  const defaults = currentMonthRange()
  const [periodStart, setPeriodStart] = React.useState(defaults.start)
  const [periodEnd, setPeriodEnd] = React.useState(defaults.end)
  const [nextMonthPlan, setNextMonthPlan] = React.useState('')

  const fieldClass = 'text-[13px] rounded-[8px] border border-border px-3 py-2 bg-surface w-full'

  return (
    <Card>
      <CardHeader>
        <CardTitle>Generate report</CardTitle>
      </CardHeader>
      <CardContent className="p-[16px_18px] flex flex-col gap-3">
        <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))' }}>
          <label className="flex flex-col gap-1">
            <span className="font-mono text-[10px] tracking-[0.1em] uppercase text-ink-muted">Period start</span>
            <input type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} className={fieldClass} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="font-mono text-[10px] tracking-[0.1em] uppercase text-ink-muted">Period end</span>
            <input type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} className={fieldClass} />
          </label>
        </div>
        <label className="flex flex-col gap-1">
          <span className="font-mono text-[10px] tracking-[0.1em] uppercase text-ink-muted">Next month's plan</span>
          <textarea
            value={nextMonthPlan}
            onChange={(e) => setNextMonthPlan(e.target.value)}
            rows={3}
            placeholder="What's planned for next month?"
            className="text-[13px] rounded-[8px] border border-border px-3 py-2 bg-surface w-full resize-none"
          />
        </label>
        {generate.isError && (
          <p className="m-0 text-[12px] text-signal-red">
            {generate.error instanceof Error ? generate.error.message : 'Failed to generate report'}
          </p>
        )}
        <div className="flex items-center gap-2">
          <Button
            disabled={!periodStart || !periodEnd || generate.isPending}
            onClick={() => generate.mutate({ periodStart, periodEnd, nextMonthPlan }, { onSuccess: onClose })}
          >
            {generate.isPending ? 'Pulling data…' : 'Generate'}
          </Button>
          <Button variant="secondary" onClick={onClose} disabled={generate.isPending}>
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function SendEmailBox({ accountId, reportId }: { accountId: string; reportId: string }) {
  const [open, setOpen] = React.useState(false)
  const [toEmail, setToEmail] = React.useState('')
  const send = useSendReportEmail(accountId)

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="border-none bg-transparent font-mono text-[10.5px] text-ink-muted hover:text-ink cursor-pointer p-0"
      >
        Send by email
      </button>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <input
        value={toEmail}
        onChange={(e) => setToEmail(e.target.value)}
        placeholder="client@example.com"
        className="text-[12px] font-mono border border-border rounded-[6px] px-2 py-1"
      />
      <Button
        size="sm"
        disabled={!toEmail.trim() || send.isPending}
        onClick={() => send.mutate({ reportId, toEmail: toEmail.trim() }, { onSuccess: () => setOpen(false) })}
      >
        {send.isPending ? 'Sending…' : 'Send'}
      </Button>
      <button
        onClick={() => setOpen(false)}
        className="border-none bg-transparent text-[12px] text-ink-muted hover:text-ink cursor-pointer"
      >
        Cancel
      </button>
      {send.isError && (
        <span className="text-[12px] text-signal-red">
          {send.error instanceof Error ? send.error.message : 'Send failed'}
        </span>
      )}
    </div>
  )
}

function ReportCard({ accountId, accountName, report }: { accountId: string; accountName: string; report: ReportRow }) {
  const markSent = useMarkReportSent(accountId)
  const remove = useDeleteReport(accountId)
  const s = report.snapshot

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>
          {report.periodStart} — {report.periodEnd}
        </CardTitle>
        <Badge tone={report.status === 'sent' ? 'green' : 'neutral'}>
          {report.status === 'sent' ? 'Sent' : 'Draft'}
        </Badge>
      </CardHeader>
      <CardContent className="p-[16px_18px] flex flex-col gap-3">
        <div className="grid gap-[10px]" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))' }}>
          {s.search && (
            <div className="flex flex-col gap-[2px]">
              <span className="font-mono text-[10px] uppercase text-ink-muted">Search clicks</span>
              <span className="text-[16px] font-semibold">{s.search.clicks.toLocaleString()}</span>
            </div>
          )}
          {s.ga4 && (
            <div className="flex flex-col gap-[2px]">
              <span className="font-mono text-[10px] uppercase text-ink-muted">GA4 sessions</span>
              <span className="text-[16px] font-semibold">{s.ga4.sessions.toLocaleString()}</span>
            </div>
          )}
          <div className="flex flex-col gap-[2px]">
            <span className="font-mono text-[10px] uppercase text-ink-muted">Links built</span>
            <span className="text-[16px] font-semibold">{s.linksPlaced.length}</span>
          </div>
          <div className="flex flex-col gap-[2px]">
            <span className="font-mono text-[10px] uppercase text-ink-muted">Tasks done</span>
            <span className="text-[16px] font-semibold">{s.tasksCompleted.length}</span>
          </div>
          <div className="flex flex-col gap-[2px]">
            <span className="font-mono text-[10px] uppercase text-ink-muted">Keywords ↑ / ↓</span>
            <span className="text-[16px] font-semibold">
              {s.keywordsImproved} / {s.keywordsDeclined}
            </span>
          </div>
        </div>
        {s.commentary && s.commentary.length > 0 && (
          <ul className="m-0 pl-[18px] flex flex-col gap-[3px] text-[12.5px] text-ink-secondary">
            {s.commentary.map((line, i) => (
              <li key={i}>{line}</li>
            ))}
          </ul>
        )}
        {report.nextMonthPlan && (
          <p className="m-0 text-[12.5px] text-ink-secondary whitespace-pre-wrap">{report.nextMonthPlan}</p>
        )}
        <div className="flex items-center gap-3 flex-wrap">
          <Button variant="secondary" size="sm" onClick={() => downloadReportPdf(accountName, report)}>
            <Download size={13} /> PDF
          </Button>
          {report.status === 'draft' && (
            <button
              onClick={() => markSent.mutate(report.id)}
              disabled={markSent.isPending}
              className="border-none bg-transparent font-mono text-[10.5px] text-ink-muted hover:text-ink cursor-pointer p-0"
            >
              Mark as sent
            </button>
          )}
          <SendEmailBox accountId={accountId} reportId={report.id} />
          <button
            onClick={() => remove.mutate(report.id)}
            disabled={remove.isPending}
            className="border-none bg-transparent font-mono text-[10.5px] text-ink-muted hover:text-signal-red cursor-pointer p-0"
          >
            Delete
          </button>
        </div>
      </CardContent>
    </Card>
  )
}

function ScheduleForm({ accountId, schedule }: { accountId: string; schedule: ReportSchedule | null }) {
  const save = useSaveReportSchedule(accountId)
  const [email, setEmail] = React.useState(schedule?.recipientEmail ?? '')
  const [sendDay, setSendDay] = React.useState(String(schedule?.sendDay ?? 1))

  const fieldClass = 'text-[13px] rounded-[8px] border border-border px-3 py-2 bg-surface'

  return (
    <div className="flex flex-wrap items-center gap-2">
      <input
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        type="email"
        placeholder="client@example.com"
        className={fieldClass + ' flex-1 min-w-[160px]'}
      />
      <label className="flex items-center gap-2 text-[12.5px] text-ink-muted">
        Day of month
        <input
          value={sendDay}
          onChange={(e) => setSendDay(e.target.value)}
          inputMode="numeric"
          className={fieldClass + ' w-[60px]'}
        />
      </label>
      <Button
        size="sm"
        disabled={!email.trim() || save.isPending}
        onClick={() =>
          save.mutate({ id: schedule?.id ?? null, recipientEmail: email, sendDay: Math.min(28, Math.max(1, Number(sendDay) || 1)) })
        }
      >
        {schedule ? 'Update' : 'Schedule'}
      </Button>
      {save.isError && (
        <p className="m-0 w-full text-[12px] text-signal-red">
          {save.error instanceof Error ? save.error.message : 'Failed to save'}
        </p>
      )}
    </div>
  )
}

function RecurringSendCard({ accountId }: { accountId: string }) {
  const { data: schedule, isLoading } = useReportSchedule(accountId)
  const setActive = useSetReportScheduleActive(accountId)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recurring send</CardTitle>
        <span className="font-mono text-[11px] text-ink-muted">
          Auto-generates and emails last month's report on the day below — needs RESEND_API_KEY set
        </span>
      </CardHeader>
      <CardContent className="p-[16px_18px] flex flex-col gap-3">
        {isLoading && <Skeleton className="h-[40px] w-full" />}
        {!isLoading && <ScheduleForm key={schedule?.id ?? 'new'} accountId={accountId} schedule={schedule ?? null} />}
        {!isLoading && schedule && (
          <div className="flex items-center gap-2">
            <Badge tone={schedule.active ? 'green' : 'neutral'}>{schedule.active ? 'Active' : 'Paused'}</Badge>
            <button
              onClick={() => setActive.mutate({ id: schedule.id, active: !schedule.active })}
              disabled={setActive.isPending}
              className="border-none bg-transparent font-mono text-[11px] text-ink-muted hover:text-ink cursor-pointer p-0"
            >
              {schedule.active ? 'Pause' : 'Resume'}
            </button>
            {schedule.lastSentPeriodEnd && (
              <span className="font-mono text-[11px] text-ink-faint">Last sent for period ending {schedule.lastSentPeriodEnd}</span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export function ReportsPage() {
  const { accountId } = useParams<{ accountId: string }>()
  const navigate = useNavigate()
  const { data: acc } = useAccount(accountId)
  const { data, isLoading } = useReports(accountId)
  const [showGenerate, setShowGenerate] = React.useState(false)

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
            {acc?.website ?? '—'} · Reports
          </span>
          <h1 className="m-0 text-[25px] font-semibold tracking-[-0.02em]">Monthly reports</h1>
        </div>
        {!showGenerate && <Button onClick={() => setShowGenerate(true)}>Generate report</Button>}
      </div>

      {accountId && <RecurringSendCard accountId={accountId} />}

      {showGenerate && accountId && (
        <GenerateReportForm accountId={accountId} onClose={() => setShowGenerate(false)} />
      )}

      {isLoading && <Skeleton className="h-[220px] w-full" />}

      {!isLoading && (data ?? []).length === 0 && (
        <p className="m-0 text-[13px] text-ink-muted">No reports generated yet.</p>
      )}

      {!isLoading &&
        (data ?? []).map((r) => (
          <ReportCard key={r.id} accountId={accountId!} accountName={acc?.name ?? 'Client'} report={r} />
        ))}
    </div>
  )
}
