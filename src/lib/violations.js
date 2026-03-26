import { supabase } from './supabase'

const VIOLATION_IMAGE_BUCKET = 'violation-images'
const MAX_VIOLATION_IMAGE_BYTES = 100 * 1024

export async function listViolations({ status = 'all', search = '' } = {}) {
  const { data, error } = await supabase
    .from('violations')
    .select('id, house_id, type, detail, occurred_at, status, due_date, admin_note, created_at, houses(id, house_no, soi, owner_name)')
    .order('created_at', { ascending: false })

  if (error) throw error

  const keyword = (search || '').trim().toLowerCase()
  return (data ?? []).filter((item) => {
    if (status !== 'all' && item.status !== status) return false
    if (!keyword) return true
    const searchable = [
      item.type,
      item.detail,
      item.houses?.house_no,
      item.houses?.owner_name,
      item.houses?.soi,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
    return searchable.includes(keyword)
  })
}

export async function createViolation(payload) {
  const record = {
    house_id: payload.house_id || null,
    type: payload.type?.trim() || null,
    detail: payload.detail?.trim() || null,
    occurred_at: payload.occurred_at || null,
    status: payload.status || 'pending',
    due_date: payload.due_date || null,
    admin_note: payload.admin_note?.trim() || null,
  }

  const { data, error } = await supabase
    .from('violations')
    .insert([record])
    .select('id, house_id, type, detail, occurred_at, status, due_date, admin_note, created_at, houses(id, house_no, soi, owner_name)')
    .single()

  if (error) throw error
  return data
}

export async function updateViolation(id, updates) {
  const { data, error } = await supabase
    .from('violations')
    .update(updates)
    .eq('id', id)
    .select('id, house_id, type, detail, occurred_at, status, due_date, admin_note, created_at, houses(id, house_no, soi, owner_name)')
    .single()

  if (error) throw error
  return data
}

export async function deleteViolation(id) {
  const { error } = await supabase
    .from('violations')
    .delete()
    .eq('id', id)

  if (error) throw error
  return true
}

export async function listViolationImages(violationId) {
  const folder = String(violationId || '').trim()
  if (!folder) return []

  const { data, error } = await supabase.storage
    .from(VIOLATION_IMAGE_BUCKET)
    .list(folder, { limit: 20, sortBy: { column: 'name', order: 'asc' } })

  if (error) {
    if (String(error.message || '').toLowerCase().includes('not found')) return []
    throw error
  }

  return (data || [])
    .filter((item) => item.name)
    .map((item) => {
      const path = `${folder}/${item.name}`
      const { data: publicUrlData } = supabase.storage
        .from(VIOLATION_IMAGE_BUCKET)
        .getPublicUrl(path)
      return {
        name: item.name,
        path,
        url: publicUrlData?.publicUrl || '',
      }
    })
}

export async function uploadViolationImages(violationId, files) {
  const folder = String(violationId || '').trim()
  if (!folder || !Array.isArray(files) || files.length === 0) return []

  const uploaded = []
  for (const file of files) {
    if (file.size > MAX_VIOLATION_IMAGE_BYTES) {
      throw new Error(`ไฟล์ ${file.name} มีขนาดเกิน 100KB`)
    }

    const path = `${folder}/${file.name}`
    const { error } = await supabase.storage
      .from(VIOLATION_IMAGE_BUCKET)
      .upload(path, file, { upsert: true, contentType: file.type || 'image/jpeg' })

    if (error) throw error

    const { data: publicUrlData } = supabase.storage
      .from(VIOLATION_IMAGE_BUCKET)
      .getPublicUrl(path)

    uploaded.push({ name: file.name, path, url: publicUrlData?.publicUrl || '' })
  }

  return uploaded
}

export async function deleteViolationImagesByPaths(paths) {
  if (!Array.isArray(paths) || paths.length === 0) return true

  const { error } = await supabase.storage
    .from(VIOLATION_IMAGE_BUCKET)
    .remove(paths)

  if (error) throw error
  return true
}
