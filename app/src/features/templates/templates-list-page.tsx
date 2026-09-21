import { AlertTriangle, ClipboardList } from 'lucide-react'
import * as React from 'react'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  useAddTemplateTask,
  useCreateTemplate,
  useDeleteTemplate,
  useDeleteTemplateTask,
  useTemplates,
  type Template,
} from '@/features/templates/use-templates'

function NewTemplateForm({ onCreated }: { onCreated: () => void }) {
  const createTemplate = useCreateTemplate()
  const [name, setName] = React.useState('')
  const [description, setDescription] = React.useState('')
  const fieldClass = 'text-[13px] rounded-[8px] border border-border px-3 py-2 bg-surface w-full'

  return (
    <Card>
      <CardHeader>
        <CardTitle>New template</CardTitle>
      </CardHeader>
      <CardContent className="p-[16px_18px] flex flex-col gap-3">
        <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Technical SEO onboarding" className={fieldClass} />
          <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description (optional)" className={fieldClass} />
        </div>
        {createTemplate.isError && (
          <p className="m-0 text-[12px] text-signal-red">
            {createTemplate.error instanceof Error ? createTemplate.error.message : 'Failed to create template'}
          </p>
        )}
        <Button
          size="sm"
          disabled={!name.trim() || createTemplate.isPending}
          onClick={() =>
            createTemplate.mutate(
              { name, description },
              { onSuccess: () => { setName(''); setDescription(''); onCreated() } },
            )
          }
        >
          {createTemplate.isPending ? 'Creating…' : 'Create template'}
        </Button>
      </CardContent>
    </Card>
  )
}

function AddTemplateTaskRow({ templateId, nextOrder }: { templateId: string; nextOrder: number }) {
  const addTask = useAddTemplateTask()
  const [label, setLabel] = React.useState('')
  const [estimateHours, setEstimateHours] = React.useState('')

  return (
    <div className="flex items-center gap-2">
      <input
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        placeholder="Task name"
        className="flex-1 text-[13px] border border-border rounded-[6px] px-2 py-1"
      />
      <input
        value={estimateHours}
        onChange={(e) => setEstimateHours(e.target.value)}
        placeholder="Est. h"
        inputMode="decimal"
        className="w-[70px] text-[12px] font-mono border border-border rounded-[6px] px-2 py-1"
      />
      <Button
        size="sm"
        variant="secondary"
        disabled={!label.trim() || addTask.isPending}
        onClick={() =>
          addTask.mutate(
            { templateId, label, estimateHours: estimateHours ? Number(estimateHours) : null, sortOrder: nextOrder },
            { onSuccess: () => { setLabel(''); setEstimateHours('') } },
          )
        }
      >
        Add
      </Button>
    </div>
  )
}

function TemplateCard({ template }: { template: Template }) {
  const deleteTemplate = useDeleteTemplate()
  const deleteTask = useDeleteTemplateTask()

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-[1px]">
          <CardTitle>{template.name}</CardTitle>
          {template.description && (
            <span className="text-[12px] text-ink-muted">{template.description}</span>
          )}
        </div>
        <button
          onClick={() => deleteTemplate.mutate(template.id)}
          disabled={deleteTemplate.isPending}
          className="border-none bg-transparent font-mono text-[10.5px] text-ink-muted hover:text-signal-red cursor-pointer p-0"
        >
          Delete template
        </button>
      </CardHeader>
      <CardContent className="p-[16px_18px] flex flex-col gap-[8px]">
        {template.tasks.length === 0 && (
          <p className="m-0 text-[13px] text-ink-muted">No tasks in this template yet.</p>
        )}
        {template.tasks.map((t) => (
          <div key={t.id} className="flex items-center gap-2">
            <span className="flex-1 text-[13px]">{t.label}</span>
            <span className="font-mono text-[11px] text-ink-muted w-[50px] text-right">
              {t.estimateHours != null ? `${t.estimateHours}h` : '—'}
            </span>
            <button
              onClick={() => deleteTask.mutate(t.id)}
              disabled={deleteTask.isPending}
              className="border-none bg-transparent font-mono text-[10.5px] text-ink-muted hover:text-signal-red cursor-pointer p-0"
            >
              Remove
            </button>
          </div>
        ))}
        <AddTemplateTaskRow templateId={template.id} nextOrder={template.tasks.length} />
      </CardContent>
    </Card>
  )
}

export function TemplatesListPage() {
  const { data, isLoading, isError, error, refetch, isFetching } = useTemplates()
  const [showNew, setShowNew] = React.useState(false)

  return (
    <div className="flex flex-col gap-[18px]">
      <div className="flex flex-wrap gap-3 items-end justify-between">
        <div className="flex flex-col gap-1">
          <span className="font-mono text-[11px] tracking-[0.14em] uppercase text-ink-muted">
            {data ? `${data.length} templates` : 'Loading…'}
          </span>
          <h1 className="m-0 text-[25px] font-semibold tracking-[-0.02em]">Templates</h1>
        </div>
        {!showNew && <Button onClick={() => setShowNew(true)}>New template</Button>}
      </div>

      {showNew && <NewTemplateForm onCreated={() => setShowNew(false)} />}

      {isError && (
        <Alert variant="destructive">
          <AlertTitle className="flex items-center gap-2">
            <AlertTriangle size={14} /> Couldn't load templates
          </AlertTitle>
          <AlertDescription>{error instanceof Error ? error.message : 'Unknown error'}</AlertDescription>
          <div>
            <Button variant="secondary" size="sm" onClick={() => refetch()} disabled={isFetching}>
              {isFetching ? 'Retrying…' : 'Retry'}
            </Button>
          </div>
        </Alert>
      )}

      {!isError && isLoading && (
        <div className="bg-surface border border-border rounded-[12px] p-[18px] flex flex-col gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-[38px] w-full" />
          ))}
        </div>
      )}

      {!isError && !isLoading && data && data.length === 0 && !showNew && (
        <div className="bg-surface border border-border rounded-[12px] p-[40px] flex flex-col items-center gap-2 text-center">
          <ClipboardList className="text-ink-faint" size={28} />
          <p className="m-0 font-medium text-[14px]">No templates yet</p>
          <p className="m-0 text-[13px] text-ink-muted max-w-[44ch]">
            Build a reusable task list once, then apply it to any project — from its workspace — to seed the same tasks instantly. Monthly-retainer projects with a template applied also get it re-generated automatically on their renewal day.
          </p>
        </div>
      )}

      {!isError && !isLoading && data && data.length > 0 && (
        <div className="flex flex-col gap-3">
          {data.map((t) => (
            <TemplateCard key={t.id} template={t} />
          ))}
        </div>
      )}
    </div>
  )
}
