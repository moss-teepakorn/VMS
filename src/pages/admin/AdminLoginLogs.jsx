import React, { useState, useEffect, useMemo } from 'react'
import { getLoginLogs, deleteLoginLogs, deleteAllLoginLogs } from '../../lib/loginLogs'
import { getSetupConfig } from '../../lib/setup'
import Swal from 'sweetalert2'
import villageLogo from '../../assets/village-logo.svg'

const ROLE_LABEL = { admin: 'ผู้ดูแลระบบ', resident: 'ลูกบ้าน' }
const ROLE_CLASS = { admin: 'b-pr', resident: 'b-a' }

function fmtDatetime(iso) {
  if (!iso) return '-'
  return new Date(iso).toLocaleString('th-TH', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  })
}

export default function AdminLoginLogs() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [selected, setSelected] = useState(new Set())
  const [setup, setSetup] = useState({ villageName: 'The Greenfield', loginCircleLogoUrl: '' })

  useEffect(() => {
    getSetupConfig().then(setSetup).catch(() => {})
    loadLogs()
  }, [])

  const loadLogs = async () => {
    setLoading(true)
    setSelected(new Set())
    const data = await getLoginLogs({ limit: 1000 })
    setLogs(data)
    setLoading(false)
  }

  // client-side filter
  const filtered = useMemo(() => {
    const kw = searchTerm.trim().toLowerCase()
    return logs.filter((r) => {
      if (roleFilter !== 'all' && r.role !== roleFilter) return false
      if (!kw) return true
      return (
        (r.username || '').toLowerCase().includes(kw) ||
        (r.full_name || '').toLowerCase().includes(kw)
      )
    })
  }, [logs, searchTerm, roleFilter])

  // ─── Checkbox logic ────────────────────────────────────────────────
  const allChecked = filtered.length > 0 && filtered.every((r) => selected.has(r.id))
  const someChecked = !allChecked && filtered.some((r) => selected.has(r.id))

  const toggleAll = () => {
    if (allChecked) {
      setSelected(new Set())
    } else {
      setSelected(new Set(filtered.map((r) => r.id)))
    }
  }

  const toggleRow = (id) => {
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  // ─── Delete selected ───────────────────────────────────────────────
  const handleDeleteSelected = async () => {
    if (selected.size === 0) return
    const result = await Swal.fire({
      icon: 'warning',
      title: `ลบ ${selected.size} รายการ?`,
      text: 'ไม่สามารถกู้คืนได้',
      showCancelButton: true,
      confirmButtonText: 'ลบ',
      cancelButtonText: 'ยกเลิก',
      confirmButtonColor: '#e53e3e',
    })
    if (!result.isConfirmed) return
    try {
      await deleteLoginLogs([...selected])
      await Swal.fire({ icon: 'success', title: 'ลบสำเร็จ', timer: 1200, showConfirmButton: false })
      loadLogs()
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'ผิดพลาด', text: err.message })
    }
  }

  // ─── Delete all ────────────────────────────────────────────────────
  const handleDeleteAll = async () => {
    if (logs.length === 0) return
    const result = await Swal.fire({
      icon: 'warning',
      title: 'ลบ Log ทั้งหมด?',
      text: `จะลบทั้งหมด ${logs.length} รายการ ไม่สามารถกู้คืนได้`,
      showCancelButton: true,
      confirmButtonText: 'ลบทั้งหมด',
      cancelButtonText: 'ยกเลิก',
      confirmButtonColor: '#e53e3e',
    })
    if (!result.isConfirmed) return
    try {
      await deleteAllLoginLogs()
      await Swal.fire({ icon: 'success', title: 'ลบทั้งหมดสำเร็จ', timer: 1200, showConfirmButton: false })
      loadLogs()
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'ผิดพลาด', text: err.message })
    }
  }

  return (
    <div className="pane on houses-compact">
      {/* Page header — filter row inside ph (same as AdminHouses) */}
      <div className="ph houses-ph">
        <div className="ph-in">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div className="ph-ico">
              <img className="ph-ico-img" src={setup.loginCircleLogoUrl || villageLogo} alt="logo" />
            </div>
            <div>
              <div className="ph-h1">Log การเข้าสู่ระบบ</div>
              <div className="ph-sub">บันทึกการ Login ของผู้ใช้แต่ละคน · {setup.villageName}</div>
            </div>
          </div>
        </div>
        <div className="houses-filter-row">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="ค้นหา username / ชื่อ-นามสกุล..."
            className="houses-filter-input"
          />
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="houses-filter-select"
          >
            <option value="all">ทุกบทบาท</option>
            <option value="admin">ผู้ดูแลระบบ</option>
            <option value="resident">ลูกบ้าน</option>
          </select>
          <button
            className="btn btn-a btn-sm houses-filter-btn"
            onClick={loadLogs}
            disabled={loading}
          >
            ค้นหา
          </button>
        </div>
      </div>

      <div className="card">
        {/* Card header with action buttons */}
        <div className="ch houses-list-head">
          <div className="ct">
            รายการทั้งหมด {filtered.length} รายการ
            {selected.size > 0 && (
              <span style={{ marginLeft: 8, color: 'var(--pr)', fontWeight: 600 }}>
                · เลือก {selected.size}
              </span>
            )}
          </div>
          <div className="houses-list-actions">
            <button
              className="btn btn-dg btn-sm"
              onClick={handleDeleteSelected}
              disabled={selected.size === 0}
            >
              🗑 ลบที่เลือก ({selected.size})
            </button>
            <button
              className="btn btn-dg btn-sm"
              onClick={handleDeleteAll}
              disabled={logs.length === 0}
            >
              🗑 ลบทั้งหมด
            </button>
            <button className="btn btn-g btn-sm" onClick={loadLogs} disabled={loading}>
              🔄 รีเฟรช
            </button>
          </div>
        </div>

        <div className="cb houses-table-card-body">
          {/* Desktop table */}
          <div className="houses-table-wrap houses-desktop-only">
            <table className="tw houses-table" style={{ width: '100%', minWidth: 580 }}>
              <thead>
                <tr>
                  <th style={{ width: 36 }}>
                    <input
                      type="checkbox"
                      checked={allChecked}
                      ref={(el) => { if (el) el.indeterminate = someChecked }}
                      onChange={toggleAll}
                    />
                  </th>
                  <th style={{ width: 40 }}>#</th>
                  <th>วันที่ / เวลา</th>
                  <th>Username</th>
                  <th>ชื่อ - นามสกุล</th>
                  <th>บทบาท</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="6" style={{ textAlign: 'center', color: 'var(--mu)', padding: '24px' }}>กำลังโหลด...</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan="6" style={{ textAlign: 'center', color: 'var(--mu)', padding: '24px' }}>ไม่มีข้อมูล Log</td></tr>
                ) : filtered.map((row, idx) => (
                  <tr
                    key={row.id}
                    style={{ background: selected.has(row.id) ? 'var(--pr-bg, #f0f7ff)' : undefined, cursor: 'pointer' }}
                    onClick={() => toggleRow(row.id)}
                  >
                    <td onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selected.has(row.id)}
                        onChange={() => toggleRow(row.id)}
                      />
                    </td>
                    <td style={{ color: 'var(--mu)', textAlign: 'center' }}>{idx + 1}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>{fmtDatetime(row.login_at)}</td>
                    <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>{row.username}</td>
                    <td>{row.full_name || '-'}</td>
                    <td>
                      <span className={`bd ${ROLE_CLASS[row.role] || 'b-pr'}`}>
                        {ROLE_LABEL[row.role] || row.role || '-'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="houses-mobile-only" style={{ gap: 10, padding: '4px 0' }}>
            {loading ? (
              <div className="mcard-empty">กำลังโหลด...</div>
            ) : filtered.length === 0 ? (
              <div className="mcard-empty">ไม่มีข้อมูล Log</div>
            ) : (
              <>
                <div style={{ padding: '8px 12px', display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input type="checkbox" checked={allChecked} ref={(el) => { if (el) el.indeterminate = someChecked }} onChange={toggleAll} />
                  <span style={{ fontSize: 12, color: 'var(--mu)' }}>เลือกทั้งหมด</span>
                </div>
                {filtered.map((row) => (
                  <div
                    key={row.id}
                    className="houses-mcard"
                    style={{ background: selected.has(row.id) ? 'var(--pr-bg, #f0f7ff)' : undefined }}
                    onClick={() => toggleRow(row.id)}
                  >
                    <div className="houses-mcard-top">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <input
                          type="checkbox"
                          checked={selected.has(row.id)}
                          onChange={() => toggleRow(row.id)}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <div className="houses-mcard-no" style={{ fontFamily: 'monospace' }}>{row.username}</div>
                      </div>
                      <span className={`bd ${ROLE_CLASS[row.role] || 'b-pr'} houses-mcard-badge`}>
                        {ROLE_LABEL[row.role] || row.role || '-'}
                      </span>
                    </div>
                    <div className="mcard-meta" style={{ marginTop: 4 }}>
                      <span><span className="mcard-label">ชื่อ</span> {row.full_name || '-'}</span>
                      <span><span className="mcard-label">เวลา</span> {fmtDatetime(row.login_at)}</span>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
