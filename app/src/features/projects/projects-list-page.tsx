import { AlertTriangle, FolderOpen } from 'lucide-react'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge, type PillTone } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useProjects } from '@/features/projects/use-projects'

const STATUS_TONE: Record<string, PillTone> = {
  active: 'green',
  paused: 'amber',
  shipped: 'neutral',
}

const TINTS = [
  'var(--color-tint-0)',
  'var(--color-tint-1)',
  'var(--color-tint-2)',
  'var(--color-tint-3)',
  'var(--color-tint-4)',
  'var(--color-tint-5)',
  'var(--color-tint-6)',
  'var(--color-tint-7)',
  'var(--color-tint-8)',
  'var(--color-tint-9)',
]

function initials(name: string) {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
}

export function ProjectsListPage() {
  const { data, isLoading, isError, error, refetch, isFetching } =
    useProjects()

  return (
    <div className="flex flex-col gap-[18px]">
      <div className="flex flex-wrap gap-3 items-end justify-between">
        <div className="flex flex-col gap-1">
          <span className="font-mono text-[11px] tracking-[0.14em] uppercase text-ink-muted">
            {data ? `${data.length} projects` : 'Loading…'}
          </span>
          <h1 className="m-0 text-[25px] font-semibold tracking-[-0.02em]">
            Projects
          </h1>
        </div>
      </div>

      {isError && (
        <Alert variant="destructive">
          <AlertTitle className="flex items-center gap-2">
            <AlertTriangle size={14} /> Couldn't load projects
          </AlertTitle>
          <AlertDescription>
            {error instanceof Error ? error.message : 'Unknown error'}. This
            could be a real permissions problem, not an empty table.
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
      )}

      {!isError && isLoading && (
        <div className="bg-surface border border-border rounded-[12px] p-[18px] flex flex-col gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-[38px] w-full" />
          ))}
        </div>
      )}

      {!isError && !isLoading && data && data.length === 0 && (
        <div className="bg-surface border border-border rounded-[12px] p-[40px] flex flex-col items-center gap-2 text-center">
          <FolderOpen className="text-ink-faint" size={28} />
          <p className="m-0 font-medium text-[14px]">No projects yet</p>
          <p className="m-0 text-[13px] text-ink-muted max-w-[40ch]">
            Projects you're staffed on, or all projects if you're an admin
            or manager, will show up here.
          </p>
        </div>
      )}

      {!isError && !isLoading && data && data.length > 0 && (
        <div className="bg-surface border border-border rounded-[12px] overflow-hidden">
          <Table className="min-w-[640px]">
            <TableHeader>
              <TableRow>
                <TableHead>Project</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Staffed</TableHead>
                <TableHead>Link target</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>
                    <div className="flex flex-col gap-[2px]">
                      <span className="font-medium text-[13.5px]">
                        {p.name}
                      </span>
                      {p.clientName && (
                        <span className="font-mono text-[10.5px] text-ink-muted">
                          {p.clientName}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge tone={STATUS_TONE[p.status] ?? 'neutral'}>
                      {p.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-[3px]">
                      {p.staffed.map((m, i) => (
                        <span
                          key={m.id}
                          title={m.name}
                          className="w-6 h-6 rounded-full grid place-items-center font-mono text-[10px] font-semibold"
                          style={{
                            background: TINTS[i % TINTS.length],
                          }}
                        >
                          {initials(m.name)}
                        </span>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-[12px] text-ink-secondary">
                    {p.linkTarget}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
