import React from 'react'
import ReportMockPage from './reports/ReportMockPage'

const columns = [
  { key: 'reportNo', label: 'เลขที่รายงาน' },
  { key: 'houseNo', label: 'บ้านเลขที่' },
  { key: 'violationType', label: 'ประเภทการกระทำผิด' },
  { key: 'status', label: 'สถานะ' },
  { key: 'penalty', label: 'ค่าปรับ' },
  { key: 'reportedAt', label: 'วันที่แจ้ง' },
]

const rows = [
  { id: 1, reportNo: 'VIO-6803-001', houseNo: '99/7', violationType: 'จอดรถขวางทาง', status: 'pending', penalty: '500', reportedAt: '2026-03-02' },
  { id: 2, reportNo: 'VIO-6803-002', houseNo: '10/1', violationType: 'ส่งเสียงดัง', status: 'resolved', penalty: '300', reportedAt: '2026-03-05' },
  { id: 3, reportNo: 'VIO-6803-003', houseNo: '18/2', violationType: 'ทิ้งขยะไม่ถูกที่', status: 'pending', penalty: '200', reportedAt: '2026-03-06' },
  { id: 4, reportNo: 'VIO-6803-004', houseNo: '7/3', violationType: 'ต่อเติมผิดระเบียบ', status: 'in_review', penalty: '1,000', reportedAt: '2026-03-08' },
]

export default function AdminReportViolationsSummary() {
  return (
    <ReportMockPage
      icon="⚠️"
      title="รายสรุปการกระทำผิด"
      subtitle="Mockup สรุปเหตุฝ่าฝืนระเบียบหมู่บ้าน"
      fileName="violations-summary-mockup"
      columns={columns}
      rows={rows}
    />
  )
}
