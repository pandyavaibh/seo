import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useAccountContext } from '@/features/accounts/use-account-context'
import { ActivityFeedCard, ActivityGroupsSection } from '@/features/projects/activity-section'

export function AccountActivitiesTab() {
  const { acc } = useAccountContext()
  const proj = acc.projects[0]

  if (!proj) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Activities</CardTitle>
        </CardHeader>
        <CardContent className="p-[16px_18px]">
          <p className="m-0 text-[13px] text-ink-muted">
            No engagement set up yet — set one up on the Overview tab to start logging activity.
          </p>
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
