import { createClient } from '@supabase/supabase-js'

import type { Database } from '@/lib/database.types'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !anonKey) {
  // Fails loudly at startup rather than making every query silently 401 —
  // exactly the kind of silent failure Stage 0.4 exists to prevent.
  throw new Error(
    'Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY. Copy .env.example to .env.local and fill in a real project (see docs/STAGE_0.md).',
  )
}

export const supabase = createClient<Database>(url, anonKey)
