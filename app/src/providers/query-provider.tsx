import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import * as React from 'react'

// Centralised query defaults. This is the structural fix for Stage 0.4:
// TanStack Query gives every read a real loading/error state and one
// automatic retry instead of the legacy app's `res.data || []` pattern,
// which made a permission failure look identical to an empty table.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
})

export function QueryProvider({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}
