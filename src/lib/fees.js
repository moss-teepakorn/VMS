import { supabase } from './supabase'

const REJECT_PREFIX = '[REJECT] '

function stripRejectMarker(note) {
  const raw = String(note || '')
  if (!raw.startsWith(REJECT_PREFIX)) return raw
  const lines = raw.split('\n')
  lines.shift()
  return lines.join('\n').trim()
}

async function refreshFeeStatusFromPayments(feeId) {
  if (!feeId) return

  const { data: fee, error: feeError } = await supabase
    .from('fees')
    .select('id, total_amount')
    .eq('id', feeId)
    .maybeSingle()

  if (feeError) throw feeError
  if (!fee) return

  const { data: approvedPayments, error: paymentError } = await supabase
    .from('payments')
    .select('amount')
    .eq('fee_id', feeId)
    .not('verified_at', 'is', null)

  if (paymentError) throw paymentError

  const approvedTotal = (approvedPayments || []).reduce((sum, item) => sum + Number(item.amount || 0), 0)
  const nextStatus = approvedTotal >= Number(fee.total_amount || 0) ? 'paid' : 'pending'

  const { error: updateError } = await supabase
    .from('fees')
    .update({ status: nextStatus })
    .eq('id', feeId)

  if (updateError) throw updateError
}

export async function listFees({ status = 'all', year = 'all', search = '' } = {}) {
  let query = supabase
    .from('fees')
    .select('id, house_id, year, period, invoice_date, due_date, status, fee_common, fee_parking, fee_waste, fee_overdue_common, fee_overdue_fine, fee_overdue_notice, fee_fine, fee_notice, fee_violation, fee_other, total_amount, note, created_at, houses(id, house_no, owner_name)')
    .order('created_at', { ascending: false })

  if (status && status !== 'all') {
    query = query.eq('status', status)
  }

  if (year && year !== 'all') {
    query = query.eq('year', Number(year))
  }

  if (search && search.trim()) {
    const keyword = search.trim()
    query = query.or(`period.ilike.%${keyword}%,note.ilike.%${keyword}%`)
  }

  const { data, error } = await query
  if (error) throw error
  return data ?? []
}

export async function listHouseFees(houseId, { status = 'all', year = 'all' } = {}) {
  if (!houseId) return []

  let query = supabase
    .from('fees')
    .select('id, house_id, year, period, invoice_date, due_date, status, total_amount, note, created_at')
    .eq('house_id', houseId)
    .order('year', { ascending: false })
    .order('created_at', { ascending: false })

  if (status && status !== 'all') {
    query = query.eq('status', status)
  }

  if (year && year !== 'all') {
    query = query.eq('year', Number(year))
  }

  const { data, error } = await query
  if (error) throw error
  return data ?? []
}

export async function createFee(payload) {
  const fee = {
    house_id: payload.house_id || null,
    year: Number(payload.year),
    period: payload.period || 'full_year',
    invoice_date: payload.invoice_date || null,
    due_date: payload.due_date || null,
    status: payload.status || 'unpaid',
    fee_common: Number(payload.fee_common || 0),
    fee_parking: Number(payload.fee_parking || 0),
    fee_waste: Number(payload.fee_waste || 0),
    fee_overdue_common: Number(payload.fee_overdue_common || 0),
    fee_overdue_fine: Number(payload.fee_overdue_fine || 0),
    fee_overdue_notice: Number(payload.fee_overdue_notice || 0),
    fee_fine: Number(payload.fee_fine || 0),
    fee_notice: Number(payload.fee_notice || 0),
    fee_violation: Number(payload.fee_violation || 0),
    fee_other: Number(payload.fee_other || 0),
    note: payload.note?.trim() || null,
  }

  const { data, error } = await supabase
    .from('fees')
    .insert([fee])
    .select('id, house_id, year, period, invoice_date, due_date, status, fee_common, fee_parking, fee_waste, fee_overdue_common, fee_overdue_fine, fee_overdue_notice, fee_fine, fee_notice, fee_violation, fee_other, total_amount, note, created_at, houses(id, house_no, owner_name)')
    .single()

  if (error) throw error
  return data
}

export async function updateFee(id, updates) {
  const { data, error } = await supabase
    .from('fees')
    .update(updates)
    .eq('id', id)
    .select('id, house_id, year, period, invoice_date, due_date, status, fee_common, fee_parking, fee_waste, fee_overdue_common, fee_overdue_fine, fee_overdue_notice, fee_fine, fee_notice, fee_violation, fee_other, total_amount, note, created_at, houses(id, house_no, owner_name)')
    .single()

  if (error) throw error
  return data
}

export async function deleteFee(id) {
  const { error } = await supabase
    .from('fees')
    .delete()
    .eq('id', id)

  if (error) throw error
  return true
}

export async function listPayments({ limit } = {}) {
  let query = supabase
    .from('payments')
    .select('id, fee_id, house_id, amount, payment_method, slip_url, paid_at, verified_by, verified_at, note, verified_profile:verified_by(full_name), fees(id, year, period, status, total_amount, due_date, invoice_date), houses(id, house_no, owner_name)')
    .order('paid_at', { ascending: false })

  if (limit) {
    query = query.limit(limit)
  }

  const { data, error } = await query
  if (error) throw error
  return data ?? []
}

export async function listHousePayments(houseId, { limit } = {}) {
  if (!houseId) return []

  let query = supabase
    .from('payments')
    .select('id, fee_id, house_id, amount, payment_method, slip_url, paid_at, verified_by, verified_at, note, verified_profile:verified_by(full_name), fees(id, year, period, status, total_amount, due_date, invoice_date)')
    .eq('house_id', houseId)
    .order('paid_at', { ascending: false })

  if (limit) {
    query = query.limit(limit)
  }

  const { data, error } = await query
  if (error) throw error
  return data ?? []
}

export async function createPayment(payload) {
  const payment = {
    fee_id: payload.fee_id || null,
    house_id: payload.house_id || null,
    amount: Number(payload.amount || 0),
    payment_method: payload.payment_method || 'transfer',
    slip_url: payload.slip_url?.trim() || null,
    note: payload.note?.trim() || null,
    paid_at: payload.paid_at || new Date().toISOString(),
  }

  const { data, error } = await supabase
    .from('payments')
    .insert([payment])
    .select('id, fee_id, house_id, amount, payment_method, slip_url, paid_at, verified_by, verified_at, note, verified_profile:verified_by(full_name), fees(id, year, period, status, total_amount, due_date, invoice_date), houses(id, house_no, owner_name)')
    .single()

  if (error) throw error

  if (payload.fee_id) {
    const { error: feeError } = await supabase
      .from('fees')
      .update({ status: 'pending' })
      .eq('id', payload.fee_id)

    if (feeError) throw feeError
  }

  return data
}

export async function approvePayment(paymentId, approverId) {
  const verifiedAt = new Date().toISOString()

  const { data, error } = await supabase
    .from('payments')
    .update({ verified_by: approverId || null, verified_at: verifiedAt })
    .eq('id', paymentId)
    .select('id, fee_id, house_id, amount, payment_method, slip_url, paid_at, verified_by, verified_at, note, verified_profile:verified_by(full_name), fees(id, year, period, status, total_amount, due_date, invoice_date), houses(id, house_no, owner_name)')
    .single()

  if (error) throw error

  if (data?.fee_id) {
    await refreshFeeStatusFromPayments(data.fee_id)
  }

  return data
}

export async function revokePaymentApproval(paymentId) {
  const { data, error } = await supabase
    .from('payments')
    .update({ verified_by: null, verified_at: null })
    .eq('id', paymentId)
    .select('id, fee_id, house_id, amount, payment_method, slip_url, paid_at, verified_by, verified_at, note, verified_profile:verified_by(full_name), fees(id, year, period, status, total_amount, due_date, invoice_date), houses(id, house_no, owner_name)')
    .single()

  if (error) throw error

  if (data?.fee_id) {
    const { error: feeError } = await supabase
      .from('fees')
      .update({ status: 'unpaid' })
      .eq('id', data.fee_id)

    if (feeError) throw feeError
  }

  return data
}

export async function rejectPayment(paymentId, reason, approverId) {
  const normalizedReason = String(reason || '').trim()
  if (!normalizedReason) {
    throw new Error('กรุณาระบุเหตุผลการตีกลับ')
  }

  const { data: current, error: currentError } = await supabase
    .from('payments')
    .select('id, fee_id, note')
    .eq('id', paymentId)
    .single()

  if (currentError) throw currentError

  const originalNote = stripRejectMarker(current.note)
  const rejectNote = `${REJECT_PREFIX}${normalizedReason}${originalNote ? `\n${originalNote}` : ''}`

  const { data, error } = await supabase
    .from('payments')
    .update({ verified_by: approverId || null, verified_at: null, note: rejectNote })
    .eq('id', paymentId)
    .select('id, fee_id, house_id, amount, payment_method, slip_url, paid_at, verified_by, verified_at, note, verified_profile:verified_by(full_name), fees(id, year, period, status, total_amount, due_date, invoice_date), houses(id, house_no, owner_name)')
    .single()

  if (error) throw error

  if (data?.fee_id) {
    const { error: feeError } = await supabase
      .from('fees')
      .update({ status: 'unpaid' })
      .eq('id', data.fee_id)

    if (feeError) throw feeError
  }

  return data
}

export function summarizeFees(fees, payments) {
  const totalInvoiced = fees.reduce((sum, fee) => sum + Number(fee.total_amount || 0), 0)
  const totalCollected = payments
    .filter((payment) => payment.verified_at)
    .reduce((sum, payment) => sum + Number(payment.amount || 0), 0)
  const totalOutstanding = fees
    .filter((fee) => fee.status !== 'paid')
    .reduce((sum, fee) => sum + Number(fee.total_amount || 0), 0)

  return {
    totalInvoiced,
    totalCollected,
    totalOutstanding,
  }
}