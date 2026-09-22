import * as React from 'react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { currentMonthKey } from '@/features/checklist/use-checklist'
import {
  useAddOffpageEntry,
  useDeleteOffpageEntry,
  useOffpageActivity,
  useOffpageNote,
  useRecurringOffpageTasks,
  useSetOffpageNote,
  useToggleRecurringInstance,
  type ActivityGroup,
  type OffpageActivityRow,
  type RecurringTask,
} from '@/features/checklist/use-offpage'
import { useActivityFeed, type ActivityFeedItem } from '@/features/projects/use-activity-feed'
import { useCurrentMember } from '@/features/team/use-current-member'

function todayKey() {
  return new Date().toISOString().slice(0, 10)
}

function formatEntryDate(entryDate: string) {
  return new Date(`${entryDate}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

const GROUP_LABEL: Record<ActivityGroup, string> = {
  backlinks: 'Backlinks',
  on_page: 'On-Page',
  technical: 'Technical',
}

const GROUP_HINT: Record<ActivityGroup, string> = {
  backlinks: 'Per-type link-building targets, logged as they go live this month.',
  on_page: 'On-page & structured data checks — logged once done, resets each month.',
  technical: 'Technical foundation checks — logged once done, resets each month.',
}

function LogActivityControl({
  group,
  types,
  projectId,
  month,
}: {
  group: ActivityGroup
  types: OffpageActivityRow[]
  projectId: string
  month: string
}) {
  const { data: currentMember } = useCurrentMember()
  const addEntry = useAddOffpageEntry(projectId, month)
  const [pickedType, setPickedType] = React.useState<string | null>(null)
  const activityType = types.some((t) => t.activityType === pickedType)
    ? pickedType!
    : types[0]?.activityType ?? ''
  const [count, setCount] = React.useState(group === 'backlinks' ? '' : '1')
  const [note, setNote] = React.useState('')

  const submit = () => {
    const n = Number(count)
    if (!activityType || !Number.isFinite(n) || n <= 0) return
    addEntry.mutate(
      { activityType, entryDate: todayKey(), count: n, note, createdBy: currentMember?.id ?? null },
      { onSuccess: () => { setNote(''); if (group !== 'backlinks') setCount('1') } },
    )
  }

  return (
    <div className="flex flex-wrap items-end gap-2 p-[12px] rounded-[10px] bg-surface-sunken-2 border border-border-light">
      <label className="flex flex-col gap-1 text-[10.5px] font-mono uppercase tracking-[0.06em] text-ink-muted flex-1 min-w-[180px]">
        Activity
        <select
          value={activityType}
          onChange={(e) => setPickedType(e.target.value)}
          className="text-[13px] border border-border rounded-[6px] px-2 py-1 bg-surface"
        >
          {types.map((t) => (
            <option key={t.activityType} value={t.activityType}>{t.activityType}</option>
          ))}
        </select>
      </label>
      {group === 'backlinks' && (
        <label className="flex flex-col gap-1 text-[10.5px] font-mono uppercase tracking-[0.06em] text-ink-muted">
          Count
          <input
            value={count}
            onChange={(e) => setCount(e.target.value)}
            inputMode="numeric"
            placeholder="0"
            className="w-[64px] text-[13px] font-mono border border-border rounded-[6px] px-2 py-1"
          />
        </label>
      )}
      <label className="flex flex-col gap-1 text-[10.5px] font-mono uppercase tracking-[0.06em] text-ink-muted flex-1 min-w-[140px]">
        Note (optional)
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="text-[13px] border border-border rounded-[6px] px-2 py-1"
        />
      </label>
      <span className="font-mono text-[11px] text-ink-muted pb-[7px]">Today · {todayKey()}</span>
      <Button size="sm" disabled={addEntry.isPending || !activityType} onClick={submit}>
        {addEntry.isPending ? 'Logging…' : 'Log'}
      </Button>
      {addEntry.isError && (
        <p className="m-0 w-full text-[11.5px] text-signal-red">
          {addEntry.error instanceof Error ? addEntry.error.message : 'Failed to log entry'}
        </p>
      )}
    </div>
  )
}

function ActivityTypeRow({ row, projectId, month }: { row: OffpageActivityRow; projectId: string; month: string }) {
  const deleteEntry = useDeleteOffpageEntry(projectId, month)
  const targetLabel = row.targetMin === row.targetMax ? `${row.targetMax}` : `${row.targetMin}-${row.targetMax}`

  return (
    <div className="border-b border-border-light-2 last:border-b-0">
      <div className="flex flex-wrap items-center justify-between gap-2 p-[10px_14px]">
        <span className="text-[13px] flex-1 min-w-[160px]">{row.activityType}</span>
        <div className="flex items-center gap-4 font-mono text-[12px] text-ink-secondary">
          <span>Target {targetLabel}</span>
          <span>{row.done} done</span>
          <span className={row.remaining > 0 ? 'text-ink-muted' : 'text-signal-green'}>{row.remaining} left</span>
        </div>
      </div>
      {row.entries.length > 0 && (
        <details className="px-[14px] pb-[10px]">
          <summary className="cursor-pointer text-ink-muted font-mono text-[11px]">History ({row.entries.length})</summary>
          <div className="flex flex-col gap-[6px] mt-2">
            {row.entries.map((e) => (
              <div key={e.id} className="flex items-center justify-between gap-2 font-mono text-[11.5px]">
                <span className="text-ink-secondary">
                  {formatEntryDate(e.entryDate)} — +{e.count}
                  {e.note ? ` (${e.note})` : ''}
                  {e.createdByName ? ` · ${e.createdByName}` : ''}
                </span>
                <button
                  onClick={() => deleteEntry.mutate(e.id)}
                  disabled={deleteEntry.isPending}
                  className="text-signal-red border-none bg-transparent cursor-pointer p-0"
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  )
}

function ActivityGroupCard({
  group,
  rows,
  projectId,
  month,
}: {
  group: ActivityGroup
  rows: OffpageActivityRow[]
  projectId: string
  month: string
}) {
  const done = rows.reduce((s, r) => s + Math.min(r.done, r.targetMax), 0)
  const target = rows.reduce((s, r) => s + r.targetMax, 0)

  return (
    <Card>
      <CardHeader>
        <CardTitle>{GROUP_LABEL[group]}</CardTitle>
        <span className="font-mono text-[11.5px] text-ink-muted">{done} / {target} this month</span>
      </CardHeader>
      <CardContent className="p-[16px_18px] flex flex-col gap-3">
        <p className="m-0 text-[12px] text-ink-muted">{GROUP_HINT[group]}</p>
        {rows.length === 0 ? (
          <p className="m-0 text-[13px] text-ink-muted">Nothing set up here yet.</p>
        ) : (
          <>
            <LogActivityControl group={group} types={rows} projectId={projectId} month={month} />
            <div className="border border-border-light rounded-[10px] overflow-hidden">
              {rows.map((row) => (
                <ActivityTypeRow key={row.activityType} row={row} projectId={projectId} month={month} />
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}

function RecurringInstanceChip({
  task,
  instanceKey,
  label,
  done,
  projectId,
  month,
}: {
  task: RecurringTask['key']
  instanceKey: string
  label: string
  done: boolean
  projectId: string
  month: string
}) {
  const { data: currentMember } = useCurrentMember()
  const toggle = useToggleRecurringInstance(projectId, month)

  return (
    <button
      onClick={() => toggle.mutate({ taskKey: task, instanceKey, done: !done, doneBy: currentMember?.id ?? null })}
      disabled={toggle.isPending}
      className="flex items-center gap-[6px] text-[12px] px-[10px] py-[5px] rounded-full border-none cursor-pointer"
      style={{
        background: done ? 'var(--color-pill-green-bg)' : 'var(--color-pill-neutral-bg)',
        color: done ? 'var(--color-pill-green-fg)' : 'var(--color-pill-neutral-fg)',
      }}
    >
      <span className="w-[6px] h-[6px] rounded-full" style={{ background: 'currentColor' }} />
      {label}
    </button>
  )
}

function RecurringTaskRow({ task, projectId, month }: { task: RecurringTask; projectId: string; month: string }) {
  const isSingle = task.instances.length === 1 && task.instances[0].key === 'default'

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 p-[12px_14px] border-b border-border-light-2 last:border-b-0">
      <div className="flex flex-col gap-[2px]">
        <span className="text-[13px] font-medium">{task.title}</span>
        <span className="text-[11.5px] text-ink-muted">{task.description}</span>
      </div>
      <div className="flex flex-wrap items-center gap-[6px]">
        {isSingle ? (
          <RecurringInstanceChip
            task={task.key}
            instanceKey="default"
            label={task.instances[0].done ? 'Done' : 'Mark done'}
            done={task.instances[0].done}
            projectId={projectId}
            month={month}
          />
        ) : (
          task.instances.map((inst) => (
            <RecurringInstanceChip
              key={inst.key}
              task={task.key}
              instanceKey={inst.key}
              label={inst.label}
              done={inst.done}
              projectId={projectId}
              month={month}
            />
          ))
        )}
      </div>
    </div>
  )
}

function OffpageNotesCard({ projectId, month }: { projectId: string; month: string }) {
  const { data: savedNote, isLoading } = useOffpageNote(projectId, month)
  const setNote = useSetOffpageNote(projectId, month)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Notes</CardTitle>
      </CardHeader>
      <CardContent className="p-[16px_18px]">
        {isLoading ? (
          <Skeleton className="h-[60px] w-full" />
        ) : (
          <textarea
            key={savedNote}
            defaultValue={savedNote}
            onBlur={(e) => {
              if (e.target.value !== (savedNote ?? '')) setNote.mutate(e.target.value)
            }}
            rows={2}
            placeholder="Blockers, findings, anything worth flagging for this month…"
            className="w-full text-[13px] border border-border rounded-[8px] px-3 py-2 bg-surface resize-none"
          />
        )}
      </CardContent>
    </Card>
  )
}

export function ActivityGroupsSection({ projectId }: { projectId: string }) {
  const month = currentMonthKey()
  const { data, isLoading } = useOffpageActivity(projectId, month)
  const { data: recurringTasks, isLoading: recurringLoading } = useRecurringOffpageTasks(projectId, month)

  const byGroup = React.useMemo(() => {
    const groups: Record<ActivityGroup, OffpageActivityRow[]> = { backlinks: [], on_page: [], technical: [] }
    for (const row of data?.activities ?? []) groups[row.activityGroup].push(row)
    return groups
  }, [data])

  if (isLoading) return <Skeleton className="h-[200px] w-full" />

  return (
    <div className="flex flex-col gap-3">
      {(['backlinks', 'on_page', 'technical'] as const).map((group) => (
        <ActivityGroupCard key={group} group={group} rows={byGroup[group]} projectId={projectId} month={month} />
      ))}

      <Card>
        <CardHeader>
          <CardTitle>Recurring off-page tasks</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {recurringLoading && <Skeleton className="h-[120px] w-full" />}
          {!recurringLoading &&
            (recurringTasks ?? []).map((task) => (
              <RecurringTaskRow key={task.key} task={task} projectId={projectId} month={month} />
            ))}
        </CardContent>
      </Card>

      <OffpageNotesCard projectId={projectId} month={month} />
    </div>
  )
}

const FEED_KIND_LABEL: Record<ActivityFeedItem['kind'], string> = {
  backlinks: 'Backlink',
  on_page: 'On-Page',
  technical: 'Technical',
  hours: 'Hours',
}

const FEED_KIND_COLOR: Record<ActivityFeedItem['kind'], string> = {
  backlinks: 'var(--color-signal-green)',
  on_page: 'var(--color-ink-muted)',
  technical: 'var(--color-ink-muted)',
  hours: 'var(--color-signal-amber)',
}

export function ActivityFeedCard({ projectId }: { projectId: string }) {
  const { data, isLoading } = useActivityFeed(projectId)

  return (
    <Card>
      <CardHeader>
        <CardTitle>SEO activity log</CardTitle>
      </CardHeader>
      <CardContent className="p-[16px_18px] flex flex-col gap-[10px]">
        {isLoading && <Skeleton className="h-[200px] w-full" />}
        {!isLoading && (data ?? []).length === 0 && (
          <p className="m-0 text-[13px] text-ink-muted">Nothing logged yet.</p>
        )}
        {!isLoading &&
          (data ?? []).map((item) => (
            <div key={item.id} className="flex items-baseline gap-[10px]">
              <span
                className="font-mono text-[9.5px] uppercase tracking-[0.06em] px-[7px] py-[2px] rounded-full flex-none"
                style={{ color: FEED_KIND_COLOR[item.kind], border: `1px solid ${FEED_KIND_COLOR[item.kind]}` }}
              >
                {FEED_KIND_LABEL[item.kind]}
              </span>
              <div className="flex flex-col gap-[1px] min-w-0 flex-1">
                <span className="text-[13px] truncate">{item.label}</span>
                {item.detail && <span className="text-[11.5px] text-ink-muted truncate">{item.detail}</span>}
              </div>
              <span className="font-mono text-[11px] text-ink-muted flex-none whitespace-nowrap">
                {item.date}{item.byName ? ` · ${item.byName}` : ''}
              </span>
            </div>
          ))}
      </CardContent>
    </Card>
  )
}
