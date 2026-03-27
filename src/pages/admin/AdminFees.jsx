import React, { useEffect, useMemo, useState } from 'react'
import Swal from 'sweetalert2'
import { listHouses } from '../../lib/houses'
import { getSystemConfig } from '../../lib/systemConfig'
import {
  calculateFullYearFeeByHouse,
  calculateOverdueFeesByIds,
  calculateOverdueFeeCharges,
  createPayment,
  deleteFee,
  listFees,
  listPayments,
  processHalfYearFeesAllHouses,
  summarizeFees,
  updateFee,
} from '../../lib/fees'

function periodLabel(period) {
  if (period === 'first_half') return 'ครึ่งปีแรก'
  if (period === 'second_half') return 'ครึ่งปีหลัง'
  if (period === 'full_year') return 'เต็มปี'
  return period || '-'
}

function toBE(yearCE) {
  const year = Number(yearCE)
  if (!Number.isFinite(year)) return '-'
  return year + 543
}

const AdminFees = () => {
  const [fees, setFees] = useState([])
  const [payments, setPayments] = useState([])
  const [houses, setHouses] = useState([])
  const [setup, setSetup] = useState({
    fee_rate_per_sqw: 85,
    waste_fee_per_period: 100,
    early_pay_discount_pct: 3,
    overdue_fine_pct: 10,
    notice_fee: 200,
  })
  const [statusFilter, setStatusFilter] = useState('all')
  const [yearFilter, setYearFilter] = useState('all')
  const [loading, setLoading] = useState(false)
  const [showProcessModal, setShowProcessModal] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [savingEdit, setSavingEdit] = useState(false)
  const [editingFee, setEditingFee] = useState(null)
  const [editForm, setEditForm] = useState({
    status: 'unpaid',
    invoice_date: '',
    due_date: '',
    fee_common: '0',
    fee_parking: '0',
    fee_waste: '0',
    fee_overdue_common: '0',
    fee_overdue_fine: '0',
    fee_overdue_notice: '0',
    fee_fine: '0',
    fee_notice: '0',
    fee_violation: '0',
    fee_other: '0',
    note: '',
  })
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [savingPayment, setSavingPayment] = useState(false)
  const [payingFee, setPayingFee] = useState(null)
  const [paymentForm, setPaymentForm] = useState({
    payment_method: 'transfer',
    paid_at: new Date().toISOString().slice(0, 16),
    selectedItems: [],
    note: '',
  })
  const [processForm, setProcessForm] = useState({
    yearBE: String(new Date().getFullYear() + 543),
    period: 'first_half',
    overwritePending: false,
  })

  const feeItemDefs = [
    { key: 'fee_common', label: 'ค่าส่วนกลาง' },
    { key: 'fee_parking', label: 'ค่าจอดรถ' },
    { key: 'fee_waste', label: 'ค่าขยะ' },
    { key: 'fee_overdue_common', label: 'ยอดค้างยกมา' },
    { key: 'fee_overdue_fine', label: 'ค่าปรับยอดค้าง' },
    { key: 'fee_overdue_notice', label: 'ค่าทวงถามยอดค้าง' },
    { key: 'fee_fine', label: 'ค่าปรับ' },
    { key: 'fee_notice', label: 'ค่าทวงถาม' },
    { key: 'fee_violation', label: 'ค่ากระทำผิด' },
    { key: 'fee_other', label: 'ค่าอื่นๆ' },
  ]

  const yearOptions = useMemo(() => {
    const years = [...new Set(fees.map((fee) => fee.year).filter(Boolean))].sort((a, b) => b - a)
    return years
  }, [fees])

  const loadFeeData = async (override = {}) => {
    try {
      setLoading(true)
      const [feeData, paymentData, houseData] = await Promise.all([
        listFees({ status: override.status ?? statusFilter, year: override.year ?? yearFilter }),
        listPayments({ limit: 10 }),
        houses.length === 0 ? listHouses() : Promise.resolve(houses),
      ])
      setFees(feeData)
      setPayments(paymentData)
      setHouses(houseData)
    } catch (error) {
      console.error('Error loading fees:', error)
      await Swal.fire({ icon: 'error', title: 'โหลดข้อมูลไม่สำเร็จ', text: error.message })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    getSystemConfig().then(setSetup).catch(() => {})
    loadFeeData()
  }, [])

  const summary = useMemo(() => summarizeFees(fees, payments), [fees, payments])

  const getFeeStatusBadge = (status) => {
    if (status === 'paid') return { className: 'bd b-ok', label: 'ชำระแล้ว' }
    if (status === 'pending') return { className: 'bd b-pr', label: 'รอตรวจสอบ' }
    if (status === 'overdue') return { className: 'bd b-dg', label: 'ค้างชำระ' }
    return { className: 'bd b-wn', label: 'ยังไม่ชำระ' }
  }

  const handleOpenProcessModal = () => {
    setProcessForm({
      yearBE: String(new Date().getFullYear() + 543),
      period: 'first_half',
      overwritePending: false,
    })
    setShowProcessModal(true)
  }

  const handleProcessAll = async (event) => {
    event.preventDefault()
    try {
      setProcessing(true)
      const result = await processHalfYearFeesAllHouses({
        yearBE: Number(processForm.yearBE),
        period: processForm.period,
        setup,
        overwritePending: processForm.overwritePending,
      })

      await Swal.fire({
        icon: 'success',
        title: 'Process สำเร็จ',
        html: `สร้างใหม่ ${result.created} หลัง<br/>อัปเดต ${result.updated} หลัง<br/>ข้าม (ชำระแล้ว) ${result.skippedPaid} หลัง<br/>ข้าม (รอตรวจสอบ) ${result.skippedPending} หลัง${processForm.overwritePending ? '<br/><span style="color:#0f766e">* เลือกทับรายการรอตรวจสอบแล้ว</span>' : ''}`,
      })
      setShowProcessModal(false)
      await loadFeeData({ status: statusFilter, year: yearFilter })
    } catch (error) {
      await Swal.fire({ icon: 'error', title: 'Process ไม่สำเร็จ', text: error.message })
    } finally {
      setProcessing(false)
    }
  }

  const handleEditFee = (fee) => {
    setEditingFee(fee)
    setEditForm({
      status: fee.status || 'unpaid',
      invoice_date: fee.invoice_date || '',
      due_date: fee.due_date || '',
      fee_common: String(fee.fee_common || 0),
      fee_parking: String(fee.fee_parking || 0),
      fee_waste: String(fee.fee_waste || 0),
      fee_overdue_common: String(fee.fee_overdue_common || 0),
      fee_overdue_fine: String(fee.fee_overdue_fine || 0),
      fee_overdue_notice: String(fee.fee_overdue_notice || 0),
      fee_fine: String(fee.fee_fine || 0),
      fee_notice: String(fee.fee_notice || 0),
      fee_violation: String(fee.fee_violation || 0),
      fee_other: String(fee.fee_other || 0),
      note: fee.note || '',
    })
    setShowEditModal(true)
  }

  const handleSubmitEdit = async (event) => {
    event.preventDefault()
    if (!editingFee) return

    try {
      setSavingEdit(true)
      await updateFee(editingFee.id, {
        status: editForm.status || 'unpaid',
        invoice_date: editForm.invoice_date || null,
        due_date: editForm.due_date || null,
        fee_common: Number(editForm.fee_common || 0),
        fee_parking: Number(editForm.fee_parking || 0),
        fee_waste: Number(editForm.fee_waste || 0),
        fee_overdue_common: Number(editForm.fee_overdue_common || 0),
        fee_overdue_fine: Number(editForm.fee_overdue_fine || 0),
        fee_overdue_notice: Number(editForm.fee_overdue_notice || 0),
        fee_fine: Number(editForm.fee_fine || 0),
        fee_notice: Number(editForm.fee_notice || 0),
        fee_violation: Number(editForm.fee_violation || 0),
        fee_other: Number(editForm.fee_other || 0),
        note: editForm.note || null,
      })
      setShowEditModal(false)
      setEditingFee(null)
      await loadFeeData({ status: statusFilter, year: yearFilter })
      await Swal.fire({ icon: 'success', title: 'บันทึกสำเร็จ', timer: 1200, showConfirmButton: false })
    } catch (error) {
      await Swal.fire({ icon: 'error', title: 'แก้ไขไม่สำเร็จ', text: error.message })
    } finally {
      setSavingEdit(false)
    }
  }

  const handleCalculateAnnual = async (fee) => {
    try {
      await calculateFullYearFeeByHouse({
        houseId: fee.house_id,
        year: fee.year,
        setup,
      })
      await Swal.fire({
        icon: 'success',
        title: 'คำนวณทั้งปีสำเร็จ',
        text: `ใช้ส่วนลดค่าส่วนกลาง ${Number(setup.early_pay_discount_pct || 0)}%`,
        timer: 1400,
        showConfirmButton: false,
      })
      await loadFeeData({ status: statusFilter, year: yearFilter })
    } catch (error) {
      await Swal.fire({ icon: 'error', title: 'คำนวณทั้งปีไม่สำเร็จ', text: error.message })
    }
  }

  const handleCalculateOverdue = async (fee) => {
    try {
      await calculateOverdueFeeCharges(fee.id, setup)
      await Swal.fire({
        icon: 'success',
        title: 'คำนวณค่าปรับแล้ว',
        text: `ค่าปรับ ${Number(setup.overdue_fine_pct || 0)}% + ค่าทวงถาม ${Number(setup.notice_fee || 0).toLocaleString('th-TH')} บาท`,
        timer: 1400,
        showConfirmButton: false,
      })
      await loadFeeData({ status: statusFilter, year: yearFilter })
    } catch (error) {
      await Swal.fire({ icon: 'warning', title: 'ยังคำนวณไม่ได้', text: error.message })
    }
  }

  const handleDeleteFee = async (fee) => {
    const result = await Swal.fire({
      icon: 'warning',
      title: 'ยืนยันลบใบแจ้งหนี้?',
      text: `${fee.houses?.house_no || '-'} ${periodLabel(fee.period)} ปี ${toBE(fee.year)}`,
      showCancelButton: true,
      confirmButtonText: 'ลบ',
      cancelButtonText: 'ยกเลิก',
      confirmButtonColor: '#dc2626',
    })
    if (!result.isConfirmed) return

    try {
      await deleteFee(fee.id)
      await loadFeeData({ status: statusFilter, year: yearFilter })
    } catch (error) {
      await Swal.fire({ icon: 'error', title: 'ลบไม่สำเร็จ', text: error.message })
    }
  }

  const handleBulkOverdue = async () => {
    if (fees.length === 0) {
      await Swal.fire({ icon: 'info', title: 'ไม่มีรายการให้คำนวณ', text: 'กรองข้อมูลก่อนหรือสร้างใบแจ้งหนี้ก่อน' })
      return
    }

    const result = await Swal.fire({
      icon: 'question',
      title: 'คำนวณค่าปรับจากรายการที่แสดง?',
      text: `จะคำนวณจากรายการที่แสดงอยู่ตอนนี้ ${fees.length} รายการ`,
      showCancelButton: true,
      confirmButtonText: 'คำนวณ',
      cancelButtonText: 'ยกเลิก',
      confirmButtonColor: '#0f766e',
    })
    if (!result.isConfirmed) return

    try {
      const summaryResult = await calculateOverdueFeesByIds({
        feeIds: fees.map((item) => item.id),
        setup,
      })
      await Swal.fire({
        icon: 'success',
        title: 'คำนวณค่าปรับสำเร็จ',
        html: `อัปเดต ${summaryResult.updated} รายการ<br/>ข้าม (ยังไม่ถึงกำหนด/ไม่มี due) ${summaryResult.skippedNotDue} รายการ<br/>ข้าม (ชำระแล้ว) ${summaryResult.skippedPaid} รายการ`,
      })
      await loadFeeData({ status: statusFilter, year: yearFilter })
    } catch (error) {
      await Swal.fire({ icon: 'error', title: 'คำนวณไม่สำเร็จ', text: error.message })
    }
  }

  const handleAddPayment = (fee) => {
    const selectedItems = feeItemDefs
      .filter((item) => Number(fee[item.key] || 0) > 0)
      .map((item) => item.key)

    setPayingFee(fee)
    setPaymentForm({
      payment_method: 'transfer',
      paid_at: new Date().toISOString().slice(0, 16),
      selectedItems,
      note: '',
    })
    setShowPaymentModal(true)
  }

  const paymentSelectedAmount = useMemo(() => {
    if (!payingFee) return 0
    return paymentForm.selectedItems.reduce((sum, key) => sum + Number(payingFee[key] || 0), 0)
  }, [payingFee, paymentForm.selectedItems])

  const handleSubmitPayment = async (event) => {
    event.preventDefault()
    if (!payingFee) return
    if (paymentForm.selectedItems.length === 0) {
      await Swal.fire({ icon: 'warning', title: 'กรุณาเลือกรายการที่ชำระอย่างน้อย 1 รายการ' })
      return
    }

    try {
      setSavingPayment(true)
      const selectedLabels = feeItemDefs
        .filter((item) => paymentForm.selectedItems.includes(item.key))
        .map((item) => item.label)

      const noteParts = [`ชำระรายการ: ${selectedLabels.join(', ')}`]
      if (paymentForm.note.trim()) noteParts.push(paymentForm.note.trim())

      await createPayment({
        fee_id: payingFee.id,
        house_id: payingFee.house_id,
        amount: paymentSelectedAmount,
        payment_method: paymentForm.payment_method,
        paid_at: paymentForm.paid_at,
        note: noteParts.join(' | '),
      })

      setShowPaymentModal(false)
      setPayingFee(null)
      await loadFeeData({ status: statusFilter, year: yearFilter })
      await Swal.fire({ icon: 'success', title: 'บันทึกรับชำระแล้ว', timer: 1200, showConfirmButton: false })
    } catch (error) {
      await Swal.fire({ icon: 'error', title: 'บันทึกการชำระไม่สำเร็จ', text: error.message })
    } finally {
      setSavingPayment(false)
    }
  }

  return (
    <div className="pane on page-compact" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div className="ph">
        <div className="ph-in">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div className="ph-ico">💰</div>
            <div>
              <div className="ph-h1">ค่าส่วนกลาง</div>
              <div className="ph-sub">ออกใบแจ้งหนี้ทุกหลังจาก setup ระบบ และจัดการรายหลัง</div>
            </div>
          </div>
        </div>
        <div style={{ marginTop: '10px', display: 'flex', justifyContent: 'flex-end', gap: '8px', flexWrap: 'wrap' }}>
          <select className="page-filter-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="all">ทุกสถานะ</option>
            <option value="unpaid">ยังไม่ชำระ</option>
            <option value="pending">รอตรวจสอบ</option>
            <option value="paid">ชำระแล้ว</option>
            <option value="overdue">ค้างชำระ</option>
          </select>
          <select className="page-filter-select" value={yearFilter} onChange={(e) => setYearFilter(e.target.value)}>
            <option value="all">ทุกปี</option>
            {yearOptions.map((year) => <option key={year} value={year}>{toBE(year)}</option>)}
          </select>
          <button className="btn btn-a btn-sm page-filter-btn" onClick={() => loadFeeData({ status: statusFilter, year: yearFilter })}>ค้นหา</button>
        </div>
      </div>

      <div className="stats">
        <div className="sc"><div className="sc-ico a">💵</div><div><div className="sc-v">฿{summary.totalCollected.toLocaleString('th-TH')}</div><div className="sc-l">รวมเก็บแล้ว</div></div></div>
        <div className="sc"><div className="sc-ico d">⏳</div><div><div className="sc-v">฿{summary.totalOutstanding.toLocaleString('th-TH')}</div><div className="sc-l">ค้างชำระ</div></div></div>
        <div className="sc"><div className="sc-ico p">🧾</div><div><div className="sc-v">฿{summary.totalInvoiced.toLocaleString('th-TH')}</div><div className="sc-l">ยอดออกใบแจ้งหนี้</div></div></div>
      </div>

      <div className="card">
        <div className="ch page-list-head">
          <div className="ct">ใบแจ้งหนี้ล่าสุด</div>
          <div className="page-list-actions">
            <button className="btn btn-p btn-sm" onClick={handleOpenProcessModal}>+ สร้างใบแจ้งหนี้</button>
            <button className="btn btn-dg btn-sm" onClick={handleBulkOverdue}>⚖ คำนวณค่าปรับทั้งหมด</button>
            <button className="btn btn-g btn-sm" onClick={() => loadFeeData({ status: statusFilter, year: yearFilter })}>🔄 รีเฟรช</button>
          </div>
        </div>
        <div className="cb page-table-body">
          <div className="desktop-only">
            <div style={{ overflowX: 'auto' }}>
              <table className="tw" style={{ width: '100%', minWidth: '1080px' }}>
                <thead>
                  <tr>
                    <th>บ้าน</th>
                    <th>ปี</th>
                    <th>งวด</th>
                    <th>ครบกำหนด</th>
                    <th>ยอดรวม</th>
                    <th>สถานะ</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan="7" style={{ textAlign: 'center', color: 'var(--mu)', padding: '20px' }}>กำลังโหลดข้อมูล...</td></tr>
                  ) : fees.length === 0 ? (
                    <tr><td colSpan="7" style={{ textAlign: 'center', color: 'var(--mu)', padding: '20px' }}>ยังไม่มีใบแจ้งหนี้</td></tr>
                  ) : (
                    fees.map((fee) => {
                      const badge = getFeeStatusBadge(fee.status)
                      return (
                        <tr key={fee.id}>
                          <td>{fee.houses?.house_no || '-'}<div style={{ fontSize: '11px', color: 'var(--mu)' }}>{fee.houses?.owner_name || '-'}</div></td>
                          <td>{toBE(fee.year)}</td>
                          <td>{periodLabel(fee.period)}</td>
                          <td>{fee.due_date ? new Date(fee.due_date).toLocaleDateString('th-TH') : '-'}</td>
                          <td><strong>฿{Number(fee.total_amount || 0).toLocaleString('th-TH')}</strong></td>
                          <td><span className={badge.className}>{badge.label}</span></td>
                          <td>
                            <div className="td-acts">
                              <button className="btn btn-xs btn-a" onClick={() => handleEditFee(fee)}>แก้ไข</button>
                              {fee.status !== 'paid' && <button className="btn btn-xs btn-p" onClick={() => handleAddPayment(fee)}>รับชำระ</button>}
                              {fee.status !== 'paid' && <button className="btn btn-xs btn-o" onClick={() => handleCalculateAnnual(fee)}>คำนวณทั้งปี</button>}
                              {fee.status !== 'paid' && <button className="btn btn-xs btn-dg" onClick={() => handleCalculateOverdue(fee)}>คำนวณค่าปรับ</button>}
                              <button className="btn btn-xs btn-dg" onClick={() => handleDeleteFee(fee)}>ลบ</button>
                            </div>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
          <div className="mobile-only">
            {loading ? (
              <div className="mcard-empty">กำลังโหลดข้อมูล...</div>
            ) : fees.length === 0 ? (
              <div className="mcard-empty">ยังไม่มีใบแจ้งหนี้</div>
            ) : fees.map((fee) => {
              const badge = getFeeStatusBadge(fee.status)
              return (
                <div key={fee.id} className="mcard">
                  <div className="mcard-top">
                    <div className="mcard-title">{fee.houses?.house_no || '-'}</div>
                    <div className="mcard-sub">{toBE(fee.year)} · {periodLabel(fee.period)}</div>
                    <span className={`${badge.className} mcard-badge`}>{badge.label}</span>
                  </div>
                  <div className="mcard-body">{fee.houses?.owner_name || '-'}</div>
                  <div className="mcard-meta">
                    <span><span className="mcard-label">ครบกำหนด</span> {fee.due_date ? new Date(fee.due_date).toLocaleDateString('th-TH') : '-'}</span>
                    <span><span className="mcard-label">ยอดรวม</span> ฿{Number(fee.total_amount || 0).toLocaleString('th-TH')}</span>
                  </div>
                  <div className="mcard-actions">
                    <button className="btn btn-xs btn-a" onClick={() => handleEditFee(fee)}>แก้ไข</button>
                    {fee.status !== 'paid' && <button className="btn btn-xs btn-p" onClick={() => handleAddPayment(fee)}>รับชำระ</button>}
                    {fee.status !== 'paid' && <button className="btn btn-xs btn-o" onClick={() => handleCalculateAnnual(fee)}>ทั้งปี</button>}
                    {fee.status !== 'paid' && <button className="btn btn-xs btn-dg" onClick={() => handleCalculateOverdue(fee)}>ค่าปรับ</button>}
                    <button className="btn btn-xs btn-dg" onClick={() => handleDeleteFee(fee)}>ลบ</button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="ch"><div className="ct">การชำระเงินล่าสุด</div></div>
        <div className="cb page-table-body">
          <div className="desktop-only">
            <div style={{ overflowX: 'auto' }}>
              <table className="tw" style={{ width: '100%', minWidth: '720px' }}>
                <thead>
                  <tr>
                    <th>บ้าน</th>
                    <th>งวด</th>
                    <th>จำนวนเงิน</th>
                    <th>วิธีชำระ</th>
                    <th>วันที่</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.length === 0 ? (
                    <tr><td colSpan="5" style={{ textAlign: 'center', color: 'var(--mu)', padding: '20px' }}>ยังไม่มีรายการชำระเงิน</td></tr>
                  ) : (
                    payments.map((payment) => (
                      <tr key={payment.id}>
                        <td>{payment.houses?.house_no || '-'}<div style={{ fontSize: '11px', color: 'var(--mu)' }}>{payment.houses?.owner_name || '-'}</div></td>
                        <td>{payment.fees ? `${periodLabel(payment.fees.period)} ${toBE(payment.fees.year)}` : '-'}</td>
                        <td>฿{Number(payment.amount || 0).toLocaleString('th-TH')}</td>
                        <td>{payment.payment_method}</td>
                        <td>{payment.paid_at ? new Date(payment.paid_at).toLocaleString('th-TH') : '-'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
          <div className="mobile-only">
            {payments.length === 0 ? (
              <div className="mcard-empty">ยังไม่มีรายการชำระเงิน</div>
            ) : payments.map((payment) => (
              <div key={payment.id} className="mcard">
                <div className="mcard-top">
                  <div className="mcard-title">{payment.houses?.house_no || '-'}</div>
                  <div className="mcard-sub">{payment.fees ? `${periodLabel(payment.fees.period)} ${toBE(payment.fees.year)}` : '-'}</div>
                </div>
                <div className="mcard-body">{payment.houses?.owner_name || '-'}</div>
                <div className="mcard-meta">
                  <span><span className="mcard-label">จำนวน</span> ฿{Number(payment.amount || 0).toLocaleString('th-TH')}</span>
                  <span><span className="mcard-label">วิธีชำระ</span> {payment.payment_method}</span>
                  <span><span className="mcard-label">วันที่</span> {payment.paid_at ? new Date(payment.paid_at).toLocaleDateString('th-TH') : '-'}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {showEditModal && editingFee && (
        <div className="house-mo">
          <div className="house-md house-md-home">
            <div className="house-md-head">
              <div>
                <div className="house-md-title">🧾 แก้ไขใบแจ้งหนี้</div>
                <div className="house-md-sub">{editingFee.houses?.house_no || '-'} · {periodLabel(editingFee.period)} · ปี {toBE(editingFee.year)}</div>
              </div>
            </div>

            <form onSubmit={handleSubmitEdit}>
              <div className="house-md-body">
                <section className="house-sec">
                  <div className="house-sec-title">ข้อมูลใบแจ้งหนี้</div>
                  <div className="house-grid house-grid-3">
                    <label className="house-field">
                      <span>สถานะ</span>
                      <select value={editForm.status} onChange={(e) => setEditForm((prev) => ({ ...prev, status: e.target.value }))}>
                        <option value="unpaid">ยังไม่ชำระ</option>
                        <option value="pending">รอตรวจสอบ</option>
                        <option value="paid">ชำระแล้ว</option>
                        <option value="overdue">ค้างชำระ</option>
                      </select>
                    </label>
                    <label className="house-field">
                      <span>วันที่ออกใบแจ้งหนี้</span>
                      <input type="date" value={editForm.invoice_date} onChange={(e) => setEditForm((prev) => ({ ...prev, invoice_date: e.target.value }))} />
                    </label>
                    <label className="house-field">
                      <span>วันที่ครบกำหนด</span>
                      <input type="date" value={editForm.due_date} onChange={(e) => setEditForm((prev) => ({ ...prev, due_date: e.target.value }))} />
                    </label>
                  </div>
                </section>

                <section className="house-sec">
                  <div className="house-sec-title">รายการค่าใช้จ่าย</div>
                  <div className="house-grid house-grid-3">
                    <label className="house-field"><span>ค่าส่วนกลาง</span><input type="number" step="0.01" value={editForm.fee_common} onChange={(e) => setEditForm((prev) => ({ ...prev, fee_common: e.target.value }))} /></label>
                    <label className="house-field"><span>ค่าจอดรถ</span><input type="number" step="0.01" value={editForm.fee_parking} onChange={(e) => setEditForm((prev) => ({ ...prev, fee_parking: e.target.value }))} /></label>
                    <label className="house-field"><span>ค่าขยะ</span><input type="number" step="0.01" value={editForm.fee_waste} onChange={(e) => setEditForm((prev) => ({ ...prev, fee_waste: e.target.value }))} /></label>
                    <label className="house-field"><span>ยอดค้างยกมา</span><input type="number" step="0.01" value={editForm.fee_overdue_common} onChange={(e) => setEditForm((prev) => ({ ...prev, fee_overdue_common: e.target.value }))} /></label>
                    <label className="house-field"><span>ค่าปรับยอดค้าง</span><input type="number" step="0.01" value={editForm.fee_overdue_fine} onChange={(e) => setEditForm((prev) => ({ ...prev, fee_overdue_fine: e.target.value }))} /></label>
                    <label className="house-field"><span>ค่าทวงถามยอดค้าง</span><input type="number" step="0.01" value={editForm.fee_overdue_notice} onChange={(e) => setEditForm((prev) => ({ ...prev, fee_overdue_notice: e.target.value }))} /></label>
                    <label className="house-field"><span>ค่าปรับ</span><input type="number" step="0.01" value={editForm.fee_fine} onChange={(e) => setEditForm((prev) => ({ ...prev, fee_fine: e.target.value }))} /></label>
                    <label className="house-field"><span>ค่าทวงถาม</span><input type="number" step="0.01" value={editForm.fee_notice} onChange={(e) => setEditForm((prev) => ({ ...prev, fee_notice: e.target.value }))} /></label>
                    <label className="house-field"><span>ค่ากระทำผิด</span><input type="number" step="0.01" value={editForm.fee_violation} onChange={(e) => setEditForm((prev) => ({ ...prev, fee_violation: e.target.value }))} /></label>
                    <label className="house-field"><span>ค่าอื่นๆ</span><input type="number" step="0.01" value={editForm.fee_other} onChange={(e) => setEditForm((prev) => ({ ...prev, fee_other: e.target.value }))} /></label>
                    <label className="house-field house-field-span-3">
                      <span>หมายเหตุ</span>
                      <textarea rows="2" value={editForm.note} onChange={(e) => setEditForm((prev) => ({ ...prev, note: e.target.value }))} />
                    </label>
                  </div>
                </section>
              </div>
              <div className="house-md-foot">
                <button className="btn btn-g" type="button" onClick={() => { if (!savingEdit) { setShowEditModal(false); setEditingFee(null) } }}>ยกเลิก</button>
                <button className="btn btn-p" type="submit" disabled={savingEdit}>{savingEdit ? 'กำลังบันทึก...' : 'บันทึก'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showPaymentModal && payingFee && (
        <div className="house-mo">
          <div className="house-md house-md-home">
            <div className="house-md-head">
              <div>
                <div className="house-md-title">💳 บันทึกรับชำระ</div>
                <div className="house-md-sub">{payingFee.houses?.house_no || '-'} · {periodLabel(payingFee.period)} · ปี {toBE(payingFee.year)}</div>
              </div>
            </div>

            <form onSubmit={handleSubmitPayment}>
              <div className="house-md-body">
                <section className="house-sec">
                  <div className="house-sec-title">เลือกรายการที่ชำระ</div>
                  <div className="house-grid house-grid-2">
                    {feeItemDefs.map((item) => {
                      const amount = Number(payingFee[item.key] || 0)
                      return (
                        <label key={item.key} className="house-field" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <input
                            type="checkbox"
                            checked={paymentForm.selectedItems.includes(item.key)}
                            onChange={(e) => {
                              setPaymentForm((prev) => {
                                const has = prev.selectedItems.includes(item.key)
                                const nextSelected = e.target.checked
                                  ? [...prev.selectedItems, item.key]
                                  : prev.selectedItems.filter((key) => key !== item.key)
                                return has === e.target.checked ? prev : { ...prev, selectedItems: nextSelected }
                              })
                            }}
                            style={{ width: 16, height: 16 }}
                          />
                          <span style={{ flex: 1 }}>{item.label}</span>
                          <strong>{amount.toLocaleString('th-TH')}</strong>
                        </label>
                      )
                    })}
                  </div>
                </section>

                <section className="house-sec">
                  <div className="house-grid house-grid-3">
                    <label className="house-field">
                      <span>ยอดรับชำระรวม</span>
                      <input value={paymentSelectedAmount.toLocaleString('th-TH')} readOnly className="house-readonly" />
                    </label>
                    <label className="house-field">
                      <span>วิธีชำระ</span>
                      <select value={paymentForm.payment_method} onChange={(e) => setPaymentForm((prev) => ({ ...prev, payment_method: e.target.value }))}>
                        <option value="transfer">โอนเงิน</option>
                        <option value="cash">เงินสด</option>
                        <option value="qr">QR</option>
                      </select>
                    </label>
                    <label className="house-field">
                      <span>วันเวลา</span>
                      <input type="datetime-local" value={paymentForm.paid_at} onChange={(e) => setPaymentForm((prev) => ({ ...prev, paid_at: e.target.value }))} />
                    </label>
                    <label className="house-field house-field-span-3">
                      <span>หมายเหตุ</span>
                      <textarea rows="2" value={paymentForm.note} onChange={(e) => setPaymentForm((prev) => ({ ...prev, note: e.target.value }))} placeholder="รายละเอียดเพิ่มเติม" />
                    </label>
                  </div>
                </section>
              </div>
              <div className="house-md-foot">
                <button className="btn btn-g" type="button" onClick={() => { if (!savingPayment) { setShowPaymentModal(false); setPayingFee(null) } }}>ยกเลิก</button>
                <button className="btn btn-p" type="submit" disabled={savingPayment}>{savingPayment ? 'กำลังบันทึก...' : 'บันทึกรับชำระ'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showProcessModal && (
        <div className="house-mo">
          <div className="house-md" style={{ maxWidth: '560px' }}>
            <div className="house-md-head">
              <div>
                <div className="house-md-title">🧾 สร้างใบแจ้งหนี้ทุกหลัง</div>
                <div className="house-md-sub">คำนวณอัตโนมัติจาก setup ระบบ (แก้ไขค่าในขั้นตอนนี้ไม่ได้)</div>
              </div>
            </div>

            <form onSubmit={handleProcessAll}>
              <div className="house-md-body">
                <section className="house-sec">
                  <div className="house-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
                    <label className="house-field">
                      <span>ปี (พ.ศ.) *</span>
                      <input
                        type="number"
                        value={processForm.yearBE}
                        onChange={(e) => setProcessForm((prev) => ({ ...prev, yearBE: e.target.value }))}
                        min="2500"
                      />
                    </label>
                    <label className="house-field">
                      <span>รอบ *</span>
                      <select
                        value={processForm.period}
                        onChange={(e) => setProcessForm((prev) => ({ ...prev, period: e.target.value }))}
                      >
                        <option value="first_half">ครึ่งปีแรก (1/1 - 30/6)</option>
                        <option value="second_half">ครึ่งปีหลัง (1/7 - 31/12)</option>
                      </select>
                    </label>
                    <label className="house-field" style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <input
                        type="checkbox"
                        checked={processForm.overwritePending}
                        onChange={(e) => setProcessForm((prev) => ({ ...prev, overwritePending: e.target.checked }))}
                        style={{ width: 16, height: 16 }}
                      />
                      <span>ทับใบที่อยู่สถานะรอตรวจสอบ (pending)</span>
                    </label>
                  </div>
                </section>

                <section className="house-sec">
                  <div style={{ fontSize: 13, color: 'var(--mu)', lineHeight: 1.8 }}>
                    <div>ค่าส่วนกลาง = พื้นที่บ้าน x 6 เดือน x อัตรา setup ({Number(setup.fee_rate_per_sqw || 0).toLocaleString('th-TH')})</div>
                    <div>ค่าจอดรถ = ผลรวมค่าจอดรถต่อเดือนของบ้าน x 6</div>
                    <div>ค่าขยะ = ค่า setup ต่อรอบ ({Number(setup.waste_fee_per_period || 0).toLocaleString('th-TH')})</div>
                    <div>Process นี้จะทำทุกหลังในระบบ</div>
                  </div>
                </section>
              </div>
              <div className="house-md-foot">
                <button className="btn btn-g" type="button" onClick={() => setShowProcessModal(false)} disabled={processing}>ยกเลิก</button>
                <button className="btn btn-p" type="submit" disabled={processing}>{processing ? 'กำลังประมวลผล...' : 'Process สร้างทั้งหมด'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminFees
