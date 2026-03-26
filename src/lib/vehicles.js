import { supabase } from './supabase'

const houseSorter = new Intl.Collator('th-TH', { numeric: true, sensitivity: 'base' })

function normalizeSoiValue(soi) {
  const numeric = Number.parseInt(String(soi || '').replace(/[^0-9]/g, ''), 10)
  return Number.isNaN(numeric) ? Number.MAX_SAFE_INTEGER : numeric
}

function sortVehicles(items) {
  return [...items].sort((left, right) => {
    const soiCompare = normalizeSoiValue(left.houses?.soi) - normalizeSoiValue(right.houses?.soi)
    if (soiCompare !== 0) return soiCompare
    const houseCompare = houseSorter.compare(left.houses?.house_no || '', right.houses?.house_no || '')
    if (houseCompare !== 0) return houseCompare
    return houseSorter.compare(left.license_plate || '', right.license_plate || '')
  })
}

export async function listVehicles({ status = 'all', search = '', soi = 'all', vehicleType = 'all' } = {}) {
  const query = supabase
    .from('vehicles')
    .select('id, house_id, license_plate, province, brand, model, color, vehicle_type, parking_location, parking_lock_no, parking_fee, status, note, created_at, houses(id, house_no, soi, owner_name)')
    .order('created_at', { ascending: false })

  const { data, error } = await query
  if (error) throw error

  const keyword = search.trim().toLowerCase()
  const filtered = (data ?? []).filter((item) => {
    if (status !== 'all' && item.status !== status) return false
    if (soi !== 'all' && String(item.houses?.soi || '') !== String(soi)) return false
    if (vehicleType !== 'all' && item.vehicle_type !== vehicleType) return false
    if (!keyword) return true

    const searchable = [
      item.license_plate,
      item.brand,
      item.model,
      item.color,
      item.houses?.house_no,
      item.houses?.owner_name,
      item.houses?.soi,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()

    return searchable.includes(keyword)
  })

  return sortVehicles(filtered)
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
    .select('id, house_id, license_plate, province, brand, model, color, vehicle_type, parking_location, parking_lock_no, parking_fee, status, note, created_at, houses(id, house_no, soi, owner_name)')
    .single()

  if (error) throw error
  return data
}

export async function updateVehicle(id, updates) {
  const { data, error } = await supabase
    .from('vehicles')
    .update(updates)
    .eq('id', id)
    .select('id, house_id, license_plate, province, brand, model, color, vehicle_type, parking_location, parking_lock_no, parking_fee, status, note, created_at, houses(id, house_no, soi, owner_name)')
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