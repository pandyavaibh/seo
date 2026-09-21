import { useQuery } from '@tanstack/react-query'

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
  contacts: { id: string; name: string; role: string | null }[]
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
              'id, name, website, industry, health, retainer_cents, currency, hours_budget, started_on, renewal_on, notes, team_members(name)',
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
            .select('id, name, role')
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
        contacts: contactsRes.data ?? [],
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
