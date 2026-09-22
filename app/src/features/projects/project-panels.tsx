import * as React from 'react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ProgressBar } from '@/components/ui/progress-bar'
import { useTeamMembers } from '@/features/accounts/use-account'
import { useAccountPerformance } from '@/features/accounts/use-account-performance'
import {
  useAddAssignment,
  useRemoveAssignment,
} from '@/features/projects/use-project-workspace'
import {
  useCreateGoal,
  useDeleteGoal,
  useProjectGoals,
  useUpdateGoalProgress,
  useUpdateTrafficGoals,
  type CustomGoal,
} from '@/features/projects/use-project-goals'
import { initials, tintFor } from '@/lib/avatar'
import { loadColorFor } from '@/lib/load-color'

function TeamRow({
  member,
  tint,
}: {
  member: { assignmentId: string; id: string; name: string; role: string; weeklyHours: number }
  tint: string
}) {
  const removeAssignment = useRemoveAssignment()

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

export function AssignedTeamCard({
  projectId,
  team,
}: {
  projectId: string
  team: { assignmentId: string; id: string; name: string; role: string; weeklyHours: number }[]
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Assigned team</CardTitle>
      </CardHeader>
      <CardContent className="p-[16px_18px] flex flex-col gap-[11px]">
        {team.length === 0 && (
          <p className="m-0 text-[13px] text-ink-muted">Nobody staffed on this project yet.</p>
        )}
        {team.map((m, i) => (
          <TeamRow key={m.assignmentId} member={m} tint={tintFor(i)} />
        ))}
        <AssignTeamForm projectId={projectId} alreadyAssignedIds={team.map((m) => m.id)} />
      </CardContent>
    </Card>
  )
}

export function TrafficGoalCard({
  projectId,
  accountId,
  trafficGoalClicks,
  conversionsGoal,
}: {
  projectId: string
  accountId: string
  trafficGoalClicks: number | null
  conversionsGoal: number | null
}) {
  const { data: perf } = useAccountPerformance(accountId)
  const updateGoals = useUpdateTrafficGoals(projectId)
  const [editing, setEditing] = React.useState(false)
  const [trafficInput, setTrafficInput] = React.useState(
    trafficGoalClicks != null ? String(trafficGoalClicks) : '',
  )
  const [conversionsInput, setConversionsInput] = React.useState(
    conversionsGoal != null ? String(conversionsGoal) : '',
  )

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

export function CustomGoalsCard({ projectId }: { projectId: string }) {
  const { data: goals, isLoading } = useProjectGoals(projectId)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Custom KPIs</CardTitle>
      </CardHeader>
      <CardContent className="p-[16px_18px] flex flex-col gap-3">
        {isLoading && <p className="m-0 text-[13px] text-ink-muted">Loading…</p>}
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
