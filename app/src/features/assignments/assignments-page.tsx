import { useTeamMembers } from '@/features/accounts/use-account'
import { useToggleAssignment } from '@/features/assignments/use-assignment-toggle'
import { useProjects } from '@/features/projects/use-projects'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

function MemberChip({
  name,
  on,
  disabled,
  onClick,
}: {
  name: string
  on: boolean
  disabled: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex items-center gap-[6px] text-[12.5px] font-medium px-[13px] py-[6px] rounded-full border-[1.5px] cursor-pointer"
      style={{
        borderColor: on ? 'var(--color-signal-green)' : 'var(--color-border)',
        background: on ? 'var(--color-pill-green-bg)' : 'var(--color-surface-sunken)',
        color: on ? 'var(--color-pill-green-fg)' : 'var(--color-ink-muted)',
      }}
    >
      <span className="w-[6px] h-[6px] rounded-full" style={{ background: 'currentColor' }} />
      {name}
    </button>
  )
}

export function AssignmentsPage() {
  const { data: projects, isLoading: projectsLoading } = useProjects()
  const { data: teamMembers, isLoading: membersLoading } = useTeamMembers()
  const toggle = useToggleAssignment()
  const isLoading = projectsLoading || membersLoading

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <span className="font-mono text-[11px] tracking-[0.14em] uppercase text-ink-muted">
          Staff every project at a glance
        </span>
        <h1 className="m-0 text-[25px] font-semibold tracking-[-0.02em]">Assignments</h1>
        <p className="m-0 text-[13px] text-ink-muted">
          Click a name to add or remove them from a project. Someone can be on more than one.
        </p>
      </div>

      {isLoading && (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-[64px] w-full" />
          ))}
        </div>
      )}

      {!isLoading && projects && projects.length === 0 && (
        <Card>
          <CardContent className="p-[24px] text-center text-[13px] text-ink-muted">
            No engagements yet — create one from a client's Account record.
          </CardContent>
        </Card>
      )}

      {!isLoading &&
        (projects ?? []).map((p) => {
          const staffedIds = new Set(p.staffed.map((m) => m.id))
          return (
            <Card key={p.id}>
              <CardContent className="p-[14px_18px] flex flex-wrap items-center justify-between gap-3">
                <span className="text-[14.5px] font-semibold min-w-[160px]">{p.name}</span>
                <div className="flex flex-wrap items-center gap-[8px]">
                  {(teamMembers ?? []).map((m) => (
                    <MemberChip
                      key={m.id}
                      name={m.name}
                      on={staffedIds.has(m.id)}
                      disabled={toggle.isPending}
                      onClick={() => toggle.mutate({ projectId: p.id, memberId: m.id, on: staffedIds.has(m.id) })}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          )
        })}
    </div>
  )
}
