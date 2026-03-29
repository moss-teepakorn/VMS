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

function getNextHalfYearPeriod(yearCE, period) {
  if (period === 'first_half') {
    return { year: yearCE, period: 'second_half' }
  }
  return { year: yearCE + 1, period: 'first_half' }
}

function buildInvoiceDocumentNo(fee) {
  const yearSuffix = String(Number(fee?.year || 0)).slice(-2)
  const idPrefix = String(fee?.id || '').slice(0, 8).toUpperCase()
  return `INV-${yearSuffix}-${idPrefix}`
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
    .select('id, house_id, year, period, invoice_date, due_date, status, fee_common, fee_parking, fee_waste, fee_overdue_common, fee_overdue_fine, fee_overdue_notice, fee_fine, fee_notice, fee_violation, fee_other, total_amount, note, created_at, houses(id, house_no, soi, owner_name, area_sqw, fee_rate)')
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

export async function getLatestFeeYear() {
  const { data, error } = await supabase
    .from('fees')
    .select('year')
    .order('year', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) throw error
  return Number(data?.year || new Date().getFullYear())
}

export async function getFeeYears() {
  const { data, error } = await supabase
    .from('fees')
    .select('year')
    .order('year', { ascending: false })

  if (error) throw error

  return [...new Set((data || []).map((row) => Number(row.year)).filter(Boolean))].sort((a, b) => b - a)
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
    .select('id, house_id, year, period, invoice_date, due_date, status, fee_common, fee_parking, fee_waste, fee_overdue_common, fee_overdue_fine, fee_overdue_notice, fee_fine, fee_notice, fee_violation, fee_other, total_amount, note, created_at, houses(id, house_no, soi, owner_name, area_sqw, fee_rate)')
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

  // Enforce sequence after the first generation: H1 -> H2 -> next-year H1 -> ...
  const { data: latestHalfYearFee, error: latestHalfYearError } = await supabase
    .from('fees')
    .select('year, period, status')
    .in('period', ['first_half', 'second_half'])
    .neq('status', 'cancelled')
    .order('year', { ascending: false })
    .order('period', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (latestHalfYearError) throw latestHalfYearError

  if (latestHalfYearFee?.year && latestHalfYearFee?.period) {
    const latestYear = Number(latestHalfYearFee.year)
    const latestPeriod = latestHalfYearFee.period
    const sameTarget = latestYear === yearCE && latestPeriod === period
    const nextExpected = getNextHalfYearPeriod(latestYear, latestPeriod)
    const isExpectedNext = nextExpected.year === yearCE && nextExpected.period === period

    if (!sameTarget && !isExpectedNext) {
      const expectedLabel = `${nextExpected.period === 'first_half' ? 'ครึ่งปีแรก' : 'ครึ่งปีหลัง'} ปี ${nextExpected.year + 543}`
      throw new Error(`สร้างข้ามงวดไม่ได้: ถัดไปต้องเป็น ${expectedLabel}`)
    }
  }

  const ratePerSqw = toAmount(setup?.fee_rate_per_sqw)
  const wastePerPeriod = toAmount(setup?.waste_fee_per_period)
  const finePct = toAmount(setup?.overdue_fine_pct)
  const noticeFee = round2(toAmount(setup?.notice_fee))
  const dates = halfYearDates(yearCE, period)

  // Fields required for accurate carry-forward calculation
  const CARRY_SELECT = 'id, house_id, status, fee_common, fee_overdue_common, fee_overdue_notice, fee_notice, note'

  const [housesResp, existingResp, fullYearResp, sameYearPrevResp, prevYearResp, parkingByHouse] = await Promise.all([
    supabase.from('houses').select('id, area_sqw'),
    supabase.from('fees').select('id, house_id, status').eq('year', yearCE).eq('period', period),
    // Check which houses already have a full_year invoice for this year
    supabase.from('fees').select('house_id').eq('year', yearCE).eq('period', 'full_year'),
    // For second_half: carry from first_half of same year (H1 → H2)
    period === 'second_half'
      ? supabase.from('fees').select(CARRY_SELECT).eq('year', yearCE).eq('period', 'first_half')
      : Promise.resolve({ data: [], error: null }),
    // For first_half: carry from second_half of previous year (H2 prev year → H1 new year)
    period === 'first_half'
      ? supabase.from('fees').select(CARRY_SELECT).eq('year', yearCE - 1).eq('period', 'second_half')
      : Promise.resolve({ data: [], error: null }),
    getParkingMonthlyByHouse(),
  ])

  if (housesResp.error) throw housesResp.error
  if (existingResp.error) throw existingResp.error
  if (fullYearResp.error) throw fullYearResp.error
  if (sameYearPrevResp.error) throw sameYearPrevResp.error
  if (prevYearResp.error) throw prevYearResp.error

  const existingByHouse = new Map((existingResp.data || []).map((row) => [row.house_id, row]))
  const fullYearHouseIds = new Set((fullYearResp.data || []).map((row) => row.house_id))
  // Merge both carry sources — each house can only appear in one of the two queries
  const prevFeeByHouse = new Map(
    [...(sameYearPrevResp.data || []), ...(prevYearResp.data || [])].map((row) => [row.house_id, row]),
  )
  const houses = housesResp.data || []

  const prevFeeIds = [...prevFeeByHouse.values()].map((f) => f.id)
  const prevPaymentFeeIds = new Set()
  if (prevFeeIds.length > 0) {
    const { data: prevPayments, error: prevPaymentError } = await supabase
      .from('payments')
      .select('fee_id')
      .in('fee_id', prevFeeIds)
      .gt('amount', 0)

    if (prevPaymentError) throw prevPaymentError
    for (const row of prevPayments || []) {
      if (row?.fee_id) prevPaymentFeeIds.add(row.fee_id)
    }
  }

  let created = 0
  let updated = 0
  let skippedPaid = 0
  let skippedPending = 0
  let skippedFullYear = 0
  let cancelledFirstHalf = 0

  for (const house of houses) {
    // Skip houses that already have a full_year invoice — no half-year duplicate allowed
    if (fullYearHouseIds.has(house.id)) {
      skippedFullYear += 1
      continue
    }

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
      fee_overdue_common: 0,
      fee_overdue_fine: 0,
      fee_overdue_notice: 0,
      fee_fine: 0,
      fee_notice: 0,
      fee_violation: 0,
      fee_other: 0,
      note: null,
    }

    const prevFee = prevFeeByHouse.get(house.id)
    const canCarry = Boolean(
      prevFee
      && !prevPaymentFeeIds.has(prevFee.id)
      && ['unpaid', 'overdue'].includes(String(prevFee.status || ''))
    )

    if (canCarry) {
      // fee_overdue_common = prev.fee_common + prev.fee_overdue_common (ค่าส่วนกลางเท่านั้น)
      const overdueCommon = round2(toAmount(prevFee.fee_common) + toAmount(prevFee.fee_overdue_common))
      payload.fee_overdue_common = overdueCommon
      payload.fee_overdue_fine = overdueCommon > 0 ? round2(overdueCommon * (finePct / 100)) : 0
      // fee_overdue_notice สะสม: prev.fee_overdue_notice + notice_fee ต่อครั้งทวงถาม
      payload.fee_overdue_notice = overdueCommon > 0 ? round2(toAmount(prevFee.fee_overdue_notice) + noticeFee) : 0
      const prevDocNo = buildInvoiceDocumentNo(prevFee)
      payload.note = period === 'second_half'
        ? `รวมยอดค้างจากครึ่งปีแรก ปี ${yearCE + 543} เลขที่เอกสาร ${prevDocNo}`
        : `รวมยอดค้างจากครึ่งปีหลัง ปี ${yearCE - 1 + 543} เลขที่เอกสาร ${prevDocNo}`
    }

    const existing = existingByHouse.get(house.id)
    if (!existing) {
      const { data: insertedFee, error } = await supabase.from('fees').insert([{ house_id: house.id, ...payload }]).select('id').single()
      if (error) throw error

      if (canCarry) {
        const insertedDocNo = buildInvoiceDocumentNo({ year: yearCE, id: insertedFee?.id })
        const cancelNote = period === 'second_half'
          ? `ยกยอดไปใบแจ้งหนี้ครึ่งปีหลัง ปี ${yearCE + 543} เลขที่เอกสาร ${insertedDocNo} แล้ว — ระบบยกเลิกอัตโนมัติ ห้ามแก้ไข`
          : `ยกยอดไปใบแจ้งหนี้ครึ่งปีแรก ปี ${yearCE + 543} เลขที่เอกสาร ${insertedDocNo} แล้ว — ระบบยกเลิกอัตโนมัติ ห้ามแก้ไข`
        const { error: cancelError } = await supabase
          .from('fees')
          .update({ status: 'cancelled', note: cancelNote })
          .eq('id', prevFee.id)
        if (cancelError) throw cancelError
        cancelledFirstHalf += 1
      }

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

    if (canCarry) {
      const existingDocNo = buildInvoiceDocumentNo({ year: yearCE, id: existing.id })
      const cancelNote = period === 'second_half'
        ? `ยกยอดไปใบแจ้งหนี้ครึ่งปีหลัง ปี ${yearCE + 543} เลขที่เอกสาร ${existingDocNo} แล้ว — ระบบยกเลิกอัตโนมัติ ห้ามแก้ไข`
        : `ยกยอดไปใบแจ้งหนี้ครึ่งปีแรก ปี ${yearCE + 543} เลขที่เอกสาร ${existingDocNo} แล้ว — ระบบยกเลิกอัตโนมัติ ห้ามแก้ไข`
      const { error: cancelError } = await supabase
        .from('fees')
        .update({ status: 'cancelled', note: cancelNote })
        .eq('id', prevFee.id)
      if (cancelError) throw cancelError
      cancelledFirstHalf += 1
    }

    updated += 1
  }

  return {
    created,
    updated,
    skippedPaid,
    skippedPending,
    skippedFullYear,
    cancelledFirstHalf,
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

  const [houseResp, parkingByHouseResp, yearFeesResp] = await Promise.all([
    supabase.from('houses').select('id, area_sqw').eq('id', houseId).single(),
    getParkingMonthlyByHouse(),
    supabase
      .from('fees')
      .select('id, period, status, fee_common, fee_parking, fee_waste, fee_overdue_common, fee_overdue_fine, fee_overdue_notice, fee_fine, fee_notice, fee_violation, fee_other')
      .eq('house_id', houseId)
      .eq('year', yearCE)
      .in('period', ['first_half', 'second_half', 'full_year']),
  ])

  if (houseResp.error) throw houseResp.error
  if (yearFeesResp.error) throw yearFeesResp.error

  const yearFees = yearFeesResp.data || []
  const existingFullYear = yearFees.find((row) => row.period === 'full_year')
  const halfYearRows = yearFees.filter((row) => row.period === 'first_half' || row.period === 'second_half')

  if (halfYearRows.length > 0) {
    const halfYearIds = halfYearRows.map((row) => row.id)
    const { data: paymentRows, error: paymentError } = await supabase
      .from('payments')
      .select('id')
      .in('fee_id', halfYearIds)
      .gt('amount', 0)
      .limit(1)

    if (paymentError) throw paymentError
    if ((paymentRows || []).length > 0) {
      throw new Error('บ้านนี้มีรายการจ่ายค่าส่วนกลางแล้ว ไม่สามารถสร้างใบแจ้งหนี้ทั้งปีได้')
    }
  }

  const area = toAmount(houseResp.data?.area_sqw)
  const parkingMonthly = toAmount(parkingByHouseResp.get(houseId))
  const commonBeforeDiscount = round2(area * 12 * ratePerSqw)
  const discountAmount = round2(commonBeforeDiscount * (discountPct / 100))
  const feeParking = round2(parkingMonthly * 12)
  const feeWaste = round2(wastePerPeriod * 2)

  const hasSecondHalf = halfYearRows.some((row) => row.period === 'second_half')
  // Store fee_common as the FULL (pre-discount) amount and put the discount as a negative fee_other.
  // This follows the same [DISCOUNT:x] note pattern used by the edit modal, so when the admin
  // opens the edit form they see the discount properly in the "ส่วนลด" field.
  const payload = {
    house_id: houseId,
    year: yearCE,
    period: 'full_year',
    invoice_date: `${yearCE}-01-01`,
    due_date: `${yearCE + 1}-01-31`,
    status: 'unpaid',
    fee_common: round2(commonBeforeDiscount),
    fee_parking: feeParking,
    fee_waste: feeWaste,
    fee_overdue_common: 0,
    fee_overdue_fine: 0,
    fee_overdue_notice: 0,
    fee_fine: 0,
    fee_notice: 0,
    fee_violation: 0,
    fee_other: round2(-discountAmount),
    note: `[DISCOUNT:${discountAmount}] คำนวณทั้งปี ลดเฉพาะค่าส่วนกลาง ${discountPct}%`,
  }

  if (hasSecondHalf) {
    const sumField = (field) => halfYearRows.reduce((sum, row) => sum + toAmount(row[field]), 0)
    payload.fee_common = round2(sumField('fee_common'))
    payload.fee_parking = round2(sumField('fee_parking'))
    payload.fee_waste = round2(sumField('fee_waste'))
    payload.fee_overdue_common = round2(sumField('fee_overdue_common'))
    payload.fee_overdue_fine = round2(sumField('fee_overdue_fine'))
    payload.fee_overdue_notice = round2(sumField('fee_overdue_notice'))
    payload.fee_fine = round2(sumField('fee_fine'))
    payload.fee_notice = round2(sumField('fee_notice'))
    payload.fee_violation = round2(sumField('fee_violation'))
    payload.fee_other = round2(sumField('fee_other'))
    payload.note = 'รวมรายการจากใบแจ้งหนี้ครึ่งปีเป็นใบแจ้งหนี้เต็มปี (ไม่ใช้ส่วนลด)'
  }

  if (existingFullYear?.id) {
    const { data, error } = await supabase
      .from('fees')
      .update(payload)
      .eq('id', existingFullYear.id)
      .select('id, house_id, year, period, invoice_date, due_date, status, fee_common, fee_parking, fee_waste, fee_overdue_common, fee_overdue_fine, fee_overdue_notice, fee_fine, fee_notice, fee_violation, fee_other, total_amount, note, created_at, houses(id, house_no, owner_name)')
      .single()
    if (error) throw error

    if (halfYearRows.length > 0) {
      const { error: deleteHalfError } = await supabase
        .from('fees')
        .delete()
        .in('id', halfYearRows.map((row) => row.id))
      if (deleteHalfError) throw deleteHalfError
    }

    return data
  }

  const { data, error } = await supabase
    .from('fees')
    .insert([payload])
    .select('id, house_id, year, period, invoice_date, due_date, status, fee_common, fee_parking, fee_waste, fee_overdue_common, fee_overdue_fine, fee_overdue_notice, fee_fine, fee_notice, fee_violation, fee_other, total_amount, note, created_at, houses(id, house_no, owner_name)')
    .single()
  if (error) throw error

  if (halfYearRows.length > 0) {
    const { error: deleteHalfError } = await supabase
      .from('fees')
      .delete()
      .in('id', halfYearRows.map((row) => row.id))
    if (deleteHalfError) throw deleteHalfError
  }

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

  if (fee.status === 'cancelled') {
    throw new Error('ใบแจ้งหนี้ถูกยกเลิกโดยระบบ ไม่สามารถคำนวณค่าปรับได้')
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

    if (fee.status === 'cancelled') {
      skippedNotDue += 1
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

    if (fee.status === 'cancelled') {
      skippedNotDue += 1
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

export async function listNoticePrintCountsByFeeIds(feeIds = []) {
  const ids = Array.isArray(feeIds) ? feeIds.filter(Boolean) : []
  if (ids.length === 0) return {}

  const { data, error } = await supabase
    .from('fee_notice_print_logs')
    .select('fee_id, notice_no')
    .in('fee_id', ids)

  if (error) throw error

  const counts = {}
  for (const row of data || []) {
    const feeId = row?.fee_id
    if (!feeId) continue
    const noticeNo = Number(row?.notice_no || 0)
    counts[feeId] = Math.max(Number(counts[feeId] || 0), noticeNo)
  }
  return counts
}

export async function createNoticePrintLogs(rows = []) {
  const payload = (Array.isArray(rows) ? rows : [])
    .filter((row) => row?.fee_id && Number(row?.notice_no || 0) > 0)
    .map((row) => ({
      fee_id: row.fee_id,
      notice_no: Number(row.notice_no),
      print_mode: row.print_mode || 'paper',
      printed_by: row.printed_by || null,
      printed_at: row.printed_at || new Date().toISOString(),
    }))

  if (payload.length === 0) return []

  const { data, error } = await supabase
    .from('fee_notice_print_logs')
    .insert(payload)
    .select('id, fee_id, notice_no, print_mode, printed_by, printed_at, created_at')

  if (error) throw error
  return data || []
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
    .filter((fee) => fee.status !== 'paid' && fee.status !== 'cancelled')
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