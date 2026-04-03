import React, { useCallback, useEffect, useState } from 'react'
import Swal from 'sweetalert2'
import {
  listVehicleRequests,
  approveVehicleRequest,
  updateVehicleRequestStatus,
  cancelVehicleRequest,
} from '../../lib/vehicleRequests'

function blurActive() {
  const el = document.activeElement
  if (el instanceof HTMLElement) el.blur()
}

function showSwal(options) {
  blurActive()
  return Swal.fire({ returnFocus: false, ...options })
}

function formatDate(value) {
  if (!value) return '-'
  return new Date(value).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' })
}

function formatMoney(value) {
  return Number(value || 0).toLocaleString('th-TH')
}

function getRequestStatusBadge(status) {
  if (status === 'pending') return { className: 'bd b-wn', label: 'รอดำเนินการ' }
  if (status === 'approved') return { className: 'bd b-ok', label: 'อนุมัติแล้ว' }
  if (status === 'rejected') return { className: 'bd b-dg', label: 'ปฏิเสธ' }
  if (status === 'cancelled') return { className: 'bd b-mu', label: 'ยกเลิก' }
  return { className: 'bd b-mu', label: status }
}

const CATEGORY_LIST = [
  { key: 'all', icon: '📋', label: 'ทั้งหมด' },
  { key: 'vehicle_add', icon: '🆕', label: 'ขอเพิ่มรถ' },
  { key: 'vehicle_edit', icon: '✏️', label: 'ขอแก้ไขรถ' },
]

const AdminRequests = () => {
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(false)
  const [statusFilter, setStatusFilter] = useState('pending')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [saving, setSaving] = useState(false)

  const loadRequests = useCallback(async (override = {}) => {
    try {
      setLoading(true)
      const rows = await listVehicleRequests({
        status: override.status ?? statusFilter,
      })
      setRequests(rows)
    } catch (error) {
      await showSwal({ icon: 'error', title: 'โหลดข้อมูลไม่สำเร็จ', text: error.message })
    } finally {
      setLoading(false)
    }
  }, [statusFilter])

  useEffect(() => { loadRequests() }, [])

  const filteredRequests = requests.filter((r) => {
    if (categoryFilter === 'vehicle_add') return r.request_type === 'add'
    if (categoryFilter === 'vehicle_edit') return r.request_type === 'edit'
    return true
  })

  const pendingVehicleAddCount = requests.filter((r) => r.status === 'pending' && r.request_type === 'add').length
  const pendingVehicleEditCount = requests.filter((r) => r.status === 'pending' && r.request_type === 'edit').length
  const pendingAllCount = requests.filter((r) => r.status === 'pending').length

  async function handleApprove(req) {
    const { isConfirmed } = await showSwal({
      icon: 'question',
      title: 'อนุมัติคำขอ?',
      text: req.request_type === 'add'
        ? `ระบบจะสร้างรถ ${req.license_plate || '-'} ในระบบ`
        : `ระบบจะอัปเดตข้อมูลรถ ${req.license_plate || '-'}`,
      showCancelButton: true,
      confirmButtonText: 'อนุมัติ',
      cancelButtonText: 'ยกเลิก',
    })
    if (!isConfirmed) return

    try {
      setSaving(true)
      await approveVehicleRequest(req.id, req)
      await showSwal({ icon: 'success', title: 'อนุมัติเรียบร้อย', timer: 1400, showConfirmButton: false })
      await loadRequests({ status: statusFilter })
    } catch (error) {
      await showSwal({ icon: 'error', title: 'อนุมัติไม่สำเร็จ', text: error.message })
    } finally {
      setSaving(false)
    }
  }

  async function handleReject(req) {
    const { isConfirmed, value: reason } = await showSwal({
      icon: 'warning',
      title: 'ปฏิเสธคำขอ',
      html: '<p style="margin-bottom:8px;font-size:13px;">กรุณาระบุเหตุผล เพื่อให้ลูกบ้านแก้ไขและส่งใหม่</p>',
      input: 'textarea',
      inputPlaceholder: 'เช่น ทะเบียนซ้ำ / ข้อมูลไม่ครบ / รูปไม่ชัดเจน',
      inputAttributes: { rows: 3 },
      showCancelButton: true,
      confirmButtonText: 'ปฏิเสธ',
      cancelButtonText: 'ยกเลิก',
      confirmButtonColor: '#c0392b',
      preConfirm: (val) => {
        if (!val?.trim()) { Swal.showValidationMessage('กรุณาระบุเหตุผล'); return false }
        return val.trim()
      },
    })
    if (!isConfirmed || !reason) return

    try {
      setSaving(true)
      await updateVehicleRequestStatus(req.id, { status: 'rejected', adminNote: reason })
      await showSwal({ icon: 'info', title: 'ปฏิเสธแล้ว', text: 'ลูกบ้านจะเห็นเหตุผลในระบบ', timer: 1600, showConfirmButton: false })
      await loadRequests({ status: statusFilter })
    } catch (error) {
      await showSwal({ icon: 'error', title: 'ไม่สำเร็จ', text: error.message })
    } finally {
      setSaving(false)
    }
  }

  async function handleCancel(req) {
    const { isConfirmed } = await showSwal({
      icon: 'warning',
      title: 'ยกเลิกคำขอ?',
      text: 'เมื่อยกเลิกแล้วจะแก้ไขไม่ได้อีก',
      showCancelButton: true,
      confirmButtonText: 'ยืนยันยกเลิก',
      cancelButtonText: 'ไม่',
      confirmButtonColor: '#c0392b',
    })
    if (!isConfirmed) return

    try {
      setSaving(true)
      await cancelVehicleRequest(req.id)
      await showSwal({ icon: 'success', title: 'ยกเลิกแล้ว', timer: 1200, showConfirmButton: false })
      await loadRequests({ status: statusFilter })
    } catch (error) {
      await showSwal({ icon: 'error', title: 'ไม่สำเร็จ', text: error.message })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="pane on">
      <div className="ph">
        <div className="ph-in">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div className="ph-ico">📝</div>
            <div>
              <div className="ph-h1">คำขอแก้ไข</div>
              <div className="ph-sub">รายการรอการอนุมัติ ({requests.filter((r) => r.status === 'pending').length} รายการ)</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <select
              className="fs"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{ minWidth: 140 }}
            >
              <option value="pending">รอดำเนินการ</option>
              <option value="approved">อนุมัติแล้ว</option>
              <option value="rejected">ปฏิเสธ</option>
              <option value="cancelled">ยกเลิก</option>
              <option value="all">ทั้งหมด</option>
            </select>
            <button
              className="btn btn-a btn-sm"
              onClick={() => loadRequests({ status: statusFilter })}
            >🔄 รีเฟรช</button>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 16, alignItems: 'start' }}>

        {/* Left — category list */}
        <div className="card" style={{ position: 'sticky', top: 16 }}>
          <div className="ch"><div className="ch-ico">📋</div><div className="ct">หมวดคำขอ</div></div>
          <div className="cb" style={{ padding: '8px 0' }}>
            {CATEGORY_LIST.map((cat) => {
              const count = cat.key === 'all'
                ? pendingAllCount
                : cat.key === 'vehicle_add'
                  ? pendingVehicleAddCount
                  : pendingVehicleEditCount
              return (
                <div
                  key={cat.key}
                  onClick={() => setCategoryFilter(cat.key)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 16px',
                    cursor: 'pointer',
                    borderRadius: 8,
                    margin: '2px 8px',
                    background: categoryFilter === cat.key ? 'var(--prl)' : 'transparent',
                    color: categoryFilter === cat.key ? 'var(--pr)' : 'var(--tx)',
                    fontWeight: categoryFilter === cat.key ? 700 : 400,
                    transition: 'background .15s',
                  }}
                >
                  <span>{cat.icon} {cat.label}</span>
                  {count > 0 && (
                    <span style={{ background: '#ef4444', color: '#fff', borderRadius: 10, padding: '1px 7px', fontSize: 11, fontWeight: 700 }}>{count}</span>
                  )}
                </div>
              )
            })}
          </div>
          <div className="cb" style={{ padding: '8px 16px', borderTop: '1px solid var(--bo)' }}>
            <div style={{ fontSize: 12, color: 'var(--mu)', textAlign: 'center' }}>
              รวมรอดำเนินการ: <strong style={{ color: 'var(--pr)' }}>{pendingAllCount}</strong> รายการ
            </div>
          </div>
        </div>

        {/* Right — request detail list */}
        <div>
          {loading ? (
            <div className="card"><div className="cb" style={{ textAlign: 'center', color: 'var(--mu)', padding: '24px 0' }}>กำลังโหลด...</div></div>
          ) : filteredRequests.length === 0 ? (
            <div className="card"><div className="cb" style={{ textAlign: 'center', color: 'var(--mu)', padding: '24px 0' }}>ไม่พบคำขอ</div></div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {filteredRequests.map((req) => {
                const badge = getRequestStatusBadge(req.status)
                const lockAfter = req.status === 'approved' || req.status === 'cancelled'
                return (
                  <div key={req.id} className="card">
                    <div className="ch" style={{ flexWrap: 'wrap', gap: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
                        <div className="ch-ico">{req.request_type === 'add' ? '🆕' : '✏️'}</div>
                        <div>
                          <div className="ct">{req.request_type === 'add' ? 'ขอเพิ่มรถ' : 'ขอแก้ไขรถ'} — {req.license_plate || '-'}</div>
                          <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,.65)', marginTop: 2 }}>
                            บ้าน {req.houses?.house_no || '-'} ซอย {req.houses?.soi || '-'} · {formatDate(req.created_at)}
                          </div>
                        </div>
                      </div>
                      <span className={badge.className}>{badge.label}</span>
                    </div>

                    <div className="cb" style={{ padding: 14 }}>
                      {/* request detail */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: '6px 14px', marginBottom: 12 }}>
                        {[
                          { label: 'ทะเบียน', value: req.license_plate },
                          { label: 'จังหวัด', value: req.province },
                          { label: 'ยี่ห้อ / รุ่น', value: [req.brand, req.model].filter(Boolean).join(' ') },
                          { label: 'สี', value: req.color },
                          { label: 'ประเภทรถ', value: req.vehicle_type },
                          { label: 'สถานะการใช้', value: req.vehicle_status === 'active' ? 'ใช้งาน' : req.vehicle_status === 'inactive' ? 'ไม่ได้ใช้' : req.vehicle_status },
                          { label: 'ที่จอด', value: req.parking_location },
                          { label: 'Lock No.', value: req.parking_lock_no },
                          { label: 'ค่าจอด', value: req.parking_fee > 0 ? `฿${formatMoney(req.parking_fee)}` : null },
                        ].filter((f) => f.value).map((f) => (
                          <div key={f.label} style={{ fontSize: 12.5 }}>
                            <span style={{ color: 'var(--mu)', fontSize: 11 }}>{f.label}</span>
                            <div style={{ fontWeight: 600, color: 'var(--tx)', marginTop: 1 }}>{f.value}</div>
                          </div>
                        ))}
                      </div>

                      {req.note && (
                        <div style={{ background: 'var(--bg)', borderRadius: 8, padding: '7px 10px', fontSize: 12.5, marginBottom: 10 }}>
                          📝 หมายเหตุลูกบ้าน: {req.note}
                        </div>
                      )}

                      {/* vehicle images */}
                      {Array.isArray(req.image_urls) && req.image_urls.length > 0 && (
                        <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginBottom: 12 }}>
                          {req.image_urls.map((url, idx) => (
                            <button
                              key={`${url}-${idx}`}
                              type="button"
                              onClick={() => showSwal({ imageUrl: url, showConfirmButton: false, showCloseButton: true, width: 'auto', background: '#0f172a' })}
                              style={{ width: 72, height: 72, borderRadius: 8, border: '1px solid var(--bo)', padding: 0, overflow: 'hidden', cursor: 'pointer', background: 'var(--bg)' }}
                            >
                              <img src={url} alt={`car-${idx}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            </button>
                          ))}
                        </div>
                      )}

                      {/* for edit — show existing vehicle data */}
                      {req.request_type === 'edit' && req.vehicles && (
                        <div style={{ background: 'var(--bg)', borderRadius: 8, padding: '8px 12px', marginBottom: 12, fontSize: 12 }}>
                          <div style={{ fontWeight: 700, color: 'var(--mu)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '.05em', fontSize: 10.5 }}>ข้อมูลปัจจุบันของรถ</div>
                          <span>{req.vehicles.license_plate} {req.vehicles.brand} {req.vehicles.model} · {req.vehicles.color} · {req.vehicles.parking_location}</span>
                        </div>
                      )}

                      {/* admin note (from rejection) */}
                      {req.admin_note && (
                        <div style={{ background: 'var(--prl)', borderRadius: 8, padding: '8px 12px', marginBottom: 12, fontSize: 12.5, color: 'var(--dg)' }}>
                          💬 หมายเหตุนิติ: {req.admin_note}
                        </div>
                      )}

                      {/* action buttons */}
                      {!lockAfter && (
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 6 }}>
                          {req.status === 'pending' && (
                            <>
                              <button
                                className="btn btn-p btn-sm"
                                disabled={saving}
                                onClick={() => handleApprove(req)}
                              >✅ อนุมัติ</button>
                              <button
                                className="btn btn-sm"
                                style={{ background: '#f97316', color: '#fff', border: 'none' }}
                                disabled={saving}
                                onClick={() => handleReject(req)}
                              >❌ ปฏิเสธ</button>
                            </>
                          )}
                          <button
                            className="btn btn-dg btn-sm"
                            disabled={saving}
                            onClick={() => handleCancel(req)}
                          >🚫 ยกเลิก</button>
                        </div>
                      )}

                      {lockAfter && (
                        <div style={{ fontSize: 12, color: 'var(--mu)', marginTop: 4 }}>
                          {req.status === 'approved' ? `✅ อนุมัติเมื่อ ${formatDate(req.reviewed_at)}` : `🚫 ยกเลิกแล้ว`}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}

export default AdminRequests

