import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

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

function slugify(name: string) {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  const suffix = Math.random().toString(16).slice(2, 6)
  return `${base || 'project'}-${suffix}`
}

export interface NewProjectInput {
  name: string
  projectType: string
  dueOn: string
  weeklyHours: string
}

export function useCreateProject(accountId: string, accountName: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: NewProjectInput) => {
      const { data, error } = await supabase
        .from('projects')
        .insert({
          id: slugify(input.name),
          name: input.name.trim(),
          account_id: accountId,
          client_name: accountName,
          status: 'active',
          project_type: input.projectType || null,
          due_on: input.dueOn || null,
          weekly_hours: input.weeklyHours ? Number(input.weeklyHours) : null,
        })
        .select('id')
        .single()
      if (error) throw new Error(error.message)
      return data.id as string
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      queryClient.invalidateQueries({ queryKey: ['account', accountId] })
    },
  })
}
