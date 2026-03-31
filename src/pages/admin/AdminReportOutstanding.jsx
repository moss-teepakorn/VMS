import React, { useState, useEffect } from 'react'
import ReportMockPage from './reports/ReportMockPage'
import ReportExportButtons from './ReportExportButtons'
import { getSystemConfig } from '../../lib/systemConfig'
import { listFees, listPaymentTotalsByFeeIds } from '../../lib/fees'

const columns = [
  { key: 'soi', label: 'ซอย' },
  { key: 'houseNo', label: 'บ้านเลขที่' },
  { key: 'ownerName', label: 'ชื่อ-สกุล' },
  { key: 'period', label: 'งวด' },
  { key: 'commonOutstanding', label: 'ค่าส่วนกลางค้างชำระ' },
  { key: 'fineOutstanding', label: 'ค่าปรับค้างชำระ' },
  { key: 'noticeOutstanding', label: 'ค่าทวงถามค้างชำระ' },
  { key: 'otherOutstanding', label: 'อื่นๆ' },
  { key: 'outstanding', label: 'ยอดค้างรวม (บาท)' },
]

function formatPeriod(period, year) {
  if (!period || !year) return '-'
  if (period === 'first_half') return `H1/${year + 543}`
  if (period === 'second_half') return `H2/${year + 543}`
  if (period === 'full_year') return `เต็มปี/${year + 543}`
  return `${period}/${year + 543}`
}

export default function AdminReportOutstanding() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [year, setYear] = useState(new Date().getFullYear())
  const [setup, setSetup] = useState({})
  const [search, setSearch] = useState('')

  useEffect(() => { getSystemConfig().then(setSetup).catch(() => {}) }, [])

  const handleShowReport = async () => {
    setError('')
    setLoading(true)
    try {
      const feeData = await listFees({ status: 'all', year })
      const feeIds = feeData.map(f => f.id)
      const paymentTotals = await listPaymentTotalsByFeeIds(feeIds)
      const approved = paymentTotals.approved || {}

      // filter outstanding (not cancelled and approved < total_amount)
      const outstandingFees = (feeData || []).filter(f => {
        if (!f) return false
        if (f.status === 'cancelled') return false
        const total = Number(f.total_amount || 0)
        const appr = Number(approved[f.id] || 0)
        return total > 0 && appr < total
      })

      // map to rows and apply search
      const mapped = outstandingFees.map(f => {
        const soi = f.houses?.soi || ''
        const houseNo = f.houses?.house_no || '-'
        const owner = f.houses?.owner_name || '-'
        const total = Number(f.total_amount || 0)
        const appr = Number(approved[f.id] || 0)
        const outstanding = Math.max(0, total - appr)

        // compute requested breakdowns from fee fields
        const common = Number(f.fee_common || 0) + Number(f.fee_overdue_common || 0)
        const fine = Number(f.fee_fine || 0) + Number(f.fee_overdue_fine || 0)
        const notice = Number(f.fee_notice || 0) + Number(f.fee_overdue_notice || 0)

        // other = sum of all fee_* fields except the ones used above
        const exclude = new Set([
          'fee_common', 'fee_overdue_common',
          'fee_fine', 'fee_overdue_fine',
          'fee_notice', 'fee_overdue_notice',
        ])
        let other = 0
        for (const k of Object.keys(f)) {
          if (!k.startsWith('fee_')) continue
          if (exclude.has(k)) continue
          // skip total_amount-like fields
          if (k === 'fee_total' || k === 'fee_amount' || k === 'fee_sum') continue
          other += Number(f[k] || 0)
        }

        return {
          id: f.id,
          soi,
          houseNo,
          ownerName: owner,
          period: formatPeriod(f.period, f.year),
          commonOutstanding: common.toLocaleString(),
          commonOutstandingRaw: common,
          fineOutstanding: fine.toLocaleString(),
          fineOutstandingRaw: fine,
          noticeOutstanding: notice.toLocaleString(),
          noticeOutstandingRaw: notice,
          otherOutstanding: other.toLocaleString(),
          otherOutstandingRaw: other,
          outstanding: outstanding.toLocaleString(),
          outstandingRaw: outstanding,
        }
      })

      const keyword = String(search || '').trim().toLowerCase()
      const finalRows = keyword ? mapped.filter(r => (
        String(r.houseNo || '').toLowerCase().includes(keyword) ||
        String(r.ownerName || '').toLowerCase().includes(keyword) ||
        String(r.soi || '').toLowerCase().includes(keyword)
      )) : mapped

      // sort by soi (numeric if possible) then houseNo
      finalRows.sort((a, b) => {
        const na = parseInt(String(a.soi || '').replace(/[^0-9]/g, ''), 10)
        const nb = parseInt(String(b.soi || '').replace(/[^0-9]/g, ''), 10)
        const ca = Number.isFinite(na) ? na : Number.MAX_SAFE_INTEGER
        const cb = Number.isFinite(nb) ? nb : Number.MAX_SAFE_INTEGER
        if (ca !== cb) return ca - cb
        const ha = String(a.houseNo || '')
        const hb = String(b.houseNo || '')
        return ha.localeCompare(hb, 'th-TH', { numeric: true })
      })

      setRows(finalRows)
    } catch (err) {
      setError(err?.message || 'เกิดข้อผิดพลาดในการโหลดข้อมูล')
      setRows([])
    }
    setLoading(false)
  }

  const yearOptions = []
  const thisYear = new Date().getFullYear()
  for (let y = thisYear + 2; y >= thisYear - 5; y--) yearOptions.push(y)

  return (
    <div className="pane on houses-compact reports-compact">
      <div className="ph">
        <div className="ph-in" style={{ display: 'flex', alignItems: 'center', gap: 16, margin: 0, padding: 0, justifyContent: 'flex-start', position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div className="ph-ico">📋</div>
            <div>
              <div className="ph-h1" style={{ margin: 0, padding: 0 }}>รายงานค่างชำระ</div>
              <div className="ph-sub" style={{ margin: 0, padding: 0 }}>สรุปยอดค้างชำระ แยกตามบ้านและซอย</div>
            </div>
          </div>
          <div style={{ position: 'absolute', right: 24, top: 24 }}>
            <ReportExportButtons
              columns={columns}
              rows={rows}
              reportTitle="รายงานค่างชำระ"
              filter={{ year }}
              sumAmount={rows.reduce((s, r) => s + (r.outstandingRaw || 0), 0)}
              logoUrl={setup.village_logo_url || '/assets/village-logo.svg'}
            />
          </div>
        </div>
      </div>

      <div style={{ width: '100%', margin: '0px 0px 0px', display: 'flex', justifyContent: 'flex-start' }}>
        <form
          className="houses-filter-row"
          style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 12, width: '100%', maxWidth: 900 }}
          onSubmit={e => { e.preventDefault(); handleShowReport(); }}
        >
          <label style={{ marginBottom: 0, fontWeight: 500 }}>
            ค้นหา
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="ค้นหา ซอย, บ้านเลขที่, ชื่อ" className="houses-filter-input" style={{ marginLeft: 8 }} />
          </label>
          <label style={{ marginBottom: 0, fontWeight: 500 }}>
            ปี
            <select value={year} onChange={e => setYear(Number(e.target.value))} className="houses-filter-select" style={{ minWidth: 120, height: 36, marginLeft: 8 }}>
              {yearOptions.map(y => <option key={y} value={y}>{y + 543}</option>)}
            </select>
          </label>
          <button className="btn btn-p" type="submit" style={{ minWidth: 140, height: 36 }}>แสดงรายงาน</button>
          {error && <span style={{ color: 'red', marginLeft: 8 }}>{error}</span>}
        </form>
      </div>

      <ReportMockPage columns={columns} rows={rows} loading={loading} error={error} sumAmount={rows.reduce((s, r) => s + (r.outstandingRaw || 0), 0)} />
    </div>
  )
}
