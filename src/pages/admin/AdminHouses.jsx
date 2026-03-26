import React, { useEffect, useMemo, useState } from 'react'
import Swal from 'sweetalert2'
import { createHouse, deleteHouse, getHouseSetup, listHouses, updateHouse } from '../../lib/houses'

const SOI_OPTIONS = Array.from({ length: 25 }, (_, index) => ({
  value: String(index + 1),
  label: `ซอย ${index + 1}`,
}))

const HOUSE_TYPE_OPTIONS = [
  { value: 'อยู่เอง', label: 'อยู่เอง' },
  { value: 'ให้เช่า', label: 'ให้เช่า' },
  { value: 'ว่าง', label: 'ว่าง' },
]

const HOUSE_STATUS_OPTIONS = [
  { value: 'normal', label: 'ปกติ' },
  { value: 'overdue', label: 'ค้างชำระ' },
  { value: 'suspended', label: 'ระงับกรมที่ดิน' },
  { value: 'lawsuit', label: 'ฟ้องร้อง' },
]

const EMPTY_FORM = {
  house_no: '',
  soi: '1',
  address: '',
  owner_name: '',
  resident_name: '',
  contact_name: '',
  phone: '',
  line_id: '',
  email: '',
  area_sqw: '',
  house_type: 'อยู่เอง',
  status: 'normal',
  note: '',
}

function formatCurrency(value) {
  return Number(value || 0).toLocaleString('th-TH')
}

const AdminHouses = () => {
  const [filterType, setFilterType] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [houses, setHouses] = useState([])
  const [loading, setLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editingHouse, setEditingHouse] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [setup, setSetup] = useState({ feeRatePerSqw: 85, villageName: 'The Greenfield' })

  const loadHouses = async (override = {}) => {
    try {
      setLoading(true)
      const data = await listHouses({
        status: override.status ?? filterType,
        search: override.search ?? searchTerm,
      })
      setHouses(data)
    } catch (error) {
      console.error('Error loading houses:', error)
      await Swal.fire({ icon: 'error', title: 'โหลดข้อมูลไม่สำเร็จ', text: error.message })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setLoading(true)
        const [houseData, houseSetup] = await Promise.all([
          listHouses({ status: filterType, search: searchTerm }),
          getHouseSetup(),
        ])
        setHouses(houseData)
        setSetup(houseSetup)
      } catch (error) {
        console.error('Error loading houses:', error)
        await Swal.fire({ icon: 'error', title: 'โหลดข้อมูลไม่สำเร็จ', text: error.message })
      } finally {
        setLoading(false)
      }
    }

    loadInitialData()
  }, [])

  const annualFee = useMemo(() => {
    const area = Number(form.area_sqw || 0)
    return area * 12 * Number(setup.feeRatePerSqw || 0)
  }, [form.area_sqw, setup.feeRatePerSqw])

  const getStatusBadge = (status) => {
    if (status === 'normal')   return { className: 'bd b-ok', label: 'ปกติ' }
    if (status === 'overdue')  return { className: 'bd b-wn', label: 'ค้างชำระ' }
    if (status === 'suspended') return { className: 'bd b-dg', label: 'ระงับกรมที่ดิน' }
    if (status === 'lawsuit')  return { className: 'bd b-pr', label: 'ฟ้องร้อง' }
    return { className: 'bd b-mu', label: status }
  }

  const openAddModal = () => {
    setEditingHouse(null)
    setForm(EMPTY_FORM)
    setShowModal(true)
  }

  const openEditModal = (house) => {
    setEditingHouse(house)
    setForm({
      house_no: house.house_no || '',
      soi: house.soi || '1',
      address: house.address || '',
      owner_name: house.owner_name || '',
      resident_name: house.resident_name || '',
      contact_name: house.contact_name || '',
      phone: house.phone || '',
      line_id: house.line_id || '',
      email: house.email || '',
      area_sqw: String(house.area_sqw || ''),
      house_type: house.house_type || 'อยู่เอง',
      status: house.status || 'normal',
      note: house.note || '',
    })
    setShowModal(true)
  }

  const closeModal = (force = false) => {
    if (saving && !force) return
    setShowModal(false)
    setEditingHouse(null)
    setForm(EMPTY_FORM)
  }

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (!form.house_no.trim()) {
      await Swal.fire({ icon: 'warning', title: 'ข้อมูลไม่ครบ', text: 'กรุณากรอกเลขที่บ้าน' })
      return
    }

    try {
      setSaving(true)

      const payload = {
        house_no: form.house_no,
        soi: form.soi,
        address: form.address,
        owner_name: form.owner_name,
        resident_name: form.resident_name,
        contact_name: form.contact_name,
        phone: form.phone,
        line_id: form.line_id,
        email: form.email,
        area_sqw: Number(form.area_sqw || 0),
        fee_rate: Number(setup.feeRatePerSqw || 0),
        house_type: form.house_type,
        status: form.status,
        note: form.note,
      }

      if (editingHouse) {
        await updateHouse(editingHouse.id, payload)
        await Swal.fire({ icon: 'success', title: 'บันทึกสำเร็จ', text: `อัปเดตบ้าน ${form.house_no} แล้ว`, timer: 1500, showConfirmButton: false })
      } else {
        await createHouse(payload)
        await Swal.fire({ icon: 'success', title: 'เพิ่มข้อมูลสำเร็จ', text: `เพิ่มบ้าน ${form.house_no} แล้ว`, timer: 1500, showConfirmButton: false })
      }

      closeModal(true)
  await loadHouses({ status: filterType, search: searchTerm })
    } catch (error) {
      console.error('Error saving house:', error)
      await Swal.fire({ icon: 'error', title: 'บันทึกไม่สำเร็จ', text: error.message })
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteHouse = async (house) => {
    const result = await Swal.fire({
      icon: 'warning',
      title: 'ยืนยันการลบ',
      text: `ต้องการลบบ้านเลขที่ ${house.house_no} ใช่หรือไม่?`,
      showCancelButton: true,
      confirmButtonText: 'ลบข้อมูล',
      cancelButtonText: 'ยกเลิก',
      confirmButtonColor: '#c0392b',
    })

    if (!result.isConfirmed) return

    try {
      await deleteHouse(house.id)
      await Swal.fire({ icon: 'success', title: 'ลบสำเร็จ', timer: 1400, showConfirmButton: false })
      await loadHouses()
    } catch (error) {
      console.error('Error deleting house:', error)
      await Swal.fire({ icon: 'error', title: 'ลบไม่สำเร็จ', text: error.message })
    }
  }

  return (
    <div className="pane on">
      {/* Page Header */}
      <div className="ph">
        <div className="ph-in">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div className="ph-ico">🏠</div>
            <div>
              <div className="ph-h1">ข้อมูลบ้าน</div>
              <div className="ph-sub">จัดการข้อมูลหลัง 128 หลัง</div>
            </div>
          </div>
          <div className="ph-acts">
            <button className="btn btn-p btn-sm" onClick={openAddModal}>+ เพิ่มบ้าน</button>
            <button className="btn btn-o btn-sm" onClick={() => loadHouses()}>🔄 รีเฟรช</button>
          </div>
        </div>
      </div>

      {/* Filter & Search */}
      <div className="card" style={{ marginBottom: '16px', marginTop: '16px' }}>
        <div className="ch">
          <div className="ct">ค้นหา &amp; กรองข้อมูล</div>
        </div>
        <div className="cb" style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="ค้นหาเลขที่บ้าน / เจ้าของ / ผู้ติดต่อ..."
            style={{ flex: 1, minWidth: '200px', padding: '8px 12px', border: '1px solid var(--bo)', borderRadius: '6px' }}
          />
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            style={{ padding: '8px 12px', border: '1px solid var(--bo)', borderRadius: '6px' }}
          >
            <option value="all">ทั้งหมด</option>
            <option value="normal">ปกติ</option>
            <option value="overdue">ค้างชำระ</option>
            <option value="suspended">ระงับกรมที่ดิน</option>
            <option value="lawsuit">ฟ้องร้อง</option>
          </select>
          <button className="btn btn-a btn-sm" onClick={() => loadHouses()}>ค้นหา</button>
        </div>
      </div>

      {/* Houses Table */}
      <div className="card">
        <div className="ch">
          <div className="ct">รายการบ้านทั้งหมด ({houses.length} หลัง)</div>
        </div>
        <div className="cb">
          <div style={{ overflowX: 'auto' }}>
            <table className="tw" style={{ width: '100%', minWidth: '760px' }}>
              <thead>
                <tr>
                  <th>เลขที่</th>
                  <th>ซอย</th>
                  <th>เจ้าของ / ผู้อยู่อาศัย</th>
                  <th>ประเภท</th>
                  <th>พื้นที่ (ตร.ว.)</th>
                  <th>ค่าส่วนกลาง/ปี</th>
                  <th>สถานะ</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="8" style={{ textAlign: 'center', color: 'var(--mu)', padding: '20px' }}>
                      กำลังโหลดข้อมูล...
                    </td>
                  </tr>
                ) : houses.length === 0 ? (
                  <tr>
                    <td colSpan="8" style={{ textAlign: 'center', color: 'var(--mu)', padding: '20px' }}>
                      ไม่พบข้อมูลบ้าน
                    </td>
                  </tr>
                ) : (
                  houses.map((house) => {
                    const badge = getStatusBadge(house.status)
                    const annualFee = formatCurrency(house.annual_fee)

                    return (
                      <tr key={house.id}>
                        <td><strong>{house.house_no}</strong></td>
                        <td>{house.soi ? `ซอย ${house.soi}` : '-'}</td>
                        <td>
                          <div>{house.owner_name || '-'}</div>
                          {(house.resident_name || house.contact_name) && (
                            <div style={{ fontSize: '11px', color: 'var(--mu)' }}>
                              {[house.resident_name, house.contact_name].filter(Boolean).join(' · ')}
                            </div>
                          )}
                        </td>
                        <td>{house.house_type || '-'}</td>
                        <td>{house.area_sqw ? Number(house.area_sqw).toLocaleString('th-TH') : '-'}</td>
                        <td>฿{annualFee}</td>
                        <td><span className={badge.className}>{badge.label}</span></td>
                        <td style={{ whiteSpace: 'nowrap' }}>
                          <button className="btn btn-xs btn-a" style={{ marginRight: '4px' }} onClick={() => openEditModal(house)}>แก้ไข</button>
                          <button className="btn btn-xs btn-dg" onClick={() => handleDeleteHouse(house)}>ลบ</button>
                        </td>
                      </tr>
                    )
                  })
                )}
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
                <div className="house-md-title">🏠 {editingHouse ? 'แก้ไขข้อมูลบ้าน' : 'เพิ่มข้อมูลบ้าน'}</div>
                <div className="house-md-sub">{form.house_no || '-'} {form.owner_name ? `— ${form.owner_name}` : `— ${setup.villageName}`}</div>
              </div>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="house-md-body">
                <section className="house-sec">
                  <div className="house-sec-title">ที่อยู่</div>
                  <div className="house-grid house-grid-3">
                    <label className="house-field">
                      <span>บ้านเลขที่</span>
                      <input name="house_no" value={form.house_no} onChange={handleChange} placeholder="10/1" />
                    </label>
                    <label className="house-field">
                      <span>ซอย</span>
                      <select name="soi" value={form.soi} onChange={handleChange}>
                        {SOI_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                      </select>
                    </label>
                    <label className="house-field house-field-span-1">
                      <span>ถนน / ที่อยู่</span>
                      <input name="address" value={form.address} onChange={handleChange} placeholder="ถนนใหญ่ 1" />
                    </label>
                  </div>
                </section>

                <section className="house-sec">
                  <div className="house-sec-title">เจ้าของ / ผู้อาศัย</div>
                  <div className="house-grid house-grid-2">
                    <label className="house-field">
                      <span>เจ้าของกรรมสิทธิ์</span>
                      <input name="owner_name" value={form.owner_name} onChange={handleChange} placeholder="สมชาย ใจดี" />
                    </label>
                    <label className="house-field">
                      <span>ผู้เช่า / ผู้อาศัย</span>
                      <input name="resident_name" value={form.resident_name} onChange={handleChange} placeholder="ไม่มี" />
                    </label>
                    <label className="house-field">
                      <span>ผู้ติดต่อ</span>
                      <input name="contact_name" value={form.contact_name} onChange={handleChange} placeholder="สมชาย ใจดี" />
                    </label>
                    <label className="house-field">
                      <span>เบอร์โทร</span>
                      <input name="phone" value={form.phone} onChange={handleChange} placeholder="081-234-5678" />
                    </label>
                    <label className="house-field">
                      <span>Line ID</span>
                      <input name="line_id" value={form.line_id} onChange={handleChange} placeholder="somchai.id" />
                    </label>
                    <label className="house-field">
                      <span>EMAIL</span>
                      <input name="email" value={form.email} onChange={handleChange} placeholder="somchai@email.com" />
                    </label>
                  </div>
                </section>

                <section className="house-sec">
                  <div className="house-sec-title">การเงิน</div>
                  <div className="house-grid house-grid-3">
                    <label className="house-field">
                      <span>ขนาด ตร.ว.</span>
                      <input name="area_sqw" type="number" min="0" step="0.01" value={form.area_sqw} onChange={handleChange} placeholder="52" />
                    </label>
                    <label className="house-field">
                      <span>อัตราค่าส่วนกลางจาก setup</span>
                      <input value={`฿${formatCurrency(setup.feeRatePerSqw)} / ตร.ว. / ปี`} readOnly className="house-readonly" />
                    </label>
                    <label className="house-field">
                      <span>ค่าส่วนกลาง/ปี ฿</span>
                      <input value={formatCurrency(annualFee)} readOnly className="house-readonly" />
                    </label>
                    <label className="house-field">
                      <span>ประเภท</span>
                      <select name="house_type" value={form.house_type} onChange={handleChange}>
                        {HOUSE_TYPE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                      </select>
                    </label>
                    <label className="house-field house-field-span-2">
                      <span>สถานะบ้าน</span>
                      <select name="status" value={form.status} onChange={handleChange}>
                        {HOUSE_STATUS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                      </select>
                    </label>
                    <label className="house-field house-field-span-3">
                      <span>หมายเหตุ</span>
                      <textarea name="note" value={form.note} onChange={handleChange} rows="3" placeholder="รายละเอียดเพิ่มเติม" />
                    </label>
                  </div>
                </section>
              </div>

              <div className="house-md-foot">
                <button className="btn btn-g" type="button" onClick={closeModal}>ยกเลิก</button>
                <button className="btn btn-p" type="submit" disabled={saving}>{saving ? 'กำลังบันทึก...' : 'บันทึก'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminHouses
