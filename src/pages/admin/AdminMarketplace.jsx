import React, { useEffect, useMemo, useState } from 'react'
import Swal from 'sweetalert2'
import { listHouses } from '../../lib/houses'
import {
  createMarketplaceItem,
  deleteMarketplaceItem,
  listMarketplace,
  updateMarketplaceItem,
} from '../../lib/marketplace'

const LISTING_TYPES = [
  { value: 'sell', label: 'ขาย', badge: 'bd b-ok' },
  { value: 'free', label: 'แจกฟรี', badge: 'bd b-mu' },
  { value: 'rent', label: 'เช่า', badge: 'bd b-wn' },
  { value: 'wanted', label: 'ต้องการ', badge: 'bd b-er' },
]

const STATUS_OPTIONS = [
  { value: 'pending', label: 'รออนุมัติ', badge: 'bd b-wn' },
  { value: 'approved', label: 'อนุมัติ', badge: 'bd b-ok' },
  { value: 'sold', label: 'จำหน่ายแล้ว', badge: 'bd b-dg' },
  { value: 'cancelled', label: 'ยกเลิก', badge: 'bd b-dg' },
]

const EMPTY_FORM = {
  house_id: '',
  title: '',
  detail: '',
  category: '',
  listing_type: 'sell',
  price: '',
  contact: '',
  image_url: '',
  status: 'pending',
}

function blurActiveElement() {
  const el = document.activeElement
  if (el instanceof HTMLElement) el.blur()
}

function showSwal(options) {
  blurActiveElement()
  return Swal.fire({ returnFocus: false, ...options })
}

function formatPrice(value) {
  const n = Number(String(value).replace(/,/g, ''))
  if (!n) return '฿0'
  return `฿${n.toLocaleString('th-TH')}`
}

const AdminMarketplace = () => {
  const [items, setItems] = useState([])
  const [houses, setHouses] = useState([])
  const [statusFilter, setStatusFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)

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
      const [mktData, houseData] = await Promise.all([
        listMarketplace({ status: override.status ?? statusFilter, listing_type: override.listing_type ?? typeFilter, search: override.search ?? searchTerm }),
        houses.length === 0 ? listHouses() : Promise.resolve(houses),
      ])
      setItems(mktData)
      setHouses(houseData)
    } catch (err) {
      await showSwal({ icon: 'error', title: 'โหลดข้อมูลไม่สำเร็จ', text: err.message })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadData() }, [])

  const getListingBadge = (type) => {
    const found = LISTING_TYPES.find((t) => t.value === type)
    return found ? { className: found.badge, label: found.label } : { className: 'bd b-mu', label: type }
  }

  const getStatusBadge = (status) => {
    const found = STATUS_OPTIONS.find((s) => s.value === status)
    return found ? { className: found.badge, label: found.label } : { className: 'bd b-mu', label: status }
  }

  const openAddModal = () => {
    setEditingItem(null)
    setForm(EMPTY_FORM)
    setShowModal(true)
  }

  const openEditModal = (item) => {
    setEditingItem(item)
    setForm({
      house_id: item.house_id || '',
      title: item.title || '',
      detail: item.detail || '',
      category: item.category || '',
      listing_type: item.listing_type || 'sell',
      price: item.price != null ? String(item.price) : '',
      contact: item.contact || '',
      image_url: item.image_url || '',
      status: item.status || 'pending',
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
    const { name, value } = e.target
    setForm((cur) => ({ ...cur, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.title.trim()) { await showSwal({ icon: 'warning', title: 'ข้อมูลไม่ครบ', text: 'กรุณากรอกชื่อสินค้า/รายการ' }); return }
    try {
      setSaving(true)
      const payload = {
        house_id: form.house_id || null,
        title: form.title,
        detail: form.detail,
        category: form.category,
        listing_type: form.listing_type,
        price: Number(String(form.price).replace(/,/g, '')) || 0,
        contact: form.contact,
        image_url: form.image_url || null,
        status: form.status,
      }
      if (editingItem) {
        await updateMarketplaceItem(editingItem.id, payload)
        await showSwal({ icon: 'success', title: 'บันทึกสำเร็จ', timer: 1400, showConfirmButton: false })
      } else {
        await createMarketplaceItem(payload)
        await showSwal({ icon: 'success', title: 'เพิ่มรายการสำเร็จ', timer: 1400, showConfirmButton: false })
      }
      closeModal(true)
      await loadData({ status: statusFilter, listing_type: typeFilter, search: searchTerm })
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
      text: `ลบรายการ "${item.title}" ใช่หรือไม่?`,
      showCancelButton: true,
      confirmButtonText: 'ลบ',
      cancelButtonText: 'ยกเลิก',
      confirmButtonColor: '#c0392b',
    })
    if (!result.isConfirmed) return
    try {
      await deleteMarketplaceItem(item.id)
      await showSwal({ icon: 'success', title: 'ลบสำเร็จ', timer: 1200, showConfirmButton: false })
      await loadData({ status: statusFilter, listing_type: typeFilter, search: searchTerm })
    } catch (err) {
      await showSwal({ icon: 'error', title: 'ลบไม่สำเร็จ', text: err.message })
    }
  }

  const handleApprove = async (item) => {
    try {
      await updateMarketplaceItem(item.id, { status: 'approved' })
      await showSwal({ icon: 'success', title: 'อนุมัติสำเร็จ', timer: 1200, showConfirmButton: false })
      await loadData({ status: statusFilter, listing_type: typeFilter, search: searchTerm })
    } catch (err) {
      await showSwal({ icon: 'error', title: 'อนุมัติไม่สำเร็จ', text: err.message })
    }
  }

  const formatDate = (str) => {
    if (!str) return '-'
    return new Date(str).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' })
  }

  return (
    <div className="pane on page-compact" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div className="ph">
        <div className="ph-in">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div className="ph-ico">🛒</div>
            <div>
              <div className="ph-h1">ตลาดชุมชน</div>
              <div className="ph-sub">สิ่งของและบริการของสมาชิกในหมู่บ้าน</div>
            </div>
          </div>
        </div>
        <div className="page-filter-row">
          <input
            className="page-filter-input"
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="ค้นหา ชื่อ / หมวด / บ้าน"
          />
          <select className="page-filter-select" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
            <option value="all">ทุกประเภทลิสต์</option>
            {LISTING_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
          <select className="page-filter-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="all">ทุกสถานะ</option>
            {STATUS_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
          <button className="btn btn-a btn-sm page-filter-btn" onClick={() => loadData({ status: statusFilter, listing_type: typeFilter, search: searchTerm })}>ค้นหา</button>
        </div>
      </div>

      <div className="card">
        <div className="ch page-list-head">
          <div className="ct">รายการทั้งหมด ({items.length} รายการ)</div>
          <div className="page-list-actions">
            <button className="btn btn-p btn-sm" onClick={openAddModal}>+ โพสต์ใหม่</button>
            <button className="btn btn-g btn-sm" onClick={() => loadData({ status: statusFilter, listing_type: typeFilter, search: searchTerm })}>🔄 รีเฟรช</button>
          </div>
        </div>
        <div className="cb page-table-body">
          <div className="desktop-only">
            <div style={{ overflowX: 'auto' }}>
              <table className="tw" style={{ width: '100%', minWidth: '900px' }}>
                <thead><tr>
                  <th>บ้าน / เจ้าของ</th>
                  <th>ชื่อสินค้า/บริการ</th>
                  <th>หมวด</th>
                  <th>ประเภท</th>
                  <th>ราคา</th>
                  <th>ติดต่อ</th>
                  <th>สถานะ</th>
                  <th>วันที่</th>
                  <th></th>
                </tr></thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan="9" style={{ textAlign: 'center', color: 'var(--mu)', padding: '20px' }}>กำลังโหลด...</td></tr>
                  ) : items.length === 0 ? (
                    <tr><td colSpan="9" style={{ textAlign: 'center', color: 'var(--mu)', padding: '20px' }}>ไม่พบข้อมูล</td></tr>
                  ) : items.map((item) => {
                    const lBadge = getListingBadge(item.listing_type)
                    const sBadge = getStatusBadge(item.status)
                    return (
                      <tr key={item.id}>
                        <td><strong>{item.houses?.house_no || '-'}</strong>{item.houses?.owner_name ? <div style={{ fontSize: '11px', color: 'var(--mu)' }}>{item.houses.owner_name}</div> : null}</td>
                        <td style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}><strong>{item.title}</strong></td>
                        <td>{item.category || '-'}</td>
                        <td><span className={lBadge.className}>{lBadge.label}</span></td>
                        <td>{item.listing_type === 'free' ? 'ฟรี' : item.listing_type === 'wanted' ? '-' : formatPrice(item.price)}</td>
                        <td>{item.contact || '-'}</td>
                        <td><span className={sBadge.className}>{sBadge.label}</span></td>
                        <td>{formatDate(item.created_at)}</td>
                        <td><div className="td-acts">
                          {item.status === 'pending' && (
                            <button className="btn btn-xs btn-ok" onClick={() => handleApprove(item)}>อนุมัติ</button>
                          )}
                          <button className="btn btn-xs btn-a" onClick={() => openEditModal(item)}>แก้ไข</button>
                          <button className="btn btn-xs btn-dg" onClick={() => handleDelete(item)}>ลบ</button>
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
            ) : items.length === 0 ? (
              <div className="mcard-empty">ไม่พบข้อมูล</div>
            ) : items.map((item) => {
              const lBadge = getListingBadge(item.listing_type)
              const sBadge = getStatusBadge(item.status)
              return (
                <div key={item.id} className="mcard">
                  <div className="mcard-top">
                    <div className="mcard-title">{item.title}</div>
                    <span className={`${sBadge.className} mcard-badge`}>{sBadge.label}</span>
                  </div>
                  <div className="mcard-body">{item.houses?.house_no || '-'}{item.houses?.owner_name ? ` · ${item.houses.owner_name}` : ''}</div>
                  <div className="mcard-meta">
                    <span><span className="mcard-label">ประเภท</span> <span className={lBadge.className}>{lBadge.label}</span></span>
                    <span><span className="mcard-label">ราคา</span> {item.listing_type === 'free' ? 'ฟรี' : item.listing_type === 'wanted' ? '-' : formatPrice(item.price)}</span>
                    {item.category && <span><span className="mcard-label">หมวด</span> {item.category}</span>}
                    {item.contact && <span><span className="mcard-label">ติดต่อ</span> {item.contact}</span>}
                    <span><span className="mcard-label">วันที่</span> {formatDate(item.created_at)}</span>
                  </div>
                  <div className="mcard-actions">
                    {item.status === 'pending' && <button className="btn btn-xs btn-ok" onClick={() => handleApprove(item)}>อนุมัติ</button>}
                    <button className="btn btn-xs btn-a" onClick={() => openEditModal(item)}>แก้ไข</button>
                    <button className="btn btn-xs btn-dg" onClick={() => handleDelete(item)}>ลบ</button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {showModal && (
        <div className="house-mo">
          <div className="house-md house-md-vehicle">
            <div className="house-md-head">
              <div>
                <div className="house-md-title">🛒 {editingItem ? 'แก้ไขรายการ' : 'โพสต์รายการใหม่'}</div>
                <div className="house-md-sub">{form.title || 'ชื่อสินค้าหรือบริการ'}</div>
              </div>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="house-md-body">
                <section className="house-sec">
                  <div className="house-sec-title">ข้อมูลรายการ</div>
                  <div className="house-grid house-grid-3">
                    <label className="house-field">
                      <span>บ้าน</span>
                      <select name="house_id" value={form.house_id} onChange={handleChange}>
                        {houseOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                    </label>
                    <label className="house-field">
                      <span>ประเภทลิสต์</span>
                      <select name="listing_type" value={form.listing_type} onChange={handleChange}>
                        {LISTING_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                      </select>
                    </label>
                    <label className="house-field">
                      <span>สถานะ</span>
                      <select name="status" value={form.status} onChange={handleChange}>
                        {STATUS_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                      </select>
                    </label>
                    <label className="house-field house-field-span-2">
                      <span>ชื่อสินค้า/บริการ *</span>
                      <input name="title" value={form.title} onChange={handleChange} placeholder="เช่น จักรยานมือสอง" />
                    </label>
                    <label className="house-field">
                      <span>หมวดหมู่</span>
                      <input name="category" value={form.category} onChange={handleChange} placeholder="เช่น อิเล็กทรอนิกส์" />
                    </label>
                  </div>
                </section>

                <section className="house-sec">
                  <div className="house-sec-title">รายละเอียดและการติดต่อ</div>
                  <div className="house-grid house-grid-2">
                    <label className="house-field">
                      <span>รายละเอียด</span>
                      <textarea name="detail" value={form.detail} onChange={handleChange} rows="3" placeholder="พิมพ์รายละเอียดสินค้าหรือบริการ" />
                    </label>
                    <div>
                      <label className="house-field">
                        <span>ราคา (บาท)</span>
                        <input type="number" name="price" value={form.price} onChange={handleChange} placeholder="0" />
                      </label>
                      <label className="house-field" style={{ marginTop: '8px' }}>
                        <span>ติดต่อ</span>
                        <input name="contact" value={form.contact} onChange={handleChange} placeholder="เบอร์โทรหรือ Line" />
                      </label>
                      <label className="house-field" style={{ marginTop: '8px' }}>
                        <span>URL รูปภาพ (ถ้ามี)</span>
                        <input name="image_url" value={form.image_url} onChange={handleChange} placeholder="https://..." />
                      </label>
                    </div>
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

export default AdminMarketplace
