import React, { useEffect, useState } from 'react'
import Swal from 'sweetalert2'
import { getSystemConfig, updateSystemConfig } from '../../lib/systemConfig'

const NUMBER_FIELDS = [
  'fee_rate_per_sqw',
  'fee_periods_per_year',
  'fee_due_day',
  'waste_fee_per_period',
  'parking_fee_per_vehicle',
  'early_pay_discount_pct',
  'overdue_fine_pct',
  'overdue_grace_days',
  'notice_fee',
  'zone_count',
  'total_houses',
  'common_parking_slots',
]

const AdminConfig = () => {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [configId, setConfigId] = useState('')
  const [form, setForm] = useState({})

  useEffect(() => {
    const loadConfig = async () => {
      try {
        setLoading(true)
        const config = await getSystemConfig()
        setConfigId(config.id)
        setForm(config)
      } catch (error) {
        await Swal.fire({ icon: 'error', title: 'โหลดค่าระบบไม่สำเร็จ', text: error.message })
      } finally {
        setLoading(false)
      }
    }

    loadConfig()
  }, [])

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target
    if (NUMBER_FIELDS.includes(name)) {
      setForm((prev) => ({ ...prev, [name]: value }))
      return
    }

    if (type === 'checkbox') {
      setForm((prev) => ({ ...prev, [name]: checked }))
      return
    }

    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleSave = async () => {
    if (!configId) return

    try {
      setSaving(true)
      const payload = { ...form }
      NUMBER_FIELDS.forEach((field) => {
        payload[field] = Number(payload[field] || 0)
      })

      const updated = await updateSystemConfig(configId, payload)
      setForm(updated)
      await Swal.fire({ icon: 'success', title: 'บันทึกสำเร็จ', timer: 1200, showConfirmButton: false })
    } catch (error) {
      await Swal.fire({ icon: 'error', title: 'บันทึกไม่สำเร็จ', text: error.message })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="pane on">
      <div className="ph">
        <div className="ph-in">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div className="ph-ico">⚙️</div>
            <div>
              <div className="ph-h1">Config ระบบ</div>
              <div className="ph-sub">ตั้งค่าการทำงานของระบบ</div>
            </div>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: '16px' }}>
        <div className="ch"><div className="ct">ตั้งค่าระบบ (system_config)</div></div>
        <div className="cb">
          {loading ? (
            <div style={{ color: 'var(--mu)' }}>กำลังโหลดข้อมูล...</div>
          ) : (
            <>
              <div className="house-sec" style={{ paddingTop: 0 }}>
                <div className="house-sec-title">1) ข้อมูลนิติบุคคล</div>
                <div className="house-grid house-grid-3">
                  <label className="house-field">
                    <span>ชื่อหมู่บ้าน</span>
                    <input name="village_name" value={form.village_name || ''} onChange={handleChange} />
                  </label>
                  <label className="house-field house-field-span-2">
                    <span>ชื่อนิติบุคคล</span>
                    <input name="juristic_name" value={form.juristic_name || ''} onChange={handleChange} />
                  </label>
                  <label className="house-field">
                    <span>โทรนิติบุคคล</span>
                    <input name="juristic_phone" value={form.juristic_phone || ''} onChange={handleChange} />
                  </label>
                  <label className="house-field">
                    <span>อีเมลนิติบุคคล</span>
                    <input name="juristic_email" value={form.juristic_email || ''} onChange={handleChange} />
                  </label>
                  <label className="house-field">
                    <span>ธนาคาร</span>
                    <input name="bank_name" value={form.bank_name || ''} onChange={handleChange} />
                  </label>
                  <label className="house-field">
                    <span>เลขบัญชี</span>
                    <input name="bank_account_no" value={form.bank_account_no || ''} onChange={handleChange} />
                  </label>
                  <label className="house-field house-field-span-2">
                    <span>ชื่อบัญชี</span>
                    <input name="bank_account_name" value={form.bank_account_name || ''} onChange={handleChange} />
                  </label>
                </div>
              </div>

              <div className="house-sec">
                <div className="house-sec-title">2) การคำนวณค่าส่วนกลาง</div>
                <div className="house-grid house-grid-3">
                  <label className="house-field"><span>อัตราค่าส่วนกลาง/ตร.ว.</span><input type="number" name="fee_rate_per_sqw" value={form.fee_rate_per_sqw ?? ''} onChange={handleChange} /></label>
                  <label className="house-field"><span>รอบเก็บ/ปี</span><input type="number" name="fee_periods_per_year" value={form.fee_periods_per_year ?? ''} onChange={handleChange} /></label>
                  <label className="house-field"><span>วันครบกำหนดชำระ</span><input type="number" name="fee_due_day" value={form.fee_due_day ?? ''} onChange={handleChange} /></label>
                  <label className="house-field"><span>ค่าขยะ/รอบ</span><input type="number" name="waste_fee_per_period" value={form.waste_fee_per_period ?? ''} onChange={handleChange} /></label>
                  <label className="house-field"><span>ค่าจอด/คัน</span><input type="number" name="parking_fee_per_vehicle" value={form.parking_fee_per_vehicle ?? ''} onChange={handleChange} /></label>
                  <label className="house-field"><span>ส่วนลดจ่ายเร็ว (%)</span><input type="number" name="early_pay_discount_pct" value={form.early_pay_discount_pct ?? ''} onChange={handleChange} /></label>
                  <label className="house-field"><span>ค่าปรับค้างชำระ (%)</span><input type="number" name="overdue_fine_pct" value={form.overdue_fine_pct ?? ''} onChange={handleChange} /></label>
                  <label className="house-field"><span>ผ่อนผัน (วัน)</span><input type="number" name="overdue_grace_days" value={form.overdue_grace_days ?? ''} onChange={handleChange} /></label>
                  <label className="house-field"><span>ค่าทวงถาม</span><input type="number" name="notice_fee" value={form.notice_fee ?? ''} onChange={handleChange} /></label>
                  <label className="house-field house-field-span-3">
                    <span>ข้อความท้ายใบแจ้งหนี้</span>
                    <textarea name="invoice_message" value={form.invoice_message || ''} onChange={handleChange} rows="2" />
                  </label>
                </div>
              </div>

              <div className="house-sec">
                <div className="house-sec-title">3) โซน / เฟส</div>
                <div className="house-grid house-grid-3">
                  <label className="house-field"><span>จำนวนโซน</span><input type="number" name="zone_count" value={form.zone_count ?? ''} onChange={handleChange} /></label>
                  <label className="house-field"><span>จำนวนบ้านทั้งหมด</span><input type="number" name="total_houses" value={form.total_houses ?? ''} onChange={handleChange} /></label>
                  <label className="house-field"><span>ที่จอดส่วนกลาง</span><input type="number" name="common_parking_slots" value={form.common_parking_slots ?? ''} onChange={handleChange} /></label>
                </div>
              </div>

              <div className="house-sec" style={{ borderBottom: 0, paddingBottom: 0 }}>
                <div className="house-sec-title">4) ตั้งค่าระบบ</div>
                <div className="house-grid house-grid-3">
                  <label className="house-field">
                    <span>รูปแบบวันที่</span>
                    <input name="date_format" value={form.date_format || ''} onChange={handleChange} />
                  </label>
                  <label className="house-field">
                    <span>ภาษา</span>
                    <input name="system_language" value={form.system_language || ''} onChange={handleChange} />
                  </label>
                  <div className="house-field" style={{ justifyContent: 'flex-end' }}>
                    <label style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <input type="checkbox" name="enable_marketplace" checked={Boolean(form.enable_marketplace)} onChange={handleChange} />
                      เปิด Marketplace
                    </label>
                    <label style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '8px' }}>
                      <input type="checkbox" name="enable_technicians" checked={Boolean(form.enable_technicians)} onChange={handleChange} />
                      เปิดทำเนียบช่าง
                    </label>
                  </div>
                </div>
              </div>

              <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end' }}>
                <button className="btn btn-p" onClick={handleSave} disabled={saving}>
                  {saving ? 'กำลังบันทึก...' : 'บันทึกการตั้งค่า'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default AdminConfig
