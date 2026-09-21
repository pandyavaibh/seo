import type { PillTone } from '@/components/ui/badge'

export const STAGE_TONE: Record<string, PillTone> = {
  discovery: 'blue',
  in_progress: 'green',
  client_review: 'amber',
  shipped: 'neutral',
}
export const STAGE_LABEL: Record<string, string> = {
  discovery: 'Discovery',
  in_progress: 'In progress',
  client_review: 'Client review',
  shipped: 'Shipped',
}
