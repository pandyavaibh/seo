import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import type { AccountHealth } from '@/lib/database.types'
import { supabase } from '@/lib/supabase'

// ---------------------------------------------------------------------
// Clients + Engagements, merged into one roster.
//
// The old Clients page read straight from `accounts` (admin/manager
// only). This one reads through list_accounts_directory() instead —
// a SECURITY DEFINER function open to every staff member, returning
// only non-financial columns (no retainer_cents/hours_budget/notes,
// which stay behind the unchanged admin/manager-only accounts_read
// policy on the Account record page and Billing). Engagements nest
// under their account; a member sees only the engagements they're
// assigned to (projects_read's existing scope), same as the old
// Engagements page — this just adds client context they didn't have
// before. Bare engagements (no account_id — internal/ops work) list
// separately, same as the old Engagements page showed them.
// ---------------------------------------------------------------------

export interface EngagementListItem {
  id: string
  name: string
  status: string
  linkTarget: number
  staffed: { id: string; name: string }[]
}

export interface ClientWithEngagements {
  id: string
  name: string
  website: string | null
  industry: string | null
  health: AccountHealth
  renewalOn: string | null
  engagements: EngagementListItem[]
}

export interface ClientsAndEngagements {
  clients: ClientWithEngagements[]
  unlinkedEngagements: EngagementListItem[]
}

export function useClientsAndEngagements() {
  return useQuery({
    queryKey: ['clients-and-engagements'],
    queryFn: async (): Promise<ClientsAndEngagements> => {
      const [directoryRes, projectsRes] = await Promise.all([
        supabase.rpc('list_accounts_directory'),
        supabase
          .from('projects')
          .select(
            'id, name, account_id, status, link_target, assignments(member_id, team_members(id, name))',
          )
          .order('name'),
      ])
      if (directoryRes.error) throw new Error(directoryRes.error.message)
      if (projectsRes.error) throw new Error(projectsRes.error.message)

      const toEngagement = (p: NonNullable<typeof projectsRes.data>[number]): EngagementListItem => ({
        id: p.id,
        name: p.name,
        status: p.status,
        linkTarget: p.link_target,
        staffed: (p.assignments ?? [])
          .map((a) => a.team_members)
          .filter((m): m is { id: string; name: string } => m != null),
      })

      const engagementsByAccount = new Map<string, EngagementListItem[]>()
      const unlinkedEngagements: EngagementListItem[] = []
      for (const p of projectsRes.data ?? []) {
        if (!p.account_id) {
          unlinkedEngagements.push(toEngagement(p))
          continue
        }
        const list = engagementsByAccount.get(p.account_id) ?? []
        list.push(toEngagement(p))
        engagementsByAccount.set(p.account_id, list)
      }

      const clients: ClientWithEngagements[] = (directoryRes.data ?? []).map((a) => ({
        id: a.id,
        name: a.name,
        website: a.website,
        industry: a.industry,
        health: a.health,
        renewalOn: a.renewal_on,
        engagements: engagementsByAccount.get(a.id) ?? [],
      }))

      return { clients, unlinkedEngagements }
    },
  })
}

export interface NewAccountInput {
  name: string
  website: string
  industry: string
  retainerDollars: string
  hoursBudget: string
  renewalOn: string
}

export function useDeleteAccount() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (accountId: string) => {
      const { error } = await supabase.from('accounts').delete().eq('id', accountId)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] })
      queryClient.invalidateQueries({ queryKey: ['projects'] })
    },
  })
}

export function useCreateAccount() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: NewAccountInput) => {
      const { data, error } = await supabase
        .from('accounts')
        .insert({
          name: input.name.trim(),
          website: input.website.trim() || null,
          industry: input.industry.trim() || null,
          retainer_cents: input.retainerDollars
            ? Math.round(Number(input.retainerDollars) * 100)
            : null,
          hours_budget: input.hoursBudget ? Number(input.hoursBudget) : null,
          renewal_on: input.renewalOn || null,
        })
        .select('id')
        .single()
      if (error) throw new Error(error.message)
      return data.id as string
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] })
    },
  })
}

// ---------------------------------------------------------------------
// Full onboarding: client info + its first engagement + team staffing,
// all in one submit — the shape a new client is actually onboarded in,
// rather than three separate trips (Add client, then New engagement on
// the account page, then Staff someone on the project page).
// ---------------------------------------------------------------------

function slugifyProjectId(name: string) {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  const suffix = Math.random().toString(16).slice(2, 6)
  return `${base || 'project'}-${suffix}`
}

export interface OnboardTeamRow {
  memberId: string
  weeklyHours: string
}

export interface OnboardClientInput {
  account: NewAccountInput
  project: {
    name: string
    projectType: string
    weeklyHours: string
    billingCycle: 'monthly' | 'one_time'
    renewalDay: string
    linkTarget: string
  } | null
  team: OnboardTeamRow[]
}

export function useOnboardClient() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: OnboardClientInput) => {
      const { data: account, error: accountError } = await supabase
        .from('accounts')
        .insert({
          name: input.account.name.trim(),
          website: input.account.website.trim() || null,
          industry: input.account.industry.trim() || null,
          retainer_cents: input.account.retainerDollars
            ? Math.round(Number(input.account.retainerDollars) * 100)
            : null,
          hours_budget: input.account.hoursBudget ? Number(input.account.hoursBudget) : null,
          renewal_on: input.account.renewalOn || null,
        })
        .select('id')
        .single()
      if (accountError) throw new Error(accountError.message)

      let projectId: string | null = null
      if (input.project && input.project.name.trim()) {
        const p = input.project
        const { data: project, error: projectError } = await supabase
          .from('projects')
          .insert({
            id: slugifyProjectId(p.name),
            name: p.name.trim(),
            account_id: account.id,
            client_name: input.account.name.trim(),
            status: 'active',
            project_type: p.projectType || null,
            weekly_hours: p.weeklyHours ? Number(p.weeklyHours) : null,
            billing_cycle: p.billingCycle,
            renewal_day: p.billingCycle === 'monthly' && p.renewalDay ? Number(p.renewalDay) : null,
            link_target: p.linkTarget ? Number(p.linkTarget) : 200,
          })
          .select('id')
          .single()
        if (projectError) throw new Error(projectError.message)
        const newProjectId = project.id as string
        projectId = newProjectId

        const rows = input.team.filter((t) => t.memberId && t.weeklyHours.trim())
        if (rows.length > 0) {
          const { error: assignError } = await supabase.from('assignments').insert(
            rows.map((t) => ({
              project_id: newProjectId,
              member_id: t.memberId,
              weekly_hours: Number(t.weeklyHours),
            })),
          )
          if (assignError) throw new Error(assignError.message)
        }
      }

      return { accountId: account.id as string, projectId }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] })
      queryClient.invalidateQueries({ queryKey: ['projects'] })
    },
  })
}
