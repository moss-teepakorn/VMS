import React, { useEffect, useMemo, useState } from 'react'
import ReportMockPage from './reports/ReportMockPage'
import { listDisbursements } from '../../lib/disbursements'

const columns = [
  { key: 'voucherNo', label: 'เลขที่ใบจ่าย' },
  { key: 'payee', label: 'ผู้รับเงิน' },
  { key: 'expenseType', label: 'ประเภทค่าใช้จ่าย' },
  { key: 'amount', label: 'จำนวนเงิน', type: 'number' },
  { key: 'channel', label: 'ช่องทางจ่าย' },
  { key: 'paidAt', label: 'วันที่จ่าย' },
]

function fmtDate(str) {
  if (!str) return '-'
  const d = new Date(str.includes('T') ? str : str + 'T00:00:00')
  return d.toLocaleDateString('th-TH', { year: 'numeric', month: '2-digit', day: '2-digit' })
}

function fmtMethod(method) {
  if (method === 'transfer') return 'โอนเงิน'
  if (method === 'cash') return 'เงินสด'
  if (method === 'cheque') return 'เช็ค'
  return method || '-'
}

function getPayeeLabel(row) {
  if (row.recipient_type === 'house') {
    const houseNo = row.houses?.house_no || '-'
    const name = String(row.recipient_name || row.houses?.owner_name || '').trim()
    if (name.startsWith('บ้านเลขที่')) return name
    return name ? `บ้านเลขที่ ${houseNo} ${name}` : `บ้านเลขที่ ${houseNo}`
  }
  return String(row.recipient_name || row.partners?.name || '-').trim()
}

export default function AdminReportExpensePayments() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError('')
      try {
        const data = await listDisbursements()
        setRows(data || [])
      } catch (err) {
        setError(err?.message || 'โหลดข้อมูลรายงานไม่สำเร็จ')
      }
      setLoading(false)
    }
    load()
  }, [])

  const mappedRows = useMemo(() => {
    return rows.map((row) => ({
      id: row.id,
      voucherNo: row.id ? `EXP-${String(row.id).slice(0, 8).toUpperCase()}` : '-',
      payee: getPayeeLabel(row),
      expenseType: (row.disbursement_items || []).map((item) => item.item_label).filter(Boolean).join(', ') || '-',
      amount: Number(row.total_amount || 0),
      amountRaw: Number(row.total_amount || 0),
      channel: fmtMethod(row.payment_method),
      paidAt: fmtDate(row.disbursement_date),
    }))
  }, [rows])

  const sumAmount = useMemo(() => mappedRows.reduce((sum, row) => sum + Number(row.amountRaw || 0), 0), [mappedRows])

  return (
    <ReportMockPage
      icon="💸"
      title="รายงานการจ่ายเงินออก"
      subtitle="รายการจ่ายค่าใช้จ่ายนิติบุคคล"
      fileName="expense-payment-report"
      columns={columns}
      rows={mappedRows}
      loading={loading}
      error={error}
      sumAmount={sumAmount}
    />
  )
}
