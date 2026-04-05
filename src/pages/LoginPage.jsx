import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { clearClientStorage } from '../contexts/AuthContext'
import { applyDocumentTitle, getSetupConfig } from '../lib/setup'
import { createAccountRegistrationRequest, resetPasswordByIdentity } from '../lib/accountRequests'
import villageLogo from '../assets/village-logo.svg'

const BUILD_SHA = typeof __BUILD_SHA__ !== 'undefined' ? __BUILD_SHA__ : 'local'
const BUILD_DATE = typeof __BUILD_DATE__ !== 'undefined' ? __BUILD_DATE__ : '-'
const APP_VERSION = '1.0.0'
const LOGIN_THEME_KEY = 'vms-login-theme'

const LOGIN_THEME_PRESETS = {
  legacy: {
    id: 'legacy',
    pageBackground: 'linear-gradient(180deg,#c9dff2 0%,#c7dcf0 46%,#d3e4f5 100%)',
    blobPrimary: 'rgba(181, 214, 242, 0.50)',
    blobSecondary: 'rgba(255, 255, 255, 0.30)',
    cardBackground: '#ffffff',
    cardBorder: '#e3edf7',
    cardShadow: '0 24px 60px rgba(42,77,114,0.18)',
    logoRing: '#d8e4f2',
    titleColor: '#1f2937',
    subtitleColor: '#334155',
    fieldBorder: '#d8e1ea',
    fieldBackground: '#ffffff',
    primaryButton: 'linear-gradient(180deg,#4f72cd 0%,#3f63bd 100%)',
    secondaryLink: '#6f8dc0',
    footerColor: '#7f95ac',
  },
  hybrid: {
    id: 'hybrid',
    pageBackground: 'linear-gradient(180deg,#dbe7f4 0%,#d4e3f3 45%,#e4eef8 100%)',
    blobPrimary: 'rgba(166, 198, 231, 0.52)',
    blobSecondary: 'rgba(255, 255, 255, 0.34)',
    cardBackground: '#ffffff',
    cardBorder: '#d9e6f3',
    cardShadow: '0 20px 48px rgba(24,58,93,0.16)',
    logoRing: '#d2e1ef',
    titleColor: '#1e293b',
    subtitleColor: '#334155',
    fieldBorder: '#cfdbe8',
    fieldBackground: '#fbfdff',
    primaryButton: 'linear-gradient(180deg,#3e66bf 0%,#3258aa 100%)',
    secondaryLink: '#4f6ea5',
    footerColor: '#6b8096',
  },
  reference: {
    id: 'reference',
    pageBackground: 'linear-gradient(180deg,#d6e7f5 0%,#d7e6f4 48%,#e3edf8 100%)',
    blobPrimary: 'rgba(188, 215, 238, 0.56)',
    blobSecondary: 'rgba(255, 255, 255, 0.40)',
    cardBackground: '#ffffff',
    cardBorder: '#d5e0ec',
    cardShadow: '0 18px 42px rgba(39,69,101,0.14)',
    logoRing: '#d0dce8',
    titleColor: '#243b54',
    subtitleColor: '#445d78',
    fieldBorder: '#d4dde7',
    fieldBackground: '#ffffff',
    primaryButton: 'linear-gradient(180deg,#4a6ec9 0%,#3f62ba 100%)',
    secondaryLink: '#5c7eae',
    footerColor: '#7f95ac',
  },
}

function resolveLoginTheme() {
  const fallback = 'legacy'
  if (typeof window === 'undefined') return fallback
  const query = new URLSearchParams(window.location.search)
  const queryTheme = String(query.get('theme') || '').toLowerCase()
  if (LOGIN_THEME_PRESETS[queryTheme]) {
    localStorage.setItem(LOGIN_THEME_KEY, queryTheme)
    return queryTheme
  }
  const stored = String(localStorage.getItem(LOGIN_THEME_KEY) || '').toLowerCase()
  if (LOGIN_THEME_PRESETS[stored]) return stored
  return fallback
}

export default function LoginPage() {
  const { signIn, user, profile, loading } = useAuth()
  const navigate = useNavigate()
  const [mode, setMode] = useState('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [registerUsername, setRegisterUsername] = useState('')
  const [registerHouseNo, setRegisterHouseNo] = useState('')
  const [registerPhone, setRegisterPhone] = useState('')
  const [registerPassword, setRegisterPassword] = useState('')
  const [registerConfirmPassword, setRegisterConfirmPassword] = useState('')
  const [resetUsername, setResetUsername] = useState('')
  const [resetHouseNo, setResetHouseNo] = useState('')
  const [resetPhone, setResetPhone] = useState('')
  const [resetPassword, setResetPassword] = useState('')
  const [resetConfirmPassword, setResetConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [infoMessage, setInfoMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [showPass, setShowPass] = useState(false)
  const [capsLockOn, setCapsLockOn] = useState(false)
  const [loginThemeId, setLoginThemeId] = useState(() => resolveLoginTheme())
  const [setup, setSetup] = useState({
    villageName: 'The Greenfield',
    appLineMain: 'Village Management',
    appLineTail: 'System',
    version: 'v12.3',
    address: 'Gusto Suksawat 26 -1',
  })

  // ถ้า login แล้ว redirect ไปหน้าที่ถูก
  useEffect(() => {
    if (!loading && user && profile) {
      navigate(profile.role === 'admin' ? '/admin/dashboard' : '/resident/home', { replace: true })
    }
  }, [user, profile, loading, navigate])

  // Clear all local state and cookies whenever the login page is mounted (before login)
  useEffect(() => {
    clearClientStorage()
  }, [])

  useEffect(() => {
    const loadSetup = async () => {
      const next = await getSetupConfig()
      setSetup(next)
      applyDocumentTitle(next.villageName)
    }
    loadSetup()
  }, [])

  useEffect(() => {
    setLoginThemeId(resolveLoginTheme())
  }, [])

  const loginTheme = LOGIN_THEME_PRESETS[loginThemeId] || LOGIN_THEME_PRESETS.legacy

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setInfoMessage('')
    setSubmitting(true)
    const { error: signInError } = await signIn(username, password)
    if (signInError) {
      setError(signInError.message || 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง')
      setSubmitting(false)
      return
    }
  }

  const handlePasswordKeyState = (e) => {
    setCapsLockOn(Boolean(e.getModifierState?.('CapsLock')))
  }

  const switchMode = (nextMode, { keepInfo = false } = {}) => {
    setMode(nextMode)
    setError('')
    if (!keepInfo) setInfoMessage('')
    setCapsLockOn(false)
  }

  const handleRegisterSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setInfoMessage('')

    if (!registerUsername.trim() || !registerHouseNo.trim() || !registerPhone.trim() || !registerPassword) {
      setError('กรุณากรอกข้อมูลลงทะเบียนให้ครบถ้วน')
      return
    }
    if (registerPassword.length < 6) {
      setError('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร')
      return
    }
    if (registerPassword !== registerConfirmPassword) {
      setError('ยืนยันรหัสผ่านไม่ตรงกัน')
      return
    }

    try {
      setSubmitting(true)
      await createAccountRegistrationRequest({
        username: registerUsername,
        houseNo: registerHouseNo,
        phone: registerPhone,
        password: registerPassword,
      })
      setInfoMessage('ส่งคำขอลงทะเบียนเรียบร้อยแล้ว กรุณารอผู้ดูแลระบบอนุมัติการใช้งาน')
      setRegisterUsername('')
      setRegisterHouseNo('')
      setRegisterPhone('')
      setRegisterPassword('')
      setRegisterConfirmPassword('')
      switchMode('login', { keepInfo: true })
    } catch (registerError) {
      setError(registerError.message || 'ลงทะเบียนไม่สำเร็จ')
    } finally {
      setSubmitting(false)
    }
  }

  const handleResetPasswordSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setInfoMessage('')

    if (!resetUsername.trim() || !resetHouseNo.trim() || !resetPhone.trim() || !resetPassword) {
      setError('กรุณากรอกข้อมูลสำหรับรีเซ็ตรหัสผ่านให้ครบถ้วน')
      return
    }
    if (resetPassword.length < 6) {
      setError('รหัสผ่านใหม่ต้องมีอย่างน้อย 6 ตัวอักษร')
      return
    }
    if (resetPassword !== resetConfirmPassword) {
      setError('ยืนยันรหัสผ่านใหม่ไม่ตรงกัน')
      return
    }

    try {
      setSubmitting(true)
      await resetPasswordByIdentity({
        username: resetUsername,
        houseNo: resetHouseNo,
        phone: resetPhone,
        newPassword: resetPassword,
      })
      setInfoMessage('เปลี่ยนรหัสผ่านเรียบร้อยแล้ว กรุณาเข้าสู่ระบบด้วยรหัสผ่านใหม่')
      setResetUsername('')
      setResetHouseNo('')
      setResetPhone('')
      setResetPassword('')
      setResetConfirmPassword('')
      switchMode('login', { keepInfo: true })
    } catch (resetError) {
      setError(resetError.message || 'เปลี่ยนรหัสผ่านไม่สำเร็จ')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden" style={{ background: loginTheme.pageBackground }}>
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-1/3 h-80 w-80 -translate-x-1/2 rounded-full blur-3xl" style={{ background: loginTheme.blobPrimary }} />
        <div className="absolute left-1/2 bottom-12 h-64 w-64 -translate-x-1/2 rounded-full blur-3xl" style={{ background: loginTheme.blobSecondary }} />
      </div>

      <div className="relative z-10 flex min-h-screen flex-col px-4 py-6 sm:px-8 sm:py-8">
        <div className="flex flex-1 items-center justify-center">
          <div
            className="w-full max-w-[430px] rounded-[20px] border px-5 py-6 sm:px-6 sm:py-7"
            style={{
              background: loginTheme.cardBackground,
              borderColor: loginTheme.cardBorder,
              boxShadow: loginTheme.cardShadow,
            }}
          >
            <div className="mb-6 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl bg-white ring-1" style={{ '--tw-ring-color': loginTheme.logoRing }}>
                <img src={setup.loginCircleLogoUrl || villageLogo} alt="Village Logo" className="h-10 w-10 rounded-xl object-cover" />
              </div>
              <div className="mt-3 text-[16px] font-bold tracking-tight" style={{ color: loginTheme.subtitleColor }}>{setup.villageName}</div>
              <div className="mt-3 text-[22px] font-extrabold tracking-tight" style={{ color: loginTheme.titleColor }}>{mode === 'login' ? 'Sign In' : mode === 'register' ? 'ลงทะเบียนผู้ใช้งาน' : 'Forgot Password'}</div>
            </div>

            {mode === 'login' && (
              <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                <div>
                  <input
                    id="username"
                    type="text"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    required
                    autoComplete="username"
                    placeholder="User ID"
                    className="w-full rounded-[12px] border px-4 py-[11px] text-[15px] text-slate-800 placeholder:text-slate-400 outline-none transition focus:border-[#6e8fc1] focus:ring-4 focus:ring-[#a8c0e7]/25"
                    style={{ borderColor: loginTheme.fieldBorder, background: loginTheme.fieldBackground }}
                  />
                </div>

                <div>
                  <div className="relative">
                    <input
                      id="password"
                      type={showPass ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      onKeyUp={handlePasswordKeyState}
                      onKeyDown={handlePasswordKeyState}
                      required
                      autoComplete="current-password"
                      placeholder="Password"
                      className="w-full rounded-[12px] border px-4 py-[11px] pr-12 text-[15px] text-slate-800 placeholder:text-slate-400 outline-none transition focus:border-[#6e8fc1] focus:ring-4 focus:ring-[#a8c0e7]/25"
                      style={{ borderColor: loginTheme.fieldBorder, background: loginTheme.fieldBackground }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass(v => !v)}
                      className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-base text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                      title={showPass ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}
                      aria-label={showPass ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}
                    >
                      {showPass ? '🙈' : '👁️'}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3 text-xs font-semibold">
                  <button type="button" className="hover:text-[#4f6ea5]" style={{ color: loginTheme.secondaryLink }} onClick={() => switchMode('register')}>ลงทะเบียนผู้ใช้งาน</button>
                  <button type="button" className="hover:text-[#4f6ea5]" style={{ color: loginTheme.secondaryLink }} onClick={() => switchMode('forgot')}>Forgot Password?</button>
                </div>

                {capsLockOn && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800" role="status" aria-live="polite">
                    เปิด Caps Lock อยู่ อาจทำให้รหัสผ่านไม่ถูกต้อง
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting || !username || !password}
                  className="mt-1 w-full rounded-full px-4 py-2.5 text-[24px] font-semibold text-white shadow-[0_10px_24px_rgba(63,99,189,0.35)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-55"
                  style={{ background: loginTheme.primaryButton }}
                >
                  {submitting ? 'Signing in...' : 'Sign In'}
                </button>
              </form>
            )}

            {mode === 'register' && (
              <form onSubmit={handleRegisterSubmit} className="space-y-3" noValidate>
                <input value={registerUsername} onChange={(e) => setRegisterUsername(e.target.value)} required placeholder="Username" className="w-full rounded-[12px] border px-4 py-[11px] text-[15px] text-slate-800 placeholder:text-slate-400 outline-none transition focus:border-[#6e8fc1] focus:ring-4 focus:ring-[#a8c0e7]/25" style={{ borderColor: loginTheme.fieldBorder, background: loginTheme.fieldBackground }} />
                <input value={registerHouseNo} onChange={(e) => setRegisterHouseNo(e.target.value)} required placeholder="บ้านเลขที่" className="w-full rounded-[12px] border px-4 py-[11px] text-[15px] text-slate-800 placeholder:text-slate-400 outline-none transition focus:border-[#6e8fc1] focus:ring-4 focus:ring-[#a8c0e7]/25" style={{ borderColor: loginTheme.fieldBorder, background: loginTheme.fieldBackground }} />
                <input value={registerPhone} onChange={(e) => setRegisterPhone(e.target.value)} required placeholder="เบอร์โทรศัพท์ (ตามข้อมูลบ้าน)" className="w-full rounded-[12px] border px-4 py-[11px] text-[15px] text-slate-800 placeholder:text-slate-400 outline-none transition focus:border-[#6e8fc1] focus:ring-4 focus:ring-[#a8c0e7]/25" style={{ borderColor: loginTheme.fieldBorder, background: loginTheme.fieldBackground }} />
                <input type="password" value={registerPassword} onChange={(e) => setRegisterPassword(e.target.value)} required placeholder="กำหนดรหัสผ่าน" className="w-full rounded-[12px] border px-4 py-[11px] text-[15px] text-slate-800 placeholder:text-slate-400 outline-none transition focus:border-[#6e8fc1] focus:ring-4 focus:ring-[#a8c0e7]/25" style={{ borderColor: loginTheme.fieldBorder, background: loginTheme.fieldBackground }} />
                <input type="password" value={registerConfirmPassword} onChange={(e) => setRegisterConfirmPassword(e.target.value)} required placeholder="ยืนยันรหัสผ่าน" className="w-full rounded-[12px] border px-4 py-[11px] text-[15px] text-slate-800 placeholder:text-slate-400 outline-none transition focus:border-[#6e8fc1] focus:ring-4 focus:ring-[#a8c0e7]/25" style={{ borderColor: loginTheme.fieldBorder, background: loginTheme.fieldBackground }} />
                <div className="flex items-center justify-between text-xs font-semibold">
                  <button type="button" className="hover:text-[#4f6ea5]" style={{ color: loginTheme.secondaryLink }} onClick={() => switchMode('login')}>กลับหน้า Sign In</button>
                </div>
                <button type="submit" disabled={submitting} className="mt-1 w-full rounded-full px-4 py-2.5 text-[18px] font-semibold text-white shadow-[0_10px_24px_rgba(63,99,189,0.35)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-55" style={{ background: loginTheme.primaryButton }}>{submitting ? 'กำลังส่งคำขอ...' : 'ส่งคำขอลงทะเบียน'}</button>
              </form>
            )}

            {mode === 'forgot' && (
              <form onSubmit={handleResetPasswordSubmit} className="space-y-3" noValidate>
                <input value={resetUsername} onChange={(e) => setResetUsername(e.target.value)} required placeholder="Username" className="w-full rounded-[12px] border px-4 py-[11px] text-[15px] text-slate-800 placeholder:text-slate-400 outline-none transition focus:border-[#6e8fc1] focus:ring-4 focus:ring-[#a8c0e7]/25" style={{ borderColor: loginTheme.fieldBorder, background: loginTheme.fieldBackground }} />
                <input value={resetHouseNo} onChange={(e) => setResetHouseNo(e.target.value)} required placeholder="บ้านเลขที่" className="w-full rounded-[12px] border px-4 py-[11px] text-[15px] text-slate-800 placeholder:text-slate-400 outline-none transition focus:border-[#6e8fc1] focus:ring-4 focus:ring-[#a8c0e7]/25" style={{ borderColor: loginTheme.fieldBorder, background: loginTheme.fieldBackground }} />
                <input value={resetPhone} onChange={(e) => setResetPhone(e.target.value)} required placeholder="เบอร์โทรศัพท์ที่ลงทะเบียนไว้" className="w-full rounded-[12px] border px-4 py-[11px] text-[15px] text-slate-800 placeholder:text-slate-400 outline-none transition focus:border-[#6e8fc1] focus:ring-4 focus:ring-[#a8c0e7]/25" style={{ borderColor: loginTheme.fieldBorder, background: loginTheme.fieldBackground }} />
                <input type="password" value={resetPassword} onChange={(e) => setResetPassword(e.target.value)} required placeholder="รหัสผ่านใหม่" className="w-full rounded-[12px] border px-4 py-[11px] text-[15px] text-slate-800 placeholder:text-slate-400 outline-none transition focus:border-[#6e8fc1] focus:ring-4 focus:ring-[#a8c0e7]/25" style={{ borderColor: loginTheme.fieldBorder, background: loginTheme.fieldBackground }} />
                <input type="password" value={resetConfirmPassword} onChange={(e) => setResetConfirmPassword(e.target.value)} required placeholder="ยืนยันรหัสผ่านใหม่" className="w-full rounded-[12px] border px-4 py-[11px] text-[15px] text-slate-800 placeholder:text-slate-400 outline-none transition focus:border-[#6e8fc1] focus:ring-4 focus:ring-[#a8c0e7]/25" style={{ borderColor: loginTheme.fieldBorder, background: loginTheme.fieldBackground }} />
                <div className="flex items-center justify-between text-xs font-semibold">
                  <button type="button" className="hover:text-[#4f6ea5]" style={{ color: loginTheme.secondaryLink }} onClick={() => switchMode('login')}>กลับหน้า Sign In</button>
                </div>
                <button type="submit" disabled={submitting} className="mt-1 w-full rounded-full px-4 py-2.5 text-[18px] font-semibold text-white shadow-[0_10px_24px_rgba(63,99,189,0.35)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-55" style={{ background: loginTheme.primaryButton }}>{submitting ? 'กำลังเปลี่ยนรหัสผ่าน...' : 'เปลี่ยนรหัสผ่าน'}</button>
              </form>
            )}

            {infoMessage && (
              <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium leading-5 text-emerald-700" role="status">
                {infoMessage}
              </div>
            )}

            {error && (
              <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium leading-5 text-rose-700" role="alert">
                {error}
              </div>
            )}

            <div className="mt-5 border-t border-slate-200/80 pt-3 text-center text-[10px] text-slate-400">
              build {BUILD_SHA} · {BUILD_DATE} · v{APP_VERSION} · theme: {loginTheme.id}
            </div>
          </div>
        </div>

        <div className="text-center text-[11px] font-semibold" style={{ color: loginTheme.footerColor }}>©Workplaze™ All Rights Reserved 2026</div>
      </div>
    </div>
  )
}
