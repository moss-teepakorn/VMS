import React, { useEffect, useMemo, useState } from 'react'
import Swal from 'sweetalert2'
import { listHouses } from '../../lib/houses'
import { getSystemConfig } from '../../lib/systemConfig'
import villageLogo from '../../assets/village-logo.svg'
import {
  calculateFullYearFeeByHouse,
  calculateOverdueFeesByIds,
  calculateOverdueFeeCharges,
  createPayment,
  deleteFee,
  listFees,
  listPaymentTotalsByFeeIds,
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

function formatDateDMY(value) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  const d = String(date.getDate()).padStart(2, '0')
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const y = date.getFullYear()
  return `${d}/${m}/${y}`
}

function extractDiscountFromNote(note) {
  const raw = String(note || '')
  const match = raw.match(/^\[DISCOUNT:([0-9]+(?:\.[0-9]+)?)\]\s*/)
  return match ? Number(match[1]) : 0
}

function stripDiscountTag(note) {
  return String(note || '').replace(/^\[DISCOUNT:[0-9]+(?:\.[0-9]+)?\]\s*/, '')
}

const houseSorter = new Intl.Collator('th-TH', { numeric: true, sensitivity: 'base' })

function normalizeSoiValue(soi) {
  const numeric = Number.parseInt(String(soi || '').replace(/[^0-9]/g, ''), 10)
  return Number.isNaN(numeric) ? Number.MAX_SAFE_INTEGER : numeric
}

const AdminFees = () => {
  const [fees, setFees] = useState([])
  const [payments, setPayments] = useState([])
  const [houses, setHouses] = useState([])
  const [setup, setSetup] = useState({
    village_name: 'The Greenfield',
    village_logo_url: '',
    juristic_name: 'นิติบุคคลหมู่บ้านเดอะกรีนฟิลด์',
    juristic_address: '',
    bank_name: 'กสิกรไทย',
    bank_account_no: '-',
    bank_account_name: 'นิติบุคคลหมู่บ้าน เดอะกรีนฟิลด์',
    juristic_signature_url: '',
    invoice_message: 'กรุณาชำระภายในวันที่ครบกำหนด หากพ้นกำหนดจะมีค่าปรับตามประกาศนิติบุคคล',
    fee_rate_per_sqw: 85,
    waste_fee_per_period: 100,
    early_pay_discount_pct: 3,
    overdue_fine_pct: 10,
    notice_fee: 200,
  })
  const [statusFilter, setStatusFilter] = useState('all')
  const [yearFilter, setYearFilter] = useState('all')
  const [periodFilter, setPeriodFilter] = useState('all')
  const [searchInput, setSearchInput] = useState('')
  const [searchKeyword, setSearchKeyword] = useState('')
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
    fee_discount: '0',
    note: '',
  })
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [savingPayment, setSavingPayment] = useState(false)
  const [payingFee, setPayingFee] = useState(null)
  const [feeSubmittedTotals, setFeeSubmittedTotals] = useState({})
  const [feeApprovedTotals, setFeeApprovedTotals] = useState({})
  const [paymentForm, setPaymentForm] = useState({
    payment_method: 'transfer',
    paid_at: new Date().toISOString().slice(0, 16),
    selectedItems: [],
    itemAmounts: {},
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
      const effectiveStatus = override.status ?? statusFilter
      const queryStatus = effectiveStatus === 'partial' ? 'all' : effectiveStatus

      const [feeData, paymentData, houseData] = await Promise.all([
        listFees({
          status: queryStatus,
          year: override.year ?? yearFilter,
          period: override.period ?? periodFilter,
        }),
        listPayments({ limit: 10 }),
        houses.length === 0 ? listHouses() : Promise.resolve(houses),
      ])

      const paymentTotals = await listPaymentTotalsByFeeIds(feeData.map((row) => row.id))
      setFeeSubmittedTotals(paymentTotals.submitted || {})
      setFeeApprovedTotals(paymentTotals.approved || {})

      const filteredFees = effectiveStatus === 'partial'
        ? feeData.filter((fee) => {
          const submittedAmount = Number((paymentTotals.submitted || {})[fee.id] || 0)
          const totalAmount = Number(fee.total_amount || 0)
          return submittedAmount > 0 && submittedAmount < totalAmount
        })
        : feeData

      const sortedFees = [...filteredFees].sort((left, right) => {
        const soiCompare = normalizeSoiValue(left?.houses?.soi) - normalizeSoiValue(right?.houses?.soi)
        if (soiCompare !== 0) return soiCompare
        return houseSorter.compare(left?.houses?.house_no || '', right?.houses?.house_no || '')
      })

      setFees(sortedFees)
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

  const displayFees = useMemo(() => {
    const keyword = searchKeyword.trim().toLowerCase()
    if (!keyword) return fees
    return fees.filter((fee) => {
      const houseNo = String(fee?.houses?.house_no || '').toLowerCase()
      const ownerName = String(fee?.houses?.owner_name || '').toLowerCase()
      const soi = String(fee?.houses?.soi || '').toLowerCase()
      const period = String(periodLabel(fee?.period || '')).toLowerCase()
      return houseNo.includes(keyword) || ownerName.includes(keyword) || soi.includes(keyword) || period.includes(keyword)
    })
  }, [fees, searchKeyword])

  const getApprovedAmountForFee = (fee) => Number(feeApprovedTotals[fee?.id] || 0)
  const getSubmittedAmountForFee = (fee) => Number(feeSubmittedTotals[fee?.id] || 0)

  const isFeeFullyPaid = (fee) => {
    const approvedAmount = getApprovedAmountForFee(fee)
    return approvedAmount >= Number(fee?.total_amount || 0)
  }

  const getOutstandingAmountForFee = (fee) => {
    const submittedAmount = getSubmittedAmountForFee(fee)
    return Math.max(0, Number(fee?.total_amount || 0) - submittedAmount)
  }

  const getFeeStatusBadge = (fee) => {
    const approvedAmount = getApprovedAmountForFee(fee)
    const submittedAmount = getSubmittedAmountForFee(fee)
    const totalAmount = Number(fee?.total_amount || 0)

    if (approvedAmount >= totalAmount && totalAmount > 0) return { className: 'bd b-ok', label: 'ชำระแล้ว' }
    if (submittedAmount > 0 && submittedAmount < totalAmount) return { className: 'bd b-ac', label: 'ชำระบางส่วน' }
    if (fee?.status === 'paid') return { className: 'bd b-ok', label: 'ชำระแล้ว' }
    if (fee?.status === 'pending') return { className: 'bd b-pr', label: 'รอตรวจสอบ' }
    if (fee?.status === 'overdue') return { className: 'bd b-dg', label: 'ค้างชำระ' }
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
    const discountAmount = extractDiscountFromNote(fee.note)
    const feeOtherBase = Number(fee.fee_other || 0) + discountAmount

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
      fee_other: String(feeOtherBase),
      fee_discount: String(discountAmount),
      note: stripDiscountTag(fee.note || ''),
    })
    setShowEditModal(true)
  }

  const handleSubmitEdit = async (event) => {
    event.preventDefault()
    if (!editingFee) return

    try {
      const currentApprovedAmount = getApprovedAmountForFee(editingFee)
      const currentInvoiceTotal = Number(editingFee.total_amount || 0)
      if (editForm.status === 'paid' && currentApprovedAmount < currentInvoiceTotal) {
        await Swal.fire({
          icon: 'warning',
          title: 'ยังตั้งเป็นชำระแล้วไม่ได้',
          text: `ยอดอนุมัติ ${currentApprovedAmount.toLocaleString('th-TH')} / ${currentInvoiceTotal.toLocaleString('th-TH')} บาท`,
        })
        return
      }

      setSavingEdit(true)
      const discountAmount = Math.max(0, Number(editForm.fee_discount || 0))
      const feeOtherNet = Number(editForm.fee_other || 0) - discountAmount
      const noteValue = `${discountAmount > 0 ? `[DISCOUNT:${discountAmount}] ` : ''}${editForm.note || ''}`.trim() || null

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
        fee_other: feeOtherNet,
        note: noteValue,
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

  const handlePrintInvoices = (targetFees, title) => {
    if (!targetFees || targetFees.length === 0) {
      Swal.fire({ icon: 'info', title: 'ไม่พบใบแจ้งหนี้สำหรับพิมพ์' })
      return
    }

    const w = window.open('', '_blank', 'width=1200,height=900')
    if (!w) return

    const fmtDate = (value) => formatDateDMY(value)
    const fmtMoney = (value) => Number(value || 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

    const toThaiBahtText = (value) => {
      const amount = Number(value || 0)
      if (!Number.isFinite(amount) || amount < 0) return '-'
      if (amount === 0) return 'ศูนย์บาทถ้วน'

      const numberText = ['ศูนย์', 'หนึ่ง', 'สอง', 'สาม', 'สี่', 'ห้า', 'หก', 'เจ็ด', 'แปด', 'เก้า']
      const positionText = ['', 'สิบ', 'ร้อย', 'พัน', 'หมื่น', 'แสน', 'ล้าน']

      const convertInteger = (num) => {
        if (num === 0) return ''
        let result = ''
        const digits = String(num).split('').map((d) => Number(d))
        const len = digits.length

        digits.forEach((digit, idx) => {
          const pos = len - idx - 1
          if (digit === 0) return

          if (pos === 0 && digit === 1 && len > 1) {
            result += 'เอ็ด'
            return
          }
          if (pos === 1 && digit === 1) {
            result += 'สิบ'
            return
          }
          if (pos === 1 && digit === 2) {
            result += 'ยี่สิบ'
            return
          }

          result += `${numberText[digit]}${positionText[pos]}`
        })

        return result
      }

      const [intPartRaw, decPartRaw = '00'] = amount.toFixed(2).split('.')
      let intPart = Number(intPartRaw)
      const decPart = Number(decPartRaw)

      const millionChunks = []
      while (intPart > 0) {
        millionChunks.unshift(intPart % 1000000)
        intPart = Math.floor(intPart / 1000000)
      }

      const bahtText = millionChunks
        .map((chunk, index) => {
          const text = convertInteger(chunk)
          if (!text) return ''
          const isLast = index === millionChunks.length - 1
          return isLast ? text : `${text}ล้าน`
        })
        .join('') || 'ศูนย์'

      if (decPart === 0) return `${bahtText}บาทถ้วน`
      return `${bahtText}บาท${convertInteger(decPart)}สตางค์`
    }

    const itemRows = (fee) => {
      const discountAmount = extractDiscountFromNote(fee.note)
      const feeOtherBase = Number(fee.fee_other || 0) + discountAmount

      const printItems = [
        { label: 'ค่าส่วนกลาง', amount: Number(fee.fee_common || 0) },
        { label: 'ค่าจอดรถ', amount: Number(fee.fee_parking || 0) },
        { label: 'ค่าขยะ', amount: Number(fee.fee_waste || 0) },
        { label: 'ยอดค้างยกมา', amount: Number(fee.fee_overdue_common || 0) },
        { label: 'ค่าปรับยอดค้าง', amount: Number(fee.fee_overdue_fine || 0) },
        { label: 'ค่าทวงถามยอดค้าง', amount: Number(fee.fee_overdue_notice || 0) },
        { label: 'ค่าปรับ', amount: Number(fee.fee_fine || 0) },
        { label: 'ค่าทวงถาม', amount: Number(fee.fee_notice || 0) },
        { label: 'ค่ากระทำผิด', amount: Number(fee.fee_violation || 0) },
        { label: 'ค่าอื่นๆ', amount: feeOtherBase },
        { label: 'ส่วนลด', amount: -discountAmount },
      ]

      return printItems
      .map((item, idx) => `
        <tr>
          <td class="c">${idx + 1}</td>
          <td>${item.label}</td>
          <td class="r">${fmtMoney(item.amount)}</td>
        </tr>
      `)
      .join('')
    }

    const copies = ['ต้นฉบับ', 'สำเนา']
    const invoiceBlocks = targetFees.map((fee) => {
      const invoiceNo = `INV-${String(fee.year || '').slice(-2)}-${String(fee.id || '').slice(0, 8).toUpperCase()}`
      const periodText = `${periodLabel(fee.period)} ปี ${toBE(fee.year)}`
      return copies.map((copyType) => {
        const logoUrl = setup.village_logo_url || localStorage.getItem('vms-login-circle-logo-url') || villageLogo
        return `
          <section class="sheet page-break">
            <header class="head">
              <div class="brand">
                <img src="${logoUrl}" alt="village-logo" />
                <div>
                  <div class="doc">ใบแจ้งหนี้ค่าส่วนกลาง</div>
                  <div class="village">${setup.village_name || 'The Greenfield'}</div>
                  <div class="sub">${setup.juristic_name || 'นิติบุคคลหมู่บ้านเดอะกรีนฟิลด์'}</div>
                  <div class="sub">${setup.juristic_address || '-'}</div>
                  <div class="sub">${title}</div>
                </div>
              </div>
              <div class="doc-meta">
                <div><span>เลขที่เอกสาร:</span> <strong>${invoiceNo}</strong></div>
                <div><span>วันที่ออกเอกสาร:</span> <strong>${fmtDate(fee.invoice_date)}</strong></div>
                <div><span>ครบกำหนดชำระ:</span> <strong>${fmtDate(fee.due_date)}</strong></div>
              </div>
            </header>

            <section class="box">
              <div class="grid">
                <div><span>บ้านเลขที่</span><strong>${fee.houses?.house_no || '-'}</strong></div>
                <div><span>ชื่อเจ้าของบ้าน</span><strong>${fee.houses?.owner_name || '-'}</strong></div>
                <div><span>งวดเรียกเก็บ</span><strong>${periodText}</strong></div>
                <div><span>ซอย</span><strong>${fee.houses?.soi || '-'}</strong></div>
                <div><span>พื้นที่ (ตร.วา)</span><strong>${Number(fee.houses?.area_sqw || 0).toLocaleString('th-TH')}</strong></div>
                <div><span>อัตราค่าส่วนกลาง</span><strong>${Number(setup.fee_rate_per_sqw || fee.houses?.fee_rate || 0).toLocaleString('th-TH')} บาท/ตร.วา/ปี</strong></div>
              </div>
            </section>

            <section class="box">
              <table>
                <thead>
                  <tr>
                    <th class="c" style="width:56px;">ลำดับ</th>
                    <th>รายการ</th>
                    <th class="r" style="width:180px;">จำนวนเงิน (บาท)</th>
                  </tr>
                </thead>
                <tbody>
                  ${itemRows(fee)}
                </tbody>
                <tfoot>
                  <tr>
                    <td colspan="2" class="r"><strong>รวมทั้งสิ้น</strong></td>
                    <td class="r"><strong>${fmtMoney(fee.total_amount || 0)}</strong></td>
                  </tr>
                </tfoot>
              </table>
              <div class="amount-text">(${toThaiBahtText(fee.total_amount || 0)})</div>
            </section>

            <section class="box payment-box">
              <div class="payment-title">รายละเอียดการชำระเงิน</div>
              <div class="payment-grid">
                <div><span>ธนาคาร</span><strong>${setup.bank_name || '-'}</strong></div>
                <div><span>เลขที่บัญชี</span><strong>${setup.bank_account_no || '-'}</strong></div>
                <div><span>ชื่อบัญชี</span><strong>${setup.bank_account_name || '-'}</strong></div>
                <div><span>กำหนดชำระ</span><strong>${fmtDate(fee.due_date)}</strong></div>
              </div>
              <div class="payment-note">${setup.invoice_message || 'กรุณาแนบหลักฐานการโอนทุกครั้งหลังชำระ'}</div>
            </section>

            <section class="foot">
              <div class="note">
                หมายเหตุ: กรุณาชำระภายในวันที่ครบกำหนด เพื่อหลีกเลี่ยงค่าปรับ/ค่าทวงถามเพิ่มเติม
              </div>
              <div class="sign-wrap">
                ${setup.juristic_signature_url ? `<img src="${setup.juristic_signature_url}" alt="juristic-signature" />` : ''}
                <div class="sign-line"></div>
                <div>ผู้มีอำนาจลงนาม</div>
              </div>
            </section>

            <div class="stamp">${copyType}</div>
          </section>
        `
      }).join('')
    }).join('')

    w.document.write(`
      <html>
        <head>
          <title></title>
          <link rel="preconnect" href="https://fonts.googleapis.com">
          <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
          <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;500;700&display=swap" rel="stylesheet">
          <style>
            @page { size: A4; margin: 10mm; }
            * { box-sizing: border-box; }
            body { font-family: 'Sarabun', 'TH Sarabun New', Tahoma, sans-serif; margin: 0; color: #111827; background: #f8fafc; }
            .sheet {
              position: relative;
              width: 210mm;
              min-height: 297mm;
              margin: 0 auto;
              background: #fff;
              padding: 12mm;
              display: flex;
              flex-direction: column;
              gap: 12px;
            }
            .page-break { page-break-after: always; }
            .head {
              display: flex;
              justify-content: space-between;
              gap: 10px;
              border: 1px solid #d1d5db;
              border-radius: 10px;
              padding: 12px;
              background: #ffffff;
            }
            .brand { display: flex; align-items: flex-start; gap: 12px; }
            .brand img {
              width: 58px;
              height: 58px;
              border-radius: 8px;
              object-fit: cover;
              border: 1px solid #d1d5db;
              margin-top: -4px;
            }
            .doc { font-size: 24px; font-weight: 700; }
            .village { font-size: 16px; margin-top: 2px; }
            .sub { font-size: 12px; color: #6b7280; margin-top: 4px; }
            .doc-meta { font-size: 12px; min-width: 240px; display: flex; flex-direction: column; gap: 4px; }
            .doc-meta span { color: #6b7280; }
            .box { border: 1px solid #d1d5db; border-radius: 10px; padding: 10px; }
            .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 14px; }
            .grid > div { display: flex; flex-direction: column; gap: 2px; }
            .grid span { font-size: 11px; color: #6b7280; }
            .grid strong { font-size: 14px; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #d1d5db; padding: 8px 9px; font-size: 12px; }
            th { background: #f3f4f6; text-align: left; }
            .c { text-align: center; }
            .r { text-align: right; }
            tfoot td { background: #f8fafc; }
            .amount-text {
              margin-top: 8px;
              font-size: 13px;
              color: #374151;
              font-weight: 500;
              text-align: right;
            }
            .payment-box { display: flex; flex-direction: column; gap: 8px; }
            .payment-title { font-size: 14px; font-weight: 700; color: #111827; }
            .payment-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 14px; }
            .payment-grid > div { display: flex; flex-direction: column; gap: 2px; }
            .payment-grid span { font-size: 11px; color: #6b7280; }
            .payment-grid strong { font-size: 13px; }
            .payment-note {
              border-top: 1px dashed #d1d5db;
              padding-top: 8px;
              font-size: 12px;
              color: #4b5563;
            }
            .foot {
              margin-top: auto;
              border: 1px solid #d1d5db;
              border-radius: 10px;
              padding: 12px;
              display: flex;
              align-items: flex-end;
              justify-content: space-between;
              gap: 12px;
            }
            .note { font-size: 12px; color: #4b5563; }
            .sign-wrap { min-width: 180px; text-align: center; font-size: 12px; color: #4b5563; }
            .sign-wrap img { max-width: 150px; max-height: 54px; object-fit: contain; margin-bottom: 6px; }
            .sign-line { border-top: 1px solid #6b7280; margin: 4px 0; }
            .stamp {
              position: absolute;
              top: 16mm;
              right: 14mm;
              font-size: 12px;
              letter-spacing: .5px;
              border: 1px solid #0f766e;
              color: #0f766e;
              padding: 2px 10px;
              border-radius: 999px;
              font-weight: 700;
              background: #ffffff;
            }
            @media print {
              body { background: #fff; }
              .sheet { margin: 0; box-shadow: none; }
              .page-break { page-break-after: always; }
              .sheet:last-child.page-break { page-break-after: auto; }
            }
          </style>
        </head>
        <body>
          ${invoiceBlocks}
          <script>
            window.onload = () => window.print();
          </script>
        </body>
      </html>
    `)
    w.document.close()
  }

  const handlePrintInvoicesAll = () => {
    handlePrintInvoices(displayFees, 'ใบแจ้งหนี้ทั้งหมด')
  }

  const handlePrintInvoiceByHouse = (fee) => {
    const sameHouse = fees.filter((item) => item.house_id === fee.house_id)
    const title = `ใบแจ้งหนี้บ้าน ${fee.houses?.house_no || '-'} ทั้งหมด`
    handlePrintInvoices(sameHouse, title)
  }

  const handleAddPayment = (fee) => {
    const payableItems = feeItemDefs
      .map((item) => ({ ...item, amount: Number(fee[item.key] || 0) }))
      .filter((item) => item.amount > 0)

    const selectedItems = payableItems.map((item) => item.key)
    const itemAmounts = payableItems.reduce((acc, item) => {
      acc[item.key] = item.amount
      return acc
    }, {})

    setPayingFee(fee)
    setPaymentForm({
      payment_method: 'transfer',
      paid_at: new Date().toISOString().slice(0, 16),
      selectedItems,
      itemAmounts,
      note: '',
    })
    setShowPaymentModal(true)
  }

  const paymentSelectedAmount = useMemo(() => {
    if (!payingFee) return 0
    return paymentForm.selectedItems.reduce((sum, key) => sum + Number(paymentForm.itemAmounts?.[key] || 0), 0)
  }, [payingFee, paymentForm.selectedItems, paymentForm.itemAmounts])

  const payableFeeItems = useMemo(() => {
    if (!payingFee) return []
    return feeItemDefs
      .map((item) => ({ ...item, amount: Number(payingFee[item.key] || 0) }))
      .filter((item) => item.amount > 0)
  }, [payingFee])

  const paymentInvoiceTotal = useMemo(() => {
    if (!payingFee) return 0
    return payableFeeItems.reduce((sum, item) => sum + item.amount, 0)
  }, [payingFee, payableFeeItems])

  const paymentRemaining = Math.max(0, paymentInvoiceTotal - paymentSelectedAmount)
  const paymentCoveragePct = paymentInvoiceTotal > 0
    ? Math.min(100, Math.round((paymentSelectedAmount / paymentInvoiceTotal) * 100))
    : 0

  const togglePaymentItem = (itemKey, checked) => {
    setPaymentForm((prev) => {
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

  const handleChangeItemAmount = (itemKey, rawValue, maxAmount) => {
    let nextValue = Number(rawValue)
    if (!Number.isFinite(nextValue)) nextValue = 0
    if (nextValue < 0) nextValue = 0
    if (nextValue > maxAmount) nextValue = maxAmount

    setPaymentForm((prev) => ({
      ...prev,
      itemAmounts: {
        ...prev.itemAmounts,
        [itemKey]: nextValue,
      },
    }))
  }

  const selectAllPaymentItems = () => {
    setPaymentForm((prev) => ({
      ...prev,
      selectedItems: payableFeeItems.map((item) => item.key),
      itemAmounts: payableFeeItems.reduce((acc, item) => {
        acc[item.key] = Number(prev.itemAmounts?.[item.key] ?? item.amount)
        return acc
      }, {}),
    }))
  }

  const clearPaymentItems = () => {
    setPaymentForm((prev) => ({ ...prev, selectedItems: [] }))
  }

  const selectBasePaymentItems = () => {
    const baseKeys = ['fee_common', 'fee_parking', 'fee_waste']
    setPaymentForm((prev) => ({
      ...prev,
      selectedItems: payableFeeItems
        .map((item) => item.key)
        .filter((key) => baseKeys.includes(key)),
      itemAmounts: payableFeeItems.reduce((acc, item) => {
        acc[item.key] = Number(prev.itemAmounts?.[item.key] ?? item.amount)
        return acc
      }, {}),
    }))
  }

  const setSelectedItemsToFullAmount = () => {
    setPaymentForm((prev) => ({
      ...prev,
      itemAmounts: payableFeeItems.reduce((acc, item) => {
        const isSelected = prev.selectedItems.includes(item.key)
        acc[item.key] = isSelected ? item.amount : Number(prev.itemAmounts?.[item.key] ?? item.amount)
        return acc
      }, {}),
    }))
  }

  const clearSelectedItemAmounts = () => {
    setPaymentForm((prev) => ({
      ...prev,
      itemAmounts: payableFeeItems.reduce((acc, item) => {
        const isSelected = prev.selectedItems.includes(item.key)
        acc[item.key] = isSelected ? 0 : Number(prev.itemAmounts?.[item.key] ?? item.amount)
        return acc
      }, {}),
    }))
  }

  const handleSubmitPayment = async (event) => {
    event.preventDefault()
    if (!payingFee) return
    if (paymentForm.selectedItems.length === 0) {
      await Swal.fire({ icon: 'warning', title: 'กรุณาเลือกรายการที่ชำระอย่างน้อย 1 รายการ' })
      return
    }

    if (paymentSelectedAmount <= 0) {
      await Swal.fire({ icon: 'warning', title: 'ยอดรับชำระต้องมากกว่า 0' })
      return
    }

    try {
      setSavingPayment(true)
      const selectedLabels = feeItemDefs
        .filter((item) => paymentForm.selectedItems.includes(item.key))
        .map((item) => `${item.label} ฿${Number(paymentForm.itemAmounts?.[item.key] || 0).toLocaleString('th-TH')}`)

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
            <div className="ph-ico">
              <img
                className="ph-ico-img"
                src={setup.village_logo_url || localStorage.getItem('vms-login-circle-logo-url') || villageLogo}
                alt="village-logo"
              />
            </div>
            <div>
              <div className="ph-h1">ค่าส่วนกลาง</div>
              <div className="ph-sub">ออกใบแจ้งหนี้ทุกหลังจาก setup ระบบ และจัดการรายหลัง</div>
            </div>
          </div>
        </div>
        <div style={{ marginTop: '10px', display: 'flex', justifyContent: 'flex-end', gap: '8px', flexWrap: 'wrap' }}>
          <input
            className="page-filter-input"
            placeholder="ค้นหา ซอย / บ้านเลขที่ / เจ้าของ"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            style={{ minWidth: 240 }}
          />
          <select className="page-filter-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="all">ทุกสถานะ</option>
            <option value="unpaid">ยังไม่ชำระ</option>
            <option value="partial">ชำระบางส่วน</option>
            <option value="pending">รอตรวจสอบ</option>
            <option value="paid">ชำระแล้ว</option>
            <option value="overdue">ค้างชำระ</option>
          </select>
          <select className="page-filter-select" value={yearFilter} onChange={(e) => setYearFilter(e.target.value)}>
            <option value="all">ทุกปี</option>
            {yearOptions.map((year) => <option key={year} value={year}>{toBE(year)}</option>)}
          </select>
          <select className="page-filter-select" value={periodFilter} onChange={(e) => setPeriodFilter(e.target.value)}>
            <option value="all">ทุกรอบ</option>
            <option value="first_half">ครึ่งปีแรก</option>
            <option value="second_half">ครึ่งปีหลัง</option>
            <option value="full_year">ทั้งปี</option>
          </select>
          <button
            className="btn btn-a btn-sm page-filter-btn"
            onClick={() => {
              setSearchKeyword(searchInput.trim())
              loadFeeData({ status: statusFilter, year: yearFilter, period: periodFilter })
            }}
          >
            ค้นหา
          </button>
        </div>
      </div>

      <div className="stats">
        <div className="sc"><div className="sc-ico a">💵</div><div><div className="sc-v">฿{summary.totalCollected.toLocaleString('th-TH')}</div><div className="sc-l">รวมเก็บแล้ว</div></div></div>
        <div className="sc"><div className="sc-ico d">⏳</div><div><div className="sc-v">฿{summary.totalOutstanding.toLocaleString('th-TH')}</div><div className="sc-l">ค้างชำระ</div></div></div>
        <div className="sc"><div className="sc-ico p">🧾</div><div><div className="sc-v">฿{summary.totalInvoiced.toLocaleString('th-TH')}</div><div className="sc-l">ยอดออกใบแจ้งหนี้</div></div></div>
      </div>

      <div className="card">
        <div className="ch page-list-head">
          <div className="ct">ใบแจ้งหนี้ล่าสุด ({displayFees.length})</div>
          <div className="page-list-actions">
            <button className="btn btn-p btn-sm" onClick={handleOpenProcessModal}>+ สร้างใบแจ้งหนี้</button>
            <button className="btn btn-a btn-sm" onClick={handlePrintInvoicesAll}>🖨 พิมพ์ใบแจ้งหนี้ทั้งหมด</button>
            <button className="btn btn-dg btn-sm" onClick={handleBulkOverdue}>⚖ คำนวณค่าปรับทั้งหมด</button>
            <button className="btn btn-g btn-sm" onClick={() => loadFeeData({ status: statusFilter, year: yearFilter, period: periodFilter })}>🔄 รีเฟรช</button>
          </div>
        </div>
        <div className="cb page-table-body">
          <div className="desktop-only">
            <div style={{ overflowX: 'auto' }}>
              <table className="tw" style={{ width: '100%' }}>
                <thead>
                  <tr>
                    <th>ซอย</th>
                    <th>บ้าน</th>
                    <th>ปี</th>
                    <th>งวด</th>
                    <th>ครบกำหนด</th>
                    <th>ยอดรวม</th>
                    <th>ยอดค้างชำระ</th>
                    <th>สถานะ</th>
                    <th style={{ textAlign: 'right' }}>จัดการ</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan="9" style={{ textAlign: 'center', color: 'var(--mu)', padding: '20px' }}>กำลังโหลดข้อมูล...</td></tr>
                  ) : displayFees.length === 0 ? (
                    <tr><td colSpan="9" style={{ textAlign: 'center', color: 'var(--mu)', padding: '20px' }}>ไม่พบข้อมูลตามเงื่อนไขค้นหา</td></tr>
                  ) : (
                    displayFees.map((fee) => {
                      const badge = getFeeStatusBadge(fee)
                      const outstanding = getOutstandingAmountForFee(fee)
                      return (
                        <tr key={fee.id}>
                          <td>{fee.houses?.soi || '-'}</td>
                          <td>{fee.houses?.house_no || '-'}<div style={{ fontSize: '11px', color: 'var(--mu)' }}>{fee.houses?.owner_name || '-'}</div></td>
                          <td>{toBE(fee.year)}</td>
                          <td>{periodLabel(fee.period)}</td>
                          <td>{formatDateDMY(fee.due_date)}</td>
                          <td><strong>฿{Number(fee.total_amount || 0).toLocaleString('th-TH')}</strong></td>
                          <td><strong style={{ color: outstanding > 0 ? '#9a3412' : '#166534' }}>฿{outstanding.toLocaleString('th-TH')}</strong></td>
                          <td><span className={badge.className}>{badge.label}</span></td>
                          <td style={{ width: '1%', whiteSpace: 'nowrap' }}>
                            <div className="td-acts" style={{ justifyContent: 'flex-end', display: 'flex', width: '100%' }}>
                              <button className="btn btn-xs btn-a" onClick={() => handleEditFee(fee)}>แก้ไข</button>
                              <button className="btn btn-xs btn-g" onClick={() => handlePrintInvoiceByHouse(fee)}>พิมพ์</button>
                              {!isFeeFullyPaid(fee) && <button className="btn btn-xs btn-o" onClick={() => handleCalculateAnnual(fee)}>คำนวณทั้งปี</button>}
                              {!isFeeFullyPaid(fee) && <button className="btn btn-xs btn-dg" onClick={() => handleCalculateOverdue(fee)}>คำนวณค่าปรับ</button>}
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
            ) : displayFees.length === 0 ? (
              <div className="mcard-empty">ยังไม่มีใบแจ้งหนี้</div>
            ) : displayFees.map((fee) => {
              const badge = getFeeStatusBadge(fee)
              const outstanding = getOutstandingAmountForFee(fee)
              return (
                <div key={fee.id} className="mcard">
                  <div className="mcard-top">
                    <div className="mcard-title">{fee.houses?.house_no || '-'}</div>
                    <div className="mcard-sub">ซอย {fee.houses?.soi || '-'} · {toBE(fee.year)} · {periodLabel(fee.period)}</div>
                    <span className={`${badge.className} mcard-badge`}>{badge.label}</span>
                  </div>
                  <div className="mcard-body">{fee.houses?.owner_name || '-'}</div>
                  <div className="mcard-meta">
                    <span><span className="mcard-label">ครบกำหนด</span> {formatDateDMY(fee.due_date)}</span>
                    <span><span className="mcard-label">ยอดรวม</span> ฿{Number(fee.total_amount || 0).toLocaleString('th-TH')}</span>
                    <span><span className="mcard-label">ยอดค้างชำระ</span> ฿{outstanding.toLocaleString('th-TH')}</span>
                  </div>
                  <div className="mcard-actions">
                    <button className="btn btn-xs btn-a" onClick={() => handleEditFee(fee)}>แก้ไข</button>
                    <button className="btn btn-xs btn-g" onClick={() => handlePrintInvoiceByHouse(fee)}>พิมพ์</button>
                    {!isFeeFullyPaid(fee) && <button className="btn btn-xs btn-o" onClick={() => handleCalculateAnnual(fee)}>ทั้งปี</button>}
                    {!isFeeFullyPaid(fee) && <button className="btn btn-xs btn-dg" onClick={() => handleCalculateOverdue(fee)}>ค่าปรับ</button>}
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
          <div className="house-md house-md--md">
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
                        <option value="paid" disabled={getApprovedAmountForFee(editingFee) < Number(editingFee.total_amount || 0)}>ชำระแล้ว</option>
                        <option value="overdue">ค้างชำระ</option>
                      </select>
                      <small style={{ color: 'var(--mu)' }}>
                        อนุมัติแล้ว {getApprovedAmountForFee(editingFee).toLocaleString('th-TH')} / {Number(editingFee.total_amount || 0).toLocaleString('th-TH')} บาท
                      </small>
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
                    <label className="house-field"><span>ส่วนลด</span><input type="number" step="0.01" min="0" value={editForm.fee_discount} onChange={(e) => setEditForm((prev) => ({ ...prev, fee_discount: e.target.value }))} /></label>
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
          <div className="house-md house-md--xl">
            <div className="house-md-head">
              <div>
                <div className="house-md-title">💳 บันทึกรับชำระ</div>
                <div className="house-md-sub">{payingFee.houses?.house_no || '-'} · {periodLabel(payingFee.period)} · ปี {toBE(payingFee.year)}</div>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <span className="bd b-pr">ยอดแจ้งหนี้ ฿{paymentInvoiceTotal.toLocaleString('th-TH')}</span>
                <span className="bd b-ok">เลือกแล้ว ฿{paymentSelectedAmount.toLocaleString('th-TH')}</span>
                <span className="bd b-wn">คงเหลือ ฿{paymentRemaining.toLocaleString('th-TH')}</span>
              </div>
            </div>

            <form onSubmit={handleSubmitPayment}>
              <div className="house-md-body">
                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.6fr) minmax(300px, 1fr)', gap: 16 }}>
                  <section className="house-sec" style={{ marginBottom: 0 }}>
                    <div className="house-sec-title">เลือกรายการที่ชำระ</div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
                      <button type="button" className="btn btn-xs btn-a" onClick={selectAllPaymentItems}>เลือกทั้งหมด</button>
                      <button type="button" className="btn btn-xs btn-o" onClick={selectBasePaymentItems}>เลือกพื้นฐาน</button>
                      <button type="button" className="btn btn-xs btn-p" onClick={setSelectedItemsToFullAmount}>กรอกยอดเต็ม (ที่เลือก)</button>
                      <button type="button" className="btn btn-xs btn-g" onClick={clearSelectedItemAmounts}>ล้างยอด (ที่เลือก)</button>
                      <button type="button" className="btn btn-xs btn-g" onClick={clearPaymentItems}>ล้างการเลือก</button>
                    </div>

                    <div
                      style={{
                        height: 10,
                        borderRadius: 99,
                        background: '#e5e7eb',
                        overflow: 'hidden',
                        marginBottom: 12,
                      }}
                    >
                      <div
                        style={{
                          width: `${paymentCoveragePct}%`,
                          height: '100%',
                          background: paymentRemaining === 0 ? '#16a34a' : '#0ea5e9',
                          transition: 'width .2s ease',
                        }}
                      />
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--mu)', marginBottom: 10 }}>
                      ครอบคลุมยอดชำระ {paymentCoveragePct}% {paymentRemaining > 0 ? `· คงเหลือ ฿${paymentRemaining.toLocaleString('th-TH')}` : '· ครบยอดแล้ว'}
                    </div>

                    <div style={{ border: '1px solid var(--bo)', borderRadius: 10, overflow: 'hidden' }}>
                      <table className="tw" style={{ width: '100%', minWidth: 420 }}>
                        <thead>
                          <tr>
                            <th>รายการ</th>
                            <th style={{ width: 80, textAlign: 'center' }}>เลือก</th>
                            <th style={{ width: 220, textAlign: 'right' }}>จำนวนเงินที่ชำระ</th>
                          </tr>
                        </thead>
                        <tbody>
                          {payableFeeItems.length === 0 ? (
                            <tr>
                              <td colSpan="3" style={{ textAlign: 'center', color: 'var(--mu)', padding: '14px 10px' }}>
                                ไม่พบรายการที่มียอดมากกว่า 0
                              </td>
                            </tr>
                          ) : (
                            payableFeeItems.map((item) => {
                              const checked = paymentForm.selectedItems.includes(item.key)
                              const value = Number(paymentForm.itemAmounts?.[item.key] ?? item.amount)
                              const isPartialRow = checked && value > 0 && value < item.amount
                              const isInvalidRow = checked && value <= 0
                              return (
                                <tr key={item.key} style={{ background: checked ? '#f0fdf4' : '#fff' }}>
                                  <td>
                                    <div style={{ fontWeight: 600 }}>{item.label}</div>
                                    <div style={{ fontSize: 12, color: 'var(--mu)' }}>ยอดเต็ม ฿{item.amount.toLocaleString('th-TH')}</div>
                                    {isPartialRow && <div style={{ fontSize: 12, color: '#0f766e' }}>ชำระบางส่วนของรายการนี้</div>}
                                    {isInvalidRow && <div style={{ fontSize: 12, color: '#b91c1c' }}>โปรดระบุยอดมากกว่า 0</div>}
                                  </td>
                                  <td style={{ textAlign: 'center' }}>
                                    <input
                                      type="checkbox"
                                      checked={checked}
                                      onChange={(e) => togglePaymentItem(item.key, e.target.checked)}
                                      style={{ width: 16, height: 16 }}
                                    />
                                  </td>
                                  <td style={{ textAlign: 'right' }}>
                                    <input
                                      type="number"
                                      min="0"
                                      max={item.amount}
                                      step="0.01"
                                      value={value}
                                      onChange={(e) => handleChangeItemAmount(item.key, e.target.value, item.amount)}
                                      disabled={!checked}
                                      style={{ width: 160, textAlign: 'right', borderColor: isInvalidRow ? '#dc2626' : undefined }}
                                    />
                                  </td>
                                </tr>
                              )
                            })
                          )}
                        </tbody>
                        <tfoot>
                          <tr>
                            <th colSpan="2" style={{ textAlign: 'right' }}>รวมยอดที่ชำระ</th>
                            <th style={{ textAlign: 'right', color: '#166534' }}>฿{paymentSelectedAmount.toLocaleString('th-TH')}</th>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                    <div style={{ marginTop: 8, fontSize: 12, color: 'var(--mu)' }}>
                      คำแนะนำ: ติ๊กเฉพาะรายการที่ต้องรับชำระ, กรอกยอดมากกว่า 0 และไม่เกินยอดเต็มของแต่ละรายการ เพื่อลดความผิดพลาด
                    </div>
                  </section>

                  <section className="house-sec" style={{ marginBottom: 0 }}>
                    <div className="house-sec-title">รายละเอียดการรับชำระ</div>
                    <div style={{ display: 'grid', gap: 8, marginBottom: 12 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', background: '#f8fafc', border: '1px solid var(--bo)', borderRadius: 8, padding: '10px 12px' }}>
                        <span style={{ color: 'var(--mu)' }}>ยอดใบแจ้งหนี้</span>
                        <strong>฿{paymentInvoiceTotal.toLocaleString('th-TH')}</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', background: '#ecfeff', border: '1px solid #99f6e4', borderRadius: 8, padding: '10px 12px' }}>
                        <span style={{ color: '#0f766e' }}>ยอดที่เลือกชำระ</span>
                        <strong style={{ color: '#166534' }}>฿{paymentSelectedAmount.toLocaleString('th-TH')}</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', background: '#fff7ed', border: '1px solid #fdba74', borderRadius: 8, padding: '10px 12px' }}>
                        <span style={{ color: '#9a3412' }}>ยอดคงเหลือ</span>
                        <strong style={{ color: '#9a3412' }}>฿{paymentRemaining.toLocaleString('th-TH')}</strong>
                      </div>
                    </div>

                    <div className="house-grid" style={{ gridTemplateColumns: '1fr', gap: 10 }}>
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
                      <label className="house-field">
                        <span>หมายเหตุ</span>
                        <textarea rows="3" value={paymentForm.note} onChange={(e) => setPaymentForm((prev) => ({ ...prev, note: e.target.value }))} placeholder="รายละเอียดเพิ่มเติม" />
                      </label>
                    </div>
                  </section>
                </div>
              </div>
              <div className="house-md-foot">
                <button className="btn btn-g" type="button" onClick={() => { if (!savingPayment) { setShowPaymentModal(false); setPayingFee(null) } }}>
                  ยกเลิก
                </button>
                <button className="btn btn-p" type="submit" disabled={savingPayment || paymentSelectedAmount <= 0}>
                  {savingPayment ? 'กำลังบันทึก...' : 'บันทึกรับชำระ'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showProcessModal && (
        <div className="house-mo">
          <div className="house-md house-md--xs">
            <div className="house-md-head">
              <div>
                <div className="house-md-title">🧾 สร้างใบแจ้งหนี้ทุกหลัง</div>
                <div className="house-md-sub">คำนวณอัตโนมัติจาก setup ระบบ (แก้ไขค่าในขั้นตอนนี้ไม่ได้)</div>
              </div>
            </div>

            <form onSubmit={handleProcessAll}>
              <div className="house-md-body">
                <section className="house-sec">
                  <div className="house-grid" style={{ gridTemplateColumns: '1fr' }}>
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
