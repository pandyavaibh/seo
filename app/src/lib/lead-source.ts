// Standardized deal/lead sources — plan doc's Stage 6 "lead routing":
// "form and Meta lead-ad submissions land in the Stage 1 pipeline with
// source intact." deals.source is free text (Stage 1), this is just a
// consistent list so the same channel is never spelled three ways.
// Meta lead-ad submissions are logged here by hand — automated webhook
// ingestion isn't built (see docs/STAGE_6.md).
export const LEAD_SOURCES = [
  'Referral',
  'Organic search',
  'Website form',
  'Direct / inbound',
  'Meta ad',
  'Meta lead form',
  'Outreach',
  'Other',
] as const
