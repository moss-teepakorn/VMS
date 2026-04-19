import React from 'react'
import './VmsPagination.css'

/**
 * Sample-like pagination component
 * Renders: [‹] [1] [2] ... [n] [›]  +  page-info text
 * Matches enterprise-dashboard-pastel.html .pages / .pg / .panel-footer pattern
 */
export default function VmsPagination({ page, totalPages, rowsPerPage, setRowsPerPage, totalRows, onPage }) {
  if (!totalPages) return null

  // Build page numbers with ellipsis
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

  const from = rowsPerPage === 'all' ? 1 : (page - 1) * Number(rowsPerPage) + 1
  const to = rowsPerPage === 'all' ? totalRows : Math.min(page * Number(rowsPerPage), totalRows)

  return (
    <div className="vms-panel-footer">
      <div className="vms-pf-info">
        <span>แสดง</span>
        <select
          className="vms-psize"
          value={rowsPerPage}
          onChange={(e) => { setRowsPerPage(e.target.value) }}
        >
          <option value="30">30</option>
          <option value="60">60</option>
          <option value="100">100</option>
          <option value="all">ทั้งหมด</option>
        </select>
        <span>รายการ</span>
      </div>
      <div className="vms-pf-info">
        {rowsPerPage === 'all' ? `ทั้งหมด ${totalRows} รายการ` : `${from}–${to} จาก ${totalRows} รายการ`}
      </div>
      <div className="vms-pages">
        <button
          className="vms-pg"
          disabled={page <= 1 || rowsPerPage === 'all'}
          onClick={() => onPage(page - 1)}
        >‹</button>
        {buildPages().map((p, idx) =>
          p === '…'
            ? <span key={`ell-${idx}`} className="vms-pg-ellipsis">…</span>
            : <button
                key={p}
                className={`vms-pg${p === page ? ' active' : ''}`}
                disabled={rowsPerPage === 'all'}
                onClick={() => onPage(p)}
              >{p}</button>
        )}
        <button
          className="vms-pg"
          disabled={page >= totalPages || rowsPerPage === 'all'}
          onClick={() => onPage(page + 1)}
        >›</button>
      </div>
    </div>
  )
}
