import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function LoginPage() {
  const { signIn, user, profile, loading } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [showPass, setShowPass] = useState(false)

  // ถ้า login แล้ว redirect ไปหน้าที่ถูก
  useEffect(() => {
    if (!loading && user && profile) {
      navigate(profile.role === 'admin' ? '/admin/dashboard' : '/resident/home', { replace: true })
    }
  }, [user, profile, loading, navigate])

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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4 relative overflow-hidden">

      {/* Background decoration */}
      <div className="absolute inset-0 pointer-events-none select-none">
        <div className="absolute top-[-10%] left-[-5%] w-[500px] h-[500px] rounded-full bg-blue-500/5 blur-3xl" />
        <div className="absolute bottom-[-10%] right-[-5%] w-[600px] h-[600px] rounded-full bg-green-500/5 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full border border-white/[0.02]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full border border-white/[0.03]" />
      </div>

      <div className="w-full max-w-sm relative z-10">

        {/* Logo + Title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-green-500 mb-4 shadow-lg shadow-blue-500/25">
            <svg viewBox="0 0 32 32" fill="none" className="w-9 h-9">
              <path d="M4 28 L4 14 L16 6 L28 14 L28 28 Z" stroke="white" strokeWidth="1.5" strokeLinejoin="round" fill="none"/>
              <path d="M12 28 L12 20 L20 20 L20 28" stroke="white" strokeWidth="1.5" strokeLinejoin="round" fill="none"/>
              <path d="M9 17 L16 12 L23 17" stroke="white" strokeWidth="1" strokeOpacity="0.5" fill="none"/>
            </svg>
          </div>
          <h1 className="text-2xl font-semibold text-white tracking-tight">The Greenfield</h1>
          <p className="text-sm text-slate-400 mt-1">ระบบจัดการหมู่บ้าน</p>
        </div>

        {/* Card */}
        <div className="bg-white/[0.06] backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-2xl">

          <h2 className="text-base font-medium text-white mb-5">เข้าสู่ระบบ</h2>

          <form onSubmit={handleSubmit} className="space-y-4">

            {/* Email */}
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">
                อีเมล
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
                placeholder="your@email.com"
                className="w-full bg-white/[0.08] border border-white/10 rounded-lg px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-400 focus:bg-white/[0.12] transition"
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">
                รหัสผ่าน
              </label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="w-full bg-white/[0.08] border border-white/10 rounded-lg px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-400 focus:bg-white/[0.12] transition pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition"
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
              <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2.5">
                <svg className="w-4 h-4 text-red-400 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                </svg>
                <p className="text-xs text-red-300">{error}</p>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={submitting || !email || !password}
              className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-lg py-2.5 text-sm font-medium transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 mt-2"
            >
              {submitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>กำลังเข้าสู่ระบบ...</span>
                </>
              ) : 'เข้าสู่ระบบ'}
            </button>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-slate-600 mt-6">
          นิติบุคคลหมู่บ้านเดอะกรีนฟิลด์ &nbsp;·&nbsp; v2.2
        </p>
      </div>
    </div>
  )
}
