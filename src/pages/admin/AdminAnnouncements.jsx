import React, { useEffect, useState } from 'react'
import StyledSelect from '../../components/StyledSelect'
import DropdownList from '../../components/DropdownList'
import VmsPagination from '../../components/VmsPagination'
import Swal from 'sweetalert2'
import {
  createAnnouncement,
  deleteAnnouncementImagesByPaths,
  deleteAnnouncement,
  listAnnouncements,
  listAnnouncementImages,
  uploadAnnouncementImage,
  updateAnnouncement,
} from '../../lib/announcements'

const EMPTY_FORM = {
  announcement_no: '',
  announcement_date: '',
  title: '',
  content: '',
  type: 'normal',
  is_pinned: false,
}

const MAX_ATTACHMENTS = 1
const MAX_IMAGE_SIZE_BYTES = 100 * 1024
const MAX_IMAGE_TARGET_BYTES = 95 * 1024

const TYPE_OPTIONS = [
  { value: 'urgent', label: 'ด่วน', badge: 'bd b-er' },
  { value: 'normal', label: 'ปกติ', badge: 'bd b-mu' },
  { value: 'info', label: 'ข้อมูล', badge: 'bd b-ok' },
]

function blurActiveElement() {
  const el = document.activeElement
  if (el instanceof HTMLElement) el.blur()
}

function showSwal(options) {
  blurActiveElement()
  return Swal.fire({ returnFocus: false, ...options })
}

const AdminAnnouncements = () => {
  const [announcements, setAnnouncements] = useState([])
  const [typeFilter, setTypeFilter] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [attachments, setAttachments] = useState([])
  const [removedImagePaths, setRemovedImagePaths] = useState([])
  const [page, setPage] = useState(1)
  const [rowsPerPage, setRowsPerPage] = useState('25')

  const typeFilterOptions = [
    { value: 'all', label: 'ทุกประเภท' },
    ...TYPE_OPTIONS.map((t) => ({ value: t.value, label: t.label })),
  ]

  const totalPages = rowsPerPage === 'all' ? 1 : Math.ceil(announcements.length / Number(rowsPerPage))
  const pagedAnnouncements = rowsPerPage === 'all' ? announcements : announcements.slice((page - 1) * Number(rowsPerPage), page * Number(rowsPerPage))

  const loadData = async (override = {}) => {
    try {
      setLoading(true)
      const data = await listAnnouncements({ type: override.type ?? typeFilter, search: override.search ?? searchTerm })
      setAnnouncements(data)
    } catch (err) {
      await showSwal({ icon: 'error', title: 'โหลดข้อมูลไม่สำเร็จ', text: err.message })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadData() }, [])

  const getTypeBadge = (type) => {
    const found = TYPE_OPTIONS.find((t) => t.value === type)
    return found ? { className: found.badge, label: found.label } : { className: 'bd b-mu', label: type }
  }

  const openAddModal = () => {
    setEditingItem(null)
    const today = new Date()
    const ymd = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
    setForm({ ...EMPTY_FORM, announcement_date: ymd })
    setAttachments([])
    setRemovedImagePaths([])
    setShowModal(true)
  }

  const openEditModal = async (item) => {
    setEditingItem(item)
    setForm({
      announcement_no: item.announcement_no || '',
      announcement_date: item.announcement_date || '',
      title: item.title || '',
      content: item.content || '',
      type: item.type || 'normal',
      is_pinned: Boolean(item.is_pinned),
    })

    try {
      const currentImages = await listAnnouncementImages(item.id)
      if (currentImages.length > 0) {
        setAttachments([ { ...currentImages[0], source: 'existing' } ])
      } else if (item.image_url) {
        setAttachments([ { source: 'existing', name: 'image', path: null, url: item.image_url } ])
      } else {
        setAttachments([])
      }
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

  const formatFileName = () => {
    const now = new Date()
    const date = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`
    const time = `${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`
    return `ANN_${date}_${time}_001.jpg`
  }

  const readImageElement = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const image = new Image()
      image.onload = () => resolve(image)
      image.onerror = reject
      image.src = reader.result
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })

  const canvasToBlob = (canvas, quality) => new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), 'image/jpeg', quality)
  })

  const resizeImageToLimit = async (file) => {
    const image = await readImageElement(file)
    const canvas = document.createElement('canvas')
    const context = canvas.getContext('2d')
    if (!context) throw new Error('ไม่สามารถประมวลผลรูปภาพได้')

    let width = image.width
    let height = image.height
    const maxDimension = 1600
    if (width > maxDimension || height > maxDimension) {
      const scale = Math.min(maxDimension / width, maxDimension / height)
      width = Math.round(width * scale)
      height = Math.round(height * scale)
    }

    canvas.width = width
    canvas.height = height
    context.drawImage(image, 0, 0, width, height)

    let quality = 0.9
    let blob = await canvasToBlob(canvas, quality)

    while (blob && blob.size > MAX_IMAGE_TARGET_BYTES && quality > 0.25) {
      quality -= 0.08
      blob = await canvasToBlob(canvas, quality)
    }

    while (blob && blob.size > MAX_IMAGE_TARGET_BYTES && (canvas.width > 480 || canvas.height > 480)) {
      canvas.width = Math.round(canvas.width * 0.9)
      canvas.height = Math.round(canvas.height * 0.9)
      context.clearRect(0, 0, canvas.width, canvas.height)
      context.drawImage(image, 0, 0, canvas.width, canvas.height)
      quality = 0.82
      blob = await canvasToBlob(canvas, quality)

      while (blob && blob.size > MAX_IMAGE_TARGET_BYTES && quality > 0.25) {
        quality -= 0.08
        blob = await canvasToBlob(canvas, quality)
      }
    }

    if (!blob || blob.size > MAX_IMAGE_SIZE_BYTES) {
      throw new Error(`ไม่สามารถย่อรูป ${file.name} ให้ต่ำกว่า 100KB ได้`)
    }

    return new File([blob], formatFileName(), { type: 'image/jpeg' })
  }

  const handleAttachFile = async (event) => {
    const selected = Array.from(event.target.files || [])
    event.target.value = ''
    if (selected.length === 0) return

    if (selected.length > MAX_ATTACHMENTS) {
      await showSwal({ icon: 'info', title: 'แนบได้ครั้งละ 1 รูป', text: 'ระบบจะใช้เฉพาะรูปแรก' })
    }

    try {
      const resized = await resizeImageToLimit(selected[0])
      setAttachments((current) => {
        current.forEach((item) => {
          if (item.source === 'new' && item.url) URL.revokeObjectURL(item.url)
        })
        return [{ source: 'new', name: resized.name, file: resized, url: URL.createObjectURL(resized) }]
      })
    } catch (error) {
      await showSwal({ icon: 'error', title: 'แนบรูปไม่สำเร็จ', text: error.message })
    }
  }

  const handleRemoveAttachment = (target) => {
    setAttachments((current) => {
      if (target.source === 'new' && target.url) URL.revokeObjectURL(target.url)
      if (target.source === 'existing' && target.path) setRemovedImagePaths((paths) => [...paths, target.path])
      return current.filter((item) => item !== target)
    })
  }

  const handlePreviewAttachment = (target) => {
    if (!target.url) return
    showSwal({ imageUrl: target.url, imageAlt: target.name, showConfirmButton: false, showCloseButton: true, width: 'auto', background: '#0f172a' })
  }

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setForm((cur) => ({ ...cur, [name]: type === 'checkbox' ? checked : value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.title.trim()) { await showSwal({ icon: 'warning', title: 'ข้อมูลไม่ครบ', text: 'กรุณากรอกหัวข้อประกาศ' }); return }
    if (!form.announcement_no.trim()) { await showSwal({ icon: 'warning', title: 'ข้อมูลไม่ครบ', text: 'กรุณากรอกเลขที่ประกาศ' }); return }
    if (!form.announcement_date) { await showSwal({ icon: 'warning', title: 'ข้อมูลไม่ครบ', text: 'กรุณาเลือกวันที่ประกาศ' }); return }
    try {
      setSaving(true)
      const payload = {
        announcement_no: form.announcement_no,
        announcement_date: form.announcement_date,
        title: form.title,
        content: form.content,
        type: form.type,
        is_pinned: form.is_pinned,
      }

      let recordId = null
      let nextImageUrl = null

      if (editingItem) {
        const updated = await updateAnnouncement(editingItem.id, payload)
        recordId = updated.id
        nextImageUrl = updated.image_url || null

        if (removedImagePaths.length > 0) {
          await deleteAnnouncementImagesByPaths(removedImagePaths)
          nextImageUrl = null
        }

        const newFile = attachments.find((item) => item.source === 'new' && item.file)?.file
        if (newFile) {
          const uploaded = await uploadAnnouncementImage(updated.id, newFile)
          nextImageUrl = uploaded?.url || null
        }

        if (nextImageUrl !== updated.image_url) {
          await updateAnnouncement(updated.id, { image_url: nextImageUrl })
        }

        await showSwal({ icon: 'success', title: 'บันทึกสำเร็จ', timer: 1400, showConfirmButton: false })
      } else {
        const created = await createAnnouncement({ ...payload, image_url: null })
        recordId = created.id

        const newFile = attachments.find((item) => item.source === 'new' && item.file)?.file
        if (newFile) {
          const uploaded = await uploadAnnouncementImage(created.id, newFile)
          nextImageUrl = uploaded?.url || null
        }

        if (nextImageUrl) {
          await updateAnnouncement(created.id, { image_url: nextImageUrl })
        }

        await showSwal({ icon: 'success', title: 'เพิ่มประกาศสำเร็จ', timer: 1400, showConfirmButton: false })
      }

      if (!recordId) throw new Error('ไม่สามารถบันทึกรายการได้')

      closeModal(true)
      await loadData({ type: typeFilter, search: searchTerm })
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
      text: `ลบประกาศ "${item.title}" ใช่หรือไม่?`,
      showCancelButton: true,
      confirmButtonText: 'ลบ',
      cancelButtonText: 'ยกเลิก',
      confirmButtonColor: '#c0392b',
    })
    if (!result.isConfirmed) return
    try {
      await deleteAnnouncement(item.id)
      await showSwal({ icon: 'success', title: 'ลบสำเร็จ', timer: 1200, showConfirmButton: false })
      await loadData({ type: typeFilter, search: searchTerm })
    } catch (err) {
      await showSwal({ icon: 'error', title: 'ลบไม่สำเร็จ', text: err.message })
    }
  }

  const formatDate = (str) => {
    if (!str) return '-'
    return new Date(str).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' })
  }

  return (
    <div className="pane on houses-compact">
      <div className="ph">
        <div className="ph-in">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div className="ph-ico">📢</div>
            <div>
              <div className="ph-h1">ประกาศหมู่บ้าน</div>
              <div className="ph-sub">แจ้งข่าวสารลูกบ้าน</div>
            </div>
          </div>
        </div>
      </div>

      <div className="card houses-main-card">
        <div className="vms-panel-toolbar">
          <div className="vms-toolbar-left">
            <DropdownList compact value={typeFilter} options={typeFilterOptions} onChange={(v) => { setTypeFilter(v); setPage(1); loadData({ type: v, search: searchTerm }) }} placeholder="ทุกประเภท" />
            <div className="vms-inline-search">
              <svg width="12" height="12" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd"/>
              </svg>
              <input type="text" value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setPage(1) }} placeholder="ค้นหา หัวข้อ / เนื้อหา" />
            </div>
          </div>
          <div className="vms-toolbar-right">
            <button className="vms-sm-btn vms-sm-btn--primary" onClick={openAddModal}>+ ประกาศใหม่</button>
            <button className="vms-sm-btn" onClick={() => loadData({ type: typeFilter, search: searchTerm })}>🔄</button>
          </div>
        </div>
        <div className="cb houses-table-card-body houses-main-body">
          <div className="desktop-only">
            <div style={{ overflowX: 'auto' }}>
              <table className="tw houses-table houses-main-table" style={{ width: '100%', minWidth: '700px' }}>
                <thead><tr>
                  <th>ปักหมุด</th>
                  <th>เลขที่ประกาศ</th>
                  <th>วันที่ประกาศ</th>
                  <th>หัวข้อ</th>
                  <th>ประเภท</th>
                  <th>เนื้อหา</th>
                  <th>รูป</th>
                  <th></th>
                </tr></thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan="8" style={{ textAlign: 'center', color: 'var(--mu)', padding: '20px' }}>กำลังโหลด...</td></tr>
                  ) : announcements.length === 0 ? (
                    <tr><td colSpan="8" style={{ textAlign: 'center', color: 'var(--mu)', padding: '20px' }}>ไม่พบข้อมูล</td></tr>
                  ) : pagedAnnouncements.map((item) => {
                    const badge = getTypeBadge(item.type)
                    return (
                      <tr key={item.id}>
                        <td style={{ textAlign: 'center' }}>{item.is_pinned ? '📌' : ''}</td>
                        <td>{item.announcement_no || '-'}</td>
                        <td>{formatDate(item.announcement_date)}</td>
                        <td><strong>{item.title}</strong></td>
                        <td><span className={badge.className}>{badge.label}</span></td>
                        <td style={{ maxWidth: '260px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--mu)', fontSize: '13px' }}>{item.content || '-'}</td>
                        <td>{item.image_url ? 'มีรูป' : '-'}</td>
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
            ) : announcements.length === 0 ? (
              <div className="mcard-empty">ไม่พบข้อมูล</div>
            ) : announcements.map((item) => {
              const badge = getTypeBadge(item.type)
              return (
                <div key={item.id} className="mcard">
                  <div className="mcard-top">
                    <div className="mcard-title">{item.is_pinned ? '📌 ' : ''}{item.title}</div>
                    <span className={`${badge.className} mcard-badge`}>{badge.label}</span>
                  </div>
                  <div className="mcard-meta">
                    <span><span className="mcard-label">เลขที่</span> {item.announcement_no || '-'}</span>
                    <span><span className="mcard-label">วันที่</span> {formatDate(item.announcement_date)}</span>
                    {item.image_url && <span>มีรูปแนบ</span>}
                  </div>
                  {item.content && <div style={{ fontSize: '12px', color: 'var(--mu)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.content}</div>}
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
        <VmsPagination page={page} totalPages={totalPages} rowsPerPage={rowsPerPage} setRowsPerPage={(v) => { setRowsPerPage(v); setPage(1) }} totalRows={announcements.length} onPage={setPage} />
      </div>

      {showModal && (
        <div className="house-mo">
          <div className="house-md house-md--lg">
            <div className="house-md-head">
              <div>
                <div className="house-md-title">📢 {editingItem ? 'แก้ไขประกาศ' : 'ประกาศใหม่'}</div>
                <div className="house-md-sub">{form.title || 'หัวข้อประกาศ'}</div>
              </div>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="house-md-body">
                <section className="house-sec">
                  <div className="house-sec-title">ข้อมูลประกาศ</div>
                  <div className="house-grid house-grid-3">
                    <label className="house-field">
                      <span>เลขที่ประกาศ *</span>
                      <input name="announcement_no" value={form.announcement_no} onChange={handleChange} placeholder="เช่น ANN-2026-001" />
                    </label>
                    <label className="house-field">
                      <span>วันที่ประกาศ *</span>
                      <input type="date" name="announcement_date" value={form.announcement_date} onChange={handleChange} />
                    </label>
                    <label className="house-field house-field-span-2">
                      <span>หัวข้อประกาศ *</span>
                      <input name="title" value={form.title} onChange={handleChange} placeholder="เช่น ประชุมผู้ถือหุ้น" />
                    </label>
                    <label className="house-field">
                      <span>ประเภท</span>
                      <StyledSelect name="type" value={form.type} onChange={handleChange}>
                        {TYPE_OPTIONS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                      </StyledSelect>
                    </label>
                    <label className="house-field house-field-span-3">
                      <span>เนื้อหา</span>
                      <textarea name="content" value={form.content} onChange={handleChange} rows="5" placeholder="รายละเอียดของประกาศ" />
                    </label>
                    <label className="house-field" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '8px', paddingTop: '20px' }}>
                      <input type="checkbox" name="is_pinned" checked={form.is_pinned} onChange={handleChange} style={{ width: '16px', height: '16px', cursor: 'pointer' }} />
                      <span style={{ margin: 0 }}>📌 ปักหมุดประกาศนี้</span>
                    </label>
                  </div>
                </section>

                <section className="house-sec">
                  <div className="house-sec-title">รูปประกาศ (1 รูปต่อ 1 ประกาศ)</div>
                  <div className="house-grid house-grid-3">
                    <label className="house-field house-field-span-3">
                      <span>แนบไฟล์รูปภาพ</span>
                      <input type="file" accept="image/*" onChange={handleAttachFile} />
                    </label>
                  </div>
                  <div style={{ marginTop: '8px', fontSize: '12px', color: 'var(--mu)' }}>
                    แนบได้สูงสุด 1 รูป • ระบบย่อไฟล์ไม่เกิน 100KB และตั้งชื่อ ANN_YYYYMMDD_HHMMSS_001.jpg
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' }}>
                    {attachments.length === 0 ? (
                      <div style={{ fontSize: '12px', color: 'var(--mu)' }}>ยังไม่มีรูปแนบ</div>
                    ) : attachments.map((image, index) => (
                      <div key={`${image.name}-${index}`} style={{ width: '80px' }}>
                        <button
                          type="button"
                          onClick={() => handlePreviewAttachment(image)}
                          style={{ width: '80px', height: '80px', borderRadius: '8px', border: '1px solid var(--bo)', background: '#fff', padding: '0', overflow: 'hidden', cursor: 'pointer' }}
                        >
                          <img src={image.url} alt={image.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveAttachment(image)}
                          className="btn btn-xs btn-dg"
                          style={{ marginTop: '4px', width: '100%' }}
                        >
                          ลบ
                        </button>
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

export default AdminAnnouncements