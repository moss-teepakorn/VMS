import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { clearClientStorage } from '../contexts/AuthContext'
import { applyDocumentTitle, getSetupConfig } from '../lib/setup'
import villageLogo from '../assets/village-logo.svg'

const BUILD_SHA = typeof __BUILD_SHA__ !== 'undefined' ? __BUILD_SHA__ : 'local'
const BUILD_DATE = typeof __BUILD_DATE__ !== 'undefined' ? __BUILD_DATE__ : '-'
const APP_VERSION = '1.0.0'
const REMEMBER_USERNAME_KEY = 'remember-username'

export default function LoginPage() {
  const { signIn, user, profile, loading } = useAuth()
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(() => Boolean(localStorage.getItem(REMEMBER_USERNAME_KEY)))
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [showPass, setShowPass] = useState(false)
  const [capsLockOn, setCapsLockOn] = useState(false)
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
    const remembered = localStorage.getItem(REMEMBER_USERNAME_KEY)
    if (remembered) setUsername(remembered)
  }, [])

  useEffect(() => {
    const loadSetup = async () => {
      const next = await getSetupConfig()
      setSetup(next)
      applyDocumentTitle(next.villageName)
    }
    loadSetup()
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    const { error } = await signIn(username, password)
    if (error) {
      setError(error.message || 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง')
      setSubmitting(false)
      return
    }

    if (rememberMe) {
      localStorage.setItem(REMEMBER_USERNAME_KEY, username.trim())
    } else {
      localStorage.removeItem(REMEMBER_USERNAME_KEY)
    }
  }

  const handlePasswordKeyState = (e) => {
    setCapsLockOn(Boolean(e.getModifierState?.('CapsLock')))
  }

  const handleForgotPassword = () => {
    setError('กรุณาติดต่อผู้ดูแลระบบเพื่อรีเซ็ตรหัสผ่าน')
  }

  return (
    <div className="min-h-screen bg-[linear-gradient(160deg,#e8eef5_0%,#d9e6ef_45%,#e6f4ef_100%)] flex items-center justify-center p-4 sm:p-8">
      <div className="w-full max-w-[1100px] rounded-[28px] overflow-hidden bg-white shadow-[0_26px_70px_rgba(15,23,42,0.18)] border border-[#e3e8ee]">
        <div className="grid grid-cols-1 lg:grid-cols-[40%_60%] min-h-[620px]">
          <div className="hidden lg:flex relative overflow-hidden bg-[linear-gradient(145deg,#0f3f66_0%,#116d84_45%,#0f9a87_100%)] text-white">
            <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,255,255,.5) 1px, transparent 0)', backgroundSize: '20px 20px' }} />
            <div className="absolute -top-10 -right-10 w-56 h-56 rounded-full bg-white/10" />
            <div className="absolute bottom-[-70px] left-[-40px] w-56 h-56 rounded-full bg-white/10" />
            <div className="relative z-10 p-10 w-full flex flex-col">
              <div className="w-20 h-20 rounded-2xl border border-white/35 bg-white/20 flex items-center justify-center overflow-hidden shadow-lg">
                <img src={setup.loginCircleLogoUrl || villageLogo} alt="setup-logo" className="w-16 h-16 rounded-xl object-cover" />
              </div>
              <div className="mt-8">
                <h1 className="text-3xl font-extrabold leading-tight">{setup.villageName}</h1>
                <p className="mt-3 text-white/85 text-sm leading-relaxed">ระบบบริหารหมู่บ้านที่ช่วยให้ทีมงานทำงานไวขึ้น โปร่งใสขึ้น และติดตามข้อมูลได้ครบ</p>
              </div>
              <div className="mt-8 space-y-3 text-sm font-medium">
                <div className="rounded-xl bg-white/15 border border-white/20 px-4 py-3">✔ จัดการข้อมูลลูกบ้านและบ้านเลขที่</div>
                <div className="rounded-xl bg-white/15 border border-white/20 px-4 py-3">✔ แจ้งซ่อมและติดตามสถานะแบบออนไลน์</div>
                <div className="rounded-xl bg-white/15 border border-white/20 px-4 py-3">✔ ชำระค่าส่วนกลางและตรวจสอบย้อนหลัง</div>
              </div>
            </div>
          </div>

          <div className="bg-white flex items-center justify-center px-6 py-10 sm:px-10">
            <div className="w-full max-w-[460px]">
              <div className="text-center lg:hidden mb-8">
                <img src={setup.loginCircleLogoUrl || villageLogo} alt="Village Logo" className="w-16 h-16 mx-auto rounded-xl object-cover shadow" />
              </div>

              <div className="mb-8">
                <h2 className="text-[42px] font-black text-[#0f172a] leading-none tracking-tight">เข้าสู่ระบบ</h2>
                <p className="mt-3 text-[15px] text-slate-500">กรุณากรอกข้อมูลเพื่อเข้าใช้งานระบบ</p>
                <div className="mt-4 h-[4px] w-20 rounded-full bg-gradient-to-r from-[#0f4570] to-[#0d968f]" />
              </div>

              <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                <div>
                  <label htmlFor="username" className="mb-2 block text-sm font-semibold text-slate-700">ชื่อผู้ใช้</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">👤</span>
                    <input
                      id="username"
                      type="text"
                      value={username}
                      onChange={e => setUsername(e.target.value)}
                      required
                      autoComplete="username"
                      placeholder="ชื่อผู้ใช้"
                      className="w-full rounded-[14px] border border-[#cfd9e3] bg-white px-11 py-[13px] text-[15px] text-slate-800 placeholder:text-slate-400 outline-none focus:border-[#0f6a7d] focus:ring-2 focus:ring-[#0f6a7d]/25"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="password" className="mb-2 block text-sm font-semibold text-slate-700">รหัสผ่าน</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">🔒</span>
                    <input
                      id="password"
                      type={showPass ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      onKeyUp={handlePasswordKeyState}
                      onKeyDown={handlePasswordKeyState}
                      required
                      autoComplete="current-password"
                      placeholder="รหัสผ่าน"
                      className="w-full rounded-[14px] border border-[#cfd9e3] bg-white px-11 py-[13px] pr-14 text-[15px] text-slate-800 placeholder:text-slate-400 outline-none focus:border-[#0f6a7d] focus:ring-2 focus:ring-[#0f6a7d]/25"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 h-9 w-9 rounded-lg text-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                      title="แสดงรหัสผ่าน"
                      aria-label="แสดงรหัสผ่าน"
                    >
                      {showPass ? '🙈' : '👁️'}
                    </button>
                  </div>
                </div>

                {capsLockOn && (
                  <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-2 text-sm text-amber-700">
                    เปิด Caps Lock อยู่ อาจทำให้รหัสผ่านผิด
                  </div>
                )}

                <div className="flex items-center justify-between text-sm">
                  <label className="inline-flex items-center gap-2 text-slate-600 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 text-[#0f6a7d] focus:ring-[#0f6a7d]"
                    />
                    Remember me
                  </label>
                  <button type="button" className="font-semibold text-[#0f6a7d] hover:text-[#0b5464]" onClick={handleForgotPassword}>Forgot password?</button>
                </div>

                {error && (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting || !username || !password}
                  className="mt-2 w-full rounded-[14px] bg-gradient-to-r from-[#0f4570] to-[#0d968f] py-[14px] text-[21px] font-extrabold tracking-tight text-white shadow-[0_12px_24px_rgba(15,106,125,0.35)] transition hover:brightness-110 hover:shadow-[0_16px_28px_rgba(15,106,125,0.42)] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {submitting ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
                </button>
              </form>

              <div className="mt-8 text-center text-[11px] text-slate-400">
                © 2026 {setup.villageName} · v{APP_VERSION}
              </div>
              <div className="mt-1 text-center text-[10px] text-slate-300">
                build {BUILD_SHA} · {BUILD_DATE}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
