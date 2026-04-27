import React, { useEffect, useMemo, useState } from 'react'
import StyledSelect from '../../components/StyledSelect'
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
  type: 'receive',
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
  const [partnerRows, setPartnerRows] = useState([])
  const [partnerChanges, setPartnerChanges] = useState(false)
  const [savingPartners, setSavingPartners] = useState(false)
  const [loading, setLoading] = useState(false)
  const [itemTypeTab, setItemTypeTab] = useState('receive')

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
    const filtered = rows.filter((r) => (r.type || 'receive') === itemTypeTab)
    return filtered.sort((a, b) => String(a.code || '').localeCompare(String(b.code || ''), 'th', { numeric: true, sensitivity: 'base' }))
  }, [rows, itemTypeTab])

  const sortedPartnerRows = useMemo(() => {
    return [...partnerRows].sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'th', { numeric: true, sensitivity: 'base' }))
  }, [partnerRows])

  const load = async () => {
    setLoading(true)
    try {
      const [data, partnerData] = await Promise.all([
        listPaymentItemTypes(),
        listPartners(),
      ])
      setRows(data || [])
      setPartnerRows((partnerData || []).map((partner) => ({
        ...partner,
        is_active: !!partner.is_active,
      })))
      setPartnerChanges(false)
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Error', text: err.message })
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const openCreateItemModal = () => {
    setItemMode('create')
    setItemTargetId('')
    setItemForm({ ...EMPTY_ITEM_FORM, type: itemTypeTab })
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
      type: row.type || 'receive',
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
        type: itemForm.type || 'receive',
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

  const onUpdatePartnerRow = (rowId, field, value) => {
    setPartnerRows((prev) => prev.map((row) => row.id === rowId ? { ...row, [field]: value } : row))
    setPartnerChanges(true)
  }

  const addPartnerRow = () => {
    setPartnerRows((prev) => [
      ...prev,
      {
        id: `tmp-${Date.now()}-${prev.length}`,
        name: '',
        tax_id: '',
        address: '',
        phone: '',
        note: '',
        is_active: true,
      },
    ])
    setPartnerChanges(true)
  }

  const savePartnerRows = async () => {
    try {
      setSavingPartners(true)
      const toSave = partnerRows.filter((row) => {
        const isNew = String(row.id).startsWith('tmp-')
        const hasData = String(row.name || '').trim() || String(row.tax_id || '').trim() || String(row.address || '').trim() || String(row.phone || '').trim() || String(row.note || '').trim()
        return isNew ? hasData : true
      })

      for (const row of toSave) {
        const payload = {
          name: row.name,
          tax_id: row.tax_id,
          address: row.address,
          phone: row.phone,
          note: row.note,
          is_active: !!row.is_active,
        }

        if (String(row.id).startsWith('tmp-')) {
          await createPartner(payload)
        } else {
          await updatePartner(row.id, payload)
        }
      }

      Swal.fire({ icon: 'success', title: 'บันทึกคู่ค้าเรียบร้อย', timer: 1200, showConfirmButton: false })
      await load()
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'ผิดพลาด', text: err.message })
    } finally {
      setSavingPartners(false)
      setPartnerChanges(false)
    }
  }

  const removePartnerRow = (rowId) => {
    setPartnerRows((prev) => prev.filter((row) => row.id !== rowId))
    setPartnerChanges(true)
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
    <div className="pane on houses-compact fees-compact payments-setup-compact settings-pane">
      <div className="ph houses-ph">
        <div className="ph-in">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div className="ph-ico">⚙️</div>
            <div>
              <div className="ph-h1">ตั้งค่ารายการรับ/จ่าย</div>
              <div className="ph-sub">จัดการรายการประเภทรับชำระ / จ่ายเงิน และคู่ค้านิติบุคคล</div>
            </div>
          </div>
        </div>
      </div>

      <div className="card houses-main-card">
        <div className="ch houses-list-head houses-main-head">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div className="ct">รายการประเภท{itemTypeTab === 'receive' ? 'รับชำระ' : 'จ่ายเงิน'}</div>
            <div style={{ display: 'flex', gap: 4 }}>
              <button
                className={`btn ${itemTypeTab === 'receive' ? 'btn-p' : 'btn-a'} btn-sm`}
                onClick={() => setItemTypeTab('receive')}
              >รับชำระ</button>
              <button
                className={`btn ${itemTypeTab === 'disburse' ? 'btn-p' : 'btn-a'} btn-sm`}
                onClick={() => setItemTypeTab('disburse')}
              >จ่ายเงิน</button>
            </div>
          </div>
          <div className="houses-list-actions">
            <button className="btn btn-p btn-sm" onClick={openCreateItemModal}>+ เพิ่มรายการ</button>
          </div>
        </div>
        <div className="cb houses-table-card-body houses-main-body">
          <div className="houses-table-wrap houses-main-wrap payments-setup-table-wrap houses-desktop-only">
            <table className="tw houses-table houses-main-table" style={{ width: '100%', minWidth: 900 }}>
              <thead>
                <tr>
                  <th>รหัส</th>
                  <th>ชื่อรายการ</th>
                  <th>ยอดเริ่มต้น</th>
                  <th>หมวดหมู่</th>
                  <th>รายละเอียด</th>
                  <th>สถานะ</th>
                  <th style={{ minWidth: 128 }}>การจัดการ</th>
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
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <button className="vms-ra-btn" onClick={() => openEditItemModal(row)} title="แก้ไข"><svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"/></svg></button>
                        <button className="vms-ra-btn vms-ra-del" onClick={() => handleDeleteItem(row.id)} title="ลบ"><svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd"/></svg></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="houses-mobile-only">
            {loading ? (
              <div className="mcard-empty">กำลังโหลดข้อมูล...</div>
            ) : sortedRows.length === 0 ? (
              <div className="mcard-empty">ไม่พบข้อมูล</div>
            ) : sortedRows.map((row) => (
              <div key={`m-item-${row.id}`} className="mcard">
                <div className="mcard-top">
                  <div className="mcard-title">{row.label || '-'}</div>
                  <span className={`bd ${row.is_active ? 'b-ok' : 'b-mu'} mcard-badge`}>{row.is_active ? 'ใช้งาน' : 'ปิด'}</span>
                </div>
                <div className="mcard-meta">
                  <span><span className="mcard-label">รหัส</span> {row.code || '-'}</span>
                  <span><span className="mcard-label">หมวดหมู่</span> {row.category || '-'}</span>
                  <span><span className="mcard-label">ยอดเริ่มต้น</span> {Number(row.default_amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  <span><span className="mcard-label">รายละเอียด</span> {row.description || '-'}</span>
                </div>
                <div className="mcard-actions">
                  <button className="btn btn-a btn-sm" onClick={() => openEditItemModal(row)}>แก้ไข</button>
                  <button className="btn btn-dg btn-sm" onClick={() => handleDeleteItem(row.id)}>ลบ</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/*
      Old partner modal-based CRUD preserved for reference:
      <div className="card houses-main-card">
        <div className="ch houses-list-head houses-main-head">
          <div className="ct">คู่ค้าของนิติ (บุคคลภายนอก)</div>
          <div className="houses-list-actions">
            <button className="btn btn-p btn-sm" onClick={openCreatePartnerModal}>+ เพิ่มคู่ค้า</button>
          </div>
        </div>
        <div className="cb houses-table-card-body houses-main-body">
          <div className="houses-table-wrap houses-main-wrap payments-setup-table-wrap houses-desktop-only">
            <table className="tw houses-table houses-main-table" style={{ width: '100%', minWidth: 1100 }}>
              <thead>
                <tr>
                  <th>ชื่อคู่ค้า</th>
                  <th>เลขที่ผู้เสียภาษี</th>
                  <th>ที่อยู่</th>
                  <th>เบอร์โทร</th>
                  <th>รายละเอียด</th>
                  <th>สถานะ</th>
                  <th style={{ minWidth: 128 }}>การจัดการ</th>
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
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <button className="btn btn-xs btn-a" onClick={() => openEditPartnerModal(row)}>แก้ไข</button>
                        <button className="btn btn-xs btn-dg" onClick={() => handleDeletePartner(row.id)}>ลบ</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="houses-mobile-only">
            {loading ? (
              <div className="mcard-empty">กำลังโหลดข้อมูล...</div>
            ) : sortedPartners.length === 0 ? (
              <div className="mcard-empty">ยังไม่มีคู่ค้า</div>
            ) : sortedPartners.map((row) => (
              <div key={`m-partner-${row.id}`} className="mcard">
                <div className="mcard-top">
                  <div className="mcard-title">{row.name || '-'}</div>
                  <span className={`bd ${row.is_active ? 'b-ok' : 'b-mu'} mcard-badge`}>{row.is_active ? 'ใช้งาน' : 'ปิด'}</span>
                </div>
                <div className="mcard-meta">
                  <span><span className="mcard-label">เลขที่ผู้เสียภาษี</span> {row.tax_id || '-'}</span>
                  <span><span className="mcard-label">เบอร์โทร</span> {row.phone || '-'}</span>
                  <span><span className="mcard-label">ที่อยู่</span> {row.address || '-'}</span>
                  <span><span className="mcard-label">รายละเอียด</span> {row.note || '-'}</span>
                </div>
                <div className="mcard-actions">
                  <button className="btn btn-a btn-sm" onClick={() => openEditPartnerModal(row)}>แก้ไข</button>
                  <button className="btn btn-dg btn-sm" onClick={() => handleDeletePartner(row.id)}>ลบ</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      */}

      <div className="card houses-main-card">
        <div className="ch houses-list-head houses-main-head">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div className="ct">คู่ค้าของนิติ (บุคคลภายนอก)</div>
          </div>
          <div className="houses-list-actions" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button className="btn btn-a btn-sm" type="button" onClick={addPartnerRow}>+ แถว</button>
            <button className="btn btn-p btn-sm" type="button" onClick={savePartnerRows} disabled={!partnerChanges || savingPartners}>
              {savingPartners ? 'กำลังบันทึก...' : 'บันทึก'}
            </button>
          </div>
        </div>
        <div className="cb houses-table-card-body houses-main-body" style={{ minHeight: 0 }}>
          <div className="houses-table-wrap houses-main-wrap payments-setup-table-wrap houses-desktop-only" style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', minHeight: 0, minWidth: 0 }}>
            <div style={{ overflowX: 'auto', overflowY: 'hidden', minWidth: 0 }}>
              <div style={{ minWidth: 'max-content', display: 'grid', gridTemplateColumns: '220px 140px 260px 140px 240px 90px 150px', gap: 0, alignItems: 'center', background: '#fafafa', borderBottom: '1px solid rgba(0,0,0,.08)', fontSize: 13, fontWeight: 600, lineHeight: 1.4, color: 'var(--txt-60)', height: 48 }}>
                <div style={{ padding: '0 12px' }}>ชื่อคู่ค้า</div>
                <div style={{ padding: '0 12px' }}>เลขที่ผู้เสียภาษี</div>
                <div style={{ padding: '0 12px' }}>ที่อยู่</div>
                <div style={{ padding: '0 12px' }}>เบอร์โทร</div>
                <div style={{ padding: '0 12px' }}>รายละเอียด</div>
                <div style={{ padding: '0 12px' }}>สถานะ</div>
                <div style={{ padding: '0 12px' }}>การจัดการ</div>
              </div>
            </div>
            <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'auto', minWidth: 0, background: '#fff' }}>
              {loading ? (
                <div style={{ padding: 24, textAlign: 'center', color: 'var(--mu)' }}>กำลังโหลดข้อมูล...</div>
              ) : sortedPartnerRows.length === 0 ? (
                <div style={{ padding: 24, textAlign: 'center', color: 'var(--mu)' }}>ยังไม่มีคู่ค้า</div>
              ) : sortedPartnerRows.map((row) => (
                <div key={row.id} style={{ minWidth: 'max-content', display: 'grid', gridTemplateColumns: '220px 140px 260px 140px 240px 90px 150px', gap: 0, alignItems: 'center', padding: '10px 0', borderBottom: '1px solid rgba(0,0,0,.08)' }}>
                  <div style={{ padding: '0 12px' }}>
                    <input
                      value={row.name}
                      onChange={(e) => onUpdatePartnerRow(row.id, 'name', e.target.value)}
                      placeholder="ชื่อคู่ค้า"
                      style={{ width: '100%', minWidth: 0, border: '1px solid var(--bd)', borderRadius: 4, padding: '6px 8px' }}
                    />
                  </div>
                  <div style={{ padding: '0 12px' }}>
                    <input
                      value={row.tax_id || ''}
                      onChange={(e) => onUpdatePartnerRow(row.id, 'tax_id', e.target.value)}
                      placeholder="เลขที่ผู้เสียภาษี"
                      style={{ width: '100%', minWidth: 0, border: '1px solid var(--bd)', borderRadius: 4, padding: '6px 8px' }}
                    />
                  </div>
                  <div style={{ padding: '0 12px' }}>
                    <input
                      value={row.address || ''}
                      onChange={(e) => onUpdatePartnerRow(row.id, 'address', e.target.value)}
                      placeholder="ที่อยู่"
                      style={{ width: '100%', minWidth: 0, border: '1px solid var(--bd)', borderRadius: 4, padding: '6px 8px' }}
                    />
                  </div>
                  <div style={{ padding: '0 12px' }}>
                    <input
                      value={row.phone || ''}
                      onChange={(e) => onUpdatePartnerRow(row.id, 'phone', e.target.value)}
                      placeholder="เบอร์โทร"
                      style={{ width: '100%', minWidth: 0, border: '1px solid var(--bd)', borderRadius: 4, padding: '6px 8px' }}
                    />
                  </div>
                  <div style={{ padding: '0 12px' }}>
                    <input
                      value={row.note || ''}
                      onChange={(e) => onUpdatePartnerRow(row.id, 'note', e.target.value)}
                      placeholder="รายละเอียด"
                      style={{ width: '100%', minWidth: 0, border: '1px solid var(--bd)', borderRadius: 4, padding: '6px 8px' }}
                    />
                  </div>
                  <div style={{ padding: '0 12px' }}>
                    <StyledSelect
                      value={row.is_active ? '1' : '0'}
                      onChange={(e) => onUpdatePartnerRow(row.id, 'is_active', e.target.value === '1')}
                    >
                      <option value="1">ใช้งาน</option>
                      <option value="0">ปิด</option>
                    </StyledSelect>
                  </div>
                  <div style={{ padding: '0 12px', display: 'flex', gap: 8, alignItems: 'center' }}>
                    {String(row.id).startsWith('tmp-') ? (
                      <button className="btn btn-xs btn-dg" type="button" onClick={() => removePartnerRow(row.id)}>ลบ</button>
                    ) : (
                      <button className="btn btn-xs btn-dg" type="button" onClick={() => handleDeletePartner(row.id)}>ลบ</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="houses-mobile-only">
            {loading ? (
              <div className="mcard-empty">กำลังโหลดข้อมูล...</div>
            ) : sortedPartnerRows.length === 0 ? (
              <div className="mcard-empty">ยังไม่มีคู่ค้า</div>
            ) : sortedPartnerRows.map((row) => (
              <div key={`m-partner-${row.id}`} className="mcard">
                <div className="mcard-top">
                  <div className="mcard-title">{row.name || '-'}</div>
                  <span className={`bd ${row.is_active ? 'b-ok' : 'b-mu'} mcard-badge`}>{row.is_active ? 'ใช้งาน' : 'ปิด'}</span>
                </div>
                <div className="mcard-meta">
                  <span><span className="mcard-label">เลขที่ผู้เสียภาษี</span> {row.tax_id || '-'}</span>
                  <span><span className="mcard-label">เบอร์โทร</span> {row.phone || '-'}</span>
                  <span><span className="mcard-label">ที่อยู่</span> {row.address || '-'}</span>
                  <span><span className="mcard-label">รายละเอียด</span> {row.note || '-'}</span>
                </div>
                <div className="mcard-actions">
                  <button className="btn btn-dg btn-sm" onClick={() => (String(row.id).startsWith('tmp-') ? removePartnerRow(row.id) : handleDeletePartner(row.id))}>ลบ</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {showItemModal && (
        <div className="house-mo">
          <div className="house-md house-md--sm" style={{ height: 'auto', maxHeight: 'min(560px, 88vh)' }}>
            <div className="house-md-head">
              <div>
                <div className="house-md-title">{itemMode === 'edit' ? 'แก้ไขรายการ' : 'เพิ่มรายการ'}{itemForm.type === 'disburse' ? 'จ่ายเงิน' : 'รับชำระ'}</div>
                <div className="house-md-sub">กรอกข้อมูลรายการประเภท{itemForm.type === 'disburse' ? 'จ่ายเงิน' : 'รับชำระ'}</div>
              </div>
            </div>
            <div className="house-md-body" style={{ overflowY: 'auto' }}>
              <section className="house-sec">
                <div className="house-grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <label className="house-field">
                    <span>รหัส *</span>
                    <input value={itemForm.code} onChange={(e) => setItemForm((prev) => ({ ...prev, code: e.target.value }))} />
                  </label>
                  <label className="house-field">
                    <span>ชื่อรายการ *</span>
                    <input value={itemForm.label} onChange={(e) => setItemForm((prev) => ({ ...prev, label: e.target.value }))} />
                  </label>
                  <label className="house-field">
                    <span>ยอดเริ่มต้น</span>
                    <input type="number" value={itemForm.default_amount} onChange={(e) => setItemForm((prev) => ({ ...prev, default_amount: e.target.value }))} />
                  </label>
                  <label className="house-field">
                    <span>หมวดหมู่</span>
                    <input value={itemForm.category} onChange={(e) => setItemForm((prev) => ({ ...prev, category: e.target.value }))} />
                  </label>
                  <label className="house-field" style={{ gridColumn: '1 / -1' }}>
                    <span>รายละเอียด</span>
                    <input value={itemForm.description} onChange={(e) => setItemForm((prev) => ({ ...prev, description: e.target.value }))} />
                  </label>
                  <label className="house-field">
                    <span>สถานะ</span>
                    <StyledSelect value={itemForm.is_active ? '1' : '0'} onChange={(e) => setItemForm((prev) => ({ ...prev, is_active: e.target.value === '1' }))}>
                      <option value="1">ใช้งาน</option>
                      <option value="0">ปิด</option>
                    </StyledSelect>
                  </label>
                </div>
              </section>
            </div>
            <div className="house-md-foot">
              <button className="btn btn-p btn-sm" type="button" disabled={savingItem} onClick={saveItem}>{savingItem ? 'กำลังบันทึก...' : 'บันทึก'}</button>
              <button className="btn btn-g btn-sm" type="button" disabled={savingItem} onClick={closeItemModal}>ยกเลิก</button>
            </div>
          </div>
        </div>
      )}

      {/*
      Old partner modal block preserved for reference.
      {/*
      Old partner modal form preserved for reference.
      {showPartnerModal && (
        <div className="house-mo">
          <div className="house-md house-md--sm" style={{ height: 'auto', maxHeight: 'min(560px, 88vh)' }}>
            <div className="house-md-head">
              <div>
                <div className="house-md-title">{partnerMode === 'edit' ? 'แก้ไขคู่ค้านิติบุคคล' : 'เพิ่มคู่ค้านิติบุคคล'}</div>
                <div className="house-md-sub">ใช้สำหรับผู้ชำระประเภทบุคคลภายนอก</div>
              </div>
            </div>
            <div className="house-md-body" style={{ overflowY: 'auto' }}>
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
                    <StyledSelect value={partnerForm.is_active ? '1' : '0'} onChange={(e) => setPartnerForm((prev) => ({ ...prev, is_active: e.target.value === '1' }))}>
                      <option value="1">ใช้งาน</option>
                      <option value="0">ปิด</option>
                    </StyledSelect>
                  </label>
                  <label className="house-field" style={{ gridColumn: '1 / -1' }}>
                    <span>รายละเอียด</span>
                    <input value={partnerForm.note} onChange={(e) => setPartnerForm((prev) => ({ ...prev, note: e.target.value }))} />
                  </label>
                </div>
              </section>
            </div>
            <div className="house-md-foot">
              <button className="btn btn-p btn-sm" type="button" disabled={savingPartner} onClick={savePartner}>{savingPartner ? 'กำลังบันทึก...' : 'บันทึก'}</button>
              <button className="btn btn-g btn-sm" type="button" disabled={savingPartner} onClick={closePartnerModal}>ยกเลิก</button>
            </div>
          </div>
        </div>
      )}
      */}
    </div>
  )
}