import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { useState } from 'react'

function AdminLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(true)

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const menuItems = [
    { path: '/admin/dashboard', label: 'Dashboard', icon: '📊' },
    { path: '/admin/residents', label: 'ผู้พักอาศัย', icon: '👥' },
    { path: '/admin/units', label: 'ห้องพัก', icon: '🏠' },
    { path: '/admin/payments', label: 'การชำระเงิน', icon: '💳' },
    { path: '/admin/maintenance', label: 'ซ่อมบำรุง', icon: '🔧' },
    { path: '/admin/settings', label: 'ตั้งค่า', icon: '⚙️' },
  ]

  return (
    <div className="min-h-screen bg-gray-100 flex">
      {/* Sidebar */}
      <aside className={`${
        sidebarOpen ? 'w-64' : 'w-20'
      } bg-gray-900 text-white transition-all duration-300 flex flex-col`}>
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-gray-800">
          {sidebarOpen && <h1 className="text-xl font-bold">VMS Admin</h1>}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1 hover:bg-gray-800 rounded"
          >
            {sidebarOpen ? '◀' : '▶'}
          </button>
        </div>

        {/* Menu */}
        <nav className="flex-1 px-2 py-4 space-y-2">
          {menuItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                location.pathname === item.path
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-300 hover:bg-gray-800'
              }`}
            >
              <span className="text-xl">{item.icon}</span>
              {sidebarOpen && <span>{item.label}</span>}
            </Link>
          ))}
        </nav>

        {/* Footer */}
        <div className="border-t border-gray-800 p-4 space-y-2">
          {sidebarOpen && (
            <p className="text-sm text-gray-400 truncate">{user?.email}</p>
          )}
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 transition-colors text-sm"
          >
            <span>🚪</span>
            {sidebarOpen && <span>ออกจากระบบ</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 shadow-sm">
          <h2 className="text-2xl font-semibold text-gray-800">
            {menuItems.find((item) => item.path === location.pathname)?.label || 'Dashboard'}
          </h2>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm font-medium text-gray-900">{user?.email}</p>
              <p className="text-xs text-gray-500">ผู้ดูแลระบบ</p>
            </div>
            <img
              src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.email}`}
              alt="Avatar"
              className="w-10 h-10 rounded-full"
            />
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default AdminLayout
