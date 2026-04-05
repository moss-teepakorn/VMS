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
    <div className="relative min-h-screen overflow-hidden bg-[linear-gradient(180deg,#c9dff2_0%,#c7dcf0_40%,#d1e4f6_100%)]">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-24 top-24 h-72 w-72 rounded-full bg-white/35 blur-3xl" />
        <div className="absolute left-1/2 top-1/3 h-80 w-80 -translate-x-1/2 rounded-full bg-[#b5d6f2]/50 blur-3xl" />
        <div className="absolute bottom-16 right-12 h-72 w-72 rounded-full bg-white/25 blur-3xl" />
      </div>

      <div className="relative z-10 flex min-h-screen flex-col px-4 py-5 sm:px-8 sm:py-7">
        <div className="flex items-center justify-between">
          <div className="inline-flex items-center gap-2 rounded-full px-2 py-1 text-slate-900">
            <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-xl bg-white/70 shadow-[0_8px_20px_rgba(36,74,112,0.12)] ring-1 ring-white/80">
              <img src={setup.loginCircleLogoUrl || villageLogo} alt="Village Logo" className="h-7 w-7 rounded-lg object-cover" />
            </div>
            <div className="text-[28px] font-black tracking-tight">{setup.villageName}</div>
          </div>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-full border border-white/55 bg-white/45 px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-[0_6px_16px_rgba(36,74,112,0.1)]"
            aria-label="language"
          >
            EN
            <span className="text-[10px]">▾</span>
          </button>
        </div>

        <div className="flex flex-1 items-center justify-center py-7">
          <div className="w-full max-w-[430px] rounded-[20px] border border-white/60 bg-white/72 px-5 py-6 shadow-[0_24px_60px_rgba(42,77,114,0.18)] backdrop-blur-[3px] sm:px-6 sm:py-7">
            <div className="mb-6 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl bg-white ring-1 ring-[#d8e4f2]">
                <img src={setup.loginCircleLogoUrl || villageLogo} alt="Village Logo" className="h-10 w-10 rounded-xl object-cover" />
              </div>
              <div className="mt-4 text-[22px] font-extrabold tracking-tight text-slate-800">Sign In</div>
            </div>

            <button
              type="button"
              onClick={handleForgotPassword}
              className="mb-4 flex w-full items-center justify-center gap-2 rounded-[14px] border border-[#86a7d8] bg-white px-4 py-2.5 text-sm font-semibold text-[#5378b8] transition hover:bg-[#f4f8ff]"
            >
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-[4px] bg-[#f3f7ff] text-[11px]">◻</span>
              Microsoft 365
            </button>

            <div className="mb-4 flex items-center gap-3 text-xs font-semibold text-slate-400">
              <span className="h-px flex-1 bg-slate-200" />
              Or
              <span className="h-px flex-1 bg-slate-200" />
            </div>

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
                  className="w-full rounded-[12px] border border-[#d8e1ea] bg-white px-4 py-[11px] text-[15px] text-slate-800 placeholder:text-slate-400 outline-none transition focus:border-[#6e8fc1] focus:ring-4 focus:ring-[#a8c0e7]/25"
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
                    className="w-full rounded-[12px] border border-[#d8e1ea] bg-white px-4 py-[11px] pr-12 text-[15px] text-slate-800 placeholder:text-slate-400 outline-none transition focus:border-[#6e8fc1] focus:ring-4 focus:ring-[#a8c0e7]/25"
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

              <div className="flex items-center justify-between gap-3">
                <label className="inline-flex cursor-pointer items-center gap-2 text-xs text-slate-600 select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-[#4668c0] focus:ring-[#8ba8d9]"
                  />
                  จดจำชื่อผู้ใช้
                </label>
                <button type="button" className="text-xs font-semibold text-[#6f8dc0] hover:text-[#4f6ea5]" onClick={handleForgotPassword}>Forgot Password?</button>
              </div>

              {capsLockOn && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800" role="status" aria-live="polite">
                  เปิด Caps Lock อยู่ อาจทำให้รหัสผ่านไม่ถูกต้อง
                </div>
              )}

              {error && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium leading-5 text-rose-700" role="alert">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting || !username || !password}
                className="mt-1 w-full rounded-full bg-[linear-gradient(180deg,#4f72cd_0%,#3f63bd_100%)] px-4 py-2.5 text-[24px] font-semibold text-white shadow-[0_10px_24px_rgba(63,99,189,0.35)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-55"
              >
                {submitting ? 'Signing in...' : 'Sign In'}
              </button>
            </form>

            <div className="mt-5 border-t border-slate-200/80 pt-3 text-center text-[10px] text-slate-400">
              build {BUILD_SHA} · {BUILD_DATE} · v{APP_VERSION}
            </div>
          </div>
        </div>

        <div className="text-right text-[11px] font-semibold text-[#7f95ac]">©Workplaze™ All Rights Reserved 2026</div>
      </div>
    </div>
  )
}
