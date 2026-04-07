import bcrypt from 'bcryptjs'
import { supabase } from './supabase'
import { isReservedAdminUsername } from './reservedUsernames'

function normalizeText(value) {
  return String(value || '').trim()
}

function normalizeLower(value) {
  return normalizeText(value).toLowerCase()
}

function normalizePhoneDigits(value) {
  return normalizeText(value).replace(/[^0-9]/g, '')
}

function isAccountRequestInsertDenied(error) {
  const code = String(error?.code || '').toLowerCase()
  const statusRaw = error?.status
  const status = Number.isFinite(Number(statusRaw)) ? Number(statusRaw) : 0
  const message = String(error?.message || '').toLowerCase()
  const details = String(error?.details || '').toLowerCase()
  const hint = String(error?.hint || '').toLowerCase()
  const text = [message, details, hint, String(error || '').toLowerCase()].join(' | ')

  return code === '42501'
    || code === 'pgrst301'
    || status === 401
    || status === 403
    || text.includes('row-level security')
    || text.includes('policy')
    || text.includes('unauthorized')
    || text.includes('permission denied')
    || text.includes('not allowed')
}

async function findHouseByHouseNoAndPhone({ houseNo, phone }) {
  const normalizedHouseNo = normalizeLower(houseNo)
  const normalizedPhone = normalizePhoneDigits(phone)

  if (!normalizedHouseNo || !normalizedPhone) {
    throw new Error('กรุณาระบุบ้านเลขที่และเบอร์โทรศัพท์')
  }

  const { data, error } = await supabase
    .from('houses')
    .select('id, house_no, soi, owner_name, phone')
    .ilike('house_no', houseNo)
    .limit(20)

  if (error) throw error

  const matched = (data || []).find((row) => {
    const rowHouseNo = normalizeLower(row.house_no)
    const rowPhone = normalizePhoneDigits(row.phone)
    return rowHouseNo === normalizedHouseNo && rowPhone === normalizedPhone
  })

  if (!matched) {
    throw new Error('ไม่พบข้อมูลบ้านเลขที่และเบอร์โทรศัพท์ที่ตรงกัน')
  }

  return matched
}

async function ensureUsernameAvailable(username) {
  const normalizedUsername = normalizeLower(username)
  if (!normalizedUsername) throw new Error('กรุณาระบุชื่อผู้ใช้')
  if (isReservedAdminUsername(normalizedUsername)) {
    throw new Error('ชื่อผู้ใช้นี้สงวนไว้สำหรับผู้ดูแลระบบ')
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('id, username')
    .eq('username', normalizedUsername)
    .maybeSingle()

  if (error) throw error
  if (data) throw new Error('ชื่อผู้ใช้นี้ถูกใช้งานแล้ว')

  return normalizedUsername
}

export async function createAccountRegistrationRequest({ username, houseNo, phone, password }) {
  const normalizedUsername = await ensureUsernameAvailable(username)
  const house = await findHouseByHouseNoAndPhone({ houseNo, phone })

  const passwordText = String(password || '')
  if (passwordText.length < 6) {
    throw new Error('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร')
  }

  const passwordHash = await bcrypt.hash(passwordText, 10)

  const { data: createdProfile, error: profileError } = await supabase
    .from('profiles')
    .insert([{
      username: normalizedUsername,
      password_hash: passwordHash,
      full_name: house.owner_name || `บ้าน ${house.house_no}`,
      role: 'resident',
      house_id: house.id,
      phone: house.phone || normalizeText(phone),
      is_active: false,
      password_changed_at: new Date().toISOString(),
    }])
    .select('id, username')
    .single()

  if (profileError) throw profileError

  const { data: request, error: requestError } = await supabase
    .from('account_requests')
    .insert([{
      request_type: 'register',
      status: 'pending',
      house_id: house.id,
      profile_id: createdProfile.id,
      requested_username: normalizedUsername,
      requested_phone: house.phone || normalizeText(phone),
    }])
    .select('id, status, created_at')
    .single()

  if (requestError) {
    if (isAccountRequestInsertDenied(requestError)) {
      return {
        id: null,
        status: 'pending',
        created_at: new Date().toISOString(),
      }
    }

    await supabase.from('profiles').delete().eq('id', createdProfile.id)
    throw requestError
  }

  return request
}

export async function listAccountRequests({ status = 'all' } = {}) {
  let query = supabase
    .from('account_requests')
    .select('*, houses(id, house_no, soi, owner_name, phone), profiles(id, username, full_name, is_active, role)')
    .order('created_at', { ascending: false })

  if (status !== 'all') query = query.eq('status', status)

  const { data, error } = await query
  if (error) {
    const msg = String(error.message || '').toLowerCase()
    if (msg.includes('account_requests') && (msg.includes('does not exist') || msg.includes('relation'))) {
      return []
    }
    throw error
  }
  return data || []
}

export async function updateAccountRequestStatus(requestId, { status, adminNote = null, reviewedById = null } = {}) {
  const updates = {
    status,
    admin_note: adminNote,
    reviewed_at: new Date().toISOString(),
    reviewed_by_id: reviewedById || null,
  }

  const { data, error } = await supabase
    .from('account_requests')
    .update(updates)
    .eq('id', requestId)
    .select('*, houses(id, house_no, soi, owner_name, phone), profiles(id, username, full_name, is_active, role)')
    .single()

  if (error) throw error
  return data
}

export async function cancelAccountRequest(requestId, { reviewedById = null } = {}) {
  return updateAccountRequestStatus(requestId, { status: 'cancelled', reviewedById })
}

export async function approveAccountRequest(requestId, { reviewedById = null } = {}) {
  const { data: request, error: requestError } = await supabase
    .from('account_requests')
    .select('id, profile_id, status')
    .eq('id', requestId)
    .maybeSingle()

  if (requestError) throw requestError
  if (!request) throw new Error('ไม่พบคำขอ')
  if (!request.profile_id) throw new Error('คำขอไม่มีผู้ใช้งานที่เชื่อมโยง')

  const { error: profileError } = await supabase
    .from('profiles')
    .update({ is_active: true, updated_at: new Date().toISOString() })
    .eq('id', request.profile_id)

  if (profileError) throw profileError

  return updateAccountRequestStatus(requestId, { status: 'approved', reviewedById })
}

export async function resetPasswordByIdentity({ username, houseNo, phone, newPassword }) {
  const normalizedUsername = normalizeLower(username)
  if (!normalizedUsername) throw new Error('กรุณาระบุชื่อผู้ใช้')

  const passwordText = String(newPassword || '')
  if (passwordText.length < 6) throw new Error('รหัสผ่านใหม่ต้องมีอย่างน้อย 6 ตัวอักษร')

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, username, house_id')
    .eq('username', normalizedUsername)
    .maybeSingle()

  if (profileError) throw profileError
  if (!profile) throw new Error('ไม่พบชื่อผู้ใช้งาน')
  if (!profile.house_id) throw new Error('บัญชีนี้ไม่ได้ผูกกับบ้าน')

  const house = await findHouseByHouseNoAndPhone({ houseNo, phone })
  if (house.id !== profile.house_id) {
    throw new Error('ข้อมูลชื่อผู้ใช้ บ้านเลขที่ หรือเบอร์โทรศัพท์ไม่ตรงกัน')
  }

  const passwordHash = await bcrypt.hash(passwordText, 10)

  const { error: updateError } = await supabase
    .from('profiles')
    .update({
      password_hash: passwordHash,
      password_changed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', profile.id)

  if (updateError) throw updateError
  return true
}
