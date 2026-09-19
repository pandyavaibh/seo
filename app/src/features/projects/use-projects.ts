import { useQuery } from '@tanstack/react-query'

import { supabase } from '@/lib/supabase'

export interface ProjectListItem {
  id: string
  name: string
  clientName: string | null
  status: string
  linkTarget: number
  staffed: { id: string; name: string }[]
}

export function useProjects() {
  return useQuery({
    queryKey: ['projects'],
    queryFn: async (): Promise<ProjectListItem[]> => {
      const { data, error } = await supabase
        .from('projects')
        .select(
          'id, name, client_name, status, link_target, assignments(member_id, team_members(id, name))',
        )
        .order('name')

      // Thrown, not swallowed into `?? []` — the old `res.data || []`
      // pattern this project starts from is exactly the Stage 0.4 bug:
      // a revoked RLS policy and an empty table rendered identically.
      // TanStack Query turns this throw into a real error state instead.
      if (error) throw new Error(error.message)

      return (data ?? []).map((row) => ({
        id: row.id,
        name: row.name,
        clientName: row.client_name,
        status: row.status,
        linkTarget: row.link_target,
        staffed: (row.assignments ?? [])
          .map((a) => a.team_members)
          .filter((m): m is { id: string; name: string } => m != null),
      }))
    },
  })
}
