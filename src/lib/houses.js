import { supabase } from './supabase'

export async function listHouses({ status = 'all', search = '' } = {}) {
  let query = supabase
    .from('houses')
    .select('*')
    .order('house_number', { ascending: true })

  if (status && status !== 'all') {
    query = query.eq('status', status)
  }

  if (search && search.trim()) {
    const keyword = search.trim()
    query = query.or(`house_number.ilike.%${keyword}%,owner_name.ilike.%${keyword}%`)
  }

  const { data, error } = await query

  if (error) throw error
  return data ?? []
}

export async function createHouse(payload, userId = null) {
  const house = {
    house_number: payload.house_number,
    owner_name: payload.owner_name,
    phone: payload.phone || null,
    area_sqm: payload.area_sqm ? Number(payload.area_sqm) : null,
    status: payload.status || 'pending',
    monthly_fee: payload.monthly_fee ? Number(payload.monthly_fee) : 2750,
    outstanding_amount: payload.outstanding_amount ? Number(payload.outstanding_amount) : 0,
    created_by: userId,
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
