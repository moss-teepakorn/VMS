import { supabase } from './supabase'

export async function listVehicles({ status = 'all', search = '' } = {}) {
  let query = supabase
    .from('vehicles')
    .select('id, house_id, license_plate, province, brand, model, color, vehicle_type, parking_location, parking_lock_no, parking_fee, status, note, created_at, houses(id, house_no, owner_name)')
    .order('created_at', { ascending: false })

  if (status && status !== 'all') {
    query = query.eq('status', status)
  }

  if (search && search.trim()) {
    const keyword = search.trim()
    query = query.or(`license_plate.ilike.%${keyword}%,brand.ilike.%${keyword}%,model.ilike.%${keyword}%,province.ilike.%${keyword}%`)
  }

  const { data, error } = await query
  if (error) throw error
  return data ?? []
}

export async function createVehicle(payload) {
  const vehicle = {
    house_id: payload.house_id || null,
    license_plate: payload.license_plate?.trim() || null,
    province: payload.province?.trim() || null,
    brand: payload.brand?.trim() || null,
    model: payload.model?.trim() || null,
    color: payload.color?.trim() || null,
    vehicle_type: payload.vehicle_type || 'car',
    parking_location: payload.parking_location || 'ในบ้าน',
    parking_lock_no: payload.parking_lock_no?.trim() || null,
    parking_fee: payload.parking_fee ? Number(payload.parking_fee) : 0,
    status: payload.status || 'active',
    note: payload.note?.trim() || null,
  }

  const { data, error } = await supabase
    .from('vehicles')
    .insert([vehicle])
    .select('id, house_id, license_plate, province, brand, model, color, vehicle_type, parking_location, parking_lock_no, parking_fee, status, note, created_at, houses(id, house_no, owner_name)')
    .single()

  if (error) throw error
  return data
}

export async function updateVehicle(id, updates) {
  const { data, error } = await supabase
    .from('vehicles')
    .update(updates)
    .eq('id', id)
    .select('id, house_id, license_plate, province, brand, model, color, vehicle_type, parking_location, parking_lock_no, parking_fee, status, note, created_at, houses(id, house_no, owner_name)')
    .single()

  if (error) throw error
  return data
}

export async function deleteVehicle(id) {
  const { error } = await supabase
    .from('vehicles')
    .delete()
    .eq('id', id)

  if (error) throw error
  return true
}