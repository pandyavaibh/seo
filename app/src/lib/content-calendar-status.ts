import type { PillTone } from '@/components/ui/badge'
import type { ContentCalendarStatus } from '@/lib/database.types'

export const CALENDAR_STATUS_TONE: Record<ContentCalendarStatus, PillTone> = {
  draft: 'neutral',
  scheduled: 'blue',
  approved: 'amber',
  published: 'green',
}
export const CALENDAR_STATUS_LABEL: Record<ContentCalendarStatus, string> = {
  draft: 'Draft',
  scheduled: 'Scheduled',
  approved: 'Approved',
  published: 'Published',
}
export const CALENDAR_STATUSES: ContentCalendarStatus[] = ['draft', 'scheduled', 'approved', 'published']
