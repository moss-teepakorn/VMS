import React, { useEffect, useMemo, useState } from 'react'
import Swal from 'sweetalert2'
import { useAuth } from '../../contexts/AuthContext'
import {
  approvePayment,
  createPayment,
  listFees,
  listPayments,
  rejectPayment,
  revokePaymentApproval,
} from '../../lib/fees'
import { getSetupConfig } from '../../lib/setup'
import villageLogo from '../../assets/village-logo.svg'

const REJECT_PREFIX = '[REJECT] '

function getRejectedReason(note) {
  const raw = String(note || '')
  if (!raw.startsWith(REJECT_PREFIX)) return ''
  const firstLine = raw.split('\n')[0]
  return firstLine.replace(REJECT_PREFIX, '').trim()
}

function getDisplayNote(note) {
  const raw = String(note || '')
  if (!raw.startsWith(REJECT_PREFIX)) return raw
  const lines = raw.split('\n')
  lines.shift()
  return lines.join('\n').trim()
}

function formatDateTime(value) {
  if (!value) return '-'
  return new Date(value).toLocaleString('th-TH', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatMoney(value) {
  return Number(value || 0).toLocaleString('th-TH')
}

function formatMethod(method) {
  if (method === 'transfer') return 'โอนเงิน'
  if (method === 'cash') return 'เงินสด'
  if (method === 'qr') return 'QR'
  return method || '-'
}

function formatPeriod(period) {
  if (period === 'first_half') return 'ครึ่งปีแรก'
  if (period === 'second_half') return 'ครึ่งปีหลัง'
  if (period === 'full_year') return 'เต็มปี'
  return period || '-'
}

function buildReceiptNo(payment) {
  const date = new Date(payment.verified_at || payment.paid_at || Date.now())
  const y = date.getFullYear() + 543
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `RC-${y}${m}${d}-${String(payment.id || '').slice(0, 6).toUpperCase()}`
}

export default function AdminPayments() {
  const { profile } = useAuth()
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [showReceiveModal, setShowReceiveModal] = useState(false)
  const [savingReceive, setSavingReceive] = useState(false)
  const [feeOptions, setFeeOptions] = useState([])
  const [receiveForm, setReceiveForm] = useState({
    fee_id: '',
    amount: '',
    payment_method: 'transfer',
    paid_at: new Date().toISOString().slice(0, 16),
    note: '',
  })
  const [setup, setSetup] = useState({
    villageName: 'The Greenfield',
    address: '',
    loginCircleLogoUrl: '',
    bankName: '',
    bankAccountName: '',
    bankAccountNo: '',
  })

  const summary = useMemo(() => {
    const totalAmount = payments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0)
    const approved = payments.filter((payment) => payment.verified_at)
    const rejected = payments.filter((payment) => !payment.verified_at && getRejectedReason(payment.note))
    const pending = payments.filter((payment) => !payment.verified_at && !getRejectedReason(payment.note))
    return {
      totalAmount,
      approvedAmount: approved.reduce((sum, payment) => sum + Number(payment.amount || 0), 0),
      pendingAmount: pending.reduce((sum, payment) => sum + Number(payment.amount || 0), 0),
      approvedCount: approved.length,
      pendingCount: pending.length,
      rejectedCount: rejected.length,
    }
  }, [payments])

  const filtered = useMemo(() => {
    const kw = search.trim().toLowerCase()
    if (!kw) return payments
    return payments.filter((payment) => (
      (payment.houses?.house_no || '').toLowerCase().includes(kw)
      || (payment.payment_method || '').toLowerCase().includes(kw)
      || (payment.note || '').toLowerCase().includes(kw)
      || (payment.verified_at ? 'อนุมัติแล้ว' : getRejectedReason(payment.note) ? 'ตีกลับ' : 'รอตรวจสอบ').includes(kw)
    ))
  }, [payments, search])

  const loadPayments = async () => {
    try {
      setLoading(true)
      setPayments(await listPayments())
    } catch (error) {
      console.error('Error loading payments:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    getSetupConfig().then(setSetup).catch(() => {})
    loadPayments()
  }, [])

  const openReceiveModal = async () => {
    try {
      const feeRows = await listFees({ status: 'all' })
      const candidates = feeRows.filter((fee) => fee.status !== 'paid')

      if (candidates.length === 0) {
        await Swal.fire({ icon: 'info', title: 'ไม่มีใบแจ้งหนี้ที่รับชำระได้' })
        return
      }

      const first = candidates[0]
      setFeeOptions(candidates)
      setReceiveForm({
        fee_id: first.id,
        amount: String(Number(first.total_amount || 0)),
        payment_method: 'transfer',
        paid_at: new Date().toISOString().slice(0, 16),
        note: '',
      })
      setShowReceiveModal(true)
    } catch (error) {
      await Swal.fire({ icon: 'error', title: 'โหลดใบแจ้งหนี้ไม่สำเร็จ', text: error.message })
    }
  }

  const handleChangeReceiveFee = (feeId) => {
    const nextFee = feeOptions.find((fee) => fee.id === feeId)
    setReceiveForm((prev) => ({
      ...prev,
      fee_id: feeId,
      amount: nextFee ? String(Number(nextFee.total_amount || 0)) : prev.amount,
    }))
  }

  const handleSubmitReceive = async (event) => {
    event.preventDefault()

    const targetFee = feeOptions.find((fee) => fee.id === receiveForm.fee_id)
    if (!targetFee) {
      await Swal.fire({ icon: 'warning', title: 'กรุณาเลือกใบแจ้งหนี้' })
      return
    }

    const amount = Number(receiveForm.amount || 0)
    if (!Number.isFinite(amount) || amount <= 0) {
      await Swal.fire({ icon: 'warning', title: 'ยอดรับชำระต้องมากกว่า 0' })
      return
    }

    try {
      setSavingReceive(true)
      await createPayment({
        fee_id: targetFee.id,
        house_id: targetFee.house_id,
        amount,
        payment_method: receiveForm.payment_method,
        paid_at: receiveForm.paid_at,
        note: receiveForm.note,
      })
      setShowReceiveModal(false)
      await loadPayments()
      await Swal.fire({ icon: 'success', title: 'บันทึกรับชำระแล้ว', timer: 1200, showConfirmButton: false })
    } catch (error) {
      await Swal.fire({ icon: 'error', title: 'รับชำระไม่สำเร็จ', text: error.message })
    } finally {
      setSavingReceive(false)
    }
  }

  const handleApprove = async (payment) => {
    const result = await Swal.fire({
      icon: 'question',
      title: 'อนุมัติการชำระ?',
      text: `บ้าน ${payment.houses?.house_no || '-'} จำนวน ฿${formatMoney(payment.amount)}`,
      showCancelButton: true,
      confirmButtonText: 'อนุมัติ',
      cancelButtonText: 'ยกเลิก',
      confirmButtonColor: '#0f766e',
    })
    if (!result.isConfirmed) return

    try {
      const approved = await approvePayment(payment.id, profile?.id)
      setPayments((prev) => prev.map((item) => (item.id === approved.id ? approved : item)))
      await Swal.fire({ icon: 'success', title: 'อนุมัติแล้ว', timer: 1200, showConfirmButton: false })
    } catch (error) {
      await Swal.fire({ icon: 'error', title: 'อนุมัติไม่สำเร็จ', text: error.message })
    }
  }

  const handleRevokeApproval = async (payment) => {
    const result = await Swal.fire({
      icon: 'warning',
      title: 'ยกเลิกการอนุมัติ?',
      text: `ใบเสร็จของบ้าน ${payment.houses?.house_no || '-'} จะถูกยกเลิก`,
      showCancelButton: true,
      confirmButtonText: 'ยกเลิกการอนุมัติ',
      cancelButtonText: 'ปิด',
      confirmButtonColor: '#e11d48',
    })
    if (!result.isConfirmed) return

    try {
      const reverted = await revokePaymentApproval(payment.id)
      setPayments((prev) => prev.map((item) => (item.id === reverted.id ? reverted : item)))
      await Swal.fire({ icon: 'success', title: 'ยกเลิกการอนุมัติแล้ว', timer: 1200, showConfirmButton: false })
    } catch (error) {
      await Swal.fire({ icon: 'error', title: 'ดำเนินการไม่สำเร็จ', text: error.message })
    }
  }

  const handleOpenSlip = (payment) => {
    if (!payment.slip_url) return
    window.open(payment.slip_url, '_blank', 'noopener,noreferrer')
  }

  const handleReject = async (payment) => {
    const { value: reason } = await Swal.fire({
      icon: 'warning',
      title: 'ตีกลับหลักฐานการชำระ',
      input: 'text',
      inputLabel: 'เหตุผลการตีกลับ',
      inputPlaceholder: 'เช่น ยอดไม่ตรงกับใบแจ้งหนี้',
      showCancelButton: true,
      confirmButtonText: 'ตีกลับ',
      cancelButtonText: 'ยกเลิก',
      confirmButtonColor: '#dc2626',
      inputValidator: (value) => (!String(value || '').trim() ? 'กรุณาระบุเหตุผล' : undefined),
    })

    if (!reason) return

    try {
      const rejected = await rejectPayment(payment.id, reason, profile?.id)
      setPayments((prev) => prev.map((item) => (item.id === rejected.id ? rejected : item)))
      await Swal.fire({ icon: 'success', title: 'ตีกลับแล้ว', timer: 1200, showConfirmButton: false })
    } catch (error) {
      await Swal.fire({ icon: 'error', title: 'ตีกลับไม่สำเร็จ', text: error.message })
    }
  }

  const handlePrintReceipt = (payment) => {
    if (!payment.verified_at) return

    const receiptNo = buildReceiptNo(payment)
    const issueDate = formatDateTime(payment.verified_at)
    const houseNo = payment.houses?.house_no || '-'
    const ownerName = payment.houses?.owner_name || '-'
    const invoiceLabel = payment.fees ? `${payment.fees.period} ${payment.fees.year}` : '-'
    const amount = formatMoney(payment.amount)
    const invoiceAmount = formatMoney(payment.fees?.total_amount)
    const approver = payment.verified_profile?.full_name || profile?.full_name || profile?.username || '-'
    const printWindow = window.open('', '_blank', 'width=960,height=1200')
    if (!printWindow) return

    printWindow.document.write(`
      <html>
        <head>
          <title>Receipt ${receiptNo}</title>
          <style>
            @page { size: A4; margin: 12mm; }
            body { font-family: Arial, sans-serif; color: #1f2937; }
            .sheet { width: 100%; max-width: 760px; margin: 0 auto; border: 1px solid #d1d5db; border-radius: 16px; padding: 28px; }
            .head { display: flex; justify-content: space-between; gap: 16px; align-items: flex-start; }
            .brand { display: flex; gap: 14px; align-items: center; }
            .brand img { width: 56px; height: 56px; border-radius: 50%; object-fit: cover; border: 1px solid #e5e7eb; }
            .title { font-size: 28px; font-weight: 700; margin: 0; }
            .sub { color: #6b7280; font-size: 13px; margin-top: 4px; }
            .receipt-box { text-align: right; }
            .receipt-no { font-size: 18px; font-weight: 700; color: #0f766e; }
            .section { margin-top: 20px; border-top: 1px solid #e5e7eb; padding-top: 16px; }
            .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px 18px; }
            .field { padding: 10px 12px; background: #f8fafc; border-radius: 10px; }
            .label { font-size: 12px; color: #6b7280; margin-bottom: 4px; }
            .value { font-size: 15px; font-weight: 600; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th, td { border-bottom: 1px solid #e5e7eb; padding: 12px 10px; text-align: left; font-size: 14px; }
            th:last-child, td:last-child { text-align: right; }
            .total { margin-top: 16px; display: flex; justify-content: flex-end; }
            .total-box { min-width: 240px; background: #ecfeff; border: 1px solid #99f6e4; border-radius: 12px; padding: 14px 16px; }
            .total-box strong { font-size: 22px; color: #115e59; }
            .foot { margin-top: 30px; display: flex; justify-content: space-between; gap: 16px; }
            .note { color: #6b7280; font-size: 12px; line-height: 1.6; }
            .sign { min-width: 220px; text-align: center; }
            .sign-line { margin-top: 56px; border-top: 1px solid #9ca3af; padding-top: 8px; font-size: 13px; }
          </style>
        </head>
        <body>
          <div class="sheet">
            <div class="head">
              <div class="brand">
                <img src="${setup.loginCircleLogoUrl || villageLogo}" alt="logo" />
                <div>
                  <h1 class="title">ใบเสร็จรับเงิน</h1>
                  <div>${setup.villageName || 'Village Management System'}</div>
                  <div class="sub">${setup.address || ''}</div>
                </div>
              </div>
              <div class="receipt-box">
                <div class="receipt-no">${receiptNo}</div>
                <div class="sub">วันที่อนุมัติ ${issueDate}</div>
              </div>
            </div>

            <div class="section">
              <div class="grid">
                <div class="field"><div class="label">บ้านเลขที่</div><div class="value">${houseNo}</div></div>
                <div class="field"><div class="label">ชื่อเจ้าของ/ผู้ชำระ</div><div class="value">${ownerName}</div></div>
                <div class="field"><div class="label">รอบใบแจ้งหนี้</div><div class="value">${invoiceLabel}</div></div>
                <div class="field"><div class="label">วิธีชำระ</div><div class="value">${formatMethod(payment.payment_method)}</div></div>
              </div>
            </div>

            <div class="section">
              <table>
                <thead>
                  <tr><th>รายการ</th><th>รายละเอียด</th><th>จำนวนเงิน</th></tr>
                </thead>
                <tbody>
                  <tr>
                    <td>ค่าส่วนกลาง</td>
                    <td>อ้างอิงใบแจ้งหนี้ ${invoiceLabel}</td>
                    <td>${invoiceAmount}</td>
                  </tr>
                  <tr>
                    <td>รับชำระจริง</td>
                    <td>${payment.note || '-'}</td>
                    <td>${amount}</td>
                  </tr>
                </tbody>
              </table>
              <div class="total">
                <div class="total-box">
                  <div class="label">ยอดรับชำระสุทธิ</div>
                  <strong>฿${amount}</strong>
                </div>
              </div>
            </div>

            <div class="foot">
              <div class="note">
                ออกใบเสร็จหลังจากตรวจสอบการชำระเรียบร้อยแล้ว<br />
                อนุมัติโดย ${approver}<br />
                ช่องทางชำระอ้างอิงบัญชี ${setup.bankAccountName || '-'} ${setup.bankAccountNo || ''}
              </div>
              <div class="sign">
                <div class="sign-line">ผู้ตรวจสอบ / ผู้ออกใบเสร็จ</div>
              </div>
            </div>
          </div>
          <script>window.onload = () => window.print();</script>
        </body>
      </html>
    `)
    printWindow.document.close()
  }

  const getStatusBadge = (payment) => {
    if (payment.verified_at) return { className: 'bd b-ok', label: 'อนุมัติแล้ว' }
    if (getRejectedReason(payment.note)) return { className: 'bd b-dg', label: 'ตีกลับ' }
    return { className: 'bd b-wn', label: 'รอตรวจสอบ' }
  }

  return (
    <div className="pane on houses-compact">
      <div className="ph houses-ph">
        <div className="ph-in">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div className="ph-ico">
              <img className="ph-ico-img" src={setup.loginCircleLogoUrl || villageLogo} alt="system-logo" />
            </div>
            <div>
              <div className="ph-h1">จ่ายค่าส่วนกลาง</div>
              <div className="ph-sub">ตรวจสอบการชำระ อนุมัติ และออกใบเสร็จ · {setup.villageName}</div>
            </div>
          </div>
        </div>
        <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <input
            type="text"
            className="houses-filter-input"
            placeholder="ค้นหา บ้าน / วิธีชำระ / หมายเหตุ / สถานะ"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ flex: '1 1 220px', minWidth: 0 }}
          />
          <button className="btn btn-a btn-sm" onClick={loadPayments} disabled={loading} style={{ height: '34px' }}>ค้นหา</button>
        </div>
      </div>

      <div className="stats">
        <div className="sc"><div className="sc-ico a">💵</div><div><div className="sc-v">฿{formatMoney(summary.totalAmount)}</div><div className="sc-l">ยอดชำระทั้งหมด</div></div></div>
        <div className="sc"><div className="sc-ico p">✅</div><div><div className="sc-v">{summary.approvedCount}</div><div className="sc-l">อนุมัติแล้ว ฿{formatMoney(summary.approvedAmount)}</div></div></div>
        <div className="sc"><div className="sc-ico d">⏳</div><div><div className="sc-v">{summary.pendingCount}</div><div className="sc-l">รอตรวจสอบ ฿{formatMoney(summary.pendingAmount)}</div></div></div>
        <div className="sc"><div className="sc-ico d">⛔</div><div><div className="sc-v">{summary.rejectedCount}</div><div className="sc-l">ตีกลับ</div></div></div>
      </div>

      <div className="card">
        <div className="ch houses-list-head">
          <div className="ct">รายการชำระเงินทั้งหมด {filtered.length} รายการ</div>
          <div className="houses-list-actions">
            <button className="btn btn-p btn-sm" onClick={openReceiveModal}>+ รับชำระ</button>
            <button className="btn btn-g btn-sm" onClick={loadPayments} disabled={loading}>🔄 รีเฟรช</button>
          </div>
        </div>
        <div className="cb houses-table-card-body">
          <div className="houses-table-wrap houses-desktop-only">
              <table className="tw houses-table" style={{ width: '100%', minWidth: '980px' }}>
                <thead>
                  <tr>
                    <th>บ้าน</th>
                    <th>งวด</th>
                    <th>จำนวนเงิน</th>
                    <th>วิธีชำระ</th>
                    <th>วันที่</th>
                    <th>สถานะ</th>
                    <th>ผู้ตรวจสอบ</th>
                    <th>หมายเหตุ</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan="9" style={{ textAlign: 'center', color: 'var(--mu)', padding: '20px' }}>กำลังโหลดข้อมูล...</td></tr>
                  ) : filtered.length === 0 ? (
                    <tr><td colSpan="9" style={{ textAlign: 'center', color: 'var(--mu)', padding: '20px' }}>ยังไม่มีรายการชำระเงิน</td></tr>
                  ) : (
                    filtered.map((payment) => {
                      const badge = getStatusBadge(payment)
                      return (
                      <tr key={payment.id}>
                        <td>{payment.houses?.house_no || '-'}</td>
                        <td>{payment.fees ? `${payment.fees.period} ${payment.fees.year}` : '-'}</td>
                        <td>฿{formatMoney(payment.amount)}</td>
                        <td>{formatMethod(payment.payment_method)}</td>
                        <td>{formatDateTime(payment.paid_at)}</td>
                        <td><span className={badge.className}>{badge.label}</span></td>
                        <td>{payment.verified_profile?.full_name || '-'}</td>
                        <td>
                          {getRejectedReason(payment.note) && (
                            <div style={{ color: 'var(--dg)', fontSize: 12, marginBottom: 4 }}>เหตุผล: {getRejectedReason(payment.note)}</div>
                          )}
                          {getDisplayNote(payment.note) || '-'}
                        </td>
                        <td>
                          <div className="td-acts">
                            {payment.slip_url && <button className="btn btn-xs btn-o" onClick={() => handleOpenSlip(payment)}>สลิป</button>}
                            {!payment.verified_at && <button className="btn btn-xs btn-ok" onClick={() => handleApprove(payment)}>อนุมัติ</button>}
                            {!payment.verified_at && <button className="btn btn-xs btn-dg" onClick={() => handleReject(payment)}>ตีกลับ</button>}
                            {payment.verified_at && <button className="btn btn-xs btn-a" onClick={() => handlePrintReceipt(payment)}>ใบเสร็จ</button>}
                            {payment.verified_at && <button className="btn btn-xs btn-dg" onClick={() => handleRevokeApproval(payment)}>ยกเลิก</button>}
                          </div>
                        </td>
                      </tr>
                    )})
                  )}
                </tbody>
              </table>
          </div>

          <div className="houses-mobile-only" style={{ gap: 10, padding: '4px 0' }}>
            {loading ? (
              <div className="mcard-empty">กำลังโหลดข้อมูล...</div>
            ) : filtered.length === 0 ? (
              <div className="mcard-empty">ยังไม่มีรายการชำระเงิน</div>
            ) : filtered.map((payment) => {
              const badge = getStatusBadge(payment)
              return (
              <div key={payment.id} className="houses-mcard">
                <div className="houses-mcard-top">
                  <div>
                    <div className="houses-mcard-no">{payment.houses?.house_no || '-'}</div>
                    <div className="mcard-sub">{payment.fees ? `${payment.fees.period} ${payment.fees.year}` : '-'}</div>
                  </div>
                  <span className={`${badge.className} houses-mcard-badge`}>{badge.label}</span>
                </div>
                <div className="mcard-meta" style={{ marginTop: 4 }}>
                  <span><span className="mcard-label">จำนวนเงิน</span> ฿{formatMoney(payment.amount)}</span>
                  <span><span className="mcard-label">วิธีชำระ</span> {formatMethod(payment.payment_method)}</span>
                  <span><span className="mcard-label">วันที่ชำระ</span> {formatDateTime(payment.paid_at)}</span>
                  <span><span className="mcard-label">ผู้ตรวจสอบ</span> {payment.verified_profile?.full_name || '-'}</span>
                  {getRejectedReason(payment.note) && <span><span className="mcard-label">เหตุผลตีกลับ</span> {getRejectedReason(payment.note)}</span>}
                  {getDisplayNote(payment.note) && <span><span className="mcard-label">หมายเหตุ</span> {getDisplayNote(payment.note)}</span>}
                </div>
                <div className="mcard-actions">
                  {payment.slip_url && <button className="btn btn-xs btn-o" onClick={() => handleOpenSlip(payment)}>สลิป</button>}
                  {!payment.verified_at && <button className="btn btn-xs btn-ok" onClick={() => handleApprove(payment)}>อนุมัติ</button>}
                  {!payment.verified_at && <button className="btn btn-xs btn-dg" onClick={() => handleReject(payment)}>ตีกลับ</button>}
                  {payment.verified_at && <button className="btn btn-xs btn-a" onClick={() => handlePrintReceipt(payment)}>ใบเสร็จ</button>}
                  {payment.verified_at && <button className="btn btn-xs btn-dg" onClick={() => handleRevokeApproval(payment)}>ยกเลิก</button>}
                </div>
              </div>
            )})}
          </div>
        </div>
      </div>

      {showReceiveModal && (
        <div className="house-mo">
          <div className="house-md house-md--md">
            <div className="house-md-head">
              <div>
                <div className="house-md-title">💳 รับชำระค่าส่วนกลาง</div>
                <div className="house-md-sub">บันทึกรายการรับชำระและส่งเข้ารอตรวจสอบ</div>
              </div>
            </div>
            <form onSubmit={handleSubmitReceive}>
              <div className="house-md-body">
                <section className="house-sec">
                  <div className="house-grid" style={{ gridTemplateColumns: '1fr' }}>
                    <label className="house-field">
                      <span>ใบแจ้งหนี้ *</span>
                      <select value={receiveForm.fee_id} onChange={(e) => handleChangeReceiveFee(e.target.value)}>
                        {feeOptions.map((fee) => (
                          <option key={fee.id} value={fee.id}>
                            {fee.houses?.house_no || '-'} · {formatPeriod(fee.period)} {fee.year} · ฿{Number(fee.total_amount || 0).toLocaleString('th-TH')}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="house-field">
                      <span>ยอดรับชำระ *</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={receiveForm.amount}
                        onChange={(e) => setReceiveForm((prev) => ({ ...prev, amount: e.target.value }))}
                      />
                    </label>
                    <label className="house-field">
                      <span>วิธีชำระ *</span>
                      <select
                        value={receiveForm.payment_method}
                        onChange={(e) => setReceiveForm((prev) => ({ ...prev, payment_method: e.target.value }))}
                      >
                        <option value="transfer">โอนเงิน</option>
                        <option value="cash">เงินสด</option>
                        <option value="qr">QR</option>
                      </select>
                    </label>
                    <label className="house-field">
                      <span>วันเวลา *</span>
                      <input
                        type="datetime-local"
                        value={receiveForm.paid_at}
                        onChange={(e) => setReceiveForm((prev) => ({ ...prev, paid_at: e.target.value }))}
                      />
                    </label>
                    <label className="house-field">
                      <span>หมายเหตุ</span>
                      <textarea
                        rows="3"
                        value={receiveForm.note}
                        onChange={(e) => setReceiveForm((prev) => ({ ...prev, note: e.target.value }))}
                        placeholder="รายละเอียดเพิ่มเติม"
                      />
                    </label>
                  </div>
                </section>
              </div>
              <div className="house-md-foot">
                <button className="btn btn-g" type="button" onClick={() => setShowReceiveModal(false)} disabled={savingReceive}>ยกเลิก</button>
                <button className="btn btn-p" type="submit" disabled={savingReceive}>{savingReceive ? 'กำลังบันทึก...' : 'บันทึกรับชำระ'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
