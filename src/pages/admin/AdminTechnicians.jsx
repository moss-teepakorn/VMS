import React, { useEffect, useState } from 'react'
import StyledSelect from '../../components/StyledSelect'
import DropdownList from '../../components/DropdownList'
import VmsPagination from '../../components/VmsPagination'
import Swal from 'sweetalert2'
import {
  createTechnician,
  deleteTechnician,
  listTechnicians,
  updateTechnician,
} from '../../lib/technicians'

const EMPTY_FORM = {
  name: '',
  phone: '',
  line_id: '',
  status: 'pending',
  note: '',
}

const TECHNICIAN_SKILLS = [
  'ช่างไฟฟ้า',
  'ช่างประปา',
  'ช่างก่อสร้าง',
  'ช่างไม้',
  'ช่างปูน',
  'ช่างสี',
  'ช่างเหล็ก/เชื่อม',
  'ช่างแอร์',
  'ช่างรถยนต์',
  'ช่างรถจักรยานยนต์',
  'ช่างอิเล็กทรอนิกส์',
  'ช่างคอมพิวเตอร์',
  'ช่างซ่อมแซมทั่วไป',
]

const EMPTY_SERVICE = { skill: '', price_min: '', price_max: '', price_note: '' }

function blurActiveElement() {
  const el = document.activeElement
  if (el instanceof HTMLElement) el.blur()
}

function showSwal(options) {
  blurActiveElement()
  return Swal.fire({ returnFocus: false, ...options })
}

const AdminTechnicians = () => {
  const [technicians, setTechnicians] = useState([])
  const [statusFilter, setStatusFilter] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [services, setServices] = useState([{ ...EMPTY_SERVICE }])
  const [page, setPage] = useState(1)
  const [rowsPerPage, setRowsPerPage] = useState('25')

  const techStatusOptions = [
    { value: 'all', label: 'ทุกสถานะ' },
    { value: 'pending', label: 'รออนุมัติ' },
    { value: 'approved', label: 'อนุมัติแล้ว' },
    { value: 'suspended', label: 'ระงับ' },
  ]

  const totalPages = rowsPerPage === 'all' ? 1 : Math.ceil(technicians.length / Number(rowsPerPage))
  const pagedTechnicians = rowsPerPage === 'all' ? technicians : technicians.slice((page - 1) * Number(rowsPerPage), page * Number(rowsPerPage))

  const loadData = async (override = {}) => {
    try {
      setLoading(true)
      const data = await listTechnicians({ status: override.status ?? statusFilter, search: override.search ?? searchTerm })
      setTechnicians(data)
    } catch (err) {
      await showSwal({ icon: 'error', title: 'โหลดข้อมูลไม่สำเร็จ', text: err.message })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadData() }, [])

  const getStatusBadge = (status) => {
    if (status === 'approved') return { className: 'bd b-ok', label: 'อนุมัติแล้ว' }
    if (status === 'pending') return { className: 'bd b-wn', label: 'รออนุมัติ' }
    if (status === 'suspended') return { className: 'bd b-dg', label: 'ระงับ' }
    return { className: 'bd b-mu', label: status }
  }

  const openAddModal = () => {
    setEditingItem(null)
    setForm(EMPTY_FORM)
    setServices([{ ...EMPTY_SERVICE }])
    setShowModal(true)
  }

  const openEditModal = (item) => {
    setEditingItem(item)
    setForm({
      name: item.name || '',
      phone: item.phone || '',
      line_id: item.line_id || '',
      status: item.status || 'pending',
      note: item.note || '',
    })
    const existingServices = (item.technician_services || []).map((s) => ({
      skill: s.skill || '',
      price_min: s.price_min != null ? String(s.price_min) : '',
      price_max: s.price_max != null ? String(s.price_max) : '',
      price_note: s.price_note || '',
    }))
    setServices(existingServices.length > 0 ? existingServices : [{ ...EMPTY_SERVICE }])
    setShowModal(true)
  }

  const closeModal = (force = false) => {
    if (saving && !force) return
    setShowModal(false)
    setEditingItem(null)
    setForm(EMPTY_FORM)
    setServices([{ ...EMPTY_SERVICE }])
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((cur) => ({ ...cur, [name]: value }))
  }

  const handleServiceChange = (index, field, value) => {
    setServices((cur) => {
      const next = [...cur]
      next[index] = { ...next[index], [field]: value }
      return next
    })
  }

  const addServiceRow = () => setServices((cur) => [...cur, { ...EMPTY_SERVICE }])

  const removeServiceRow = (index) => {
    setServices((cur) => {
      if (cur.length <= 1) return [{ ...EMPTY_SERVICE }]
      return cur.filter((_, i) => i !== index)
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) { await showSwal({ icon: 'warning', title: 'ข้อมูลไม่ครบ', text: 'กรุณากรอกชื่อช่าง' }); return }
    const validServices = services.filter((s) => s.skill.trim())
    const normalizedSkills = validServices.map((s) => s.skill.trim())
    if (new Set(normalizedSkills).size !== normalizedSkills.length) {
      await showSwal({ icon: 'warning', title: 'ความเชี่ยวชาญซ้ำ', text: 'กรุณาเลือกความเชี่ยวชาญแต่ละแถวไม่ให้ซ้ำกัน' })
      return
    }
    try {
      setSaving(true)
      if (editingItem) {
        await updateTechnician(editingItem.id, form, validServices)
        await showSwal({ icon: 'success', title: 'บันทึกสำเร็จ', timer: 1400, showConfirmButton: false })
      } else {
        await createTechnician(form, validServices)
        await showSwal({ icon: 'success', title: 'เพิ่มช่างสำเร็จ', timer: 1400, showConfirmButton: false })
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
      text: `ลบช่าง "${item.name}" ใช่หรือไม่?`,
      showCancelButton: true,
      confirmButtonText: 'ลบ',
      cancelButtonText: 'ยกเลิก',
      confirmButtonColor: '#c0392b',
    })
    if (!result.isConfirmed) return
    try {
      await deleteTechnician(item.id)
      await showSwal({ icon: 'success', title: 'ลบสำเร็จ', timer: 1200, showConfirmButton: false })
      await loadData({ status: statusFilter, search: searchTerm })
    } catch (err) {
      await showSwal({ icon: 'error', title: 'ลบไม่สำเร็จ', text: err.message })
    }
  }

  return (
    <div className="pane on houses-compact">
      <div className="ph">
        <div className="ph-in">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div className="ph-ico">🔨</div>
            <div>
              <div className="ph-h1">ทำเนียบช่าง</div>
              <div className="ph-sub">รายชื่อช่างซ่อมแซมของชุมชน</div>
            </div>
          </div>
        </div>
      </div>

      <div className="card houses-main-card">
        <div className="vms-panel-toolbar">
          <div className="vms-toolbar-left">
            <DropdownList compact value={statusFilter} options={techStatusOptions} onChange={(v) => { setStatusFilter(v); setPage(1); loadData({ status: v, search: searchTerm }) }} placeholder="ทุกสถานะ" />
            <div className="vms-inline-search">
              <svg width="12" height="12" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd"/>
              </svg>
              <input type="text" value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setPage(1) }} placeholder="ค้นหา ชื่อ / เบอร์โทร / Line ID / ความเชี่ยวชาญ" />
            </div>
          </div>
          <div className="vms-toolbar-right">
            <button className="vms-sm-btn vms-sm-btn--primary" onClick={openAddModal}>+ เพิ่มช่างใหม่</button>
            <button className="vms-sm-btn" onClick={() => loadData({ status: statusFilter, search: searchTerm })}><svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M17.65 6.35A7.958 7.958 0 0 0 12 4C7.58 4 4.01 7.58 4.01 12S7.58 20 12 20c3.73 0 6.84-2.55 7.73-6h-2.08A5.99 5.99 0 0 1 12 18c-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/></svg></button>
          </div>
        </div>
        <div className="cb houses-table-card-body houses-main-body">
          <div className="desktop-only">
            <div style={{ overflowX: 'auto' }}>
              <table className="tw houses-table houses-main-table" style={{ width: '100%', minWidth: '800px' }}>
                <thead><tr>
                  <th>ชื่อ-นามสกุล</th>
                  <th>เบอร์โทร</th>
                  <th>Line ID</th>
                  <th>ความเชี่ยวชาญ</th>
                  <th>คะแนน</th>
                  <th>สถานะ</th>
                  <th></th>
                </tr></thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan="7" style={{ textAlign: 'center', color: 'var(--mu)', padding: '20px' }}>กำลังโหลด...</td></tr>
                  ) : technicians.length === 0 ? (
                    <tr><td colSpan="7" style={{ textAlign: 'center', color: 'var(--mu)', padding: '20px' }}>ไม่พบข้อมูล</td></tr>
                  ) : pagedTechnicians.map((item) => {
                    const badge = getStatusBadge(item.status)
                    const skills = (item.technician_services || []).map((s) => s.skill).filter(Boolean).join(', ')
                    return (
                      <tr key={item.id}>
                        <td><strong>{item.name}</strong></td>
                        <td>{item.phone || '-'}</td>
                        <td>{item.line_id || '-'}</td>
                        <td style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{skills || '-'}</td>
                        <td>{item.rating > 0 ? `${Number(item.rating).toFixed(1)} (${item.review_count})` : '-'}</td>
                        <td><span className={badge.className}>{badge.label}</span></td>
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
            ) : technicians.length === 0 ? (
              <div className="mcard-empty">ไม่พบข้อมูล</div>
            ) : technicians.map((item) => {
              const badge = getStatusBadge(item.status)
              const skills = (item.technician_services || []).map((s) => s.skill).filter(Boolean).join(', ')
              return (
                <div key={item.id} className="mcard">
                  <div className="mcard-top">
                    <div>
                      <div className="mcard-title">{item.name}</div>
                      {(item.phone || item.line_id) && <div className="mcard-sub">{[item.phone, item.line_id].filter(Boolean).join(' · ')}</div>}
                    </div>
                    <span className={`${badge.className} mcard-badge`}>{badge.label}</span>
                  </div>
                  <div className="mcard-meta">
                    {skills && <span><span className="mcard-label">ความเชี่ยวชาญ</span> {skills}</span>}
                    <span><span className="mcard-label">คะแนน</span> {item.rating > 0 ? `${Number(item.rating).toFixed(1)} (${item.review_count})` : '-'}</span>
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
        <VmsPagination page={page} totalPages={totalPages} rowsPerPage={rowsPerPage} setRowsPerPage={(v) => { setRowsPerPage(v); setPage(1) }} totalRows={technicians.length} onPage={setPage} />
      </div>

      {showModal && (
        <div className="house-mo">
          <div className="house-md house-md--md">
            <div className="house-md-head">
              <div>
                <div className="house-md-title">🔨 {editingItem ? 'แก้ไขข้อมูลช่าง' : 'เพิ่มช่างใหม่'}</div>
                <div className="house-md-sub">{form.name || 'ชื่อช่าง'}</div>
              </div>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="house-md-body">
                <section className="house-sec">
                  <div className="house-sec-title">ข้อมูลช่าง</div>
                  <div className="house-grid house-grid-3">
                    <label className="house-field">
                      <span>ชื่อ-นามสกุล *</span>
                      <input name="name" value={form.name} onChange={handleChange} placeholder="เช่น สมชาติ สุขใจ" />
                    </label>
                    <label className="house-field">
                      <span>เบอร์โทร</span>
                      <input name="phone" value={form.phone} onChange={handleChange} placeholder="089-xxx-xxxx" />
                    </label>
                    <label className="house-field">
                      <span>Line ID</span>
                      <input name="line_id" value={form.line_id} onChange={handleChange} placeholder="@line_id" />
                    </label>
                    <label className="house-field">
                      <span>สถานะ</span>
                      <StyledSelect name="status" value={form.status} onChange={handleChange}>
                        <option value="pending">รออนุมัติ</option>
                        <option value="approved">อนุมัติแล้ว</option>
                        <option value="suspended">ระงับ</option>
                      </StyledSelect>
                    </label>
                    <label className="house-field house-field-span-3">
                      <span>หมายเหตุ</span>
                      <textarea name="note" value={form.note} onChange={handleChange} rows={4} placeholder="บันทึกเพิ่มเติม" />
                    </label>
                  </div>
                </section>

                <section className="house-sec">
                  <div className="house-sec-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>ความเชี่ยวชาญและราคา</span>
                    <button type="button" className="btn btn-xs btn-o" onClick={addServiceRow}>+ เพิ่มบริการ</button>
                  </div>
                  {(() => {
                    const selectedSkills = services.map((s) => String(s.skill || '').trim()).filter(Boolean)
                    return services.map((svc, idx) => (
                      <div key={idx} style={{ display: 'flex', gap: '8px', marginTop: '8px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                        <label className="house-field" style={{ flex: '2', minWidth: '140px' }}>
                          {idx === 0 && <span>ความเชี่ยวชาญ</span>}
                          <StyledSelect value={svc.skill} onChange={(e) => handleServiceChange(idx, 'skill', e.target.value)}>
                            <option value="">เลือกความเชี่ยวชาญ</option>
                            {TECHNICIAN_SKILLS.map((skill) => {
                              const isDuplicateFromOtherRow = selectedSkills.includes(skill) && svc.skill !== skill
                              return (
                                <option key={skill} value={skill} disabled={isDuplicateFromOtherRow}>{skill}</option>
                              )
                            })}
                          </StyledSelect>
                        </label>
                        <label className="house-field" style={{ flex: '1', minWidth: '80px' }}>
                          {idx === 0 && <span>ราคาต่ำสุด</span>}
                          <input type="number" value={svc.price_min} onChange={(e) => handleServiceChange(idx, 'price_min', e.target.value)} placeholder="0" />
                        </label>
                        <label className="house-field" style={{ flex: '1', minWidth: '80px' }}>
                          {idx === 0 && <span>ราคาสูงสุด</span>}
                          <input type="number" value={svc.price_max} onChange={(e) => handleServiceChange(idx, 'price_max', e.target.value)} placeholder="0" />
                        </label>
                        <label className="house-field" style={{ flex: '2', minWidth: '120px' }}>
                          {idx === 0 && <span>หมายเหตุราคา</span>}
                          <input value={svc.price_note} onChange={(e) => handleServiceChange(idx, 'price_note', e.target.value)} placeholder="เช่น รวมค่าแรง" />
                        </label>
                        <div style={{ paddingBottom: '2px' }}>
                          <button type="button" className="btn btn-xs btn-dg" onClick={() => removeServiceRow(idx)}>ลบ</button>
                        </div>
                      </div>
                    ))
                  })()}
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

export default AdminTechnicians