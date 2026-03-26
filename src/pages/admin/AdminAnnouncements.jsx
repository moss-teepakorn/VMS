import React, { useEffect, useState } from 'react'
import Swal from 'sweetalert2'
import {
  createAnnouncement,
  deleteAnnouncement,
  listAnnouncements,
  updateAnnouncement,
} from '../../lib/announcements'

const EMPTY_FORM = {
  title: '',
  content: '',
  type: 'normal',
  is_pinned: false,
  image_url: '',
}

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
    setForm(EMPTY_FORM)
    setShowModal(true)
  }

  const openEditModal = (item) => {
    setEditingItem(item)
    setForm({
      title: item.title || '',
      content: item.content || '',
      type: item.type || 'normal',
      is_pinned: Boolean(item.is_pinned),
      image_url: item.image_url || '',
    })
    setShowModal(true)
  }

  const closeModal = (force = false) => {
    if (saving && !force) return
    setShowModal(false)
    setEditingItem(null)
    setForm(EMPTY_FORM)
  }

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setForm((cur) => ({ ...cur, [name]: type === 'checkbox' ? checked : value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.title.trim()) { await showSwal({ icon: 'warning', title: 'ข้อมูลไม่ครบ', text: 'กรุณากรอกหัวข้อประกาศ' }); return }
    try {
      setSaving(true)
      const payload = {
        title: form.title,
        content: form.content,
        type: form.type,
        is_pinned: form.is_pinned,
        image_url: form.image_url || null,
      }
      if (editingItem) {
        await updateAnnouncement(editingItem.id, payload)
        await showSwal({ icon: 'success', title: 'บันทึกสำเร็จ', timer: 1400, showConfirmButton: false })
      } else {
        await createAnnouncement(payload)
        await showSwal({ icon: 'success', title: 'เพิ่มประกาศสำเร็จ', timer: 1400, showConfirmButton: false })
      }
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
    <div className="pane on">
      <div className="ph">
        <div className="ph-in">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div className="ph-ico">📢</div>
            <div>
              <div className="ph-h1">ประกาศหมู่บ้าน</div>
              <div className="ph-sub">แจ้งข่าวสารลูกบ้าน</div>
            </div>
          </div>
          <div className="ph-acts">
            <button className="btn btn-p btn-sm" onClick={openAddModal}>+ ประกาศใหม่</button>
            <button className="btn btn-o btn-sm" onClick={() => loadData({ type: typeFilter, search: searchTerm })}>🔄 รีเฟรช</button>
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
            placeholder="ค้นหา หัวข้อ / เนื้อหา"
            style={{ flex: 1, minWidth: '240px', padding: '8px 12px', border: '1px solid var(--bo)', borderRadius: '6px' }}
          />
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} style={{ padding: '8px 12px', border: '1px solid var(--bo)', borderRadius: '6px' }}>
            <option value="all">ทุกประเภท</option>
            {TYPE_OPTIONS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
          <button className="btn btn-a btn-sm" onClick={() => loadData({ type: typeFilter, search: searchTerm })}>ค้นหา</button>
        </div>
      </div>

      <div className="card">
        <div className="ch"><div className="ct">ประกาศทั้งหมด ({announcements.length} รายการ)</div></div>
        <div className="cb">
          <div style={{ overflowX: 'auto' }}>
            <table className="tw" style={{ width: '100%', minWidth: '700px' }}>
              <thead><tr>
                <th>ปักหมุด</th>
                <th>หัวข้อ</th>
                <th>ประเภท</th>
                <th>เนื้อหา</th>
                <th>วันที่</th>
                <th></th>
              </tr></thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="6" style={{ textAlign: 'center', color: 'var(--mu)', padding: '20px' }}>กำลังโหลด...</td></tr>
                ) : announcements.length === 0 ? (
                  <tr><td colSpan="6" style={{ textAlign: 'center', color: 'var(--mu)', padding: '20px' }}>ไม่พบข้อมูล</td></tr>
                ) : announcements.map((item) => {
                  const badge = getTypeBadge(item.type)
                  return (
                    <tr key={item.id}>
                      <td style={{ textAlign: 'center' }}>{item.is_pinned ? '📌' : ''}</td>
                      <td><strong>{item.title}</strong></td>
                      <td><span className={badge.className}>{badge.label}</span></td>
                      <td style={{ maxWidth: '260px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--mu)', fontSize: '13px' }}>{item.content || '-'}</td>
                      <td>{formatDate(item.created_at)}</td>
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
          <div className="house-md">
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
                    <label className="house-field house-field-span-2">
                      <span>หัวข้อประกาศ *</span>
                      <input name="title" value={form.title} onChange={handleChange} placeholder="เช่น ประชุมผู้ถือหุ้น" />
                    </label>
                    <label className="house-field">
                      <span>ประเภท</span>
                      <select name="type" value={form.type} onChange={handleChange}>
                        {TYPE_OPTIONS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                      </select>
                    </label>
                    <label className="house-field house-field-span-3">
                      <span>เนื้อหา</span>
                      <textarea name="content" value={form.content} onChange={handleChange} rows="5" placeholder="รายละเอียดของประกาศ" />
                    </label>
                    <label className="house-field house-field-span-2">
                      <span>URL รูปภาพ (ถ้ามี)</span>
                      <input name="image_url" value={form.image_url} onChange={handleChange} placeholder="https://..." />
                    </label>
                    <label className="house-field" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '8px', paddingTop: '20px' }}>
                      <input type="checkbox" name="is_pinned" checked={form.is_pinned} onChange={handleChange} style={{ width: '16px', height: '16px', cursor: 'pointer' }} />
                      <span style={{ margin: 0 }}>📌 ปักหมุดประกาศนี้</span>
                    </label>
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
