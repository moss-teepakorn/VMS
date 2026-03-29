import React, { useEffect, useState } from 'react'
import Swal from 'sweetalert2'
import {
  buildSystemAssetPublicUrl,
  deleteSystemAssetByPath,
  extractSystemAssetPath,
  getSystemConfig,
  syncPublicSetupConfig,
  updateSystemConfig,
  uploadVillageLogo,
  uploadJuristicSignature,
} from '../../lib/systemConfig'

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

const MAX_LOGIN_LOGO_BYTES = 50 * 1024

async function readImageFromFile(file) {
  const dataUrl = await new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })

  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = reject
    image.src = dataUrl
  })
}

async function compressImageToMaxBytes(file, maxBytes) {
  if (!file || file.size <= maxBytes) return file
  const image = await readImageFromFile(file)

  let width = image.width
  let height = image.height
  let quality = 0.9
  let blob = null

  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  if (!ctx) return file

  for (let attempt = 0; attempt < 14; attempt += 1) {
    canvas.width = Math.max(120, Math.round(width))
    canvas.height = Math.max(120, Math.round(height))
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height)

    blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality))
    if (!blob) break
    if (blob.size <= maxBytes) {
      return new File([blob], `login-logo-${Date.now()}.jpg`, { type: 'image/jpeg' })
    }

    if (quality > 0.45) {
      quality -= 0.08
    } else {
      width *= 0.88
      height *= 0.88
    }
  }

  if (blob) {
    return new File([blob], `login-logo-${Date.now()}.jpg`, { type: 'image/jpeg' })
  }
  return file
}

const AdminConfig = () => {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [configId, setConfigId] = useState('')
  const [form, setForm] = useState({})
  const [signatureFile, setSignatureFile] = useState(null)
  const [signaturePreviewUrl, setSignaturePreviewUrl] = useState('')
  const [removeSignature, setRemoveSignature] = useState(false)
  const [logoFile, setLogoFile] = useState(null)
  const [logoPreviewUrl, setLogoPreviewUrl] = useState('')
  const [removeLogo, setRemoveLogo] = useState(false)
  const [autoCleanedJuristicLogo, setAutoCleanedJuristicLogo] = useState(false)

  useEffect(() => {
    const loadConfig = async () => {
      try {
        setLoading(true)
        const config = await getSystemConfig()
        setConfigId(config.id)
        setSignatureFile(null)
        setLogoFile(null)
        setRemoveSignature(false)
        setRemoveLogo(false)
        setSignaturePreviewUrl(config.juristic_signature_url || '')
        
        // Check if village_logo_url contains juristic path and auto-clean
        const logoUrl = config.village_logo_url || ''
        const logoPath = config.village_logo_path || extractSystemAssetPath(logoUrl)
        const isJuristicLogo = logoPath.includes('juristic/')
        
        if (isJuristicLogo && logoPath) {
          // Auto-delete old juristic file
          try {
            await deleteSystemAssetByPath(logoPath)
          } catch (deleteError) {
            console.warn('Could not delete old juristic logo:', deleteError)
          }
          
          // Clear the fields
          const cleanedConfig = { ...config, village_logo_url: null, village_logo_path: null }
          setForm(cleanedConfig)
          setLogoPreviewUrl('')
          setAutoCleanedJuristicLogo(true)
          
          // Auto-save cleanup
          try {
            await updateSystemConfig(config.id, { village_logo_url: null, village_logo_path: null })
          } catch (updateError) {
            console.warn('Could not update config to clear juristic logo:', updateError)
          }
        } else {
          setForm(config)
          setLogoPreviewUrl(logoUrl || localStorage.getItem('vms-login-circle-logo-url') || '')
          setAutoCleanedJuristicLogo(false)
        }
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

  const handleSignatureFile = (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    const allowed = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp']
    if (!allowed.includes(file.type)) {
      Swal.fire({ icon: 'warning', title: 'ไฟล์ไม่รองรับ', text: 'กรุณาอัปโหลดไฟล์ PNG/JPG/WEBP' })
      return
    }

    if (signaturePreviewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(signaturePreviewUrl)
    }

    setSignatureFile(file)
    setRemoveSignature(false)
    setSignaturePreviewUrl(URL.createObjectURL(file))
  }

  const handleLogoFile = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    const allowed = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp']
    if (!allowed.includes(file.type)) {
      Swal.fire({ icon: 'warning', title: 'ไฟล์ไม่รองรับ', text: 'กรุณาอัปโหลดไฟล์ PNG/JPG/WEBP' })
      return
    }

    if (logoPreviewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(logoPreviewUrl)
    }

    const compressedFile = await compressImageToMaxBytes(file, MAX_LOGIN_LOGO_BYTES)
    if (compressedFile.size > MAX_LOGIN_LOGO_BYTES) {
      await Swal.fire({ icon: 'warning', title: 'ไฟล์ยังใหญ่เกินไป', text: 'กรุณาใช้รูปที่เล็กลงให้ไม่เกิน 50KB' })
      return
    }

    setLogoFile(compressedFile)
    setRemoveLogo(false)
    setLogoPreviewUrl(URL.createObjectURL(compressedFile))
  }

  const handleRemoveSignature = () => {
    if (signaturePreviewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(signaturePreviewUrl)
    }
    setSignatureFile(null)
    setSignaturePreviewUrl('')
    setRemoveSignature(true)
  }

  const handleRemoveLogo = () => {
    if (logoPreviewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(logoPreviewUrl)
    }
    setLogoFile(null)
    setLogoPreviewUrl('')
    setRemoveLogo(true)
  }

  const handleSave = async () => {
    if (!configId) return

    let uploadedLogo = null
    let uploadedSignature = null

    try {
      setSaving(true)
      const payload = { ...form }
      NUMBER_FIELDS.forEach((field) => {
        payload[field] = Number(payload[field] || 0)
      })

      if (!Object.prototype.hasOwnProperty.call(form, 'village_logo_url')) {
        payload.village_logo_url = null
      }
      if (!Object.prototype.hasOwnProperty.call(form, 'village_logo_path')) {
        payload.village_logo_path = null
      }

      const previousSignaturePath = form.juristic_signature_path || extractSystemAssetPath(form.juristic_signature_url)

      if (removeSignature) {
        payload.juristic_signature_url = null
        payload.juristic_signature_path = null
      }

      const previousLogoPath = form.village_logo_path || extractSystemAssetPath(form.village_logo_url)
      const isJuristicPath = previousLogoPath.includes('juristic/')

      // Auto-clean if logo path is from juristic
      const shouldRemoveLogo = removeLogo || isJuristicPath

      if (shouldRemoveLogo) {
        payload.village_logo_url = null
        payload.village_logo_path = null
      }

      if (logoFile) {
        uploadedLogo = await uploadVillageLogo(logoFile)
        payload.village_logo_url = uploadedLogo?.url || null
        payload.village_logo_path = uploadedLogo?.path || null
      }

      if (signatureFile) {
        uploadedSignature = await uploadJuristicSignature(signatureFile)
        payload.juristic_signature_url = uploadedSignature?.url || null
        payload.juristic_signature_path = uploadedSignature?.path || null
      }

      const updated = await updateSystemConfig(configId, payload)

      const nextLogoPath = updated.village_logo_path || payload.village_logo_path || ''
      const nextLogoUrl = updated.village_logo_url || payload.village_logo_url || buildSystemAssetPublicUrl(nextLogoPath, { cacheBust: Date.now() }) || ''
      const nextPublicSetup = {
        village_name: updated.village_name || payload.village_name || '',
        village_logo_url: nextLogoUrl || null,
        village_logo_path: nextLogoPath || null,
        juristic_name: updated.juristic_name || payload.juristic_name || '',
        juristic_address: updated.juristic_address || payload.juristic_address || '',
        bank_name: updated.bank_name || payload.bank_name || '',
        bank_account_no: updated.bank_account_no || payload.bank_account_no || '',
        bank_account_name: updated.bank_account_name || payload.bank_account_name || '',
      }

      await syncPublicSetupConfig(nextPublicSetup)

      if ((shouldRemoveLogo || logoFile) && previousLogoPath && previousLogoPath !== uploadedLogo?.path) {
        await deleteSystemAssetByPath(previousLogoPath)
      }
      if ((removeSignature || signatureFile) && previousSignaturePath && previousSignaturePath !== uploadedSignature?.path) {
        await deleteSystemAssetByPath(previousSignaturePath)
      }

      setForm(updated)
      setSignatureFile(null)
      setLogoFile(null)
      setRemoveSignature(false)
      setRemoveLogo(false)
      if (signaturePreviewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(signaturePreviewUrl)
      }
      if (logoPreviewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(logoPreviewUrl)
      }
      setSignaturePreviewUrl(updated.juristic_signature_url || '')
      setLogoPreviewUrl(nextLogoUrl)
      if (nextLogoUrl) {
        localStorage.setItem('vms-login-circle-logo-url', nextLogoUrl)
        localStorage.setItem('vms-login-circle-logo-path', nextLogoPath)
      } else {
        localStorage.removeItem('vms-login-circle-logo-url')
        localStorage.removeItem('vms-login-circle-logo-path')
      }
      await Swal.fire({ icon: 'success', title: 'บันทึกสำเร็จ', timer: 1200, showConfirmButton: false })
    } catch (error) {
      if (uploadedLogo?.path) {
        await deleteSystemAssetByPath(uploadedLogo.path).catch(() => {})
      }
      if (uploadedSignature?.path) {
        await deleteSystemAssetByPath(uploadedSignature.path).catch(() => {})
      }
      await Swal.fire({ icon: 'error', title: 'บันทึกไม่สำเร็จ', text: error.message })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="pane on page-compact" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div className="ph">
        <div className="ph-in">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div className="ph-ico">⚙️</div>
            <div>
              <div className="ph-h1">Config ระบบ</div>
              <div className="ph-sub">ตั้งค่าหลักของโครงการและการคำนวณ</div>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="ch"><div className="ct">ตั้งค่าระบบ (system_config)</div></div>
        <div className="cb" style={{ maxWidth: '1080px', margin: '0 auto', width: '100%' }}>
          {loading ? (
            <div style={{ color: 'var(--mu)' }}>กำลังโหลดข้อมูล...</div>
          ) : (
            <>
              <div className="house-sec" style={{ paddingTop: 0, paddingBottom: 10 }}>
                <div className="house-sec-title">ข้อมูลนิติบุคคล</div>
                <div className="house-grid house-grid-3">
                  <label className="house-field">
                    <span>ชื่อหมู่บ้าน</span>
                    <input name="village_name" value={form.village_name || ''} onChange={handleChange} />
                  </label>
                  <label className="house-field house-field-span-2">
                    <span>ชื่อนิติบุคคล</span>
                    <input name="juristic_name" value={form.juristic_name || ''} onChange={handleChange} />
                  </label>
                  <label className="house-field house-field-span-3">
                    <span>ที่อยู่นิติบุคคล</span>
                    <textarea name="juristic_address" rows="2" value={form.juristic_address || ''} onChange={handleChange} />
                  </label>
                  <label className="house-field">
                    <span>โทรนิติบุคคล</span>
                    <input name="juristic_phone" value={form.juristic_phone || ''} onChange={handleChange} />
                  </label>
                  <label className="house-field">
                    <span>อีเมลนิติบุคคล</span>
                    <input name="juristic_email" value={form.juristic_email || ''} onChange={handleChange} />
                  </label>
                  <div className="house-field house-field-span-3" style={{ padding: 0, border: 0, background: 'transparent' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 10 }}>
                      <div style={{ border: '1px solid var(--bo)', borderRadius: 12, padding: 10, background: '#fff' }}>
                        <span style={{ display: 'block', marginBottom: 6 }}>โลโก้หน้า Login (PNG/JPG ≤ 50KB)</span>
                        <input type="file" accept="image/png,image/jpeg,image/webp" onChange={handleLogoFile} />
                        <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8, minHeight: 44 }}>
                          {logoPreviewUrl ? (
                            <>
                              <div style={{ width: 44, height: 44, border: '1px solid var(--bo)', borderRadius: 10, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                                <img src={logoPreviewUrl} alt="login-logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              </div>
                              <button type="button" className="btn btn-xs btn-dg" onClick={handleRemoveLogo}>ลบโลโก้</button>
                            </>
                          ) : (
                            <div style={{ fontSize: 12, color: 'var(--mu)' }}>ยังไม่มีโลโก้</div>
                          )}
                        </div>
                      </div>

                      <div style={{ border: '1px solid var(--bo)', borderRadius: 12, padding: 10, background: '#fff' }}>
                        <span style={{ display: 'block', marginBottom: 6 }}>ลายเซ็นนิติ (PNG/JPG)</span>
                        <input type="file" accept="image/png,image/jpeg,image/webp" onChange={handleSignatureFile} />
                        <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8, minHeight: 44 }}>
                          {signaturePreviewUrl ? (
                            <>
                              <div style={{ width: 120, height: 38, border: '1px solid var(--bo)', borderRadius: 8, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                                <img src={signaturePreviewUrl} alt="juristic-signature" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                              </div>
                              <button type="button" className="btn btn-xs btn-dg" onClick={handleRemoveSignature}>ลบลายเซ็น</button>
                            </>
                          ) : (
                            <div style={{ fontSize: 12, color: 'var(--mu)' }}>ยังไม่มีลายเซ็น</div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
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

              <div className="house-sec" style={{ paddingTop: 10, paddingBottom: 10 }}>
                <div className="house-sec-title">การคำนวณค่าส่วนกลาง</div>
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

              <div className="house-sec" style={{ paddingTop: 10, paddingBottom: 10 }}>
                <div className="house-sec-title">โซน / เฟส</div>
                <div className="house-grid house-grid-3">
                  <label className="house-field"><span>จำนวนโซน</span><input type="number" name="zone_count" value={form.zone_count ?? ''} onChange={handleChange} /></label>
                  <label className="house-field"><span>จำนวนบ้านทั้งหมด</span><input type="number" name="total_houses" value={form.total_houses ?? ''} onChange={handleChange} /></label>
                  <label className="house-field"><span>ที่จอดส่วนกลาง</span><input type="number" name="common_parking_slots" value={form.common_parking_slots ?? ''} onChange={handleChange} /></label>
                </div>
              </div>

              <div className="house-sec" style={{ borderBottom: 0, paddingTop: 10, paddingBottom: 0 }}>
                <div className="house-sec-title">ตั้งค่าระบบ</div>
                <div className="house-grid house-grid-3">
                  <label className="house-field">
                    <span>รูปแบบวันที่</span>
                    <input name="date_format" value={form.date_format || ''} onChange={handleChange} />
                  </label>
                  <label className="house-field">
                    <span>ภาษา</span>
                    <input name="system_language" value={form.system_language || ''} onChange={handleChange} />
                  </label>
                  <div className="house-field house-field-span-3" style={{ gap: '10px' }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px' }}>
                      <label className="cfg-toggle">
                        <input className="cfg-checkbox" type="checkbox" name="enable_marketplace" checked={Boolean(form.enable_marketplace)} onChange={handleChange} />
                        <span>เปิด Marketplace</span>
                      </label>
                      <label className="cfg-toggle">
                        <input className="cfg-checkbox" type="checkbox" name="enable_technicians" checked={Boolean(form.enable_technicians)} onChange={handleChange} />
                        <span>เปิดทำเนียบช่าง</span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ marginTop: 10, display: 'flex', justifyContent: 'flex-end' }}>
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
