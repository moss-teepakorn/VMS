import { supabase } from './supabase'

export async function listBoardSets() {
  const { data, error } = await supabase
    .from('board_sets')
    .select('id, set_no, is_active, note, created_at, updated_at, board_members(id, set_id, member_no, full_name, position, phone)')
    .order('set_no', { ascending: true })
  if (error) throw error
  return (data || []).map((set) => ({
    ...set,
    board_members: (set.board_members || []).sort((a, b) => a.member_no - b.member_no),
  }))
}

export async function getActiveBoardMembers() {
  const { data, error } = await supabase
    .from('board_sets')
    .select('board_members(id, set_id, member_no, full_name, position, phone)')
    .eq('is_active', true)
    .order('set_no', { ascending: false })
    .limit(1)
  if (error) throw error
  if (!data || data.length === 0) return []
  return (data[0].board_members || []).sort((a, b) => a.member_no - b.member_no)
}

export async function createBoardSet(payload = {}) {
  const setNo = Number(payload.set_no || 0)
  if (!setNo || setNo < 1) throw new Error('กรุณาระบุชุดที่ให้ถูกต้อง')

  const members = Array.isArray(payload.members) ? payload.members : []

  const { data: setData, error: setError } = await supabase
    .from('board_sets')
    .insert([{ set_no: setNo, is_active: payload.is_active !== false, note: payload.note || null }])
    .select('id, set_no, is_active, note, created_at, updated_at')
    .single()
  if (setError) throw setError

  const memberRows = (Array.isArray(members) ? members : [])
    .map((m) => ({
      full_name: String(m.full_name || '').trim(),
      position: String(m.position || 'กรรมการ').trim(),
      phone: String(m.phone || '').trim() || null,
    }))
    .filter((m) => m.full_name)
    .map((m, idx) => ({
      set_id: setData.id,
      member_no: idx + 1,
      ...m,
    }))

  for (const row of memberRows) {
    const { error: mErr } = await supabase.from('board_members').insert([row])
    if (mErr) throw mErr
  }

  return setData
}

export async function updateBoardSet(id, patch = {}) {
  if (!id) throw new Error('ไม่พบรหัส board set')
  const clean = {}
  if (Object.prototype.hasOwnProperty.call(patch, 'set_no')) clean.set_no = Number(patch.set_no || 0)
  if (Object.prototype.hasOwnProperty.call(patch, 'is_active')) clean.is_active = !!patch.is_active
  if (Object.prototype.hasOwnProperty.call(patch, 'note')) clean.note = String(patch.note || '').trim() || null

  if (Object.keys(clean).length > 0) {
    const { error } = await supabase.from('board_sets').update(clean).eq('id', id)
    if (error) throw error
  }
  return true
}

export async function saveBoardMembers(setId, members = []) {
  if (!setId) throw new Error('ไม่พบรหัส board set')

  // Delete all existing members and re-insert updated member rows
  // Fetch existing rows to compute diff
  const { data: existingRows = [], error: fetchErr } = await supabase
    .from('board_members')
    .select('id, member_no')
    .eq('set_id', setId)
  if (fetchErr) throw fetchErr

  const incoming = (Array.isArray(members) ? members : [])
    .map((m) => ({ id: m.id || null, full_name: String(m.full_name || '').trim(), position: String(m.position || 'กรรมการ').trim(), phone: String(m.phone || '').trim(), member_no: Number(m.member_no || 0) }))
    .filter((m) => m.full_name)

  const existingIds = new Set((existingRows || []).map((r) => String(r.id)))
  const incomingIds = new Set((incoming || []).map((r) => String(r.id)).filter((s) => s && s !== 'null'))

  // Compute IDs to delete (existing in DB but not present in incoming payload)
  const toDeleteIds = (Array.from(existingIds).filter((id) => !incomingIds.has(id)))

  // Batch-delete removed IDs for clarity and efficiency
  if (toDeleteIds.length > 0) {
    const { error: delErr } = await supabase.from('board_members').delete().in('id', toDeleteIds)
    if (delErr) throw delErr
  }

  // Re-fetch existing rows after delete to ensure we don't re-insert duplicates
  const { data: postDeleteRows = [], error: postFetchErr } = await supabase
    .from('board_members')
    .select('id, full_name')
    .eq('set_id', setId)
  if (postFetchErr) throw postFetchErr

  const existingNames = new Set((postDeleteRows || []).map((r) => String(r.full_name || '').trim().toLowerCase()))

  // Process updates and collect new rows for batch insert
  const inserts = []
  for (let i = 0; i < incoming.length; i++) {
    const row = incoming[i]
    const payload = {
      set_id: setId,
      member_no: i + 1,
      full_name: row.full_name,
      position: row.position,
      phone: row.phone || null,
    }
    if (row.id) {
      const { error: upErr } = await supabase.from('board_members').update(payload).eq('id', row.id)
      if (upErr) throw upErr
    } else {
      // Avoid inserting a row that already exists (case-insensitive match)
      const nameKey = String(row.full_name || '').trim().toLowerCase()
      if (!existingNames.has(nameKey)) {
        inserts.push(payload)
        existingNames.add(nameKey)
      }
    }
  }

  if (inserts.length > 0) {
    const { error: insErr } = await supabase.from('board_members').insert(inserts)
    if (insErr) throw insErr
  }

  return true
}

export async function setActiveBoardSet(id) {
  if (!id) throw new Error('ไม่พบรหัส board set')

  const { error: deactivateErr } = await supabase
    .from('board_sets')
    .update({ is_active: false })
    .neq('id', id)
  if (deactivateErr) throw deactivateErr

  const { data, error } = await supabase
    .from('board_sets')
    .update({ is_active: true })
    .eq('id', id)
    .select('id, set_no, is_active')
    .single()
  if (error) throw error
  return data
}

export async function deleteBoardSet(id) {
  if (!id) throw new Error('ไม่พบรหัส board set')
  const { error } = await supabase.from('board_sets').delete().eq('id', id)
  if (error) throw error
  return true
}
