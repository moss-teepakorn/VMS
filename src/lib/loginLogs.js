import { supabase } from './supabase'

/**
 * บันทึก login log เมื่อผู้ใช้ login สำเร็จ
 */
export async function insertLoginLog({ user_id, username, full_name, role }) {
  try {
    const { error } = await supabase
      .from('login_logs')
      .insert([{ user_id, username, full_name: full_name || null, role: role || null }])
    if (error) console.error('insertLoginLog error:', error)
  } catch (err) {
    console.error('insertLoginLog exception:', err)
  }
}

/**
 * ดึงรายการ login logs พร้อม filter ตัวเลือก
 * @param {{ search?: string, userId?: string, limit?: number }} opts
 */
export async function getLoginLogs({ search = '', userId = '', limit = 500 } = {}) {
  try {
    let query = supabase
      .from('login_logs')
      .select('id, user_id, username, full_name, role, login_at')
      .order('login_at', { ascending: false })
      .limit(limit)

    if (userId) {
      query = query.eq('user_id', userId)
    }

    const { data, error } = await query
    if (error) {
      console.error('getLoginLogs error:', error)
      return []
    }

    const keyword = (search || '').trim().toLowerCase()
    if (!keyword) return data ?? []

    return (data ?? []).filter((row) => {
      return (
        (row.username || '').toLowerCase().includes(keyword) ||
        (row.full_name || '').toLowerCase().includes(keyword)
      )
    })
  } catch (err) {
    console.error('getLoginLogs exception:', err)
    return []
  }
}

/**
 * ลบ login logs ตาม array ของ id
 * @param {number[]} ids
 */
export async function deleteLoginLogs(ids) {
  if (!ids || ids.length === 0) return
  const { error } = await supabase
    .from('login_logs')
    .delete()
    .in('id', ids)
  if (error) throw error
}

/**
 * ลบ login logs ทั้งหมด
 */
export async function deleteAllLoginLogs() {
  // ใช้ gt(id, 0) เพื่อให้ Supabase ยอมรับ DELETE without filter
  const { error } = await supabase
    .from('login_logs')
    .delete()
    .gt('id', 0)
  if (error) throw error
}
