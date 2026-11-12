import { useMutation, useQueryClient } from '@tanstack/react-query'
import * as React from 'react'
import { useNavigate } from 'react-router-dom'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  useAddContact,
  useAddPortalUser,
  useDeleteContact,
  usePortalUsers,
  useRemovePortalUser,
  useUpdateContact,
  type AccountDetail,
  type ContactInput,
} from '@/features/accounts/use-account'
import { useAccountContext } from '@/features/accounts/use-account-context'
import { useAccountPerformance } from '@/features/accounts/use-account-performance'
import { TechnicalAuditCard } from '@/features/accounts/technical-audit-card'
import { ChurnRiskCard } from '@/features/intelligence/churn-risk-card'
import { PortalCommentsThread } from '@/features/portal/portal-comments-thread'
import {
  useAddDeliverable,
  useDeleteDeliverable,
  useDeliverables,
} from '@/features/portal/use-deliverables'
import {
  ProjectHoursPanel,
  ProjectHoursSummary,
} from '@/features/projects/project-hours-panel'
import { AssignedTeamCard, CustomGoalsCard, TrafficGoalCard } from '@/features/projects/project-panels'
import { useCreateProject } from '@/features/projects/use-projects'
import { useCurrentMember } from '@/features/team/use-current-member'
import { initials } from '@/lib/avatar'
import type { ActivityKind } from '@/lib/database.types'
import { PROJECT_TYPES, PROJECT_TYPE_LABEL } from '@/lib/project-type'
import { STAGE_LABEL, STAGE_TONE } from '@/lib/project-stage'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/providers/auth-provider'

const ACTIVITY_DOT: Record<ActivityKind, string> = {
  issue: 'var(--color-signal-red)',
  report: 'var(--color-signal-green)',
  call: 'var(--color-ink-muted)',
  meeting: 'var(--color-ink-muted)',
  email: 'var(--color-ink-muted)',
  note: 'var(--color-ink-muted)',
}

function formatMoney(cents: number | null, currency: string) {
  if (cents == null) return '—'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(cents / 100)
}

function StatTile({
  label,
  value,
  note,
  anchor,
}: {
  label: string
  value: string
  note?: string
  anchor?: string
}) {
  const classes =
    'bg-surface border border-border rounded-[14px] p-[14px_16px] flex flex-col gap-[6px] shadow-[var(--shadow-sm)]'
  const inner = (
    <>
      <span className="font-mono text-[10px] tracking-[0.12em] uppercase text-ink-muted">
        {label}
      </span>
      <span className="text-[23px] font-semibold tracking-[-0.02em] leading-none">
        {value}
      </span>
      {note && <span className="text-[11.5px] text-ink-muted">{note}</span>}
    </>
  )
  if (anchor) {
    return (
      <a href={anchor} className={`${classes} no-underline text-inherit transition-colors hover:border-brand`}>
        {inner}
      </a>
    )
  }
  return <div className={classes}>{inner}</div>
}

function PerformanceTiles({ accountId }: { accountId: string }) {
  const navigate = useNavigate()
  const { data: perf, isLoading } = useAccountPerformance(accountId)

  if (isLoading || !perf) {
    return <Skeleton className="h-[76px] w-full" />
  }

  const anyConnected = perf.gscConnected || perf.ga4Connected

  return (
    <section className="flex flex-col gap-2">
      <section className="grid gap-[10px]" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(168px, 1fr))' }}>
        <StatTile
          label="Organic clicks (28d)"
          value={perf.gscConnected ? (perf.organicClicks28d ?? 0).toLocaleString() : '—'}
          note={perf.gscConnected ? undefined : 'Search Console not connected'}
        />
        <StatTile
          label="Conversions (28d)"
          value={perf.ga4Connected ? (perf.conversions28d ?? 0).toLocaleString() : '—'}
          note={perf.ga4Connected ? undefined : 'GA4 not connected'}
        />
        <StatTile
          label="Keywords top 10"
          value={perf.keywordsTop10 != null ? String(perf.keywordsTop10) : '—'}
          note={perf.keywordsTop10 == null ? 'No keywords tracked yet' : undefined}
        />
        <StatTile label="Links live (this month)" value={String(perf.linksLiveThisMonth)} />
        <StatTile label="Hours logged (this month)" value={String(perf.hoursLoggedThisMonth)} />
      </section>
      {!anyConnected && (
        <button
          onClick={() => navigate(`/clients/${accountId}/search`)}
          className="self-start border-none bg-transparent font-mono text-[11px] text-brand hover:underline cursor-pointer p-0"
        >
          Connect Search Console / GA4 for real search performance →
        </button>
      )}
    </section>
  )
}

function AddProjectForm({
  accountId,
  acc,
  onClose,
}: {
  accountId: string
  acc: AccountDetail
  onClose: () => void
}) {
  const createProject = useCreateProject(accountId, acc.name)
  const [name, setName] = React.useState('')
  const [projectType, setProjectType] = React.useState('')
  const [dueOn, setDueOn] = React.useState('')
  const [weeklyHours, setWeeklyHours] = React.useState('')
  const [billingCycle, setBillingCycle] = React.useState<'monthly' | 'one_time'>('monthly')
  const [renewalDay, setRenewalDay] = React.useState('')
  const [linkTarget, setLinkTarget] = React.useState('200')

  const fieldClass =
    'text-[13px] rounded-[8px] border border-border px-3 py-2 bg-surface w-full'

  return (
    <div className="flex flex-col gap-3 p-[12px] border border-border-light rounded-[10px] bg-surface-sunken-2">
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 p-[10px_12px] rounded-[8px] bg-surface border border-border-light text-[12px]">
        <span className="font-mono text-[10px] tracking-[0.1em] uppercase text-ink-muted">
          Client
        </span>
        <span className="font-medium">{acc.name}</span>
        {acc.website && <span className="text-ink-muted">{acc.website}</span>}
        <span className="text-ink-muted">
          Account retainer: {formatMoney(acc.retainerCents, acc.currency)}/mo
        </span>
        {acc.renewalOn && (
          <span className="text-ink-muted">Contract renews {acc.renewalOn}</span>
        )}
      </div>

      <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))' }}>
        <label className="flex flex-col gap-1">
          <span className="font-mono text-[10px] tracking-[0.1em] uppercase text-ink-muted">
            Name *
          </span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Q4 content cluster"
            className={fieldClass}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="font-mono text-[10px] tracking-[0.1em] uppercase text-ink-muted">
            Type
          </span>
          <select
            value={projectType}
            onChange={(e) => setProjectType(e.target.value)}
            className={fieldClass}
          >
            <option value="">—</option>
            {PROJECT_TYPES.map((t) => (
              <option key={t} value={t}>
                {PROJECT_TYPE_LABEL[t]}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="font-mono text-[10px] tracking-[0.1em] uppercase text-ink-muted">
            Billing cycle
          </span>
          <select
            value={billingCycle}
            onChange={(e) => setBillingCycle(e.target.value as 'monthly' | 'one_time')}
            className={fieldClass}
          >
            <option value="monthly">Monthly retainer</option>
            <option value="one_time">One-time project</option>
          </select>
        </label>
        {billingCycle === 'monthly' && (
          <label className="flex flex-col gap-1">
            <span className="font-mono text-[10px] tracking-[0.1em] uppercase text-ink-muted">
              Renews on (day of month)
            </span>
            <input
              value={renewalDay}
              onChange={(e) => setRenewalDay(e.target.value)}
              placeholder="1"
              inputMode="numeric"
              className={fieldClass}
            />
          </label>
        )}
        <label className="flex flex-col gap-1">
          <span className="font-mono text-[10px] tracking-[0.1em] uppercase text-ink-muted">
            {billingCycle === 'monthly' ? 'Next due date' : 'Due date'}
          </span>
          <input
            type="date"
            value={dueOn}
            onChange={(e) => setDueOn(e.target.value)}
            className={fieldClass}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="font-mono text-[10px] tracking-[0.1em] uppercase text-ink-muted">
            Weekly hours
          </span>
          <input
            value={weeklyHours}
            onChange={(e) => setWeeklyHours(e.target.value)}
            placeholder="10"
            inputMode="decimal"
            className={fieldClass}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="font-mono text-[10px] tracking-[0.1em] uppercase text-ink-muted">
            Monthly link target
          </span>
          <input
            value={linkTarget}
            onChange={(e) => setLinkTarget(e.target.value)}
            placeholder="200"
            inputMode="numeric"
            className={fieldClass}
          />
        </label>
      </div>
      {createProject.isError && (
        <p className="m-0 text-[12px] text-signal-red">
          {createProject.error instanceof Error
            ? createProject.error.message
            : 'Failed to create engagement'}
        </p>
      )}
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          disabled={!name.trim() || createProject.isPending}
          onClick={() =>
            createProject.mutate(
              { name, projectType, dueOn, weeklyHours, billingCycle, renewalDay, linkTarget },
              { onSuccess: onClose },
            )
          }
        >
          {createProject.isPending ? 'Creating…' : 'Set up engagement'}
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={onClose}
          disabled={createProject.isPending}
        >
          Cancel
        </Button>
      </div>
    </div>
  )
}

function LogActivityForm({ accountId }: { accountId: string }) {
  const { session } = useAuth()
  const queryClient = useQueryClient()
  const [body, setBody] = React.useState('')
  const [kind, setKind] = React.useState<ActivityKind>('note')

  const mutation = useMutation({
    mutationFn: async () => {
      const { data: member } = await supabase
        .from('team_members')
        .select('id')
        .eq('email', session!.user.email!.toLowerCase())
        .maybeSingle()
      const { error } = await supabase.from('activities').insert({
        account_id: accountId,
        kind,
        body,
        author_id: member?.id,
      })
      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      setBody('')
      queryClient.invalidateQueries({ queryKey: ['account', accountId] })
    },
  })

  return (
    <div className="flex flex-col gap-2 pt-2 border-t border-border-light">
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Log a call, meeting, note…"
        rows={2}
        className="w-full text-[13px] rounded-[8px] border border-border p-2 resize-none font-sans"
      />
      <div className="flex items-center justify-between gap-2">
        <select
          value={kind}
          onChange={(e) => setKind(e.target.value as ActivityKind)}
          className="text-[12px] font-mono border border-border rounded-[6px] px-2 py-1 bg-surface"
        >
          <option value="note">Note</option>
          <option value="call">Call</option>
          <option value="meeting">Meeting</option>
          <option value="email">Email</option>
          <option value="report">Report</option>
          <option value="issue">Issue</option>
        </select>
        <Button
          size="sm"
          disabled={!body.trim() || mutation.isPending}
          onClick={() => mutation.mutate()}
        >
          {mutation.isPending ? 'Logging…' : 'Log activity'}
        </Button>
      </div>
      {mutation.isError && (
        <p className="m-0 text-[12px] text-signal-red">
          {mutation.error instanceof Error
            ? mutation.error.message
            : 'Failed to log activity'}
        </p>
      )}
    </div>
  )
}

function contactFieldClass() {
  return 'text-[13px] rounded-[8px] border border-border px-2 py-[6px] bg-surface w-full'
}

type ContactDetail = AccountDetail['contacts'][number]

function ContactForm({
  initial,
  onSave,
  onCancel,
  saving,
  saveError,
  saveLabel,
}: {
  initial: ContactInput
  onSave: (input: ContactInput) => void
  onCancel: () => void
  saving: boolean
  saveError: string | null
  saveLabel: string
}) {
  const [name, setName] = React.useState(initial.name)
  const [role, setRole] = React.useState(initial.role)
  const [email, setEmail] = React.useState(initial.email)
  const [phone, setPhone] = React.useState(initial.phone)
  const [isPrimary, setIsPrimary] = React.useState(initial.isPrimary)
  const fieldClass = contactFieldClass()

  return (
    <div className="flex flex-col gap-2 p-[10px] border border-border-light rounded-[10px] bg-surface-sunken-2">
      <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))' }}>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Name *"
          className={fieldClass}
        />
        <input
          value={role}
          onChange={(e) => setRole(e.target.value)}
          placeholder="Role"
          className={fieldClass}
        />
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          className={fieldClass}
        />
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="Phone"
          className={fieldClass}
        />
      </div>
      <label className="flex items-center gap-[6px] text-[12px] text-ink-secondary">
        <input
          type="checkbox"
          checked={isPrimary}
          onChange={(e) => setIsPrimary(e.target.checked)}
        />
        Primary contact
      </label>
      {saveError && <p className="m-0 text-[12px] text-signal-red">{saveError}</p>}
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          disabled={!name.trim() || saving}
          onClick={() => onSave({ name, role, email, phone, isPrimary })}
        >
          {saving ? 'Saving…' : saveLabel}
        </Button>
        <Button variant="secondary" size="sm" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
      </div>
    </div>
  )
}

function PortalUsersCard({ accountId }: { accountId: string }) {
  const { data: users, isLoading } = usePortalUsers(accountId)
  const addUser = useAddPortalUser(accountId)
  const removeUser = useRemovePortalUser(accountId)
  const [showForm, setShowForm] = React.useState(false)
  const [email, setEmail] = React.useState('')
  const [name, setName] = React.useState('')

  const fieldClass = 'text-[13px] rounded-[8px] border border-border px-3 py-2 bg-surface w-full'

  return (
    <Card>
      <CardHeader>
        <CardTitle>Portal users</CardTitle>
        {!showForm && (
          <Button variant="secondary" size="sm" onClick={() => setShowForm(true)}>
            Grant access
          </Button>
        )}
      </CardHeader>
      <CardContent className="p-[16px_18px] flex flex-col gap-3">
        <p className="m-0 text-[12px] text-ink-muted">
          Anyone listed here signs in with the same Google button and sees only this client's
          portal — no internal data. Their Google account's email must match exactly.
        </p>
        {showForm && (
          <div className="flex flex-col gap-2">
            <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))' }}>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" className={fieldClass} />
              <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="client@company.com" className={fieldClass} />
            </div>
            {addUser.isError && (
              <p className="m-0 text-[12px] text-signal-red">
                {addUser.error instanceof Error ? addUser.error.message : 'Failed to grant access'}
              </p>
            )}
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                disabled={!name.trim() || !email.trim() || addUser.isPending}
                onClick={() =>
                  addUser.mutate({ email, name }, { onSuccess: () => { setEmail(''); setName(''); setShowForm(false) } })
                }
              >
                {addUser.isPending ? 'Granting…' : 'Grant access'}
              </Button>
              <Button variant="secondary" size="sm" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
            </div>
          </div>
        )}
        {isLoading && <Skeleton className="h-[40px] w-full" />}
        {!isLoading && (users ?? []).length === 0 && (
          <p className="m-0 text-[13px] text-ink-muted">Nobody has portal access yet.</p>
        )}
        {!isLoading &&
          (users ?? []).map((u) => (
            <div key={u.id} className="flex items-center justify-between gap-2">
              <div className="flex flex-col gap-[1px] min-w-0">
                <span className="text-[13px] truncate">{u.name}</span>
                <span className="font-mono text-[10.5px] text-ink-muted truncate">{u.email}</span>
              </div>
              <button
                onClick={() => removeUser.mutate(u.id)}
                disabled={removeUser.isPending}
                className="border-none bg-transparent font-mono text-[10.5px] text-ink-muted hover:text-signal-red cursor-pointer p-0 flex-none"
              >
                Remove
              </button>
            </div>
          ))}
      </CardContent>
    </Card>
  )
}

function DeliverablesCard({ accountId }: { accountId: string }) {
  const { data: deliverables, isLoading } = useDeliverables(accountId)
  const addDeliverable = useAddDeliverable(accountId)
  const removeDeliverable = useDeleteDeliverable(accountId)
  const [showForm, setShowForm] = React.useState(false)
  const [title, setTitle] = React.useState('')
  const [url, setUrl] = React.useState('')
  const [deliveredOn, setDeliveredOn] = React.useState(new Date().toISOString().slice(0, 10))

  const fieldClass = 'text-[13px] rounded-[8px] border border-border px-3 py-2 bg-surface w-full'

  return (
    <Card>
      <CardHeader>
        <CardTitle>Deliverables</CardTitle>
        {!showForm && (
          <Button variant="secondary" size="sm" onClick={() => setShowForm(true)}>
            Add
          </Button>
        )}
      </CardHeader>
      <CardContent className="p-[16px_18px] flex flex-col gap-3">
        {showForm && (
          <div className="flex flex-col gap-2">
            <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))' }}>
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" className={fieldClass} />
              <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="Link (optional)" className={fieldClass} />
              <input type="date" value={deliveredOn} onChange={(e) => setDeliveredOn(e.target.value)} className={fieldClass} />
            </div>
            {addDeliverable.isError && (
              <p className="m-0 text-[12px] text-signal-red">
                {addDeliverable.error instanceof Error ? addDeliverable.error.message : 'Failed to add'}
              </p>
            )}
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                disabled={!title.trim() || addDeliverable.isPending}
                onClick={() =>
                  addDeliverable.mutate(
                    { title, url, deliveredOn },
                    { onSuccess: () => { setTitle(''); setUrl(''); setShowForm(false) } },
                  )
                }
              >
                {addDeliverable.isPending ? 'Adding…' : 'Add'}
              </Button>
              <Button variant="secondary" size="sm" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
            </div>
          </div>
        )}
        {isLoading && <Skeleton className="h-[60px] w-full" />}
        {!isLoading && (deliverables ?? []).length === 0 && (
          <p className="m-0 text-[13px] text-ink-muted">Nothing delivered yet.</p>
        )}
        {!isLoading &&
          (deliverables ?? []).map((d) => (
            <div key={d.id} className="flex items-center justify-between gap-2">
              <div className="flex flex-col gap-[1px] min-w-0">
                {d.url ? (
                  <a href={d.url} target="_blank" rel="noreferrer" className="text-[13px] text-brand hover:underline truncate">
                    {d.title}
                  </a>
                ) : (
                  <span className="text-[13px] truncate">{d.title}</span>
                )}
                <span className="font-mono text-[10.5px] text-ink-muted">{d.deliveredOn}</span>
              </div>
              <button
                onClick={() => removeDeliverable.mutate(d.id)}
                disabled={removeDeliverable.isPending}
                className="border-none bg-transparent font-mono text-[10.5px] text-ink-muted hover:text-signal-red cursor-pointer p-0 flex-none"
              >
                Remove
              </button>
            </div>
          ))}
      </CardContent>
    </Card>
  )
}

function ContactsCard({ accountId, contacts }: { accountId: string; contacts: ContactDetail[] }) {
  const [showAdd, setShowAdd] = React.useState(false)
  const [editingId, setEditingId] = React.useState<string | null>(null)
  const addContact = useAddContact(accountId)
  const updateContact = useUpdateContact(accountId)
  const deleteContact = useDeleteContact(accountId)

  const emptyInput: ContactInput = { name: '', role: '', email: '', phone: '', isPrimary: false }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Contacts</CardTitle>
        {!showAdd && (
          <Button variant="secondary" size="sm" onClick={() => setShowAdd(true)}>
            Add contact
          </Button>
        )}
      </CardHeader>
      <CardContent className="p-[16px_18px] flex flex-col gap-3">
        {showAdd && (
          <ContactForm
            initial={emptyInput}
            saving={addContact.isPending}
            saveError={
              addContact.isError
                ? addContact.error instanceof Error
                  ? addContact.error.message
                  : 'Failed to add contact'
                : null
            }
            saveLabel="Add contact"
            onCancel={() => setShowAdd(false)}
            onSave={(input) =>
              addContact.mutate(input, { onSuccess: () => setShowAdd(false) })
            }
          />
        )}
        {contacts.length === 0 && !showAdd && (
          <p className="m-0 text-[13px] text-ink-muted">No contacts added yet.</p>
        )}
        {contacts.map((c) =>
          editingId === c.id ? (
            <ContactForm
              key={c.id}
              initial={{
                name: c.name,
                role: c.role ?? '',
                email: c.email ?? '',
                phone: c.phone ?? '',
                isPrimary: c.isPrimary,
              }}
              saving={updateContact.isPending}
              saveError={
                updateContact.isError
                  ? updateContact.error instanceof Error
                    ? updateContact.error.message
                    : 'Failed to save contact'
                  : null
              }
              saveLabel="Save"
              onCancel={() => setEditingId(null)}
              onSave={(input) =>
                updateContact.mutate(
                  { ...input, id: c.id },
                  { onSuccess: () => setEditingId(null) },
                )
              }
            />
          ) : (
            <div key={c.id} className="flex items-center gap-[10px]">
              <span className="w-7 h-7 flex-none rounded-full grid place-items-center font-mono text-[10px] font-semibold bg-border-light">
                {initials(c.name)}
              </span>
              <div className="flex flex-col gap-[1px] min-w-0 flex-1">
                <span className="text-[13px] font-medium">
                  {c.name}
                  {c.isPrimary && (
                    <span className="ml-[6px] font-mono text-[9.5px] uppercase tracking-[0.08em] text-ink-muted">
                      Primary
                    </span>
                  )}
                </span>
                {(c.role || c.email || c.phone) && (
                  <span className="text-[11.5px] text-ink-muted truncate">
                    {[c.role, c.email, c.phone].filter(Boolean).join(' · ')}
                  </span>
                )}
              </div>
              <button
                onClick={() => setEditingId(c.id)}
                className="border-none bg-transparent font-mono text-[10.5px] text-ink-muted hover:text-ink cursor-pointer p-0"
              >
                Edit
              </button>
              <button
                onClick={() => deleteContact.mutate(c.id)}
                disabled={deleteContact.isPending}
                className="border-none bg-transparent font-mono text-[10.5px] text-ink-muted hover:text-signal-red cursor-pointer p-0"
              >
                Remove
              </button>
            </div>
          ),
        )}
      </CardContent>
    </Card>
  )
}

export function AccountOverviewTab() {
  const { acc, accountId } = useAccountContext()
  const { data: currentMember } = useCurrentMember()
  const [showAddProject, setShowAddProject] = React.useState(false)
  const canDelete = currentMember?.role === 'admin' || currentMember?.role === 'manager'

  return (
    <div className="flex flex-col gap-4">
      <section className="grid gap-[10px]" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(168px, 1fr))' }}>
        <StatTile label="Engagement" value={acc.projects[0]?.name ?? 'Not set up'} />
        <StatTile label="Contacts" value={String(acc.contacts.length)} anchor="#contacts-card" />
        <StatTile
          label="Hours budget"
          value={acc.hoursBudget != null ? `${acc.hoursBudget}h / mo` : '—'}
        />
        <StatTile label="Retainer" value={formatMoney(acc.retainerCents, acc.currency)} />
      </section>

      <PerformanceTiles accountId={accountId} />

      {acc.projects.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Engagement</CardTitle>
          </CardHeader>
          <CardContent className="p-[16px_18px] flex flex-col gap-2">
            {showAddProject ? (
              <AddProjectForm accountId={accountId} acc={acc} onClose={() => setShowAddProject(false)} />
            ) : (
              <>
                <p className="m-0 text-[13px] text-ink-muted">
                  No engagement set up for this client yet — set one up to start tracking
                  keywords, backlinks and hours.
                </p>
                <Button className="self-start" onClick={() => setShowAddProject(true)}>
                  Set up engagement
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      ) : (
        (() => {
          const proj = acc.projects[0]
          return (
            <>
              <section className="flex flex-wrap items-center gap-x-4 gap-y-1">
                <span className="font-mono text-[11px] tracking-[0.14em] uppercase text-ink-muted">
                  {[
                    proj.projectType,
                    proj.billingCycle === 'monthly'
                      ? `renews ${proj.renewalDay ? `on the ${proj.renewalDay}` : 'monthly'}`
                      : 'one-time project',
                    proj.dueOn ? `due ${proj.dueOn}` : null,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </span>
                {proj.stage && (
                  <Badge tone={STAGE_TONE[proj.stage] ?? 'neutral'}>
                    {STAGE_LABEL[proj.stage] ?? proj.stage}
                  </Badge>
                )}
              </section>

              <section className="flex flex-wrap gap-3 items-start">
                <div className="flex-[1_1_320px] min-w-0">
                  <AssignedTeamCard projectId={proj.id} team={proj.team} />
                </div>
                <div className="flex-[1_1_320px] min-w-0">
                  <Card>
                    <CardHeader>
                      <CardTitle>Log hours</CardTitle>
                      <ProjectHoursSummary projectId={proj.id} />
                    </CardHeader>
                    <CardContent className="p-[16px_18px]">
                      <ProjectHoursPanel projectId={proj.id} staffed={proj.staffed} />
                    </CardContent>
                  </Card>
                </div>
              </section>

              <section className="flex flex-wrap gap-3 items-start">
                <div className="flex-[1_1_420px] min-w-0">
                  <TrafficGoalCard
                    projectId={proj.id}
                    accountId={accountId}
                    trafficGoalClicks={proj.trafficGoalClicks}
                    conversionsGoal={proj.conversionsGoal}
                  />
                </div>
                <div className="flex-[1_1_280px] max-w-[340px]">
                  <CustomGoalsCard projectId={proj.id} />
                </div>
              </section>
            </>
          )
        })()
      )}

      <section className="flex flex-wrap gap-3 items-start">
        <div className="flex-[1_1_420px] min-w-0 flex flex-col gap-3">
          <Card>
            <CardHeader>
              <CardTitle>Activity</CardTitle>
            </CardHeader>
            <CardContent className="p-[16px_18px] flex flex-col gap-3">
              {acc.activities.length === 0 && (
                <p className="m-0 text-[13px] text-ink-muted">No activity logged yet.</p>
              )}
              {acc.activities.map((a) => (
                <div key={a.id} className="flex gap-[11px] items-start">
                  <span
                    className="w-[7px] h-[7px] rounded-full mt-[6px] flex-none"
                    style={{ background: ACTIVITY_DOT[a.kind] }}
                  />
                  <div className="flex flex-col gap-[1px] min-w-0">
                    <span className="text-[13px] leading-[1.45]">{a.body}</span>
                    <span className="font-mono text-[10.5px] text-ink-muted">
                      {new Date(a.occurredAt).toLocaleDateString()}
                      {a.authorName ? ` · ${a.authorName}` : ''}
                    </span>
                  </div>
                </div>
              ))}
              <LogActivityForm accountId={accountId} />
            </CardContent>
          </Card>
        </div>

        <div className="flex-[1_1_280px] max-w-[340px] flex flex-col gap-3">
          <Card>
            <CardHeader>
              <CardTitle>Contract</CardTitle>
            </CardHeader>
            <CardContent className="p-[16px_18px] flex flex-col gap-3">
              {[
                ['Retainer', formatMoney(acc.retainerCents, acc.currency)],
                ['Client since', acc.startedOn ?? '—'],
                ['Renewal', acc.renewalOn ?? '—'],
                ['Account manager', acc.accountManagerName ?? '—'],
                ['Hours budget', acc.hoursBudget != null ? `${acc.hoursBudget}h / mo` : '—'],
              ].map(([label, value]) => (
                <div key={label} className="flex items-baseline justify-between gap-3">
                  <span className="font-mono text-[10.5px] uppercase tracking-[0.08em] text-ink-muted">
                    {label}
                  </span>
                  <span className="text-[13px] font-medium">{value}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          <div id="contacts-card" className="scroll-mt-4">
            <ContactsCard accountId={accountId} contacts={acc.contacts} />
          </div>
        </div>
      </section>

      <section className="flex flex-wrap gap-3 items-start">
        <div className="flex-[1_1_360px] min-w-0">
          <DeliverablesCard accountId={accountId} />
        </div>
        <div className="flex-[1_1_360px] min-w-0">
          <PortalCommentsThread accountId={accountId} canModerate />
        </div>
        {canDelete && (
          <div className="flex-[1_1_360px] min-w-0">
            <ChurnRiskCard accountId={accountId} />
          </div>
        )}
        <div className="flex-[1_1_360px] min-w-0">
          <TechnicalAuditCard accountId={accountId} website={acc.website} />
        </div>
        {currentMember?.role === 'admin' && (
          <div className="flex-[1_1_360px] min-w-0">
            <PortalUsersCard accountId={accountId} />
          </div>
        )}
      </section>
    </div>
  )
}
