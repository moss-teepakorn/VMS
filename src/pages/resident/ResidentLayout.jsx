import { useEffect, useState } from 'react'
import Swal from 'sweetalert2'
import { useAuth } from '../../contexts/AuthContext'
import {
  listHouseViolations,
  listViolationImages,
  residentUpdateViolation,
  uploadViolationImages,
} from '../../lib/violations'
import { createPayment, listHouseFees, listHousePayments } from '../../lib/fees'

const MAX_ATTACHMENTS = 5
const MAX_IMAGE_SIZE_BYTES = 100 * 1024
const MAX_IMAGE_TARGET_BYTES = 95 * 1024

function blurActiveElement() {
  const el = document.activeElement
  if (el instanceof HTMLElement) el.blur()
}

function showSwal(options) {
  blurActiveElement()
  return Swal.fire({ returnFocus: false, ...options })
}

export default function ResidentLayout() {
  const { profile, logout } = useAuth()
  const [activeSection, setActiveSection] = useState('fees')
  const [fees, setFees] = useState([])
  const [payments, setPayments] = useState([])
  const [feeLoading, setFeeLoading] = useState(false)
  const [feeStatusFilter, setFeeStatusFilter] = useState('all')
  const [feeYearFilter, setFeeYearFilter] = useState('all')
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [selectedFee, setSelectedFee] = useState(null)
  const [paymentForm, setPaymentForm] = useState({ amount: '', payment_method: 'transfer', slip_url: '', note: '' })
  const [violations, setViolations] = useState([])
  const [statusFilter, setStatusFilter] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editingViolation, setEditingViolation] = useState(null)
  const [residentNote, setResidentNote] = useState('')
  const [attachments, setAttachments] = useState([])

  const loadFeeData = async (override = {}) => {
    if (!profile?.house_id) return
    try {
      setFeeLoading(true)
      const [feeRows, paymentRows] = await Promise.all([
        listHouseFees(profile.house_id, {
          status: override.status ?? feeStatusFilter,
          year: override.year ?? feeYearFilter,
        }),
        listHousePayments(profile.house_id),
      ])
      setFees(feeRows)
      setPayments(paymentRows)
    } catch (error) {
      await showSwal({ icon: 'error', title: 'โหลดค่าส่วนกลางไม่สำเร็จ', text: error.message })
    } finally {
      setFeeLoading(false)
    }
  }

  const loadViolations = async (override = {}) => {
    if (!profile?.house_id) return
    try {
      setLoading(true)
      const data = await listHouseViolations(profile.house_id, {
        status: override.status ?? statusFilter,
        search: override.search ?? searchTerm,
      })
      setViolations(data)
    } catch (error) {
      await showSwal({ icon: 'error', title: 'โหลดข้อมูลไม่สำเร็จ', text: error.message })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadViolations()
  }, [profile?.house_id])

  useEffect(() => {
    loadFeeData()
  }, [profile?.house_id])

  const getFeeStatusBadge = (status) => {
    if (status === 'paid') return { className: 'bd b-ok', label: 'ชำระแล้ว' }
    if (status === 'pending') return { className: 'bd b-pr', label: 'รอตรวจสอบ' }
    if (status === 'overdue') return { className: 'bd b-dg', label: 'ค้างชำระ' }
    return { className: 'bd b-wn', label: 'ยังไม่ชำระ' }
  }

  const getPaymentStatusBadge = (row) => {
    if (row.verified_at) return { className: 'bd b-ok', label: 'อนุมัติแล้ว' }
    return { className: 'bd b-wn', label: 'รอตรวจสอบ' }
  }

  const getStatusBadge = (status) => {
    if (status === 'resolved') return { className: 'bd b-ok', label: 'แก้ไขแล้ว' }
    if (status === 'in_progress') return { className: 'bd b-ac', label: 'กำลังดำเนินการ' }
    if (status === 'pending') return { className: 'bd b-wn', label: 'รอดำเนินการ' }
    if (status === 'cancelled') return { className: 'bd b-dg', label: 'ยกเลิก' }
    return { className: 'bd b-mu', label: status }
  }

  const formatDate = (value) => {
    if (!value) return '-'
    return new Date(value).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' })
  }

  const formatMoney = (value) => Number(value || 0).toLocaleString('th-TH')

  const formatMethod = (method) => {
    if (method === 'transfer') return 'โอนเงิน'
    if (method === 'cash') return 'เงินสด'
    if (method === 'qr') return 'QR'
    return method || '-'
  }

  const openPaymentModal = (fee) => {
    setSelectedFee(fee)
    setPaymentForm({
      amount: String(Number(fee.total_amount || 0)),
      payment_method: 'transfer',
      slip_url: '',
      note: '',
    })
    setShowPaymentModal(true)
  }

  const closePaymentModal = () => {
    setShowPaymentModal(false)
    setSelectedFee(null)
    setPaymentForm({ amount: '', payment_method: 'transfer', slip_url: '', note: '' })
  }

  const handleSubmitPayment = async (event) => {
    event.preventDefault()
    if (!selectedFee) return
    if (!paymentForm.amount || Number(paymentForm.amount) <= 0) {
      await showSwal({ icon: 'warning', title: 'กรุณาระบุยอดชำระ' })
      return
    }
    if (!paymentForm.slip_url.trim()) {
      await showSwal({ icon: 'warning', title: 'กรุณาแนบลิงก์หลักฐานการชำระ' })
      return
    }

    try {
      await createPayment({
        fee_id: selectedFee.id,
        house_id: profile?.house_id,
        amount: Number(paymentForm.amount),
        payment_method: paymentForm.payment_method,
        slip_url: paymentForm.slip_url,
        note: paymentForm.note,
      })
      await showSwal({
        icon: 'success',
        title: 'ส่งหลักฐานการชำระแล้ว',
        text: 'ระบบส่งรายการให้นิติรอตรวจสอบแล้ว',
        timer: 1400,
        showConfirmButton: false,
      })
      closePaymentModal()
      await loadFeeData({ status: feeStatusFilter, year: feeYearFilter })
    } catch (error) {
      await showSwal({ icon: 'error', title: 'ส่งหลักฐานไม่สำเร็จ', text: error.message })
    }
  }

  const openUpdateModal = async (item) => {
    setEditingViolation(item)
    setResidentNote(item.resident_note || '')
    try {
      const imgs = await listViolationImages(item.id)
      setAttachments(imgs.map((img) => ({ ...img, source: 'existing' })))
    } catch {
      setAttachments([])
    }
    setShowModal(true)
  }

  const closeModal = (force = false) => {
    if (saving && !force) return
    setShowModal(false)
    setEditingViolation(null)
    setResidentNote('')
    setAttachments([])
  }

  const formatResidentFileName = (index) => {
    const now = new Date()
    const date = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`
    const time = `${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`
    return `VIO_RES_${date}_${time}_${String(index).padStart(3, '0')}.jpg`
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

  const resizeImageToLimit = async (file, sequence) => {
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

    return new File([blob], formatResidentFileName(sequence), { type: 'image/jpeg' })
  }

  const handleAttachFiles = async (event) => {
    const selectedFiles = Array.from(event.target.files || [])
    event.target.value = ''
    if (selectedFiles.length === 0) return

    const newFileCount = attachments.filter((item) => item.source === 'new').length
    const remainingSlots = MAX_ATTACHMENTS - newFileCount
    if (remainingSlots <= 0) {
      await showSwal({ icon: 'warning', title: 'แนบรูปได้สูงสุด 5 รูป' })
      return
    }

    const filesToProcess = selectedFiles.slice(0, remainingSlots)
    if (selectedFiles.length > remainingSlots) {
      await showSwal({ icon: 'info', title: `รับได้แค่ ${remainingSlots} รูป`, text: 'ระบบจะใช้เฉพาะรูปชุดแรก' })
    }

    try {
      const startIndex = newFileCount + 1
      const prepared = []

      for (let index = 0; index < filesToProcess.length; index += 1) {
        const resizedFile = await resizeImageToLimit(filesToProcess[index], startIndex + index)
        prepared.push({
          source: 'new',
          name: resizedFile.name,
          file: resizedFile,
          url: URL.createObjectURL(resizedFile),
        })
      }

      setAttachments((current) => [...current, ...prepared])
    } catch (error) {
      await showSwal({ icon: 'error', title: 'แนบรูปไม่สำเร็จ', text: error.message })
    }
  }

  const handleRemoveAttachment = (target) => {
    setAttachments((current) => {
      const next = current.filter((item) => item !== target)
      if (target.source === 'new' && target.url) {
        URL.revokeObjectURL(target.url)
      }
      return next
    })
  }

  const handlePreviewAttachment = (target) => {
    if (!target.url) return
    showSwal({
      imageUrl: target.url,
      imageAlt: target.name,
      showConfirmButton: false,
      showCloseButton: true,
      width: 'auto',
      background: '#0f172a',
    })
  }

  const handleResidentSubmit = async (event) => {
    event.preventDefault()
    if (!editingViolation) return

    if (!residentNote.trim()) {
      await showSwal({ icon: 'warning', title: 'ข้อมูลไม่ครบ', text: 'กรุณากรอกข้อความอัปเดตจากลูกบ้าน' })
      return
    }

    try {
      setSaving(true)
      await residentUpdateViolation(editingViolation.id, {
        status: 'in_progress',
        resident_note: residentNote,
      })

      const newFiles = attachments
        .filter((item) => item.source === 'new' && item.file)
        .map((item) => item.file)
      if (newFiles.length > 0) {
        await uploadViolationImages(editingViolation.id, newFiles)
      }

      await showSwal({ icon: 'success', title: 'อัปเดตสำเร็จ', text: 'ระบบเปลี่ยนสถานะเป็นกำลังดำเนินการแล้ว', timer: 1400, showConfirmButton: false })
      closeModal(true)
      await loadViolations({ status: statusFilter, search: searchTerm })
    } catch (error) {
      await showSwal({ icon: 'error', title: 'อัปเดตไม่สำเร็จ', text: error.message })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="pane on">
      <div className="ph">
        <div className="ph-in">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div className="ph-ico">🏠</div>
            <div>
              <div className="ph-h1">พอร์ทัลลูกบ้าน</div>
              <div className="ph-sub">บ้านของฉัน {profile?.house_id ? '' : '(ยังไม่ได้ผูกบ้าน)'}</div>
            </div>
          </div>
          <div className="ph-acts">
            <button
              className="btn btn-o btn-sm"
              onClick={() => {
                if (activeSection === 'fees') {
                  loadFeeData({ status: feeStatusFilter, year: feeYearFilter })
                } else {
                  loadViolations({ status: statusFilter, search: searchTerm })
                }
              }}
            >
              🔄 รีเฟรช
            </button>
            <button className="btn btn-g btn-sm" onClick={logout}>ออกจากระบบ</button>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: '16px' }}>
        <div className="cb" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button className={`btn btn-sm ${activeSection === 'fees' ? 'btn-a' : 'btn-o'}`} onClick={() => setActiveSection('fees')}>ค่าส่วนกลาง</button>
          <button className={`btn btn-sm ${activeSection === 'violations' ? 'btn-a' : 'btn-o'}`} onClick={() => setActiveSection('violations')}>แจ้งกระทำผิด</button>
        </div>
      </div>

      {activeSection === 'fees' && (
        <>
          <div className="card" style={{ marginTop: '16px', marginBottom: '16px' }}>
            <div className="ch"><div className="ct">ค้นหาใบแจ้งหนี้ค่าส่วนกลาง</div></div>
            <div className="cb" style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <select value={feeStatusFilter} onChange={(e) => setFeeStatusFilter(e.target.value)} style={{ padding: '8px 12px', border: '1px solid var(--bo)', borderRadius: '6px' }}>
                <option value="all">ทุกสถานะ</option>
                <option value="unpaid">ยังไม่ชำระ</option>
                <option value="pending">รอตรวจสอบ</option>
                <option value="paid">ชำระแล้ว</option>
                <option value="overdue">ค้างชำระ</option>
              </select>
              <select value={feeYearFilter} onChange={(e) => setFeeYearFilter(e.target.value)} style={{ padding: '8px 12px', border: '1px solid var(--bo)', borderRadius: '6px' }}>
                <option value="all">ทุกปี</option>
                {[...new Set(fees.map((row) => row.year).filter(Boolean))].sort((a, b) => b - a).map((year) => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
              <button className="btn btn-a btn-sm" onClick={() => loadFeeData({ status: feeStatusFilter, year: feeYearFilter })}>ค้นหา</button>
            </div>
          </div>

          <div className="card">
            <div className="ch"><div className="ct">ใบแจ้งหนี้ของบ้านฉัน ({fees.length} รายการ)</div></div>
            <div className="cb">
              <div style={{ overflowX: 'auto' }}>
                <table className="tw" style={{ width: '100%', minWidth: '860px' }}>
                  <thead><tr>
                    <th>ปี</th>
                    <th>งวด</th>
                    <th>วันที่ออก</th>
                    <th>ครบกำหนด</th>
                    <th>ยอดรวม</th>
                    <th>สถานะ</th>
                    <th></th>
                  </tr></thead>
                  <tbody>
                    {feeLoading ? (
                      <tr><td colSpan="7" style={{ textAlign: 'center', color: 'var(--mu)', padding: '20px' }}>กำลังโหลด...</td></tr>
                    ) : fees.length === 0 ? (
                      <tr><td colSpan="7" style={{ textAlign: 'center', color: 'var(--mu)', padding: '20px' }}>ยังไม่มีใบแจ้งหนี้</td></tr>
                    ) : fees.map((fee) => {
                      const badge = getFeeStatusBadge(fee.status)
                      return (
                        <tr key={fee.id}>
                          <td>{fee.year || '-'}</td>
                          <td>{fee.period || '-'}</td>
                          <td>{formatDate(fee.invoice_date)}</td>
                          <td>{formatDate(fee.due_date)}</td>
                          <td><strong>฿{formatMoney(fee.total_amount)}</strong></td>
                          <td><span className={badge.className}>{badge.label}</span></td>
                          <td>
                            {(fee.status === 'unpaid' || fee.status === 'overdue') && (
                              <button className="btn btn-xs btn-a" onClick={() => openPaymentModal(fee)}>ส่งหลักฐานชำระ</button>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="card" style={{ marginTop: '16px' }}>
            <div className="ch"><div className="ct">ประวัติการชำระ ({payments.length} รายการ)</div></div>
            <div className="cb">
              <div style={{ overflowX: 'auto' }}>
                <table className="tw" style={{ width: '100%', minWidth: '900px' }}>
                  <thead><tr>
                    <th>งวดอ้างอิง</th>
                    <th>ยอดชำระ</th>
                    <th>วิธีชำระ</th>
                    <th>หลักฐาน</th>
                    <th>วันที่ส่ง</th>
                    <th>สถานะ</th>
                    <th>หมายเหตุ</th>
                  </tr></thead>
                  <tbody>
                    {feeLoading ? (
                      <tr><td colSpan="7" style={{ textAlign: 'center', color: 'var(--mu)', padding: '20px' }}>กำลังโหลด...</td></tr>
                    ) : payments.length === 0 ? (
                      <tr><td colSpan="7" style={{ textAlign: 'center', color: 'var(--mu)', padding: '20px' }}>ยังไม่มีประวัติชำระเงิน</td></tr>
                    ) : payments.map((row) => {
                      const badge = getPaymentStatusBadge(row)
                      return (
                        <tr key={row.id}>
                          <td>{row.fees ? `${row.fees.period} ${row.fees.year}` : '-'}</td>
                          <td>฿{formatMoney(row.amount)}</td>
                          <td>{formatMethod(row.payment_method)}</td>
                          <td>{row.slip_url ? <a href={row.slip_url} target="_blank" rel="noreferrer">ดูสลิป</a> : '-'}</td>
                          <td>{new Date(row.paid_at).toLocaleString('th-TH')}</td>
                          <td><span className={badge.className}>{badge.label}</span></td>
                          <td>{row.note || '-'}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}

      {activeSection === 'violations' && (
        <>

      <div className="card" style={{ marginTop: '16px', marginBottom: '16px' }}>
        <div className="ch"><div className="ct">ค้นหารายการแจ้งกระทำผิด</div></div>
        <div className="cb" style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="ค้นหา ประเภท / รายละเอียด"
            style={{ flex: 1, minWidth: '240px', padding: '8px 12px', border: '1px solid var(--bo)', borderRadius: '6px' }}
          />
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ padding: '8px 12px', border: '1px solid var(--bo)', borderRadius: '6px' }}>
            <option value="all">ทุกสถานะ</option>
            <option value="pending">รอดำเนินการ</option>
            <option value="in_progress">กำลังดำเนินการ</option>
            <option value="resolved">แก้ไขแล้ว</option>
            <option value="cancelled">ยกเลิก</option>
          </select>
          <button className="btn btn-a btn-sm" onClick={() => loadViolations({ status: statusFilter, search: searchTerm })}>ค้นหา</button>
        </div>
      </div>

      <div className="card">
        <div className="ch"><div className="ct">แจ้งกระทำผิดของบ้านฉัน ({violations.length} รายการ)</div></div>
        <div className="cb">
          <div style={{ overflowX: 'auto' }}>
            <table className="tw" style={{ width: '100%', minWidth: '900px' }}>
              <thead><tr>
                <th>ประเภท</th>
                <th>รายละเอียด</th>
                <th>หมายเหตุจากนิติ</th>
                <th>อัปเดตล่าสุดจากลูกบ้าน</th>
                <th>วันครบกำหนด</th>
                <th>สถานะ</th>
                <th></th>
              </tr></thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="7" style={{ textAlign: 'center', color: 'var(--mu)', padding: '20px' }}>กำลังโหลด...</td></tr>
                ) : violations.length === 0 ? (
                  <tr><td colSpan="7" style={{ textAlign: 'center', color: 'var(--mu)', padding: '20px' }}>ไม่พบข้อมูล</td></tr>
                ) : violations.map((item) => {
                  const badge = getStatusBadge(item.status)
                  return (
                    <tr key={item.id}>
                      <td>{item.type || '-'}</td>
                      <td style={{ maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.detail || '-'}</td>
                      <td style={{ maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.admin_note || '-'}</td>
                      <td>
                        <div style={{ maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.resident_note || '-'}</div>
                        <div style={{ fontSize: '11px', color: 'var(--mu)' }}>{formatDate(item.resident_updated_at)}</div>
                      </td>
                      <td>{formatDate(item.due_date)}</td>
                      <td><span className={badge.className}>{badge.label}</span></td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        <button className="btn btn-xs btn-a" onClick={() => openUpdateModal(item)}>อัปเดตผล</button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
        </>
      )}

      {showPaymentModal && (
        <div className="house-mo">
          <div className="house-md" style={{ maxWidth: '520px' }}>
            <div className="house-md-head">
              <div>
                <div className="house-md-title">💳 ส่งหลักฐานการชำระ</div>
                <div className="house-md-sub">งวด {selectedFee?.period || '-'} {selectedFee?.year || ''}</div>
              </div>
            </div>
            <form onSubmit={handleSubmitPayment}>
              <div className="house-md-body">
                <section className="house-sec">
                  <div className="house-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
                    <label className="house-field">
                      <span>ยอดชำระ *</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={paymentForm.amount}
                        onChange={(e) => setPaymentForm((prev) => ({ ...prev, amount: e.target.value }))}
                      />
                    </label>
                    <label className="house-field">
                      <span>วิธีชำระ *</span>
                      <select
                        value={paymentForm.payment_method}
                        onChange={(e) => setPaymentForm((prev) => ({ ...prev, payment_method: e.target.value }))}
                      >
                        <option value="transfer">โอนเงิน</option>
                        <option value="cash">เงินสด</option>
                        <option value="qr">QR</option>
                      </select>
                    </label>
                    <label className="house-field" style={{ gridColumn: '1 / -1' }}>
                      <span>ลิงก์หลักฐานการชำระ (สลิป) *</span>
                      <input
                        type="url"
                        placeholder="https://..."
                        value={paymentForm.slip_url}
                        onChange={(e) => setPaymentForm((prev) => ({ ...prev, slip_url: e.target.value }))}
                      />
                    </label>
                    <label className="house-field" style={{ gridColumn: '1 / -1' }}>
                      <span>หมายเหตุ</span>
                      <textarea
                        rows="3"
                        value={paymentForm.note}
                        onChange={(e) => setPaymentForm((prev) => ({ ...prev, note: e.target.value }))}
                        placeholder="รายละเอียดเพิ่มเติม (ถ้ามี)"
                      />
                    </label>
                  </div>
                </section>
              </div>
              <div className="house-md-foot">
                <button className="btn btn-g" type="button" onClick={closePaymentModal}>ยกเลิก</button>
                <button className="btn btn-p" type="submit">ส่งตรวจสอบ</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showModal && (
        <div className="house-mo">
          <div className="house-md house-md-vehicle">
            <div className="house-md-head">
              <div>
                <div className="house-md-title">📝 อัปเดตข้อมูลจากลูกบ้าน</div>
                <div className="house-md-sub">{editingViolation?.type || '-'}</div>
              </div>
            </div>
            <form onSubmit={handleResidentSubmit}>
              <div className="house-md-body">
                <section className="house-sec">
                  <div className="house-sec-title">ข้อความอัปเดต</div>
                  <div className="house-grid house-grid-1">
                    <label className="house-field">
                      <span>รายละเอียดที่ต้องการแจ้งกลับ *</span>
                      <textarea value={residentNote} onChange={(e) => setResidentNote(e.target.value)} rows="4" placeholder="เช่น ได้ดำเนินการแก้ไขแล้ว กำลังรอตรวจสอบ" />
                    </label>
                  </div>
                </section>

                <section className="house-sec">
                  <div className="house-sec-title">รูปแนบจากลูกบ้าน (สูงสุด 5 รูป)</div>
                  <div className="house-grid house-grid-3">
                    <label className="house-field house-field-span-3">
                      <span>แนบไฟล์รูปภาพ</span>
                      <input type="file" accept="image/*" multiple onChange={handleAttachFiles} />
                    </label>
                  </div>
                  <div style={{ marginTop: '8px', fontSize: '12px', color: 'var(--mu)' }}>
                    ระบบย่อไฟล์ไม่เกิน 100KB และตั้งชื่อ VIO_RES_YYYYMMDD_HHMMSS_001.jpg
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' }}>
                    {attachments.length === 0 ? (
                      <div style={{ fontSize: '12px', color: 'var(--mu)' }}>ยังไม่มีรูปแนบ</div>
                    ) : attachments.map((image, index) => (
                      <div key={`${image.name}-${index}`} style={{ width: '64px' }}>
                        <button
                          type="button"
                          onClick={() => handlePreviewAttachment(image)}
                          style={{ width: '64px', height: '64px', borderRadius: '8px', border: '1px solid var(--bo)', background: '#fff', padding: '0', overflow: 'hidden', cursor: 'pointer' }}
                        >
                          <img src={image.url} alt={image.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        </button>
                        {image.source === 'new' && (
                          <button
                            type="button"
                            onClick={() => handleRemoveAttachment(image)}
                            className="btn btn-xs btn-dg"
                            style={{ marginTop: '4px', width: '100%' }}
                          >
                            ลบ
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </section>
              </div>

              <div className="house-md-foot">
                <button className="btn btn-g" type="button" onClick={closeModal}>ยกเลิก</button>
                <button className="btn btn-p" type="submit" disabled={saving}>{saving ? 'กำลังบันทึก...' : 'ส่งอัปเดต'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
