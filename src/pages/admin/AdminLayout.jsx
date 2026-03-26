import React, { useState, useEffect } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { applyDocumentTitle, getSetupConfig } from '../../lib/setup'
import { updateUser, getHouseDetail } from '../../lib/users'
import Swal from 'sweetalert2'
import villageLogo from '../../assets/village-logo.svg'
import './AdminLayout.css'

// Create a global modal context for easy access
export const ModalContext = React.createContext()

const BUILD_SHA = typeof __BUILD_SHA__ !== 'undefined' ? __BUILD_SHA__ : 'local'
const BUILD_DATE = typeof __BUILD_DATE__ !== 'undefined' ? __BUILD_DATE__ : '-'
const APP_VERSION = '1.0.0'

function roleLabel(role) {
  return role === 'admin' ? 'ผู้ดูแลระบบ' : 'ลูกบ้าน'
}

const AdminLayout = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { profile, logout } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [theme, setTheme] = useState(localStorage.getItem('vms-theme') || 'normal')
  const [setupOpen, setSetupOpen] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [houseNo, setHouseNo] = useState('-')
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [setup, setSetup] = useState({
    villageName: 'The Greenfield',
    appLineMain: 'Village Management',
    appLineTail: 'System',
    version: '1.0.0',
  })
  
  // Modal state
  const [modalOpen, setModalOpen] = useState(false)
  const [modalTitle, setModalTitle] = useState('')
  const [modalContent, setModalContent] = useState('')
  const [modalFields, setModalFields] = useState({})
  const [modalCallback, setModalCallback] = useState(null)

  // Apply theme to document
  useEffect(() => {
    document.body.setAttribute('data-theme', theme)
    localStorage.setItem('vms-theme', theme)
  }, [theme])

  useEffect(() => {
    const loadSetup = async () => {
      const next = await getSetupConfig()
      setSetup(next)
      applyDocumentTitle(next.villageName)
    }
    loadSetup()
  }, [])

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

  // Load house_no for current user
  useEffect(() => {
    if (!profile?.house_id) { setHouseNo('-'); return }
    getHouseDetail(profile.house_id)
      .then((detail) => setHouseNo(detail?.house_no || '-'))
      .catch(() => setHouseNo('-'))
  }, [profile?.house_id])

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

  const handleChangeMyPassword = async () => {
    if (!profile?.id) return
    if (!newPassword || !confirmPassword) {
      await Swal.fire({ icon: 'warning', title: 'ข้อมูลไม่ครบ', text: 'กรุณากรอกรหัสผ่านใหม่ให้ครบ' })
      return
    }
    if (newPassword.length < 6) {
      await Swal.fire({ icon: 'warning', title: 'รหัสผ่านสั้นเกินไป', text: 'รหัสผ่านต้องอย่างน้อย 6 ตัวอักษร' })
      return
    }
    if (newPassword !== confirmPassword) {
      await Swal.fire({ icon: 'warning', title: 'รหัสผ่านไม่ตรงกัน', text: 'ยืนยันรหัสผ่านไม่ตรงกัน' })
      return
    }
    try {
      await updateUser(profile.id, { password: newPassword })
      setNewPassword('')
      setConfirmPassword('')
      setShowPasswordModal(false)
      await Swal.fire({ icon: 'success', title: 'สำเร็จ', text: 'เปลี่ยนรหัสผ่านเรียบร้อย' })
    } catch (error) {
      await Swal.fire({ icon: 'error', title: 'ไม่สำเร็จ', text: `เปลี่ยนรหัสผ่านไม่สำเร็จ: ${error.message}` })
    }
  }

  const isNavItemActive = (path) => {
    return location.pathname === path
  }

  // Modal functions
  const openModal = (title, fields = {}, callback = null) => {
    setModalTitle(title)
    setModalFields(fields)
    setModalCallback(() => callback)
    setModalOpen(true)
  }

  const closeModal = () => {
    setModalOpen(false)
    setTimeout(() => {
      setModalTitle('')
      setModalContent('')
      setModalFields({})
      setModalCallback(null)
    }, 300)
  }

  const handleModalSubmit = () => {
    if (modalCallback) {
      modalCallback(modalFields)
    }
    closeModal()
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
          <div className="sb-logo-ico sb-logo-ico-img">
            <img src={villageLogo} alt="Village Logo" className="sb-logo-image" />
          </div>
          <div>
            <div className="sb-logo-name">{setup.villageName}</div>
          </div>
        </div>

        {/* Navigation */}
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden', minHeight: 0 }}>
          {/* Role Badge */}
          <div className="sb-role">
            <span className="sb-role-dot"></span>
            <span className="sb-role-txt">{roleLabel(profile?.role)}</span>
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
            <div className="setup-wrap">
              <div className="tb-ico" onClick={() => setSetupOpen((prev) => !prev)}>⚙️</div>

              {setupOpen && (
                <div className="setup-menu">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <div className="setup-title" style={{ marginBottom: 0 }}>Setup</div>
                    <button style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px', color: 'var(--mu)', lineHeight: 1, padding: '0 2px' }} onClick={() => setSetupOpen(false)}>✕</button>
                  </div>

                  <div className="setup-section">
                    <div style={{ fontSize: '13px', color: 'var(--tx)', marginBottom: '10px', fontWeight: 600 }}>สวัสดี คุณ{profile?.full_name || profile?.username || ''}</div>
                    <div className="setup-label">Profile</div>
                    <div className="setup-profile-row"><span>ชื่อ</span><strong>{profile?.full_name || '-'}</strong></div>
                    <div className="setup-profile-row"><span>Username</span><strong>{profile?.username || '-'}</strong></div>
                    <div className="setup-profile-row"><span>บทบาท</span><strong>{roleLabel(profile?.role)}</strong></div>
                    <div className="setup-profile-row"><span>บ้าน</span><strong>{houseNo}</strong></div>
                  </div>

                  <div className="setup-section">
                    <div className="setup-label">Theme</div>
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
                  </div>

                  <div className="setup-section">
                    <button className="btn btn-p btn-sm" style={{ width: '100%' }} onClick={() => { setSetupOpen(false); setShowPasswordModal(true) }}>🔑 เปลี่ยนรหัสผ่าน</button>
                    <button className="btn btn-g btn-sm" style={{ width: '100%', marginTop: '6px' }} onClick={() => setSetupOpen(false)}>ปิด</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Page Content */}
        <div className="page">
          <ModalContext.Provider value={{ openModal, closeModal, modalFields, setModalFields }}>
            <Outlet />
          </ModalContext.Provider>
        </div>

        {/* Password Change Modal */}
        {showPasswordModal && (
          <div className="house-mo">
            <div className="house-md" style={{ maxWidth: '400px' }}>
              <div className="house-md-head">
                <div>
                  <div className="house-md-title">🔑 เปลี่ยนรหัสผ่าน</div>
                  <div className="house-md-sub">{profile?.full_name || profile?.username}</div>
                </div>
              </div>
              <div className="house-md-body">
                <section className="house-sec">
                  <div className="house-grid" style={{ gridTemplateColumns: '1fr' }}>
                    <label className="house-field">
                      <span>รหัสผ่านใหม่ <strong style={{ color: '#dc2626' }}>*</strong></span>
                      <input type="password" placeholder="อย่างน้อย 6 ตัวอักษร" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
                    </label>
                    <label className="house-field">
                      <span>ยืนยันรหัสผ่านใหม่ <strong style={{ color: '#dc2626' }}>*</strong></span>
                      <input type="password" placeholder="กรอกรหัสผ่านอีกครั้ง" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
                    </label>
                  </div>
                </section>
              </div>
              <div className="house-md-foot">
                <button className="btn btn-g" type="button" onClick={() => { setShowPasswordModal(false); setNewPassword(''); setConfirmPassword('') }}>ยกเลิก</button>
                <button className="btn btn-p" type="button" onClick={handleChangeMyPassword}>บันทึก</button>
              </div>
            </div>
          </div>
        )}

        {/* Modal */}
        <div className={`mo ${modalOpen ? 'show' : ''}`}>
          <div className="md">
            <div className="md-hd">
              <h2>{modalTitle}</h2>
            </div>
            <div className="md-bd">
              {Object.entries(modalFields).length > 0 ? (
                <div className="fg">
                  {Object.entries(modalFields).map(([key, value]) => (
                    <div key={key} style={{ marginBottom: '12px' }}>
                      <label className="fl">{value.label}</label>
                      {value.type === 'select' ? (
                        <select
                          value={value.value ?? ''}
                          onChange={(e) => setModalFields({ ...modalFields, [key]: { ...value, value: e.target.value } })}
                          style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--bo)', borderRadius: '6px' }}
                        >
                          {(value.options || []).map((option) => (
                            <option key={option.value} value={option.value}>{option.label}</option>
                          ))}
                        </select>
                      ) : value.type === 'textarea' ? (
                        <textarea
                          placeholder={value.placeholder || ''}
                          value={value.value ?? ''}
                          rows={value.rows || 3}
                          onChange={(e) => setModalFields({ ...modalFields, [key]: { ...value, value: e.target.value } })}
                          style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--bo)', borderRadius: '6px', resize: 'vertical' }}
                        />
                      ) : (
                        <input
                          type={value.type || 'text'}
                          placeholder={value.placeholder || ''}
                          value={value.value ?? ''}
                          onChange={(e) => setModalFields({ ...modalFields, [key]: { ...value, value: e.target.value } })}
                          style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--bo)', borderRadius: '6px' }}
                        />
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ textAlign: 'center', color: 'var(--mu)', padding: '20px' }}>
                  โปรแกรมกำเนิดหนังสือการทำงาน
                </div>
              )}
            </div>
            <div className="md-ft">
              <button className="btn btn-g" onClick={closeModal}>ยกเลิก</button>
              <button className="btn btn-p" onClick={handleModalSubmit}>บันทึก</button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="fixed bottom-0 right-0 left-0 sm:left-60 bg-white/80 border-t border-slate-200 px-6 py-3 text-center text-xs text-slate-500">
          <p>{setup.villageName} | version {APP_VERSION} | Built no : {BUILD_SHA} | Built date : {BUILD_DATE}</p>
        </footer>
      </div>
    </div>
  )
}

export default AdminLayout
