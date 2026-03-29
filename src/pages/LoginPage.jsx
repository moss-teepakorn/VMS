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
    <div className="min-h-screen bg-[linear-gradient(180deg,#f6fafc_0%,#eef4f7_100%)] p-4 sm:p-6 lg:p-8">
      <div className="mx-auto grid min-h-[calc(100vh-2rem)] w-full max-w-[1000px] grid-cols-1 overflow-hidden rounded-[32px] border border-slate-200/80 bg-white shadow-[0_26px_70px_rgba(15,23,42,0.10)] lg:min-h-[620px] lg:grid-cols-[43%_57%]">
        <section className="relative hidden overflow-hidden bg-[linear-gradient(160deg,#1a4a74_0%,#1f5d7f_60%,#207580_100%)] lg:flex">
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),transparent_42%)]" />
          <div className="absolute inset-y-10 right-10 w-px bg-white/10" />

          <div className="relative z-10 flex h-full w-full flex-col justify-between p-10 xl:p-12">
            <div>
              <div className="inline-flex items-center gap-3 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold text-white/90">
                <span className="inline-block h-2.5 w-2.5 rounded-full bg-emerald-300" />
                Secure access for village operations
              </div>

              <div className="mt-8 flex items-center gap-4">
                <div className="flex h-18 w-18 items-center justify-center overflow-hidden rounded-[22px] border border-white/20 bg-white/10 shadow-[0_16px_30px_rgba(0,0,0,0.14)]">
                  <img src={setup.loginCircleLogoUrl || villageLogo} alt="Village Logo" className="h-16 w-16 rounded-2xl object-cover" />
                </div>
                <div>
                  <div className="text-sm font-semibold uppercase tracking-[0.24em] text-white/75">Village Management System</div>
                  <h1 className="mt-2 text-[32px] font-black leading-tight text-white">{setup.villageName}</h1>
                </div>
              </div>

              <p className="mt-10 max-w-[430px] text-[16px] leading-7 text-white/80">
                ระบบกลางสำหรับจัดการข้อมูลลูกบ้าน การเงิน งานบริการ และประกาศสำคัญ ให้ทีมงานทำงานได้เร็ว ชัดเจน และตรวจสอบย้อนหลังได้
              </p>

              <div className="mt-10 space-y-4">
                <div className="flex items-start gap-3 text-white/85">
                  <span className="mt-1 inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/12 text-xs font-bold">01</span>
                  <div>
                    <div className="text-sm font-semibold text-white">ข้อมูลสำคัญอยู่ในมุมมองเดียว</div>
                    <div className="mt-1 text-sm leading-6 text-white/80">บ้าน รถ การชำระเงิน และประวัติการใช้งาน ถูกจัดไว้พร้อมใช้งาน</div>
                  </div>
                </div>
                <div className="flex items-start gap-3 text-white/85">
                  <span className="mt-1 inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/12 text-xs font-bold">02</span>
                  <div>
                    <div className="text-sm font-semibold text-white">รองรับงานประจำวันของเจ้าหน้าที่</div>
                    <div className="mt-1 text-sm leading-6 text-white/80">ลดขั้นตอนซ้ำซ้อนและช่วยติดตามสถานะงานได้ต่อเนื่อง</div>
                  </div>
                </div>
                <div className="flex items-start gap-3 text-white/85">
                  <span className="mt-1 inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/12 text-xs font-bold">03</span>
                  <div>
                    <div className="text-sm font-semibold text-white">ตรวจสอบย้อนหลังได้ชัดเจน</div>
                    <div className="mt-1 text-sm leading-6 text-white/80">ทุกการใช้งานและรายการสำคัญสามารถติดตามย้อนหลังได้</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 text-white">
              <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-4">
                <div className="text-2xl font-black">24/7</div>
                <div className="mt-1 text-xs text-white/80">Availability</div>
              </div>
              <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-4">
                <div className="text-2xl font-black">1 View</div>
                <div className="mt-1 text-xs text-white/80">Operations</div>
              </div>
              <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-4">
                <div className="text-2xl font-black">100%</div>
                <div className="mt-1 text-xs text-white/80">Traceable</div>
              </div>
            </div>
          </div>
        </section>

        <section className="relative flex items-center justify-center bg-[linear-gradient(180deg,#ffffff_0%,#f8fbfc_100%)] px-5 py-8 sm:px-8 sm:py-10 lg:px-12">
          <div className="absolute inset-x-0 top-0 h-32 bg-[radial-gradient(circle_at_top,rgba(15,118,110,0.05),transparent_68%)]" />
          <div className="relative z-10 w-full max-w-[470px]">
            <div className="mb-6 flex items-center gap-4 lg:hidden">
              <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl bg-white shadow-[0_12px_28px_rgba(15,23,42,0.12)] ring-1 ring-slate-200">
                <img src={setup.loginCircleLogoUrl || villageLogo} alt="Village Logo" className="h-11 w-11 rounded-xl object-cover" />
              </div>
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Village Management System</div>
                <div className="mt-1 text-lg font-extrabold text-slate-900">{setup.villageName}</div>
              </div>
            </div>

            <div className="rounded-[28px] border border-slate-200 bg-white px-6 py-7 shadow-[0_18px_44px_rgba(15,23,42,0.08)] sm:px-8 sm:py-9">
              <div className="mb-8">
                <div className="inline-flex items-center rounded-full bg-[#edf7f6] px-3 py-1 text-xs font-bold uppercase tracking-[0.22em] text-[#0f766e]">
                  Secure sign in
                </div>
                <h2 className="mt-4 text-[38px] font-black leading-none tracking-tight text-slate-950">เข้าสู่ระบบ</h2>
                <p className="mt-3 text-[15px] leading-7 text-slate-500">
                  เข้าสู่ระบบเพื่อเข้าถึงแดชบอร์ดและจัดการงานประจำวันของหมู่บ้านได้อย่างต่อเนื่อง
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5" noValidate>
                <div>
                  <label htmlFor="username" className="mb-2 block text-sm font-semibold text-slate-700">ชื่อผู้ใช้</label>
                  <input
                    id="username"
                    type="text"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    required
                    autoComplete="username"
                    placeholder="กรอกชื่อผู้ใช้"
                    className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-[14px] text-[15px] text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-[#0f766e] focus:bg-white focus:ring-4 focus:ring-[#0f766e]/10"
                  />
                </div>

                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <label htmlFor="password" className="block text-sm font-semibold text-slate-700">รหัสผ่าน</label>
                    <button type="button" className="text-sm font-semibold text-[#0f766e] hover:text-[#0b5b55]" onClick={handleForgotPassword}>ลืมรหัสผ่าน?</button>
                  </div>
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
                      placeholder="กรอกรหัสผ่าน"
                      className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-[14px] pr-14 text-[15px] text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-[#0f766e] focus:bg-white focus:ring-4 focus:ring-[#0f766e]/10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass(v => !v)}
                      className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-xl text-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
                      title={showPass ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}
                      aria-label={showPass ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}
                    >
                      {showPass ? '🙈' : '👁️'}
                    </button>
                  </div>
                </div>

                {capsLockOn && (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800" role="status" aria-live="polite">
                    เปิด Caps Lock อยู่ อาจทำให้รหัสผ่านไม่ถูกต้อง
                  </div>
                )}

                <label className="flex items-center gap-3 text-sm text-slate-600 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-[#0f766e] focus:ring-[#0f766e]"
                  />
                  จดจำชื่อผู้ใช้ในอุปกรณ์นี้
                </label>

                {error && (
                  <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium leading-6 text-rose-700" role="alert">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting || !username || !password}
                  className="w-full rounded-2xl bg-[linear-gradient(135deg,#0f3f66_0%,#0f766e_100%)] px-4 py-[15px] text-[19px] font-extrabold tracking-tight text-white shadow-[0_18px_36px_rgba(15,118,110,0.24)] transition hover:-translate-y-0.5 hover:brightness-105 hover:shadow-[0_22px_40px_rgba(15,118,110,0.28)] disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {submitting ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
                </button>
              </form>

              <div className="mt-8 border-t border-slate-100 pt-5 text-center">
                <div className="text-[11px] text-slate-400">© 2026 {setup.villageName} · v{APP_VERSION}</div>
                <div className="mt-1 text-[10px] text-slate-300">build {BUILD_SHA} · {BUILD_DATE}</div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
