import { supabase } from './supabase'

export async function getUsers() {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, name, email, phone, role, created_at')
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
      .insert([userData])
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
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
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
