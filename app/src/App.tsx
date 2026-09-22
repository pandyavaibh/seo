import { Navigate, Route, Routes } from 'react-router-dom'

import { AppShell } from '@/components/layout/app-shell'
import { PortalShell } from '@/components/layout/portal-shell'
import { AccountRecordPage } from '@/features/accounts/account-record-page'
import { ClientsListPage } from '@/features/accounts/clients-list-page'
import { BillingPage } from '@/features/billing/billing-page'
import { CapacityPage } from '@/features/capacity/capacity-page'
import { DeveloperPage } from '@/features/developer/developer-page'
import { DealsListPage } from '@/features/deals/deals-list-page'
import { PortalDashboardPage } from '@/features/portal/portal-dashboard-page'
import { PortalInvoicesPage } from '@/features/portal/portal-invoices-page'
import { PortalReportsPage } from '@/features/portal/portal-reports-page'
import { ProjectsListPage } from '@/features/projects/projects-list-page'
import { ProjectWorkspacePage } from '@/features/projects/project-workspace-page'
import { ReportsPage } from '@/features/reports/reports-page'
import { SearchPerformancePage } from '@/features/search-performance/search-performance-page'
import { ContentCalendarPage } from '@/features/social/content-calendar-page'
import { SocialPage } from '@/features/social/social-page'
import { UtmBuilderPage } from '@/features/social/utm-builder-page'
import { TemplatesListPage } from '@/features/templates/templates-list-page'
import { RequireAuth, RequireMember, RequirePortal, RequireStaff } from '@/routes/require-member'
import { SignInPage } from '@/routes/sign-in'
import { UnauthorizedPage } from '@/routes/unauthorized'

export function App() {
  return (
    <Routes>
      <Route path="/sign-in" element={<SignInPage />} />
      <Route path="/unauthorized" element={<UnauthorizedPage />} />

      <Route element={<RequireAuth />}>
        <Route element={<RequireMember />}>
          <Route element={<RequireStaff />}>
            <Route element={<AppShell />}>
              <Route path="/clients" element={<ClientsListPage />} />
              <Route path="/clients/:accountId" element={<AccountRecordPage />} />
              <Route path="/clients/:accountId/search" element={<SearchPerformancePage />} />
              <Route path="/clients/:accountId/social" element={<SocialPage />} />
              <Route path="/clients/:accountId/calendar" element={<ContentCalendarPage />} />
              <Route path="/clients/:accountId/reports" element={<ReportsPage />} />
              <Route path="/clients/:accountId/billing" element={<BillingPage />} />
              <Route path="/deals" element={<DealsListPage />} />
              <Route path="/projects" element={<ProjectsListPage />} />
              <Route path="/projects/:projectId" element={<ProjectWorkspacePage />} />
              <Route path="/templates" element={<TemplatesListPage />} />
              <Route path="/capacity" element={<CapacityPage />} />
              <Route path="/utm-builder" element={<UtmBuilderPage />} />
            <Route path="/developer" element={<DeveloperPage />} />
              <Route path="/" element={<Navigate to="/clients" replace />} />
            </Route>
          </Route>

          <Route element={<RequirePortal />}>
            <Route element={<PortalShell />}>
              <Route path="/portal" element={<PortalDashboardPage />} />
              <Route path="/portal/reports" element={<PortalReportsPage />} />
              <Route path="/portal/invoices" element={<PortalInvoicesPage />} />
            </Route>
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
