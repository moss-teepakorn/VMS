import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { applyDocumentTitle, getSetupConfig } from '../lib/setup'
import villageLogo from '../assets/village-logo.svg'

export default function LoginPage() {
  const { signIn, user, profile, loading } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
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
    const { error } = await signIn(email, password)
    if (error) {
      setError('อีเมลหรือรหัสผ่านไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง')
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-700 via-cyan-600 to-emerald-500 flex items-center justify-center p-3 sm:p-6 relative overflow-hidden">

      {/* Background decoration */}
      <div className="absolute inset-0 pointer-events-none select-none">
        <div className="absolute top-[-8%] left-[-5%] w-[520px] h-[520px] rounded-full bg-sky-300/20 blur-3xl" />
        <div className="absolute bottom-[-12%] right-[-6%] w-[560px] h-[560px] rounded-full bg-emerald-300/20 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.18),transparent_38%),radial-gradient(circle_at_85%_15%,rgba(255,255,255,0.12),transparent_34%),radial-gradient(circle_at_80%_78%,rgba(255,255,255,0.14),transparent_30%)]" />
      </div>

      <div className="w-full max-w-[980px] relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 rounded-3xl overflow-hidden shadow-2xl shadow-slate-900/30 border border-white/30 bg-white/10 backdrop-blur-md min-h-[620px]">
          <div className="hidden lg:flex flex-col justify-between p-10 bg-gradient-to-br from-sky-700/55 to-emerald-600/55 text-white">
            <div>
              <div className="inline-flex items-center gap-3 rounded-2xl px-4 py-3 bg-white/20 border border-white/30">
                <img src={villageLogo} alt="Village Logo" className="w-12 h-12 rounded-xl object-cover" />
                <div>
                  <div className="text-lg font-semibold leading-tight">{setup.villageName}</div>
                  <div className="text-xs text-white/80">{setup.appLineMain} {setup.appLineTail}</div>
                </div>
              </div>
              <h1 className="mt-8 text-4xl font-bold leading-tight">Village Management<br />System</h1>
              <p className="mt-4 text-sm text-white/85 max-w-md">ระบบบริหารหมู่บ้าน จัดการทะเบียนลูกบ้าน ยานพาหนะ และค่าส่วนกลางอย่างเป็นระบบ พร้อมการสื่สารระหว่างลูกบ้านและนิติแบบครบวงจร</p>
              <div className="mt-6">
                <p className="text-xs text-white/70">{setup.address}</p>
              </div>
            </div>
            <div className="text-xs text-white/80">{setup.villageName} · {setup.version}</div>
          </div>

          <div className="flex items-center justify-center p-8 sm:p-12 bg-white/92">
            <div className="w-full max-w-lg">
              <div className="text-center mb-8 lg:hidden">
                <img src={villageLogo} alt="Village Logo" className="w-20 h-20 mx-auto rounded-2xl object-cover shadow-md" />
                <h1 className="text-3xl font-bold text-slate-800 mt-4">{setup.villageName}</h1>
                <p className="text-xs text-slate-500 mt-1">{setup.appLineMain}</p>
                <p className="text-xs text-slate-400 mt-0.5" style={{ fontSize: '6px' }}>{setup.appLineTail}</p>
              </div>

              <div className="bg-white border border-slate-200 rounded-3xl p-8 sm:p-10 shadow-xl">
                <h2 className="text-2xl font-bold text-slate-800 mb-2">เข้าสู่ระบบ</h2>
                <p className="text-base text-slate-500 mb-7">กรอกข้อมูลเพื่อเข้าสู่ระบบจัดการหมู่บ้าน</p>

                <form onSubmit={handleSubmit} className="space-y-5">

                  {/* Email */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-600 mb-2">ชื่อผู้ใช้</label>
                    <input
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      required
                      autoComplete="email"
                      placeholder="username@email.com"
                      className="w-full bg-white border border-slate-300 rounded-lg px-4 py-3 text-base text-slate-800 placeholder-slate-400 focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-200 transition"
                    />
                  </div>

                  {/* Password */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-600 mb-2">รหัสผ่าน</label>
                    <div className="relative">
                      <input
                        type={showPass ? 'text' : 'password'}
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        required
                        autoComplete="current-password"
                        placeholder="กรอกรหัสผ่าน"
                        className="w-full bg-white border border-slate-300 rounded-lg px-4 py-3 text-base text-slate-800 placeholder-slate-400 focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-200 transition pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPass(v => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700 transition"
                        tabIndex={-1}
                      >
                        {showPass ? (
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                          </svg>
                        ) : (
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Error */}
                  {error && (
                    <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
                      <svg className="w-5 h-5 text-red-500 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                      </svg>
                      <p className="text-sm text-red-600">{error}</p>
                    </div>
                  )}

                  {/* Submit */}
                  <button
                    type="submit"
                    disabled={submitting || !email || !password}
                    className="w-full bg-gradient-to-r from-sky-600 to-blue-700 hover:from-sky-700 hover:to-blue-800 text-white rounded-lg py-3 text-base font-semibold transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-sky-500/20 flex items-center justify-center gap-2 mt-3"
                  >
                    {submitting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>กำลังเข้าสู่ระบบ...</span>
                      </>
                    ) : '🔑 เข้าสู่ระบบ'}
                  </button>
                </form>
              </div>

              <div className="mt-6 text-center">
                <p className="text-xs text-slate-500 mb-1">{setup.villageName}</p>
                <p className="text-xs text-slate-400">{setup.version}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
