import React, { useEffect, useState } from 'react'
import Swal from 'sweetalert2'
import { listPaymentItemTypes, createPaymentItemType, updatePaymentItemType, deletePaymentItemType } from '../../lib/paymentItemTypes'

export default function AdminPaymentsSetup() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ code: '', label: '', description: '', default_amount: '', category: '', is_active: true, id: '' })

  const load = async () => {
    setLoading(true)
    try {
      const data = await listPaymentItemTypes()
      setRows(data)
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Error', text: err.message })
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const openNew = () => {
    setForm({ code: '', label: '', description: '', default_amount: '', category: '', is_active: true, id: '' })
    setOpen(true)
  }

  const openEdit = (r) => {
    setForm({ id: r.id, code: r.code, label: r.label, description: r.description || '', default_amount: r.default_amount || '', category: r.category || '', is_active: r.is_active })
    setOpen(true)
  }

  const handleSave = async () => {
    try {
      if (!form.code || !form.label) {
        return Swal.fire({ icon: 'warning', title: 'ข้อมูลไม่ครบ', text: 'กรุณากรอก code และ label' })
      }
      if (form.id) {
        await updatePaymentItemType(form.id, { code: form.code, label: form.label, description: form.description, default_amount: Number(form.default_amount || 0), category: form.category, is_active: !!form.is_active })
        Swal.fire({ icon: 'success', title: 'บันทึกแล้ว' })
      } else {
        await createPaymentItemType({ code: form.code, label: form.label, description: form.description, default_amount: Number(form.default_amount || 0), category: form.category, is_active: !!form.is_active })
        Swal.fire({ icon: 'success', title: 'สร้างแล้ว' })
      }
      setOpen(false)
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
          <div style={{ overflow: 'auto' }}>
            <table className="tw" style={{ width: '100%', minWidth: 700 }}>
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Label</th>
                  <th>Default Amount</th>
                  <th>Category</th>
                  <th>Active</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(r => (
                  <tr key={r.id}>
                    <td>{r.code}</td>
                    <td>{r.label}</td>
                    <td style={{ textAlign: 'right' }}>{Number(r.default_amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td>{r.category || '-'}</td>
                    <td>{r.is_active ? 'ใช้งาน' : 'ปิด'}</td>
                    <td>
                      <button className="btn btn-xs btn-o" onClick={() => openEdit(r)}>แก้ไข</button>
                      <button className="btn btn-xs btn-dg" style={{ marginLeft: 8 }} onClick={() => handleDelete(r.id)}>ลบ</button>
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--mu)' }}>ไม่พบข้อมูล</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {open && (
        <div className="modal-root"><div className="modal">
          <div className="modal-head"><div className="modal-title">{form.id ? 'แก้ไข' : 'สร้าง'} รายการรับชำระ</div></div>
          <div className="modal-body">
            <label className="house-field"><span>Code</span><input value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} /></label>
            <label className="house-field"><span>Label</span><input value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))} /></label>
            <label className="house-field"><span>Default Amount</span><input type="number" value={form.default_amount} onChange={e => setForm(f => ({ ...f, default_amount: e.target.value }))} /></label>
            <label className="house-field"><span>Category</span><input value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} /></label>
            <label className="house-field"><span>Description</span><textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></label>
            <label className="house-field"><span>Active</span><input type="checkbox" checked={!!form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} /></label>
          </div>
          <div className="modal-foot">
            <button className="btn btn-g" onClick={() => setOpen(false)}>ยกเลิก</button>
            <button className="btn btn-p" onClick={handleSave} style={{ marginLeft: 8 }}>{form.id ? 'บันทึก' : 'สร้าง'}</button>
          </div>
        </div></div>
      )}
    </div>
  )
}
