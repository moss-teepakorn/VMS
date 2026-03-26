import { supabase } from './supabase'

export async function listMarketplace({ status = 'all', listing_type = 'all', search = '' } = {}) {
  const { data, error } = await supabase
    .from('marketplace')
    .select('id, house_id, title, detail, category, listing_type, price, contact, image_url, status, created_at, houses(id, house_no, soi, owner_name)')
    .order('created_at', { ascending: false })

  if (error) throw error

  const keyword = (search || '').trim().toLowerCase()
  return (data ?? []).filter((item) => {
    if (status !== 'all' && item.status !== status) return false
    if (listing_type !== 'all' && item.listing_type !== listing_type) return false
    if (!keyword) return true
    const searchable = [
      item.title,
      item.detail,
      item.category,
      item.contact,
      item.houses?.house_no,
      item.houses?.owner_name,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
    return searchable.includes(keyword)
  })
}

export async function createMarketplaceItem(payload) {
  const record = {
    house_id: payload.house_id || null,
    title: payload.title?.trim() || null,
    detail: payload.detail?.trim() || null,
    category: payload.category?.trim() || null,
    listing_type: payload.listing_type || 'sell',
    price: Number(payload.price) || 0,
    contact: payload.contact?.trim() || null,
    image_url: payload.image_url?.trim() || null,
    status: payload.status || 'pending',
  }

  const { data, error } = await supabase
    .from('marketplace')
    .insert([record])
    .select('id, house_id, title, detail, category, listing_type, price, contact, image_url, status, created_at, houses(id, house_no, soi, owner_name)')
    .single()

  if (error) throw error
  return data
}

export async function updateMarketplaceItem(id, updates) {
  const { data, error } = await supabase
    .from('marketplace')
    .update(updates)
    .eq('id', id)
    .select('id, house_id, title, detail, category, listing_type, price, contact, image_url, status, created_at, houses(id, house_no, soi, owner_name)')
    .single()

  if (error) throw error
  return data
}

export async function deleteMarketplaceItem(id) {
  const { error } = await supabase
    .from('marketplace')
    .delete()
    .eq('id', id)

  if (error) throw error
  return true
}
