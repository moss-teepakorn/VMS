import React, { useEffect, useMemo, useState } from 'react'
import Swal from 'sweetalert2'
import { listHouses } from '../../lib/houses'
import {
  createViolation,
  deleteViolation,
  deleteViolationImagesByPaths,
  listViolationImages,
  listViolations,
  updateViolation,
  uploadViolationImages,
} from '../../lib/violations'

const VIOLATION_TYPES = [
  'จอดรถขวาง', 'เสียงดังรบกวน', 'ทิ้งขยะผิดที่', 'สัตว์เลี้ยงหลุดออก',
  'ก่อความวุ่นวาย', 'ดัดแปลงโครงสร้าง', 'ต่อเติมโดยไม่ได้รับอนุญาต', 'อื่นๆ',
]

const EMPTY_FORM = {
  house_id: '',
  type: 'จอดรถขวาง',
  type_other: '',
  detail: '',
  occurred_at: '',
  status: 'pending',
  due_date: '',
  admin_note: '',
  resident_note: '',
}

const MAX_ATTACHMENTS = 5
const MAX_IMAGE_SIZE_BYTES = 100 * 1024
const MAX_IMAGE_TARGET_BYTES = 95 * 1024

function blurActiveElement() {
  const el = document.activeElement
  if (el instanceof HTMLElement) el.blur()
}

function showSwal(options) {
  blurActiveElement()
  return Swal.fire({ returnFocus: false, ...options })
}

const AdminViolations = () => {
  const [violations, setViolations] = useState([])
  const [houses, setHouses] = useState([])
  const [statusFilter, setStatusFilter] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [attachments, setAttachments] = useState([])
  const [removedImagePaths, setRemovedImagePaths] = useState([])

  const houseOptions = useMemo(() => ([
    { value: '', label: 'เลือกบ้าน' },
    ...houses.map((h) => ({
      value: h.id,
      label: `ซอย ${h.soi || '-'} • ${h.house_no}${h.owner_name ? ` - ${h.owner_name}` : ''}`,
    })),
  ]), [houses])

  const loadData = async (override = {}) => {
    try {
      setLoading(true)
      const [vioData, houseData] = await Promise.all([
        listViolations({ status: override.status ?? statusFilter, search: override.search ?? searchTerm }),
        houses.length === 0 ? listHouses() : Promise.resolve(houses),
      ])
      setViolations(vioData)
      setHouses(houseData)
    } catch (err) {
      await showSwal({ icon: 'error', title: 'โหลดข้อมูลไม่สำเร็จ', text: err.message })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadData() }, [])

  const getStatusBadge = (status) => {
    if (status === 'resolved') return { className: 'bd b-ok', label: 'แก้ไขแล้ว' }
    if (status === 'in_progress') return { className: 'bd b-ac', label: 'กำลังดำเนินการ' }
    if (status === 'pending') return { className: 'bd b-wn', label: 'รอดำเนินการ' }
    if (status === 'cancelled') return { className: 'bd b-dg', label: 'ยกเลิก' }
    return { className: 'bd b-mu', label: status }
  }

  const openAddModal = () => {
    setEditingItem(null)
    setForm(EMPTY_FORM)
    setAttachments([])
    setRemovedImagePaths([])
    setShowModal(true)
  }

  const openEditModal = async (item) => {
    const baseType = VIOLATION_TYPES.includes(item.type || '') ? item.type : 'อื่นๆ'
    setEditingItem(item)
    setForm({
      house_id: item.house_id || '',
      type: baseType,
      type_other: baseType === 'อื่นๆ' ? (item.type || '') : '',
      detail: item.detail || '',
      occurred_at: item.occurred_at || '',
      status: item.status || 'pending',
      due_date: item.due_date || '',
      admin_note: item.admin_note || '',
      resident_note: item.resident_note || '',
    })
    try {
      const imgs = await listViolationImages(item.id)
      setAttachments(imgs.map((img) => ({ ...img, source: 'existing' })))
    } catch (err) {
      setAttachments([])
    }
    setRemovedImagePaths([])
    setShowModal(true)
  }

  const closeModal = (force = false) => {
    if (saving && !force) return
    setShowModal(false)
    setEditingItem(null)
    setForm(EMPTY_FORM)
    setAttachments([])
    setRemovedImagePaths([])
  }

  const formatFileName = (index) => {
    const now = new Date()
    const date = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`
    const time = `${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`
    return `VIO_${date}_${time}_${String(index).padStart(3, '0')}.jpg`
  }

  const readImageElement = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const img = new Image()
      img.onload = () => resolve(img)
      img.onerror = reject
      img.src = reader.result
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })

  const canvasToBlob = (canvas, quality) => new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), 'image/jpeg', quality)
  })

  const resizeImageToLimit = async (file, sequence) => {
    const image = await readImageElement(file)
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('ไม่สามารถประมวลผลรูปภาพได้')
    let w = image.width, h = image.height
    const maxDim = 1600
    if (w > maxDim || h > maxDim) {
      const scale = Math.min(maxDim / w, maxDim / h)
      w = Math.round(w * scale); h = Math.round(h * scale)
    }
    canvas.width = w; canvas.height = h
    ctx.drawImage(image, 0, 0, w, h)
    let quality = 0.9
    let blob = await canvasToBlob(canvas, quality)
    while (blob && blob.size > MAX_IMAGE_TARGET_BYTES && quality > 0.25) {
      quality -= 0.08; blob = await canvasToBlob(canvas, quality)
    }
    while (blob && blob.size > MAX_IMAGE_TARGET_BYTES && (canvas.width > 480 || canvas.height > 480)) {
      canvas.width = Math.round(canvas.width * 0.9)
      canvas.height = Math.round(canvas.height * 0.9)
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height)
      quality = 0.82; blob = await canvasToBlob(canvas, quality)
      while (blob && blob.size > MAX_IMAGE_TARGET_BYTES && quality > 0.25) {
        quality -= 0.08; blob = await canvasToBlob(canvas, quality)
      }
    }
    if (!blob || blob.size > MAX_IMAGE_SIZE_BYTES) throw new Error(`ไม่สามารถย่อรูป ${file.name} ได้`)
    return new File([blob], formatFileName(sequence), { type: 'image/jpeg' })
  }

  const handleAttachFiles = async (e) => {
    const files = Array.from(e.target.files || [])
    e.target.value = ''
    if (!files.length) return
    const remaining = MAX_ATTACHMENTS - attachments.length
    if (remaining <= 0) { await showSwal({ icon: 'warning', title: 'แนบรูปได้สูงสุด 5 รูป' }); return }
    const toProcess = files.slice(0, remaining)
    if (files.length > remaining) await showSwal({ icon: 'info', title: `รับได้แค่ ${remaining} รูป`, text: 'ระบบจะใช้เฉพาะรูปชุดแรก' })
    try {
      const start = attachments.length + 1
      const prepared = []
      for (let i = 0; i < toProcess.length; i++) {
        const resized = await resizeImageToLimit(toProcess[i], start + i)
        prepared.push({ source: 'new', name: resized.name, file: resized, url: URL.createObjectURL(resized) })
      }
      setAttachments((cur) => [...cur, ...prepared])
    } catch (err) {
      await showSwal({ icon: 'error', title: 'แนบรูปไม่สำเร็จ', text: err.message })
    }
  }

  const handleRemoveAttachment = (target) => {
    setAttachments((cur) => {
      const next = cur.filter((item) => item !== target)
      if (target.source === 'new' && target.url) URL.revokeObjectURL(target.url)
      if (target.source === 'existing' && target.path) setRemovedImagePaths((p) => [...p, target.path])
      return next
    })
  }

  const handlePreviewAttachment = (target) => {
    if (!target.url) return
    showSwal({ imageUrl: target.url, imageAlt: target.name, showConfirmButton: false, showCloseButton: true, width: 'auto', background: '#0f172a' })
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((cur) => ({ ...cur, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.house_id) { await showSwal({ icon: 'warning', title: 'ข้อมูลไม่ครบ', text: 'กรุณาเลือกบ้าน' }); return }
    const typeName = form.type === 'อื่นๆ' ? form.type_other.trim() : form.type
    if (!typeName) { await showSwal({ icon: 'warning', title: 'ข้อมูลไม่ครบ', text: 'กรุณาระบุประเภทการกระทำผิด' }); return }
    try {
      setSaving(true)
      const payload = {
        house_id: form.house_id,
        type: typeName,
        detail: form.detail,
        occurred_at: form.occurred_at || null,
        status: form.status,
        due_date: form.due_date || null,
        admin_note: form.admin_note,
        resident_note: form.resident_note || null,
      }
      if (editingItem) {
        const updated = await updateViolation(editingItem.id, payload)
        if (removedImagePaths.length > 0) await deleteViolationImagesByPaths(removedImagePaths)
        const newFiles = attachments.filter((a) => a.source === 'new' && a.file).map((a) => a.file)
        if (newFiles.length > 0) await uploadViolationImages(updated.id, newFiles)
        await showSwal({ icon: 'success', title: 'บันทึกสำเร็จ', timer: 1400, showConfirmButton: false })
      } else {
        const created = await createViolation(payload)
        const newFiles = attachments.filter((a) => a.source === 'new' && a.file).map((a) => a.file)
        if (newFiles.length > 0) await uploadViolationImages(created.id, newFiles)
        await showSwal({ icon: 'success', title: 'เพิ่มรายการสำเร็จ', timer: 1400, showConfirmButton: false })
      }
      closeModal(true)
      await loadData({ status: statusFilter, search: searchTerm })
    } catch (err) {
      await showSwal({ icon: 'error', title: 'บันทึกไม่สำเร็จ', text: err.message })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (item) => {
    const result = await showSwal({
      icon: 'warning',
      title: 'ยืนยันการลบ',
      text: `ลบรายการ "${item.type}" ของบ้าน ${item.houses?.house_no || '-'} ใช่หรือไม่?`,
      showCancelButton: true,
      confirmButtonText: 'ลบ',
      cancelButtonText: 'ยกเลิก',
      confirmButtonColor: '#c0392b',
    })
    if (!result.isConfirmed) return
    try {
      await deleteViolation(item.id)
      await showSwal({ icon: 'success', title: 'ลบสำเร็จ', timer: 1200, showConfirmButton: false })
      await loadData({ status: statusFilter, search: searchTerm })
    } catch (err) {
      await showSwal({ icon: 'error', title: 'ลบไม่สำเร็จ', text: err.message })
    }
  }

  const formatDate = (str) => {
    if (!str) return '-'
    return new Date(str).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' })
  }

  return (
    <div className="pane on">
      <div className="ph">
        <div className="ph-in">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div className="ph-ico">⚠️</div>
            <div>
              <div className="ph-h1">แจ้งกระทำผิด</div>
              <div className="ph-sub">บันทึกการละเมิดข้อบังคับของหมู่บ้าน</div>
            </div>
          </div>
          <div className="ph-acts">
            <button className="btn btn-p btn-sm" onClick={openAddModal}>+ แจ้งกระทำผิดใหม่</button>
            <button className="btn btn-o btn-sm" onClick={() => loadData({ status: statusFilter, search: searchTerm })}>🔄 รีเฟรช</button>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: '16px', marginBottom: '16px' }}>
        <div className="ch"><div className="ct">ค้นหาและกรองข้อมูล</div></div>
        <div className="cb" style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="ค้นหา ประเภท / บ้าน / เจ้าของ"
            style={{ flex: 1, minWidth: '240px', padding: '8px 12px', border: '1px solid var(--bo)', borderRadius: '6px' }}
          />
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ padding: '8px 12px', border: '1px solid var(--bo)', borderRadius: '6px' }}>
            <option value="all">ทุกสถานะ</option>
            <option value="pending">รอดำเนินการ</option>
            <option value="in_progress">กำลังดำเนินการ</option>
            <option value="resolved">แก้ไขแล้ว</option>
            <option value="cancelled">ยกเลิก</option>
          </select>
          <button className="btn btn-a btn-sm" onClick={() => loadData({ status: statusFilter, search: searchTerm })}>ค้นหา</button>
        </div>
      </div>

      <div className="card">
        <div className="ch"><div className="ct">รายการทั้งหมด ({violations.length} รายการ)</div></div>
        <div className="cb">
          <div style={{ overflowX: 'auto' }}>
            <table className="tw" style={{ width: '100%', minWidth: '900px' }}>
              <thead><tr>
                <th>ซอย</th>
                <th>บ้าน / เจ้าของ</th>
                <th>ประเภท</th>
                <th>รายละเอียด</th>
                <th>วันเกิดเหตุ</th>
                <th>วันครบกำหนด</th>
                <th>สถานะ</th>
                <th></th>
              </tr></thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="8" style={{ textAlign: 'center', color: 'var(--mu)', padding: '20px' }}>กำลังโหลด...</td></tr>
                ) : violations.length === 0 ? (
                  <tr><td colSpan="8" style={{ textAlign: 'center', color: 'var(--mu)', padding: '20px' }}>ไม่พบข้อมูล</td></tr>
                ) : violations.map((item) => {
                  const badge = getStatusBadge(item.status)
                  return (
                    <tr key={item.id}>
                      <td>{item.houses?.soi ? `ซอย ${item.houses.soi}` : '-'}</td>
                      <td>
                        <div><strong>{item.houses?.house_no || '-'}</strong> {item.houses?.owner_name ? `- ${item.houses.owner_name}` : ''}</div>
                      </td>
                      <td>{item.type || '-'}</td>
                      <td style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.detail || '-'}</td>
                      <td>{formatDate(item.occurred_at)}</td>
                      <td>{formatDate(item.due_date)}</td>
                      <td><span className={badge.className}>{badge.label}</span></td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        <button className="btn btn-xs btn-a" style={{ marginRight: '4px' }} onClick={() => openEditModal(item)}>แก้ไข</button>
                        <button className="btn btn-xs btn-dg" onClick={() => handleDelete(item)}>ลบ</button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showModal && (
        <div className="house-mo">
          <div className="house-md house-md-vehicle">
            <div className="house-md-head">
              <div>
                <div className="house-md-title">⚠️ {editingItem ? 'แก้ไขรายการกระทำผิด' : 'แจ้งกระทำผิดใหม่'}</div>
                <div className="house-md-sub">{form.type !== 'อื่นๆ' ? form.type : form.type_other || 'ประเภทการกระทำผิด'}</div>
              </div>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="house-md-body">
                <section className="house-sec">
                  <div className="house-sec-title">บ้านและการกระทำผิด</div>
                  <div className="house-grid house-grid-3">
                    <label className="house-field">
                      <span>บ้าน *</span>
                      <select name="house_id" value={form.house_id} onChange={handleChange}>
                        {houseOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                    </label>
                    <label className="house-field">
                      <span>ประเภทการกระทำผิด *</span>
                      <select name="type" value={form.type} onChange={handleChange}>
                        {VIOLATION_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </label>
                    {form.type === 'อื่นๆ' && (
                      <label className="house-field">
                        <span>ระบุประเภท *</span>
                        <input name="type_other" value={form.type_other} onChange={handleChange} placeholder="ระบุการกระทำผิด" />
                      </label>
                    )}
                    <label className="house-field">
                      <span>วันที่เกิดเหตุ</span>
                      <input type="date" name="occurred_at" value={form.occurred_at} onChange={handleChange} />
                    </label>
                  </div>
                </section>

                <section className="house-sec">
                  <div className="house-sec-title">สถานะและกำหนดการ</div>
                  <div className="house-grid house-grid-3">
                    <label className="house-field">
                      <span>สถานะ</span>
                      <select name="status" value={form.status} onChange={handleChange}>
                        <option value="pending">รอดำเนินการ</option>
                        <option value="in_progress">กำลังดำเนินการ</option>
                        <option value="resolved">แก้ไขแล้ว</option>
                        <option value="cancelled">ยกเลิก</option>
                      </select>
                    </label>
                    <label className="house-field">
                      <span>วันครบกำหนดแก้ไข</span>
                      <input type="date" name="due_date" value={form.due_date} onChange={handleChange} />
                    </label>
                  </div>
                </section>

                <section className="house-sec">
                  <div className="house-sec-title">รายละเอียด</div>
                  <div className="house-grid house-grid-2">
                    <label className="house-field">
                      <span>รายละเอียดการกระทำผิด</span>
                      <textarea name="detail" value={form.detail} onChange={handleChange} rows="3" placeholder="อธิบายรายละเอียด" />
                    </label>
                    <label className="house-field">
                      <span>หมายเหตุ admin</span>
                      <textarea name="admin_note" value={form.admin_note} onChange={handleChange} rows="3" placeholder="บันทึกของเจ้าหน้าที่" />
                    </label>
                    <label className="house-field">
                      <span>อัปเดตจากลูกบ้าน</span>
                      <textarea name="resident_note" value={form.resident_note} onChange={handleChange} rows="3" placeholder="ข้อความอัปเดตจากลูกบ้าน" />
                    </label>
                  </div>
                </section>

                <section className="house-sec">
                  <div className="house-sec-title">รูปภาพหลักฐาน (สูงสุด 5 รูป)</div>
                  <div className="house-grid house-grid-3">
                    <label className="house-field house-field-span-3">
                      <span>แนบไฟล์รูปภาพ</span>
                      <input type="file" accept="image/*" multiple onChange={handleAttachFiles} disabled={attachments.length >= MAX_ATTACHMENTS} />
                    </label>
                  </div>
                  <div style={{ marginTop: '8px', fontSize: '12px', color: 'var(--mu)' }}>
                    แนบแล้ว {attachments.length}/{MAX_ATTACHMENTS} รูป • ระบบย่อไฟล์ไม่เกิน 100KB และตั้งชื่อ VIO_YYYYMMDD_HHMMSS_001.jpg
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' }}>
                    {attachments.length === 0 ? (
                      <div style={{ fontSize: '12px', color: 'var(--mu)' }}>ยังไม่มีรูปแนบ</div>
                    ) : attachments.map((img, idx) => (
                      <div key={`${img.name}-${idx}`} style={{ width: '64px' }}>
                        <button type="button" onClick={() => handlePreviewAttachment(img)} style={{ width: '64px', height: '64px', borderRadius: '8px', border: '1px solid var(--bo)', background: '#fff', padding: 0, overflow: 'hidden', cursor: 'pointer' }}>
                          <img src={img.url} alt={img.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        </button>
                        <button type="button" onClick={() => handleRemoveAttachment(img)} style={{ marginTop: '4px', width: '100%', fontSize: '10px', border: '1px solid var(--bo)', borderRadius: '6px', background: '#fff', cursor: 'pointer', padding: '2px 4px' }}>ลบ</button>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
              <div className="house-md-foot">
                <button className="btn btn-g" type="button" onClick={() => closeModal()}>ยกเลิก</button>
                <button className="btn btn-p" type="submit" disabled={saving}>{saving ? 'กำลังบันทึก...' : 'บันทึก'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminViolations
