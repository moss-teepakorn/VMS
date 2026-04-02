import React, { useEffect, useMemo, useState } from 'react'
import Swal from 'sweetalert2'
import { listPaymentItemTypes, createPaymentItemType, updatePaymentItemType, deletePaymentItemType } from '../../lib/paymentItemTypes'
import { listPartners, createPartner, updatePartner, deletePartner } from '../../lib/partners'

const EMPTY_ITEM_FORM = {
  code: '',
  label: '',
  default_amount: '',
  category: '',
  description: '',
  is_active: true,
}

const EMPTY_PARTNER_FORM = {
  name: '',
  tax_id: '',
  address: '',
  phone: '',
  note: '',
  is_active: true,
}

export default function AdminPaymentsSetup() {
  const [rows, setRows] = useState([])
  const [partners, setPartners] = useState([])
  const [loading, setLoading] = useState(false)

  const [showItemModal, setShowItemModal] = useState(false)
  const [itemMode, setItemMode] = useState('create')
  const [itemTargetId, setItemTargetId] = useState('')
  const [itemForm, setItemForm] = useState(EMPTY_ITEM_FORM)
  const [savingItem, setSavingItem] = useState(false)

  const [showPartnerModal, setShowPartnerModal] = useState(false)
  const [partnerMode, setPartnerMode] = useState('create')
  const [partnerTargetId, setPartnerTargetId] = useState('')
  const [partnerForm, setPartnerForm] = useState(EMPTY_PARTNER_FORM)
  const [savingPartner, setSavingPartner] = useState(false)

  const sortedRows = useMemo(() => {
    return [...rows].sort((a, b) => String(a.code || '').localeCompare(String(b.code || ''), 'th', { numeric: true, sensitivity: 'base' }))
  }, [rows])

  const sortedPartners = useMemo(() => {
    return [...partners].sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'th', { numeric: true, sensitivity: 'base' }))
  }, [partners])

  const load = async () => {
    setLoading(true)
    try {
      const [data, partnerData] = await Promise.all([
        listPaymentItemTypes(),
        listPartners(),
      ])
      setRows(data || [])
      setPartners(partnerData || [])
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Error', text: err.message })
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const openCreateItemModal = () => {
    setItemMode('create')
    setItemTargetId('')
    setItemForm(EMPTY_ITEM_FORM)
    setShowItemModal(true)
  }

  const openEditItemModal = (row) => {
    setItemMode('edit')
    setItemTargetId(row.id)
    setItemForm({
      code: row.code || '',
      label: row.label || '',
      default_amount: String(Number(row.default_amount || 0)),
      category: row.category || '',
      description: row.description || '',
      is_active: !!row.is_active,
    })
    setShowItemModal(true)
  }

  const closeItemModal = () => {
    if (savingItem) return
    setShowItemModal(false)
    setItemMode('create')
    setItemTargetId('')
    setItemForm(EMPTY_ITEM_FORM)
  }

  const saveItem = async () => {
    try {
      if (!itemForm.code || !itemForm.label) {
        return Swal.fire({ icon: 'warning', title: 'ข้อมูลไม่ครบ', text: 'กรุณากรอก code และ label' })
      }

      setSavingItem(true)
      const payload = {
        code: itemForm.code,
        label: itemForm.label,
        description: itemForm.description,
        default_amount: Number(itemForm.default_amount || 0),
        category: itemForm.category,
        is_active: !!itemForm.is_active,
      }

      if (itemMode === 'edit' && itemTargetId) {
        await updatePaymentItemType(itemTargetId, payload)
      } else {
        await createPaymentItemType(payload)
      }

      closeItemModal()
      Swal.fire({ icon: 'success', title: itemMode === 'edit' ? 'บันทึกแล้ว' : 'สร้างแล้ว', timer: 1000, showConfirmButton: false })
      load()
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'ผิดพลาด', text: err.message })
    } finally {
      setSavingItem(false)
    }
  }

  const handleDeleteItem = async (id) => {
    const res = await Swal.fire({ icon: 'warning', title: 'ลบรายการ?', showCancelButton: true })
    if (!res.isConfirmed) return
    try {
      await deletePaymentItemType(id)
      Swal.fire({ icon: 'success', title: 'ลบแล้ว' })
      load()
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'ผิดพลาด', text: err.message })
    }
  }

  const openCreatePartnerModal = () => {
    setPartnerMode('create')
    setPartnerTargetId('')
    setPartnerForm(EMPTY_PARTNER_FORM)
    setShowPartnerModal(true)
  }

  const openEditPartnerModal = (row) => {
    setPartnerMode('edit')
    setPartnerTargetId(row.id)
    setPartnerForm({
      name: row.name || '',
      tax_id: row.tax_id || '',
      address: row.address || '',
      phone: row.phone || '',
      note: row.note || '',
      is_active: !!row.is_active,
    })
    setShowPartnerModal(true)
  }

  const closePartnerModal = () => {
    if (savingPartner) return
    setShowPartnerModal(false)
    setPartnerMode('create')
    setPartnerTargetId('')
    setPartnerForm(EMPTY_PARTNER_FORM)
  }

  const savePartner = async () => {
    try {
      if (!partnerForm.name) {
        return Swal.fire({ icon: 'warning', title: 'ข้อมูลไม่ครบ', text: 'กรุณากรอกชื่อคู่ค้า' })
      }

      setSavingPartner(true)
      const payload = {
        name: partnerForm.name,
        tax_id: partnerForm.tax_id,
        address: partnerForm.address,
        phone: partnerForm.phone,
        note: partnerForm.note,
        is_active: !!partnerForm.is_active,
      }

      if (partnerMode === 'edit' && partnerTargetId) {
        await updatePartner(partnerTargetId, payload)
      } else {
        await createPartner(payload)
      }

      closePartnerModal()
      Swal.fire({ icon: 'success', title: partnerMode === 'edit' ? 'บันทึกแล้ว' : 'สร้างแล้ว', timer: 1000, showConfirmButton: false })
      load()
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'ผิดพลาด', text: err.message })
    } finally {
      setSavingPartner(false)
    }
  }

  const handleDeletePartner = async (id) => {
    const res = await Swal.fire({ icon: 'warning', title: 'ลบคู่ค้า?', showCancelButton: true })
    if (!res.isConfirmed) return
    try {
      await deletePartner(id)
      Swal.fire({ icon: 'success', title: 'ลบแล้ว' })
      load()
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'ผิดพลาด', text: err.message })
    }
  }

  return (
    <div className="pane on houses-compact fees-compact payments-setup-compact">
      <div className="ph houses-ph">
        <div className="ph-in" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div className="ph-ico">⚙️</div>
          <div>
            <div className="ph-h1">ตั้งค่ารายการรับชำระ</div>
            <div className="ph-sub">จัดการรายการประเภทรับชำระและคู่ค้านิติบุคคล</div>
          </div>
        </div>
      </div>

      <div className="card houses-main-card">
        <div className="ch houses-list-head houses-main-head">
          <div className="ct">รายการประเภทรับชำระ</div>
          <div className="houses-list-actions">
            <button className="btn btn-p btn-sm" onClick={openCreateItemModal}>+ เพิ่มรายการ</button>
          </div>
        </div>
        <div className="cb houses-table-card-body houses-main-body">
          <div className="houses-table-wrap houses-main-wrap payments-setup-table-wrap">
            <table className="tw houses-table houses-main-table" style={{ width: '100%', minWidth: 900 }}>
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Label</th>
                  <th>Default Amount</th>
                  <th>Category</th>
                  <th>Description</th>
                  <th>Active</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--mu)' }}>กำลังโหลดข้อมูล...</td></tr>
                ) : sortedRows.length === 0 ? (
                  <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--mu)' }}>ไม่พบข้อมูล</td></tr>
                ) : sortedRows.map((row) => (
                  <tr key={row.id}>
                    <td>{row.code}</td>
                    <td>{row.label}</td>
                    <td style={{ textAlign: 'right' }}>{Number(row.default_amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td>{row.category || '-'}</td>
                    <td>{row.description || '-'}</td>
                    <td>{row.is_active ? 'ใช้งาน' : 'ปิด'}</td>
                    <td>
                      <button className="btn btn-xs btn-o" onClick={() => openEditItemModal(row)}>แก้ไข</button>
                      <button className="btn btn-xs btn-dg" style={{ marginLeft: 8 }} onClick={() => handleDeleteItem(row.id)}>ลบ</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="card houses-main-card">
        <div className="ch houses-list-head houses-main-head">
          <div className="ct">Setup คู่ค้านิติบุคคล (บุคคลภายนอก)</div>
          <div className="houses-list-actions">
            <button className="btn btn-p btn-sm" onClick={openCreatePartnerModal}>+ เพิ่มคู่ค้า</button>
          </div>
        </div>
        <div className="cb houses-table-card-body houses-main-body">
          <div className="houses-table-wrap houses-main-wrap payments-setup-table-wrap">
            <table className="tw houses-table houses-main-table" style={{ width: '100%', minWidth: 1100 }}>
              <thead>
                <tr>
                  <th>ชื่อคู่ค้า</th>
                  <th>เลขที่ผู้เสียภาษี</th>
                  <th>ที่อยู่</th>
                  <th>เบอร์โทร</th>
                  <th>รายละเอียด</th>
                  <th>Active</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--mu)' }}>กำลังโหลดข้อมูล...</td></tr>
                ) : sortedPartners.length === 0 ? (
                  <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--mu)' }}>ยังไม่มีคู่ค้า</td></tr>
                ) : sortedPartners.map((row) => (
                  <tr key={row.id}>
                    <td>{row.name}</td>
                    <td>{row.tax_id || '-'}</td>
                    <td>{row.address || '-'}</td>
                    <td>{row.phone || '-'}</td>
                    <td>{row.note || '-'}</td>
                    <td>{row.is_active ? 'ใช้งาน' : 'ปิด'}</td>
                    <td>
                      <button className="btn btn-xs btn-o" onClick={() => openEditPartnerModal(row)}>แก้ไข</button>
                      <button className="btn btn-xs btn-dg" style={{ marginLeft: 8 }} onClick={() => handleDeletePartner(row.id)}>ลบ</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showItemModal && (
        <div className="house-mo">
          <div className="house-md house-md--md">
            <div className="house-md-head">
              <div>
                <div className="house-md-title">{itemMode === 'edit' ? 'แก้ไขรายการรับชำระ' : 'เพิ่มรายการรับชำระ'}</div>
                <div className="house-md-sub">กรอกข้อมูลรายการประเภทชำระ</div>
              </div>
            </div>
            <div className="house-md-body">
              <section className="house-sec">
                <div className="house-grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <label className="house-field">
                    <span>Code *</span>
                    <input value={itemForm.code} onChange={(e) => setItemForm((prev) => ({ ...prev, code: e.target.value }))} />
                  </label>
                  <label className="house-field">
                    <span>Label *</span>
                    <input value={itemForm.label} onChange={(e) => setItemForm((prev) => ({ ...prev, label: e.target.value }))} />
                  </label>
                  <label className="house-field">
                    <span>Default Amount</span>
                    <input type="number" value={itemForm.default_amount} onChange={(e) => setItemForm((prev) => ({ ...prev, default_amount: e.target.value }))} />
                  </label>
                  <label className="house-field">
                    <span>Category</span>
                    <input value={itemForm.category} onChange={(e) => setItemForm((prev) => ({ ...prev, category: e.target.value }))} />
                  </label>
                  <label className="house-field" style={{ gridColumn: '1 / -1' }}>
                    <span>Description</span>
                    <input value={itemForm.description} onChange={(e) => setItemForm((prev) => ({ ...prev, description: e.target.value }))} />
                  </label>
                  <label className="house-field">
                    <span>สถานะ</span>
                    <select value={itemForm.is_active ? '1' : '0'} onChange={(e) => setItemForm((prev) => ({ ...prev, is_active: e.target.value === '1' }))}>
                      <option value="1">ใช้งาน</option>
                      <option value="0">ปิด</option>
                    </select>
                  </label>
                </div>
              </section>
            </div>
            <div className="house-md-foot">
              <button className="btn btn-p" type="button" disabled={savingItem} onClick={saveItem}>{savingItem ? 'กำลังบันทึก...' : 'บันทึก'}</button>
              <button className="btn btn-g" type="button" disabled={savingItem} onClick={closeItemModal}>ยกเลิก</button>
            </div>
          </div>
        </div>
      )}

      {showPartnerModal && (
        <div className="house-mo">
          <div className="house-md house-md--md">
            <div className="house-md-head">
              <div>
                <div className="house-md-title">{partnerMode === 'edit' ? 'แก้ไขคู่ค้านิติบุคคล' : 'เพิ่มคู่ค้านิติบุคคล'}</div>
                <div className="house-md-sub">ใช้สำหรับผู้ชำระประเภทบุคคลภายนอก</div>
              </div>
            </div>
            <div className="house-md-body">
              <section className="house-sec">
                <div className="house-grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <label className="house-field">
                    <span>ชื่อคู่ค้า *</span>
                    <input value={partnerForm.name} onChange={(e) => setPartnerForm((prev) => ({ ...prev, name: e.target.value }))} />
                  </label>
                  <label className="house-field">
                    <span>เลขที่ผู้เสียภาษี</span>
                    <input value={partnerForm.tax_id} onChange={(e) => setPartnerForm((prev) => ({ ...prev, tax_id: e.target.value }))} />
                  </label>
                  <label className="house-field" style={{ gridColumn: '1 / -1' }}>
                    <span>ที่อยู่</span>
                    <input value={partnerForm.address} onChange={(e) => setPartnerForm((prev) => ({ ...prev, address: e.target.value }))} />
                  </label>
                  <label className="house-field">
                    <span>เบอร์โทร</span>
                    <input value={partnerForm.phone} onChange={(e) => setPartnerForm((prev) => ({ ...prev, phone: e.target.value }))} />
                  </label>
                  <label className="house-field">
                    <span>สถานะ</span>
                    <select value={partnerForm.is_active ? '1' : '0'} onChange={(e) => setPartnerForm((prev) => ({ ...prev, is_active: e.target.value === '1' }))}>
                      <option value="1">ใช้งาน</option>
                      <option value="0">ปิด</option>
                    </select>
                  </label>
                  <label className="house-field" style={{ gridColumn: '1 / -1' }}>
                    <span>รายละเอียด</span>
                    <input value={partnerForm.note} onChange={(e) => setPartnerForm((prev) => ({ ...prev, note: e.target.value }))} />
                  </label>
                </div>
              </section>
            </div>
            <div className="house-md-foot">
              <button className="btn btn-p" type="button" disabled={savingPartner} onClick={savePartner}>{savingPartner ? 'กำลังบันทึก...' : 'บันทึก'}</button>
              <button className="btn btn-g" type="button" disabled={savingPartner} onClick={closePartnerModal}>ยกเลิก</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
