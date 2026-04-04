import { supabase } from './supabase'

const RULE_PREFIX = 'RULEDOC::'
const RULE_FILE_BUCKET = 'system-assets'
const MAX_RULE_FILE_BYTES = 5 * 1024 * 1024

const CATEGORY_LABELS = {
  village: 'กฎระเบียบหมู่บ้าน',
  living: 'ระเบียบการอยู่อาศัย',
}

function nowYmd() {
  const d = new Date()
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

function buildRuleNo() {
  const d = new Date()
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  const hh = String(d.getHours()).padStart(2, '0')
  const mi = String(d.getMinutes()).padStart(2, '0')
  const ss = String(d.getSeconds()).padStart(2, '0')
  return `RUL-${yyyy}${mm}${dd}${hh}${mi}${ss}`
}

function encodeRulePayload(payload) {
  return `${RULE_PREFIX}${JSON.stringify(payload)}`
}

function decodeRulePayload(content) {
  const raw = String(content || '')
  if (!raw.startsWith(RULE_PREFIX)) return null
  try {
    return JSON.parse(raw.slice(RULE_PREFIX.length))
  } catch {
    return null
  }
}

export function isRuleDocumentAnnouncement(item) {
  return Boolean(decodeRulePayload(item?.content))
}

function toRuleItem(row) {
  const parsed = decodeRulePayload(row?.content)
  if (!parsed) return null
  const category = parsed.category === 'living' ? 'living' : 'village'
  return {
    id: row.id,
    title: row.title || parsed.title || '-',
    category,
    category_label: CATEGORY_LABELS[category],
    description: parsed.description || '',
    pdf_url: parsed.pdf_url || '',
    pdf_path: parsed.pdf_path || '',
    created_at: row.created_at,
    announcement_date: row.announcement_date,
  }
}

export async function listRuleDocuments({ category = 'all', search = '' } = {}) {
  const { data, error } = await supabase
    .from('announcements')
    .select('id, title, content, announcement_date, created_at')
    .order('created_at', { ascending: false })

  if (error) throw error

  const keyword = String(search || '').trim().toLowerCase()
  return (data || [])
    .map(toRuleItem)
    .filter(Boolean)
    .filter((item) => {
      if (category !== 'all' && item.category !== category) return false
      if (!keyword) return true
      const haystack = [item.title, item.description, item.category_label].join(' ').toLowerCase()
      return haystack.includes(keyword)
    })
}

export async function createRuleDocument(payload) {
  const category = payload.category === 'living' ? 'living' : 'village'
  const record = {
    announcement_no: buildRuleNo(),
    announcement_date: payload.announcement_date || nowYmd(),
    title: String(payload.title || '').trim() || null,
    type: 'info',
    is_pinned: false,
    content: encodeRulePayload({
      category,
      title: String(payload.title || '').trim(),
      description: String(payload.description || '').trim(),
      pdf_url: String(payload.pdf_url || '').trim(),
      pdf_path: String(payload.pdf_path || '').trim(),
    }),
    image_url: null,
    created_by: payload.created_by || null,
  }

  const { data, error } = await supabase
    .from('announcements')
    .insert([record])
    .select('id, title, content, announcement_date, created_at')
    .single()

  if (error) throw error
  return toRuleItem(data)
}

export async function updateRuleDocument(id, payload) {
  const { data: current, error: currentError } = await supabase
    .from('announcements')
    .select('id, content')
    .eq('id', id)
    .maybeSingle()

  if (currentError) throw currentError
  const currentParsed = decodeRulePayload(current?.content)
  if (!currentParsed) throw new Error('ไม่พบข้อมูลกฎระเบียบที่ต้องการแก้ไข')

  const category = payload.category === 'living' ? 'living' : (payload.category === 'village' ? 'village' : currentParsed.category)
  const title = String(payload.title ?? currentParsed.title ?? '').trim()
  const description = String(payload.description ?? currentParsed.description ?? '').trim()
  const pdf_url = String(payload.pdf_url ?? currentParsed.pdf_url ?? '').trim()
  const pdf_path = String(payload.pdf_path ?? currentParsed.pdf_path ?? '').trim()

  const updates = {
    title,
    content: encodeRulePayload({ category, title, description, pdf_url, pdf_path }),
  }

  const { data, error } = await supabase
    .from('announcements')
    .update(updates)
    .eq('id', id)
    .select('id, title, content, announcement_date, created_at')
    .single()

  if (error) throw error
  return toRuleItem(data)
}

export async function deleteRuleDocument(id) {
  const { error } = await supabase
    .from('announcements')
    .delete()
    .eq('id', id)

  if (error) throw error
  return true
}

export async function uploadRulePdf(file, { category = 'village' } = {}) {
  if (!file) return null

  const fileName = String(file.name || '').toLowerCase()
  const mimeType = String(file.type || '').toLowerCase()
  const isPdf = mimeType === 'application/pdf' || fileName.endsWith('.pdf')
  if (!isPdf) throw new Error('รองรับเฉพาะไฟล์ PDF เท่านั้น')
  if (file.size > MAX_RULE_FILE_BYTES) throw new Error('ไฟล์มีขนาดเกิน 5MB')

  const safeCategory = category === 'living' ? 'living' : 'village'
  const ts = Date.now()
  const path = `rules/${safeCategory}/RULE_${ts}.pdf`

  const { error } = await supabase.storage
    .from(RULE_FILE_BUCKET)
    .upload(path, file, { upsert: true, contentType: 'application/pdf' })

  if (error) throw error

  const { data: publicUrlData } = supabase.storage
    .from(RULE_FILE_BUCKET)
    .getPublicUrl(path)

  return {
    path,
    url: publicUrlData?.publicUrl || '',
  }
}

export async function deleteRulePdfByPath(path) {
  const target = String(path || '').trim()
  if (!target) return true

  const { error } = await supabase.storage
    .from(RULE_FILE_BUCKET)
    .remove([target])

  if (error) throw error
  return true
}
