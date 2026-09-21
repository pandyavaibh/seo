import { ArrowLeft } from 'lucide-react'
import * as React from 'react'
import { useNavigate, useParams } from 'react-router-dom'

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
import { useAccount, useTeamMembers } from '@/features/accounts/use-account'
import {
  useContentCalendar,
  useCreateCalendarItem,
  useDeleteCalendarItem,
  useUpdateCalendarStatus,
  type CalendarItem,
  type NewCalendarItemInput,
} from '@/features/social/use-content-calendar'
import { CALENDAR_STATUS_LABEL, CALENDAR_STATUS_TONE, CALENDAR_STATUSES } from '@/lib/content-calendar-status'
import type { ContentCalendarPlatform } from '@/lib/database.types'

const PLATFORMS: ContentCalendarPlatform[] = ['facebook', 'instagram', 'other']
const PLATFORM_LABEL: Record<ContentCalendarPlatform, string> = {
  facebook: 'Facebook',
  instagram: 'Instagram',
  other: 'Other',
}

function NewCalendarItemForm({ accountId, onClose }: { accountId: string; onClose: () => void }) {
  const createItem = useCreateCalendarItem(accountId)
  const { data: teamMembers } = useTeamMembers()
  const [platform, setPlatform] = React.useState<ContentCalendarPlatform>('facebook')
  const [caption, setCaption] = React.useState('')
  const [scheduledOn, setScheduledOn] = React.useState('')
  const [ownerId, setOwnerId] = React.useState('')

  const fieldClass = 'text-[13px] rounded-[8px] border border-border px-3 py-2 bg-surface w-full'

  return (
    <Card>
      <CardHeader>
        <CardTitle>New planned post</CardTitle>
      </CardHeader>
      <CardContent className="p-[16px_18px] flex flex-col gap-3">
        <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
          <label className="flex flex-col gap-1">
            <span className="font-mono text-[10px] tracking-[0.1em] uppercase text-ink-muted">Platform</span>
            <select value={platform} onChange={(e) => setPlatform(e.target.value as ContentCalendarPlatform)} className={fieldClass}>
              {PLATFORMS.map((p) => (
                <option key={p} value={p}>{PLATFORM_LABEL[p]}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="font-mono text-[10px] tracking-[0.1em] uppercase text-ink-muted">Scheduled for</span>
            <input type="date" value={scheduledOn} onChange={(e) => setScheduledOn(e.target.value)} className={fieldClass} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="font-mono text-[10px] tracking-[0.1em] uppercase text-ink-muted">Owner</span>
            <select value={ownerId} onChange={(e) => setOwnerId(e.target.value)} className={fieldClass}>
              <option value="">—</option>
              {(teamMembers ?? []).map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </label>
        </div>
        <label className="flex flex-col gap-1">
          <span className="font-mono text-[10px] tracking-[0.1em] uppercase text-ink-muted">Caption / notes</span>
          <textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            rows={3}
            placeholder="What's the post about?"
            className="text-[13px] rounded-[8px] border border-border px-3 py-2 bg-surface w-full resize-none"
          />
        </label>
        {createItem.isError && (
          <p className="m-0 text-[12px] text-signal-red">
            {createItem.error instanceof Error ? createItem.error.message : 'Failed to create post'}
          </p>
        )}
        <div className="flex items-center gap-2">
          <Button
            disabled={createItem.isPending}
            onClick={() => {
              const input: NewCalendarItemInput = { platform, caption, scheduledOn, ownerId: ownerId || null }
              createItem.mutate(input, { onSuccess: onClose })
            }}
          >
            {createItem.isPending ? 'Adding…' : 'Add to calendar'}
          </Button>
          <Button variant="secondary" onClick={onClose} disabled={createItem.isPending}>
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function CalendarRow({ item, accountId }: { item: CalendarItem; accountId: string }) {
  const updateStatus = useUpdateCalendarStatus(accountId)
  const remove = useDeleteCalendarItem(accountId)

  return (
    <TableRow>
      <TableCell className="text-[12px] font-mono text-ink-muted">{item.scheduledOn ?? '—'}</TableCell>
      <TableCell className="capitalize text-[13px]">{PLATFORM_LABEL[item.platform]}</TableCell>
      <TableCell className="max-w-[320px] truncate text-[13px]">{item.caption ?? '—'}</TableCell>
      <TableCell className="text-[12.5px] text-ink-muted">{item.ownerName ?? '—'}</TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <Badge tone={CALENDAR_STATUS_TONE[item.status]}>{CALENDAR_STATUS_LABEL[item.status]}</Badge>
          <select
            value={item.status}
            onChange={(e) => updateStatus.mutate({ id: item.id, status: e.target.value as CalendarItem['status'] })}
            disabled={updateStatus.isPending}
            className="font-mono text-[11px] border border-border rounded-[6px] px-1 py-[3px] bg-surface"
          >
            {CALENDAR_STATUSES.map((s) => (
              <option key={s} value={s}>{CALENDAR_STATUS_LABEL[s]}</option>
            ))}
          </select>
        </div>
      </TableCell>
      <TableCell>
        <button
          onClick={() => remove.mutate(item.id)}
          disabled={remove.isPending}
          className="border-none bg-transparent font-mono text-[10.5px] text-ink-muted hover:text-signal-red cursor-pointer p-0"
        >
          Remove
        </button>
      </TableCell>
    </TableRow>
  )
}

export function ContentCalendarPage() {
  const { accountId } = useParams<{ accountId: string }>()
  const navigate = useNavigate()
  const { data: acc } = useAccount(accountId)
  const { data, isLoading } = useContentCalendar(accountId)
  const [showNew, setShowNew] = React.useState(false)

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
            {acc?.website ?? '—'} · Content calendar
          </span>
          <h1 className="m-0 text-[25px] font-semibold tracking-[-0.02em]">Content calendar</h1>
        </div>
        {!showNew && <Button onClick={() => setShowNew(true)}>New planned post</Button>}
      </div>

      {showNew && accountId && (
        <NewCalendarItemForm accountId={accountId} onClose={() => setShowNew(false)} />
      )}

      {isLoading && <Skeleton className="h-[220px] w-full" />}

      {!isLoading && (
        <Card>
          <CardContent className="overflow-x-auto p-0">
            {(data ?? []).length === 0 ? (
              <p className="m-0 p-[18px] text-[13px] text-ink-muted">No planned posts yet.</p>
            ) : (
              <Table className="min-w-[640px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Platform</TableHead>
                    <TableHead>Caption</TableHead>
                    <TableHead>Owner</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(data ?? []).map((item) => (
                    <CalendarRow key={item.id} item={item} accountId={accountId!} />
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
