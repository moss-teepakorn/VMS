import React from 'react'
import ReportMockPage from './reports/ReportMockPage'

const columns = [
  { key: 'voucherNo', label: 'เลขที่ใบจ่าย' },
  { key: 'payee', label: 'ผู้รับเงิน' },
  { key: 'expenseType', label: 'ประเภทค่าใช้จ่าย' },
  { key: 'amount', label: 'จำนวนเงิน' },
  { key: 'channel', label: 'ช่องทางจ่าย' },
  { key: 'paidAt', label: 'วันที่จ่าย' },
]

const rows = [
  { id: 1, voucherNo: 'PV-6803-001', payee: 'ช่างสมคิด', expenseType: 'ซ่อมไฟทางเข้า', amount: '4,500', channel: 'โอนเงิน', paidAt: '2026-03-03' },
  { id: 2, voucherNo: 'PV-6803-002', payee: 'บริษัท รปภ.ดีเด่น', expenseType: 'ค่าบริการ รปภ.', amount: '18,000', channel: 'โอนเงิน', paidAt: '2026-03-05' },
  { id: 3, voucherNo: 'PV-6803-003', payee: 'ร้านวัสดุก่อสร้าง', expenseType: 'วัสดุซ่อมแซมถนน', amount: '6,300', channel: 'เงินสด', paidAt: '2026-03-08' },
  { id: 4, voucherNo: 'PV-6803-004', payee: 'ช่างประปาเอก', expenseType: 'ซ่อมท่อรั่วส่วนกลาง', amount: '2,800', channel: 'พร้อมเพย์', paidAt: '2026-03-09' },
]

export default function AdminReportExpensePayments() {
  return (
    <ReportMockPage
      icon="💸"
      title="รายงานการจ่ายเงินออก"
      subtitle="Mockup รายการจ่ายค่าใช้จ่ายนิติบุคคล"
      fileName="expense-payment-report-mockup"
      columns={columns}
      rows={rows}
    />
  )
}
