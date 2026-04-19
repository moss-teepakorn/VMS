import { supabase } from './supabase'

const REJECT_PREFIX = '[REJECT] '

function sumBy(items, selector) {
  return items.reduce((sum, item) => sum + Number(selector(item) || 0), 0)
}

function monthKey(dateValue) {
  const date = new Date(dateValue)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

function quarterKey(dateValue) {
  const date = new Date(dateValue)
  return `Q${Math.floor(date.getMonth() / 3) + 1}`
}

function toBE(yearCE) {
  const year = Number(yearCE)
  if (!Number.isFinite(year)) return '-'
  return year + 543
}

function periodLabel(period) {
  if (period === 'first_half') return 'ครึ่งปีแรก'
  if (period === 'second_half') return 'ครึ่งปีหลัง'
  if (period === 'full_year') return 'ทั้งปี'
  return period || '-'
}

function isRejectedPayment(note) {
  return String(note || '').trim().startsWith(REJECT_PREFIX)
}

function mapStatus(status) {
  const raw = String(status || '').trim().toLowerCase()
  if (['resolved', 'closed', 'completed', 'done'].includes(raw)) {
    return { label: 'แก้ไขแล้ว', tone: 'ok' }
  }
  if (['pending', 'open', 'new', 'waiting'].includes(raw)) {
    return { label: 'รอดำเนินการ', tone: 'wn' }
  }
  if (['in_progress', 'processing', 'investigating'].includes(raw)) {
    return { label: 'กำลังดำเนินการ', tone: 'pr' }
  }
  if (['rejected', 'cancelled', 'canceled'].includes(raw)) {
    return { label: 'ปฏิเสธ', tone: 'dg' }
  }
  return { label: status || '-', tone: 'pr' }
}

function normalizeRequestType(type) {
  const raw = String(type || '').trim().toLowerCase()
  if (raw === 'edit') return 'แก้ไขข้อมูลรถ'
  if (raw === 'add') return 'เพิ่มรถใหม่'
  if (raw === 'register') return 'ลงทะเบียนผู้ใช้งาน'
  if (raw === 'house_profile_update') return 'แก้ไขข้อมูลบ้าน'
  return raw || 'คำขอทั่วไป'
}

function requestMetaText(request) {
  const houseNo = request?.houses?.house_no || request?.house_no || '-'
  const owner = request?.profiles?.full_name || request?.full_name || request?.requested_username || '-'
  return `บ้าน ${houseNo} · ${owner}`
}

export async function getDashboardData() {
  const [housesResult, feesResult, paymentsResult, issuesResult, vehiclesResult, marketplaceResult, techniciansResult, violationsResult] = await Promise.all([
    supabase.from('houses').select('id, house_no, status, created_at'),
    supabase.from('fees').select('id, house_id, year, period, status, total_amount, created_at, invoice_date, due_date, houses(house_no)').order('created_at', { ascending: false }),
    supabase.from('payments').select('id, house_id, amount, paid_at, payment_method, verified_at, note, fees(year, period), houses(house_no)').order('paid_at', { ascending: false }),
    supabase.from('issues').select('id, house_id, title, category, status, rating, created_at, houses(house_no)').order('created_at', { ascending: false }),
    supabase.from('vehicles').select('id, status, created_at, house_id, houses(house_no)').order('created_at', { ascending: false }),
    supabase.from('marketplace').select('id, status, created_at, house_id, title, houses(house_no)').order('created_at', { ascending: false }),
    supabase.from('technicians').select('id, status, created_at, name').order('created_at', { ascending: false }),
    supabase.from('violations').select('id, status, created_at, type, house_id, houses(house_no)').order('created_at', { ascending: false }),
  ])

  const [vehicleRequestsResult, accountRequestsResult] = await Promise.allSettled([
    supabase
      .from('vehicle_requests')
      .select('id, status, request_type, created_at, house_id, house_no, license_plate, province, vehicle_type, houses(house_no), profiles:created_by_id(full_name, username)')
      .eq('status', 'pending')
      .order('created_at', { ascending: false }),
    supabase
      .from('account_requests')
      .select('id, status, request_type, created_at, house_id, requested_username, full_name, houses(house_no), profiles:profile_id(full_name, username)')
      .eq('status', 'pending')
      .order('created_at', { ascending: false }),
  ])

  for (const result of [housesResult, feesResult, paymentsResult, issuesResult, vehiclesResult, marketplaceResult, techniciansResult, violationsResult]) {
    if (result.error) throw result.error
  }

  const houses = housesResult.data ?? []
  const fees = feesResult.data ?? []
  const payments = paymentsResult.data ?? []
  const issues = issuesResult.data ?? []
  const vehicles = vehiclesResult.data ?? []
  const marketplace = marketplaceResult.data ?? []
  const technicians = techniciansResult.data ?? []
  const violations = violationsResult.data ?? []
  const vehicleRequests = vehicleRequestsResult.status === 'fulfilled' && !vehicleRequestsResult.value.error
    ? (vehicleRequestsResult.value.data || [])
    : []
  const accountRequests = accountRequestsResult.status === 'fulfilled' && !accountRequestsResult.value.error
    ? (accountRequestsResult.value.data || [])
    : []

  const now = new Date()
  const currentMonth = now.getMonth()
  const currentYear = now.getFullYear()
  const sixMonthBuckets = Array.from({ length: 6 }, (_, index) => {
    const date = new Date(currentYear, currentMonth - (5 - index), 1)
    return {
      key: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`,
      label: date.toLocaleDateString('th-TH', { month: 'short' }),
      collected: 0,
      outstanding: 0,
    }
  })

  for (const payment of payments) {
    const key = monthKey(payment.paid_at)
    const bucket = sixMonthBuckets.find((item) => item.key === key)
    if (bucket) bucket.collected += Number(payment.amount || 0)
  }

  for (const fee of fees) {
    const sourceDate = fee.invoice_date || fee.due_date || fee.created_at
    const key = monthKey(sourceDate)
    const bucket = sixMonthBuckets.find((item) => item.key === key)
    if (bucket && fee.status !== 'paid') bucket.outstanding += Number(fee.total_amount || 0)
  }

  const quarterBuckets = ['Q1', 'Q2', 'Q3', 'Q4'].map((key) => ({ key, paid: 0, outstanding: 0 }))
  for (const payment of payments.filter((payment) => new Date(payment.paid_at).getFullYear() === currentYear)) {
    const bucket = quarterBuckets.find((item) => item.key === quarterKey(payment.paid_at))
    if (bucket) bucket.paid += Number(payment.amount || 0)
  }
  for (const fee of fees.filter((fee) => Number(fee.year) === currentYear)) {
    const sourceDate = fee.invoice_date || fee.due_date || fee.created_at
    const bucket = quarterBuckets.find((item) => item.key === quarterKey(sourceDate))
    if (bucket && fee.status !== 'paid') bucket.outstanding += Number(fee.total_amount || 0)
  }

  const houseStatus = {
    normal: houses.filter((house) => house.status === 'normal').length,
    overdue: houses.filter((house) => house.status === 'overdue').length,
    suspended: houses.filter((house) => house.status === 'suspended').length,
    lawsuit: houses.filter((house) => house.status === 'lawsuit').length,
  }

  const issueCategories = ['ไฟฟ้า', 'ประปา', 'ถนน', 'ความสะอาด', 'ความปลอดภัย', 'อื่นๆ'].map((category) => ({
    category,
    count: issues.filter((issue) => (issue.category || 'อื่นๆ') === category).length,
  }))

  const vehicleRequestKeySet = new Set(
    vehicleRequests
      .map((row) => [
        String(row.house_id || ''),
        String(row.license_plate || '').trim().toLowerCase(),
        String(row.province || '').trim().toLowerCase(),
        String(row.vehicle_type || '').trim().toLowerCase(),
      ].join('|')),
  )

  const fallbackPendingVehicleCount = vehicles.filter((row) => {
    if (row.status !== 'pending') return false
    const key = [
      String(row.house_id || ''),
      String(row.license_plate || '').trim().toLowerCase(),
      String(row.province || '').trim().toLowerCase(),
      String(row.vehicle_type || '').trim().toLowerCase(),
    ].join('|')
    return !vehicleRequestKeySet.has(key)
  }).length

  const pendingRequests = vehicleRequests.length + accountRequests.length + fallbackPendingVehicleCount
  const pendingIssues = issues.filter((item) => item.status === 'pending').length
  const pendingPayments = payments.filter((item) => !item.verified_at && !isRejectedPayment(item.note)).length
  const pendingTechnicians = technicians.filter((item) => item.status === 'pending').length
  const pendingMarketplace = marketplace.filter((item) => item.status === 'pending').length
  const pendingApprovals = pendingRequests + pendingIssues + pendingPayments + pendingTechnicians + pendingMarketplace

  const openIssues = issues.filter((item) => item.status === 'pending' || item.status === 'in_progress')
  const avgRatingItems = issues.filter((item) => Number(item.rating) > 0)
  const averageRating = avgRatingItems.length
    ? sumBy(avgRatingItems, (item) => item.rating) / avgRatingItems.length
    : 0

  const quickApprovals = {
    slips: payments
      .filter((item) => !item.verified_at && !isRejectedPayment(item.note))
      .slice(0, 4)
      .map((item) => {
        const periodText = item.fees
          ? `งวด ${periodLabel(item.fees.period)} ปี ${toBE(item.fees.year)}`
          : 'ไม่ระบุงวด'
        return {
          type: 'สลิปโอน',
          source: item.houses?.house_no || '-',
          detail: `${periodText} · ฿${Number(item.amount || 0).toLocaleString('th-TH')}`,
          route: '/admin/payments',
        }
      }),
    requests: [
      ...vehicleRequests.map((item) => ({
        type: normalizeRequestType(item.request_type),
        source: item.houses?.house_no || item.house_no || '-',
        detail: requestMetaText(item),
        route: '/admin/requests',
        createdAt: item.created_at,
      })),
      ...accountRequests.map((item) => ({
        type: normalizeRequestType(item.request_type),
        source: item.houses?.house_no || item.house_no || '-',
        detail: requestMetaText(item),
        route: '/admin/requests',
        createdAt: item.created_at,
      })),
    ]
      .sort((left, right) => new Date(right.createdAt || 0).getTime() - new Date(left.createdAt || 0).getTime())
      .slice(0, 8),
  }

  const alerts = violations
    .map((item) => {
      const mapped = mapStatus(item.status)
      return {
        kind: 'violation',
        title: item.type,
        meta: `บ้าน ${item.houses?.house_no || '-'} · ${new Date(item.created_at).toLocaleDateString('th-TH')}`,
        statusLabel: mapped.label,
        statusTone: mapped.tone,
        createdAt: item.created_at,
      }
    })
    .sort((left, right) => new Date(right.createdAt || 0).getTime() - new Date(left.createdAt || 0).getTime())
    .slice(0, 4)

  return {
    header: {
      totalHouses: houses.length,
      averageRating,
      totalOutstanding: sumBy(fees.filter((item) => item.status !== 'paid'), (item) => item.total_amount),
    },
    kpis: {
      totalHouses: houses.length,
      newHousesThisMonth: houses.filter((house) => {
        const created = new Date(house.created_at)
        return created.getMonth() === currentMonth && created.getFullYear() === currentYear
      }).length,
      overdueCount: fees.filter((item) => item.status === 'overdue' || item.status === 'unpaid').length,
      overdueAmount: sumBy(fees.filter((item) => item.status === 'overdue' || item.status === 'unpaid'), (item) => item.total_amount),
      pendingApprovals,
      openIssues: openIssues.length,
      averageRating,
    },
    paymentTrend: sixMonthBuckets,
    houseStatus,
    quarterlyTrend: quarterBuckets,
    issueCategories,
    quickApprovals,
    alerts,
  }
}