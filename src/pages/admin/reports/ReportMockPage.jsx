import React, { useMemo } from 'react'
import { exportReportExcel, exportReportPdf } from './reportExport.mjs'
import '../AdminDashboard.css'

export default function ReportMockPage({ columns, rows, loading, error, sumAmount }) {
  const totalRows = rows.length
  const preview = useMemo(() => rows.slice(0, 12), [rows])

  return (
    <div className="card houses-main-card">
      <div className="ch houses-list-head houses-main-head">
        <div className="ct">รายการข้อมูลรายงาน</div>
      </div>
      <div className="cb houses-table-card-body houses-main-body" style={{ overflow: 'auto' }}>
        {error && <div style={{ color: 'red', padding: 12 }}>{error}</div>}
        <table className="tw houses-table houses-main-table" style={{ minWidth: 860 }}>
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={column.key}>{column.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {preview.map((row, index) => (
              <tr key={`${row.id || index}-${index}`}>
                {columns.map((column) => (
                  <td key={column.key}>{row[column.key] ?? '-'}</td>
                ))}
              </tr>
            ))}
            {preview.length === 0 && (
              <tr>
                <td colSpan={columns.length} style={{ textAlign: 'center', color: 'var(--mu)' }}>ไม่พบข้อมูล</td>
              </tr>
            )}
          </tbody>
          {typeof sumAmount === 'number' && (
            <tfoot>
              <tr>
                <td colSpan={columns.length - 3} style={{ textAlign: 'right', fontWeight: 'bold' }}>รวมยอดเงินที่ชำระ</td>
                <td style={{ fontWeight: 'bold' }}>{sumAmount.toLocaleString()}</td>
                <td colSpan={3}></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  )
}
