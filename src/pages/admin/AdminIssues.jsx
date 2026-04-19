import React, { useEffect, useMemo, useState } from 'react'
import StyledSelect from '../../components/StyledSelect'
import DropdownList from '../../components/DropdownList'
import VmsPagination from '../../components/VmsPagination'
import Swal from 'sweetalert2'
import { listHouses } from '../../lib/houses'
import {
  createIssue,
  deleteIssue,
  deleteIssueImagesByPaths,
  listIssueImages,
  listIssues,
  updateIssue,
  uploadIssueImages,
} from '../../lib/issues'

const ISSUE_CATEGORIES = ['ไฟฟ้า', 'ประปา', 'ถนน', 'ความสะอาด', 'ความปลอดภัย', 'อื่นๆ']
const ISSUE_STATUSES = [
  { value: 'pending', label: 'รอดำเนินการ', badge: 'bd b-wn' },
  { value: 'in_progress', label: 'กำลังดำเนินการ', badge: 'bd b-mu' },
  { value: 'resolved', label: 'แก้ไขแล้ว', badge: 'bd b-ok' },
  { value: 'closed', label: 'ปิดเรื่อง', badge: 'bd b-dg' },
]

const EMPTY_FORM = {
  house_id: '',
  title: '',
  detail: '',
  category: 'ไฟฟ้า',
  status: 'pending',
  admin_note: '',
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

const AdminIssues = () => {
  const [issues, setIssues] = useState([])
  const [houses, setHouses] = useState([])
  const [statusFilter, setStatusFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [attachments, setAttachments] = useState([])
  const [removedImagePaths, setRemovedImagePaths] = useState([])
  const isClosedEditing = editingItem?.status === 'closed'
  const [page, setPage] = useState(1)
  const [rowsPerPage, setRowsPerPage] = useState('25')

  const issueStatusOptions = [
    { value: 'all', label: 'ทุกสถานะ' },
    ...ISSUE_STATUSES.map((s) => ({ value: s.value, label: s.label })),
  ]
  const issueCategoryOptions = [
    { value: 'all', label: 'ทุกหมวด' },
    ...ISSUE_CATEGORIES.map((c) => ({ value: c, label: c })),
  ]

  const totalPages = rowsPerPage === 'all' ? 1 : Math.ceil(issues.length / Number(rowsPerPage))
  const pagedIssues = rowsPerPage === 'all' ? issues : issues.slice((page - 1) * Number(rowsPerPage), page * Number(rowsPerPage))

  const houseOptions = useMemo(() => ([
    { value: '', label: 'เลือกบ้าน (ถ้ามี)' },
    ...houses.map((h) => ({
      value: h.id,
      label: `ซอย ${h.soi || '-'} • ${h.house_no}${h.owner_name ? ` - ${h.owner_name}` : ''}`,
    })),
  ]), [houses])

  const loadData = async (override = {}) => {
    try {
      setLoading(true)
      const [issueData, houseData] = await Promise.all([
        listIssues({ status: override.status ?? statusFilter, category: override.category ?? categoryFilter, search: override.search ?? searchTerm }),
        houses.length === 0 ? listHouses() : Promise.resolve(houses),
      ])
      setIssues(issueData)
      setHouses(houseData)
    } catch (err) {
      await showSwal({ icon: 'error', title: 'โหลดข้อมูลไม่สำเร็จ', text: err.message })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadData() }, [])

  useEffect(() => {
    const timer = setTimeout(() => { loadData({ search: searchTerm }) }, 400)
    return () => clearTimeout(timer)
  }, [searchTerm])

  const getStatusBadge = (status) => {
    const found = ISSUE_STATUSES.find((s) => s.value === status)
    return found ? { className: found.badge, label: found.label } : { className: 'bd b-mu', label: status }
  }

  const openAddModal = () => {
    setEditingItem(null)
    setForm(EMPTY_FORM)
    setAttachments([])
    setRemovedImagePaths([])
    setShowModal(true)
  }

  const openEditModal = async (item) => {
    setEditingItem(item)
    setForm({
      house_id: item.house_id || '',
      title: item.title || '',
      detail: item.detail || '',
      category: item.category || 'ไฟฟ้า',
      status: item.status || 'pending',
      admin_note: item.admin_note || '',
    })
    try {
      const imgs = await listIssueImages(item.id)
      setAttachments(imgs.map((img) => ({ ...img, source: 'existing' })))
    } catch {
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
    return `ISS_${date}_${time}_${String(index).padStart(3, '0')}.jpg`
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
    if (!form.title.trim()) { await showSwal({ icon: 'warning', title: 'ข้อมูลไม่ครบ', text: 'กรุณากรอกหัวข้อปัญหา' }); return }
    try {
      setSaving(true)
      const payload = {
        house_id: form.house_id || null,
        title: form.title,
        detail: form.detail,
        category: form.category,
        status: form.status,
        admin_note: form.admin_note,
      }
      if (editingItem) {
        const updated = await updateIssue(editingItem.id, payload)
        if (removedImagePaths.length > 0) await deleteIssueImagesByPaths(removedImagePaths)
        const newFiles = attachments.filter((a) => a.source === 'new' && a.file).map((a) => a.file)
        if (newFiles.length > 0) await uploadIssueImages(updated.id, newFiles)
        await showSwal({ icon: 'success', title: 'บันทึกสำเร็จ', timer: 1400, showConfirmButton: false })
      } else {
        const created = await createIssue(payload)
        const newFiles = attachments.filter((a) => a.source === 'new' && a.file).map((a) => a.file)
        if (newFiles.length > 0) await uploadIssueImages(created.id, newFiles)
        await showSwal({ icon: 'success', title: 'เพิ่มรายการสำเร็จ', timer: 1400, showConfirmButton: false })
      }
      closeModal(true)
      await loadData({ status: statusFilter, category: categoryFilter, search: searchTerm })
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
      text: `ลบปัญหา "${item.title}" ใช่หรือไม่?`,
      showCancelButton: true,
      confirmButtonText: 'ลบ',
      cancelButtonText: 'ยกเลิก',
      confirmButtonColor: '#c0392b',
    })
    if (!result.isConfirmed) return
    try {
      await deleteIssue(item.id)
      await showSwal({ icon: 'success', title: 'ลบสำเร็จ', timer: 1200, showConfirmButton: false })
      await loadData({ status: statusFilter, category: categoryFilter, search: searchTerm })
    } catch (err) {
      await showSwal({ icon: 'error', title: 'ลบไม่สำเร็จ', text: err.message })
    }
  }

  const formatDate = (str) => {
    if (!str) return '-'
    return new Date(str).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' })
  }

  return (
    <div className="pane on houses-compact issues-page">
      <div className="ph">
        <div className="ph-in">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div className="ph-ico">🔧</div>
            <div>
              <div className="ph-h1">จัดการปัญหา</div>
              <div className="ph-sub">ติดตามและแก้ไขปัญหาในหมู่บ้าน</div>
            </div>
          </div>
        </div>
      </div>

      <div className="card houses-main-card">
        <div className="vms-panel-toolbar">
          <div className="vms-toolbar-left">
            <DropdownList compact value={statusFilter} options={issueStatusOptions} onChange={(v) => { setStatusFilter(v); setPage(1); loadData({ status: v, category: categoryFilter, search: searchTerm }) }} placeholder="ทุกสถานะ" />
            <DropdownList compact value={categoryFilter} options={issueCategoryOptions} onChange={(v) => { setCategoryFilter(v); setPage(1); loadData({ status: statusFilter, category: v, search: searchTerm }) }} placeholder="ทุกหมวด" />
            <div className="vms-inline-search">
              <svg width="12" height="12" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd"/>
              </svg>
              <input type="text" value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setPage(1) }} placeholder="ค้นหา หัวข้อ / รายละเอียด / บ้าน" />
            </div>
          </div>
          <div className="vms-toolbar-right">
            <button className="vms-sm-btn vms-sm-btn--primary" onClick={openAddModal}>+ เพิ่มรายการปัญหา</button>
            <button className="vms-sm-btn" onClick={() => loadData({ status: statusFilter, category: categoryFilter, search: searchTerm })}>🔄</button>
          </div>
        </div>
        <div className="cb houses-table-card-body houses-main-body">
          <div className="desktop-only">
            <div style={{ overflowX: 'auto' }}>
              <table className="tw houses-table houses-main-table" style={{ width: '100%', minWidth: '900px' }}>
                <thead><tr>
                  <th>ซอย</th>
                  <th>บ้าน / เจ้าของ</th>
                  <th>หัวข้อปัญหา</th>
                  <th>หมวด</th>
                  <th>สถานะ</th>
                  <th>วันที่แจ้ง</th>
                  <th>คะแนน</th>
                  <th></th>
                </tr></thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan="8" style={{ textAlign: 'center', color: 'var(--mu)', padding: '20px' }}>กำลังโหลด...</td></tr>
                  ) : issues.length === 0 ? (
                    <tr><td colSpan="8" style={{ textAlign: 'center', color: 'var(--mu)', padding: '20px' }}>ไม่พบข้อมูล</td></tr>
                  ) : pagedIssues.map((item) => {
                    const badge = getStatusBadge(item.status)
                    return (
                      <tr key={item.id}>
                        <td>{item.houses?.soi ? `ซอย ${item.houses.soi}` : '-'}</td>
                        <td><strong>{item.houses?.house_no || '-'}</strong> {item.houses?.owner_name ? `- ${item.houses.owner_name}` : ''}</td>
                        <td style={{ maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.title}</td>
                        <td>{item.category || '-'}</td>
                        <td><span className={badge.className}>{badge.label}</span></td>
                        <td>{formatDate(item.created_at)}</td>
                        <td>{item.rating != null ? `${item.rating}/5` : '-'}</td>
                        <td><div className="vms-row-acts">
                          <button className="vms-ra-btn vms-ra-edit" title="แก้ไข" onClick={() => openEditModal(item)}><svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"/></svg></button>
                          <button className="vms-ra-btn vms-ra-del" title="ลบ" onClick={() => handleDelete(item)}><svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd"/></svg></button>
                        </div></td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
          <div className="mobile-only">
            {loading ? (
              <div className="mcard-empty">กำลังโหลด...</div>
            ) : issues.length === 0 ? (
              <div className="mcard-empty">ไม่พบข้อมูล</div>
            ) : issues.map((item) => {
              const badge = getStatusBadge(item.status)
              return (
                <div key={item.id} className="mcard">
                  <div className="mcard-top">
                    <div className="mcard-title">{item.houses?.house_no || '-'}</div>
                    <div className="mcard-sub">{item.houses?.soi ? `ซอย ${item.houses.soi}` : '-'}</div>
                    <span className={`${badge.className} mcard-badge`}>{badge.label}</span>
                  </div>
                  <div className="mcard-body">{item.title}</div>
                  <div className="mcard-meta">
                    <span><span className="mcard-label">หมวด</span> {item.category || '-'}</span>
                    <span><span className="mcard-label">วันที่</span> {formatDate(item.created_at)}</span>
                    {item.rating != null && <span><span className="mcard-label">คะแนน</span> {item.rating}/5</span>}
                  </div>
                  <div className="mcard-actions">
                    <div className="vms-row-acts">
                      <button className="vms-ra-btn vms-ra-edit" title="แก้ไข" onClick={() => openEditModal(item)}><svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"/></svg></button>
                      <button className="vms-ra-btn vms-ra-del" title="ลบ" onClick={() => handleDelete(item)}><svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd"/></svg></button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
        <VmsPagination page={page} totalPages={totalPages} rowsPerPage={rowsPerPage} setRowsPerPage={(v) => { setRowsPerPage(v); setPage(1) }} totalRows={issues.length} onPage={setPage} />
      </div>

      {showModal && (
        <div className="house-mo">
          <div className="house-md house-md--md">
            <div className="house-md-head">
              <div>
                <div className="house-md-title">🔧 {editingItem ? 'แก้ไขรายการปัญหา' : 'เพิ่มรายการปัญหาใหม่'}</div>
                <div className="house-md-sub">{form.title || 'หัวข้อปัญหา'}</div>
              </div>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="house-md-body">
                <section className="house-sec">
                  <div className="house-sec-title">ข้อมูลปัญหา</div>
                  <div className="house-grid house-grid-2">
                    <label className="house-field house-field-span-2">
                      <span>บ้าน</span>
                      <StyledSelect className="issue-select-wide" name="house_id" value={form.house_id} onChange={handleChange} disabled={isClosedEditing}>
                        {houseOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </StyledSelect>
                    </label>
                    <label className="house-field">
                      <span>หมวดปัญหา</span>
                      <StyledSelect className="issue-select-wide" name="category" value={form.category} onChange={handleChange} disabled={isClosedEditing}>
                        {ISSUE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                      </StyledSelect>
                    </label>
                    <label className="house-field">
                      <span>สถานะ</span>
                      <StyledSelect className="issue-select-wide" name="status" value={form.status} onChange={handleChange} disabled={isClosedEditing}>
                        {ISSUE_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                      </StyledSelect>
                    </label>
                    <label className="house-field house-field-span-2">
                      <span>หัวข้อปัญหา *</span>
                      <input name="title" value={form.title} onChange={handleChange} placeholder="เช่น ไฟฟ้าดับในซอย 3" disabled={isClosedEditing} />
                    </label>
                  </div>
                </section>

                <section className="house-sec">
                  <div className="house-sec-title">รายละเอียด</div>
                  <div className="house-grid house-grid-2">
                    <label className="house-field">
                      <span>รายละเอียดปัญหา</span>
                      <textarea name="detail" value={form.detail} onChange={handleChange} rows="3" placeholder="อธิบายปัญหาที่พบ" disabled={isClosedEditing} />
                    </label>
                    <label className="house-field">
                      <span>หมายเหตุ admin</span>
                      <textarea name="admin_note" value={form.admin_note} onChange={handleChange} rows="3" placeholder="บันทึกของเจ้าหน้าที่" disabled={isClosedEditing} />
                    </label>
                  </div>
                </section>

                <section className="house-sec">
                  <div className="house-sec-title">รูปภาพประกอบ (สูงสุด 5 รูป)</div>
                  <div className="house-grid house-grid-3">
                    <label className="house-field house-field-span-3">
                      <span>แนบไฟล์รูปภาพ</span>
                      <input type="file" accept="image/*" multiple onChange={handleAttachFiles} disabled={isClosedEditing || attachments.length >= MAX_ATTACHMENTS} />
                    </label>
                  </div>
                  <div style={{ marginTop: '8px', fontSize: '12px', color: 'var(--mu)' }}>
                    แนบแล้ว {attachments.length}/{MAX_ATTACHMENTS} รูป • ระบบย่อไฟล์ไม่เกิน 100KB และตั้งชื่อ ISS_YYYYMMDD_HHMMSS_001.jpg
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' }}>
                    {attachments.length === 0 ? (
                      <div style={{ fontSize: '12px', color: 'var(--mu)' }}>ยังไม่มีรูปแนบ</div>
                    ) : attachments.map((img, idx) => (
                      <div key={`${img.name}-${idx}`} style={{ width: '64px' }}>
                        <button type="button" onClick={() => handlePreviewAttachment(img)} style={{ width: '64px', height: '64px', borderRadius: '8px', border: '1px solid var(--bo)', background: '#fff', padding: 0, overflow: 'hidden', cursor: 'pointer' }}>
                          <img src={img.url} alt={img.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        </button>
                        <button type="button" className="btn btn-xs btn-dg" onClick={() => handleRemoveAttachment(img)} style={{ marginTop: '4px', width: '100%' }} disabled={isClosedEditing}>ลบ</button>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
              <div className="house-md-foot">
                <button className="btn btn-g" type="button" onClick={() => closeModal()}>ยกเลิก</button>
                <button className="btn btn-p" type="submit" disabled={saving || isClosedEditing}>{isClosedEditing ? 'ปิดรายการแล้ว' : (saving ? 'กำลังบันทึก...' : 'บันทึก')}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminIssues