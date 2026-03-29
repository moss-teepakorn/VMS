import React, { useMemo } from 'react'
import { exportReportExcel, exportReportPdf } from './reportExport'
import '../AdminDashboard.css'

export default function ReportMockPage({ icon, title, subtitle, fileName, columns, rows }) {
  const totalRows = rows.length
  const preview = useMemo(() => rows.slice(0, 12), [rows])

  const handleExportPdf = () => {
    exportReportPdf({ title, fileName, columns, rows })
  }

  const handleExportExcel = () => {
    exportReportExcel({ fileName, columns, rows })
  }

  return (
    <div className="pane on houses-compact">
      <div className="ph">
        <div className="ph-in">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div className="ph-ico">{icon}</div>
            <div>
              <div className="ph-h1">{title}</div>
              <div className="ph-sub">{subtitle}</div>
            </div>
          </div>
          <div className="ph-acts" style={{ gap: 8 }}>
            <button className="btn btn-p btn-sm" onClick={handleExportPdf}>📄 Export PDF</button>
            <button className="btn btn-a btn-sm" onClick={handleExportExcel}>📊 Export Excel</button>
          </div>
        </div>
      </div>

      <div className="stats">
        <div className="sc">
          <div className="sc-ico p">📌</div>
          <div>
            <div className="sc-v">{totalRows}</div>
            <div className="sc-l">จำนวนรายการ (Mockup)</div>
          </div>
        </div>
        <div className="sc">
          <div className="sc-ico w">🧪</div>
          <div>
            <div className="sc-v">DEMO</div>
            <div className="sc-l">ข้อมูลจำลองพร้อมส่งออก</div>
          </div>
        </div>
      </div>

      <div className="chart-box">
        <div className="ch">
          <h3>รายการข้อมูลรายงาน</h3>
        </div>
        <div className="cb" style={{ overflow: 'auto' }}>
          <table className="tw" style={{ minWidth: 860 }}>
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
          </table>
        </div>
      </div>
    </div>
  )
}
