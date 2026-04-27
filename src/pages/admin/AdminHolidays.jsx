import React, { useEffect, useMemo, useState } from 'react'
import StyledSelect from '../../components/StyledSelect'
import Swal from 'sweetalert2'
import { listHolidays, createHoliday, updateHoliday, deleteHoliday } from '../../lib/holidays'
import './AdminDashboard.css'

const WEEKDAYS = [
  { value: 0, label: 'อาทิตย์' },
  { value: 1, label: 'จันทร์' },
  { value: 2, label: 'อังคาร' },
  { value: 3, label: 'พุธ' },
  { value: 4, label: 'พฤหัสบดี' },
  { value: 5, label: 'ศุกร์' },
  { value: 6, label: 'เสาร์' },
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

function formatHolidayDateToBE(isoDate) {
  if (!isoDate) return ''
  const parsed = new Date(isoDate)
  if (!Number.isFinite(parsed.getTime())) return String(isoDate)
  const day = String(parsed.getDate()).padStart(2, '0')
  const month = String(parsed.getMonth() + 1).padStart(2, '0')
  const yearBE = parsed.getFullYear() + 543
  return `${day}/${month}/${yearBE}`
}

function parseHolidayDateFromBE(value) {
  const raw = String(value || '').trim()
  if (!raw) return null

  const parts = raw.includes('/') ? raw.split('/') : raw.split('-')
  if (parts.length !== 3) return null

  const [part1, part2, part3] = parts.map((item) => String(item).trim())
  let day
  let month
  let year

  if (raw.includes('/')) {
    day = Number(part1)
    month = Number(part2)
    year = Number(part3)
  } else {
    year = Number(part1)
    month = Number(part2)
    day = Number(part3)
  }

  if (!Number.isFinite(day) || !Number.isFinite(month) || !Number.isFinite(year)) return null
  if (year > 2400) year -= 543

  const date = new Date(Date.UTC(year, month - 1, day))
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null

  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

export default function AdminHolidays() {
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [yearBE, setYearBE] = useState(String(new Date().getFullYear() + 543))
  const [weeklyRows, setWeeklyRows] = useState([])
  const [fixedRows, setFixedRows] = useState([])
  const [showHolidayModal, setShowHolidayModal] = useState(false)
  const [modalMode, setModalMode] = useState('create')
  const [holidayForm, setHolidayForm] = useState({
    id: '',
    holiday_date: '',
    name: '',
    note: '',
    is_active: true,
  })

  const yearCE = useMemo(() => toCE(yearBE), [yearBE])
  const weeklyWeekdays = useMemo(() => weeklyRows.map((row) => Number(row.weekday)), [weeklyRows])
  const weeklyMap = useMemo(() => {
    return weeklyRows.reduce((acc, row) => {
      acc[row.weekday] = row
      return acc
    }, {})
  }, [weeklyRows])

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
      await Swal.fire({ icon: 'success', title: 'โหลดข้อมูลสำเร็จ', timer: 1000, showConfirmButton: false })
    } catch (err) {
      await Swal.fire({ icon: 'error', title: 'โหลดไม่สำเร็จ', text: err.message })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleToggleWeekly = async (weekday, checked) => {
    if (!yearCE) {
      await Swal.fire({ icon: 'warning', title: 'ปีไม่ถูกต้อง', text: 'กรุณาระบุปี พ.ศ. ให้ถูกต้อง' })
      return
    }

    try {
      setLoading(true)
      if (checked) {
        await createHoliday({
          year: yearCE,
          type: 'weekly',
          weekday,
          name: `วันหยุด ${WEEKDAYS.find((item) => item.value === weekday)?.label || ''}`,
          note: 'วันหยุดประจำสัปดาห์',
          is_active: true,
        })
      } else {
        const row = weeklyMap[weekday]
        if (row?.id) {
          await deleteHoliday(row.id)
        }
      }
      await load()
    } catch (err) {
      await Swal.fire({ icon: 'error', title: 'ไม่สามารถบันทึกได้', text: err.message })
    } finally {
      setLoading(false)
    }
  }

  const openAddHolidayModal = () => {
    setModalMode('create')
    setHolidayForm({ id: '', holiday_date: '', name: '', note: '', is_active: true })
    setShowHolidayModal(true)
  }

  const openEditHolidayModal = (row) => {
    setModalMode('edit')
    setHolidayForm({
      id: row.id,
      holiday_date: formatHolidayDateToBE(row.holiday_date || ''),
      name: row.name || '',
      note: row.note || '',
      is_active: !!row.is_active,
    })
    setShowHolidayModal(true)
  }

  const closeHolidayModal = () => {
    if (saving) return
    setShowHolidayModal(false)
  }

  const saveHoliday = async () => {
    if (!holidayForm.holiday_date) {
      return Swal.fire({ icon: 'warning', title: 'ข้อมูลไม่ครบ', text: 'กรุณาระบุวันที่วันหยุด' })
    }
    if (!holidayForm.name) {
      return Swal.fire({ icon: 'warning', title: 'ข้อมูลไม่ครบ', text: 'กรุณาระบุชื่อวันหยุด' })
    }

    try {
      setSaving(true)
      const parsedHolidayDate = parseHolidayDateFromBE(holidayForm.holiday_date)
      if (!parsedHolidayDate) {
        return Swal.fire({ icon: 'warning', title: 'วันที่ไม่ถูกต้อง', text: 'กรุณากรอกวันที่วันหยุดในรูปแบบ DD/MM/YYYY' })
      }

      const payload = {
        year: yearCE,
        type: 'fixed',
        holiday_date: parsedHolidayDate,
        name: holidayForm.name,
        note: holidayForm.note,
        is_active: !!holidayForm.is_active,
      }
      if (modalMode === 'edit' && holidayForm.id) {
        await updateHoliday(holidayForm.id, payload)
      } else {
        await createHoliday(payload)
      }
      await load()
      setShowHolidayModal(false)
      await Swal.fire({ icon: 'success', title: modalMode === 'edit' ? 'แก้ไขเรียบร้อย' : 'เพิ่มเรียบร้อย', timer: 1000, showConfirmButton: false })
    } catch (err) {
      await Swal.fire({ icon: 'error', title: 'ไม่สามารถบันทึกได้', text: err.message })
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteHoliday = async (id) => {
    const res = await Swal.fire({ icon: 'warning', title: 'ลบวันหยุด?', showCancelButton: true })
    if (!res.isConfirmed) return
    try {
      await deleteHoliday(id)
      await load()
      await Swal.fire({ icon: 'success', title: 'ลบเรียบร้อย', timer: 900, showConfirmButton: false })
    } catch (err) {
      await Swal.fire({ icon: 'error', title: 'ไม่สามารถลบได้', text: err.message })
    }
  }

  return (
    <div className="pane on houses-compact payments-compact settings-pane">
      <div className="ph houses-ph">
        <div className="ph-in">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div className="ph-ico">🗓️</div>
            <div>
              <div className="ph-h1">ตั้งค่าวันหยุดประจำปี</div>
              <div className="ph-sub">กำหนดวันหยุดประจำสัปดาห์และวันหยุดนักขัตฤกษ์</div>
            </div>
          </div>
        </div>
      </div>

      <div className="card houses-main-card">
        <div className="ch houses-list-head houses-main-head">
          <div className="ct">ปีงบประมาณ / ปี พ.ศ.</div>
          <div className="houses-list-actions" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input
              type="number"
              value={yearBE}
              onChange={(e) => setYearBE(e.target.value)}
              style={{ width: 128, padding: '8px 10px', borderRadius: 8, border: '1px solid var(--bd)', background: '#fff' }}
            />
            <button className="btn btn-p btn-sm" type="button" onClick={load}>โหลดปี</button>
          </div>
        </div>
        <div className="cb houses-table-card-body houses-main-body">
          <div style={{ padding: 16, display: 'grid', gap: 16 }}>
            <div style={{ fontWeight: 700, color: 'var(--tx)' }}>วันหยุดประจำสัปดาห์</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 12 }}>
              {WEEKDAYS.map((weekday) => (
                <label key={weekday.value} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 12, border: '1px solid rgba(0,0,0,0.08)', borderRadius: 12, background: '#fff' }}>
                  <input
                    type="checkbox"
                    checked={weeklyWeekdays.includes(weekday.value)}
                    onChange={(e) => handleToggleWeekly(weekday.value, e.target.checked)}
                  />
                  <span>{weekday.label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="card houses-main-card" style={{ marginTop: 16 }}>
        <div className="ch houses-list-head houses-main-head">
          <div className="ct">วันหยุดนักขัตฤกษ์</div>
          <div className="houses-list-actions">
            <button className="btn btn-p btn-sm" type="button" onClick={openAddHolidayModal}>+ เพิ่มวันหยุด</button>
          </div>
        </div>
        <div className="cb houses-table-card-body houses-main-body">
          <div className="houses-table-wrap houses-main-wrap payments-setup-table-wrap houses-desktop-only">
            <table className="tw houses-table houses-main-table" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th>วันที่</th>
                  <th>ชื่อวันหยุด</th>
                  <th>รายละเอียด</th>
                  <th>สถานะ</th>
                  <th style={{ minWidth: 128 }}>การจัดการ</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--mu)' }}>กำลังโหลดข้อมูล...</td></tr>
                ) : fixedRows.length === 0 ? (
                  <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--mu)' }}>ยังไม่มีวันหยุดนักขัตฤกษ์</td></tr>
                ) : fixedRows.map((row) => (
                  <tr key={row.id}>
                    <td>{formatHolidayDateToBE(row.holiday_date) || '-'}</td>
                    <td>{row.name || '-'}</td>
                    <td>{row.note || '-'}</td>
                    <td>{row.is_active ? 'ใช้งาน' : 'ปิด'}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <button className="btn btn-xs btn-a" type="button" onClick={() => openEditHolidayModal(row)}>แก้ไข</button>
                        <button className="btn btn-xs btn-dg" type="button" onClick={() => handleDeleteHoliday(row.id)}>ลบ</button>
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
            ) : fixedRows.length === 0 ? (
              <div className="mcard-empty">ยังไม่มีวันหยุดนักขัตฤกษ์</div>
            ) : fixedRows.map((row) => (
              <div key={row.id} className="mcard">
                <div className="mcard-top">
                  <div className="mcard-title">{row.name || '-'}</div>
                </div>
                <div className="mcard-meta">
                  <span><span className="mcard-label">วันที่</span> {formatHolidayDateToBE(row.holiday_date) || '-'}</span>
                  <span><span className="mcard-label">รายละเอียด</span> {row.note || '-'}</span>
                </div>
                <div className="mcard-actions">
                  <button className="btn btn-a btn-sm" onClick={() => openEditHolidayModal(row)}>แก้ไข</button>
                  <button className="btn btn-dg btn-sm" onClick={() => handleDeleteHoliday(row.id)}>ลบ</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {showHolidayModal && (
        <div className="house-mo">
          <div className="house-md house-md--sm" style={{ height: 'auto', maxHeight: 'min(560px, 88vh)' }}>
            <div className="house-md-head">
              <div>
                <div className="house-md-title">{modalMode === 'edit' ? 'แก้ไขวันหยุดนักขัตฤกษ์' : 'เพิ่มวันหยุดนักขัตฤกษ์'}</div>
                <div className="house-md-sub">กำหนดวันหยุดสำหรับปี {yearBE}</div>
              </div>
            </div>
            <div className="house-md-body" style={{ overflowY: 'auto' }}>
              <section className="house-sec">
                <div className="house-grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <label className="house-field">
                    <span>วันที่</span>
                    <input
                      type="text"
                      placeholder="วว/ดด/ปปปป"
                      value={holidayForm.holiday_date}
                      onChange={(e) => setHolidayForm((prev) => ({ ...prev, holiday_date: e.target.value }))}
                    />
                  </label>
                  <label className="house-field">
                    <span>ชื่อวันหยุด</span>
                    <input
                      value={holidayForm.name}
                      onChange={(e) => setHolidayForm((prev) => ({ ...prev, name: e.target.value }))}
                    />
                  </label>
                  <label className="house-field" style={{ gridColumn: '1 / -1' }}>
                    <span>รายละเอียด</span>
                    <input
                      value={holidayForm.note}
                      onChange={(e) => setHolidayForm((prev) => ({ ...prev, note: e.target.value }))}
                    />
                  </label>
                  <label className="house-field">
                    <span>สถานะ</span>
                    <StyledSelect
                      value={holidayForm.is_active ? '1' : '0'}
                      onChange={(e) => setHolidayForm((prev) => ({ ...prev, is_active: e.target.value === '1' }))}
                    >
                      <option value="1">ใช้งาน</option>
                      <option value="0">ปิด</option>
                    </StyledSelect>
                  </label>
                </div>
              </section>
            </div>
            <div className="house-md-foot">
              <button className="btn btn-p btn-sm" type="button" disabled={saving} onClick={saveHoliday}>{saving ? 'กำลังบันทึก...' : 'บันทึก'}</button>
              <button className="btn btn-g btn-sm" type="button" disabled={saving} onClick={closeHolidayModal}>ยกเลิก</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
