import { supabase } from './supabase'

export async function getAuditLogs(limit = 100) {
  try {
    const { data, error } = await supabase
      .from('audit_logs')
      .select('id, user_id, action, table_name, record_id, new_values, acted_at, profiles:user_id(name, email)')
      .order('acted_at', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('Error fetching audit logs:', error)
      return []
    }

    return data || []
  } catch (error) {
    console.error('Error in getAuditLogs:', error)
    return []
  }
}

export async function getAuditLogsByUser(userId, limit = 50) {
  try {
    const { data, error } = await supabase
      .from('audit_logs')
      .select('id, user_id, action, table_name, record_id, new_values, acted_at')
      .eq('user_id', userId)
      .order('acted_at', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('Error fetching user audit logs:', error)
      return []
    }

    return data || []
  } catch (error) {
    console.error('Error in getAuditLogsByUser:', error)
    return []
  }
}

export async function getAuditLogsByTable(tableName, limit = 50) {
  try {
    const { data, error } = await supabase
      .from('audit_logs')
      .select('id, user_id, action, table_name, record_id, new_values, acted_at, profiles:user_id(name)')
      .eq('table_name', tableName)
      .order('acted_at', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('Error fetching table audit logs:', error)
      return []
    }

    return data || []
  } catch (error) {
    console.error('Error in getAuditLogsByTable:', error)
    return []
  }
}

export async function getAuditLogDetail(logId) {
  try {
    const { data, error } = await supabase
      .from('audit_logs')
      .select('id, user_id, action, table_name, record_id, new_values, acted_at, profiles:user_id(name, email)')
      .eq('id', logId)
      .single()

    if (error) {
      console.error('Error fetching audit log detail:', error)
      return null
    }

    return data
  } catch (error) {
    console.error('Error in getAuditLogDetail:', error)
    return null
  }
}
