import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import type { AccountHealth, ActivityKind } from '@/lib/database.types'
import { supabase } from '@/lib/supabase'

export interface AccountDetail {
  id: string
  name: string
  website: string | null
  industry: string | null
  health: AccountHealth
  retainerCents: number | null
  currency: string
  hoursBudget: number | null
  startedOn: string | null
  renewalOn: string | null
  accountManagerId: string | null
  accountManagerName: string | null
  notes: string | null
  projects: {
    id: string
    name: string
    projectType: string | null
    stage: string | null
    dueOn: string | null
    staffed: { id: string; name: string }[]
  }[]
  contacts: {
    id: string
    name: string
    role: string | null
    email: string | null
    phone: string | null
    isPrimary: boolean
  }[]
  activities: {
    id: string
    kind: ActivityKind
    body: string
    occurredAt: string
    authorName: string | null
  }[]
}

export function useAccount(accountId: string | undefined) {
  return useQuery({
    queryKey: ['account', accountId],
    queryFn: async (): Promise<AccountDetail> => {
      const [accountRes, projectsRes, contactsRes, activitiesRes] =
        await Promise.all([
          supabase
            .from('accounts')
            .select(
              'id, name, website, industry, health, retainer_cents, currency, hours_budget, started_on, renewal_on, account_manager_id, notes, team_members!accounts_account_manager_id_fkey(name)',
            )
            .eq('id', accountId!)
            .single(),
          supabase
            .from('projects')
            .select(
              'id, name, project_type, stage, due_on, assignments(member_id, team_members(id, name))',
            )
            .eq('account_id', accountId!),
          supabase
            .from('contacts')
            .select('id, name, role, email, phone, is_primary')
            .eq('account_id', accountId!)
            .order('is_primary', { ascending: false }),
          supabase
            .from('activities')
            .select('id, kind, body, occurred_at, team_members(name)')
            .eq('account_id', accountId!)
            .order('occurred_at', { ascending: false })
            .limit(20),
        ])

      if (accountRes.error) throw new Error(accountRes.error.message)
      if (projectsRes.error) throw new Error(projectsRes.error.message)
      if (contactsRes.error) throw new Error(contactsRes.error.message)
      if (activitiesRes.error) throw new Error(activitiesRes.error.message)

      const acc = accountRes.data

      return {
        id: acc.id,
        name: acc.name,
        website: acc.website,
        industry: acc.industry,
        health: acc.health,
        retainerCents: acc.retainer_cents,
        currency: acc.currency,
        hoursBudget: acc.hours_budget,
        startedOn: acc.started_on,
        renewalOn: acc.renewal_on,
        accountManagerId: acc.account_manager_id,
        accountManagerName: acc.team_members?.name ?? null,
        notes: acc.notes,
        projects: (projectsRes.data ?? []).map((p) => ({
          id: p.id,
          name: p.name,
          projectType: p.project_type,
          stage: p.stage,
          dueOn: p.due_on,
          staffed: (p.assignments ?? [])
            .map((a) => a.team_members)
            .filter((m): m is { id: string; name: string } => m != null),
        })),
        contacts: (contactsRes.data ?? []).map((c) => ({
          id: c.id,
          name: c.name,
          role: c.role,
          email: c.email,
          phone: c.phone,
          isPrimary: c.is_primary,
        })),
        activities: (activitiesRes.data ?? []).map((a) => ({
          id: a.id,
          kind: a.kind,
          body: a.body,
          occurredAt: a.occurred_at,
          authorName: a.team_members?.name ?? null,
        })),
      }
    },
    enabled: !!accountId,
  })
}

export interface TeamMemberOption {
  id: string
  name: string
}

export function useTeamMembers() {
  return useQuery({
    queryKey: ['team-members', 'options'],
    queryFn: async (): Promise<TeamMemberOption[]> => {
      const { data, error } = await supabase
        .from('team_members')
        .select('id, name')
        .eq('active', true)
        .order('name')
      if (error) throw new Error(error.message)
      return data ?? []
    },
  })
}

export interface AccountEditInput {
  name: string
  website: string
  industry: string
  health: AccountHealth
  retainerDollars: string
  hoursBudget: string
  startedOn: string
  renewalOn: string
  accountManagerId: string
  notes: string
}

export function useUpdateAccount(accountId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: AccountEditInput) => {
      const { error } = await supabase
        .from('accounts')
        .update({
          name: input.name.trim(),
          website: input.website.trim() || null,
          industry: input.industry.trim() || null,
          health: input.health,
          retainer_cents: input.retainerDollars
            ? Math.round(Number(input.retainerDollars) * 100)
            : null,
          hours_budget: input.hoursBudget ? Number(input.hoursBudget) : null,
          started_on: input.startedOn || null,
          renewal_on: input.renewalOn || null,
          account_manager_id: input.accountManagerId || null,
          notes: input.notes.trim() || null,
        })
        .eq('id', accountId)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['account', accountId] })
      queryClient.invalidateQueries({ queryKey: ['accounts'] })
    },
  })
}

export interface ContactInput {
  name: string
  role: string
  email: string
  phone: string
  isPrimary: boolean
}

export function useAddContact(accountId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: ContactInput) => {
      const { error } = await supabase.from('contacts').insert({
        account_id: accountId,
        name: input.name.trim(),
        role: input.role.trim() || null,
        email: input.email.trim() || null,
        phone: input.phone.trim() || null,
        is_primary: input.isPrimary,
      })
      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['account', accountId] })
    },
  })
}

export function useUpdateContact(accountId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: ContactInput & { id: string }) => {
      const { error } = await supabase
        .from('contacts')
        .update({
          name: input.name.trim(),
          role: input.role.trim() || null,
          email: input.email.trim() || null,
          phone: input.phone.trim() || null,
          is_primary: input.isPrimary,
        })
        .eq('id', input.id)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['account', accountId] })
    },
  })
}

export function useDeleteContact(accountId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (contactId: string) => {
      const { error } = await supabase.from('contacts').delete().eq('id', contactId)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['account', accountId] })
    },
  })
}

export interface PortalUser {
  id: string
  email: string
  name: string
  active: boolean
}

export function usePortalUsers(accountId: string | undefined) {
  return useQuery({
    queryKey: ['portal-users', accountId],
    queryFn: async (): Promise<PortalUser[]> => {
      const { data, error } = await supabase
        .from('team_members')
        .select('id, email, name, active')
        .eq('account_id', accountId!)
        .eq('role', 'client')
        .order('name')
      if (error) throw new Error(error.message)
      return data ?? []
    },
    enabled: !!accountId,
  })
}

// Grants portal access: a team_members row with role='client', scoped
// to this account via account_id. The person signs in the same way
// every staff member does (Google OAuth) — being a row here with this
// role and account_id is what makes them a client instead of staff,
// enforced entirely by RLS (see 20260921240000_stage7_billing_portal_reports.sql).
export function useAddPortalUser(accountId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: { email: string; name: string }) => {
      const { error } = await supabase.from('team_members').insert({
        email: input.email.trim().toLowerCase(),
        name: input.name.trim(),
        role: 'client',
        account_id: accountId,
      })
      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portal-users', accountId] })
    },
  })
}

export function useRemovePortalUser(accountId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('team_members').delete().eq('id', id)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portal-users', accountId] })
    },
  })
}
