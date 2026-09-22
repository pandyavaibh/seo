import { AlertTriangle, ArrowLeft } from 'lucide-react'
import * as React from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ProgressBar } from '@/components/ui/progress-bar'
import { Skeleton } from '@/components/ui/skeleton'
import { useTeamMembers } from '@/features/accounts/use-account'
import { useAccountPerformance } from '@/features/accounts/use-account-performance'
import { ProjectSubNav } from '@/features/checklist/project-sub-nav'
import { useCurrentMember } from '@/features/team/use-current-member'
import {
  useAddBacklink,
  useBacklinks,
  useDeleteBacklink,
  useUpdateBacklink,
  type BacklinkRow,
} from '@/features/projects/use-backlinks'
import {
  useAddKeywords,
  useKeywords,
  useLogRank,
  useSetKeywordTarget,
  useSetSearchVolume,
  type KeywordRow,
} from '@/features/projects/use-keywords'
import {
  useAddAssignment,
  useAddTask,
  useDeleteProject,
  useProjectWorkspace,
  useQuickLogHour,
  useRemoveAssignment,
  useToggleTask,
  type WorkspaceTask,
} from '@/features/projects/use-project-workspace'
import {
  useCreateGoal,
  useDeleteGoal,
  useProjectGoals,
  useUpdateGoalProgress,
  useUpdateTrafficGoals,
  type CustomGoal,
} from '@/features/projects/use-project-goals'
import { useApplyTemplate, useTemplates } from '@/features/templates/use-templates'
import { initials, tintFor } from '@/lib/avatar'
import { BACKLINK_STATUS_LABEL, BACKLINK_STATUS_TONE, BACKLINK_STATUSES } from '@/lib/backlink-status'
import { loadColorFor } from '@/lib/load-color'
import { STAGE_LABEL, STAGE_TONE } from '@/lib/project-stage'

function TaskRow({
  task,
  projectId,
}: {
  task: WorkspaceTask
  projectId: string
}) {
  const toggle = useToggleTask(projectId)
  const quickLog = useQuickLogHour(projectId)
  const { data: currentMember } = useCurrentMember()
  const done = task.status === 'done'
  const over = task.estimateHours != null && task.loggedHours > task.estimateHours
  const met = task.estimateHours != null && task.loggedHours >= task.estimateHours

  return (
    <TableRowLike>
      <td className="p-[11px_18px]">
        <div className="flex items-center gap-[9px]">
          <button
            onClick={() => toggle.mutate({ taskId: task.id, done: !done })}
            aria-label={done ? 'Mark as not done' : 'Mark as done'}
            className="w-[13px] h-[13px] flex-none rounded-[4px] border-[1.5px] cursor-pointer p-0"
            style={{
              borderColor: done ? 'var(--color-signal-green)' : '#C3C0B5',
              background: done ? 'var(--color-signal-green)' : 'transparent',
            }}
          />
          <span className={done ? 'text-ink-faint' : 'text-ink'}>
            {task.label}
          </span>
        </div>
      </td>
      <td className="p-[11px_12px]">
        {task.ownerName ? (
          <span
            title={task.ownerName}
            className="w-6 h-6 rounded-full grid place-items-center font-mono text-[10px] font-semibold"
            style={{ background: tintFor(0) }}
          >
            {initials(task.ownerName)}
          </span>
        ) : (
          <span className="text-ink-muted text-[12px]">—</span>
        )}
      </td>
      <td
        className="p-[11px_12px] font-mono text-[12px]"
        style={{
          color: over
            ? 'var(--color-signal-red)'
            : met
              ? 'var(--color-signal-green)'
              : 'var(--color-ink-secondary)',
        }}
      >
        {task.loggedHours} / {task.estimateHours ?? '—'}h
      </td>
      <td className="p-[11px_18px]">
        <Button
          size="sm"
          variant="secondary"
          disabled={!currentMember || quickLog.isPending}
          onClick={() =>
            currentMember &&
            quickLog.mutate({
              taskId: task.id,
              taskLabel: task.label,
              memberId: currentMember.id,
            })
          }
        >
          +1h
        </Button>
      </td>
    </TableRowLike>
  )
}

function ordinal(n: number) {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return `${n}${s[(v - 20) % 10] ?? s[v] ?? s[0]}`
}

function TableRowLike({ children }: { children: React.ReactNode }) {
  return <tr className="border-b border-border-light-2">{children}</tr>
}

function AddTaskForm({ projectId }: { projectId: string }) {
  const [open, setOpen] = React.useState(false)
  const [label, setLabel] = React.useState('')
  const [estimateHours, setEstimateHours] = React.useState('')
  const mutation = useAddTask(projectId)

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)} size="sm" variant="secondary">
        Add task
      </Button>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <input
        type="text"
        autoFocus
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        placeholder="Task name"
        className="text-[13px] border border-border rounded-[6px] px-2 py-1 w-[220px]"
      />
      <input
        type="number"
        min="0.5"
        step="0.5"
        value={estimateHours}
        onChange={(e) => setEstimateHours(e.target.value)}
        placeholder="Est. h"
        className="w-[70px] text-[12px] font-mono border border-border rounded-[6px] px-2 py-1"
      />
      <Button
        size="sm"
        disabled={!label.trim() || mutation.isPending}
        onClick={() =>
          mutation.mutate(
            {
              label,
              ownerId: null,
              estimateHours: estimateHours ? Number(estimateHours) : null,
              dueOn: null,
            },
            {
              onSuccess: () => {
                setLabel('')
                setEstimateHours('')
                setOpen(false)
              },
            },
          )
        }
      >
        {mutation.isPending ? 'Adding…' : 'Add'}
      </Button>
      <button
        onClick={() => setOpen(false)}
        className="border-none bg-transparent text-[12px] text-ink-muted hover:text-ink cursor-pointer"
      >
        Cancel
      </button>
    </div>
  )
}

function TeamRow({
  member,
  tint,
  projectId,
}: {
  member: { assignmentId: string; id: string; name: string; role: string; weeklyHours: number }
  tint: string
  projectId: string
}) {
  const removeAssignment = useRemoveAssignment(projectId)

  return (
    <div className="flex items-center gap-[10px]">
      <span
        className="w-7 h-7 flex-none rounded-full grid place-items-center font-mono text-[10px] font-semibold"
        style={{ background: tint }}
      >
        {initials(member.name)}
      </span>
      <div className="flex flex-col gap-[1px] flex-1 min-w-0">
        <span className="text-[13px] font-medium">{member.name}</span>
        <span className="text-[11px] text-ink-muted capitalize">
          {member.role} · {member.weeklyHours}h/wk
        </span>
      </div>
      <button
        onClick={() => removeAssignment.mutate(member.assignmentId)}
        disabled={removeAssignment.isPending}
        className="border-none bg-transparent font-mono text-[10.5px] text-ink-muted hover:text-signal-red cursor-pointer p-0"
      >
        Remove
      </button>
    </div>
  )
}

function ApplyTemplateControl({ projectId }: { projectId: string }) {
  const [open, setOpen] = React.useState(false)
  const [templateId, setTemplateId] = React.useState('')
  const { data: templates } = useTemplates()
  const applyTemplate = useApplyTemplate(projectId)

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)} size="sm" variant="secondary">
        Apply template
      </Button>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <select
        value={templateId}
        onChange={(e) => setTemplateId(e.target.value)}
        className="text-[13px] border border-border rounded-[6px] px-2 py-1"
      >
        <option value="">Choose a template…</option>
        {(templates ?? []).map((t) => (
          <option key={t.id} value={t.id}>{t.name} ({t.tasks.length} tasks)</option>
        ))}
      </select>
      <Button
        size="sm"
        disabled={!templateId || applyTemplate.isPending}
        onClick={() =>
          applyTemplate.mutate(templateId, { onSuccess: () => { setOpen(false); setTemplateId('') } })
        }
      >
        {applyTemplate.isPending ? 'Applying…' : 'Apply'}
      </Button>
      <button
        onClick={() => setOpen(false)}
        className="border-none bg-transparent text-[12px] text-ink-muted hover:text-ink cursor-pointer"
      >
        Cancel
      </button>
      {applyTemplate.isError && (
        <span className="text-[12px] text-signal-red">
          {applyTemplate.error instanceof Error ? applyTemplate.error.message : 'Failed to apply'}
        </span>
      )}
    </div>
  )
}

function AssignTeamForm({
  projectId,
  alreadyAssignedIds,
}: {
  projectId: string
  alreadyAssignedIds: string[]
}) {
  const [open, setOpen] = React.useState(false)
  const [memberId, setMemberId] = React.useState('')
  const [weeklyHours, setWeeklyHours] = React.useState('')
  const { data: teamMembers } = useTeamMembers()
  const addAssignment = useAddAssignment(projectId)

  const available = (teamMembers ?? []).filter((m) => !alreadyAssignedIds.includes(m.id))

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)} size="sm" variant="secondary">
        Staff someone
      </Button>
    )
  }

  return (
    <div className="flex flex-col gap-2 p-[10px] border border-border-light rounded-[10px] bg-surface-sunken-2">
      <select
        value={memberId}
        onChange={(e) => setMemberId(e.target.value)}
        className="text-[13px] rounded-[8px] border border-border px-2 py-[6px] bg-surface w-full"
      >
        <option value="">Choose a team member…</option>
        {available.map((m) => (
          <option key={m.id} value={m.id}>
            {m.name}
          </option>
        ))}
      </select>
      <input
        value={weeklyHours}
        onChange={(e) => setWeeklyHours(e.target.value)}
        placeholder="Weekly hours (drives their Capacity booking)"
        inputMode="decimal"
        className="text-[13px] rounded-[8px] border border-border px-2 py-[6px] bg-surface w-full"
      />
      {addAssignment.isError && (
        <p className="m-0 text-[12px] text-signal-red">
          {addAssignment.error instanceof Error ? addAssignment.error.message : 'Failed to staff'}
        </p>
      )}
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          disabled={!memberId || !weeklyHours.trim() || addAssignment.isPending}
          onClick={() =>
            addAssignment.mutate(
              { memberId, weeklyHours: Number(weeklyHours) },
              {
                onSuccess: () => {
                  setMemberId('')
                  setWeeklyHours('')
                  setOpen(false)
                },
              },
            )
          }
        >
          {addAssignment.isPending ? 'Staffing…' : 'Add to project'}
        </Button>
        <Button variant="secondary" size="sm" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </div>
  )
}

function DeleteProjectConfirm({
  projectId,
  projectName,
  accountId,
  onCancel,
}: {
  projectId: string
  projectName: string
  accountId: string | null
  onCancel: () => void
}) {
  const navigate = useNavigate()
  const deleteProject = useDeleteProject(projectId, accountId)

  return (
    <div className="w-full bg-pill-red-bg border border-signal-red rounded-[10px] p-[14px_16px] flex flex-wrap items-center gap-3">
      <p className="m-0 text-[13px] text-pill-red-fg flex-1 min-w-[240px]">
        Permanently delete <strong>{projectName}</strong>? This removes all its
        tasks, logged hours, checklist history and keyword tracking — there's
        no undo.
      </p>
      <div className="flex items-center gap-2">
        <Button
          disabled={deleteProject.isPending}
          onClick={() =>
            deleteProject.mutate(undefined, {
              onSuccess: () =>
                navigate(accountId ? `/clients/${accountId}` : '/projects'),
            })
          }
          className="!bg-signal-red !border-signal-red hover:!bg-[#8E3C10]"
        >
          {deleteProject.isPending ? 'Deleting…' : 'Yes, delete permanently'}
        </Button>
        <Button
          variant="secondary"
          onClick={onCancel}
          disabled={deleteProject.isPending}
        >
          Cancel
        </Button>
      </div>
      {deleteProject.isError && (
        <p className="m-0 w-full text-[12px] text-signal-red">
          {deleteProject.error instanceof Error
            ? deleteProject.error.message
            : 'Failed to delete'}
        </p>
      )}
    </div>
  )
}

function rankColor(rank: number | null) {
  if (rank == null) return 'var(--color-ink-faint)'
  if (rank <= 3) return 'var(--color-signal-green)'
  if (rank <= 10) return 'var(--color-signal-amber)'
  return 'var(--color-ink-secondary)'
}

function RankKeywordRow({ keyword, projectId }: { keyword: KeywordRow; projectId: string }) {
  const { data: currentMember } = useCurrentMember()
  const logRank = useLogRank(projectId)
  const setTarget = useSetKeywordTarget(projectId)
  const setVolume = useSetSearchVolume(projectId)
  const [rankInput, setRankInput] = React.useState('')
  const [targetInput, setTargetInput] = React.useState(
    keyword.targetRank != null ? String(keyword.targetRank) : '',
  )
  const [volumeInput, setVolumeInput] = React.useState(
    keyword.searchVolume != null ? String(keyword.searchVolume) : '',
  )

  const hitTarget = keyword.targetRank != null && keyword.latestRank != null && keyword.latestRank <= keyword.targetRank

  const delta =
    keyword.previousRank != null && keyword.latestRank != null
      ? keyword.previousRank - keyword.latestRank
      : null

  return (
    <TableRowLike>
      <td className="p-[11px_18px]">
        <div className="flex flex-col gap-[1px]">
          <span>{keyword.phrase}</span>
          {keyword.targetUrl && (
            <span className="font-mono text-[10.5px] text-ink-muted truncate max-w-[220px]">
              {keyword.targetUrl}
            </span>
          )}
        </div>
      </td>
      <td className="p-[11px_12px]">
        <div className="flex items-center gap-[6px]">
          <span
            className="font-mono text-[13px] font-semibold"
            style={{ color: rankColor(keyword.latestRank) }}
          >
            {keyword.latestRank ?? '—'}
          </span>
          {delta != null && delta !== 0 && (
            <span
              className="font-mono text-[10.5px]"
              style={{ color: delta > 0 ? 'var(--color-signal-green)' : 'var(--color-signal-red)' }}
            >
              {delta > 0 ? `▲${delta}` : `▼${Math.abs(delta)}`}
            </span>
          )}
        </div>
      </td>
      <td className="p-[11px_12px] font-mono text-[11px] text-ink-muted">
        {keyword.latestCheckedOn ?? '—'}
      </td>
      <td className="p-[11px_12px]">
        <input
          value={volumeInput}
          onChange={(e) => setVolumeInput(e.target.value)}
          onBlur={() => {
            const next = volumeInput.trim() ? Number(volumeInput) : null
            if (next !== keyword.searchVolume) {
              setVolume.mutate({ keywordId: keyword.id, searchVolume: next })
            }
          }}
          placeholder="—"
          inputMode="numeric"
          className="w-[64px] text-[12px] font-mono border border-border rounded-[6px] px-1 py-1"
        />
      </td>
      <td className="p-[11px_12px]">
        <div className="flex items-center gap-[4px]">
          <input
            value={targetInput}
            onChange={(e) => setTargetInput(e.target.value)}
            onBlur={() => {
              const next = targetInput.trim() ? Number(targetInput) : null
              if (next !== keyword.targetRank) {
                setTarget.mutate({ keywordId: keyword.id, targetRank: next })
              }
            }}
            placeholder="—"
            inputMode="numeric"
            className="w-[44px] text-[12px] font-mono border border-border rounded-[6px] px-1 py-1"
          />
          {hitTarget && <span className="text-[11px] text-signal-green">✓</span>}
        </div>
      </td>
      <td className="p-[11px_18px]">
        <div className="flex items-center gap-[6px]">
          <input
            value={rankInput}
            onChange={(e) => setRankInput(e.target.value)}
            placeholder="Rank"
            inputMode="numeric"
            className="w-[56px] text-[12px] font-mono border border-border rounded-[6px] px-2 py-1"
          />
          <Button
            size="sm"
            variant="secondary"
            disabled={!rankInput.trim() || logRank.isPending}
            onClick={() =>
              logRank.mutate(
                {
                  keywordId: keyword.id,
                  rank: Number(rankInput),
                  checkedBy: currentMember?.id ?? null,
                },
                { onSuccess: () => setRankInput('') },
              )
            }
          >
            Log
          </Button>
        </div>
      </td>
    </TableRowLike>
  )
}

function AddKeywordsBox({ projectId }: { projectId: string }) {
  const [open, setOpen] = React.useState(false)
  const [text, setText] = React.useState('')
  const addKeywords = useAddKeywords(projectId)

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)} size="sm" variant="secondary">
        Add keywords
      </Button>
    )
  }

  return (
    <div className="flex flex-col gap-2 w-full">
      <textarea
        autoFocus
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={'One keyword per line, e.g.\nlocal seo services\nseo audit checklist'}
        rows={4}
        className="text-[13px] rounded-[8px] border border-border px-3 py-2 bg-surface w-full resize-none font-mono"
      />
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          disabled={!text.trim() || addKeywords.isPending}
          onClick={() => {
            const phrases = Array.from(
              new Set(
                text
                  .split('\n')
                  .map((p) => p.trim())
                  .filter(Boolean),
              ),
            )
            addKeywords.mutate(phrases, {
              onSuccess: () => {
                setText('')
                setOpen(false)
              },
            })
          }}
        >
          {addKeywords.isPending ? 'Adding…' : 'Add keywords'}
        </Button>
        <Button variant="secondary" size="sm" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
      {addKeywords.isError && (
        <p className="m-0 text-[12px] text-signal-red">
          {addKeywords.error instanceof Error ? addKeywords.error.message : 'Failed to add keywords'}
        </p>
      )}
    </div>
  )
}

function RankingsSection({ projectId }: { projectId: string }) {
  const { data, isLoading } = useKeywords(projectId)

  return (
    <div className="bg-surface border border-border rounded-[12px] overflow-hidden">
      <div className="flex items-baseline justify-between gap-3 p-[14px_18px] border-b border-border-light">
        <CardTitle>Rankings</CardTitle>
        <span className="font-mono text-[11px] text-ink-muted">Manually tracked, no rank-check API connected</span>
      </div>
      <div className="p-[16px_18px] flex flex-col gap-3">
        {isLoading && <Skeleton className="h-[80px] w-full" />}
        {!isLoading && data && (
          <>
            <section
              className="grid gap-[10px]"
              style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))' }}
            >
              <StatTileSmall label="Tracked" value={String(data.stats.tracked)} />
              <StatTileSmall
                label="Avg position"
                value={data.stats.averagePosition != null ? data.stats.averagePosition.toFixed(1) : '—'}
              />
              <StatTileSmall label="Top 3" value={String(data.stats.top3)} />
              <StatTileSmall label="Top 10" value={String(data.stats.top10)} />
              <StatTileSmall label="Top 30" value={String(data.stats.top30)} />
            </section>

            {data.rows.length === 0 ? (
              <p className="m-0 text-[13px] text-ink-muted">No keywords tracked yet — add some below.</p>
            ) : (
              <div className="overflow-x-auto border border-border-light rounded-[10px]">
                <table className="w-full min-w-[480px] border-collapse text-[13px]">
                  <thead>
                    <tr className="text-left bg-surface-sunken">
                      <th className="p-[9px_18px] font-mono text-[10px] uppercase tracking-[0.1em] text-ink-muted border-b border-border-light">
                        Keyword
                      </th>
                      <th className="p-[9px_12px] font-mono text-[10px] uppercase tracking-[0.1em] text-ink-muted border-b border-border-light">
                        Rank
                      </th>
                      <th className="p-[9px_12px] font-mono text-[10px] uppercase tracking-[0.1em] text-ink-muted border-b border-border-light">
                        Checked
                      </th>
                      <th className="p-[9px_12px] font-mono text-[10px] uppercase tracking-[0.1em] text-ink-muted border-b border-border-light">
                        Search vol.
                      </th>
                      <th className="p-[9px_12px] font-mono text-[10px] uppercase tracking-[0.1em] text-ink-muted border-b border-border-light">
                        Target
                      </th>
                      <th className="p-[9px_18px] font-mono text-[10px] uppercase tracking-[0.1em] text-ink-muted border-b border-border-light">
                        Log a check
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.rows.map((k) => (
                      <RankKeywordRow key={k.id} keyword={k} projectId={projectId} />
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <AddKeywordsBox projectId={projectId} />
          </>
        )}
      </div>
    </div>
  )
}

function BacklinkRowView({ link, projectId }: { link: BacklinkRow; projectId: string }) {
  const update = useUpdateBacklink(projectId)
  const remove = useDeleteBacklink(projectId)
  const [sourceUrl, setSourceUrl] = React.useState(link.sourceUrl ?? '')
  const [cost, setCost] = React.useState(link.costCents != null ? String(link.costCents / 100) : '')

  return (
    <TableRowLike>
      <td className="p-[11px_18px]">
        <div className="flex flex-col gap-[1px]">
          <span>{link.domain}</span>
          {link.targetUrl && (
            <span className="font-mono text-[10.5px] text-ink-muted truncate max-w-[220px]">
              → {link.targetUrl}
            </span>
          )}
        </div>
      </td>
      <td className="p-[11px_12px]">
        <div className="flex items-center gap-[6px]">
          <Badge tone={BACKLINK_STATUS_TONE[link.status]}>{BACKLINK_STATUS_LABEL[link.status]}</Badge>
          <select
            value={link.status}
            onChange={(e) => {
              const status = e.target.value as BacklinkRow['status']
              const placedOn = status === 'placed' && !link.placedOn ? new Date().toISOString().slice(0, 10) : undefined
              update.mutate({ id: link.id, status, ...(placedOn ? { placedOn } : {}) })
            }}
            disabled={update.isPending}
            className="font-mono text-[10.5px] border border-border rounded-[6px] px-1 py-[3px] bg-surface"
          >
            {BACKLINK_STATUSES.map((s) => (
              <option key={s} value={s}>{BACKLINK_STATUS_LABEL[s]}</option>
            ))}
          </select>
        </div>
      </td>
      <td className="p-[11px_12px] text-[12.5px] text-ink-secondary max-w-[140px] truncate">
        {link.anchorText ?? '—'}
      </td>
      <td className="p-[11px_12px]">
        <input
          value={sourceUrl}
          onChange={(e) => setSourceUrl(e.target.value)}
          onBlur={() => {
            if (sourceUrl.trim() !== (link.sourceUrl ?? '')) {
              update.mutate({ id: link.id, sourceUrl: sourceUrl.trim() || null })
            }
          }}
          placeholder="Live URL once placed"
          className="w-[150px] text-[11.5px] font-mono border border-border rounded-[6px] px-2 py-1"
        />
      </td>
      <td className="p-[11px_12px]">
        <input
          value={cost}
          onChange={(e) => setCost(e.target.value)}
          onBlur={() => {
            const next = cost.trim() ? Math.round(Number(cost) * 100) : null
            if (next !== link.costCents) {
              update.mutate({ id: link.id, costCents: next })
            }
          }}
          placeholder="$"
          inputMode="decimal"
          className="w-[60px] text-[12px] font-mono border border-border rounded-[6px] px-1 py-1"
        />
      </td>
      <td className="p-[11px_12px] text-[12px] text-ink-muted">{link.ownerName ?? '—'}</td>
      <td className="p-[11px_18px]">
        <button
          onClick={() => remove.mutate(link.id)}
          disabled={remove.isPending}
          className="border-none bg-transparent font-mono text-[10.5px] text-ink-muted hover:text-signal-red cursor-pointer p-0"
        >
          Remove
        </button>
      </td>
    </TableRowLike>
  )
}

function AddBacklinkForm({ projectId }: { projectId: string }) {
  const [open, setOpen] = React.useState(false)
  const [domain, setDomain] = React.useState('')
  const [targetUrl, setTargetUrl] = React.useState('')
  const [anchorText, setAnchorText] = React.useState('')
  const [ownerId, setOwnerId] = React.useState('')
  const { data: teamMembers } = useTeamMembers()
  const addBacklink = useAddBacklink(projectId)

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)} size="sm" variant="secondary">
        Add prospect
      </Button>
    )
  }

  const fieldClass = 'text-[13px] rounded-[8px] border border-border px-3 py-2 bg-surface w-full'

  return (
    <div className="flex flex-col gap-2 w-full">
      <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))' }}>
        <input
          autoFocus
          value={domain}
          onChange={(e) => setDomain(e.target.value)}
          placeholder="Prospect domain *"
          className={fieldClass}
        />
        <input
          value={targetUrl}
          onChange={(e) => setTargetUrl(e.target.value)}
          placeholder="Our page to link to"
          className={fieldClass}
        />
        <input
          value={anchorText}
          onChange={(e) => setAnchorText(e.target.value)}
          placeholder="Anchor text"
          className={fieldClass}
        />
        <select value={ownerId} onChange={(e) => setOwnerId(e.target.value)} className={fieldClass}>
          <option value="">Owner —</option>
          {(teamMembers ?? []).map((m) => (
            <option key={m.id} value={m.id}>{m.name}</option>
          ))}
        </select>
      </div>
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          disabled={!domain.trim() || addBacklink.isPending}
          onClick={() =>
            addBacklink.mutate(
              { domain, targetUrl, anchorText, ownerId: ownerId || null },
              {
                onSuccess: () => {
                  setDomain('')
                  setTargetUrl('')
                  setAnchorText('')
                  setOwnerId('')
                  setOpen(false)
                },
              },
            )
          }
        >
          {addBacklink.isPending ? 'Adding…' : 'Add prospect'}
        </Button>
        <Button variant="secondary" size="sm" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
      {addBacklink.isError && (
        <p className="m-0 text-[12px] text-signal-red">
          {addBacklink.error instanceof Error ? addBacklink.error.message : 'Failed to add prospect'}
        </p>
      )}
    </div>
  )
}

function BacklinksSection({ projectId }: { projectId: string }) {
  const { data, isLoading } = useBacklinks(projectId)

  return (
    <div className="bg-surface border border-border rounded-[12px] overflow-hidden">
      <div className="flex items-baseline justify-between gap-3 p-[14px_18px] border-b border-border-light">
        <CardTitle>Backlinks</CardTitle>
        <span className="font-mono text-[11px] text-ink-muted">
          Manually tracked, no authority-score API connected
        </span>
      </div>
      <div className="p-[16px_18px] flex flex-col gap-3">
        {isLoading && <Skeleton className="h-[80px] w-full" />}
        {!isLoading && data && (
          <>
            <section
              className="grid gap-[10px]"
              style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))' }}
            >
              <StatTileSmall label="Prospects" value={String(data.stats.total)} />
              <StatTileSmall label="In outreach" value={String(data.stats.outreach)} />
              <StatTileSmall label="Placed" value={String(data.stats.placed)} />
            </section>

            {data.rows.length === 0 ? (
              <p className="m-0 text-[13px] text-ink-muted">No prospects logged yet — add one below.</p>
            ) : (
              <div className="overflow-x-auto border border-border-light rounded-[10px]">
                <table className="w-full min-w-[680px] border-collapse text-[13px]">
                  <thead>
                    <tr className="text-left bg-surface-sunken">
                      <th className="p-[9px_18px] font-mono text-[10px] uppercase tracking-[0.1em] text-ink-muted border-b border-border-light">
                        Domain
                      </th>
                      <th className="p-[9px_12px] font-mono text-[10px] uppercase tracking-[0.1em] text-ink-muted border-b border-border-light">
                        Status
                      </th>
                      <th className="p-[9px_12px] font-mono text-[10px] uppercase tracking-[0.1em] text-ink-muted border-b border-border-light">
                        Anchor
                      </th>
                      <th className="p-[9px_12px] font-mono text-[10px] uppercase tracking-[0.1em] text-ink-muted border-b border-border-light">
                        Live URL
                      </th>
                      <th className="p-[9px_12px] font-mono text-[10px] uppercase tracking-[0.1em] text-ink-muted border-b border-border-light">
                        Cost
                      </th>
                      <th className="p-[9px_12px] font-mono text-[10px] uppercase tracking-[0.1em] text-ink-muted border-b border-border-light">
                        Owner
                      </th>
                      <th className="p-[9px_18px] font-mono text-[10px] uppercase tracking-[0.1em] text-ink-muted border-b border-border-light" />
                    </tr>
                  </thead>
                  <tbody>
                    {data.rows.map((link) => (
                      <BacklinkRowView key={link.id} link={link} projectId={projectId} />
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <AddBacklinkForm projectId={projectId} />
          </>
        )}
      </div>
    </div>
  )
}

function StatTileSmall({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-surface-sunken border border-border-light rounded-[10px] p-[10px_12px] flex flex-col gap-[3px]">
      <span className="font-mono text-[9.5px] tracking-[0.1em] uppercase text-ink-muted">{label}</span>
      <span className="text-[18px] font-semibold tracking-[-0.02em] leading-none">{value}</span>
    </div>
  )
}

function TrafficGoalCard({
  projectId,
  accountId,
  trafficGoalClicks,
  conversionsGoal,
}: {
  projectId: string
  accountId: string | null
  trafficGoalClicks: number | null
  conversionsGoal: number | null
}) {
  const { data: perf } = useAccountPerformance(accountId ?? undefined)
  const updateGoals = useUpdateTrafficGoals(projectId)
  const [editing, setEditing] = React.useState(false)
  const [trafficInput, setTrafficInput] = React.useState(
    trafficGoalClicks != null ? String(trafficGoalClicks) : '',
  )
  const [conversionsInput, setConversionsInput] = React.useState(
    conversionsGoal != null ? String(conversionsGoal) : '',
  )

  if (!accountId) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle>Traffic &amp; conversions vs goal</CardTitle>
        {!editing && (
          <Button variant="secondary" size="sm" onClick={() => setEditing(true)}>
            Set goals
          </Button>
        )}
      </CardHeader>
      <CardContent className="p-[16px_18px] flex flex-col gap-[10px]">
        <p className="m-0 text-[11.5px] text-ink-muted">
          Account-wide (Stage 4 tracks one Search Console/GA4 property per client, not per
          engagement) — not attributable to just this project if the account runs others.
        </p>
        {editing ? (
          <div className="flex flex-wrap items-end gap-2">
            <label className="flex flex-col gap-1">
              <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-ink-muted">
                Clicks goal (28d)
              </span>
              <input
                value={trafficInput}
                onChange={(e) => setTrafficInput(e.target.value)}
                inputMode="numeric"
                className="w-[100px] text-[13px] border border-border rounded-[6px] px-2 py-1"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-ink-muted">
                Conversions goal (28d)
              </span>
              <input
                value={conversionsInput}
                onChange={(e) => setConversionsInput(e.target.value)}
                inputMode="numeric"
                className="w-[100px] text-[13px] border border-border rounded-[6px] px-2 py-1"
              />
            </label>
            <Button
              size="sm"
              disabled={updateGoals.isPending}
              onClick={() =>
                updateGoals.mutate(
                  {
                    trafficGoalClicks: trafficInput.trim() ? Number(trafficInput) : null,
                    conversionsGoal: conversionsInput.trim() ? Number(conversionsInput) : null,
                  },
                  { onSuccess: () => setEditing(false) },
                )
              }
            >
              Save
            </Button>
            <Button variant="secondary" size="sm" onClick={() => setEditing(false)}>
              Cancel
            </Button>
          </div>
        ) : (
          <div className="flex flex-wrap gap-[20px]">
            <div className="flex flex-col gap-[4px]">
              <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-ink-muted">
                Organic clicks (28d)
              </span>
              <span className="text-[18px] font-semibold">
                {perf?.gscConnected ? (perf.organicClicks28d ?? 0).toLocaleString() : '—'}
                {trafficGoalClicks != null && (
                  <span className="text-[13px] text-ink-muted"> / {trafficGoalClicks.toLocaleString()}</span>
                )}
              </span>
            </div>
            <div className="flex flex-col gap-[4px]">
              <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-ink-muted">
                Conversions (28d)
              </span>
              <span className="text-[18px] font-semibold">
                {perf?.ga4Connected ? (perf.conversions28d ?? 0).toLocaleString() : '—'}
                {conversionsGoal != null && (
                  <span className="text-[13px] text-ink-muted"> / {conversionsGoal.toLocaleString()}</span>
                )}
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function CustomGoalRow({ goal, projectId }: { goal: CustomGoal; projectId: string }) {
  const updateProgress = useUpdateGoalProgress(projectId)
  const deleteGoal = useDeleteGoal(projectId)
  const [value, setValue] = React.useState(goal.currentValue != null ? String(goal.currentValue) : '')

  const pct =
    goal.targetValue != null && goal.targetValue !== 0 && goal.currentValue != null
      ? Math.min(100, Math.round((goal.currentValue / goal.targetValue) * 100))
      : null

  return (
    <div className="flex flex-col gap-[6px]">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[13px] font-medium">{goal.label}</span>
        <button
          onClick={() => deleteGoal.mutate(goal.id)}
          disabled={deleteGoal.isPending}
          className="border-none bg-transparent font-mono text-[10.5px] text-ink-muted hover:text-signal-red cursor-pointer p-0"
        >
          Remove
        </button>
      </div>
      {pct != null && <ProgressBar pct={pct} color={loadColorFor(pct / 100 >= 1 ? 1 : pct / 200)} />}
      <div className="flex items-center gap-2">
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={() => {
            const next = value.trim() ? Number(value) : null
            if (next !== goal.currentValue) updateProgress.mutate({ id: goal.id, currentValue: next })
          }}
          inputMode="decimal"
          className="w-[80px] text-[12px] font-mono border border-border rounded-[6px] px-2 py-1"
        />
        <span className="font-mono text-[11px] text-ink-muted">
          {goal.unit ?? ''} of {goal.targetValue ?? '—'} {goal.unit ?? ''} target
        </span>
      </div>
    </div>
  )
}

function AddCustomGoalForm({ projectId }: { projectId: string }) {
  const [open, setOpen] = React.useState(false)
  const [label, setLabel] = React.useState('')
  const [targetValue, setTargetValue] = React.useState('')
  const [currentValue, setCurrentValue] = React.useState('')
  const [unit, setUnit] = React.useState('')
  const createGoal = useCreateGoal(projectId)

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)} size="sm" variant="secondary">
        Add custom goal
      </Button>
    )
  }

  return (
    <div className="flex flex-col gap-2 p-[10px] border border-border-light rounded-[10px] bg-surface-sunken-2">
      <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))' }}>
        <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Domain Rating" className="text-[13px] border border-border rounded-[6px] px-2 py-1" />
        <input value={currentValue} onChange={(e) => setCurrentValue(e.target.value)} placeholder="Current (45)" inputMode="decimal" className="text-[13px] border border-border rounded-[6px] px-2 py-1" />
        <input value={targetValue} onChange={(e) => setTargetValue(e.target.value)} placeholder="Target (55)" inputMode="decimal" className="text-[13px] border border-border rounded-[6px] px-2 py-1" />
        <input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="Unit (optional)" className="text-[13px] border border-border rounded-[6px] px-2 py-1" />
      </div>
      {createGoal.isError && (
        <p className="m-0 text-[12px] text-signal-red">
          {createGoal.error instanceof Error ? createGoal.error.message : 'Failed to add goal'}
        </p>
      )}
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          disabled={!label.trim() || createGoal.isPending}
          onClick={() =>
            createGoal.mutate(
              { label, targetValue, currentValue, unit },
              { onSuccess: () => { setLabel(''); setTargetValue(''); setCurrentValue(''); setUnit(''); setOpen(false) } },
            )
          }
        >
          {createGoal.isPending ? 'Adding…' : 'Add'}
        </Button>
        <Button variant="secondary" size="sm" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </div>
  )
}

function CustomGoalsCard({ projectId }: { projectId: string }) {
  const { data: goals, isLoading } = useProjectGoals(projectId)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Custom KPIs</CardTitle>
      </CardHeader>
      <CardContent className="p-[16px_18px] flex flex-col gap-3">
        {isLoading && <Skeleton className="h-[60px] w-full" />}
        {!isLoading && (goals ?? []).length === 0 && (
          <p className="m-0 text-[13px] text-ink-muted">No custom KPIs tracked yet.</p>
        )}
        {(goals ?? []).map((g) => (
          <CustomGoalRow key={g.id} goal={g} projectId={projectId} />
        ))}
        <AddCustomGoalForm projectId={projectId} />
      </CardContent>
    </Card>
  )
}

export function ProjectWorkspacePage() {
  const { projectId } = useParams<{ projectId: string }>()
  const navigate = useNavigate()
  const { data: ws, isLoading, isError, error, refetch, isFetching } =
    useProjectWorkspace(projectId)
  const { data: currentMember } = useCurrentMember()
  const [confirmingDelete, setConfirmingDelete] = React.useState(false)
  const canDelete =
    currentMember?.role === 'admin' || currentMember?.role === 'manager'

  if (isError) {
    return (
      <Alert variant="destructive">
        <AlertTitle className="flex items-center gap-2">
          <AlertTriangle size={14} /> Couldn't load this project
        </AlertTitle>
        <AlertDescription>
          {error instanceof Error ? error.message : 'Unknown error'}
        </AlertDescription>
        <div>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
          >
            {isFetching ? 'Retrying…' : 'Retry'}
          </Button>
        </div>
      </Alert>
    )
  }

  if (isLoading || !ws) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-[60px] w-full" />
        <Skeleton className="h-[200px] w-full" />
      </div>
    )
  }

  const monthlyBudget = ws.weeklyHours != null ? ws.weeklyHours * 4 : null
  const hoursPct = monthlyBudget ? (ws.hoursThisMonth / monthlyBudget) * 100 : 0
  const linksPct = ws.linkTarget ? (ws.linksLiveThisMonth / ws.linkTarget) * 100 : 0
  const checklistPct =
    ws.checklist.total > 0 ? (ws.checklist.done / ws.checklist.total) * 100 : 0

  return (
    <div className="flex flex-col gap-4">
      <button
        onClick={() =>
          ws.accountId ? navigate(`/clients/${ws.accountId}`) : navigate('/projects')
        }
        className="self-start flex items-center gap-1 border-none bg-transparent font-mono text-[11px] tracking-[0.1em] uppercase text-ink-muted hover:text-ink cursor-pointer p-0"
      >
        <ArrowLeft size={12} /> {ws.accountName ?? 'All projects'}
      </button>

      <div className="flex flex-wrap gap-3 items-end justify-between">
        <div className="flex flex-col gap-1">
          <span className="font-mono text-[11px] tracking-[0.14em] uppercase text-ink-muted">
            {[
              ws.projectType,
              ws.billingCycle === 'monthly'
                ? `renews ${ws.renewalDay ? `on the ${ordinal(ws.renewalDay)}` : 'monthly'}`
                : 'one-time project',
              ws.dueOn ? `due ${ws.dueOn}` : null,
            ]
              .filter(Boolean)
              .join(' · ') || '—'}
          </span>
          <h1 className="m-0 text-[25px] font-semibold tracking-[-0.02em]">
            {ws.name}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          {ws.stage && (
            <Badge tone={STAGE_TONE[ws.stage] ?? 'neutral'} className="text-[12px] px-[11px] py-[5px]">
              {STAGE_LABEL[ws.stage] ?? ws.stage}
            </Badge>
          )}
          <AddTaskForm projectId={ws.id} />
          <ApplyTemplateControl projectId={ws.id} />
          {canDelete && !confirmingDelete && (
            <Button variant="secondary" onClick={() => setConfirmingDelete(true)}>
              Delete project
            </Button>
          )}
        </div>
      </div>

      {confirmingDelete && (
        <DeleteProjectConfirm
          projectId={ws.id}
          projectName={ws.name}
          accountId={ws.accountId}
          onCancel={() => setConfirmingDelete(false)}
        />
      )}

      <ProjectSubNav projectId={ws.id} active="keywords" />

      <section className="flex flex-wrap gap-3 items-start">
        <div className="flex-[1_1_460px] min-w-0 bg-surface border border-border rounded-[12px] overflow-hidden">
          <div className="flex items-baseline justify-between gap-3 p-[14px_18px] border-b border-border-light">
            <CardTitle>Tasks</CardTitle>
            <span className="font-mono text-[11px] text-ink-muted">
              {ws.hoursThisMonth}h logged this month
              {monthlyBudget != null ? ` of ${monthlyBudget}h budget` : ''}
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[540px] border-collapse text-[13px]">
              <thead>
                <tr className="text-left bg-surface-sunken">
                  <th className="p-[9px_18px] font-mono text-[10px] uppercase tracking-[0.1em] text-ink-muted border-b border-border-light">
                    Task
                  </th>
                  <th className="p-[9px_12px] font-mono text-[10px] uppercase tracking-[0.1em] text-ink-muted border-b border-border-light">
                    Owner
                  </th>
                  <th className="p-[9px_12px] font-mono text-[10px] uppercase tracking-[0.1em] text-ink-muted border-b border-border-light">
                    Logged / est
                  </th>
                  <th className="p-[9px_18px] w-[92px] font-mono text-[10px] uppercase tracking-[0.1em] text-ink-muted border-b border-border-light">
                    Log
                  </th>
                </tr>
              </thead>
              <tbody>
                {ws.tasks.length === 0 && (
                  <tr>
                    <td colSpan={4} className="p-[18px] text-center text-[13px] text-ink-muted">
                      No tasks yet — add one above.
                    </td>
                  </tr>
                )}
                {ws.tasks.map((t) => (
                  <TaskRow key={t.id} task={t} projectId={ws.id} />
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex-[1_1_280px] max-w-[340px] flex flex-col gap-3">
          <Card>
            <CardHeader>
              <CardTitle>Assigned team</CardTitle>
            </CardHeader>
            <CardContent className="p-[16px_18px] flex flex-col gap-[11px]">
              {ws.team.length === 0 && (
                <p className="m-0 text-[13px] text-ink-muted">
                  Nobody staffed on this project yet.
                </p>
              )}
              {ws.team.map((m, i) => (
                <TeamRow key={m.assignmentId} member={m} tint={tintFor(i)} projectId={ws.id} />
              ))}
              <AssignTeamForm
                projectId={ws.id}
                alreadyAssignedIds={ws.team.map((m) => m.id)}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>This month</CardTitle>
            </CardHeader>
            <CardContent className="p-[16px_18px] flex flex-col gap-[13px]">
              <div className="flex flex-col gap-[6px]">
                <div className="flex items-baseline justify-between gap-[10px]">
                  <button
                    onClick={() => navigate(`/projects/${ws.id}/checklist`)}
                    className="border-none bg-transparent p-0 cursor-pointer text-[12.5px] text-brand hover:underline"
                  >
                    Checklist complete
                  </button>
                  <span className="font-mono text-[11.5px] text-ink-secondary">
                    {ws.checklist.total > 0
                      ? `${ws.checklist.done} / ${ws.checklist.total}`
                      : 'No template yet'}
                  </span>
                </div>
                <ProgressBar
                  pct={checklistPct}
                  color={loadColorFor(checklistPct / 100)}
                />
              </div>
              <div className="flex flex-col gap-[6px]">
                <div className="flex items-baseline justify-between gap-[10px]">
                  <button
                    onClick={() => navigate(`/projects/${ws.id}/offpage`)}
                    className="border-none bg-transparent p-0 cursor-pointer text-[12.5px] text-brand hover:underline"
                  >
                    Links live
                  </button>
                  <span className="font-mono text-[11.5px] text-ink-secondary">
                    {ws.linksLiveThisMonth} / {ws.linkTarget}
                  </span>
                </div>
                <ProgressBar pct={linksPct} color={loadColorFor(linksPct / 100)} />
              </div>
              <div className="flex flex-col gap-[6px]">
                <div className="flex items-baseline justify-between gap-[10px]">
                  <span className="text-[12.5px]">Hours against budget</span>
                  <span className="font-mono text-[11.5px] text-ink-secondary">
                    {monthlyBudget != null
                      ? `${ws.hoursThisMonth} / ${monthlyBudget}h`
                      : `${ws.hoursThisMonth}h logged`}
                  </span>
                </div>
                {monthlyBudget != null && (
                  <ProgressBar pct={hoursPct} color={loadColorFor(hoursPct / 100)} />
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <RankingsSection projectId={ws.id} />

      <BacklinksSection projectId={ws.id} />

      <section className="flex flex-wrap gap-3 items-start">
        <div className="flex-[1_1_420px] min-w-0">
          <TrafficGoalCard
            projectId={ws.id}
            accountId={ws.accountId}
            trafficGoalClicks={ws.trafficGoalClicks}
            conversionsGoal={ws.conversionsGoal}
          />
        </div>
        <div className="flex-[1_1_280px] max-w-[340px]">
          <CustomGoalsCard projectId={ws.id} />
        </div>
      </section>
    </div>
  )
}
