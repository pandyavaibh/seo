import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, ChevronsUpDown } from 'lucide-react'
import * as React from 'react'
import { Outlet, useNavigate, useParams } from 'react-router-dom'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge, type PillTone } from '@/components/ui/badge'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { NestedNav, type NavEntry } from '@/components/ui/nested-nav'
import { Skeleton } from '@/components/ui/skeleton'
import {
  useAccount,
  useTeamMembers,
  useUpdateAccount,
  type AccountDetail,
} from '@/features/accounts/use-account'
import { useDeleteAccount } from '@/features/accounts/use-accounts'
import { useCurrentMember } from '@/features/team/use-current-member'
import type { AccountHealth } from '@/lib/database.types'
import { supabase } from '@/lib/supabase'

export const HEALTH_TONE: Record<AccountHealth, PillTone> = {
  healthy: 'green',
  watch: 'amber',
  at_risk: 'red',
}
export const HEALTH_LABEL: Record<AccountHealth, string> = {
  healthy: 'Healthy',
  watch: 'Watch',
  at_risk: 'At risk',
}

export interface AccountTabContext {
  acc: AccountDetail
  accountId: string
}

// Just the roster for the switcher dropdown below — reads through the same
// safe, any-staff-readable function the Clients list already uses.
function useAccountSwitcherOptions() {
  return useQuery({
    queryKey: ['accounts-directory', 'switcher'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('list_accounts_directory')
      if (error) throw new Error(error.message)
      return (data ?? [])
        .map((a) => ({ id: a.id, name: a.name }))
        .sort((a, b) => a.name.localeCompare(b.name))
    },
  })
}

function AccountSwitcher({ accountId, accountName }: { accountId: string; accountName: string }) {
  const navigate = useNavigate()
  const { data: options } = useAccountSwitcherOptions()

  return (
    <div className="relative">
      <select
        value={accountId}
        onChange={(e) => navigate(`/clients/${e.target.value}`)}
        className="w-full appearance-none text-[13px] font-semibold rounded-[9px] border border-border bg-surface py-[8px] pl-[10px] pr-[28px] truncate cursor-pointer"
      >
        {!options && <option value={accountId}>{accountName}</option>}
        {(options ?? []).map((o) => (
          <option key={o.id} value={o.id}>
            {o.name}
          </option>
        ))}
      </select>
      <ChevronsUpDown size={13} className="absolute right-[9px] top-1/2 -translate-y-1/2 text-ink-faint pointer-events-none" />
    </div>
  )
}

function EditAccountForm({
  accountId,
  acc,
  onClose,
}: {
  accountId: string
  acc: AccountDetail
  onClose: () => void
}) {
  const updateAccount = useUpdateAccount(accountId)
  const { data: teamMembers } = useTeamMembers()
  const [name, setName] = React.useState(acc.name)
  const [website, setWebsite] = React.useState(acc.website ?? '')
  const [industry, setIndustry] = React.useState(acc.industry ?? '')
  const [health, setHealth] = React.useState<AccountHealth>(acc.health)
  const [retainerDollars, setRetainerDollars] = React.useState(
    acc.retainerCents != null ? String(acc.retainerCents / 100) : '',
  )
  const [hoursBudget, setHoursBudget] = React.useState(
    acc.hoursBudget != null ? String(acc.hoursBudget) : '',
  )
  const [startedOn, setStartedOn] = React.useState(acc.startedOn ?? '')
  const [renewalOn, setRenewalOn] = React.useState(acc.renewalOn ?? '')
  const [accountManagerId, setAccountManagerId] = React.useState(
    acc.accountManagerId ?? '',
  )
  const [notes, setNotes] = React.useState(acc.notes ?? '')

  const fieldClass =
    'text-[13px] rounded-[8px] border border-border px-3 py-2 bg-surface w-full'

  return (
    <Card>
      <CardHeader>
        <CardTitle>Edit client</CardTitle>
      </CardHeader>
      <CardContent className="p-[16px_18px] flex flex-col gap-3">
        <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
          <label className="flex flex-col gap-1">
            <span className="font-mono text-[10px] tracking-[0.1em] uppercase text-ink-muted">Name *</span>
            <input value={name} onChange={(e) => setName(e.target.value)} className={fieldClass} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="font-mono text-[10px] tracking-[0.1em] uppercase text-ink-muted">Website</span>
            <input value={website} onChange={(e) => setWebsite(e.target.value)} className={fieldClass} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="font-mono text-[10px] tracking-[0.1em] uppercase text-ink-muted">Industry</span>
            <input value={industry} onChange={(e) => setIndustry(e.target.value)} className={fieldClass} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="font-mono text-[10px] tracking-[0.1em] uppercase text-ink-muted">Health</span>
            <select
              value={health}
              onChange={(e) => setHealth(e.target.value as AccountHealth)}
              className={fieldClass}
            >
              <option value="healthy">Healthy</option>
              <option value="watch">Watch</option>
              <option value="at_risk">At risk</option>
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="font-mono text-[10px] tracking-[0.1em] uppercase text-ink-muted">Retainer ($/mo)</span>
            <input
              value={retainerDollars}
              onChange={(e) => setRetainerDollars(e.target.value)}
              inputMode="decimal"
              className={fieldClass}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="font-mono text-[10px] tracking-[0.1em] uppercase text-ink-muted">Hours budget / mo</span>
            <input
              value={hoursBudget}
              onChange={(e) => setHoursBudget(e.target.value)}
              inputMode="decimal"
              className={fieldClass}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="font-mono text-[10px] tracking-[0.1em] uppercase text-ink-muted">Client since</span>
            <input type="date" value={startedOn} onChange={(e) => setStartedOn(e.target.value)} className={fieldClass} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="font-mono text-[10px] tracking-[0.1em] uppercase text-ink-muted">Renewal date</span>
            <input type="date" value={renewalOn} onChange={(e) => setRenewalOn(e.target.value)} className={fieldClass} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="font-mono text-[10px] tracking-[0.1em] uppercase text-ink-muted">Account manager</span>
            <select
              value={accountManagerId}
              onChange={(e) => setAccountManagerId(e.target.value)}
              className={fieldClass}
            >
              <option value="">—</option>
              {(teamMembers ?? []).map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className="flex flex-col gap-1">
          <span className="font-mono text-[10px] tracking-[0.1em] uppercase text-ink-muted">Notes</span>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="text-[13px] rounded-[8px] border border-border px-3 py-2 bg-surface w-full resize-none"
          />
        </label>
        {updateAccount.isError && (
          <p className="m-0 text-[12px] text-signal-red">
            {updateAccount.error instanceof Error ? updateAccount.error.message : 'Failed to save'}
          </p>
        )}
        <div className="flex items-center gap-2">
          <Button
            disabled={!name.trim() || updateAccount.isPending}
            onClick={() =>
              updateAccount.mutate(
                {
                  name,
                  website,
                  industry,
                  health,
                  retainerDollars,
                  hoursBudget,
                  startedOn,
                  renewalOn,
                  accountManagerId,
                  notes,
                },
                { onSuccess: onClose },
              )
            }
          >
            {updateAccount.isPending ? 'Saving…' : 'Save changes'}
          </Button>
          <Button variant="secondary" onClick={onClose} disabled={updateAccount.isPending}>
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function DeleteAccountConfirm({
  accountId,
  accountName,
  onCancel,
}: {
  accountId: string
  accountName: string
  onCancel: () => void
}) {
  const navigate = useNavigate()
  const deleteAccount = useDeleteAccount()

  return (
    <div className="w-full bg-pill-red-bg border border-signal-red rounded-[10px] p-[14px_16px] flex flex-wrap items-center gap-3">
      <p className="m-0 text-[13px] text-pill-red-fg flex-1 min-w-[240px]">
        Permanently delete <strong>{accountName}</strong>? This removes every
        engagement, contact, deal, invoice and report tied to this client —
        there's no undo.
      </p>
      <div className="flex items-center gap-2">
        <Button
          disabled={deleteAccount.isPending}
          onClick={() =>
            deleteAccount.mutate(accountId, {
              onSuccess: () => navigate('/clients'),
            })
          }
          className="!bg-signal-red !border-signal-red hover:!bg-[#8E3C10]"
        >
          {deleteAccount.isPending ? 'Deleting…' : 'Yes, delete permanently'}
        </Button>
        <Button variant="secondary" onClick={onCancel} disabled={deleteAccount.isPending}>
          Cancel
        </Button>
      </div>
      {deleteAccount.isError && (
        <p className="m-0 w-full text-[12px] text-signal-red">
          {deleteAccount.error instanceof Error ? deleteAccount.error.message : 'Failed to delete'}
        </p>
      )}
    </div>
  )
}

export function AccountTabsLayout() {
  const { accountId } = useParams<{ accountId: string }>()
  const { data: acc, isLoading, isError, error, refetch, isFetching } = useAccount(accountId)
  const { data: currentMember } = useCurrentMember()
  const [showEditAccount, setShowEditAccount] = React.useState(false)
  const [confirmingDelete, setConfirmingDelete] = React.useState(false)
  const canDelete = currentMember?.role === 'admin' || currentMember?.role === 'manager'

  if (isError) {
    return (
      <Alert variant="destructive">
        <AlertTitle className="flex items-center gap-2">
          <AlertTriangle size={14} /> Couldn't load this account
        </AlertTitle>
        <AlertDescription>
          {error instanceof Error ? error.message : 'Unknown error'}
        </AlertDescription>
        <div>
          <Button variant="secondary" size="sm" onClick={() => refetch()} disabled={isFetching}>
            {isFetching ? 'Retrying…' : 'Retry'}
          </Button>
        </div>
      </Alert>
    )
  }

  const navItems: NavEntry[] = accountId
    ? [
        { type: 'link', to: `/clients/${accountId}`, label: 'Overview', end: true },
        { type: 'link', to: `/clients/${accountId}/keywords`, label: 'Keywords' },
        { type: 'link', to: `/clients/${accountId}/activities`, label: 'Activities' },
        { type: 'link', to: `/clients/${accountId}/checklist`, label: 'Checklist' },
        {
          type: 'group',
          label: 'Analytics & Reporting',
          items: [
            { to: `/clients/${accountId}/search`, label: 'Search & Analytics' },
            { to: `/clients/${accountId}/calendar`, label: 'Content calendar' },
            { to: `/clients/${accountId}/reports`, label: 'Reports' },
          ],
        },
        ...(canDelete
          ? [{ type: 'link' as const, to: `/clients/${accountId}/billing`, label: 'Billing' }]
          : []),
      ]
    : []

  return (
    <div className="flex flex-col gap-4">
      <Breadcrumb
        items={[{ label: 'Clients', to: '/clients' }, { label: acc?.name ?? 'Loading…' }]}
      />

      {isLoading && (
        <div className="flex flex-col gap-4">
          <Skeleton className="h-[60px] w-full" />
          <Skeleton className="h-[120px] w-full" />
        </div>
      )}

      {!isLoading && acc && accountId && (
        <div className="flex gap-4 items-start">
          <aside className="w-[200px] flex-none flex flex-col gap-3 bg-surface border border-border rounded-[14px] p-[12px] shadow-[var(--shadow-sm)] sticky top-[22px]">
            <AccountSwitcher accountId={accountId} accountName={acc.name} />
            <Badge tone={HEALTH_TONE[acc.health]} className="self-start">
              {HEALTH_LABEL[acc.health]}
            </Badge>
            <NestedNav items={navItems} />
          </aside>

          <div className="flex-1 min-w-0 flex flex-col gap-4">
            <div className="flex flex-wrap gap-3 items-end justify-between">
              <div className="flex flex-col gap-1">
                <span className="font-mono text-[11px] tracking-[0.14em] uppercase text-ink-muted">
                  {[acc.industry, acc.website].filter(Boolean).join(' · ') || '—'}
                </span>
                <h1 className="m-0 text-[25px] font-semibold tracking-[-0.02em]">{acc.name}</h1>
              </div>
              {canDelete && (
                <div className="flex items-center gap-2">
                  {!showEditAccount && (
                    <Button variant="secondary" onClick={() => setShowEditAccount(true)}>
                      Edit client
                    </Button>
                  )}
                  {!confirmingDelete && (
                    <Button variant="secondary" onClick={() => setConfirmingDelete(true)}>
                      Delete client
                    </Button>
                  )}
                </div>
              )}
            </div>

            {confirmingDelete && (
              <DeleteAccountConfirm
                accountId={accountId}
                accountName={acc.name}
                onCancel={() => setConfirmingDelete(false)}
              />
            )}

            {showEditAccount && (
              <EditAccountForm accountId={accountId} acc={acc} onClose={() => setShowEditAccount(false)} />
            )}

            <Outlet context={{ acc, accountId } satisfies AccountTabContext} />
          </div>
        </div>
      )}
    </div>
  )
}
