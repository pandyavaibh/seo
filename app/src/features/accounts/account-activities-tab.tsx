import { Activity } from 'lucide-react'

import { Card, CardContent } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { useAccountContext } from '@/features/accounts/use-account-context'
import { ActivityFeedCard, ActivityGroupsSection } from '@/features/projects/activity-section'

export function AccountActivitiesTab() {
  const { acc } = useAccountContext()
  const proj = acc.projects[0]

  if (!proj) {
    return (
      <Card>
        <CardContent>
          <EmptyState
            icon={Activity}
            title="No engagement set up yet"
            description="Set one up on the Overview tab to start logging activity."
          />
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <ActivityGroupsSection projectId={proj.id} />
      <ActivityFeedCard projectId={proj.id} />
    </div>
  )
}
