import { useQuery } from '@tanstack/react-query'

import { supabase } from '@/lib/supabase'

// A plain {id, name} roster for dropdowns — reads through the same safe,
// any-staff-readable function the Clients list already uses.
export function useAccountOptions() {
  return useQuery({
    queryKey: ['accounts-directory', 'options'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('list_accounts_directory')
      if (error) throw new Error(error.message)
      return (data ?? [])
        .map((a) => ({ id: a.id, name: a.name }))
        .sort((a, b) => a.name.localeCompare(b.name))
    },
  })
}
