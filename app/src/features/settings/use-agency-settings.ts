import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { supabase } from '@/lib/supabase'

export interface AgencySettings {
  id: string
  agencyName: string
  logoUrl: string | null
  primaryColor: string
}

export function useAgencySettings() {
  return useQuery({
    queryKey: ['agency-settings'],
    queryFn: async (): Promise<AgencySettings | null> => {
      const { data, error } = await supabase
        .from('agency_settings')
        .select('id, agency_name, logo_url, primary_color')
        .limit(1)
        .maybeSingle()
      if (error) throw new Error(error.message)
      if (!data) return null
      return {
        id: data.id,
        agencyName: data.agency_name,
        logoUrl: data.logo_url,
        primaryColor: data.primary_color,
      }
    },
    staleTime: 5 * 60 * 1000,
  })
}

export function useUpdateAgencySettings() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: { id: string; agencyName: string; logoUrl: string | null; primaryColor: string }) => {
      const { error } = await supabase
        .from('agency_settings')
        .update({
          agency_name: input.agencyName.trim(),
          logo_url: input.logoUrl?.trim() || null,
          primary_color: input.primaryColor,
          updated_at: new Date().toISOString(),
        })
        .eq('id', input.id)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agency-settings'] })
    },
  })
}
