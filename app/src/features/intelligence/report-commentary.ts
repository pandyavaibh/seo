// Stage 8 — rule-based report commentary. Templated sentences built
// from the same period-over-period deltas the report already
// computes, not an LLM call — scoped that way per the user's explicit
// decision (a real LLM API is a paid, usage-billed service, unlike
// everything else in this app). Every sentence traces directly to a
// number already in the snapshot; nothing here is inferred or
// fabricated.

function pctChange(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null // can't express "% change" from zero honestly
  return ((current - previous) / previous) * 100
}

function describeDelta(label: string, current: number, previous: number, unit = '') {
  const pct = pctChange(current, previous)
  if (pct == null) {
    return `${label} was ${current.toLocaleString()}${unit} this period (no comparable prior-period baseline).`
  }
  const direction = pct > 0 ? 'up' : pct < 0 ? 'down' : 'flat vs.'
  const pctText = pct === 0 ? '' : ` ${Math.abs(Math.round(pct))}%`
  return `${label} ${direction}${pctText} vs. the prior period (${current.toLocaleString()}${unit} vs. ${previous.toLocaleString()}${unit}).`
}

export interface CommentaryInputs {
  search: { clicks: number; impressions: number } | null
  previousSearch: { clicks: number; impressions: number } | null
  ga4: { sessions: number; conversions: number } | null
  previousGa4: { sessions: number; conversions: number } | null
  keywordsImproved: number
  keywordsDeclined: number
  keywordsTracked: number
  linksPlaced: number
  tasksCompleted: number
}

export function generateCommentary(input: CommentaryInputs): string[] {
  const lines: string[] = []

  if (input.search && input.previousSearch) {
    lines.push(describeDelta('Organic clicks', input.search.clicks, input.previousSearch.clicks))
  }
  if (input.ga4 && input.previousGa4) {
    lines.push(describeDelta('GA4 sessions', input.ga4.sessions, input.previousGa4.sessions))
    if (input.ga4.conversions > 0 || input.previousGa4.conversions > 0) {
      lines.push(describeDelta('Conversions', input.ga4.conversions, input.previousGa4.conversions))
    }
  }

  if (input.keywordsTracked > 0) {
    if (input.keywordsImproved > input.keywordsDeclined) {
      lines.push(`${input.keywordsImproved} of ${input.keywordsTracked} tracked keywords moved up in rank this period, ${input.keywordsDeclined} moved down.`)
    } else if (input.keywordsDeclined > input.keywordsImproved) {
      lines.push(`${input.keywordsDeclined} of ${input.keywordsTracked} tracked keywords moved down in rank this period, ${input.keywordsImproved} moved up.`)
    } else if (input.keywordsImproved > 0) {
      lines.push(`Keyword movement was balanced this period: ${input.keywordsImproved} up, ${input.keywordsDeclined} down.`)
    }
  }

  if (input.linksPlaced > 0) {
    lines.push(`${input.linksPlaced} backlink${input.linksPlaced === 1 ? '' : 's'} went live this period.`)
  }
  if (input.tasksCompleted > 0) {
    lines.push(`${input.tasksCompleted} delivery task${input.tasksCompleted === 1 ? '' : 's'} completed this period.`)
  }

  if (lines.length === 0) {
    lines.push('No connected data sources or comparable prior period to summarize yet.')
  }

  return lines
}
