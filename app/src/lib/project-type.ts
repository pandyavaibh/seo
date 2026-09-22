// Engagement/project type — stored as plain text on projects.project_type
// (no DB enum), so adding a value here never touches existing rows.
export const PROJECT_TYPES = [
  'technical',
  'content',
  'offpage',
  'local',
  'ecommerce',
  'multi_location',
  'migration',
  'analytics',
] as const

export const PROJECT_TYPE_LABEL: Record<string, string> = {
  technical: 'Technical SEO',
  content: 'Content SEO',
  offpage: 'Off-Page SEO',
  local: 'Local SEO',
  ecommerce: 'eCommerce SEO',
  multi_location: 'Multiple Location SEO',
  migration: 'Site Migration',
  analytics: 'Analytics & Reporting',
}
