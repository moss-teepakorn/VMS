import React from 'react'
import ReportMockPage from './reports/ReportMockPage'

const columns = [
  { key: 'docNo', label: 'เลขที่เอกสาร' },
  { key: 'houseNo', label: 'บ้านเลขที่' },
  { key: 'period', label: 'งวด' },
  { key: 'amount', label: 'ยอดชำระ' },
  { key: 'method', label: 'ช่องทาง' },
  { key: 'paidAt', label: 'วันที่ชำระ' },
]

const rows = [
  { id: 1, docNo: 'PAY-6803-001', houseNo: '10/1', period: 'H1/2568', amount: '2,750', method: 'โอนเงิน', paidAt: '2026-03-03' },
  { id: 2, docNo: 'PAY-6803-002', houseNo: '22/5', period: 'H1/2568', amount: '3,200', method: 'เงินสด', paidAt: '2026-03-04' },
  { id: 3, docNo: 'PAY-6803-003', houseNo: '8/4', period: 'H1/2568', amount: '2,600', method: 'พร้อมเพย์', paidAt: '2026-03-05' },
  { id: 4, docNo: 'PAY-6803-004', houseNo: '15/3', period: 'H1/2568', amount: '2,950', method: 'โอนเงิน', paidAt: '2026-03-06' },
  { id: 5, docNo: 'PAY-6803-005', houseNo: '7/7', period: 'H1/2568', amount: '2,400', method: 'เงินสด', paidAt: '2026-03-07' },
]

export default function AdminReportPayments() {
  return (
    <ReportMockPage
      icon="💳"
      title="รายงานการชำระเงิน"
      subtitle="Mockup รายการรับชำระค่าส่วนกลาง"
      fileName="payment-report-mockup"
      columns={columns}
      rows={rows}
    />
  )
}
