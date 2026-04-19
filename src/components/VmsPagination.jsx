import React from 'react'
import './VmsPagination.css'

export default function VmsPagination({ page, totalPages, rowsPerPage, setRowsPerPage, totalRows, onPage }) {
  if (!totalPages) return null

  const buildPages = () => {
    const pages = []
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i)
    } else {
      pages.push(1)
      if (page > 3) pages.push('…')
      const start = Math.max(2, page - 1)
      const end = Math.min(totalPages - 1, page + 1)
      for (let i = start; i <= end; i++) pages.push(i)
      if (page < totalPages - 2) pages.push('…')
      pages.push(totalPages)
    }
    return pages
  }

  const rpp = rowsPerPage === 'all' ? totalRows : Number(rowsPerPage)
  const from = totalRows === 0 ? 0 : (page - 1) * rpp + 1
  const to = rowsPerPage === 'all' ? totalRows : Math.min(page * rpp, totalRows)

  return (
    <div className="vms-panel-footer">
      <div className="vms-pf-info">
        <span>Showing {from} to {to} of {totalRows} entries</span>
        <select
          className="vms-psize"
          value={rowsPerPage}
          onChange={(e) => { setRowsPerPage(e.target.value) }}
        >
          <option value="10">10</option>
          <option value="25">25</option>
          <option value="50">50</option>
          <option value="100">100</option>
        </select>
      </div>
      <div className="vms-pages">
        <button className="vms-pg" disabled={page <= 1} onClick={() => onPage(1)} title="First">«</button>
        <button className="vms-pg" disabled={page <= 1} onClick={() => onPage(page - 1)} title="Previous">‹</button>
        {buildPages().map((p, idx) =>
          p === '…'
            ? <span key={`ell-${idx}`} className="vms-pg-ellipsis">…</span>
            : <button
                key={p}
                className={`vms-pg${p === page ? ' active' : ''}`}
                onClick={() => onPage(p)}
              >{p}</button>
        )}
        <button className="vms-pg" disabled={page >= totalPages} onClick={() => onPage(page + 1)} title="Next">›</button>
        <button className="vms-pg" disabled={page >= totalPages} onClick={() => onPage(totalPages)} title="Last">»</button>
      </div>
    </div>
  )
}
