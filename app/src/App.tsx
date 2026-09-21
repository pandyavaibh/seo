import { Navigate, Route, Routes } from 'react-router-dom'

import { AppShell } from '@/components/layout/app-shell'
import { AccountRecordPage } from '@/features/accounts/account-record-page'
import { ClientsListPage } from '@/features/accounts/clients-list-page'
import { CapacityPage } from '@/features/capacity/capacity-page'
import { DealsListPage } from '@/features/deals/deals-list-page'
import { ProjectsListPage } from '@/features/projects/projects-list-page'
import { ProjectWorkspacePage } from '@/features/projects/project-workspace-page'
import { SearchPerformancePage } from '@/features/search-performance/search-performance-page'
import { ContentCalendarPage } from '@/features/social/content-calendar-page'
import { SocialPage } from '@/features/social/social-page'
import { UtmBuilderPage } from '@/features/social/utm-builder-page'
import { TemplatesListPage } from '@/features/templates/templates-list-page'
import { RequireAuth, RequireMember } from '@/routes/require-member'
import { SignInPage } from '@/routes/sign-in'
import { UnauthorizedPage } from '@/routes/unauthorized'

export function App() {
  return (
    <Routes>
      <Route path="/sign-in" element={<SignInPage />} />
      <Route path="/unauthorized" element={<UnauthorizedPage />} />

      <Route element={<RequireAuth />}>
        <Route element={<RequireMember />}>
          <Route element={<AppShell />}>
            <Route path="/clients" element={<ClientsListPage />} />
            <Route path="/clients/:accountId" element={<AccountRecordPage />} />
            <Route path="/clients/:accountId/search" element={<SearchPerformancePage />} />
            <Route path="/clients/:accountId/social" element={<SocialPage />} />
            <Route path="/clients/:accountId/calendar" element={<ContentCalendarPage />} />
            <Route path="/deals" element={<DealsListPage />} />
            <Route path="/projects" element={<ProjectsListPage />} />
            <Route path="/projects/:projectId" element={<ProjectWorkspacePage />} />
            <Route path="/templates" element={<TemplatesListPage />} />
            <Route path="/capacity" element={<CapacityPage />} />
            <Route path="/utm-builder" element={<UtmBuilderPage />} />
            <Route path="/" element={<Navigate to="/clients" replace />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
