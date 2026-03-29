import React, { useEffect, useMemo, useState } from 'react'
import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'
import Swal from 'sweetalert2'
import { useAuth } from '../../contexts/AuthContext'
import {
  approvePayment,
  createPayment,
  listFees,
  listPayments,
  rejectPayment,
  uploadPaymentSlip,
} from '../../lib/fees'
import { getSetupConfig } from '../../lib/setup'
import villageLogo from '../../assets/village-logo.svg'

const REJECT_PREFIX = '[REJECT] '
const PAYMENT_META_PREFIX = '[PAYMENT_ITEMS_JSON]'

function getRejectedReason(note) {
  const raw = String(note || '')
  if (!raw.startsWith(REJECT_PREFIX)) return ''
  const firstLine = raw.split('\n')[0]
  return firstLine.replace(REJECT_PREFIX, '').trim()
}

function getDisplayNote(note) {
  const raw = String(note || '')
  const noMeta = raw.includes(PAYMENT_META_PREFIX)
    ? raw.slice(0, raw.indexOf(PAYMENT_META_PREFIX)).trim()
    : raw
  if (!noMeta.startsWith(REJECT_PREFIX)) return noMeta
  const lines = noMeta.split('\n')
  lines.shift()
  return lines.join('\n').trim()
}

function parsePaymentMeta(note) {
  const raw = String(note || '')
  const markerIndex = raw.indexOf(PAYMENT_META_PREFIX)
  if (markerIndex < 0) return null
  const jsonText = raw.slice(markerIndex + PAYMENT_META_PREFIX.length).trim()
  if (!jsonText) return null
  try {
    const parsed = JSON.parse(jsonText)
    if (!Array.isArray(parsed?.items)) return null
    return parsed
  } catch {
    return null
  }
}

function parseItemizedRowsFromNote(note) {
  const raw = String(note || '')
  if (!raw) return []
  const noMeta = raw.includes(PAYMENT_META_PREFIX)
    ? raw.slice(0, raw.indexOf(PAYMENT_META_PREFIX)).trim()
    : raw
  const match = noMeta.match(/ชำระรายการ:\s*([^|\n]+)/)
  if (!match?.[1]) return []

  return match[1]
    .split(',')
    .map((chunk) => String(chunk || '').trim())
    .filter(Boolean)
    .map((chunk) => {
      const amountMatch = chunk.match(/^(.*)\s฿?\s*([\d,]+(?:\.\d{1,2})?)$/)
      if (!amountMatch) return { label: chunk, paidAmount: 0 }
      const label = String(amountMatch[1] || '').trim()
      const paidAmount = Number(String(amountMatch[2] || '0').replace(/,/g, ''))
      return {
        label,
        paidAmount: Number.isFinite(paidAmount) ? paidAmount : 0,
      }
    })
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
  return Number(value || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function toBE(year) {
  const y = Number(year || 0)
  if (!y) return '-'
  return y > 2400 ? y : y + 543
}

function normalizeSoi(soi) {
  return String(soi || '').trim().toLowerCase()
}

function normalizeHouseNo(houseNo) {
  return String(houseNo || '').trim()
}

function compareHouseNo(a, b) {
  return normalizeHouseNo(a).localeCompare(normalizeHouseNo(b), 'th', { numeric: true, sensitivity: 'base' })
}

function openHtmlInWindow(html) {
  const popup = window.open('', '_blank', 'noopener,noreferrer,width=960,height=1200')
  if (!popup) return null
  popup.document.open()
  popup.document.write(html)
  popup.document.close()
  return popup
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

const feeItemDefs = [
  { key: 'fee_common', label: 'ค่าส่วนกลาง' },
  { key: 'fee_parking', label: 'ค่าจอดรถ' },
  { key: 'fee_waste', label: 'ค่าขยะ' },
  { key: 'fee_overdue_common', label: 'ยอดค่าส่วนกลางค้างเดิม' },
  { key: 'fee_overdue_fine', label: 'ยอดปรับค้างเดิม' },
  { key: 'fee_overdue_notice', label: 'ยอดทวงถามค้างเดิม' },
  { key: 'fee_fine', label: 'ค่าปรับงวดนี้' },
  { key: 'fee_notice', label: 'ค่าทวงถามงวดนี้' },
  { key: 'fee_violation', label: 'ค่าผิดระเบียบ' },
  { key: 'fee_other', label: 'ค่าอื่นๆ' },
]

function getFeeDueItems(fee) {
  return feeItemDefs
    .map((item) => ({ key: item.key, label: item.label, dueAmount: Number(fee?.[item.key] || 0) }))
    .filter((item) => item.dueAmount > 0)
}

function getPaymentItemRows(payment) {
  const parsedMeta = parsePaymentMeta(payment?.note)
  if (parsedMeta?.items?.length) {
    return parsedMeta.items.map((item) => ({
      key: item.key,
      label: item.label || '-',
      dueAmount: Number(item.dueAmount || 0),
      paidAmount: Number(item.paidAmount || 0),
    }))
  }

  const itemizedFromNote = parseItemizedRowsFromNote(payment?.note)
  if (itemizedFromNote.length > 0) {
    return itemizedFromNote.map((row, index) => {
      const matchedDef = feeItemDefs.find((item) => item.label === row.label)
      const dueAmount = matchedDef ? Number(payment?.fees?.[matchedDef.key] || 0) : Number(row.paidAmount || 0)
      return {
        key: matchedDef?.key || `legacy_${index + 1}`,
        label: row.label || '-',
        dueAmount,
        paidAmount: Number(row.paidAmount || 0),
      }
    })
  }

  const dueItems = getFeeDueItems(payment?.fees)
  if (dueItems.length === 0) {
    return [{ key: 'paid_total', label: 'ยอดชำระที่บันทึก', dueAmount: Number(payment?.fees?.total_amount || 0), paidAmount: Number(payment?.amount || 0) }]
  }

  return dueItems.map((item) => ({
    ...item,
    paidAmount: 0,
  }))
}

export default function AdminPayments() {
  const { profile } = useAuth()
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [yearFilter, setYearFilter] = useState('all')
  const [periodFilter, setPeriodFilter] = useState('all')
  const [showReceiveModal, setShowReceiveModal] = useState(false)
  const [savingReceive, setSavingReceive] = useState(false)
  const [uploadingSlip, setUploadingSlip] = useState(false)
  const [receiveSlipFile, setReceiveSlipFile] = useState(null)
  const [receiveSlipPreview, setReceiveSlipPreview] = useState('')
  const [approveTarget, setApproveTarget] = useState(null)
  const [approving, setApproving] = useState(false)
  const [showReceiptPrintActionModal, setShowReceiptPrintActionModal] = useState(false)
  const [runningReceiptPrintAction, setRunningReceiptPrintAction] = useState(false)
  const [receiptPrintTarget, setReceiptPrintTarget] = useState(null)
  const [feeOptions, setFeeOptions] = useState([])
  const [receiveForm, setReceiveForm] = useState({
    fee_id: '',
    amount: '',
    payment_method: 'transfer',
    paid_at: new Date().toISOString().slice(0, 16),
    selectedItems: [],
    itemAmounts: {},
    note: '',
  })
  const [setup, setSetup] = useState({
    villageName: 'The Greenfield',
    address: '',
    loginCircleLogoUrl: '',
    juristicSignatureUrl: '',
    bankName: '',
    bankAccountName: '',
    bankAccountNo: '',
  })

  const selectedReceiveFee = useMemo(
    () => feeOptions.find((fee) => fee.id === receiveForm.fee_id) || null,
    [feeOptions, receiveForm.fee_id],
  )

  const receivePayableItems = useMemo(() => {
    if (!selectedReceiveFee) return []
    return feeItemDefs
      .map((item) => ({ ...item, amount: Number(selectedReceiveFee[item.key] || 0) }))
      .filter((item) => item.amount > 0)
  }, [selectedReceiveFee])

  const receiveSelectedAmount = useMemo(() => (
    receiveForm.selectedItems.reduce((sum, key) => sum + Number(receiveForm.itemAmounts?.[key] || 0), 0)
  ), [receiveForm.selectedItems, receiveForm.itemAmounts])

  const filteredByYear = useMemo(() => {
    return payments.filter((payment) => {
      const feeYear = Number(payment.fees?.year || 0)
      const passYear = yearFilter === 'all' || String(feeYear) === String(yearFilter)
      return passYear
    })
  }, [payments, yearFilter])

  const filteredByYearPeriod = useMemo(() => {
    return filteredByYear.filter((payment) => {
      const feePeriod = String(payment.fees?.period || '')
      return periodFilter === 'all' || feePeriod === periodFilter
    })
  }, [filteredByYear, periodFilter])

  const summary = useMemo(() => {
    const totalAmount = filteredByYearPeriod.reduce((sum, payment) => sum + Number(payment.amount || 0), 0)
    const approved = filteredByYearPeriod.filter((payment) => payment.verified_at)
    const rejected = filteredByYearPeriod.filter((payment) => !payment.verified_at && getRejectedReason(payment.note))
    const pending = filteredByYearPeriod.filter((payment) => !payment.verified_at && !getRejectedReason(payment.note))
    return {
      totalAmount,
      approvedAmount: approved.reduce((sum, payment) => sum + Number(payment.amount || 0), 0),
      pendingAmount: pending.reduce((sum, payment) => sum + Number(payment.amount || 0), 0),
      approvedCount: approved.length,
      pendingCount: pending.length,
      rejectedCount: rejected.length,
    }
  }, [filteredByYearPeriod])

  const yearCards = useMemo(() => {
    const counts = new Map()
    for (const payment of payments) {
      const y = Number(payment.fees?.year || 0)
      if (!y) continue
      counts.set(y, Number(counts.get(y) || 0) + 1)
    }
    return [...counts.entries()]
      .sort((a, b) => b[0] - a[0])
      .map(([year, count]) => ({ value: String(year), label: String(toBE(year)), count }))
  }, [payments])

  const periodCards = useMemo(() => {
    const rows = filteredByYear
    return [
      { value: 'all', label: 'ทั้งหมด', count: rows.length },
      { value: 'first_half', label: 'ครึ่งปีแรก', count: rows.filter((p) => p.fees?.period === 'first_half').length },
      { value: 'second_half', label: 'ครึ่งปีหลัง', count: rows.filter((p) => p.fees?.period === 'second_half').length },
      { value: 'full_year', label: 'เต็มปี', count: rows.filter((p) => p.fees?.period === 'full_year').length },
    ]
  }, [filteredByYear])

  const filtered = useMemo(() => {
    const kw = search.trim().toLowerCase()
    const searched = !kw
      ? filteredByYearPeriod
      : filteredByYearPeriod.filter((payment) => (
      (payment.houses?.house_no || '').toLowerCase().includes(kw)
      || (payment.houses?.soi || '').toLowerCase().includes(kw)
      || (payment.payment_method || '').toLowerCase().includes(kw)
      || formatPeriod(payment.fees?.period || '').toLowerCase().includes(kw)
      || (payment.verified_at ? 'อนุมัติแล้ว' : getRejectedReason(payment.note) ? 'ตีกลับ' : 'รอตรวจสอบ').includes(kw)
    ))

    return [...searched].sort((a, b) => {
      const soiCmp = normalizeSoi(a.houses?.soi).localeCompare(normalizeSoi(b.houses?.soi), 'th', { numeric: true, sensitivity: 'base' })
      if (soiCmp !== 0) return soiCmp
      return compareHouseNo(a.houses?.house_no, b.houses?.house_no)
    })
  }, [filteredByYearPeriod, search])

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

  useEffect(() => () => {
    if (receiveSlipPreview) {
      URL.revokeObjectURL(receiveSlipPreview)
    }
  }, [receiveSlipPreview])

  const openReceiveModal = async () => {
    try {
      const feeRows = await listFees({ status: 'all' })
      const candidates = feeRows.filter((fee) => (
        fee.status !== 'paid'
        && fee.status !== 'cancelled'
        && Number(fee.total_amount || 0) > 0
      ))

      if (candidates.length === 0) {
        await Swal.fire({ icon: 'info', title: 'ไม่มีใบแจ้งหนี้ที่รับชำระได้' })
        return
      }

      const first = candidates[0]
      const payableItems = feeItemDefs
        .map((item) => ({ ...item, amount: Number(first[item.key] || 0) }))
        .filter((item) => item.amount > 0)
      const selectedItems = payableItems.map((item) => item.key)
      const itemAmounts = payableItems.reduce((acc, item) => {
        acc[item.key] = item.amount
        return acc
      }, {})

      setFeeOptions(candidates)
      setReceiveForm({
        fee_id: first.id,
        amount: String(Number(first.total_amount || 0)),
        payment_method: 'transfer',
        paid_at: new Date().toISOString().slice(0, 16),
        selectedItems,
        itemAmounts,
        note: '',
      })
      if (receiveSlipPreview) {
        URL.revokeObjectURL(receiveSlipPreview)
      }
      setReceiveSlipPreview('')
      setReceiveSlipFile(null)
      setShowReceiveModal(true)
    } catch (error) {
      await Swal.fire({ icon: 'error', title: 'โหลดใบแจ้งหนี้ไม่สำเร็จ', text: error.message })
    }
  }

  const handleChangeReceiveFee = (feeId) => {
    const nextFee = feeOptions.find((fee) => fee.id === feeId)
    const payableItems = feeItemDefs
      .map((item) => ({ ...item, amount: Number(nextFee?.[item.key] || 0) }))
      .filter((item) => item.amount > 0)
    const selectedItems = payableItems.map((item) => item.key)
    const itemAmounts = payableItems.reduce((acc, item) => {
      acc[item.key] = item.amount
      return acc
    }, {})

    setReceiveForm((prev) => ({
      ...prev,
      fee_id: feeId,
      amount: nextFee ? String(Number(nextFee.total_amount || 0)) : prev.amount,
      selectedItems,
      itemAmounts,
    }))
  }

  const toggleReceiveItem = (itemKey, checked) => {
    setReceiveForm((prev) => {
      const exists = prev.selectedItems.includes(itemKey)
      if (checked && !exists) {
        return { ...prev, selectedItems: [...prev.selectedItems, itemKey] }
      }
      if (!checked && exists) {
        return { ...prev, selectedItems: prev.selectedItems.filter((key) => key !== itemKey) }
      }
      return prev
    })
  }

  const handleChangeReceiveItemAmount = (itemKey, rawValue, maxAmount) => {
    let nextValue = Number(rawValue)
    if (!Number.isFinite(nextValue)) nextValue = 0
    if (nextValue < 0) nextValue = 0
    if (nextValue > maxAmount) nextValue = maxAmount

    setReceiveForm((prev) => ({
      ...prev,
      itemAmounts: {
        ...prev.itemAmounts,
        [itemKey]: nextValue,
      },
    }))
  }

  const selectAllReceiveItems = () => {
    setReceiveForm((prev) => ({
      ...prev,
      selectedItems: receivePayableItems.map((item) => item.key),
      itemAmounts: receivePayableItems.reduce((acc, item) => {
        acc[item.key] = Number(prev.itemAmounts?.[item.key] ?? item.amount)
        return acc
      }, {}),
    }))
  }

  const clearReceiveItems = () => {
    setReceiveForm((prev) => ({ ...prev, selectedItems: [] }))
  }

  const handleChangeReceiveSlip = (event) => {
    const file = event.target.files?.[0] || null
    if (!file) {
      if (receiveSlipPreview) URL.revokeObjectURL(receiveSlipPreview)
      setReceiveSlipPreview('')
      setReceiveSlipFile(null)
      return
    }

    if (!String(file.type || '').startsWith('image/')) {
      Swal.fire({ icon: 'warning', title: 'แนบได้เฉพาะไฟล์รูปภาพ' })
      event.target.value = ''
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      Swal.fire({ icon: 'warning', title: 'ไฟล์ใหญ่เกิน 5MB' })
      event.target.value = ''
      return
    }

    if (receiveSlipPreview) URL.revokeObjectURL(receiveSlipPreview)
    setReceiveSlipFile(file)
    setReceiveSlipPreview(URL.createObjectURL(file))
  }

  useEffect(() => {
    setReceiveForm((prev) => {
      const nextAmount = String(receiveSelectedAmount)
      if (prev.amount === nextAmount) return prev
      return { ...prev, amount: nextAmount }
    })
  }, [receiveSelectedAmount])

  const handleSubmitReceive = async (event) => {
    event.preventDefault()

    const targetFee = feeOptions.find((fee) => fee.id === receiveForm.fee_id)
    if (!targetFee) {
      await Swal.fire({ icon: 'warning', title: 'กรุณาเลือกใบแจ้งหนี้' })
      return
    }

    if (receiveForm.selectedItems.length === 0) {
      await Swal.fire({ icon: 'warning', title: 'กรุณาเลือกรายการที่รับชำระอย่างน้อย 1 รายการ' })
      return
    }

    const amount = Number(receiveSelectedAmount || 0)
    if (!Number.isFinite(amount) || amount <= 0) {
      await Swal.fire({ icon: 'warning', title: 'ยอดรับชำระต้องมากกว่า 0' })
      return
    }

    if (!receiveSlipFile) {
      await Swal.fire({ icon: 'warning', title: 'กรุณาแนบรูปหลักฐานการชำระ' })
      return
    }

    try {
      setSavingReceive(true)
      setUploadingSlip(true)
      const uploadedSlip = await uploadPaymentSlip(receiveSlipFile, { houseId: targetFee.house_id })
      const selectedItemsMeta = feeItemDefs
        .filter((item) => receiveForm.selectedItems.includes(item.key))
        .map((item) => ({
          key: item.key,
          label: item.label,
          dueAmount: Number(targetFee[item.key] || 0),
          paidAmount: Number(receiveForm.itemAmounts?.[item.key] || 0),
        }))
      const selectedLabels = selectedItemsMeta
        .map((item) => `${item.label} ฿${Number(item.paidAmount || 0).toLocaleString('th-TH')}`)
      const noteParts = []
      if (selectedLabels.length > 0) noteParts.push(`ชำระรายการ: ${selectedLabels.join(', ')}`)
      if (receiveForm.note.trim()) noteParts.push(receiveForm.note.trim())
      noteParts.push(`${PAYMENT_META_PREFIX}${JSON.stringify({ items: selectedItemsMeta })}`)

      await createPayment({
        fee_id: targetFee.id,
        house_id: targetFee.house_id,
        amount,
        payment_method: receiveForm.payment_method,
        slip_url: uploadedSlip?.url || '',
        paid_at: receiveForm.paid_at,
        note: noteParts.join(' | '),
        setFeeStatusFromAmount: true,
      })
      if (receiveSlipPreview) {
        URL.revokeObjectURL(receiveSlipPreview)
      }
      setReceiveSlipPreview('')
      setReceiveSlipFile(null)
      setShowReceiveModal(false)
      await loadPayments()
      await Swal.fire({ icon: 'success', title: 'บันทึกรับชำระแล้ว', timer: 1200, showConfirmButton: false })
    } catch (error) {
      await Swal.fire({ icon: 'error', title: 'รับชำระไม่สำเร็จ', text: error.message })
    } finally {
      setUploadingSlip(false)
      setSavingReceive(false)
    }
  }

  const openApproveModal = (payment) => {
    setApproveTarget(payment)
  }

  const handleApproveConfirmed = async () => {
    if (!approveTarget) return
    try {
      setApproving(true)
      const approved = await approvePayment(approveTarget.id, profile?.id)
      setPayments((prev) => prev.map((item) => (item.id === approved.id ? approved : item)))
      setApproveTarget(null)
      await Swal.fire({ icon: 'success', title: 'อนุมัติแล้ว', timer: 1200, showConfirmButton: false })
    } catch (error) {
      await Swal.fire({ icon: 'error', title: 'อนุมัติไม่สำเร็จ', text: error.message })
    } finally {
      setApproving(false)
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
      cancelButtonText: 'ปิด',
      confirmButtonColor: '#dc2626',
      inputValidator: (value) => (!String(value || '').trim() ? 'กรุณาระบุเหตุผล' : undefined),
    })

    if (!reason) return false

    try {
      const rejected = await rejectPayment(payment.id, reason, profile?.id)
      setPayments((prev) => prev.map((item) => (item.id === rejected.id ? rejected : item)))
      await Swal.fire({ icon: 'success', title: 'ตีกลับแล้ว', timer: 1200, showConfirmButton: false })
      return true
    } catch (error) {
      await Swal.fire({ icon: 'error', title: 'ตีกลับไม่สำเร็จ', text: error.message })
      return false
    }
  }

  const buildReceiptHtml = (payment, { autoPrint = false } = {}) => {
    if (!payment?.verified_at) return ''

    const receiptNo = buildReceiptNo(payment)
    const issueDate = formatDateTime(payment.verified_at)
    const houseNo = payment.houses?.house_no || '-'
    const ownerName = payment.houses?.owner_name || '-'
    const invoiceLabel = payment.fees ? `${formatPeriod(payment.fees.period)} ปี ${Number(payment.fees.year || 0) + 543}` : '-'
    const invoiceNo = payment.fees ? `INV-${String(payment.fees.year || '').slice(-2)}-${String(payment.fees.id || '').slice(0, 8).toUpperCase()}` : '-'
    const amount = Number(payment.amount || 0)
    const approver = payment.verified_profile?.full_name || profile?.full_name || profile?.username || '-'
    const paymentDate = formatDateTime(payment.paid_at)
    const displayNote = getDisplayNote(payment.note)
    const itemRows = getPaymentItemRows(payment)
    const totalPaid = itemRows.reduce((sum, row) => sum + Number(row.paidAmount || 0), 0) || amount
    const signatureSource = setup.juristicSignatureUrl || ''
    const renderTableRows = () => itemRows.map((row, index) => (`
      <tr>
        <td class="c">${index + 1}</td>
        <td>${row.label}</td>
        <td class="r">${Number(row.dueAmount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
        <td class="r">${Number(row.paidAmount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
      </tr>
    `)).join('')

    const renderSheet = (copyLabel) => (`
      <div class="sheet">
        <div class="head">
          <div class="brand">
            <img src="${setup.loginCircleLogoUrl || villageLogo}" alt="logo" />
            <div>
              <div class="doc">ใบเสร็จรับเงินค่าส่วนกลาง</div>
              <div class="village">${setup.villageName || 'Village Management System'}</div>
              <div class="sub">${setup.address || '-'}</div>
              <div class="sub">อ้างอิงใบแจ้งหนี้ ${invoiceNo}</div>
            </div>
          </div>
          <div class="doc-meta">
            <div><span>เลขที่ใบเสร็จ:</span> <strong>${receiptNo}</strong></div>
            <div><span>วันที่รับชำระ:</span> <strong>${paymentDate}</strong></div>
            <div><span>วันที่อนุมัติ:</span> <strong>${issueDate}</strong></div>
            <div class="copy-mark-row"><div class="copy-mark">${copyLabel}</div></div>
          </div>
        </div>

        <section class="box">
          <div class="grid">
            <div><span>บ้านเลขที่</span><strong>${houseNo}</strong></div>
            <div><span>ชื่อเจ้าของบ้าน</span><strong>${ownerName}</strong></div>
            <div><span>รอบใบแจ้งหนี้</span><strong>${invoiceLabel}</strong></div>
            <div><span>วิธีชำระ</span><strong>${formatMethod(payment.payment_method)}</strong></div>
          </div>
        </section>

        <section class="box">
          <table>
            <thead>
              <tr>
                <th class="c" style="width:56px;">ลำดับ</th>
                <th>รายการ</th>
                <th class="r" style="width:170px;">ยอดที่ต้องชำระ (บาท)</th>
                <th class="r" style="width:170px;">ยอดชำระจริง (บาท)</th>
              </tr>
            </thead>
            <tbody>
              ${renderTableRows()}
            </tbody>
          </table>
          <div class="note-box">${displayNote || `ยอดชำระรวม ${totalPaid.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} บาท`}</div>
        </section>

        <section class="foot">
          <div class="note">
            ออกใบเสร็จหลังจากตรวจสอบการชำระเรียบร้อยแล้ว<br />
            อนุมัติโดย ${approver}<br />
            บัญชีอ้างอิง ${setup.bankAccountName || '-'} ${setup.bankAccountNo || ''}
          </div>
          <div class="sign-wrap">
            ${signatureSource ? `<img src="${signatureSource}" alt="juristic-signature" class="sign-img" />` : ''}
            <div class="sign-line"></div>
            <div>ผู้ตรวจสอบ / ผู้ออกใบเสร็จ</div>
          </div>
        </section>
      </div>
    `)

    return `
      <html>
        <head>
          <title>ใบเสร็จรับเงิน ${receiptNo}</title>
          <link rel="preconnect" href="https://fonts.googleapis.com">
          <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
          <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;500;700&display=swap" rel="stylesheet">
          <style>
            @page { size: A4; margin: 0; }
            * { box-sizing: border-box; }
            html, body { font-family: 'Sarabun', 'TH Sarabun New', Tahoma, sans-serif; margin: 0; padding: 0; color: #111827; background: #fff; }
            .sheet { width: 100%; min-height: 100vh; padding: 24px 28px; display: flex; flex-direction: column; gap: 8px; }
            .sheet + .sheet { page-break-before: always; }
            .head {
              display: flex;
              justify-content: space-between;
              gap: 12px;
              border: 1px solid #cbd5e1;
              border-radius: 4px;
              padding: 10px 12px;
              background: #ffffff;
            }
            .brand { display: flex; align-items: flex-start; gap: 10px; flex: 1; min-width: 0; }
            .brand img {
              width: 48px;
              height: 48px;
              border-radius: 6px;
              object-fit: cover;
              border: 1px solid #cbd5e1;
            }
            .doc { font-size: 16px; font-weight: 700; line-height: 1.3; }
            .village { font-size: 11px; margin-top: 3px; font-weight: 600; }
            .sub { font-size: 9px; color: #6b7280; margin-top: 2px; }
            .doc-meta { font-size: 10px; min-width: 200px; display: flex; flex-direction: column; gap: 2px; word-break: break-word; }
            .doc-meta span { color: #6b7280; font-weight: 500; }
            .copy-mark-row {
              display: flex;
              justify-content: flex-end;
              margin-top: 10px;
            }
            .copy-mark {
              border: none;
              border-radius: 4px;
              padding: 3px 10px;
              text-align: center;
              font-size: 14px;
              font-weight: 700;
              line-height: 1.3;
              color: #0c4a6e;
              background: transparent;
            }
            .box { border: 1px solid #cbd5e1; border-radius: 4px; padding: 10px 12px; }
            .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 10px; word-break: break-word; }
            .grid > div { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
            .grid span { font-size: 9px; color: #6b7280; font-weight: 500; }
            .grid strong { font-size: 11px; font-weight: 600; }
            table { width: 100%; border-collapse: collapse; table-layout: auto; }
            th, td { border: 1px solid #cbd5e1; padding: 6px 8px; font-size: 10px; word-wrap: break-word; overflow-wrap: break-word; }
            th { background: #f1f5f9; text-align: left; font-weight: 600; }
            .c { text-align: center; }
            .r { text-align: right; }
            .note-box {
              border-top: 1px dashed #d1d5db;
              padding-top: 4px;
              font-size: 10px;
              color: #4b5563;
              margin-top: 4px;
            }
            .foot {
              margin-top: 8px;
              border: 1px solid #cbd5e1;
              border-radius: 4px;
              padding: 10px 12px;
              display: flex;
              align-items: flex-end;
              justify-content: space-between;
              gap: 12px;
              background: #f9fafb;
            }
            .note { font-size: 9px; color: #64748b; line-height: 1.4; }
            .sign-wrap { min-width: 180px; text-align: center; font-size: 9px; color: #64748b; }
            .sign-img { max-width: 160px; max-height: 52px; width: auto; height: auto; display: block; margin: 0 auto 6px; object-fit: contain; }
            .sign-line { border-top: 1px solid #cbd5e1; margin: 36px 0 4px; }
            @media print {
              html, body { background: #fff; }
            }
          </style>
        </head>
        <body>
          ${renderSheet('ต้นฉบับ')}
          ${renderSheet('สำเนา')}
            ${autoPrint ? '<script>window.onload = () => window.print();</script>' : ''}
        </body>
      </html>
    `
  }

  const handlePrintReceipt = (payment) => {
    if (!payment?.verified_at) return
    setReceiptPrintTarget(payment)
    setShowReceiptPrintActionModal(true)
  }

  const runReceiptPrintAction = async (mode) => {
    if (!receiptPrintTarget) return
    setRunningReceiptPrintAction(true)

    try {
      const target = receiptPrintTarget
      const fileLabel = `receipt-${buildReceiptNo(target)}`
      if (mode === 'paper') {
        const html = buildReceiptHtml(target, { autoPrint: true })
        const popup = openHtmlInWindow(html)
        if (!popup) {
          await Swal.fire({ icon: 'warning', title: 'ไม่สามารถเปิดหน้าต่างพิมพ์ได้', text: 'กรุณาอนุญาต popup ของเบราว์เซอร์' })
        }
        setShowReceiptPrintActionModal(false)
        return
      }

      const html = buildReceiptHtml(target, { autoPrint: false })
      const iframe = document.createElement('iframe')
      iframe.style.position = 'fixed'
      iframe.style.right = '-9999px'
      iframe.style.bottom = '-9999px'
      iframe.style.width = '0'
      iframe.style.height = '0'
      iframe.style.border = '0'
      document.body.appendChild(iframe)

      const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document
      if (!iframeDoc) {
        document.body.removeChild(iframe)
        throw new Error('ไม่สามารถเตรียมเอกสารสำหรับบันทึกไฟล์ได้')
      }

      iframeDoc.open()
      iframeDoc.write(html)
      iframeDoc.close()

      await new Promise((resolve) => {
        const targetWindow = iframe.contentWindow
        if (!targetWindow) {
          resolve()
          return
        }
        targetWindow.onload = () => resolve()
        setTimeout(resolve, 400)
      })

      const sheets = Array.from(iframeDoc.querySelectorAll('.sheet'))
      if (sheets.length === 0) {
        document.body.removeChild(iframe)
        throw new Error('ไม่พบหน้าสำหรับพิมพ์ใบเสร็จ')
      }

      if (mode === 'image') {
        for (let i = 0; i < sheets.length; i += 1) {
          const canvas = await html2canvas(sheets[i], {
            scale: 2,
            useCORS: true,
            backgroundColor: '#ffffff',
            width: 794,
            height: 1122,
          })
          const link = document.createElement('a')
          link.href = canvas.toDataURL('image/png')
          link.download = `${fileLabel}-${i + 1}.png`
          link.click()
        }
      } else {
        const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
        const A4W = pdf.internal.pageSize.getWidth()
        const A4H = pdf.internal.pageSize.getHeight()
        for (let i = 0; i < sheets.length; i += 1) {
          const canvas = await html2canvas(sheets[i], {
            scale: 2,
            useCORS: true,
            backgroundColor: '#ffffff',
            width: 794,
            height: 1122,
          })
          const imgData = canvas.toDataURL('image/jpeg', 0.95)
          if (i > 0) pdf.addPage()
          pdf.addImage(imgData, 'JPEG', 0, 0, A4W, A4H, undefined, 'FAST')
        }
        pdf.save(`${fileLabel}.pdf`)
      }

      document.body.removeChild(iframe)
      setShowReceiptPrintActionModal(false)
    } catch (error) {
      await Swal.fire({ icon: 'error', title: 'พิมพ์ใบเสร็จไม่สำเร็จ', text: error.message })
    } finally {
      setRunningReceiptPrintAction(false)
    }
  }

  const handleRejectFromApproveModal = async () => {
    if (!approveTarget) return
    const success = await handleReject(approveTarget)
    if (success) {
      setApproveTarget(null)
    }
  }

  const getStatusBadge = (payment) => {
    if (payment.verified_at) return { className: 'bd b-ok', label: 'อนุมัติแล้ว' }
    if (getRejectedReason(payment.note)) return { className: 'bd b-dg', label: 'ตีกลับ' }
    return { className: 'bd b-wn', label: 'รอตรวจสอบ' }
  }

  return (
    <div className="pane on houses-compact payments-compact">
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
            placeholder="ค้นหา ซอย / บ้าน / วิธีชำระ / สถานะ"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ flex: '1 1 220px', minWidth: 0 }}
          />
          <button className="btn btn-a btn-sm" onClick={loadPayments} disabled={loading} style={{ height: '34px' }}>ค้นหา</button>
        </div>
        <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: '#e2e8f0' }}>ปี:</span>
          <button
            type="button"
            onClick={() => setYearFilter('all')}
            style={{ border: yearFilter === 'all' ? '2px solid #0c4a6e' : '1px solid rgba(255,255,255,.4)', background: yearFilter === 'all' ? '#eff6ff' : 'rgba(255,255,255,.95)', color: '#0f172a', borderRadius: 8, padding: '7px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
          >
            ทั้งหมด
          </button>
          {yearCards.map((card) => (
            <button
              key={card.value}
              type="button"
              onClick={() => setYearFilter(card.value)}
              style={{ border: yearFilter === card.value ? '2px solid #0c4a6e' : '1px solid rgba(255,255,255,.4)', background: yearFilter === card.value ? '#eff6ff' : 'rgba(255,255,255,.95)', color: '#0f172a', borderRadius: 8, padding: '7px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
            >
              {card.label}
            </button>
          ))}
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
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginLeft: 'auto' }}>
              {periodCards.map((item) => {
                const active = periodFilter === item.value
                return (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => setPeriodFilter(item.value)}
                    style={{
                      border: active ? '1px solid #0c4a6e' : '1px solid var(--bo)',
                      background: active ? '#eff6ff' : '#fff',
                      color: active ? '#0c4a6e' : '#334155',
                      borderRadius: 999,
                      padding: '6px 10px',
                      minHeight: 34,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      cursor: 'pointer',
                      fontSize: 12,
                      fontWeight: 600,
                    }}
                  >
                    <span>{item.label}</span>
                    <span style={{ minWidth: 20, height: 20, borderRadius: 999, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: active ? '#0c4a6e' : '#e2e8f0', color: active ? '#fff' : '#475569', fontSize: 11, padding: '0 6px' }}>
                      {item.count}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
        <div className="cb houses-table-card-body">
            <div className="houses-table-wrap houses-desktop-only payments-main-wrap">
              <table className="tw houses-table" style={{ width: '100%', tableLayout: 'fixed' }}>
                <thead>
                  <tr>
                    <th style={{ width: '9%' }}>ซอย</th>
                    <th style={{ width: '9%' }}>บ้าน</th>
                    <th style={{ width: '13%' }}>งวด</th>
                    <th style={{ width: '12%' }}>จำนวนเงิน</th>
                    <th style={{ width: '10%' }}>วิธีชำระ</th>
                    <th style={{ width: '12%' }}>วันที่</th>
                    <th style={{ width: '11%' }}>สถานะ</th>
                    <th style={{ width: '11%' }}>ผู้ตรวจสอบ</th>
                    <th style={{ width: '12%' }}></th>
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
                        <td style={{ whiteSpace: 'nowrap' }}>{payment.houses?.soi || '-'}</td>
                        <td style={{ whiteSpace: 'nowrap' }}>{payment.houses?.house_no || '-'}</td>
                        <td style={{ whiteSpace: 'nowrap' }}>{payment.fees ? `${formatPeriod(payment.fees.period)} ${toBE(payment.fees.year)}` : '-'}</td>
                        <td style={{ whiteSpace: 'nowrap' }}>{formatMoney(payment.amount)}</td>
                        <td style={{ whiteSpace: 'nowrap' }}>{formatMethod(payment.payment_method)}</td>
                        <td style={{ whiteSpace: 'nowrap' }}>{formatDateTime(payment.paid_at)}</td>
                        <td><span className={badge.className}>{badge.label}</span></td>
                        <td style={{ whiteSpace: 'nowrap' }}>{payment.verified_profile?.full_name || '-'}</td>
                        <td>
                          <div className="td-acts payments-row-acts">
                            {payment.slip_url && <button className="btn btn-xs btn-o" onClick={() => handleOpenSlip(payment)}>สลิป</button>}
                            {!payment.verified_at && <button className="btn btn-xs btn-ok" onClick={() => openApproveModal(payment)}>อนุมัติ</button>}
                            {!payment.verified_at && <button className="btn btn-xs btn-dg" onClick={() => handleReject(payment)}>ตีกลับ</button>}
                            {payment.verified_at && <button className="btn btn-xs btn-a" onClick={() => handlePrintReceipt(payment)}>ใบเสร็จ</button>}
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
                    <div className="mcard-sub">ซอย {payment.houses?.soi || '-'} · {payment.fees ? `${formatPeriod(payment.fees.period)} ${toBE(payment.fees.year)}` : '-'}</div>
                  </div>
                  <span className={`${badge.className} houses-mcard-badge`}>{badge.label}</span>
                </div>
                <div className="mcard-meta" style={{ marginTop: 4 }}>
                  <span><span className="mcard-label">จำนวนเงิน</span> {formatMoney(payment.amount)}</span>
                  <span><span className="mcard-label">วิธีชำระ</span> {formatMethod(payment.payment_method)}</span>
                  <span><span className="mcard-label">วันที่ชำระ</span> {formatDateTime(payment.paid_at)}</span>
                  <span><span className="mcard-label">ผู้ตรวจสอบ</span> {payment.verified_profile?.full_name || '-'}</span>
                  {getRejectedReason(payment.note) && <span><span className="mcard-label">เหตุผลตีกลับ</span> {getRejectedReason(payment.note)}</span>}
                </div>
                <div className="mcard-actions">
                  {payment.slip_url && <button className="btn btn-xs btn-o" onClick={() => handleOpenSlip(payment)}>สลิป</button>}
                  {!payment.verified_at && <button className="btn btn-xs btn-ok" onClick={() => openApproveModal(payment)}>อนุมัติ</button>}
                  {!payment.verified_at && <button className="btn btn-xs btn-dg" onClick={() => handleReject(payment)}>ตีกลับ</button>}
                  {payment.verified_at && <button className="btn btn-xs btn-a" onClick={() => handlePrintReceipt(payment)}>ใบเสร็จ</button>}
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
                            {fee.houses?.house_no || '-'} · {formatPeriod(fee.period)} {fee.year} · ยอดรวม ฿{Number(fee.total_amount || 0).toLocaleString('th-TH')}
                          </option>
                        ))}
                      </select>
                    </label>
                    <div className="house-field" style={{ gap: 10 }}>
                      <span>เลือกรายการรับชำระ</span>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <button type="button" className="btn btn-xs btn-a" onClick={selectAllReceiveItems} style={{ padding: '3px 8px', fontSize: 10 }}>เลือกทั้งหมด</button>
                        <button type="button" className="btn btn-xs btn-g" onClick={clearReceiveItems} style={{ padding: '3px 8px', fontSize: 10 }}>ล้างการเลือก</button>
                      </div>
                      <div className="houses-table-wrap payments-receive-wrap" style={{ maxHeight: '280px', overflow: 'auto' }}>
                        <table className="tw receive-items-table" style={{ width: '100%', tableLayout: 'fixed' }}>
                          <thead>
                            <tr>
                              <th style={{ width: '40px', textAlign: 'center' }}>เลือก</th>
                              <th>รายการ</th>
                              <th style={{ width: '180px' }}>ยอดที่ต้องชำระ</th>
                              <th style={{ width: '180px' }}>ยอดชำระจริง</th>
                            </tr>
                          </thead>
                          <tbody>
                            {receivePayableItems.length === 0 ? (
                              <tr><td colSpan="4" style={{ textAlign: 'center', color: 'var(--mu)', padding: '14px' }}>ไม่มีรายการที่มียอดเรียกเก็บ</td></tr>
                            ) : receivePayableItems.map((item) => {
                              const checked = receiveForm.selectedItems.includes(item.key)
                              return (
                                <tr key={item.key}>
                                  <td style={{ textAlign: 'center' }}>
                                    <input
                                      type="checkbox"
                                      checked={checked}
                                      onChange={(e) => toggleReceiveItem(item.key, e.target.checked)}
                                    />
                                  </td>
                                  <td>{item.label}</td>
                                  <td>฿{item.amount.toLocaleString('th-TH')}</td>
                                  <td>
                                    <input
                                      type="number"
                                      min="0"
                                      max={item.amount}
                                      step="0.01"
                                      value={receiveForm.itemAmounts?.[item.key] ?? item.amount}
                                      disabled={!checked}
                                      onChange={(e) => handleChangeReceiveItemAmount(item.key, e.target.value, item.amount)}
                                      style={{ width: '100%' }}
                                    />
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', color: 'var(--mu)', fontSize: 13 }}>
                        <span>ยอดใบแจ้งหนี้: ฿{Number(selectedReceiveFee?.total_amount || 0).toLocaleString('th-TH')}</span>
                        <span style={{ fontWeight: 700, color: 'var(--tx)' }}>ยอดรับชำระรวม: ฿{Number(receiveSelectedAmount || 0).toLocaleString('th-TH')}</span>
                      </div>
                    </div>
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
                      <span>แนบหลักฐานการชำระ (รูปภาพ) *</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleChangeReceiveSlip}
                      />
                      <div style={{ fontSize: 12, color: 'var(--mu)' }}>รองรับไฟล์รูปภาพไม่เกิน 5MB</div>
                      {receiveSlipPreview && (
                        <img
                          src={receiveSlipPreview}
                          alt="receive-slip-preview"
                          style={{ width: '100%', maxWidth: '300px', borderRadius: 8, border: '1px solid var(--bo)', marginTop: 6 }}
                        />
                      )}
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
                <button
                  className="btn btn-g"
                  type="button"
                  onClick={() => {
                    if (receiveSlipPreview) URL.revokeObjectURL(receiveSlipPreview)
                    setReceiveSlipPreview('')
                    setReceiveSlipFile(null)
                    setShowReceiveModal(false)
                  }}
                  disabled={savingReceive || uploadingSlip}
                >
                  ปิด
                </button>
                <button className="btn btn-p" type="submit" disabled={savingReceive || uploadingSlip}>
                  {savingReceive || uploadingSlip ? 'กำลังบันทึก...' : 'บันทึกรับชำระ'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showReceiptPrintActionModal && receiptPrintTarget && (
        <div className="house-mo">
          <div className="house-md house-md--xs">
            <div className="house-md-head">
              <div>
                <div className="house-md-title">🖨 ตัวเลือกการพิมพ์</div>
                <div className="house-md-sub">
                  ใบเสร็จ {receiptPrintTarget.houses?.house_no || '-'} · {formatPeriod(receiptPrintTarget.fees?.period)} ปี {toBE(receiptPrintTarget.fees?.year)}
                </div>
              </div>
            </div>
            <div className="house-md-body" style={{ display: 'grid', gap: 10 }}>
              <button
                className="btn btn-p"
                type="button"
                onClick={() => runReceiptPrintAction('paper')}
                disabled={runningReceiptPrintAction}
                style={{ justifyContent: 'space-between', padding: '12px 14px', fontFamily: 'inherit', letterSpacing: 0, fontStretch: 'normal' }}
              >
                <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', lineHeight: 1.25 }}>
                  <span style={{ fontSize: 15, fontWeight: 700 }}>พิมพ์เอกสาร</span>
                  <span style={{ fontSize: 12, fontWeight: 500, opacity: 0.88 }}>เปิดหน้าพิมพ์สำหรับใบเสร็จ</span>
                </span>
                <span style={{ fontSize: 12, fontWeight: 700 }}>{runningReceiptPrintAction ? 'กำลังดำเนินการ...' : 'Paper'}</span>
              </button>

              <button
                className="btn btn-a"
                type="button"
                onClick={() => runReceiptPrintAction('pdf')}
                disabled={runningReceiptPrintAction}
                style={{ justifyContent: 'space-between', padding: '12px 14px', fontFamily: 'inherit', letterSpacing: 0, fontStretch: 'normal' }}
              >
                <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', lineHeight: 1.25 }}>
                  <span style={{ fontSize: 15, fontWeight: 700 }}>Save เป็น PDF</span>
                  <span style={{ fontSize: 12, fontWeight: 500, opacity: 0.88 }}>ดาวน์โหลดไฟล์ PDF ลงเครื่องทันที</span>
                </span>
                <span style={{ fontSize: 12, fontWeight: 700 }}>{runningReceiptPrintAction ? 'กำลังดำเนินการ...' : 'PDF'}</span>
              </button>

              <button
                className="btn btn-g"
                type="button"
                onClick={() => runReceiptPrintAction('image')}
                disabled={runningReceiptPrintAction}
                style={{ justifyContent: 'space-between', padding: '12px 14px', fontFamily: 'inherit', letterSpacing: 0, fontStretch: 'normal' }}
              >
                <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', lineHeight: 1.25 }}>
                  <span style={{ fontSize: 15, fontWeight: 700 }}>Save เป็น Image</span>
                  <span style={{ fontSize: 12, fontWeight: 500, opacity: 0.88 }}>บันทึกเป็นรูปภาพ PNG แยกตามหน้าเอกสาร</span>
                </span>
                <span style={{ fontSize: 12, fontWeight: 700 }}>{runningReceiptPrintAction ? 'กำลังดำเนินการ...' : 'PNG'}</span>
              </button>
            </div>
            <div className="house-md-foot">
              <button
                className="btn btn-g"
                type="button"
                onClick={() => {
                  if (runningReceiptPrintAction) return
                  setShowReceiptPrintActionModal(false)
                }}
              >
                ปิด
              </button>
            </div>
          </div>
        </div>
      )}

      {approveTarget && (
        <div className="house-mo">
          <div className="house-md house-md--md">
            <div className="house-md-head">
              <div>
                <div className="house-md-title">ตรวจสอบรายการก่อนอนุมัติ</div>
                <div className="house-md-sub">แสดงข้อมูลที่ลูกบ้านบันทึกมา ก่อนยืนยันอนุมัติ/ไม่อนุมัติ</div>
              </div>
            </div>
            <div className="house-md-body">
              <section className="house-sec">
                <div className="house-grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="house-field"><span>บ้านเลขที่</span><strong>{approveTarget.houses?.house_no || '-'}</strong></div>
                  <div className="house-field"><span>วิธีชำระ</span><strong>{formatMethod(approveTarget.payment_method)}</strong></div>
                  <div className="house-field"><span>วันที่ชำระ</span><strong>{formatDateTime(approveTarget.paid_at)}</strong></div>
                  <div className="house-field"><span>ยอดชำระรวม</span><strong>฿{formatMoney(approveTarget.amount)}</strong></div>
                </div>
              </section>

              <section className="house-sec">
                <div className="house-field" style={{ gap: 8 }}>
                  <span>รายการที่ลูกบ้านแจ้งชำระ</span>
                  <div className="houses-table-wrap" style={{ maxHeight: 260, overflow: 'auto' }}>
                    <table className="tw" style={{ width: '100%', minWidth: 560 }}>
                      <thead>
                        <tr>
                          <th style={{ width: 60, textAlign: 'center' }}>ลำดับ</th>
                          <th>รายการ</th>
                          <th style={{ width: 170 }}>ยอดที่ต้องชำระ</th>
                          <th style={{ width: 170 }}>ยอดชำระจริง</th>
                        </tr>
                      </thead>
                      <tbody>
                        {getPaymentItemRows(approveTarget).map((row, index) => (
                          <tr key={`${approveTarget.id}-${row.key}-${index}`}>
                            <td style={{ textAlign: 'center' }}>{index + 1}</td>
                            <td>{row.label}</td>
                            <td>฿{Number(row.dueAmount || 0).toLocaleString('th-TH')}</td>
                            <td>฿{Number(row.paidAmount || 0).toLocaleString('th-TH')}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </section>

              <section className="house-sec">
                <div className="house-field" style={{ gap: 8 }}>
                  <span>หลักฐานการชำระ</span>
                  {approveTarget.slip_url ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <img
                        src={approveTarget.slip_url}
                        alt="submitted-slip"
                        style={{ width: '100%', maxWidth: 360, borderRadius: 8, border: '1px solid var(--bo)' }}
                      />
                      <div>
                        <button className="btn btn-xs btn-o" onClick={() => handleOpenSlip(approveTarget)}>เปิดรูปเต็ม</button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ color: 'var(--mu)', fontSize: 13 }}>ไม่พบหลักฐานแนบ</div>
                  )}
                </div>
                {getDisplayNote(approveTarget.note) && (
                  <div className="house-field" style={{ marginTop: 10 }}>
                    <span>หมายเหตุจากผู้ชำระ</span>
                    <div style={{ whiteSpace: 'pre-wrap', fontSize: 13 }}>{getDisplayNote(approveTarget.note)}</div>
                  </div>
                )}
              </section>
            </div>
            <div className="house-md-foot">
              <button className="btn btn-g" type="button" onClick={() => setApproveTarget(null)} disabled={approving}>ปิด</button>
              <button className="btn btn-dg" type="button" onClick={handleRejectFromApproveModal} disabled={approving}>ไม่อนุมัติ</button>
              <button className="btn btn-ok" type="button" onClick={handleApproveConfirmed} disabled={approving}>{approving ? 'กำลังอนุมัติ...' : 'ยืนยันอนุมัติ'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
