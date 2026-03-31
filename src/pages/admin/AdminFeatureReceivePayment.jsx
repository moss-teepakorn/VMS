import React from 'react'
import ReportExportButtons from './ReportExportButtons'

const columns = [
  { key: 'docNo', label: 'เลขที่เอกสาร' },
  { key: 'houseNo', label: 'บ้านเลขที่' },
  { key: 'ownerName', label: 'ชื่อ-สกุล' },
  { key: 'period', label: 'งวด' },
  { key: 'amount', label: 'ยอดชำระ', type: 'number' },
  { key: 'method', label: 'ช่องทางชำระ' },
  { key: 'paidAt', label: 'วันที่ชำระ' },
]

const sampleRows = [
  { id: 1, docNo: 'PAY-000123', houseNo: '10/1', ownerName: 'สมชาย แสงดี', period: 'H2/2567', amount: 2750.0, amountRaw: 2750.0, method: 'โอน', paidAt: '2024-07-12' },
  { id: 2, docNo: 'PAY-000124', houseNo: '12/8', ownerName: 'สุดา ใจงาม', period: 'H1/2568', amount: 2900.0, amountRaw: 2900.0, method: 'QR', paidAt: '2024-06-03' },
]

export default function AdminFeatureReceivePayment() {
  return (
    <div className="pane on houses-compact reports-compact">
      <div className="ph">
        <div className="ph-in" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div className="ph-ico">💳</div>
          <div>
            <div className="ph-h1">Feature — รับชำระเงิน</div>
            <div className="ph-sub">Mock page สำหรับการรับชำระเงิน (UI prototype)</div>
          </div>
          <div style={{ marginLeft: 'auto' }}>
            <ReportExportButtons columns={columns} rows={sampleRows} reportTitle="รับชำระเงิน (Mock)" sumAmount={sampleRows.reduce((s,r) => s + (r.amountRaw||0),0)} />
          </div>
        </div>
      </div>

      <div className="card">
        <div className="ch"><div className="ct">รายการรับชำระ (ตัวอย่าง)</div></div>
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
