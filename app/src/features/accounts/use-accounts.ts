import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import type { AccountHealth } from '@/lib/database.types'
import { supabase } from '@/lib/supabase'

export interface AccountListItem {
  id: string
  name: string
  website: string | null
  health: AccountHealth
  renewalOn: string | null
  engagementCount: number
  staffed: { id: string; name: string }[]
}

export function useAccounts() {
  return useQuery({
    queryKey: ['accounts'],
    queryFn: async (): Promise<AccountListItem[]> => {
      const [accountsRes, projectsRes] = await Promise.all([
        supabase
          .from('accounts')
          .select('id, name, website, health, renewal_on')
          .order('name'),
        supabase
          .from('projects')
          .select(
            'id, account_id, assignments(member_id, team_members(id, name))',
          )
          .not('account_id', 'is', null),
      ])

      if (accountsRes.error) throw new Error(accountsRes.error.message)
      if (projectsRes.error) throw new Error(projectsRes.error.message)

      const projectsByAccount = new Map<
        string,
        { count: number; staffed: Map<string, string> }
      >()
      for (const p of projectsRes.data ?? []) {
        if (!p.account_id) continue
        const entry = projectsByAccount.get(p.account_id) ?? {
          count: 0,
          staffed: new Map<string, string>(),
        }
        entry.count += 1
        for (const a of p.assignments ?? []) {
          if (a.team_members) entry.staffed.set(a.team_members.id, a.team_members.name)
        }
        projectsByAccount.set(p.account_id, entry)
      }

      return (accountsRes.data ?? []).map((a) => {
        const linked = projectsByAccount.get(a.id)
        return {
          id: a.id,
          name: a.name,
          website: a.website,
          health: a.health,
          renewalOn: a.renewal_on,
          engagementCount: linked?.count ?? 0,
          staffed: linked
            ? Array.from(linked.staffed, ([id, name]) => ({ id, name }))
            : [],
        }
      })
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
