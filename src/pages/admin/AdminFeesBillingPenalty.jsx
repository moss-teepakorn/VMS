import React, { useEffect, useMemo, useState } from 'react'
import StyledSelect from '../../components/StyledSelect'
import Swal from 'sweetalert2'
import { getSystemConfig } from '../../lib/systemConfig'
import { getPaymentCycleConfigByYear } from '../../lib/paymentCycles'
import { calculateOverdueFeesByIds, listFees, processHalfYearFeesAllHouses } from '../../lib/fees'
import './FinanceLightButton.css'

function toBE(yearCE) {
  const year = Number(yearCE)
  if (!Number.isFinite(year)) return '-'
  return year + 543
}

function toGregorianYear(yearValue) {
  const year = Number(yearValue)
  if (!Number.isFinite(year) || year <= 0) return null
  return year > 2400 ? year - 543 : year
}

export default function AdminFeesBillingPenalty() {
  const [setup, setSetup] = useState({
    fee_rate_per_sqw: 85,
    waste_fee_per_period: 100,
    overdue_fine_pct: 10,
    notice_fee: 200,
  })
  const [processingInvoice, setProcessingInvoice] = useState(false)
  const [processingOverdue, setProcessingOverdue] = useState(false)
  const [processForm, setProcessForm] = useState({
    yearBE: String(new Date().getFullYear() + 543),
    period: 'first_half',
    overwritePending: false,
  })
  const [invoiceSummary, setInvoiceSummary] = useState(null)
  const [overdueSummary, setOverdueSummary] = useState(null)
  const [periodOptions, setPeriodOptions] = useState([
    { value: 'first_half', label: 'ครึ่งปีแรก (1/1 - 30/6)' },
    { value: 'second_half', label: 'ครึ่งปีหลัง (1/7 - 31/12)' },
  ])

  useEffect(() => {
    getSystemConfig().then(setSetup).catch(() => {})
  }, [])

  useEffect(() => {
    const syncPeriodOptions = async () => {
      const yearCE = toGregorianYear(processForm.yearBE)
      if (!yearCE) return

      try {
        const cycleConfig = await getPaymentCycleConfigByYear(yearCE)
        if (!cycleConfig || cycleConfig.frequency !== 'half_yearly') {
          setPeriodOptions([
            { value: 'first_half', label: 'ครึ่งปีแรก (1/1 - 30/6)' },
            { value: 'second_half', label: 'ครึ่งปีหลัง (1/7 - 31/12)' },
          ])
          return
        }

        const p1 = (cycleConfig.periods || []).find((row) => Number(row.seq_no) === 1)
        const p2 = (cycleConfig.periods || []).find((row) => Number(row.seq_no) === 2)

        const formatRange = (row, fallback) => {
          if (!row?.start_date || !row?.end_date) return fallback
          return `${row.period_label || fallback} (${row.start_date} - ${row.end_date})`
        }

        setPeriodOptions([
          { value: 'first_half', label: formatRange(p1, 'ครึ่งปีแรก') },
          { value: 'second_half', label: formatRange(p2, 'ครึ่งปีหลัง') },
        ])
      } catch {
        setPeriodOptions([
          { value: 'first_half', label: 'ครึ่งปีแรก (1/1 - 30/6)' },
          { value: 'second_half', label: 'ครึ่งปีหลัง (1/7 - 31/12)' },
        ])
      }
    }

    syncPeriodOptions()
  }, [processForm.yearBE])

  const processYearOptions = useMemo(() => {
    const currentBE = new Date().getFullYear() + 543
    return [currentBE + 1, currentBE, currentBE - 1, currentBE - 2, currentBE - 3]
  }, [])

  const handleProcessInvoices = async (event) => {
    event.preventDefault()
    const yearCE = toGregorianYear(processForm.yearBE)
    if (!yearCE) {
      await Swal.fire({ icon: 'warning', title: 'ปีไม่ถูกต้อง' })
      return
    }

    try {
      setProcessingInvoice(true)

      let overwrittenPending = 0
      if (processForm.overwritePending) {
        const [pendingRows, fullYearRows] = await Promise.all([
          listFees({ year: yearCE, period: processForm.period, status: 'pending' }),
          listFees({ year: yearCE, period: 'full_year', status: 'all' }),
        ])
        const fullYearHouseIds = new Set((fullYearRows || []).map((row) => row.house_id))
        overwrittenPending = (pendingRows || []).filter((row) => !fullYearHouseIds.has(row.house_id)).length
      }

      Swal.fire({
        title: 'กำลังสร้างใบแจ้งหนี้',
        text: 'กรุณารอสักครู่ ระบบกำลังประมวลผลข้อมูลทุกหลัง',
        allowOutsideClick: false,
        allowEscapeKey: false,
        didOpen: () => Swal.showLoading(),
        showConfirmButton: false,
      })

      const result = await processHalfYearFeesAllHouses({
        yearBE: Number(processForm.yearBE),
        period: processForm.period,
        setup,
        overwritePending: processForm.overwritePending,
      })

      Swal.close()

      const summary = {
        total: Number(result.totalHouses || 0),
        created: Number(result.created || 0),
        updated: Number(result.updated || 0),
        success: Number(result.created || 0) + Number(result.updated || 0),
        failed: 0,
        overwritten: Number(overwrittenPending || 0),
        skippedPaid: Number(result.skippedPaid || 0),
        skippedPending: Number(result.skippedPending || 0),
        skippedFullYear: Number(result.skippedFullYear || 0),
        cancelledFirstHalf: Number(result.cancelledFirstHalf || 0),
      }

      setInvoiceSummary(summary)

      await Swal.fire({
        icon: 'success',
        title: 'สร้างใบแจ้งหนี้สำเร็จ',
        html: `ทั้งหมด ${summary.total} หลัง<br/>สร้างใหม่ ${summary.created} หลัง<br/>อัปเดต ${summary.updated} หลัง<br/>สำเร็จ ${summary.success} หลัง<br/>ไม่สำเร็จ ${summary.failed} หลัง<br/>ทับรายการรอตรวจสอบ ${summary.overwritten} หลัง<br/>ข้าม (ชำระแล้ว) ${summary.skippedPaid} หลัง<br/>ข้าม (รอตรวจสอบ) ${summary.skippedPending} หลัง${summary.skippedFullYear > 0 ? `<br/>ข้าม (มีใบแจ้งหนี้เต็มปีแล้ว) ${summary.skippedFullYear} หลัง` : ''}${summary.cancelledFirstHalf > 0 ? `<br/>ยกเลิกใบครึ่งปีแรกเดิม ${summary.cancelledFirstHalf} หลัง` : ''}`,
      })
    } catch (error) {
      Swal.close()
      await Swal.fire({ icon: 'error', title: 'Process ไม่สำเร็จ', text: error.message })
    } finally {
      setProcessingInvoice(false)
    }
  }

  const handleCalculateOverdue = async () => {
    try {
      setProcessingOverdue(true)

      Swal.fire({
        title: 'กำลังเตรียมรายการคำนวณค่าปรับ',
        text: 'กำลังดึงข้อมูลใบแจ้งหนี้ทั้งหมด',
        allowOutsideClick: false,
        allowEscapeKey: false,
        didOpen: () => Swal.showLoading(),
        showConfirmButton: false,
      })

      const filteredFees = await listFees({
        status: 'all',
        year: 'all',
        period: 'all',
      })

      if (filteredFees.length === 0) {
        Swal.close()
        await Swal.fire({ icon: 'info', title: 'ไม่พบรายการสำหรับคำนวณ', text: 'กรุณาสร้างใบแจ้งหนี้ก่อน' })
        return
      }

      Swal.update({
        title: 'กำลังคำนวณค่าปรับ',
        text: `กำลังประมวลผล ${filteredFees.length} รายการ`,
      })

      const result = await calculateOverdueFeesByIds({
        feeIds: filteredFees.map((item) => item.id),
        setup,
      })

      Swal.close()

      const summary = {
        total: Number(result.total || filteredFees.length),
        updated: Number(result.updated || 0),
        success: Number(result.updated || 0),
        failed: 0,
        overwritten: 0,
        skippedPaid: Number(result.skippedPaid || 0),
        skippedNotDue: Number(result.skippedNotDue || 0),
      }

      setOverdueSummary(summary)

      await Swal.fire({
        icon: 'success',
        title: 'คำนวณค่าปรับเสร็จสิ้น',
        html: `ทั้งหมด ${summary.total} รายการ<br/>อัปเดต ${summary.updated} รายการ<br/>สำเร็จ ${summary.success} รายการ<br/>ไม่สำเร็จ ${summary.failed} รายการ<br/>ทับรายการ ${summary.overwritten} รายการ<br/>ข้าม (ชำระแล้ว) ${summary.skippedPaid} รายการ<br/>ข้าม (ยังไม่ถึงกำหนด/ไม่มี due) ${summary.skippedNotDue} รายการ`,
      })
    } catch (error) {
      Swal.close()
      await Swal.fire({ icon: 'error', title: 'คำนวณไม่สำเร็จ', text: error.message })
    } finally {
      setProcessingOverdue(false)
    }
  }

  return (
    <div className="pane on houses-compact fees-compact fees-billing-penalty-page">
      <div className="page-header">
        <div className="title-wrap">
          <h1>สร้างใบแจ้งหนี้และคำนวณค่าปรับ</h1>
          <p>สร้างใบแจ้งหนี้ประจำงวด และคำนวณค่าปรับ</p>
        </div>
      </div>

      <section className="workflow" aria-label="Process overview">
        <div className="step-card">
          <div className="step-no">1</div>
          <div>
            <div className="step-title">เลือกปีและรอบ</div>
            <div className="step-desc">กำหนดเงื่อนไขก่อนสร้างใบแจ้งหนี้</div>
          </div>
        </div>
        <div className="step-card">
          <div className="step-no">2</div>
          <div>
            <div className="step-title">สร้างใบแจ้งหนี้</div>
            <div className="step-desc">ค่าส่วนกลางและค่าขยะตาม setup</div>
          </div>
        </div>
        <div className="step-card">
          <div className="step-no">3</div>
          <div>
            <div className="step-title">คำนวณค่าปรับ</div>
            <div className="step-desc">ค่าปรับและค่าทวงถามตามเงื่อนไข</div>
          </div>
        </div>
      </section>

      <section className="main-grid">
        <div>
          <section className="panel">
            <div className="panel-head">
              <h2 className="panel-title">ตั้งค่าเพื่อสร้างใบแจ้งหนี้</h2>
              <div className="panel-subtitle">Invoice Batch Setup</div>
            </div>
            <div className="panel-body">
              <div className="form-grid">
                <div className="field">
                  <label htmlFor="year">ปี (พ.ศ.)</label>
                  <StyledSelect id="year" value={processForm.yearBE} onChange={(e) => setProcessForm((prev) => ({ ...prev, yearBE: e.target.value }))}>
                    {processYearOptions.map((yearBE) => (
                      <option key={yearBE} value={String(yearBE)}>{yearBE}</option>
                    ))}
                  </StyledSelect>
                </div>

                <div className="field">
                  <label htmlFor="round">รอบ</label>
                  <StyledSelect id="round" value={processForm.period} onChange={(e) => setProcessForm((prev) => ({ ...prev, period: e.target.value }))}>
                    {periodOptions.map((item) => (
                      <option key={item.value} value={item.value}>{item.label}</option>
                    ))}
                  </StyledSelect>
                </div>
              </div>

              <div className="formula-box">
                <div className="formula-item">
                  <div className="formula-label">ค่าส่วนกลาง</div>
                  <div className="formula-text">พื้นที่บ้าน × 6 เดือน × อัตรา setup ({Number(setup.fee_rate_per_sqw || 0).toLocaleString('th-TH')})</div>
                </div>
                <div className="formula-item">
                  <div className="formula-label">ค่าขยะ</div>
                  <div className="formula-text">ค่า setup ต่อรอบ ({Number(setup.waste_fee_per_period || 0).toLocaleString('th-TH')})</div>
                </div>
              </div>

              <div className="option-card">
                <div>
                  <div className="check-title">ทับใบที่อยู่สถานะรอตรวจสอบ</div>
                  <div className="check-desc">เปิดใช้เมื่อต้องการสร้างใบแจ้งหนี้ใหม่ทับรายการที่ยังรอตรวจสอบ</div>
                </div>
                <label className="switch">
                  <input
                    type="checkbox"
                    checked={processForm.overwritePending}
                    onChange={(e) => setProcessForm((prev) => ({ ...prev, overwritePending: e.target.checked }))}
                  />
                  <span className="slider"></span>
                </label>
              </div>

              <div className="action-row">
                <button type="button" className="btn-primary" onClick={handleProcessInvoices} disabled={processingInvoice}>
                  {processingInvoice ? 'กำลังสร้าง...' : 'Process สร้างทั้งหมด'}
                </button>
              </div>
            </div>
          </section>

          <section className="panel penalty-panel">
            <div className="panel-head">
              <h2 className="panel-title">คำนวณค่าปรับ</h2>
              <div className="panel-subtitle">Penalty Calculation</div>
            </div>
            <div className="panel-body">
              <div className="penalty-content">
                <div className="penalty-note">
                  คำนวณค่าปรับทั้งระบบและค่าทวงถาม {Number(setup.notice_fee || 0).toLocaleString('th-TH')} บาท และตรวจสอบใบแจ้งหนี้และใบทวงถาม
                </div>
                <button type="button" className="btn-warning" onClick={handleCalculateOverdue} disabled={processingOverdue}>
                  {processingOverdue ? 'กำลังคำนวณ...' : 'คำนวณค่าปรับ'}
                </button>
              </div>
            </div>
          </section>
        </div>

        <aside className="summary-stack">
          <section className="panel">
            <div className="panel-head">
              <h2 className="panel-title">สรุปก่อน Process</h2>
              <div className="panel-subtitle">Preview</div>
            </div>
            <div className="panel-body">
              <div className="mini-summary">
                <div className="stat">
                  <div className="stat-label">ปี พ.ศ.</div>
                  <div className="stat-value">{processForm.yearBE}</div>
                  <div className="stat-note">ปีที่เลือก</div>
                </div>
                <div className="stat">
                  <div className="stat-label">รอบ</div>
                  <div className="stat-value">{periodOptions.find((item) => item.value === processForm.period)?.label || '-'}</div>
                  <div className="stat-note">ช่วงวันที่เรียกเก็บ</div>
                </div>
                <div className="stat">
                  <div className="stat-label">อัตราค่าส่วนกลาง</div>
                  <div className="stat-value">{Number(setup.fee_rate_per_sqw || 0).toLocaleString('th-TH')}</div>
                  <div className="stat-note">บาท / ตร.ว.</div>
                </div>
                <div className="stat">
                  <div className="stat-label">ค่าขยะต่อรอบ</div>
                  <div className="stat-value">{Number(setup.waste_fee_per_period || 0).toLocaleString('th-TH')}</div>
                  <div className="stat-note">บาท / รอบ</div>
                </div>
              </div>
            </div>
          </section>

          <section className="panel">
            <div className="panel-head">
              <h2 className="panel-title">ลำดับการทำงาน</h2>
              <div className="panel-subtitle">Checklist</div>
            </div>
            <div className="panel-body">
              <div className="process-list">
                <div className="process-item">
                  <div className="process-icon">✓</div>
                  <div>
                    <div className="process-name">ตรวจสอบ setup</div>
                    <div className="process-detail">อัตราค่าส่วนกลาง ค่าขยะ และรอบการเรียกเก็บ</div>
                  </div>
                </div>
                <div className="process-item">
                  <div className="process-icon">2</div>
                  <div>
                    <div className="process-name">สร้างใบแจ้งหนี้</div>
                    <div className="process-detail">ระบบสร้างจากข้อมูลบ้านและเงื่อนไขที่เลือก</div>
                  </div>
                </div>
                <div className="process-item">
                  <div className="process-icon">3</div>
                  <div>
                    <div className="process-name">คำนวณค่าปรับ</div>
                    <div className="process-detail">รันหลังตรวจสอบยอดค้างชำระและวันที่ครบกำหนด</div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </aside>
      </section>
    </div>
  )
}