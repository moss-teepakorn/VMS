import React, { useState } from 'react'
import ReportMockPage from './reports/ReportMockPage'
import { listPayments } from '../../lib/fees'

const columns = [
  { key: 'docNo', label: 'เลขที่เอกสาร' },
  { key: 'houseNo', label: 'บ้านเลขที่' },
  { key: 'ownerName', label: 'ชื่อ สกุล' },
  { key: 'period', label: 'งวด' },
  { key: 'amount', label: 'ยอดชำระ' },
  { key: 'method', label: 'ช่องทางชำระ' },
  { key: 'paidAt', label: 'วันที่ชำระ' },
]

function formatPeriod(period, year) {
  if (!period || !year) return '-'
  if (period === 'first_half') return `H1/${year + 543}`
  if (period === 'second_half') return `H2/${year + 543}`
  if (period === 'full_year') return `เต็มปี/${year + 543}`
  return `${period}/${year + 543}`
}

function getCurrentMonth() {
  const now = new Date()
  return now.getMonth() + 1
}
function getCurrentYear() {
  const now = new Date()
  return now.getFullYear()
}

const monthOptions = [
  { value: 1, label: 'มกราคม' },
  { value: 2, label: 'กุมภาพันธ์' },
  { value: 3, label: 'มีนาคม' },
  { value: 4, label: 'เมษายน' },
  { value: 5, label: 'พฤษภาคม' },
  { value: 6, label: 'มิถุนายน' },
  { value: 7, label: 'กรกฎาคม' },
  { value: 8, label: 'สิงหาคม' },
  { value: 9, label: 'กันยายน' },
  { value: 10, label: 'ตุลาคม' },
  { value: 11, label: 'พฤศจิกายน' },
  { value: 12, label: 'ธันวาคม' },
]

export default function AdminReportPayments() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [startMonth, setStartMonth] = useState(getCurrentMonth())
  const [endMonth, setEndMonth] = useState(getCurrentMonth())
  const [year, setYear] = useState(getCurrentYear())
  const [touched, setTouched] = useState(false)

  const handleShowReport = async () => {
    setTouched(true)
    setError('')
    if (startMonth > endMonth) {
      setError('เดือนเริ่มต้นต้องไม่มากกว่าเดือนสิ้นสุด')
      setRows([])
      return
    }
    setLoading(true)
    try {
      const data = await listPayments()
      // Filter by selected month range and year
      const filtered = (data || []).filter((p) => {
        if (!p.paid_at) return false
        const paidDate = new Date(p.paid_at)
        const paidMonth = paidDate.getMonth() + 1
        const paidYear = paidDate.getFullYear()
        return (
          paidYear === Number(year) &&
          paidMonth >= Number(startMonth) &&
          paidMonth <= Number(endMonth)
        )
      })
      setRows(
        filtered.map((p) => ({
          id: p.id,
          docNo: p.fees?.id ? `PAY-${String(p.fees.id).slice(-6).padStart(6, '0')}` : '-',
          houseNo: p.houses?.house_no || '-',
          ownerName: p.houses?.owner_name || '-',
          period: formatPeriod(p.fees?.period, p.fees?.year),
          amount: Number(p.amount || 0).toLocaleString(),
          amountRaw: Number(p.amount || 0),
          method: p.payment_method || '-',
          paidAt: p.paid_at ? p.paid_at.slice(0, 10) : '-',
        }))
      )
    } catch (err) {
      setError(err?.message || 'เกิดข้อผิดพลาดในการโหลดข้อมูล')
      setRows([])
    }
    setLoading(false)
  }

  // Generate year options (current year +/- 5)
  const yearOptions = []
  const thisYear = getCurrentYear()
  for (let y = thisYear + 2; y >= thisYear - 5; y--) {
    yearOptions.push(y)
  }

  return (
    <div className="pane on houses-compact reports-compact">
      <div className="ph">
        <div className="ph-in" style={{ display: 'flex', alignItems: 'center', gap: 16, margin: 0, padding: 0, justifyContent: 'flex-start' }}>
          <div className="ph-ico">💳</div>
          <div>
            <div className="ph-h1" style={{ margin: 0, padding: 0 }}>รายงานการชำระเงิน</div>
            <div className="ph-sub" style={{ margin: 0, padding: 0 }}>รายการรับชำระค่าส่วนกลาง</div>
          </div>
        </div>
      </div>
      <div style={{ width: '100%', margin: '0px 0px 0px', display: 'flex', justifyContent: 'flex-start' }}>
        <form
          className="houses-filter-row"
          style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            gap: 20,
            width: '100%',
            maxWidth: 700
          }}
          onSubmit={e => { e.preventDefault(); handleShowReport(); }}
        >
          <label style={{ marginBottom: 0, fontWeight: 500 }}>
            เดือนเริ่มต้น
            <select value={startMonth} onChange={e => setStartMonth(Number(e.target.value))} className="houses-filter-select" style={{ minWidth: 120, height: 36, marginLeft: 0 }}>
              {monthOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </select>
          </label>
          <label style={{ marginBottom: 0, fontWeight: 500 }}>
            ถึงเดือน
            <select value={endMonth} onChange={e => setEndMonth(Number(e.target.value))} className="houses-filter-select" style={{ minWidth: 120, height: 36, marginLeft: 0 }}>
              {monthOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </select>
          </label>
          <label style={{ marginBottom: 0, fontWeight: 500 }}>
            ปี
            <select value={year} onChange={e => setYear(Number(e.target.value))} className="houses-filter-select" style={{ minWidth: 100, height: 36, marginLeft: 0 }}>
              {yearOptions.map(y => <option key={y} value={y}>{y + 543}</option>)}
            </select>
          </label>
          <button className="btn btn-p" type="submit" style={{ minWidth: 120, height: 36, marginTop: 18 }}>แสดงรายงาน</button>
          {touched && error && <span style={{ color: 'red', marginLeft: 8 }}>{error}</span>}
        </form>
      </div>
      <ReportMockPage
        columns={columns}
        rows={rows}
        loading={loading}
        error={error}
        sumAmount={rows.reduce((sum, r) => sum + (r.amountRaw || 0), 0)}
      />
    </div>
  )
}
