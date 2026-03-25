import React, { useState, useEffect } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import './AdminLayout.css'

const AdminLayout = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, logout } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [theme, setTheme] = useState(localStorage.getItem('vms-theme') || 'normal')

  // Apply theme to document
  useEffect(() => {
    document.body.setAttribute('data-theme', theme)
    localStorage.setItem('vms-theme', theme)
  }, [theme])

  // Close sidebar on larger screens
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setSidebarOpen(false)
      }
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Navigation menu items (from concept.html)
  const navItems = [
    { section: 'หน้าหลัก', items: [
      { id: 'dash', label: 'Dashboard', icon: '📊', path: '/admin/dashboard' },
      { id: 'houses', label: 'ข้อมูลบ้าน', icon: '🏠', path: '/admin/houses' },
      { id: 'vehicles', label: 'ข้อมูลรถ', icon: '🚗', path: '/admin/vehicles' },
      { id: 'fees', label: 'ค่าส่วนกลาง', icon: '💰', path: '/admin/fees' },
    ]},
    { section: 'จัดการ', items: [
      { id: 'req', label: 'คำขอแก้ไข', icon: '📝', path: '/admin/requests', badge: '7' },
      { id: 'issues', label: 'จัดการปัญหา', icon: '🔧', path: '/admin/issues', badge: '3' },
      { id: 'vio', label: 'แจ้งกระทำผิด', icon: '⚠️', path: '/admin/violations' },
      { id: 'ann', label: 'ประกาศ', icon: '📢', path: '/admin/announcements' },
      { id: 'rep', label: 'ผลงานนิติ', icon: '🏆', path: '/admin/reports' },
      { id: 'tech', label: 'ทำเนียบช่าง', icon: '🔨', path: '/admin/technicians' },
      { id: 'market', label: 'ตลาดชุมชน', icon: '🛒', path: '/admin/marketplace' },
    ]},
    { section: 'ระบบ', items: [
      { id: 'cfg', label: 'Config ระบบ', icon: '⚙️', path: '/admin/config' },
      { id: 'usr', label: 'ผู้ใช้งาน', icon: '👥', path: '/admin/users' },
      { id: 'log', label: 'ข้อมูล Log', icon: '📋', path: '/admin/logs' },
    ]},
  ]

  const handleNavClick = (path) => {
    navigate(path)
    setSidebarOpen(false)
  }

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const isNavItemActive = (path) => {
    return location.pathname === path
  }

  return (
    <div className="app">
      {/* Sidebar Overlay */}
      <div 
        className={`sb-overlay ${sidebarOpen ? 'show' : ''}`}
        onClick={() => setSidebarOpen(false)}
        id="sb-ov"
      />

      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`} id="sidebar">
        {/* Logo */}
        <div className="sb-logo">
          <div className="sb-logo-ico">🏘️</div>
          <div>
            <div className="sb-logo-name">The Greenfield</div>
            <div className="sb-logo-sub">Village Management v12.3</div>
          </div>
        </div>

        {/* Navigation */}
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden', minHeight: 0 }}>
          {/* Role Badge */}
          <div className="sb-role">
            <span className="sb-role-dot"></span>
            <span className="sb-role-txt">เจ้าหน้าที่นิติ</span>
          </div>

          {/* Menu Sections */}
          <nav className="sb-nav">
            {navItems.map((section) => (
              <div key={section.section}>
                <div className="sb-sec">{section.section}</div>
                {section.items.map((item) => (
                  <div
                    key={item.id}
                    className={`sb-item ${isNavItemActive(item.path) ? 'act' : ''}`}
                    onClick={() => handleNavClick(item.path)}
                  >
                    <span className="sb-ico">{item.icon}</span>
                    <span>{item.label}</span>
                    {item.badge && <span className="sb-badge">{item.badge}</span>}
                  </div>
                ))}
              </div>
            ))}
          </nav>

          {/* Logout Button */}
          <div className="sb-foot">
            <div className="sb-logout" onClick={handleLogout}>
              <span style={{ fontSize: '18px' }}>🚪</span>
              <span>ออกจากระบบ</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="main">
        {/* Topbar */}
        <div className="topbar">
          <div className="tb-ham" onClick={() => setSidebarOpen(!sidebarOpen)}>☰</div>
          <div className="tb-title">
            Dashboard — <span className="hl">ภาพรวม</span>
          </div>
          <div className="tb-right">
            {/* Theme dots */}
            <div className="theme-strip">
              {['normal', 'dark', 'rose', 'sage', 'sand', 'violet', 'teal', 'coral', 'mauve', 'dustyrose'].map((t) => (
                <div
                  key={t}
                  className={`th-dot ${theme === t ? 'on' : ''}`}
                  onClick={() => setTheme(t)}
                  title={t}
                />
              ))}
            </div>

            {/* Notification icon */}
            <div className="tb-ico" onClick={() => alert('Notifications')}>
              🔔<span className="ndot"></span>
            </div>
            <div className="tb-ico" onClick={() => alert('Settings')}>⚙️</div>
          </div>
        </div>

        {/* Page Content */}
        <div className="page">
          <Outlet />
        </div>
      </div>
    </div>
  )
}

export default AdminLayout
