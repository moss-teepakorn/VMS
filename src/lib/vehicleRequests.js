import { supabase } from './supabase'
import { createVehicle, updateVehicle } from './vehicles'

const REQUEST_IMAGE_BUCKET = 'vehicle-images'
const MAX_REQUEST_IMAGE_BYTES = 100 * 1024

export async function listVehicleRequests({ houseId = null, status = 'all' } = {}) {
  let query = supabase
    .from('vehicle_requests')
    .select('*, houses(id, house_no, soi, owner_name), vehicles(id, license_plate, brand, model, color, vehicle_type, parking_location, parking_lock_no, parking_fee, status)')
    .order('created_at', { ascending: false })

  if (houseId) query = query.eq('house_id', houseId)
  if (status !== 'all') query = query.eq('status', status)

  const { data, error } = await query
  if (error) throw error
  return data || []
}

export async function createVehicleRequest(payload) {
  const record = {
    house_id: payload.house_id,
    vehicle_id: payload.vehicle_id || null,
    request_type: payload.request_type || 'add',
    status: 'pending',
    license_plate: payload.license_plate?.trim() || null,
    province: payload.province?.trim() || null,
    brand: payload.brand?.trim() || null,
    model: payload.model?.trim() || null,
    color: payload.color?.trim() || null,
    vehicle_type: payload.vehicle_type || null,
    vehicle_status: payload.vehicle_status || 'active',
    parking_location: payload.parking_location || null,
    parking_lock_no: payload.parking_lock_no?.trim() || null,
    parking_fee: payload.parking_fee ? Number(payload.parking_fee) : 0,
    note: payload.note?.trim() || null,
    created_by_id: payload.created_by_id || null,
    image_urls: [],
  }

  const { data, error } = await supabase
    .from('vehicle_requests')
    .insert([record])
    .select('*')
    .single()

  if (error) throw error
  return data
}

export async function updateVehicleRequestImageUrls(id, imageUrls) {
  const { data, error } = await supabase
    .from('vehicle_requests')
    .update({ image_urls: imageUrls })
    .eq('id', id)
    .select('*')
    .single()

  if (error) throw error
  return data
}

export async function updateVehicleRequestStatus(id, { status, adminNote = null }) {
  const updates = {
    status,
    admin_note: adminNote,
    reviewed_at: new Date().toISOString(),
  }

  const { data, error } = await supabase
    .from('vehicle_requests')
    .update(updates)
    .eq('id', id)
    .select('*')
    .single()

  if (error) throw error
  return data
}

export async function cancelVehicleRequest(id) {
  return updateVehicleRequestStatus(id, { status: 'cancelled' })
}

export async function resubmitVehicleRequest(id) {
  const { data, error } = await supabase
    .from('vehicle_requests')
    .update({ status: 'pending', admin_note: null, reviewed_at: null })
    .eq('id', id)
    .select('*')
    .single()

  if (error) throw error
  return data
}

// Admin: approve a request (applies changes to vehicles table)
export async function approveVehicleRequest(requestId, request) {
  if (request.request_type === 'add') {
    // Create new vehicle record
    await createVehicle({
      house_id: request.house_id,
      license_plate: request.license_plate,
      province: request.province,
      brand: request.brand,
      model: request.model,
      color: request.color,
      vehicle_type: request.vehicle_type,
      parking_location: request.parking_location,
      parking_lock_no: request.parking_lock_no,
      parking_fee: request.parking_fee,
      status: request.vehicle_status || 'active',
      note: request.note,
    })
  } else if (request.request_type === 'edit' && request.vehicle_id) {
    // Update existing vehicle record (only allowed edit fields)
    const updates = {}
    if (request.license_plate) updates.license_plate = request.license_plate
    if (request.province) updates.province = request.province
    if (request.color) updates.color = request.color
    if (request.vehicle_status) updates.status = request.vehicle_status
    if (request.parking_location) updates.parking_location = request.parking_location
    await updateVehicle(request.vehicle_id, updates)
  }

  return updateVehicleRequestStatus(requestId, { status: 'approved' })
}

export async function uploadVehicleRequestImages(requestId, files) {
  const folder = `requests/${String(requestId)}`
  const uploaded = []

  for (const file of files) {
    if (file.size > MAX_REQUEST_IMAGE_BYTES) {
      throw new Error(`ไฟล์ ${file.name} มีขนาดเกิน 100KB`)
    }

    const path = `${folder}/${file.name}`
    const { error } = await supabase.storage
      .from(REQUEST_IMAGE_BUCKET)
      .upload(path, file, { upsert: true, contentType: file.type || 'image/jpeg' })

    if (error) throw error

    const { data: urlData } = supabase.storage.from(REQUEST_IMAGE_BUCKET).getPublicUrl(path)
    uploaded.push(urlData?.publicUrl || '')
  }

  return uploaded
}
