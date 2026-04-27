import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import StyledSelect from '../../../components/StyledSelect'
import Swal from 'sweetalert2'
import { listHolidays } from '../../../lib/holidays'
import './AdminHolidayReport.css'

const MONTH_LABELS = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.']

function twoDigits(value) {
  return String(value).padStart(2, '0')
}

function toBE(yearCE) {
  const year = Number(yearCE)
  return Number.isFinite(year) ? year + 543 : ''
}

function toCE(yearBE) {
  const year = Number(yearBE)
  if (!Number.isFinite(year) || year <= 0) return null
  return year > 2400 ? year - 543 : year
}

function formatHolidayDateToBE(isoDate) {
  if (!isoDate) return ''
  const date = new Date(isoDate)
  if (Number.isNaN(date.getTime())) return ''
  return `${twoDigits(date.getDate())}/${twoDigits(date.getMonth() + 1)}/${date.getFullYear() + 543}`
}

function buildMonthCalendar(year, month) {
  const firstDay = new Date(year, month - 1, 1).getDay()
  const daysInMonth = new Date(year, month, 0).getDate()
  const cells = []
  for (let index = 0; index < 42; index += 1) {
    const day = index - firstDay + 1
    if (day < 1 || day > daysInMonth) {
      cells.push(null)
    } else {
      const date = new Date(year, month - 1, day)
      cells.push({
        isoDate: `${date.getFullYear()}-${twoDigits(date.getMonth() + 1)}-${twoDigits(date.getDate())}`,
        day,
        weekday: date.getDay(),
      })
    }
  }
  return cells
}

function getFixedHolidaysByMonth(rows, year, month) {
  return rows
    .filter((row) => {
      if (!row.holiday_date) return false
      const parts = String(row.holiday_date).split('-')
      return Number(parts[0]) === year && Number(parts[1]) === month
    })
    .sort((a, b) => String(a.holiday_date).localeCompare(String(b.holiday_date)))
}

export default function AdminHolidayCalendarReport() {
  const [loading, setLoading] = useState(false)
  const [yearBE, setYearBE] = useState(String(new Date().getFullYear() + 543))
  const [reportView, setReportView] = useState('month')
  const [reportMonth, setReportMonth] = useState(new Date().getMonth() + 1)
  const [weeklyRows, setWeeklyRows] = useState([])
  const [fixedRows, setFixedRows] = useState([])

  const yearCE = useMemo(() => toCE(yearBE), [yearBE])
  const selectedReportMonth = Number(reportMonth) || 1
  const monthCalendar = useMemo(() => buildMonthCalendar(yearCE, selectedReportMonth), [yearCE, selectedReportMonth])
  const weeklyHolidaySet = useMemo(() => new Set(weeklyRows.map((row) => Number(row.weekday))), [weeklyRows])
  const fixedHolidayMap = useMemo(() => {
    const map = new Map()
    fixedRows.forEach((row) => {
      if (row?.holiday_date) map.set(row.holiday_date, row)
    })
    return map
  }, [fixedRows])
  const monthFixedHolidays = useMemo(
    () => getFixedHolidaysByMonth(fixedRows, yearCE, selectedReportMonth),
    [fixedRows, yearCE, selectedReportMonth],
  )

  const load = async () => {
    if (!yearCE) {
      await Swal.fire({ icon: 'warning', title: 'ปีไม่ถูกต้อง', text: 'กรุณาระบุปี พ.ศ. ให้ถูกต้อง' })
      return
    }

    try {
      setLoading(true)
      const data = await listHolidays(yearCE)
      setWeeklyRows(data.filter((item) => item.type === 'weekly'))
      setFixedRows(data.filter((item) => item.type === 'fixed'))
    } catch (error) {
      await Swal.fire({ icon: 'error', title: 'โหลดไม่สำเร็จ', text: error.message })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="pane on reports-compact holiday-report-page">
      <div className="ph">
        <div className="ph-in">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div className="ph-ico">🗓️</div>
            <div>
              <div className="ph-h1">ปฏิทินวันหยุดประจำปี</div>
              <div className="ph-sub">ดูวันหยุดประจำสัปดาห์และวันหยุดนักขัตฤกษ์เป็นปฏิทิน</div>
            </div>
          </div>
          <div className="ph-acts">
            <Link to="/admin/reports" className="btn btn-a btn-sm">กลับไปหน้ารายงาน</Link>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="ch houses-list-head houses-main-head">
          <div className="ct">ตัวเลือกการแสดงผล</div>
          <div className="houses-list-actions" style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <StyledSelect value={reportView} onChange={(e) => setReportView(e.target.value)} style={{ minWidth: 160 }}>
              <option value="month">แสดงเป็นเดือน</option>
              <option value="year">แสดงทั้งปี</option>
            </StyledSelect>
            {reportView === 'month' && (
              <StyledSelect value={String(reportMonth)} onChange={(e) => setReportMonth(Number(e.target.value))} style={{ minWidth: 140 }}>
                {MONTH_LABELS.map((label, index) => (
                  <option key={label} value={index + 1}>{label}</option>
                ))}
              </StyledSelect>
            )}
            <input
              type="number"
              value={yearBE}
              onChange={(e) => setYearBE(e.target.value)}
              className="holiday-report-year-input"
              placeholder="ปี พ.ศ."
            />
            <button className="btn btn-p btn-sm" type="button" onClick={load} disabled={loading}>{loading ? 'โหลด...' : 'โหลดปี'}</button>
          </div>
        </div>
        <div className="cb holiday-report-card-body">
          {reportView === 'month' ? (
            <div className="holiday-report-month-view">
              <div className="holiday-report-calendar-panel">
                <div className="holiday-report-calendar-header">{`${MONTH_LABELS[selectedReportMonth - 1] || ''} ${yearBE}`}</div>
                <div className="holiday-calendar-grid">
                  {['อ', 'จ', 'อ', 'พ', 'พ', 'ศ', 'ส'].map((label) => (
                    <div key={label} className="holiday-calendar-weekday-cell">{label}</div>
                  ))}
                  {monthCalendar.map((cell, index) => {
                    if (!cell) {
                      return <div key={index} className="holiday-calendar-cell holiday-calendar-cell--empty" />
                    }
                    const isFixed = fixedHolidayMap.has(cell.isoDate)
                    const isWeekly = !isFixed && weeklyHolidaySet.has(cell.weekday)
                    return (
                      <div
                        key={cell.isoDate}
                        className={`holiday-calendar-cell ${isFixed ? 'holiday-calendar-cell--fixed' : ''} ${isWeekly ? 'holiday-calendar-cell--weekly' : ''}`}
                        title={isFixed ? fixedHolidayMap.get(cell.isoDate)?.name || 'วันหยุดนักขัตฤกษ์' : isWeekly ? 'วันหยุดประจำสัปดาห์' : ''}
                      >
                        {cell.day}
                      </div>
                    )
                  })}
                </div>
                <div className="holiday-report-legend">
                  <span><span className="holiday-legend-dot holiday-legend-dot--weekly" />วันหยุดประจำสัปดาห์</span>
                  <span><span className="holiday-legend-dot holiday-legend-dot--fixed" />วันหยุดประเพณี</span>
                </div>
              </div>
              <div className="holiday-report-details-panel">
                <div className="holiday-report-details-title">วันหยุดประเพณีเดือน {MONTH_LABELS[selectedReportMonth - 1] || ''}</div>
                {monthFixedHolidays.length === 0 ? (
                  <div className="holiday-report-empty">ไม่มีวันหยุดประเพณีในเดือนนี้</div>
                ) : (
                  <div className="holiday-report-details-list">
                    {monthFixedHolidays.map((row) => (
                      <div key={row.id} className="holiday-report-details-row">
                        <span>{formatHolidayDateToBE(row.holiday_date)}</span>
                        <strong>{row.name}</strong>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="holiday-report-year-view">
              <div className="holiday-report-legend holiday-report-legend--year">
                <span><span className="holiday-legend-dot holiday-legend-dot--weekly" />วันหยุดประจำสัปดาห์</span>
                <span><span className="holiday-legend-dot holiday-legend-dot--fixed" />วันหยุดประเพณี</span>
              </div>
              <div className="holiday-year-grid">
                {Array.from({ length: 12 }).map((_, index) => {
                  const monthIndex = index + 1
                  const monthCells = buildMonthCalendar(yearCE, monthIndex)
                  return (
                    <div key={monthIndex} className="holiday-year-month">
                      <div className="holiday-year-month-title">{MONTH_LABELS[monthIndex - 1]}</div>
                      <div className="holiday-year-month-grid">
                        {['อ', 'จ', 'อ', 'พ', 'พ', 'ศ', 'ส'].map((label) => (
                          <div key={`${monthIndex}-${label}`} className="holiday-year-month-weekday">{label}</div>
                        ))}
                        {monthCells.map((cell, cellIndex) => {
                          if (!cell) {
                            return <div key={`${monthIndex}-${cellIndex}`} className="holiday-year-month-cell holiday-year-month-cell--empty" />
                          }

                          const isFixed = fixedHolidayMap.has(cell.isoDate)
                          const isWeekly = !isFixed && weeklyHolidaySet.has(cell.weekday)
                          return (
                            <div
                              key={cell.isoDate}
                              className={`holiday-year-month-cell ${isFixed ? 'holiday-year-month-cell--fixed' : ''} ${isWeekly ? 'holiday-year-month-cell--weekly' : ''}`}
                            >
                              {cell.day}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
