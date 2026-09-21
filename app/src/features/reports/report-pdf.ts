import { jsPDF } from 'jspdf'

import type { ReportRow } from '@/features/reports/use-reports'

// Client-side PDF export — a free npm package, no server-side rendering
// service. See docs/STAGE_7.md for why (no paid plan).
export function downloadReportPdf(accountName: string, report: ReportRow) {
  const doc = new jsPDF()
  let y = 20

  const line = (text: string, size = 11, gap = 7) => {
    doc.setFontSize(size)
    doc.text(text, 14, y)
    y += gap
  }

  line(`${accountName} — Monthly report`, 16, 10)
  line(`${report.periodStart} to ${report.periodEnd}`, 10, 12)

  const s = report.snapshot

  if (s.search) {
    line('Search Console', 13, 8)
    line(`Clicks: ${s.search.clicks.toLocaleString()}   Impressions: ${s.search.impressions.toLocaleString()}`)
    y += 4
  }
  if (s.ga4) {
    line('GA4', 13, 8)
    line(`Sessions: ${s.ga4.sessions.toLocaleString()}   Conversions: ${s.ga4.conversions.toLocaleString()}`)
    y += 4
  }
  if (s.meta) {
    line('Social', 13, 8)
    line(`Reach: ${s.meta.reach.toLocaleString()}   Engagement: ${s.meta.engagement.toLocaleString()}`)
    y += 4
  }

  line('Keywords', 13, 8)
  line(`Tracked: ${s.keywordsTracked}   Improved: ${s.keywordsImproved}   Declined: ${s.keywordsDeclined}`)
  y += 4

  line(`Links built (${s.linksPlaced.length})`, 13, 8)
  if (s.linksPlaced.length === 0) {
    line('None this period.')
  } else {
    for (const l of s.linksPlaced) {
      line(`• ${l.domain}${l.projectName ? ` — ${l.projectName}` : ''}`, 10, 6)
    }
  }
  y += 4

  line(`Work completed (${s.tasksCompleted.length})`, 13, 8)
  if (s.tasksCompleted.length === 0) {
    line('None this period.')
  } else {
    for (const t of s.tasksCompleted) {
      line(`• ${t.label}${t.projectName ? ` — ${t.projectName}` : ''}`, 10, 6)
    }
  }

  if (report.nextMonthPlan) {
    y += 4
    line('Next month', 13, 8)
    const wrapped = doc.splitTextToSize(report.nextMonthPlan, 180)
    doc.setFontSize(10)
    doc.text(wrapped, 14, y)
  }

  doc.save(`${accountName.replace(/\s+/g, '-')}-report-${report.periodStart}.pdf`)
}
