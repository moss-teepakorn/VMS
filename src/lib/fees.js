import { supabase } from './supabase'

const REJECT_PREFIX = '[REJECT] '

function stripRejectMarker(note) {
  const raw = String(note || '')
  if (!raw.startsWith(REJECT_PREFIX)) return raw
  const lines = raw.split('\n')
  lines.shift()
  return lines.join('\n').trim()
}

function toGregorianYear(yearValue) {
  const year = Number(yearValue)
  if (!Number.isFinite(year) || year <= 0) return null
  return year > 2400 ? year - 543 : year
}

function toAmount(value) {
  const n = Number(value || 0)
  return Number.isFinite(n) ? n : 0
}

function round2(value) {
  return Math.round(toAmount(value) * 100) / 100
}

function halfYearDates(yearCE, period) {
  if (period === 'first_half') {
    return {
      invoice_date: `${yearCE}-01-01`,
      due_date: `${yearCE}-07-31`,
    }
  }
  return {
    invoice_date: `${yearCE}-07-01`,
    due_date: `${yearCE + 1}-01-31`,
  }
}

async function getParkingMonthlyByHouse() {
  const { data, error } = await supabase
    .from('vehicles')
    .select('house_id, parking_fee, status')

  if (error) throw error

  const byHouse = new Map()
  for (const row of data || []) {
    if (!row?.house_id) continue
    if (row.status === 'removed') continue
    const monthly = toAmount(row.parking_fee)
    byHouse.set(row.house_id, toAmount(byHouse.get(row.house_id)) + monthly)
  }
  return byHouse
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

export async function listFees({ status = 'all', year = 'all', period = 'all', search = '' } = {}) {
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

  if (period && period !== 'all') {
    query = query.eq('period', period)
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

export async function processHalfYearFeesAllHouses({ yearBE, period, setup, overwritePending = false }) {
  const yearCE = toGregorianYear(yearBE)
  if (!yearCE) throw new Error('ปีไม่ถูกต้อง')
  if (!['first_half', 'second_half'].includes(period)) {
    throw new Error('งวดไม่ถูกต้อง')
  }

  const ratePerSqw = toAmount(setup?.fee_rate_per_sqw)
  const wastePerPeriod = toAmount(setup?.waste_fee_per_period)
  const dates = halfYearDates(yearCE, period)

  const [housesResp, existingResp, parkingByHouse] = await Promise.all([
    supabase.from('houses').select('id, area_sqw'),
    supabase.from('fees').select('id, house_id, status').eq('year', yearCE).eq('period', period),
    getParkingMonthlyByHouse(),
  ])

  if (housesResp.error) throw housesResp.error
  if (existingResp.error) throw existingResp.error

  const existingByHouse = new Map((existingResp.data || []).map((row) => [row.house_id, row]))
  const houses = housesResp.data || []

  let created = 0
  let updated = 0
  let skippedPaid = 0
  let skippedPending = 0

  for (const house of houses) {
    const area = toAmount(house.area_sqw)
    const parkingMonthly = toAmount(parkingByHouse.get(house.id))
    const payload = {
      year: yearCE,
      period,
      invoice_date: dates.invoice_date,
      due_date: dates.due_date,
      status: 'unpaid',
      fee_common: round2(area * 6 * ratePerSqw),
      fee_parking: round2(parkingMonthly * 6),
      fee_waste: round2(wastePerPeriod),
      fee_other: 0,
      note: null,
    }

    const existing = existingByHouse.get(house.id)
    if (!existing) {
      const { error } = await supabase.from('fees').insert([{ house_id: house.id, ...payload }])
      if (error) throw error
      created += 1
      continue
    }

    if (existing.status === 'paid') {
      skippedPaid += 1
      continue
    }

    if (existing.status === 'pending' && !overwritePending) {
      skippedPending += 1
      continue
    }

    const { error } = await supabase
      .from('fees')
      .update(payload)
      .eq('id', existing.id)
    if (error) throw error
    updated += 1
  }

  return {
    created,
    updated,
    skippedPaid,
    skippedPending,
    totalHouses: houses.length,
    yearCE,
    period,
  }
}

export async function calculateFullYearFeeByHouse({ houseId, year, setup }) {
  const yearCE = toGregorianYear(year)
  if (!houseId) throw new Error('ไม่พบบ้าน')
  if (!yearCE) throw new Error('ปีไม่ถูกต้อง')

  const ratePerSqw = toAmount(setup?.fee_rate_per_sqw)
  const wastePerPeriod = toAmount(setup?.waste_fee_per_period)
  const discountPct = toAmount(setup?.early_pay_discount_pct)

  const [houseResp, parkingByHouseResp, existingResp] = await Promise.all([
    supabase.from('houses').select('id, area_sqw').eq('id', houseId).single(),
    getParkingMonthlyByHouse(),
    supabase.from('fees').select('id').eq('house_id', houseId).eq('year', yearCE).eq('period', 'full_year').maybeSingle(),
  ])

  if (houseResp.error) throw houseResp.error
  if (existingResp.error) throw existingResp.error

  const area = toAmount(houseResp.data?.area_sqw)
  const parkingMonthly = toAmount(parkingByHouseResp.get(houseId))
  const commonBeforeDiscount = round2(area * 12 * ratePerSqw)
  const discountAmount = round2(commonBeforeDiscount * (discountPct / 100))
  const feeCommon = Math.ceil(Math.max(0, commonBeforeDiscount - discountAmount))
  const feeParking = round2(parkingMonthly * 12)
  const feeWaste = round2(wastePerPeriod * 2)

  const payload = {
    house_id: houseId,
    year: yearCE,
    period: 'full_year',
    invoice_date: `${yearCE}-01-01`,
    due_date: `${yearCE + 1}-01-31`,
    status: 'unpaid',
    fee_common: feeCommon,
    fee_parking: feeParking,
    fee_waste: feeWaste,
    note: `คำนวณทั้งปี ลดเฉพาะค่าส่วนกลาง ${discountPct}% (ลด ${discountAmount.toLocaleString('th-TH')} บาท, ปัดขึ้นเป็นจำนวนเต็ม)`,
  }

  if (existingResp.data?.id) {
    const { data, error } = await supabase
      .from('fees')
      .update(payload)
      .eq('id', existingResp.data.id)
      .select('id, house_id, year, period, invoice_date, due_date, status, fee_common, fee_parking, fee_waste, fee_overdue_common, fee_overdue_fine, fee_overdue_notice, fee_fine, fee_notice, fee_violation, fee_other, total_amount, note, created_at, houses(id, house_no, owner_name)')
      .single()
    if (error) throw error
    return data
  }

  const { data, error } = await supabase
    .from('fees')
    .insert([payload])
    .select('id, house_id, year, period, invoice_date, due_date, status, fee_common, fee_parking, fee_waste, fee_overdue_common, fee_overdue_fine, fee_overdue_notice, fee_fine, fee_notice, fee_violation, fee_other, total_amount, note, created_at, houses(id, house_no, owner_name)')
    .single()
  if (error) throw error
  return data
}

export async function calculateOverdueFeeCharges(feeId, setup) {
  const { data: fee, error: feeError } = await supabase
    .from('fees')
    .select('id, status, due_date, fee_common, fee_overdue_common')
    .eq('id', feeId)
    .single()

  if (feeError) throw feeError

  if (fee.status === 'paid') {
    throw new Error('ใบแจ้งหนี้ชำระแล้ว ไม่สามารถคำนวณค่าปรับได้')
  }

  const updatePayload = buildOverdueUpdatePayload(fee, setup)

  if (!updatePayload) {
    throw new Error('ยังไม่ถึงเงื่อนไขการคำนวณค่าปรับ')
  }

  const { data, error } = await supabase
    .from('fees')
    .update(updatePayload)
    .eq('id', feeId)
    .select('id, house_id, year, period, invoice_date, due_date, status, fee_common, fee_parking, fee_waste, fee_overdue_common, fee_overdue_fine, fee_overdue_notice, fee_fine, fee_notice, fee_violation, fee_other, total_amount, note, created_at, houses(id, house_no, owner_name)')
    .single()

  if (error) throw error
  return data
}

export async function calculateOverdueFeesBulk({ year, setup } = {}) {
  let query = supabase
    .from('fees')
    .select('id, status, due_date, fee_common, fee_overdue_common')

  if (year && year !== 'all') {
    query = query.eq('year', Number(year))
  }

  const { data, error } = await query
  if (error) throw error

  let updated = 0
  let skippedPaid = 0
  let skippedNotDue = 0

  for (const fee of data || []) {
    if (fee.status === 'paid') {
      skippedPaid += 1
      continue
    }

    const updatePayload = buildOverdueUpdatePayload(fee, setup)
    if (!updatePayload) {
      skippedNotDue += 1
      continue
    }

    const { error: updateError } = await supabase
      .from('fees')
      .update(updatePayload)
      .eq('id', fee.id)

    if (updateError) throw updateError
    updated += 1
  }

  return {
    updated,
    skippedPaid,
    skippedNotDue,
    total: (data || []).length,
  }
}

export async function calculateOverdueFeesByIds({ feeIds, setup } = {}) {
  const ids = Array.isArray(feeIds) ? feeIds.filter(Boolean) : []
  if (ids.length === 0) {
    return { updated: 0, skippedPaid: 0, skippedNotDue: 0, total: 0 }
  }

  const { data, error } = await supabase
    .from('fees')
    .select('id, status, due_date, fee_common, fee_overdue_common')
    .in('id', ids)

  if (error) throw error

  let updated = 0
  let skippedPaid = 0
  let skippedNotDue = 0

  for (const fee of data || []) {
    if (fee.status === 'paid') {
      skippedPaid += 1
      continue
    }

    const updatePayload = buildOverdueUpdatePayload(fee, setup)
    if (!updatePayload) {
      skippedNotDue += 1
      continue
    }

    const { error: updateError } = await supabase
      .from('fees')
      .update(updatePayload)
      .eq('id', fee.id)

    if (updateError) throw updateError
    updated += 1
  }

  return {
    updated,
    skippedPaid,
    skippedNotDue,
    total: (data || []).length,
  }
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

export async function listPaymentTotalsByFeeIds(feeIds = []) {
  const ids = Array.isArray(feeIds) ? feeIds.filter(Boolean) : []
  if (ids.length === 0) return { submitted: {}, approved: {} }

  const { data, error } = await supabase
    .from('payments')
    .select('fee_id, amount, verified_at')
    .in('fee_id', ids)

  if (error) throw error

  const submitted = {}
  const approved = {}
  for (const row of data || []) {
    const feeId = row?.fee_id
    if (!feeId) continue

    const amount = Number(row.amount || 0)
    submitted[feeId] = Number(submitted[feeId] || 0) + amount
    if (row.verified_at) {
      approved[feeId] = Number(approved[feeId] || 0) + amount
    }
  }

  return { submitted, approved }
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
    if (payload.setFeeStatusFromAmount) {
      const { data: feeRow, error: feeReadError } = await supabase
        .from('fees')
        .select('id, total_amount')
        .eq('id', payload.fee_id)
        .single()

      if (feeReadError) throw feeReadError

      const { data: paymentRows, error: paymentReadError } = await supabase
        .from('payments')
        .select('amount')
        .eq('fee_id', payload.fee_id)

      if (paymentReadError) throw paymentReadError

      const submittedTotal = (paymentRows || []).reduce((sum, row) => sum + Number(row.amount || 0), 0)
      const totalAmount = Number(feeRow?.total_amount || 0)

      const nextStatus = submittedTotal >= totalAmount
        ? 'paid'
        : submittedTotal > 0
          ? 'partial'
          : 'unpaid'

      const { error: feeError } = await supabase
        .from('fees')
        .update({ status: nextStatus })
        .eq('id', payload.fee_id)

      if (feeError) throw feeError
    } else {
      const { error: feeError } = await supabase
        .from('fees')
        .update({ status: 'pending' })
        .eq('id', payload.fee_id)

      if (feeError) throw feeError
    }
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

function buildOverdueUpdatePayload(fee, setup) {
  const finePct = toAmount(setup?.overdue_fine_pct)
  const noticeFee = round2(toAmount(setup?.notice_fee))

  const now = new Date()
  const dueOver = fee?.due_date ? now > new Date(`${fee.due_date}T23:59:59`) : false

  const carryBase = toAmount(fee?.fee_overdue_common)
  const currentBase = toAmount(fee?.fee_common)

  const overdueFineCarry = carryBase > 0 ? round2(carryBase * (finePct / 100)) : 0
  const overdueNoticeCarry = carryBase > 0 ? noticeFee : 0

  const overdueFineCurrent = dueOver && currentBase > 0 ? round2(currentBase * (finePct / 100)) : 0
  const overdueNoticeCurrent = dueOver && currentBase > 0 ? noticeFee : 0

  const hasAnyCharge = overdueFineCarry > 0 || overdueNoticeCarry > 0 || overdueFineCurrent > 0 || overdueNoticeCurrent > 0
  if (!hasAnyCharge) return null

  return {
    status: dueOver ? 'overdue' : fee?.status || 'unpaid',
    fee_overdue_fine: overdueFineCarry,
    fee_overdue_notice: overdueNoticeCarry,
    fee_fine: overdueFineCurrent,
    fee_notice: overdueNoticeCurrent,
  }
}