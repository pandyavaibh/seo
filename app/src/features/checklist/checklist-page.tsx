import { ArrowLeft } from 'lucide-react'
import * as React from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { ProgressBar } from '@/components/ui/progress-bar'
import { Skeleton } from '@/components/ui/skeleton'
import { ProjectSubNav } from '@/features/checklist/project-sub-nav'
import {
  currentMonthKey,
  useChecklist,
  useSetChecklistNote,
  useSetChecklistStatus,
  type ChecklistCategory,
  type ChecklistItem,
} from '@/features/checklist/use-checklist'
import { useProjectWorkspace } from '@/features/projects/use-project-workspace'
import { useCurrentMember } from '@/features/team/use-current-member'
import {
  CHECKLIST_PRIORITY_LABEL,
  CHECKLIST_PRIORITY_TONE,
  CHECKLIST_STATUS_LABEL,
  CHECKLIST_STATUSES,
} from '@/lib/checklist-status'

function ItemRow({ item, projectId, month }: { item: ChecklistItem; projectId: string; month: string }) {
  const { data: currentMember } = useCurrentMember()
  const setStatus = useSetChecklistStatus(projectId, month)
  const setNote = useSetChecklistNote(projectId, month)
  const [note, setNoteInput] = React.useState(item.note ?? '')

  return (
    <div className="flex flex-wrap items-center gap-3 p-[14px_18px] border-b border-border-light last:border-b-0">
      {item.priority && (
        <span className="flex-none">
          <Badge tone={CHECKLIST_PRIORITY_TONE[item.priority]} className="font-mono text-[10px]">
            {CHECKLIST_PRIORITY_LABEL[item.priority]}
          </Badge>
        </span>
      )}
      <div className="flex-[3_1_260px] min-w-0 flex flex-col gap-[2px]">
        <span className="text-[13.5px]">{item.label}</span>
        {item.referenceTag && (
          <span className="inline-block self-start font-mono text-[10px] text-ink-muted bg-surface-sunken px-[7px] py-[2px] rounded-full">
            {item.referenceTag}
          </span>
        )}
      </div>
      <select
        value={item.status}
        onChange={(e) =>
          setStatus.mutate({
            templateItemId: item.id,
            status: e.target.value as ChecklistItem['status'],
            doneBy: currentMember?.id ?? null,
          })
        }
        disabled={setStatus.isPending}
        className="flex-none text-[13px] border border-border rounded-[8px] px-2 py-[7px] bg-surface"
      >
        {CHECKLIST_STATUSES.map((s) => (
          <option key={s} value={s}>{CHECKLIST_STATUS_LABEL[s]}</option>
        ))}
      </select>
      <input
        value={note}
        onChange={(e) => setNoteInput(e.target.value)}
        onBlur={() => {
          if (note !== (item.note ?? '')) setNote.mutate({ templateItemId: item.id, note })
        }}
        placeholder="Notes / findings..."
        className="flex-[2_1_200px] min-w-0 text-[12.5px] border border-border rounded-[8px] px-3 py-[7px] bg-surface"
      />
    </div>
  )
}

function CategorySection({ category, projectId, month }: { category: ChecklistCategory; projectId: string; month: string }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between">
        <h2 className="m-0 font-mono text-[12px] tracking-[0.08em] uppercase text-signal-green">{category.name}</h2>
        <span className="font-mono text-[11px] text-ink-muted">{category.done}/{category.total}</span>
      </div>
      <Card>
        <CardContent className="p-0">
          {category.items.map((item) => (
            <ItemRow key={item.id} item={item} projectId={projectId} month={month} />
          ))}
        </CardContent>
      </Card>
    </div>
  )
}

export function ChecklistPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const navigate = useNavigate()
  const month = currentMonthKey()
  const { data: ws } = useProjectWorkspace(projectId)
  const { data, isLoading } = useChecklist(projectId, month)

  const pct = data && data.totals.total > 0 ? (data.totals.done / data.totals.total) * 100 : 0

  return (
    <div className="flex flex-col gap-4">
      <button
        onClick={() => navigate(-1)}
        className="self-start flex items-center gap-1 border-none bg-transparent font-mono text-[11px] tracking-[0.1em] uppercase text-ink-muted hover:text-ink cursor-pointer p-0"
      >
        <ArrowLeft size={12} /> Back to projects
      </button>

      <Card>
        <CardContent className="p-[18px_20px]">
          <h1 className="m-0 text-[19px] font-semibold">{ws?.name ?? 'Project'}</h1>
          <p className="m-0 mt-1 text-[13px] text-ink-muted">
            {month} · Assigned to {ws?.team.length ? ws.team.map((t) => t.name).join(', ') : '—'}
          </p>
        </CardContent>
      </Card>

      {projectId && <ProjectSubNav projectId={projectId} active="checklist" />}

      <Card>
        <CardContent className="p-[18px_20px] flex flex-col gap-2">
          {isLoading && <Skeleton className="h-[40px] w-full" />}
          {!isLoading && data && (
            <>
              <div className="flex items-baseline gap-3">
                <span className="text-[28px] font-semibold tracking-[-0.02em]">{Math.round(pct)}%</span>
                <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-ink-muted">Complete</span>
              </div>
              <ProgressBar pct={pct} color="var(--color-signal-green)" />
              <div className="flex items-center gap-4 font-mono text-[11px] text-ink-muted">
                <span>● {data.totals.done} Done</span>
                <span>● {data.totals.inProgress} In Progress</span>
                <span>● {data.totals.toDo} To Do</span>
                <span>● {data.totals.na} N/A</span>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {isLoading && <Skeleton className="h-[400px] w-full" />}
      {!isLoading &&
        projectId &&
        (data?.categories ?? []).map((cat) => (
          <CategorySection key={cat.name} category={cat} projectId={projectId} month={month} />
        ))}
    </div>
  )
}
