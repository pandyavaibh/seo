import type { PillTone } from '@/components/ui/badge'
import type { BacklinkStatus } from '@/lib/database.types'

export const BACKLINK_STATUS_TONE: Record<BacklinkStatus, PillTone> = {
  prospect: 'neutral',
  outreach: 'blue',
  placed: 'green',
  declined: 'red',
  removed: 'amber',
}
export const BACKLINK_STATUS_LABEL: Record<BacklinkStatus, string> = {
  prospect: 'Prospect',
  outreach: 'Outreach',
  placed: 'Placed',
  declined: 'Declined',
  removed: 'Removed',
}
export const BACKLINK_STATUSES: BacklinkStatus[] = [
  'prospect',
  'outreach',
  'placed',
  'declined',
  'removed',
]
