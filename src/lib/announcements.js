import { supabase } from './supabase'

export async function listAnnouncements({ type = 'all', search = '' } = {}) {
  const { data, error } = await supabase
    .from('announcements')
    .select('id, title, content, type, image_url, is_pinned, created_by, created_at')
    .order('is_pinned', { ascending: false })
    .order('created_at', { ascending: false })

  if (error) throw error

  const keyword = (search || '').trim().toLowerCase()
  return (data ?? []).filter((item) => {
    if (type !== 'all' && item.type !== type) return false
    if (!keyword) return true
    const searchable = [item.title, item.content]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
    return searchable.includes(keyword)
  })
}

export async function createAnnouncement(payload) {
  const record = {
    title: payload.title?.trim() || null,
    content: payload.content?.trim() || null,
    type: payload.type || 'normal',
    is_pinned: Boolean(payload.is_pinned),
    image_url: payload.image_url?.trim() || null,
    created_by: payload.created_by || null,
  }

  const { data, error } = await supabase
    .from('announcements')
    .insert([record])
    .select('id, title, content, type, image_url, is_pinned, created_by, created_at')
    .single()

  if (error) throw error
  return data
}

export async function updateAnnouncement(id, updates) {
  const { data, error } = await supabase
    .from('announcements')
    .update(updates)
    .eq('id', id)
    .select('id, title, content, type, image_url, is_pinned, created_by, created_at')
    .single()

  if (error) throw error
  return data
}

export async function deleteAnnouncement(id) {
  const { error } = await supabase
    .from('announcements')
    .delete()
    .eq('id', id)

  if (error) throw error
  return true
}
