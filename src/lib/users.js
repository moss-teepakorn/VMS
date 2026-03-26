import { supabase } from './supabase'

export async function getUsers() {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, phone, role, is_active, created_at')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching users:', error)
      return []
    }

    return data || []
  } catch (error) {
    console.error('Error in getUsers:', error)
    return []
  }
}

export async function createUser(userData) {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .insert([{
        id: userData.id,
        full_name: userData.full_name,
        phone: userData.phone,
        role: userData.role || 'resident',
        is_active: userData.is_active ?? true,
      }])
      .select()

    if (error) {
      throw new Error(error.message)
    }

    return data?.[0]
  } catch (error) {
    console.error('Error creating user:', error)
    throw error
  }
}

export async function updateUser(userId, updates) {
  try {
    const payload = {}
    if (typeof updates.full_name !== 'undefined') payload.full_name = updates.full_name
    if (typeof updates.phone !== 'undefined') payload.phone = updates.phone
    if (typeof updates.role !== 'undefined') payload.role = updates.role
    if (typeof updates.is_active !== 'undefined') payload.is_active = updates.is_active

    const { data, error } = await supabase
      .from('profiles')
      .update(payload)
      .eq('id', userId)
      .select()

    if (error) {
      throw new Error(error.message)
    }

    return data?.[0]
  } catch (error) {
    console.error('Error updating user:', error)
    throw error
  }
}

export async function deleteUser(userId) {
  try {
    const { error } = await supabase
      .from('profiles')
      .delete()
      .eq('id', userId)

    if (error) {
      throw new Error(error.message)
    }

    return true
  } catch (error) {
    console.error('Error deleting user:', error)
    throw error
  }
}

export function formatDateTime(value) {
  if (!value) return '-'
  try {
    return new Date(value).toLocaleString('th-TH', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return '-'
  }
}
