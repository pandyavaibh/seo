import { Navigate, Route, Routes } from 'react-router-dom'

import { AppShell } from '@/components/layout/app-shell'
import { ProjectsListPage } from '@/features/projects/projects-list-page'
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
            <Route path="/projects" element={<ProjectsListPage />} />
            {/* Clients, account record and capacity are Stage 1–3 screens —
                not built yet. Redirect there for now so the nav doesn't
                dead-end. */}
            <Route path="/clients" element={<Navigate to="/projects" replace />} />
            <Route path="/capacity" element={<Navigate to="/projects" replace />} />
            <Route path="/" element={<Navigate to="/projects" replace />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
