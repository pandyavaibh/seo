import { useMutation } from '@tanstack/react-query'

import { supabase } from '@/lib/supabase'

export interface LeadFormInput {
  name: string
  email: string
  phone: string
  company: string
  message: string
  website_url: string // honeypot — real visitors never see or fill this
}

export function useSubmitLead() {
  return useMutation({
    mutationFn: async (input: LeadFormInput) => {
      const { data, error } = await supabase.functions.invoke('submit-lead', { body: input })
      if (error) throw new Error(error.message)
      if (data?.error) throw new Error(data.error)
      return data
    },
  })
}
