import type { PillTone } from '@/components/ui/badge'
import type { ChecklistPriority, ChecklistStatus } from '@/lib/database.types'

export const CHECKLIST_STATUS_LABEL: Record<ChecklistStatus, string> = {
  to_do: 'To Do',
  in_progress: 'In Progress',
  done: 'Done',
  na: 'N/A',
}
export const CHECKLIST_STATUSES: ChecklistStatus[] = ['to_do', 'in_progress', 'done', 'na']

export const CHECKLIST_PRIORITY_TONE: Record<ChecklistPriority, PillTone> = {
  high: 'red',
  medium: 'amber',
  low: 'neutral',
}
export const CHECKLIST_PRIORITY_LABEL: Record<ChecklistPriority, string> = {
  high: 'HIGH',
  medium: 'MEDIUM',
  low: 'LOW',
}
