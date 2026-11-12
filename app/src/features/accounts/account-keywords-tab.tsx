import { Search } from 'lucide-react'

import { Card, CardContent } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { useAccountContext } from '@/features/accounts/use-account-context'
import { KeywordsSection } from '@/features/projects/keywords-section'

export function AccountKeywordsTab() {
  const { acc } = useAccountContext()
  const proj = acc.projects[0]

  if (!proj) {
    return (
      <Card>
        <CardContent>
          <EmptyState
            icon={Search}
            title="No engagement set up yet"
            description="Set one up on the Overview tab to start tracking keywords."
          />
        </CardContent>
      </Card>
    )
  }

  return <KeywordsSection projectId={proj.id} />
}
