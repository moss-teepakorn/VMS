import { supabase } from './supabase'

const houseSorter = new Intl.Collator('th-TH', { numeric: true, sensitivity: 'base' })

function normalizeSoiValue(soi) {
  const numeric = Number.parseInt(String(soi || '').replace(/[^0-9]/g, ''), 10)
  return Number.isNaN(numeric) ? Number.MAX_SAFE_INTEGER : numeric
}

function sortHouses(items) {
  return [...items].sort((left, right) => {
    const soiCompare = normalizeSoiValue(left.soi) - normalizeSoiValue(right.soi)
    if (soiCompare !== 0) return soiCompare
    return houseSorter.compare(left.house_no || '', right.house_no || '')
  })
}

export async function listHouses({ status = 'all', search = '', soi = 'all' } = {}) {
  let query = supabase
    .from('houses')
    .select('*')

  if (status && status !== 'all') {
    query = query.eq('status', status)
  }

  if (soi && soi !== 'all') {
    query = query.eq('soi', soi)
  }

  if (search && search.trim()) {
    const keyword = search.trim()
    query = query.or(`house_no.ilike.%${keyword}%,owner_name.ilike.%${keyword}%,resident_name.ilike.%${keyword}%,contact_name.ilike.%${keyword}%,phone.ilike.%${keyword}%`)
  }

  const { data, error } = await query

  if (error) throw error
  return sortHouses(data ?? [])
}

export async function getHouseSetup() {
  const { data, error } = await supabase
    .from('system_config')
    .select('fee_rate_per_sqw, village_name')
    .limit(1)
    .maybeSingle()

  if (error) throw error

  return {
    feeRatePerSqw: Number(data?.fee_rate_per_sqw ?? 85),
    villageName: data?.village_name || 'The Greenfield',
  }
}

export async function updateAllHousesFeeRate(feeRatePerSqw) {
  const rate = Number(feeRatePerSqw || 0)

  const { data, error } = await supabase
    .from('houses')
    .update({ fee_rate: rate })
    .not('id', 'is', null)
    .select('id')

  if (error) throw error
  return data?.length ?? 0
}

export async function createHouse(payload) {
  const house = {
    house_no:       payload.house_no?.trim() || null,
    soi:            payload.soi?.trim() || null,
    address:        payload.address?.trim() || null,
    owner_name:     payload.owner_name?.trim() || null,
    resident_name:  payload.resident_name?.trim() || null,
    contact_name:   payload.contact_name?.trim() || null,
    phone:          payload.phone?.trim() || null,
    line_id:        payload.line_id?.trim() || null,
    email:          payload.email?.trim() || null,
    house_type:     payload.house_type || 'อยู่เอง',
    area_sqw:       payload.area_sqw ? Number(payload.area_sqw) : 0,
    fee_rate:       payload.fee_rate ? Number(payload.fee_rate) : 10,
    status:         payload.status || 'normal',
    note:           payload.note?.trim() || null,
  }

  const { data, error } = await supabase
    .from('houses')
    .insert([house])
    .select('*')
    .single()

  if (error) throw error
  return data
}

export async function updateHouse(id, updates) {
  const payload = {
    ...updates,
    address: updates.address?.trim() || null,
    contact_name: updates.contact_name?.trim() || null,
    line_id: updates.line_id?.trim() || null,
  }

  const { data, error } = await supabase
    .from('houses')
    .update(payload)
    .eq('id', id)
    .select('*')
    .single()

  if (error) throw error
  return data
}

export async function deleteHouse(id) {
  const { error } = await supabase
    .from('houses')
    .delete()
    .eq('id', id)

  if (error) throw error
  return true
}
