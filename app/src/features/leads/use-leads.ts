import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { supabase } from '@/lib/supabase'

export type LeadStatus = 'new' | 'converted' | 'spam' | 'archived'

export interface LeadRow {
  id: string
  name: string
  email: string
  phone: string | null
  company: string | null
  message: string | null
  source: string
  status: LeadStatus
  createdAt: string
}

export function useLeads() {
  return useQuery({
    queryKey: ['leads'],
    queryFn: async (): Promise<LeadRow[]> => {
      const { data, error } = await supabase
        .from('leads')
        .select('id, name, email, phone, company, message, source, status, created_at')
        .order('created_at', { ascending: false })
      if (error) throw new Error(error.message)
      return (data ?? []).map((r) => ({
        id: r.id,
        name: r.name,
        email: r.email,
        phone: r.phone,
        company: r.company,
        message: r.message,
        source: r.source,
        status: r.status as LeadStatus,
        createdAt: r.created_at,
      }))
    },
  })
}

export function useSetLeadStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: { id: string; status: LeadStatus }) => {
      const { error } = await supabase.from('leads').update({ status: input.status }).eq('id', input.id)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] })
    },
  })
}

export function useConvertLead() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (lead: LeadRow) => {
      const { error } = await supabase.from('leads').update({ status: 'converted' }).eq('id', lead.id)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] })
    },
  })
}
