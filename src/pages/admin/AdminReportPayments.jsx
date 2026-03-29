import React, { useEffect, useState } from 'react'
import ReportMockPage from './reports/ReportMockPage'
import { listPayments } from '../../lib/fees'

const columns = [
  { key: 'docNo', label: 'เลขที่เอกสาร' },
  { key: 'houseNo', label: 'บ้านเลขที่' },
  { key: 'period', label: 'งวด' },
  { key: 'amount', label: 'ยอดชำระ' },
  { key: 'method', label: 'ช่องทาง' },
  { key: 'paidAt', label: 'วันที่ชำระ' },
]

function formatPeriod(period, year) {
  if (!period || !year) return '-'
  if (period === 'first_half') return `H1/${year + 543}`
  if (period === 'second_half') return `H2/${year + 543}`
  if (period === 'full_year') return `เต็มปี/${year + 543}`
  return `${period}/${year + 543}`
}

export default function AdminReportPayments() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let mounted = true
    setLoading(true)
    setError('')
    listPayments()
      .then((data) => {
        if (!mounted) return
        setRows(
          (data || []).map((p) => ({
            id: p.id,
            docNo: p.fees?.id ? `PAY-${String(p.fees.id).slice(-6).padStart(6, '0')}` : '-',
            houseNo: p.houses?.house_no || '-',
            period: formatPeriod(p.fees?.period, p.fees?.year),
            amount: Number(p.amount || 0).toLocaleString(),
            method: p.payment_method || '-',
            paidAt: p.paid_at ? p.paid_at.slice(0, 10) : '-',
          }))
        )
        setLoading(false)
      })
      .catch((err) => {
        if (!mounted) return
        setError(err?.message || 'เกิดข้อผิดพลาดในการโหลดข้อมูล')
        setLoading(false)
      })
    return () => { mounted = false }
  }, [])

  return (
    <ReportMockPage
      icon="💳"
      title="รายงานการชำระเงิน"
      subtitle="รายการรับชำระค่าส่วนกลาง (ข้อมูลจริง)"
      fileName="payment-report"
      columns={columns}
      rows={rows}
      loading={loading}
      error={error}
    />
  )
}
