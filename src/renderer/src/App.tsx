import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from './auth/AuthContext'
import { RequireAuth } from './auth/RequireAuth'
import { AppLayout } from './components/AppLayout'
import { ToastProvider } from './components/Toast'
import { FullscreenSpinner } from './components/FullscreenSpinner'
import { Login } from './pages/Login'
import { Dashboard } from './pages/dashboard/Dashboard'
import { Contacts } from './pages/contacts/Contacts'
import { Projects } from './pages/projects/Projects'
import { ProjectDetail } from './pages/projects/ProjectDetail'
import { Quotations } from './pages/quotations/Quotations'
import { QuotationDetail } from './pages/quotations/QuotationDetail'
import { InvoiceEditor } from './pages/invoices/InvoiceEditor'
import { Settings } from './pages/settings/Settings'

/** Keeps signed-in users out of the login screen. */
function LoginRoute(): JSX.Element {
  const { initializing, session } = useAuth()
  if (initializing) return <FullscreenSpinner label="Loading…" />
  if (session) return <Navigate to="/" replace />
  return <Login />
}

function AppRoutes(): JSX.Element {
  return (
    <Routes>
      <Route path="/login" element={<LoginRoute />} />
      <Route
        element={
          <RequireAuth>
            <AppLayout />
          </RequireAuth>
        }
      >
        <Route path="/" element={<Dashboard />} />
        <Route path="/contacts" element={<Contacts />} />
        {/* Legacy path kept so old links/bookmarks still resolve. */}
        <Route path="/clients" element={<Navigate to="/contacts" replace />} />
        <Route path="/quotations" element={<Quotations />} />
        <Route path="/quotations/:id" element={<QuotationDetail />} />
        <Route path="/projects" element={<Projects />} />
        <Route path="/projects/:id" element={<ProjectDetail />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/invoices/new" element={<InvoiceEditor />} />
        <Route path="/invoices/:id/edit" element={<InvoiceEditor />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

function App(): JSX.Element {
  return (
    <ToastProvider>
      <AuthProvider>
        <HashRouter>
          <AppRoutes />
        </HashRouter>
      </AuthProvider>
    </ToastProvider>
  )
}

export default App
