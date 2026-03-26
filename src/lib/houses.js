import { supabase } from './supabase'

export async function listHouses({ status = 'all', search = '' } = {}) {
  let query = supabase
    .from('houses')
    .select('*')
    .order('house_no', { ascending: true })

  if (status && status !== 'all') {
    query = query.eq('status', status)
  }

  if (search && search.trim()) {
    const keyword = search.trim()
    query = query.or(`house_no.ilike.%${keyword}%,owner_name.ilike.%${keyword}%,resident_name.ilike.%${keyword}%`)
  }

  const { data, error } = await query

  if (error) throw error
  return data ?? []
}

export async function createHouse(payload) {
  const house = {
    house_no:       payload.house_no?.trim() || null,
    soi:            payload.soi?.trim() || null,
    owner_name:     payload.owner_name?.trim() || null,
    resident_name:  payload.resident_name?.trim() || null,
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
  const { data, error } = await supabase
    .from('houses')
    .update(updates)
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
