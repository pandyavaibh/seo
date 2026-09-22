import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import type { MemberRole } from '@/lib/database.types'
import { supabase } from '@/lib/supabase'

export interface StaffRow {
  id: string
  name: string
  email: string
  role: MemberRole
}

// Staff roster (admin/manager/member) — distinct from useTeamMembers()
// in use-account.ts, which only returns active staff names for pickers.
// This also surfaces email + role and is used by the add/remove admin
// panel, so it deliberately excludes role='client' portal users (those
// are managed from the Account record's own invite flow instead).
export function useStaffRoster() {
  return useQuery({
    queryKey: ['staff-roster'],
    queryFn: async (): Promise<StaffRow[]> => {
      const { data, error } = await supabase
        .from('team_members')
        .select('id, name, email, role')
        .neq('role', 'client')
        .eq('active', true)
        .order('name')
      if (error) throw new Error(error.message)
      return data ?? []
    },
  })
}

export function useAddStaffMember() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: { name: string; email: string; role: MemberRole }) => {
      const { error } = await supabase.from('team_members').insert({
        name: input.name.trim(),
        email: input.email.trim().toLowerCase(),
        role: input.role,
      })
      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-roster'] })
      queryClient.invalidateQueries({ queryKey: ['team-members', 'options'] })
    },
  })
}

export function useRemoveStaffMember() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('team_members').delete().eq('id', id)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-roster'] })
      queryClient.invalidateQueries({ queryKey: ['team-members', 'options'] })
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      queryClient.invalidateQueries({ queryKey: ['accounts'] })
    },
  })
}

export function useDeleteProjectQuick() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (projectId: string) => {
      const { error } = await supabase.from('projects').delete().eq('id', projectId)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      queryClient.invalidateQueries({ queryKey: ['accounts'] })
    },
  })
}

export function useCreateBareProject() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (name: string) => {
      const base = name
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
      const id = `${base || 'project'}-${Math.random().toString(16).slice(2, 6)}`
      const { error } = await supabase.from('projects').insert({ id, name: name.trim(), status: 'active' })
      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
    },
  })
}
