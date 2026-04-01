import React from 'react'
import ReportExportButtons from './ReportExportButtons'

const columns = [
  { key: 'txNo', label: 'เลขที่จ่าย' },
  { key: 'payTo', label: 'ผู้รับเงิน' },
  { key: 'category', label: 'หมวด' },
  { key: 'amount', label: 'จำนวนเงิน', type: 'number' },
  { key: 'date', label: 'วันที่' },
]

const sampleRows = [
  { id: 1, txNo: 'EXP-001', payTo: 'บริษัท ทำความสะอาด จำกัด', category: 'บริการ', amount: 12160.12, amountRaw: 12160.12, date: '2024-03-15' },
  { id: 2, txNo: 'EXP-002', payTo: 'ช่างไฟฟ้า นายสมชาย', category: 'ซ่อมบำรุง', amount: 720.0, amountRaw: 720.0, date: '2024-03-20' },
]

export default function AdminFeatureExpensePayment() {
  return (
    <div className="pane on houses-compact reports-compact">
      <div className="ph">
        <div className="ph-in" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div className="ph-ico">📤</div>
          <div>
            <div className="ph-h1">การจ่ายเงิน</div>
            <div className="ph-sub">Mock page สำหรับการจ่ายเงิน (UI prototype)</div>
          </div>
          <div style={{ marginLeft: 'auto' }}>
            <ReportExportButtons columns={columns} rows={sampleRows} reportTitle="การจ่ายเงิน (Mock)" sumAmount={sampleRows.reduce((s,r) => s + (r.amountRaw||0),0)} />
          </div>
        </div>
      </div>

      <div className="card">
        <div className="ch"><div className="ct">รายการจ่ายเงิน (ตัวอย่าง)</div></div>
        <div className="cb">
          <table className="tw" style={{ width: '100%', minWidth: 700 }}>
            <thead>
              <tr>{columns.map(c => <th key={c.key} style={{ textAlign: c.type === 'number' ? 'right' : undefined }}>{c.label}</th>)}</tr>
            </thead>
            <tbody>
              {sampleRows.map(r => (
                <tr key={r.id}>
                  {columns.map(c => (
                    <td key={c.key} style={{ textAlign: c.type === 'number' ? 'right' : undefined }}>
                      {c.type === 'number' ? Number(r[`${c.key}Raw`] ?? r[c.key]).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : (r[c.key] ?? '-')}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
