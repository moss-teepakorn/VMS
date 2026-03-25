import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { useState } from 'react'
import './AdminLayout.css'

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
    { path: '/admin/dashboard', label: 'Dashboard', icon: '📊', section: 'MAIN' },
    { path: '/admin/residents', label: 'ผู้พักอาศัย', icon: '👥', section: 'MANAGEMENT' },
    { path: '/admin/units', label: 'ห้องพัก', icon: '🏠', section: 'MANAGEMENT' },
    { path: '/admin/payments', label: 'การชำระเงิน', icon: '💳', section: 'OPERATIONS' },
    { path: '/admin/maintenance', label: 'ซ่อมบำรุง', icon: '🔧', section: 'OPERATIONS' },
    { path: '/admin/settings', label: 'ตั้งค่า', icon: '⚙️', section: 'CONFIG' },
  ]

  const groupedMenu = {}
  menuItems.forEach((item) => {
    if (!groupedMenu[item.section]) {
      groupedMenu[item.section] = []
    }
    groupedMenu[item.section].push(item)
  })

  return (
    <div className="app">
      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
        {/* Logo */}
        <div className="sb-logo">
          <div className="sb-logo-ico">🏢</div>
          {sidebarOpen && (
            <div>
              <div className="sb-logo-name">VMS Admin</div>
              <div className="sb-logo-sub">Village Management</div>
            </div>
          )}
        </div>

        {/* Role Pill */}
        {sidebarOpen && (
          <div className="sb-role">
            <div className="sb-role-dot"></div>
            <div className="sb-role-txt">ADMINISTRATOR</div>
          </div>
        )}

        {/* Navigation */}
        <nav className="sb-nav">
          {Object.entries(groupedMenu).map(([section, items]) => (
            <div key={section}>
              {sidebarOpen && <div className="sb-sec">{section}</div>}
              {items.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`sb-item ${location.pathname === item.path ? 'act' : ''}`}
                >
                  <span className="sb-ico">{item.icon}</span>
                  {sidebarOpen && <span>{item.label}</span>}
                </Link>
              ))}
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="sb-foot">
          <div className="sb-user">
            <div className="av">🧑</div>
            {sidebarOpen && (
              <div>
                <div className="sb-uname">{user?.email || 'Admin'}</div>
                <div className="sb-urole">Administrator</div>
              </div>
            )}
          </div>
          <div
            className="sb-logout"
            onClick={handleLogout}
          >
            <span>🚪</span>
            {sidebarOpen && <span>Logout</span>}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="main">
        {/* Topbar */}
        <div className="topbar">
          <button
            className="tb-ham"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            ☰
          </button>
          <h2 className="tb-title">
            {menuItems.find((item) => item.path === location.pathname)?.label || 'Dashboard'}
          </h2>
          <div className="tb-right">
            <div style={{ textAlign: 'right', marginRight: '10px' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--tx)' }}>
                {user?.email}
              </div>
              <div style={{ fontSize: '10px', color: 'var(--mu)' }}>
                Administrator
              </div>
            </div>
            <img
              src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.email}`}
              alt="Avatar"
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                border: '2px solid var(--bo)',
              }}
            />
          </div>
        </div>

        {/* Page Content */}
        <div className="page">
          <Outlet />
        </div>
      </div>

      <div className="sb-overlay" onClick={() => setSidebarOpen(false)}></div>
    </div>
  )
}

export default AdminLayout
