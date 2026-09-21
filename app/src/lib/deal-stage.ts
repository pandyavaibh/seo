import type { PillTone } from '@/components/ui/badge'
import type { DealStage } from '@/lib/database.types'

export const DEAL_STAGE_TONE: Record<DealStage, PillTone> = {
  enquiry: 'neutral',
  qualified: 'blue',
  proposal: 'amber',
  negotiation: 'amber',
  won: 'green',
  lost: 'red',
}
export const DEAL_STAGE_LABEL: Record<DealStage, string> = {
  enquiry: 'Enquiry',
  qualified: 'Qualified',
  proposal: 'Proposal',
  negotiation: 'Negotiation',
  won: 'Won',
  lost: 'Lost',
}
export const DEAL_STAGES: DealStage[] = [
  'enquiry',
  'qualified',
  'proposal',
  'negotiation',
  'won',
  'lost',
]
