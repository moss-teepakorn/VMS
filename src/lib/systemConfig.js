import { supabase } from './supabase'

const SYSTEM_ASSET_BUCKET = 'system-assets'

const DEFAULT_SYSTEM_CONFIG = {
  village_name: 'The Greenfield',
  village_logo_url: '',
  village_logo_path: '',
  juristic_name: 'นิติบุคคลหมู่บ้านเดอะกรีนฟิลด์',
  juristic_phone: '02-123-4567',
  juristic_email: 'niti@greenfield.co.th',
  juristic_signature_url: '',
  juristic_signature_path: '',
  bank_name: 'กสิกรไทย',
  bank_account_no: '',
  bank_account_name: 'นิติบุคคลหมู่บ้าน เดอะกรีนฟิลด์',
  fee_rate_per_sqw: 85,
  fee_periods_per_year: 2,
  fee_due_day: 31,
  waste_fee_per_period: 100,
  parking_fee_per_vehicle: 200,
  early_pay_discount_pct: 3,
  overdue_fine_pct: 10,
  overdue_grace_days: 30,
  notice_fee: 200,
  invoice_message: 'กรุณาชำระภายในวันที่กำหนด หากพ้นกำหนดจะคิดค่าปรับ 10%',
  zone_count: 2,
  total_houses: 128,
  common_parking_slots: 30,
  enable_marketplace: true,
  enable_technicians: true,
  date_format: 'DD/MM/YYYY (พ.ศ.)',
  system_language: 'ภาษาไทย',
}

function normalizeConfigRow(row) {
  if (!row) return { ...DEFAULT_SYSTEM_CONFIG }
  return {
    ...DEFAULT_SYSTEM_CONFIG,
    ...row,
  }
}

export async function getSystemConfig() {
  const { data, error } = await supabase
    .from('system_config')
    .select('*')
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) throw error

  if (!data) {
    const { data: created, error: createError } = await supabase
      .from('system_config')
      .insert([DEFAULT_SYSTEM_CONFIG])
      .select('*')
      .single()

    if (createError) throw createError
    return created
  }

  return normalizeConfigRow(data)
}

export async function updateSystemConfig(configId, updates) {
  const { data: authData } = await supabase.auth.getUser()
  const payload = {
    ...updates,
    updated_by: authData?.user?.id || null,
  }

  const { data, error } = await supabase
    .from('system_config')
    .update(payload)
    .eq('id', configId)
    .select('*')
    .single()

  if (error) throw error
  return normalizeConfigRow(data)
}

export function extractSystemAssetPath(publicUrl) {
  const value = String(publicUrl || '').trim()
  if (!value) return ''
  const marker = `/storage/v1/object/public/${SYSTEM_ASSET_BUCKET}/`
  const index = value.indexOf(marker)
  if (index < 0) return ''
  return decodeURIComponent(value.slice(index + marker.length))
}

export async function uploadJuristicSignature(file) {
  if (!file) return null
  const extension = String(file.name || 'png').split('.').pop()?.toLowerCase() || 'png'
  const safeExt = ['png', 'jpg', 'jpeg', 'webp'].includes(extension) ? extension : 'png'
  const fileName = `signature_${Date.now()}.${safeExt}`
  const path = `juristic/${fileName}`

  const { error } = await supabase.storage
    .from(SYSTEM_ASSET_BUCKET)
    .upload(path, file, { upsert: true, contentType: file.type || 'image/png' })

  if (error) throw error

  const { data: publicUrlData } = supabase.storage
    .from(SYSTEM_ASSET_BUCKET)
    .getPublicUrl(path)

  return {
    path,
    url: publicUrlData?.publicUrl || '',
  }
}

export async function uploadVillageLogo(file) {
  if (!file) return null
  const extension = String(file.name || 'png').split('.').pop()?.toLowerCase() || 'png'
  const safeExt = ['png', 'jpg', 'jpeg', 'webp'].includes(extension) ? extension : 'png'
  const fileName = `logo_${Date.now()}.${safeExt}`
  const path = `logo/${fileName}`

  const { error } = await supabase.storage
    .from(SYSTEM_ASSET_BUCKET)
    .upload(path, file, { upsert: true, contentType: file.type || 'image/png' })

  if (error) throw error

  const { data: publicUrlData } = supabase.storage
    .from(SYSTEM_ASSET_BUCKET)
    .getPublicUrl(path)

  return {
    path,
    url: publicUrlData?.publicUrl || '',
  }
}

export async function deleteSystemAssetByPath(path) {
  const target = String(path || '').trim()
  if (!target) return true

  const { error } = await supabase.storage
    .from(SYSTEM_ASSET_BUCKET)
    .remove([target])

  if (error) throw error
  return true
}
