import React, { useEffect, useMemo, useState } from 'react'
import StyledSelect from '../../components/StyledSelect'
import Swal from 'sweetalert2'
import { useAuth } from '../../contexts/AuthContext'
import { getPaymentCycleConfigByYear, savePaymentCycleConfig } from '../../lib/paymentCycles'
import './AdminDashboard.css'
import './AdminPaymentCycles.css'

const FREQUENCY_OPTIONS = [
  { value: 'monthly', label: 'รายเดือน (12 รอบ/ปี)' },
  { value: 'quarterly', label: 'รายไตรมาส (4 รอบ/ปี)' },
  { value: 'half_yearly', label: 'รายครึ่งปี (2 รอบ/ปี)' },
  { value: 'yearly', label: 'รายปี (12 รายการ/ปี)' },
]

function toBE(yearCE) {
  const year = Number(yearCE)
  return Number.isFinite(year) ? year + 543 : ''
}

function toCE(yearBE) {
  const year = Number(yearBE)
  if (!Number.isFinite(year) || year <= 0) return null
  return year > 2400 ? year - 543 : year
}

function twoDigits(value) {
  return String(value).padStart(2, '0')
}

function formatDateBE(isoValue) {
  if (!isoValue) return ''
  const date = new Date(isoValue)
  if (Number.isNaN(date.getTime())) return ''
  const day = twoDigits(date.getDate())
  const month = twoDigits(date.getMonth() + 1)
  const yearBE = date.getFullYear() + 543
  return `${day}/${month}/${yearBE}`
}

function DateInputBE({ value, onChange, disabled = false, className = '' }) {
  const displayText = value ? formatDateBE(value) : 'วว/ดด/ปปปป'
  return (
    <label className="fi-date-wrap">
      <input
        className={`${className} fi-date-native`.trim()}
        type="date"
        lang="th-TH-u-ca-buddhist"
        value={value || ''}
        onChange={onChange}
        disabled={disabled}
      />
      <span className={`fi-date-be ${disabled ? 'is-disabled' : ''} ${value ? '' : 'is-placeholder'}`}>{displayText}</span>
    </label>
  )
}

function isoDate(year, month, day) {
  return `${year}-${twoDigits(month)}-${twoDigits(day)}`
}

function lastDayOfMonth(year, month) {
  return new Date(year, month, 0).getDate()
}

function nextMonthYear(year, month) {
  if (month === 12) return { year: year + 1, month: 1 }
  return { year, month: month + 1 }
}

function templateFromFrequency(frequency, baseYearCE) {
  const year = Number(baseYearCE)
  if (!Number.isFinite(year)) return []

  if (frequency === 'monthly') {
    return Array.from({ length: 12 }).map((_, index) => {
      const month = index + 1
      const start = isoDate(year, month, 1)
      const end = isoDate(year, month, lastDayOfMonth(year, month))
      const next = nextMonthYear(year, month)
      const due = isoDate(next.year, next.month, lastDayOfMonth(next.year, next.month))
      return {
        seq_no: month,
        period_label: `รอบที่ ${month}`,
        start_date: start,
        end_date: end,
        due_date: due,
        due_year_offset: next.year - year,
        enable_penalty: false,
        penalty_start_date: isoDate(next.year, next.month, 1),
        penalty_year_offset: next.year - year,
      }
    })
  }

  if (frequency === 'quarterly') {
    const quarterMonths = [
      { start: 1, end: 3, dueMonth: 4 },
      { start: 4, end: 6, dueMonth: 7 },
      { start: 7, end: 9, dueMonth: 10 },
      { start: 10, end: 12, dueMonth: 1 },
    ]

    return quarterMonths.map((item, index) => {
      const dueYear = item.dueMonth === 1 ? year + 1 : year
      const penaltyMonth = item.dueMonth === 12 ? 1 : item.dueMonth + 1
      const penaltyYear = item.dueMonth === 12 || (item.dueMonth === 1 && penaltyMonth === 2) ? dueYear : dueYear
      return {
        seq_no: index + 1,
        period_label: `รอบที่ ${index + 1}`,
        start_date: isoDate(year, item.start, 1),
        end_date: isoDate(year, item.end, lastDayOfMonth(year, item.end)),
        due_date: isoDate(dueYear, item.dueMonth, lastDayOfMonth(dueYear, item.dueMonth)),
        due_year_offset: dueYear - year,
        enable_penalty: false,
        penalty_start_date: isoDate(penaltyYear, penaltyMonth, 1),
        penalty_year_offset: penaltyYear - year,
      }
    })
  }

  if (frequency === 'half_yearly') {
    return [
      {
        seq_no: 1,
        period_label: 'รอบที่ 1',
        start_date: isoDate(year, 1, 1),
        end_date: isoDate(year, 6, 30),
        due_date: isoDate(year, 7, 31),
        due_year_offset: 0,
        enable_penalty: false,
        penalty_start_date: isoDate(year, 8, 1),
        penalty_year_offset: 0,
      },
      {
        seq_no: 2,
        period_label: 'รอบที่ 2',
        start_date: isoDate(year, 8, 1),
        end_date: isoDate(year, 12, 31),
        due_date: isoDate(year + 1, 1, 31),
        due_year_offset: 1,
        enable_penalty: false,
        penalty_start_date: isoDate(year + 1, 2, 1),
        penalty_year_offset: 1,
      },
    ]
  }

  return Array.from({ length: 12 }).map((_, index) => {
    const month = index + 1
    const start = isoDate(year, month, 1)
    const end = isoDate(year, month, lastDayOfMonth(year, month))
    const next = nextMonthYear(year, month)
    const due = isoDate(next.year, next.month, lastDayOfMonth(next.year, next.month))
    return {
      seq_no: month,
      period_label: `รอบที่ ${month}`,
      start_date: start,
      end_date: end,
      due_date: due,
      due_year_offset: next.year - year,
      enable_penalty: false,
      penalty_start_date: isoDate(next.year, next.month, 1),
      penalty_year_offset: next.year - year,
    }
  })
}

export default function AdminPaymentCycles() {
  const { profile } = useAuth()
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [frequency, setFrequency] = useState('half_yearly')
  const [yearBE, setYearBE] = useState(String(new Date().getFullYear() + 543))
  const [periods, setPeriods] = useState(() => templateFromFrequency('half_yearly', new Date().getFullYear()))
  const [earlyFullYearDiscountPct, setEarlyFullYearDiscountPct] = useState('0')
  const [earlyFullYearDiscountDeadline, setEarlyFullYearDiscountDeadline] = useState('')

  const yearCE = useMemo(() => toCE(yearBE), [yearBE])

  const regenerateRows = () => {
    if (!yearCE) return
    setPeriods(templateFromFrequency(frequency, yearCE))
  }

  useEffect(() => {
    regenerateRows()
  }, [frequency, yearCE])

  useEffect(() => {
    loadByYear()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadByYear = async () => {
    if (!yearCE) {
      await Swal.fire({ icon: 'warning', title: 'ปีไม่ถูกต้อง', text: 'กรุณาระบุปีให้ถูกต้อง' })
      return
    }

    try {
      setLoading(true)
      const config = await getPaymentCycleConfigByYear(yearCE)
      if (!config) {
        regenerateRows()
        setEarlyFullYearDiscountPct('0')
        setEarlyFullYearDiscountDeadline('')
        await Swal.fire({ icon: 'info', title: 'ยังไม่มีข้อมูลปีนี้', text: 'ระบบสร้างรายการตามรอบที่เลือกให้แล้ว' })
        return
      }

      setFrequency(config.frequency || 'half_yearly')
      setEarlyFullYearDiscountPct(String(Number(config.early_full_year_discount_pct || 0)))
      setEarlyFullYearDiscountDeadline(config.early_full_year_discount_deadline || '')
      setPeriods((config.periods || []).map((row) => ({
        seq_no: row.seq_no,
        period_label: row.period_label,
        start_date: row.start_date,
        end_date: row.end_date,
        due_date: row.due_date,
        due_year_offset: row.due_year_offset ?? 0,
        enable_penalty: Boolean(row.enable_penalty),
        penalty_start_date: row.penalty_start_date,
        penalty_year_offset: row.penalty_year_offset ?? 0,
      })))
      await Swal.fire({ icon: 'success', title: 'โหลดสำเร็จ', timer: 1100, showConfirmButton: false })
    } catch (error) {
      await Swal.fire({ icon: 'error', title: 'โหลดไม่สำเร็จ', text: error.message })
    } finally {
      setLoading(false)
    }
  }

  const updatePeriod = (index, key, value) => {
    setPeriods((current) => current.map((item, i) => (i === index ? { ...item, [key]: value } : item)))
  }

  const togglePenalty = (index, checked) => {
    setPeriods((current) => current.map((item, i) => {
      if (i !== index) return item
      return {
        ...item,
        enable_penalty: checked,
        penalty_start_date: checked ? item.penalty_start_date : null,
      }
    }))
  }

  const validate = () => {
    if (!yearCE) return 'ปีไม่ถูกต้อง'
    if (!Array.isArray(periods) || periods.length === 0) return 'ไม่มีรายการรอบให้บันทึก'

    const discountPct = Number(earlyFullYearDiscountPct || 0)
    if (!Number.isFinite(discountPct) || discountPct < 0 || discountPct > 100) {
      return 'เปอร์เซ็นต์ส่วนลดเต็มปีต้องอยู่ระหว่าง 0 ถึง 100'
    }

    for (const row of periods) {
      if (!row.start_date || !row.end_date || !row.due_date) {
        return `กรุณากรอกวันที่ให้ครบใน ${row.period_label || `รอบที่ ${row.seq_no}`}`
      }
      if (new Date(row.end_date).getTime() < new Date(row.start_date).getTime()) {
        return `${row.period_label || `รอบที่ ${row.seq_no}`}: วันที่สิ้นสุดต้องไม่ก่อนวันที่เริ่มต้น`
      }
      if (row.enable_penalty && !row.penalty_start_date) {
        return `${row.period_label || `รอบที่ ${row.seq_no}`}: กรุณากรอกวันเริ่มคิดค่าปรับ`
      }
    }

    return null
  }

  const handleSave = async () => {
    const errorText = validate()
    if (errorText) {
      await Swal.fire({ icon: 'warning', title: 'ข้อมูลไม่ครบ', text: errorText })
      return
    }

    try {
      setSaving(true)
      await savePaymentCycleConfig({
        yearCE,
        frequency,
        periods,
        profileId: profile?.id || null,
        earlyFullYearDiscountPct: Number(earlyFullYearDiscountPct || 0),
        earlyFullYearDiscountDeadline: earlyFullYearDiscountDeadline || null,
      })
      await Swal.fire({ icon: 'success', title: 'บันทึกสำเร็จ', text: 'บันทึกกำหนดรอบการชำระเรียบร้อยแล้ว', timer: 1300, showConfirmButton: false })
    } catch (error) {
      await Swal.fire({ icon: 'error', title: 'บันทึกไม่สำเร็จ', text: error.message })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="pane on houses-compact payment-cycles-pane settings-pane">
      <div className="ph">
        <div className="ph-in">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div className="ph-ico">🗓️</div>
            <div>
              <div className="ph-h1">กำหนดรอบการชำระ</div>
              <div className="ph-sub">ตั้งค่ารอบจ่ายค่าส่วนกลางรายปี และสร้างรายการตามรูปแบบที่เลือก</div>
            </div>
          </div>
        </div>
      </div>

      <div className="card houses-main-card">
        <div className="vms-panel-toolbar payment-cycles-toolbar" style={{ flexWrap: 'wrap' }}>
          <div className="vms-toolbar-left payment-cycles-toolbar-left" style={{ flexWrap: 'wrap' }}>
            <input
              className="fi payment-cycles-year"
              value={yearBE}
              onChange={(event) => setYearBE(event.target.value.replace(/[^0-9]/g, '').slice(0, 4))}
              placeholder="ปี พ.ศ."
              style={{ height: 32, fontSize: 12, borderRadius: 8, border: '1.5px solid #d1d5e0', padding: '0 8px', width: 80, flexShrink: 0 }}
            />
            <div style={{ width: 200, flexShrink: 0 }}>
              <StyledSelect compact className="payment-cycles-frequency" value={frequency} onChange={(event) => setFrequency(event.target.value)}>
                {FREQUENCY_OPTIONS.map((item) => (
                  <option key={item.value} value={item.value}>{item.label}</option>
                ))}
              </StyledSelect>
            </div>
            <label className="payment-cycles-inline-field">
              <span style={{ whiteSpace: 'nowrap' }}>ส่วนลด&nbsp;%</span>
              <input
                type="number" min="0" max="100" step="0.01"
                value={earlyFullYearDiscountPct}
                onChange={(event) => setEarlyFullYearDiscountPct(event.target.value)}
                style={{ height: 32, fontSize: 12, borderRadius: 8, border: '1.5px solid #d1d5e0', padding: '0 6px', width: 64 }}
              />
            </label>
            <div className="payment-cycles-inline-field">
              <span style={{ whiteSpace: 'nowrap' }}>ชำระก่อน</span>
              <div style={{ width: 160, flexShrink: 0 }}>
                <DateInputBE
                  className="fi"
                  value={earlyFullYearDiscountDeadline}
                  onChange={(event) => setEarlyFullYearDiscountDeadline(event.target.value)}
                />
              </div>
            </div>
          </div>
          <div className="vms-toolbar-right">
            <button className="vms-sm-btn vms-sm-btn--primary" type="button" onClick={regenerateRows} disabled={loading || saving}>สร้างรายการตามรอบ</button>
            <button className="vms-sm-btn vms-sm-btn--primary" type="button" onClick={loadByYear} disabled={loading || saving}>{loading ? 'กำลังโหลด...' : 'โหลดจากปีนี้'}</button>
            <button className="vms-sm-btn vms-sm-btn--primary" type="button" onClick={handleSave} disabled={loading || saving}>{saving ? 'กำลังบันทึก...' : 'บันทึกกำหนดรอบ'}</button>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="ch">
          <div className="ch-ico">📌</div>
          <div className="ct">รายการรอบชำระ ({periods.length} รอบ)</div>
        </div>

        <div className="cb payment-cycles-table-wrap">
          {/* Desktop table */}
          <div className="payment-cycles-desktop-only" style={{ overflowX: 'auto' }}>
            <table className="tw houses-table" style={{ minWidth: '1200px', width: '100%' }}>
              <thead>
                <tr>
                  <th style={{ width: 90 }}>รอบ</th>
                  <th>วันที่เริ่ม</th>
                  <th>วันที่สิ้นสุด</th>
                  <th>จ่ายภายใน</th>
                  <th style={{ width: 120 }}>ปีชำระ</th>
                  <th style={{ width: 120 }}>คิดค่าปรับ</th>
                  <th>เริ่มคิดค่าปรับ</th>
                  <th style={{ width: 120 }}>ปีค่าปรับ</th>
                </tr>
              </thead>
              <tbody>
                {periods.map((row, index) => (
                  <tr key={`period-${row.seq_no}`}>
                    <td>{row.period_label}</td>
                    <td><DateInputBE className="fi" value={row.start_date || ''} onChange={(event) => updatePeriod(index, 'start_date', event.target.value)} /></td>
                    <td><DateInputBE className="fi" value={row.end_date || ''} onChange={(event) => updatePeriod(index, 'end_date', event.target.value)} /></td>
                    <td><DateInputBE className="fi" value={row.due_date || ''} onChange={(event) => updatePeriod(index, 'due_date', event.target.value)} /></td>
                    <td>
                      <StyledSelect value={String(row.due_year_offset || 0)} onChange={(event) => updatePeriod(index, 'due_year_offset', Number(event.target.value))}>
                        <option value="0">ภายในปี</option>
                        <option value="1">ปีถัดไป</option>
                      </StyledSelect>
                    </td>
                    <td>
                      <label className="payment-cycles-checkbox">
                        <input type="checkbox" checked={Boolean(row.enable_penalty)} onChange={(event) => togglePenalty(index, event.target.checked)} />
                        <span>คิดค่าปรับ</span>
                      </label>
                    </td>
                    <td>
                      <DateInputBE
                        className="fi"
                        value={row.penalty_start_date || ''}
                        onChange={(event) => updatePeriod(index, 'penalty_start_date', event.target.value)}
                        disabled={!row.enable_penalty}
                      />
                    </td>
                    <td>
                      <StyledSelect value={String(row.penalty_year_offset || 0)} onChange={(event) => updatePeriod(index, 'penalty_year_offset', Number(event.target.value))} disabled={!row.enable_penalty}>
                        <option value="0">ภายในปี</option>
                        <option value="1">ปีถัดไป</option>
                      </StyledSelect>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Mobile card view */}
          <div className="payment-cycles-mobile-only">
            {periods.map((row, index) => (
              <div key={`mcard-${row.seq_no}`} className="pc-mcard">
                <div className="pc-mcard-title">{row.period_label}</div>
                <div className="pc-mcard-grid">
                  <div className="pc-mcard-field">
                    <span className="pc-mcard-label">วันที่เริ่ม</span>
                    <DateInputBE className="fi" value={row.start_date || ''} onChange={(event) => updatePeriod(index, 'start_date', event.target.value)} />
                  </div>
                  <div className="pc-mcard-field">
                    <span className="pc-mcard-label">วันที่สิ้นสุด</span>
                    <DateInputBE className="fi" value={row.end_date || ''} onChange={(event) => updatePeriod(index, 'end_date', event.target.value)} />
                  </div>
                  <div className="pc-mcard-field">
                    <span className="pc-mcard-label">จ่ายภายใน</span>
                    <DateInputBE className="fi" value={row.due_date || ''} onChange={(event) => updatePeriod(index, 'due_date', event.target.value)} />
                  </div>
                  <div className="pc-mcard-field">
                    <span className="pc-mcard-label">ปีชำระ</span>
                    <StyledSelect value={String(row.due_year_offset || 0)} onChange={(event) => updatePeriod(index, 'due_year_offset', Number(event.target.value))}>
                      <option value="0">ภายในปี</option>
                      <option value="1">ปีถัดไป</option>
                    </StyledSelect>
                  </div>
                </div>
                <div className="pc-mcard-penalty">
                  <label className="payment-cycles-checkbox">
                    <input type="checkbox" checked={Boolean(row.enable_penalty)} onChange={(event) => togglePenalty(index, event.target.checked)} />
                    <span>คิดค่าปรับ</span>
                  </label>
                  {row.enable_penalty && (
                    <div className="pc-mcard-grid" style={{ marginTop: 8 }}>
                      <div className="pc-mcard-field">
                        <span className="pc-mcard-label">เริ่มคิดค่าปรับ</span>
                        <DateInputBE className="fi" value={row.penalty_start_date || ''} onChange={(event) => updatePeriod(index, 'penalty_start_date', event.target.value)} />
                      </div>
                      <div className="pc-mcard-field">
                        <span className="pc-mcard-label">ปีค่าปรับ</span>
                        <StyledSelect value={String(row.penalty_year_offset || 0)} onChange={(event) => updatePeriod(index, 'penalty_year_offset', Number(event.target.value))}>
                          <option value="0">ภายในปี</option>
                          <option value="1">ปีถัดไป</option>
                        </StyledSelect>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

    </div>
  )
}
