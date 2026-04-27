import { supabase } from './supabase'

function normalizeHoliday(payload = {}) {
  const type = String(payload.type || '').trim()
  const name = String(payload.name || '').trim()
  const note = String(payload.note || '').trim() || null
  const is_active = payload.is_active === false ? false : true
  let year = payload.year ?? null
  let holiday_date = payload.holiday_date || null
  let weekday = payload.weekday ?? null

  if (holiday_date) {
    holiday_date = String(holiday_date).trim() || null
    const parsed = new Date(holiday_date)
    if (!Number.isFinite(parsed.getTime())) {
      throw new Error('กรุณากรอกวันที่ให้ถูกต้อง')
    }
    if (!year) {
      year = parsed.getFullYear()
    }
  }

  if (type !== 'weekly' && type !== 'fixed') {
    throw new Error('ประเภทวันหยุดไม่ถูกต้อง')
  }

  if (!Number.isFinite(Number(year))) {
    throw new Error('กรุณาระบุปีที่ถูกต้อง')
  }

  const clean = {
    year: Number(year),
    type,
    weekday: null,
    holiday_date: null,
    name,
    note,
    is_active,
  }

  if (type === 'weekly') {
    const intWeekday = Number(weekday)
    if (!Number.isFinite(intWeekday) || intWeekday < 0 || intWeekday > 6) {
      throw new Error('กรุณาระบุวันในสัปดาห์ให้ถูกต้อง')
    }
    clean.weekday = intWeekday
  }

  if (type === 'fixed') {
    if (!holiday_date) {
      throw new Error('กรุณาระบุวันที่วันหยุด')
    }
    clean.holiday_date = holiday_date
  }

  if (!clean.name) {
    throw new Error('กรุณาระบุชื่อวันหยุด')
  }

  return clean
}

export async function listHolidays(year) {
  if (!Number.isFinite(Number(year))) {
    throw new Error('ปีไม่ถูกต้อง')
  }

  const { data, error } = await supabase
    .from('holidays')
    .select('id, year, type, weekday, holiday_date, name, note, is_active, created_at, updated_at')
    .eq('year', Number(year))
    .order('type', { ascending: true })
    .order('weekday', { ascending: true })
    .order('holiday_date', { ascending: true })

  if (error) throw error
  return data || []
}

export async function createHoliday(payload = {}) {
  const row = normalizeHoliday(payload)
  const { data, error } = await supabase
    .from('holidays')
    .insert([row])
    .select('id, year, type, weekday, holiday_date, name, note, is_active, created_at, updated_at')
    .single()

  if (error) throw error
  return data
}

export async function updateHoliday(id, patch = {}) {
  if (!id) throw new Error('ไม่พบรหัสวันหยุด')
  const payload = normalizeHoliday({ ...patch, year: patch.year })

  const allowed = ['year', 'type', 'weekday', 'holiday_date', 'name', 'note', 'is_active']
  const clean = {}
  for (const key of allowed) {
    if (Object.prototype.hasOwnProperty.call(patch, key)) {
      clean[key] = payload[key]
    }
  }

  if (Object.keys(clean).length === 0) return null

  const { data, error } = await supabase
    .from('holidays')
    .update(clean)
    .eq('id', id)
    .select('id, year, type, weekday, holiday_date, name, note, is_active, created_at, updated_at')
    .single()

  if (error) throw error
  return data
}

export async function deleteHoliday(id) {
  if (!id) throw new Error('ไม่พบรหัสวันหยุด')
  const { error } = await supabase.from('holidays').delete().eq('id', id)
  if (error) throw error
  return true
}
