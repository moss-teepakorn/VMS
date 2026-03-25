import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import LoginPage from './pages/LoginPage'
import AdminLayout from './pages/admin/AdminLayout'
import ResidentLayout from './pages/resident/ResidentLayout'

// Guard: ถ้ายังไม่ login → ไป /login
function RequireAuth({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <PageLoader />
  if (!user) return <Navigate to="/login" replace />
  return children
}

// Guard: ถ้า login แล้ว → ไปหน้าที่ตรงกับ role อัตโนมัติ
function RoleRedirect() {
  const { profile, loading } = useAuth()
  if (loading) return <PageLoader />
  if (!profile) return <Navigate to="/login" replace />
  return profile.role === 'admin'
    ? <Navigate to="/admin/dashboard" replace />
    : <Navigate to="/resident/home" replace />
}

function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <span className="text-sm text-gray-500">กำลังโหลด...</span>
      </div>
    </div>
  )
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<RequireAuth><RoleRedirect /></RequireAuth>} />

      {/* Admin routes */}
      <Route path="/admin/*" element={
        <RequireAuth><AdminLayout /></RequireAuth>
      } />

      {/* Resident routes */}
      <Route path="/resident/*" element={
        <RequireAuth><ResidentLayout /></RequireAuth>
      } />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}
