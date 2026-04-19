import React, { useEffect, useMemo, useState } from 'react'
import VmsPagination from '../../../components/VmsPagination'
import '../AdminDashboard.css'

export default function ReportMockPage({ columns, rows, loading, error, sumAmount }) {
  const [searchTerm, setSearchTerm] = useState('')
  const [page, setPage] = useState(1)
  const [rowsPerPage, setRowsPerPage] = useState('25')

  useEffect(() => { setPage(1) }, [searchTerm])
  useEffect(() => { setPage(1) }, [rows])

  const filteredRows = useMemo(() => {
    const kw = searchTerm.trim().toLowerCase()
    if (!kw) return rows
    return rows.filter((row) =>
      columns.some((col) => String(row[col.key] ?? '').toLowerCase().includes(kw))
    )
  }, [rows, searchTerm, columns])

  const totalPages = rowsPerPage === 'all' ? 1 : Math.max(1, Math.ceil(filteredRows.length / Number(rowsPerPage)))
  const pagedRows = rowsPerPage === 'all'
    ? filteredRows
    : filteredRows.slice((page - 1) * Number(rowsPerPage), page * Number(rowsPerPage))

  const numberColumn = columns.find((col) => col.type === 'number')

  return (
    <div className="card houses-main-card">
      <div className="vms-panel-toolbar">
        <div className="vms-toolbar-left">
          <div className="vms-inline-search">
            <svg width="12" height="12" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
            </svg>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="ค้นหาในผลลัพธ์..."
            />
          </div>
        </div>
        <div className="vms-toolbar-right">
          {loading
            ? <span style={{ fontSize: 12, color: 'var(--mu)' }}>กำลังโหลด...</span>
            : <span style={{ fontSize: 12, color: 'var(--mu)' }}>{filteredRows.length} รายการ</span>}
        </div>
      </div>

      <div className="cb houses-table-card-body houses-main-body">
        {error && <div style={{ color: 'red', padding: 12 }}>{error}</div>}
        <div className="houses-table-wrap houses-desktop-only" style={{ overflow: 'auto' }}>
          <table className="tw houses-table houses-main-table" style={{ width: '100%', minWidth: 860 }}>
            <thead>
              <tr>
                {columns.map((col) => (
                  <th key={col.key} style={{ textAlign: col.type === 'number' ? 'right' : undefined }}>{col.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={columns.length} style={{ textAlign: 'center', color: 'var(--mu)', padding: '20px 0' }}>กำลังโหลด...</td></tr>
              )}
              {!loading && pagedRows.map((row, index) => (
                <tr key={`${row.id || index}-${index}`}>
                  {columns.map((col) => {
                    if (col.type === 'number') {
                      const rawKey = `${col.key}Raw`
                      const raw = Object.prototype.hasOwnProperty.call(row, rawKey) ? row[rawKey] : row[col.key]
                      const num = Number(raw)
                      const formatted = Number.isFinite(num)
                        ? num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                        : '-'
                      return <td key={col.key} style={{ textAlign: 'right' }}>{formatted}</td>
                    }
                    return <td key={col.key}>{row[col.key] ?? '-'}</td>
                  })}
                </tr>
              ))}
              {!loading && pagedRows.length === 0 && (
                <tr>
                  <td colSpan={columns.length} style={{ textAlign: 'center', color: 'var(--mu)', padding: '20px 0' }}>ไม่พบข้อมูล</td>
                </tr>
              )}
            </tbody>
            {typeof sumAmount === 'number' && filteredRows.length > 0 && (
              <tfoot>
                <tr>
                  <td colSpan={Math.max(1, columns.length - 1)} style={{ textAlign: 'right', fontWeight: 'bold' }}>รวมยอด</td>
                  <td style={{ fontWeight: 'bold', textAlign: 'right' }}>{sumAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        <div className="houses-mobile-only" style={{ gap: 10, padding: '10px 0' }}>
          {loading ? (
            <div className="mcard-empty">กำลังโหลดข้อมูล...</div>
          ) : pagedRows.length === 0 ? (
            <div className="mcard-empty">ไม่พบข้อมูล</div>
          ) : pagedRows.map((row, index) => {
            const titleValue = row[columns[0]?.key] ?? '-'
            const amountRaw = numberColumn
              ? (Object.prototype.hasOwnProperty.call(row, `${numberColumn.key}Raw`) ? row[`${numberColumn.key}Raw`] : row[numberColumn.key])
              : null
            const amountNumber = Number(amountRaw)
            const amountText = Number.isFinite(amountNumber)
              ? amountNumber.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
              : '-'
            return (
              <div key={`m-${row.id || index}-${index}`} className="mcard">
                <div className="mcard-top">
                  <div className="mcard-title">{titleValue}</div>
                  {numberColumn && <span className="bd b-pr mcard-badge">฿{amountText}</span>}
                </div>
                <div className="mcard-meta" style={{ marginTop: 4 }}>
                  {columns.slice(1).map((col) => {
                    let display = row[col.key] ?? '-'
                    if (col.type === 'number') {
                      const rawKey = `${col.key}Raw`
                      const raw = Object.prototype.hasOwnProperty.call(row, rawKey) ? row[rawKey] : row[col.key]
                      const num = Number(raw)
                      display = Number.isFinite(num)
                        ? num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                        : '-'
                    }
                    return <span key={`${row.id || index}-${col.key}`}><span className="mcard-label">{col.label}</span> {display}</span>
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <VmsPagination
        page={page}
        totalPages={totalPages}
        rowsPerPage={rowsPerPage}
        setRowsPerPage={(v) => { setRowsPerPage(v); setPage(1) }}
        totalRows={filteredRows.length}
        onPage={setPage}
      />
    </div>
  )
}
