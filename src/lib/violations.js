import { supabase } from './supabase'

const VIOLATION_IMAGE_BUCKET = 'violation-images'
const MAX_VIOLATION_IMAGE_BYTES = 100 * 1024

export async function listViolations({ status = 'all', search = '' } = {}) {
  const { data, error } = await supabase
    .from('violations')
    .select('id, house_id, type, detail, occurred_at, image_url, status, due_date, warning_count, fine_amount, report_no, report_date, admin_note, resident_note, resident_updated_at, created_at, houses(id, house_no, soi, owner_name)')
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
  const reportDate = payload.report_date || new Date().toISOString().slice(0, 10)
  const reportNo = payload.report_no?.trim() || await generateNextViolationReportNo(reportDate)

  const record = {
    house_id: payload.house_id || null,
    type: payload.type?.trim() || null,
    detail: payload.detail?.trim() || null,
    occurred_at: payload.occurred_at || null,
    status: payload.status || 'pending',
    due_date: payload.due_date || null,
    warning_count: Number(payload.warning_count || 0),
    fine_amount: Number(payload.fine_amount || 0),
    report_no: reportNo,
    report_date: reportDate,
    admin_note: payload.admin_note?.trim() || null,
    resident_note: payload.resident_note?.trim() || null,
    resident_updated_at: payload.resident_updated_at || null,
  }

  const { data, error } = await supabase
    .from('violations')
    .insert([record])
    .select('id, house_id, type, detail, occurred_at, image_url, status, due_date, warning_count, fine_amount, report_no, report_date, admin_note, resident_note, resident_updated_at, created_at, houses(id, house_no, soi, owner_name)')
    .single()

  if (error) throw error
  return data
}

export async function updateViolation(id, updates) {
  const patch = { ...updates }

  if (!patch.report_no) {
    const baseDate = patch.report_date || new Date().toISOString().slice(0, 10)
    patch.report_no = await generateNextViolationReportNo(baseDate)
    patch.report_date = patch.report_date || baseDate
  }

  if (patch.resident_note != null) {
    patch.resident_note = String(patch.resident_note || '').trim() || null
    patch.resident_updated_at = new Date().toISOString()
  }

  const { data, error } = await supabase
    .from('violations')
    .update(patch)
    .eq('id', id)
    .select('id, house_id, type, detail, occurred_at, image_url, status, due_date, warning_count, fine_amount, report_no, report_date, admin_note, resident_note, resident_updated_at, created_at, houses(id, house_no, soi, owner_name)')
    .single()

  if (error) throw error
  return data
}

export async function deleteViolation(id) {
  const currentImages = await listViolationImages(id)
  const paths = currentImages.map((image) => image.path).filter(Boolean)
  if (paths.length > 0) {
    await deleteViolationImagesByPaths(paths)
  }

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

  if (uploaded.length > 0) {
    await supabase
      .from('violations')
      .update({ image_url: uploaded[0].url })
      .eq('id', violationId)
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

export async function generateNextViolationReportNo(reportDateInput) {
  const dateValue = reportDateInput || new Date().toISOString().slice(0, 10)
  const year = new Date(dateValue).getFullYear()
  const prefix = `VIO-${year}-`

  const { data, error } = await supabase
    .from('violations')
    .select('report_no')
    .ilike('report_no', `${prefix}%`)

  if (error) throw error

  let maxRunning = 0
  ;(data || []).forEach((row) => {
    const reportNo = String(row.report_no || '')
    const matched = reportNo.match(new RegExp(`^${prefix}(\\d+)$`))
    if (!matched) return
    const running = Number(matched[1])
    if (Number.isFinite(running) && running > maxRunning) {
      maxRunning = running
    }
  })

  return `${prefix}${String(maxRunning + 1).padStart(3, '0')}`
}

export async function listHouseViolations(houseId, { status = 'all', search = '' } = {}) {
  const houseIdValue = String(houseId || '').trim()
  if (!houseIdValue) return []

  const { data, error } = await supabase
    .from('violations')
    .select('id, house_id, type, detail, occurred_at, status, due_date, warning_count, fine_amount, report_no, report_date, admin_note, resident_note, resident_updated_at, created_at')
    .eq('house_id', houseIdValue)
    .order('created_at', { ascending: false })

  if (error) throw error

  const keyword = (search || '').trim().toLowerCase()
  return (data ?? []).filter((item) => {
    if (status !== 'all' && item.status !== status) return false
    if (!keyword) return true
    const searchable = [item.type, item.detail, item.admin_note, item.resident_note]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
    return searchable.includes(keyword)
  })
}

export async function residentUpdateViolation(id, payload = {}) {
  const patch = {
    status: payload.status || 'in_progress',
    resident_note: payload.resident_note?.trim() || null,
    resident_updated_at: new Date().toISOString(),
  }

  const { data, error } = await supabase
    .from('violations')
    .update(patch)
    .eq('id', id)
    .select('id, house_id, type, detail, occurred_at, status, due_date, warning_count, fine_amount, report_no, report_date, admin_note, resident_note, resident_updated_at, created_at')
    .single()

  if (error) throw error
  return data
}
