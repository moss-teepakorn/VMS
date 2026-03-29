import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import bcrypt from 'bcryptjs'
import { insertLoginLog } from '../lib/loginLogs'

const AuthContext = createContext(null)
const SESSION_KEY = 'vms-local-auth'
const PERSISTENT_BRANDING_KEYS = new Set([
  'vms-login-circle-logo-url',
  'vms-login-circle-logo-path',
  'vms-setup-village-name',
])

export function clearClientStorage() {
  const keysToRemove = []
  for (let i = 0; i < localStorage.length; i += 1) {
    const key = localStorage.key(i)
    if (!key) continue
    if (PERSISTENT_BRANDING_KEYS.has(key)) continue
    if (key === SESSION_KEY || key.startsWith('vms-')) keysToRemove.push(key)
  }
  keysToRemove.forEach((key) => localStorage.removeItem(key))
  sessionStorage.clear()
  // Clear all browser cookies for this domain
  document.cookie.split(';').forEach((cookie) => {
    const name = cookie.split('=')[0].trim()
    if (name) {
      document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`
    }
  })
}

function safeParse(value) {
  try {
    return JSON.parse(value)
  } catch {
    return null
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const isDirectOpen = Boolean(
      window.location.pathname !== '/login'
      && (!document.referrer || !document.referrer.startsWith(window.location.origin)),
    )

    if (isDirectOpen) {
      clearClientStorage()
    }

    const raw = localStorage.getItem(SESSION_KEY)
    const session = safeParse(raw)
    if (session?.user && session?.profile) {
      setUser(session.user)
      setProfile(session.profile)
    }
    setLoading(false)
  }, [])

  async function signIn(username, password) {
    try {
      const normalized = (username || '').trim().toLowerCase()
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, password_hash, role, house_id, full_name, phone, email, is_active, created_at, last_login_at')
        .eq('username', normalized)
        .maybeSingle()

      if (error) return { error }
      if (!data) return { error: { message: 'ไม่พบผู้ใช้งาน' } }
      if (!data.is_active) return { error: { message: 'บัญชีถูกปิดการใช้งาน' } }

      const ok = await bcrypt.compare(password || '', data.password_hash || '')
      if (!ok) return { error: { message: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' } }

      const nowIso = new Date().toISOString()
      await supabase
        .from('profiles')
        .update({ last_login_at: nowIso })
        .eq('id', data.id)

      const nextProfile = { ...data, last_login_at: nowIso }
      const nextUser = { id: data.id, username: data.username }
      setUser(nextUser)
      setProfile(nextProfile)
      localStorage.setItem(SESSION_KEY, JSON.stringify({ user: nextUser, profile: nextProfile }))
      // บันทึก login log
      insertLoginLog({
        user_id: data.id,
        username: data.username,
        full_name: data.full_name || null,
        role: data.role || null,
      })
      return { error: null }
    } catch (error) {
      return { error }
    }
  }

  async function signOut() {
    clearClientStorage()
    setUser(null)
    setProfile(null)
  }

  const logout = signOut

  const isAdmin = profile?.role === 'admin'
  const isResident = profile?.role === 'resident'

  return (
    <AuthContext.Provider value={{ user, profile, loading, isAdmin, isResident, signIn, signOut, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
