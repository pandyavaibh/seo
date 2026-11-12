import { ListChecks } from 'lucide-react'

import { Card, CardContent } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { ChecklistCard } from '@/features/checklist/checklist-card'
import { useAccountContext } from '@/features/accounts/use-account-context'

export function AccountChecklistTab() {
  const { acc } = useAccountContext()
  const proj = acc.projects[0]

  if (!proj) {
    return (
      <Card>
        <CardContent>
          <EmptyState
            icon={ListChecks}
            title="No engagement set up yet"
            description="Set one up on the Overview tab to start the sitewide checklist."
          />
        </CardContent>
      </Card>
    )
  }

  return <ChecklistCard projectId={proj.id} />
}
