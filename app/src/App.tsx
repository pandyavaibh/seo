import { Navigate, Route, Routes } from 'react-router-dom'

import { AppShell } from '@/components/layout/app-shell'
import { AccountRecordPage } from '@/features/accounts/account-record-page'
import { ClientsListPage } from '@/features/accounts/clients-list-page'
import { CapacityPage } from '@/features/capacity/capacity-page'
import { ProjectsListPage } from '@/features/projects/projects-list-page'
import { ProjectWorkspacePage } from '@/features/projects/project-workspace-page'
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
            <Route path="/projects" element={<ProjectsListPage />} />
            <Route path="/projects/:projectId" element={<ProjectWorkspacePage />} />
            <Route path="/capacity" element={<CapacityPage />} />
            <Route path="/" element={<Navigate to="/clients" replace />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
