import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useAccountContext } from '@/features/accounts/use-account-context'
import { KeywordsSection } from '@/features/projects/keywords-section'

export function AccountKeywordsTab() {
  const { acc } = useAccountContext()
  const proj = acc.projects[0]

  if (!proj) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Keywords</CardTitle>
        </CardHeader>
        <CardContent className="p-[16px_18px]">
          <p className="m-0 text-[13px] text-ink-muted">
            No engagement set up yet — set one up on the Overview tab to start tracking keywords.
          </p>
        </CardContent>
      </Card>
    )
  }

  return <KeywordsSection projectId={proj.id} />
}
