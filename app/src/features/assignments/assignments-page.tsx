import * as React from 'react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useTeamMembers } from '@/features/accounts/use-account'
import { useToggleAssignment } from '@/features/assignments/use-assignment-toggle'
import {
  useAddStaffMember,
  useCreateBareProject,
  useDeleteProjectQuick,
  useRemoveStaffMember,
  useStaffRoster,
} from '@/features/assignments/use-team-projects-admin'
import { useProjects } from '@/features/projects/use-projects'
import { useCurrentMember } from '@/features/team/use-current-member'
import type { MemberRole } from '@/lib/database.types'

const STAFF_ROLE_LABEL: Record<MemberRole, string> = {
  admin: 'Admin',
  manager: 'Manager',
  member: 'Team',
  client: 'Client',
}

function TeamAndProjectsPanel() {
  const { data: roster, isLoading: rosterLoading } = useStaffRoster()
  const { data: projects, isLoading: projectsLoading } = useProjects()
  const addStaff = useAddStaffMember()
  const removeStaff = useRemoveStaffMember()
  const addProject = useCreateBareProject()
  const removeProject = useDeleteProjectQuick()

  const [name, setName] = React.useState('')
  const [email, setEmail] = React.useState('')
  const [role, setRole] = React.useState<MemberRole>('member')
  const [projectName, setProjectName] = React.useState('')

  const fieldClass = 'text-[13px] rounded-[8px] border border-border px-3 py-2 bg-surface'

  return (
    <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))' }}>
      <Card>
        <CardContent className="p-[16px_18px] flex flex-col gap-3">
          <h2 className="m-0 text-[15px] font-semibold">Team ({roster?.length ?? 0})</h2>
          {rosterLoading && <Skeleton className="h-[80px] w-full" />}
          {!rosterLoading &&
            (roster ?? []).map((m) => (
              <div key={m.id} className="flex items-center justify-between gap-2 py-[6px] border-b border-border-light last:border-b-0">
                <div className="flex flex-col gap-[1px] min-w-0">
                  <span className="text-[13px] font-medium flex items-center gap-[6px]">
                    {m.name} <Badge tone="neutral" className="text-[10px]">{STAFF_ROLE_LABEL[m.role]}</Badge>
                  </span>
                  <span className="font-mono text-[10.5px] text-ink-faint truncate">{m.email}</span>
                </div>
                <button
                  onClick={() => {
                    if (confirm('Remove this team member? Past checklist notes stay, but they’ll be unassigned and lose access.')) {
                      removeStaff.mutate(m.id)
                    }
                  }}
                  disabled={removeStaff.isPending}
                  className="border-none bg-transparent font-mono text-[10.5px] text-ink-muted hover:text-signal-red cursor-pointer p-0 flex-none"
                >
                  Remove
                </button>
              </div>
            ))}
          <div className="flex flex-wrap items-center gap-2">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" className={fieldClass + ' flex-1 min-w-[120px]'} />
            <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Gmail address" type="email" className={fieldClass + ' flex-1 min-w-[140px]'} />
            <select value={role} onChange={(e) => setRole(e.target.value as MemberRole)} className={fieldClass}>
              <option value="member">Team</option>
              <option value="manager">Manager</option>
              <option value="admin">Admin</option>
            </select>
            <Button
              size="sm"
              disabled={!name.trim() || !email.trim() || addStaff.isPending}
              onClick={() =>
                addStaff.mutate({ name, email, role }, { onSuccess: () => { setName(''); setEmail('') } })
              }
            >
              Add
            </Button>
          </div>
          {(addStaff.isError || removeStaff.isError) && (
            <p className="m-0 text-[12px] text-signal-red">
              {(addStaff.error ?? removeStaff.error) instanceof Error
                ? ((addStaff.error ?? removeStaff.error) as Error).message
                : 'Failed'}
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-[16px_18px] flex flex-col gap-3">
          <h2 className="m-0 text-[15px] font-semibold">Projects ({projects?.length ?? 0})</h2>
          {projectsLoading && <Skeleton className="h-[80px] w-full" />}
          {!projectsLoading &&
            (projects ?? []).map((p) => (
              <div key={p.id} className="flex items-center justify-between gap-2 py-[6px] border-b border-border-light last:border-b-0">
                <span className="text-[13px] font-medium truncate">{p.name}</span>
                <div className="flex items-center gap-2 flex-none">
                  <span className="font-mono text-[11px] text-ink-faint">{p.staffed.length} assigned</span>
                  <button
                    onClick={() => {
                      if (confirm('Remove this project? Past checklist history is kept but hidden.')) {
                        removeProject.mutate(p.id)
                      }
                    }}
                    disabled={removeProject.isPending}
                    className="border-none bg-transparent font-mono text-[10.5px] text-ink-muted hover:text-signal-red cursor-pointer p-0"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          <div className="flex items-center gap-2">
            <input
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="Project name"
              className={fieldClass + ' flex-1'}
            />
            <Button
              size="sm"
              disabled={!projectName.trim() || addProject.isPending}
              onClick={() => addProject.mutate(projectName, { onSuccess: () => setProjectName('') })}
            >
              Add
            </Button>
          </div>
          {(addProject.isError || removeProject.isError) && (
            <p className="m-0 text-[12px] text-signal-red">
              {(addProject.error ?? removeProject.error) instanceof Error
                ? ((addProject.error ?? removeProject.error) as Error).message
                : 'Failed'}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

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
  const { data: currentMember } = useCurrentMember()
  const toggle = useToggleAssignment()
  const isLoading = projectsLoading || membersLoading

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <span className="font-mono text-[11px] tracking-[0.14em] uppercase text-ink-muted">
          Staff every project at a glance
        </span>
        <h1 className="m-0 text-[25px] font-semibold tracking-[-0.02em]">Assignments</h1>
      </div>

      {currentMember?.role === 'admin' && (
        <div className="flex flex-col gap-2">
          <h2 className="m-0 font-mono text-[12px] tracking-[0.08em] uppercase text-signal-green">
            Team &amp; Projects
          </h2>
          <p className="m-0 text-[13px] text-ink-muted">
            Add new hires (their Gmail address signs them in) or bare projects — they'll show up
            everywhere immediately.
          </p>
          <TeamAndProjectsPanel />
        </div>
      )}

      <div className="flex flex-col gap-1">
        <h2 className="m-0 font-mono text-[12px] tracking-[0.08em] uppercase text-signal-green">
          Assignments
        </h2>
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
