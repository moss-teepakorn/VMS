import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { applyDocumentTitle, getSetupConfig } from '../lib/setup'
import villageLogo from '../assets/village-logo.svg'

const BUILD_SHA = typeof __BUILD_SHA__ !== 'undefined' ? __BUILD_SHA__ : 'local'
const BUILD_DATE = typeof __BUILD_DATE__ !== 'undefined' ? __BUILD_DATE__ : '-'
const APP_VERSION = '1.0.0'

export default function LoginPage() {
  const { signIn, user, profile, loading } = useAuth()
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [showPass, setShowPass] = useState(false)
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
    }
  }

  return (
    <div className="min-h-screen bg-[#e9edf3] flex items-center justify-center p-4 sm:p-8">
      <div className="w-full max-w-[980px] rounded-[26px] overflow-hidden bg-white shadow-[0_26px_70px_rgba(15,23,42,0.16)] border border-[#e6e9ef]">
        <div className="grid grid-cols-1 md:grid-cols-[42%_58%] min-h-[600px]">
          <div className="hidden md:flex relative overflow-hidden bg-gradient-to-br from-[#0f4570] via-[#0f6a7d] to-[#0d968f] text-white">
            <div className="absolute -top-10 -right-16 w-[300px] h-[300px] rounded-full bg-white/10" />
            <div className="absolute top-[110px] left-[160px] w-[122px] h-[122px] rounded-full border-2 border-white/28 bg-white/10 overflow-hidden flex items-center justify-center">
              <img
                src={setup.loginCircleLogoUrl || villageLogo}
                alt="setup-logo"
                className="w-[96px] h-[96px] rounded-full object-cover"
              />
            </div>
            <div className="absolute -bottom-28 -left-20 w-[260px] h-[260px] rounded-full bg-white/10" />

            <div className="relative z-10 flex flex-col justify-between p-10 w-full">
              <div />

              <div className="pb-4">
                <h1 className="text-[40px] font-bold leading-[1.12]">Village Management System</h1>
                <p className="mt-4 text-[16px] text-white/85 leading-relaxed max-w-[320px]">
                  ระบบบริหารจัดการหมู่บ้าน<br />คอนโดอย่างมีประสิทธิภาพ
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white flex items-center justify-center px-6 py-10 sm:px-10">
            <div className="w-full max-w-[420px]">
              <div className="text-center md:hidden mb-8">
                <img src={villageLogo} alt="Village Logo" className="w-16 h-16 mx-auto rounded-xl object-cover shadow" />
                <h1 className="mt-3 text-xl font-bold text-slate-800">เข้าสู่ระบบ</h1>
                <p className="text-sm text-slate-500">กรุณากรอกข้อมูลเพื่อเข้าใช้งาน</p>
              </div>

              <div className="hidden md:block text-center mb-10 -mt-1">
                <h2 className="text-[40px] font-extrabold text-[#0f172a] leading-tight">เข้าสู่ระบบ</h2>
                <p className="mt-2 text-[15px] text-slate-500">กรุณากรอกข้อมูลเพื่อเข้าใช้งาน</p>
                <div className="mx-auto mt-4 h-[4px] w-16 rounded-full bg-gradient-to-r from-[#0f4570] to-[#0d968f]" />
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <input
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  required
                  autoComplete="username"
                  placeholder="ชื่อผู้ใช้ (Username)"
                  className="w-full rounded-[14px] border border-[#dbe2ea] bg-[#f8fafc] px-4 py-[13px] text-[15px] text-slate-800 placeholder:text-slate-400 outline-none focus:border-[#0f6a7d] focus:bg-white"
                />

                <div className="relative">
                  <input
                    type={showPass ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    placeholder="รหัสผ่าน (Password)"
                    className="w-full rounded-[14px] border border-[#dbe2ea] bg-[#f8fafc] px-4 py-[13px] pr-12 text-[15px] text-slate-800 placeholder:text-slate-400 outline-none focus:border-[#0f6a7d] focus:bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700"
                    tabIndex={-1}
                  >
                    {showPass ? '🙈' : '👁️'}
                  </button>
                </div>

                {error && (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting || !username || !password}
                  className="mt-2 w-full rounded-[14px] bg-gradient-to-r from-[#0f4570] to-[#0d968f] py-[13px] text-[20px] font-extrabold tracking-tight text-white shadow-[0_8px_18px_rgba(15,106,125,0.28)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-45"
                >
                  {submitting ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
                </button>
              </form>

              <div className="mt-6 text-center text-[13px] text-slate-400">
                ยังไม่มีบัญชี? <span className="font-semibold text-[#0d7f83]">ลงทะเบียนที่นี่</span>
              </div>

              <div className="mt-8 text-center text-[11px] text-slate-400">
                © 2026 {setup.villageName} — {setup.appLineMain}
              </div>
              <div className="mt-1 text-center text-[10px] text-slate-300">
                version {APP_VERSION} | build {BUILD_SHA} | {BUILD_DATE}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
