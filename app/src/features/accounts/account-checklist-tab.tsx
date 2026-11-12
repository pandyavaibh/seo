import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ChecklistCard } from '@/features/checklist/checklist-card'
import { useAccountContext } from '@/features/accounts/use-account-context'

export function AccountChecklistTab() {
  const { acc } = useAccountContext()
  const proj = acc.projects[0]

  if (!proj) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Checklist</CardTitle>
        </CardHeader>
        <CardContent className="p-[16px_18px]">
          <p className="m-0 text-[13px] text-ink-muted">
            No engagement set up yet — set one up on the Overview tab to start the sitewide
            checklist.
          </p>
        </CardContent>
      </Card>
    )
  }

  return <ChecklistCard projectId={proj.id} />
}
