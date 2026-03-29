import React from 'react'
import ReportMockPage from './reports/ReportMockPage'

const columns = [
  { key: 'ticketNo', label: 'เลขรับแจ้ง' },
  { key: 'houseNo', label: 'บ้านเลขที่' },
  { key: 'category', label: 'หมวดปัญหา' },
  { key: 'priority', label: 'ความเร่งด่วน' },
  { key: 'status', label: 'สถานะ' },
  { key: 'createdAt', label: 'วันที่แจ้ง' },
]

const rows = [
  { id: 1, ticketNo: 'ISS-6803-001', houseNo: '15/3', category: 'ไฟฟ้า', priority: 'สูง', status: 'in_progress', createdAt: '2026-03-04' },
  { id: 2, ticketNo: 'ISS-6803-002', houseNo: '22/5', category: 'ประปา', priority: 'กลาง', status: 'pending', createdAt: '2026-03-06' },
  { id: 3, ticketNo: 'ISS-6803-003', houseNo: '8/4', category: 'ความปลอดภัย', priority: 'สูง', status: 'pending', createdAt: '2026-03-07' },
  { id: 4, ticketNo: 'ISS-6803-004', houseNo: '11/2', category: 'ถนน', priority: 'ต่ำ', status: 'resolved', createdAt: '2026-03-09' },
]

export default function AdminReportIssuesSummary() {
  return (
    <ReportMockPage
      icon="🔧"
      title="รายงานสรุปรับแจ้งปัญหาจากลูกบ้าน"
      subtitle="Mockup สรุป ticket จากลูกบ้าน"
      fileName="issues-summary-mockup"
      columns={columns}
      rows={rows}
    />
  )
}
