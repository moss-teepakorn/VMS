import React, { useEffect, useMemo, useState } from 'react'
import StyledSelect from '../../components/StyledSelect'
import DropdownList from '../../components/DropdownList'
import VmsPagination from '../../components/VmsPagination'
import Swal from 'sweetalert2'
import { listHouses } from '../../lib/houses'
import {
  createMarketplaceItem,
  deleteMarketplaceImageFolder,
  deleteMarketplaceImagesByPaths,
  deleteMarketplaceItem,
  listMarketplaceImages,
  listMarketplace,
  uploadMarketplaceImages,
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

const CATEGORY_OPTIONS = [
  'อาหารและเครื่องดื่ม',
  'ผักผลไม้',
  'ของใช้ในบ้าน',
  'เครื่องใช้ไฟฟ้า',
  'อิเล็กทรอนิกส์',
  'มือถือและอุปกรณ์',
  'คอมพิวเตอร์และไอที',
  'เฟอร์นิเจอร์',
  'เสื้อผ้าแฟชั่น',
  'รองเท้าและกระเป๋า',
  'เครื่องสำอางความงาม',
  'สุขภาพและยา',
  'แม่และเด็ก',
  'สัตว์เลี้ยง',
  'หนังสือและเครื่องเขียน',
  'กีฬาและฟิตเนส',
  'ยานยนต์และอะไหล่',
  'งานซ่อมและบริการ',
  'อสังหาฯ/เช่า',
  'มือสองทั่วไป',
  'งานฝีมือ',
  'อื่นๆ',
]

const MAX_ATTACHMENTS = 2
const MAX_IMAGE_TARGET_BYTES = 100 * 1024

const EMPTY_FORM = {
  house_id: '',
  title: '',
  detail: '',
  category: '',
  listing_type: 'sell',
  price: '',
  contact: '',
  status: 'pending',
}

function revokeBlobUrls(items) {
  for (const item of items || []) {
    if (item?.url && String(item.url).startsWith('blob:')) {
      URL.revokeObjectURL(item.url)
    }
  }
}

async function resizeImageToLimit(file, sequence) {
  const fileName = `MKT_${Date.now()}_${String(sequence).padStart(3, '0')}.jpg`
  if (file.size <= MAX_IMAGE_TARGET_BYTES) {
    return new File([file], fileName, { type: file.type || 'image/jpeg' })
  }

  const dataUrl = await new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })

  const image = await new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = dataUrl
  })

  let scale = 1
  let quality = 0.86
  let bestBlob = null
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('ไม่สามารถประมวลผลรูปภาพได้')

  for (let attempt = 0; attempt < 28; attempt += 1) {
    const width = Math.max(1, Math.round(image.width * scale))
    const height = Math.max(1, Math.round(image.height * scale))

    canvas.width = width
    canvas.height = height
    ctx.clearRect(0, 0, width, height)
    ctx.drawImage(image, 0, 0, width, height)

    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality))
    if (!blob) break
    if (!bestBlob || blob.size < bestBlob.size) bestBlob = blob

    if (blob.size <= MAX_IMAGE_TARGET_BYTES) {
      return new File([blob], fileName, { type: 'image/jpeg' })
    }

    if (quality > 0.45) quality -= 0.08
    else {
      scale *= 0.9
      quality = 0.72
    }

    if (width <= 120 || height <= 120) break
  }

  if (bestBlob && bestBlob.size <= MAX_IMAGE_TARGET_BYTES) {
    return new File([bestBlob], fileName, { type: 'image/jpeg' })
  }

  throw new Error(`ไม่สามารถย่อรูป ${file.name} ให้ต่ำกว่า 100KB ได้`)
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
  const [attachments, setAttachments] = useState([])
  const [originalImagePaths, setOriginalImagePaths] = useState([])
  const [removedExistingPaths, setRemovedExistingPaths] = useState([])
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [detailItem, setDetailItem] = useState(null)
  const [detailImages, setDetailImages] = useState([])
  const [loadingDetailImages, setLoadingDetailImages] = useState(false)
  const [detailImageIndex, setDetailImageIndex] = useState(0)
  const [page, setPage] = useState(1)
  const [rowsPerPage, setRowsPerPage] = useState('25')

  const mktTypeOptions = [
    { value: 'all', label: 'ทุกประเภทลิสต์' },
    ...LISTING_TYPES.map((t) => ({ value: t.value, label: t.label })),
  ]
  const mktStatusOptions = [
    { value: 'all', label: 'ทุกสถานะ' },
    ...STATUS_OPTIONS.map((s) => ({ value: s.value, label: s.label })),
  ]

  const totalPages = rowsPerPage === 'all' ? 1 : Math.ceil(items.length / Number(rowsPerPage))
  const pagedItems = rowsPerPage === 'all' ? items : items.slice((page - 1) * Number(rowsPerPage), page * Number(rowsPerPage))

  useEffect(() => () => revokeBlobUrls(attachments), [attachments])

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

  useEffect(() => {
    const timer = setTimeout(() => { loadData({ search: searchTerm }) }, 400)
    return () => clearTimeout(timer)
  }, [searchTerm])

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
    setAttachments([])
    setOriginalImagePaths([])
    setRemovedExistingPaths([])
    setShowModal(true)
  }

  const openEditModal = async (item) => {
    setEditingItem(item)
    try {
      setLoading(true)
      const images = await listMarketplaceImages(item.id)
      const existingByStorage = images.map((img) => ({ source: 'existing', ...img }))

      const existingFromRow = item.image_url
        ? [{ source: 'existing', url: item.image_url, path: null, name: 'IMG_1' }]
        : []

      const merged = [...existingByStorage]
      for (const img of existingFromRow) {
        if (!merged.find((m) => m.url === img.url)) merged.push(img)
      }
      const limitedMerged = merged.slice(0, MAX_ATTACHMENTS)

      setForm({
        house_id: item.house_id || '',
        title: item.title || '',
        detail: item.detail || '',
        category: item.category || '',
        listing_type: item.listing_type || 'sell',
        price: item.price != null ? String(item.price) : '',
        contact: item.contact || '',
        status: item.status || 'pending',
      })
      setAttachments(limitedMerged)
      setOriginalImagePaths(limitedMerged.map((img) => img.path).filter(Boolean))
      setRemovedExistingPaths([])
      setShowModal(true)
    } catch (err) {
      await showSwal({ icon: 'error', title: 'โหลดข้อมูลรูปไม่สำเร็จ', text: err.message })
    } finally {
      setLoading(false)
    }
  }

  const closeModal = (force = false) => {
    if (saving && !force) return
    revokeBlobUrls(attachments)
    setShowModal(false)
    setEditingItem(null)
    setForm(EMPTY_FORM)
    setAttachments([])
    setOriginalImagePaths([])
    setRemovedExistingPaths([])
  }

  const openDetailModal = async (item) => {
    setDetailItem(item)
    setDetailImages(item.image_url ? [{ url: item.image_url, name: 'IMG_1' }] : [])
    setDetailImageIndex(0)
    setShowDetailModal(true)

    try {
      setLoadingDetailImages(true)
      const images = await listMarketplaceImages(item.id)
      if (images.length > 0) {
        setDetailImages(images.slice(0, MAX_ATTACHMENTS))
        setDetailImageIndex(0)
      }
    } catch {
      // Keep fallback image_url if storage listing fails.
    } finally {
      setLoadingDetailImages(false)
    }
  }

  const closeDetailModal = () => {
    setShowDetailModal(false)
    setDetailItem(null)
    setDetailImages([])
    setLoadingDetailImages(false)
    setDetailImageIndex(0)
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((cur) => ({ ...cur, [name]: value }))
  }

  const handleAttachFiles = async (e) => {
    const files = Array.from(e.target.files || [])
    e.target.value = ''
    if (files.length === 0) return

    const remain = MAX_ATTACHMENTS - attachments.length
    if (remain <= 0) {
      await showSwal({ icon: 'warning', title: 'แนบรูปได้สูงสุด 2 รูป' })
      return
    }

    const accepted = files.slice(0, remain)
    if (files.length > remain) {
      await showSwal({ icon: 'info', title: `รับได้แค่ ${remain} รูป`, text: 'ระบบจะใช้เฉพาะรูปชุดแรก' })
    }

    try {
      const prepared = []
      for (let index = 0; index < accepted.length; index += 1) {
        const resized = await resizeImageToLimit(accepted[index], attachments.length + index + 1)
        prepared.push({
          source: 'new',
          file: resized,
          name: resized.name,
          url: URL.createObjectURL(resized),
        })
      }
      setAttachments((prev) => [...prev, ...prepared])
    } catch (err) {
      await showSwal({ icon: 'error', title: 'ประมวลผลรูปไม่สำเร็จ', text: err.message })
    }
  }

  const handleRemoveAttachment = (index) => {
    setAttachments((prev) => {
      const next = [...prev]
      const item = next[index]
      if (item?.source === 'existing' && item.path) {
        setRemovedExistingPaths((paths) => (paths.includes(item.path) ? paths : [...paths, item.path]))
      }
      if (item?.url && String(item.url).startsWith('blob:')) {
        URL.revokeObjectURL(item.url)
      }
      next.splice(index, 1)
      return next
    })
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
        image_url: null,
        status: form.status,
      }
      const keptExistingPaths = attachments
        .filter((item) => item.source === 'existing' && item.path)
        .map((item) => item.path)
      const existingUrls = attachments
        .filter((item) => item.source === 'existing' && item.url)
        .map((item) => item.url)
      const newFiles = attachments
        .filter((item) => item.source === 'new' && item.file)
        .map((item) => item.file)

      let saved
      if (editingItem) {
        const deletePaths = Array.from(new Set([
          ...removedExistingPaths,
          ...originalImagePaths.filter((path) => !keptExistingPaths.includes(path)),
        ]))
        if (deletePaths.length > 0) {
          await deleteMarketplaceImagesByPaths(deletePaths)
        }
        saved = await updateMarketplaceItem(editingItem.id, payload)
      } else {
        saved = await createMarketplaceItem(payload)
      }

      let uploaded = []
      if (newFiles.length > 0) {
        try {
          uploaded = await uploadMarketplaceImages(saved.id, newFiles)
        } catch (uploadError) {
          await showSwal({
            icon: 'warning',
            title: 'บันทึกแล้ว แต่แนบรูปไม่ได้',
            text: String(uploadError?.message || 'อัปโหลดรูปไม่สำเร็จ กรุณาลองใหม่อีกครั้ง'),
          })
        }
      }

      const finalUrls = [...existingUrls, ...uploaded.map((img) => img.url).filter(Boolean)].slice(0, MAX_ATTACHMENTS)
      await updateMarketplaceItem(saved.id, {
        image_url: finalUrls[0] || null,
      })

      await showSwal({
        icon: 'success',
        title: editingItem ? 'บันทึกสำเร็จ' : 'เพิ่มรายการสำเร็จ',
        timer: 1400,
        showConfirmButton: false,
      })

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
      await deleteMarketplaceImageFolder(item.id)
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
    <div className="pane on houses-compact">
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
      </div>

      <div className="card houses-main-card">
        <div className="vms-panel-toolbar">
          <div className="vms-toolbar-left">
            <DropdownList compact value={typeFilter} options={mktTypeOptions} onChange={(v) => { setTypeFilter(v); setPage(1); loadData({ status: statusFilter, listing_type: v, search: searchTerm }) }} placeholder="ทุกประเภท" />
            <DropdownList compact value={statusFilter} options={mktStatusOptions} onChange={(v) => { setStatusFilter(v); setPage(1); loadData({ status: v, listing_type: typeFilter, search: searchTerm }) }} placeholder="ทุกสถานะ" />
            <div className="vms-inline-search">
              <svg width="12" height="12" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd"/>
              </svg>
              <input type="text" value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setPage(1) }} placeholder="ค้นหา ชื่อ / หมวด / บ้าน" />
            </div>
          </div>
          <div className="vms-toolbar-right">
            <button className="vms-sm-btn vms-sm-btn--primary" onClick={openAddModal}>+ โพสต์ใหม่</button>
            <button className="vms-sm-btn" onClick={() => loadData({ status: statusFilter, listing_type: typeFilter, search: searchTerm })}><svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M17.65 6.35A7.958 7.958 0 0 0 12 4C7.58 4 4.01 7.58 4.01 12S7.58 20 12 20c3.73 0 6.84-2.55 7.73-6h-2.08A5.99 5.99 0 0 1 12 18c-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/></svg></button>
          </div>
        </div>
        <div className="cb houses-table-card-body houses-main-body">
          <div className="desktop-only">
            <div style={{ overflowX: 'auto' }}>
              <table className="tw houses-table houses-main-table" style={{ width: '100%', minWidth: '980px' }}>
                <thead><tr>
                  <th>บ้าน / เจ้าของ</th>
                  <th>ชื่อสินค้า/บริการ</th>
                  <th>รูป</th>
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
                    <tr><td colSpan="10" style={{ textAlign: 'center', color: 'var(--mu)', padding: '20px' }}>กำลังโหลด...</td></tr>
                  ) : items.length === 0 ? (
                    <tr><td colSpan="10" style={{ textAlign: 'center', color: 'var(--mu)', padding: '20px' }}>ไม่พบข้อมูล</td></tr>
                  ) : pagedItems.map((item) => {
                    const lBadge = getListingBadge(item.listing_type)
                    const sBadge = getStatusBadge(item.status)
                    return (
                      <tr key={item.id}>
                        <td><strong>{item.houses?.house_no || '-'}</strong>{item.houses?.owner_name ? <div style={{ fontSize: '11px', color: 'var(--mu)' }}>{item.houses.owner_name}</div> : null}</td>
                        <td style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}><strong>{item.title}</strong></td>
                        <td>
                          {item.image_url ? (
                            <img
                              src={item.image_url}
                              alt={item.title || 'thumb'}
                              style={{ width: '54px', height: '54px', borderRadius: '8px', objectFit: 'cover', border: '1px solid #dbe3ed', background: '#fff', display: 'block' }}
                            />
                          ) : (
                            <span style={{ color: 'var(--mu)', fontSize: '12px' }}>-</span>
                          )}
                        </td>
                        <td>{item.category || '-'}</td>
                        <td><span className={lBadge.className}>{lBadge.label}</span></td>
                        <td>{item.listing_type === 'free' ? 'ฟรี' : item.listing_type === 'wanted' ? '-' : formatPrice(item.price)}</td>
                        <td>{item.contact || '-'}</td>
                        <td><span className={sBadge.className}>{sBadge.label}</span></td>
                        <td>{formatDate(item.created_at)}</td>
                        <td><div className="vms-row-acts">
                          <button className="vms-ra-btn vms-ra-view" title="ดู" onClick={() => openDetailModal(item)}><svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor"><path d="M10 12a2 2 0 100-4 2 2 0 000 4z"/><path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd"/></svg></button>
                          {item.status === 'pending' && (
                            <button className="vms-ra-btn vms-ra-ok" title="อนุมัติ" onClick={() => handleApprove(item)}><svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/></svg></button>
                          )}
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
                    <div className="vms-row-acts">
                      <button className="vms-ra-btn vms-ra-view" title="ดู" onClick={() => openDetailModal(item)}><svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor"><path d="M10 12a2 2 0 100-4 2 2 0 000 4z"/><path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd"/></svg></button>
                      {item.status === 'pending' && <button className="vms-ra-btn vms-ra-ok" title="อนุมัติ" onClick={() => handleApprove(item)}><svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/></svg></button>}
                      <button className="vms-ra-btn vms-ra-edit" title="แก้ไข" onClick={() => openEditModal(item)}><svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"/></svg></button>
                      <button className="vms-ra-btn vms-ra-del" title="ลบ" onClick={() => handleDelete(item)}><svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd"/></svg></button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
        <VmsPagination page={page} totalPages={totalPages} rowsPerPage={rowsPerPage} setRowsPerPage={(v) => { setRowsPerPage(v); setPage(1) }} totalRows={items.length} onPage={setPage} />
      </div>

      {showModal && (
        <div className="house-mo">
          <div className="house-md house-md--md">
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
                      <StyledSelect name="house_id" value={form.house_id} onChange={handleChange}>
                        {houseOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </StyledSelect>
                    </label>
                    <label className="house-field">
                      <span>ประเภทลิสต์</span>
                      <StyledSelect name="listing_type" value={form.listing_type} onChange={handleChange}>
                        {LISTING_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                      </StyledSelect>
                    </label>
                    <label className="house-field">
                      <span>สถานะ</span>
                      <StyledSelect name="status" value={form.status} onChange={handleChange}>
                        {STATUS_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                      </StyledSelect>
                    </label>
                    <label className="house-field house-field-span-2">
                      <span>ชื่อสินค้า/บริการ *</span>
                      <input name="title" value={form.title} onChange={handleChange} placeholder="เช่น จักรยานมือสอง" />
                    </label>
                    <label className="house-field">
                      <span>หมวดหมู่</span>
                      <StyledSelect name="category" value={form.category} onChange={handleChange}>
                        <option value="">เลือกหมวดหมู่</option>
                        {CATEGORY_OPTIONS.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
                      </StyledSelect>
                    </label>
                  </div>
                </section>

                <section className="house-sec">
                  <div className="house-sec-title">รายละเอียดและการติดต่อ</div>
                  <div className="house-grid house-grid-2">
                    <label className="house-field">
                      <span>รายละเอียด</span>
                      <textarea name="detail" value={form.detail} onChange={handleChange} rows="6" placeholder="พิมพ์รายละเอียดสินค้าหรือบริการ" />
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
                      <div className="house-field" style={{ marginTop: '8px' }}>
                        <span>แนบรูปภาพ (สูงสุด 2 รูป, รูปละไม่เกิน 100KB)</span>
                        <label className="btn btn-o btn-sm" style={{ cursor: 'pointer', display: 'inline-block', width: 'fit-content' }}>
                          <input type="file" accept="image/*" multiple onChange={handleAttachFiles} style={{ display: 'none' }} disabled={attachments.length >= MAX_ATTACHMENTS} />
                          แนบไฟล์
                        </label>
                        <div style={{ marginTop: '6px', color: 'var(--mu)', fontSize: '12px' }}>แนบแล้ว {attachments.length}/{MAX_ATTACHMENTS} รูป</div>
                        {attachments.length > 0 && (
                          <div style={{ display: 'flex', gap: '8px', marginTop: '10px', flexWrap: 'wrap' }}>
                            {attachments.map((img, index) => (
                              <div key={img.path || img.name || index} style={{ position: 'relative', width: '84px' }}>
                                <img src={img.url} alt={img.name || `img-${index + 1}`} style={{ width: '84px', height: '84px', objectFit: 'cover', borderRadius: '6px', border: '1px solid #dbe3ed' }} />
                                <button
                                  type="button"
                                  onClick={() => handleRemoveAttachment(index)}
                                  style={{ position: 'absolute', top: '2px', right: '2px', width: '20px', height: '20px', border: 'none', borderRadius: '50%', background: 'rgba(0,0,0,.65)', color: '#fff', cursor: 'pointer', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                >✕</button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
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

      {showDetailModal && detailItem && (
        <div className="house-mo">
          <div className="house-md house-md--lg">
            <div className="house-md-head">
              <div>
                <div className="house-md-title">🔍 รายละเอียดรายการ</div>
                <div className="house-md-sub">{detailItem.title || '-'}</div>
              </div>
            </div>

            <div className="house-md-body" style={{ background: '#eef2f7' }}>
              <div style={{ width: 'min(860px, 100%)', margin: '0 auto', background: '#fff', border: '1px solid #d7dfeb', borderRadius: '12px', boxShadow: '0 8px 24px rgba(15,23,42,.08)', overflow: 'hidden' }}>
                <div style={{ padding: '16px 18px', background: 'linear-gradient(135deg,#1e6b73 0%,#2bb673 100%)', color: '#fff' }}>
                  <div style={{ fontSize: '12px', opacity: 0.85, letterSpacing: '1px' }}>COMMUNITY MARKET REPORT</div>
                  <div style={{ fontSize: '22px', fontWeight: 800, lineHeight: 1.2, marginTop: '2px' }}>{detailItem.title || '-'}</div>
                  <div style={{ marginTop: '8px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    <span style={{ background: 'rgba(255,255,255,.18)', borderRadius: '999px', padding: '4px 10px', fontSize: '12px' }}>{getListingBadge(detailItem.listing_type).label}</span>
                    <span style={{ background: 'rgba(255,255,255,.18)', borderRadius: '999px', padding: '4px 10px', fontSize: '12px' }}>{getStatusBadge(detailItem.status).label}</span>
                    <span style={{ background: 'rgba(255,255,255,.18)', borderRadius: '999px', padding: '4px 10px', fontSize: '12px' }}>{formatDate(detailItem.created_at)}</span>
                  </div>
                </div>

                <div style={{ padding: '14px 18px 16px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '170px 1fr', gap: '8px 12px', fontSize: '13px', borderBottom: '1px solid #e5e7eb', paddingBottom: '12px', marginBottom: '12px' }}>
                    <div style={{ color: '#64748b', fontWeight: 700 }}>บ้าน / เจ้าของ</div>
                    <div style={{ color: '#0f172a', fontWeight: 600 }}>{detailItem.houses?.house_no || '-'}{detailItem.houses?.owner_name ? ` • ${detailItem.houses.owner_name}` : ''}</div>
                    <div style={{ color: '#64748b', fontWeight: 700 }}>หมวดหมู่</div>
                    <div style={{ color: '#0f172a' }}>{detailItem.category || '-'}</div>
                    <div style={{ color: '#64748b', fontWeight: 700 }}>ราคา</div>
                    <div style={{ color: '#0f172a', fontWeight: 700 }}>{detailItem.listing_type === 'free' ? 'ฟรี' : detailItem.listing_type === 'wanted' ? '-' : formatPrice(detailItem.price)}</div>
                    <div style={{ color: '#64748b', fontWeight: 700 }}>ติดต่อ</div>
                    <div style={{ color: '#0f172a' }}>{detailItem.contact || '-'}</div>
                  </div>

                  <div style={{ marginBottom: '14px' }}>
                    <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 700, marginBottom: '4px' }}>รายละเอียด</div>
                    <div style={{ fontSize: '14px', lineHeight: 1.7, color: '#1f2937', whiteSpace: 'pre-wrap', minHeight: '84px' }}>{detailItem.detail || '-'}</div>
                  </div>

                  <div>
                    <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 700, marginBottom: '6px' }}>รูปภาพแนบ ({detailImages.length} รูป)</div>
                    {loadingDetailImages ? (
                      <div style={{ color: 'var(--mu)', fontSize: '13px' }}>กำลังโหลดรูป...</div>
                    ) : detailImages.length === 0 ? (
                      <div style={{ color: 'var(--mu)', fontSize: '13px' }}>ไม่มีรูปแนบ</div>
                    ) : (
                      <div>
                        <div style={{ border: '1px solid #dbe3ed', borderRadius: '10px', overflow: 'hidden', background: '#fff' }}>
                          <img
                            src={detailImages[Math.min(detailImageIndex, detailImages.length - 1)]?.url}
                            alt={detailImages[Math.min(detailImageIndex, detailImages.length - 1)]?.name || `image-${detailImageIndex + 1}`}
                            style={{ width: '100%', height: '280px', objectFit: 'contain', background: '#f8fafc', display: 'block' }}
                          />
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px', gap: '8px' }}>
                          <button
                            type="button"
                            className="btn btn-xs btn-o"
                            onClick={() => setDetailImageIndex((cur) => Math.max(0, cur - 1))}
                            disabled={detailImageIndex <= 0}
                          >
                            ← ก่อนหน้า
                          </button>
                          <div style={{ fontSize: '12px', color: 'var(--mu)' }}>
                            รูป {Math.min(detailImageIndex + 1, detailImages.length)} / {detailImages.length}
                          </div>
                          <button
                            type="button"
                            className="btn btn-xs btn-o"
                            onClick={() => setDetailImageIndex((cur) => Math.min(detailImages.length - 1, cur + 1))}
                            disabled={detailImageIndex >= detailImages.length - 1}
                          >
                            ถัดไป →
                          </button>
                        </div>

                        {detailImages.length > 1 && (
                          <div style={{ display: 'flex', gap: '8px', marginTop: '10px', flexWrap: 'wrap' }}>
                            {detailImages.map((img, idx) => (
                              <button
                                key={img.path || img.url || idx}
                                type="button"
                                onClick={() => setDetailImageIndex(idx)}
                                style={{
                                  padding: 0,
                                  border: idx === detailImageIndex ? '2px solid #1e6b73' : '1px solid #dbe3ed',
                                  borderRadius: '8px',
                                  overflow: 'hidden',
                                  width: '70px',
                                  height: '70px',
                                  background: '#fff',
                                  cursor: 'pointer',
                                }}
                              >
                                <img src={img.url} alt={img.name || `thumb-${idx + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="house-md-foot">
              <button className="btn btn-g" type="button" onClick={closeDetailModal}>ปิด</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminMarketplace