import bcrypt from 'bcryptjs'
import { supabase } from './supabase'
import { isReservedAdminUsername } from './reservedUsernames'
import { assertCanActivateResident } from './userLimits'

const FALLBACK_ACCOUNT_REQUEST_PREFIX = 'fallback-profile-'

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

function isFallbackAccountRequestId(requestId) {
  return String(requestId || '').startsWith(FALLBACK_ACCOUNT_REQUEST_PREFIX)
}

function getProfileIdFromFallbackRequestId(requestId) {
  if (!isFallbackAccountRequestId(requestId)) return null
  return String(requestId || '').slice(FALLBACK_ACCOUNT_REQUEST_PREFIX.length) || null
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

async function ensureNoPendingInactiveResidentByHouse(houseId) {
  if (!houseId) return

  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, is_active, house_id, role, last_login_at')
    .eq('role', 'resident')
    .eq('house_id', houseId)
    .eq('is_active', false)
    .limit(1)

  if (error) throw error
  const pendingProfile = (data || []).find((row) => !row.last_login_at)
  if (pendingProfile) {
    throw new Error('บ้านนี้มีบัญชีที่ยังไม่ได้อนุมัติอยู่แล้ว กรุณารอผู้ดูแลระบบดำเนินการ')
  }
}

export async function createAccountRegistrationRequest({ username, houseNo, phone, password }) {
  const normalizedUsername = await ensureUsernameAvailable(username)
  const house = await findHouseByHouseNoAndPhone({ houseNo, phone })
  await ensureNoPendingInactiveResidentByHouse(house.id)
  await assertCanActivateResident({ houseId: house.id })

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

  // This app uses local-profile auth, so resident registration is typically unauthenticated
  // at Supabase Auth level. In that mode, account_requests insert often gets 401 by RLS.
  let hasSupabaseSession = false
  try {
    const { data } = await supabase.auth.getSession()
    hasSupabaseSession = Boolean(data?.session)
  } catch {
    hasSupabaseSession = false
  }

  if (!hasSupabaseSession) {
    return {
      id: null,
      status: 'pending',
      created_at: new Date().toISOString(),
    }
  }

  try {
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
  } catch (requestError) {
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
}

export async function listAccountRequests({ status = 'all' } = {}) {
  let query = supabase
    .from('account_requests')
    .select('*, houses(id, house_no, soi, owner_name, phone), profiles(id, username, full_name, is_active, role)')
    .order('created_at', { ascending: false })

  if (status !== 'all') query = query.eq('status', status)

  const { data, error } = await query

  let requestRows = data || []
  if (error) {
    const msg = String(error.message || '').toLowerCase()
    if (!(msg.includes('account_requests') && (msg.includes('does not exist') || msg.includes('relation')))) {
      throw error
    }
    requestRows = []
  }

  if (status !== 'all' && status !== 'pending') {
    return requestRows
  }

  const { data: inactiveProfiles, error: inactiveProfilesError } = await supabase
    .from('profiles')
    .select('id, username, full_name, is_active, role, house_id, phone, created_at, last_login_at')
    .eq('role', 'resident')
    .eq('is_active', false)
    .not('house_id', 'is', null)
    .order('created_at', { ascending: false })

  if (inactiveProfilesError) throw inactiveProfilesError

  const existingProfileIdSet = new Set(
    requestRows
      .map((row) => row.profile_id)
      .filter(Boolean)
      .map((id) => String(id)),
  )

  const profileCandidates = (inactiveProfiles || []).filter((profile) => {
    if (existingProfileIdSet.has(String(profile.id))) return false
    if (profile.last_login_at) return false

    const createdAt = profile.created_at ? new Date(profile.created_at).getTime() : 0
    const maxAgeMs = 1000 * 60 * 60 * 24 * 30
    return createdAt > 0 && (Date.now() - createdAt) <= maxAgeMs
  })

  const profileIds = profileCandidates.map((profile) => profile.id).filter(Boolean)
  if (profileIds.length === 0) {
    return requestRows
  }

  const { data: relatedRequests, error: relatedRequestsError } = await supabase
    .from('account_requests')
    .select('profile_id')
    .eq('request_type', 'register')
    .in('profile_id', profileIds)

  if (relatedRequestsError) {
    const msg = String(relatedRequestsError.message || '').toLowerCase()
    if (!(msg.includes('account_requests') && (msg.includes('does not exist') || msg.includes('relation')))) {
      throw relatedRequestsError
    }
  }

  const relatedProfileIdSet = new Set((relatedRequests || []).map((row) => String(row.profile_id || '')).filter(Boolean))
  const fallbackProfiles = profileCandidates.filter((profile) => !relatedProfileIdSet.has(String(profile.id)))
  if (fallbackProfiles.length === 0) {
    return requestRows
  }

  const houseIds = [...new Set(fallbackProfiles.map((profile) => profile.house_id).filter(Boolean))]
  let houseById = new Map()
  if (houseIds.length > 0) {
    const { data: houses, error: houseError } = await supabase
      .from('houses')
      .select('id, house_no, soi, owner_name, phone')
      .in('id', houseIds)

    if (houseError) throw houseError
    houseById = new Map((houses || []).map((house) => [String(house.id), house]))
  }

  const fallbackRows = fallbackProfiles.map((profile) => ({
    id: `${FALLBACK_ACCOUNT_REQUEST_PREFIX}${profile.id}`,
    request_type: 'register',
    status: 'pending',
    house_id: profile.house_id,
    profile_id: profile.id,
    requested_username: profile.username,
    requested_phone: profile.phone,
    created_at: profile.created_at || new Date().toISOString(),
    houses: houseById.get(String(profile.house_id)) || null,
    profiles: {
      id: profile.id,
      username: profile.username,
      full_name: profile.full_name,
      is_active: profile.is_active,
      role: profile.role,
    },
    is_fallback: true,
  }))

  return [...requestRows, ...fallbackRows]
    .sort((left, right) => new Date(right.created_at || 0).getTime() - new Date(left.created_at || 0).getTime())
}

export async function updateAccountRequestStatus(requestId, { status, adminNote = null, reviewedById = null } = {}) {
  if (isFallbackAccountRequestId(requestId)) {
    const profileId = getProfileIdFromFallbackRequestId(requestId)
    if (!profileId) throw new Error('ไม่พบผู้ใช้งานที่เชื่อมโยงกับคำขอ')

    const shouldActivate = status === 'approved'
    const reviewedAt = new Date().toISOString()

    const { data: currentProfile, error: currentProfileError } = await supabase
      .from('profiles')
      .select('id, house_id')
      .eq('id', profileId)
      .maybeSingle()

    if (currentProfileError) throw currentProfileError
    if (!currentProfile) throw new Error('ไม่พบผู้ใช้งาน')

    if (shouldActivate) {
      await assertCanActivateResident({ houseId: currentProfile.house_id, excludeProfileId: currentProfile.id })
    }

    const { data: profileRow, error: profileError } = await supabase
      .from('profiles')
      .update({ is_active: shouldActivate, updated_at: reviewedAt })
      .eq('id', profileId)
      .select('id, username, full_name, is_active, role, house_id, phone, created_at')
      .maybeSingle()

    if (profileError) throw profileError
    if (!profileRow) throw new Error('ไม่พบผู้ใช้งาน')

    let house = null
    if (profileRow.house_id) {
      const { data: houseRow, error: houseError } = await supabase
        .from('houses')
        .select('id, house_no, soi, owner_name, phone')
        .eq('id', profileRow.house_id)
        .maybeSingle()

      if (houseError) throw houseError
      house = houseRow || null
    }

    return {
      id: requestId,
      request_type: 'register',
      status,
      admin_note: adminNote,
      reviewed_at: reviewedAt,
      reviewed_by_id: reviewedById || null,
      house_id: profileRow.house_id || null,
      profile_id: profileRow.id,
      requested_username: profileRow.username,
      requested_phone: profileRow.phone,
      created_at: profileRow.created_at || reviewedAt,
      houses: house,
      profiles: {
        id: profileRow.id,
        username: profileRow.username,
        full_name: profileRow.full_name,
        is_active: profileRow.is_active,
        role: profileRow.role,
      },
      is_fallback: true,
    }
  }

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
  if (isFallbackAccountRequestId(requestId)) {
    return updateAccountRequestStatus(requestId, { status: 'approved', reviewedById })
  }

  const { data: request, error: requestError } = await supabase
    .from('account_requests')
    .select('id, profile_id, status')
    .eq('id', requestId)
    .maybeSingle()

  if (requestError) throw requestError
  if (!request) throw new Error('ไม่พบคำขอ')
  if (!request.profile_id) throw new Error('คำขอไม่มีผู้ใช้งานที่เชื่อมโยง')

  const { data: profileBeforeUpdate, error: profileBeforeUpdateError } = await supabase
    .from('profiles')
    .select('id, house_id')
    .eq('id', request.profile_id)
    .maybeSingle()

  if (profileBeforeUpdateError) throw profileBeforeUpdateError
  if (!profileBeforeUpdate) throw new Error('ไม่พบผู้ใช้งานที่เชื่อมโยง')

  await assertCanActivateResident({ houseId: profileBeforeUpdate.house_id, excludeProfileId: profileBeforeUpdate.id })

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
