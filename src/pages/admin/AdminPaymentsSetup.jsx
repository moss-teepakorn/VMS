import React, { useEffect, useState } from 'react'
import Swal from 'sweetalert2'
import { listPaymentItemTypes, createPaymentItemType, updatePaymentItemType, deletePaymentItemType } from '../../lib/paymentItemTypes'
import { listPartners, createPartner, updatePartner, deletePartner } from '../../lib/partners'

export default function AdminPaymentsSetup() {
  const [rows, setRows] = useState([])
  const [partners, setPartners] = useState([])
  const [loading, setLoading] = useState(false)
  const [editingItemId, setEditingItemId] = useState('')
  const [editingPartnerId, setEditingPartnerId] = useState('')
  const [itemDraft, setItemDraft] = useState({})
  const [partnerDraft, setPartnerDraft] = useState({})
  const [newItem, setNewItem] = useState(null)
  const [newPartner, setNewPartner] = useState(null)

  const load = async () => {
    setLoading(true)
    try {
      const [data, partnerData] = await Promise.all([
        listPaymentItemTypes(),
        listPartners(),
      ])
      setRows(data)
      setPartners(partnerData)
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Error', text: err.message })
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const startEditItem = (r) => {
    setEditingItemId(r.id)
    setItemDraft({
      id: r.id,
      code: r.code || '',
      label: r.label || '',
      default_amount: String(Number(r.default_amount || 0)),
      category: r.category || '',
      description: r.description || '',
      is_active: !!r.is_active,
    })
  }

  const cancelEditItem = () => {
    setEditingItemId('')
    setItemDraft({})
  }

  const saveItem = async () => {
    try {
      if (!itemDraft.code || !itemDraft.label) {
        return Swal.fire({ icon: 'warning', title: 'ข้อมูลไม่ครบ', text: 'กรุณากรอก code และ label' })
      }
      if (!editingItemId) return
      await updatePaymentItemType(editingItemId, {
        code: itemDraft.code,
        label: itemDraft.label,
        description: itemDraft.description,
        default_amount: Number(itemDraft.default_amount || 0),
        category: itemDraft.category,
        is_active: !!itemDraft.is_active,
      })
      Swal.fire({ icon: 'success', title: 'บันทึกแล้ว', timer: 1000, showConfirmButton: false })
      cancelEditItem()
      load()
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'ผิดพลาด', text: err.message })
    }
  }

  const saveNewItem = async () => {
    try {
      if (!newItem?.code || !newItem?.label) {
        return Swal.fire({ icon: 'warning', title: 'ข้อมูลไม่ครบ', text: 'กรุณากรอก code และ label' })
      }
      await createPaymentItemType({
        code: newItem.code,
        label: newItem.label,
        description: newItem.description,
        default_amount: Number(newItem.default_amount || 0),
        category: newItem.category,
        is_active: !!newItem.is_active,
      })
      setNewItem(null)
      Swal.fire({ icon: 'success', title: 'สร้างแล้ว', timer: 1000, showConfirmButton: false })
      load()
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'ผิดพลาด', text: err.message })
    }
  }

  const handleDelete = async (id) => {
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

  const startEditPartner = (row) => {
    setEditingPartnerId(row.id)
    setPartnerDraft({
      id: row.id,
      name: row.name || '',
      tax_id: row.tax_id || '',
      address: row.address || '',
      phone: row.phone || '',
      note: row.note || '',
      is_active: !!row.is_active,
    })
  }

  const cancelEditPartner = () => {
    setEditingPartnerId('')
    setPartnerDraft({})
  }

  const savePartner = async () => {
    try {
      if (!editingPartnerId) return
      if (!partnerDraft.name) {
        return Swal.fire({ icon: 'warning', title: 'ข้อมูลไม่ครบ', text: 'กรุณากรอกชื่อคู่ค้า' })
      }
      await updatePartner(editingPartnerId, {
        name: partnerDraft.name,
        tax_id: partnerDraft.tax_id,
        address: partnerDraft.address,
        phone: partnerDraft.phone,
        note: partnerDraft.note,
        is_active: !!partnerDraft.is_active,
      })
      cancelEditPartner()
      Swal.fire({ icon: 'success', title: 'บันทึกแล้ว', timer: 1000, showConfirmButton: false })
      load()
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'ผิดพลาด', text: err.message })
    }
  }

  const saveNewPartner = async () => {
    try {
      if (!newPartner?.name) {
        return Swal.fire({ icon: 'warning', title: 'ข้อมูลไม่ครบ', text: 'กรุณากรอกชื่อคู่ค้า' })
      }
      await createPartner({
        name: newPartner.name,
        tax_id: newPartner.tax_id,
        address: newPartner.address,
        phone: newPartner.phone,
        note: newPartner.note,
        is_active: !!newPartner.is_active,
      })
      setNewPartner(null)
      Swal.fire({ icon: 'success', title: 'สร้างแล้ว', timer: 1000, showConfirmButton: false })
      load()
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'ผิดพลาด', text: err.message })
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
    <div className="pane on houses-compact reports-compact">
      <div className="ph">
        <div className="ph-in" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div className="ph-ico">⚙️</div>
          <div>
            <div className="ph-h1">ตั้งค่ารายการรับชำระ</div>
            <div className="ph-sub">จัดการรายการประเภทรับชำระ (master data)</div>
          </div>
          <div style={{ marginLeft: 'auto' }}>
            <button className="btn btn-p" onClick={openNew}>สร้างรายการใหม่</button>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="ch"><div className="ct">รายการประเภทรับชำระ</div></div>
        <div className="cb">
          <div style={{ marginBottom: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ color: 'var(--mu)' }}>แสดงข้อมูลก่อน แล้วแก้ไขแบบ Inline Edit</div>
            <button className="btn btn-p" onClick={() => setNewItem({ code: '', label: '', default_amount: '', category: '', description: '', is_active: true })}>+ เพิ่มรายการ</button>
          </div>
          <div style={{ overflow: 'auto' }}>
            <table className="tw" style={{ width: '100%', minWidth: 900 }}>
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
                {newItem && (
                  <tr>
                    <td><input value={newItem.code} onChange={(e) => setNewItem((p) => ({ ...p, code: e.target.value }))} /></td>
                    <td><input value={newItem.label} onChange={(e) => setNewItem((p) => ({ ...p, label: e.target.value }))} /></td>
                    <td><input type="number" value={newItem.default_amount} onChange={(e) => setNewItem((p) => ({ ...p, default_amount: e.target.value }))} style={{ textAlign: 'right' }} /></td>
                    <td><input value={newItem.category} onChange={(e) => setNewItem((p) => ({ ...p, category: e.target.value }))} /></td>
                    <td><input value={newItem.description} onChange={(e) => setNewItem((p) => ({ ...p, description: e.target.value }))} /></td>
                    <td style={{ textAlign: 'center' }}><input type="checkbox" checked={!!newItem.is_active} onChange={(e) => setNewItem((p) => ({ ...p, is_active: e.target.checked }))} /></td>
                    <td>
                      <button className="btn btn-xs btn-p" onClick={saveNewItem}>บันทึก</button>
                      <button className="btn btn-xs btn-g" style={{ marginLeft: 8 }} onClick={() => setNewItem(null)}>ยกเลิก</button>
                    </td>
                  </tr>
                )}
                {rows.map(r => (
                  <tr key={r.id}>
                    {editingItemId === r.id ? (
                      <>
                        <td><input value={itemDraft.code || ''} onChange={(e) => setItemDraft((p) => ({ ...p, code: e.target.value }))} /></td>
                        <td><input value={itemDraft.label || ''} onChange={(e) => setItemDraft((p) => ({ ...p, label: e.target.value }))} /></td>
                        <td><input type="number" value={itemDraft.default_amount || ''} onChange={(e) => setItemDraft((p) => ({ ...p, default_amount: e.target.value }))} style={{ textAlign: 'right' }} /></td>
                        <td><input value={itemDraft.category || ''} onChange={(e) => setItemDraft((p) => ({ ...p, category: e.target.value }))} /></td>
                        <td><input value={itemDraft.description || ''} onChange={(e) => setItemDraft((p) => ({ ...p, description: e.target.value }))} /></td>
                        <td style={{ textAlign: 'center' }}><input type="checkbox" checked={!!itemDraft.is_active} onChange={(e) => setItemDraft((p) => ({ ...p, is_active: e.target.checked }))} /></td>
                        <td>
                          <button className="btn btn-xs btn-p" onClick={saveItem}>บันทึก</button>
                          <button className="btn btn-xs btn-g" style={{ marginLeft: 8 }} onClick={cancelEditItem}>ยกเลิก</button>
                        </td>
                      </>
                    ) : (
                      <>
                        <td>{r.code}</td>
                        <td>{r.label}</td>
                        <td style={{ textAlign: 'right' }}>{Number(r.default_amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        <td>{r.category || '-'}</td>
                        <td>{r.description || '-'}</td>
                        <td>{r.is_active ? 'ใช้งาน' : 'ปิด'}</td>
                        <td>
                          <button className="btn btn-xs btn-o" onClick={() => startEditItem(r)}>แก้ไข</button>
                          <button className="btn btn-xs btn-dg" style={{ marginLeft: 8 }} onClick={() => handleDelete(r.id)}>ลบ</button>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--mu)' }}>ไม่พบข้อมูล</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <div className="ch"><div className="ct">Setup คู่ค้านิติบุคคล (บุคคลภายนอก)</div></div>
        <div className="cb">
          <div style={{ marginBottom: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ color: 'var(--mu)' }}>ใช้ในหน้ารับชำระเมื่อผู้ชำระเป็นบุคคลภายนอก</div>
            <button className="btn btn-p" onClick={() => setNewPartner({ name: '', tax_id: '', address: '', phone: '', note: '', is_active: true })}>+ เพิ่มคู่ค้า</button>
          </div>
          <div style={{ overflow: 'auto' }}>
            <table className="tw" style={{ width: '100%', minWidth: 1100 }}>
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
                {newPartner && (
                  <tr>
                    <td><input value={newPartner.name} onChange={(e) => setNewPartner((p) => ({ ...p, name: e.target.value }))} /></td>
                    <td><input value={newPartner.tax_id} onChange={(e) => setNewPartner((p) => ({ ...p, tax_id: e.target.value }))} /></td>
                    <td><input value={newPartner.address} onChange={(e) => setNewPartner((p) => ({ ...p, address: e.target.value }))} /></td>
                    <td><input value={newPartner.phone} onChange={(e) => setNewPartner((p) => ({ ...p, phone: e.target.value }))} /></td>
                    <td><input value={newPartner.note} onChange={(e) => setNewPartner((p) => ({ ...p, note: e.target.value }))} /></td>
                    <td style={{ textAlign: 'center' }}><input type="checkbox" checked={!!newPartner.is_active} onChange={(e) => setNewPartner((p) => ({ ...p, is_active: e.target.checked }))} /></td>
                    <td>
                      <button className="btn btn-xs btn-p" onClick={saveNewPartner}>บันทึก</button>
                      <button className="btn btn-xs btn-g" style={{ marginLeft: 8 }} onClick={() => setNewPartner(null)}>ยกเลิก</button>
                    </td>
                  </tr>
                )}
                {partners.map((row) => (
                  <tr key={row.id}>
                    {editingPartnerId === row.id ? (
                      <>
                        <td><input value={partnerDraft.name || ''} onChange={(e) => setPartnerDraft((p) => ({ ...p, name: e.target.value }))} /></td>
                        <td><input value={partnerDraft.tax_id || ''} onChange={(e) => setPartnerDraft((p) => ({ ...p, tax_id: e.target.value }))} /></td>
                        <td><input value={partnerDraft.address || ''} onChange={(e) => setPartnerDraft((p) => ({ ...p, address: e.target.value }))} /></td>
                        <td><input value={partnerDraft.phone || ''} onChange={(e) => setPartnerDraft((p) => ({ ...p, phone: e.target.value }))} /></td>
                        <td><input value={partnerDraft.note || ''} onChange={(e) => setPartnerDraft((p) => ({ ...p, note: e.target.value }))} /></td>
                        <td style={{ textAlign: 'center' }}><input type="checkbox" checked={!!partnerDraft.is_active} onChange={(e) => setPartnerDraft((p) => ({ ...p, is_active: e.target.checked }))} /></td>
                        <td>
                          <button className="btn btn-xs btn-p" onClick={savePartner}>บันทึก</button>
                          <button className="btn btn-xs btn-g" style={{ marginLeft: 8 }} onClick={cancelEditPartner}>ยกเลิก</button>
                        </td>
                      </>
                    ) : (
                      <>
                        <td>{row.name}</td>
                        <td>{row.tax_id || '-'}</td>
                        <td>{row.address || '-'}</td>
                        <td>{row.phone || '-'}</td>
                        <td>{row.note || '-'}</td>
                        <td>{row.is_active ? 'ใช้งาน' : 'ปิด'}</td>
                        <td>
                          <button className="btn btn-xs btn-o" onClick={() => startEditPartner(row)}>แก้ไข</button>
                          <button className="btn btn-xs btn-dg" style={{ marginLeft: 8 }} onClick={() => handleDeletePartner(row.id)}>ลบ</button>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
                {partners.length === 0 && (
                  <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--mu)' }}>ยังไม่มีคู่ค้า</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
