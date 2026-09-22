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
  convertedDealId: string | null
  createdAt: string
}

export function useLeads() {
  return useQuery({
    queryKey: ['leads'],
    queryFn: async (): Promise<LeadRow[]> => {
      const { data, error } = await supabase
        .from('leads')
        .select('id, name, email, phone, company, message, source, status, converted_deal_id, created_at')
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
        convertedDealId: r.converted_deal_id,
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
      const { data: deal, error: dealError } = await supabase
        .from('deals')
        .insert({
          name: lead.company ? `${lead.company} — ${lead.name}` : lead.name,
          source: lead.source,
        })
        .select('id')
        .single()
      if (dealError) throw new Error(dealError.message)

      const { error: leadError } = await supabase
        .from('leads')
        .update({ status: 'converted', converted_deal_id: deal.id })
        .eq('id', lead.id)
      if (leadError) throw new Error(leadError.message)

      return deal.id as string
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] })
      queryClient.invalidateQueries({ queryKey: ['deals'] })
    },
  })
}
