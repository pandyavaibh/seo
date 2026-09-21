import { useQuery } from '@tanstack/react-query'

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
