import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Swal from 'sweetalert2'
import {
  createWorkReport,
  deleteWorkReportImagesByPaths,
  getWorkReportById,
  listWorkReportImages,
  updateWorkReport,
  uploadWorkReportImages,
} from '../../lib/workReports'
import './AdminDashboard.css'

const CATEGORIES = [
  { value: 'maintenance', label: 'บำรุงรักษา' },
  { value: 'cleaning', label: 'ความสะอาด' },
  { value: 'safety', label: 'ความปลอดภัย' },
  { value: 'activities', label: 'กิจกรรม' },
  { value: 'environment', label: 'สิ่งแวดล้อม' },
]

const EMPTY_FORM = {
  month: '',
  year: String(new Date().getFullYear()),
  category: 'maintenance',
  summary: '',
  detail: '',
  is_published: false,
}

const MAX_ATTACHMENTS = 10
const MAX_IMAGE_TARGET_BYTES = 50 * 1024

function revokeBlobUrls(items) {
  for (const item of items || []) {
    if (item?.url && String(item.url).startsWith('blob:')) {
      URL.revokeObjectURL(item.url)
    }
  }
}

async function resizeImageToLimit(file, sequence) {
  if (file.size <= MAX_IMAGE_TARGET_BYTES) {
    const fileName = `WRK_${Date.now()}_${String(sequence).padStart(3, '0')}.jpg`
    return new File([file], fileName, { type: file.type || 'image/jpeg' })
  }

  const dataUrl = await new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })

  const image = await new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = dataUrl
  })

  let width = image.width
  let height = image.height
  let quality = 0.85
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('ไม่สามารถประมวลผลรูปภาพได้')

  for (let attempt = 0; attempt < 14; attempt += 1) {
    canvas.width = Math.max(100, Math.round(width))
    canvas.height = Math.max(100, Math.round(height))
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height)

    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality))
    if (!blob) break

    if (blob.size <= MAX_IMAGE_TARGET_BYTES) {
      const fileName = `WRK_${Date.now()}_${String(sequence).padStart(3, '0')}.jpg`
      return new File([blob], fileName, { type: 'image/jpeg' })
    }

    if (quality > 0.45) {
      quality -= 0.08
    } else {
      width *= 0.88
      height *= 0.88
    }
  }

  throw new Error(`ไม่สามารถย่อรูป ${file.name} ให้ต่ำกว่า 50KB ได้`)
}

const AdminWorkReportForm = () => {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEdit = Boolean(id)

  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ ...EMPTY_FORM })
  const [attachments, setAttachments] = useState([])
  const [originalImagePaths, setOriginalImagePaths] = useState([])

  useEffect(() => () => revokeBlobUrls(attachments), [attachments])

  useEffect(() => {
    const loadRecord = async () => {
      if (!isEdit) return
      try {
        setLoading(true)
        const report = await getWorkReportById(id)
        const images = await listWorkReportImages(id)

        setForm({
          month: String(report.month || ''),
          year: String(report.year || new Date().getFullYear()),
          category: report.category || 'maintenance',
          summary: report.summary || '',
          detail: report.detail || '',
          is_published: Boolean(report.is_published),
        })

        setAttachments(images.map((img) => ({ source: 'existing', ...img })))
        setOriginalImagePaths(images.map((img) => img.path).filter(Boolean))
      } catch (error) {
        await Swal.fire({ icon: 'error', title: 'โหลดข้อมูลไม่สำเร็จ', text: error.message })
        navigate('/admin/work-reports')
      } finally {
        setLoading(false)
      }
    }

    loadRecord()
  }, [id, isEdit, navigate])

  const years = useMemo(() => [2024, 2025, 2026, 2027, 2028], [])

  const handleFormChange = (e) => {
    const { name, value, type, checked } = e.target
    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }))
  }

  const handleAttachFiles = async (e) => {
    const files = Array.from(e.target.files || [])
    e.target.value = ''
    if (files.length === 0) return

    const remain = MAX_ATTACHMENTS - attachments.length
    if (remain <= 0) {
      await Swal.fire({ icon: 'warning', title: 'แนบรูปได้สูงสุด 10 รูป' })
      return
    }

    const accepted = files.slice(0, remain)
    if (files.length > remain) {
      await Swal.fire({ icon: 'info', title: `รับได้แค่ ${remain} รูป`, text: 'ระบบจะใช้เฉพาะรูปชุดแรก' })
    }

    try {
      const prepared = []
      for (let index = 0; index < accepted.length; index += 1) {
        const resized = await resizeImageToLimit(accepted[index], attachments.length + index + 1)
        prepared.push({
          source: 'new',
          file: resized,
          name: resized.name,
          url: URL.createObjectURL(resized),
        })
      }
      setAttachments((prev) => [...prev, ...prepared])
    } catch (error) {
      await Swal.fire({ icon: 'error', title: 'ประมวลผลรูปไม่สำเร็จ', text: error.message })
    }
  }

  const handleRemoveAttachment = (index) => {
    setAttachments((prev) => {
      const next = [...prev]
      const item = next[index]
      if (item?.url && String(item.url).startsWith('blob:')) {
        URL.revokeObjectURL(item.url)
      }
      next.splice(index, 1)
      return next
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!form.month || !form.year || !form.category || !String(form.summary).trim()) {
      await Swal.fire({ icon: 'warning', title: 'กรุณากรอกข้อมูลให้ครบถ้วน' })
      return
    }

    try {
      setSaving(true)

      const keptExistingPaths = attachments
        .filter((item) => item.source === 'existing' && item.path)
        .map((item) => item.path)

      const newFiles = attachments
        .filter((item) => item.source === 'new' && item.file)
        .map((item) => item.file)

      const payload = {
        month: Number(form.month),
        year: Number(form.year),
        category: form.category,
        summary: String(form.summary).trim(),
        detail: String(form.detail || '').trim(),
        is_published: Boolean(form.is_published),
        image_urls: [],
      }

      let saved
      if (isEdit) {
        const deletePaths = originalImagePaths.filter((path) => !keptExistingPaths.includes(path))
        if (deletePaths.length > 0) {
          await deleteWorkReportImagesByPaths(deletePaths)
        }
        saved = await updateWorkReport(id, payload)
      } else {
        saved = await createWorkReport(payload)
      }

      if (newFiles.length > 0) {
        await uploadWorkReportImages(saved.id, newFiles)
      }

      const currentImages = await listWorkReportImages(saved.id)
      await updateWorkReport(saved.id, {
        image_urls: currentImages.map((img) => img.url).filter(Boolean),
      })

      await Swal.fire({ icon: 'success', title: 'บันทึกสำเร็จ', timer: 1200, showConfirmButton: false })
      revokeBlobUrls(attachments)
      navigate('/admin/work-reports')
    } catch (error) {
      await Swal.fire({ icon: 'error', title: 'บันทึกไม่สำเร็จ', text: error.message })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="pane on"><div className="card"><div className="cb">กำลังโหลด...</div></div></div>
  }

  return (
    <div className="pane on" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div className="ph">
        <div className="ph-in">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div className="ph-ico">📝</div>
            <div>
              <div className="ph-h1">{isEdit ? 'แก้ไขผลงานนิติ' : 'เพิ่มผลงานนิติ'}</div>
              <div className="ph-sub">บันทึกผลงาน พร้อมแนบรูปไม่เกิน 10 รูป</div>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="ch">
          <div className="ct">แบบฟอร์มผลงานนิติ</div>
        </div>
        <div className="cb">
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px', marginBottom: '16px' }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <span style={{ fontSize: '13px', fontWeight: 600 }}>เดือน *</span>
                <select name="month" value={form.month} onChange={handleFormChange} className="houses-filter-select">
                  <option value="">เลือกเดือน</option>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => (
                    <option key={m} value={m}>{new Date(2024, m - 1).toLocaleDateString('th-TH', { month: 'long' })}</option>
                  ))}
                </select>
              </label>

              <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <span style={{ fontSize: '13px', fontWeight: 600 }}>ปี *</span>
                <select name="year" value={form.year} onChange={handleFormChange} className="houses-filter-select">
                  {years.map((y) => <option key={y} value={y}>{y + 543}</option>)}
                </select>
              </label>

              <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <span style={{ fontSize: '13px', fontWeight: 600 }}>หมวดหมู่ *</span>
                <select name="category" value={form.category} onChange={handleFormChange} className="houses-filter-select">
                  {CATEGORIES.map((cat) => (
                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                  ))}
                </select>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '25px' }}>
                <input type="checkbox" name="is_published" checked={form.is_published} onChange={handleFormChange} />
                <span style={{ fontSize: '13px', fontWeight: 600 }}>เผยแพร่</span>
              </label>
            </div>

            <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '14px' }}>
              <span style={{ fontSize: '13px', fontWeight: 600 }}>สรุป *</span>
              <input name="summary" value={form.summary} onChange={handleFormChange} type="text" className="houses-filter-input" placeholder="เช่น ซ่อมไฟถนน, ตัดแต่งต้นไม้" />
            </label>

            <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '14px' }}>
              <span style={{ fontSize: '13px', fontWeight: 600 }}>รายละเอียด</span>
              <textarea name="detail" value={form.detail} onChange={handleFormChange} rows={4} className="houses-filter-input" placeholder="รายละเอียดงานเพิ่มเติม" />
            </label>

            <div style={{ marginBottom: '18px' }}>
              <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '8px' }}>รูปภาพ (ไม่เกิน 10 รูป, รูปละไม่เกิน 50KB)</div>
              <label className="btn btn-o btn-sm" style={{ cursor: 'pointer', display: 'inline-block' }}>
                <input type="file" accept="image/*" multiple onChange={handleAttachFiles} style={{ display: 'none' }} disabled={attachments.length >= MAX_ATTACHMENTS} />
                แนบไฟล์
              </label>
              <div style={{ marginTop: '8px', color: 'var(--mu)', fontSize: '12px' }}>แนบแล้ว {attachments.length}/{MAX_ATTACHMENTS} รูป</div>

              {attachments.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '12px' }}>
                  {attachments.map((img, index) => (
                    <div key={img.path || img.name || index} style={{ position: 'relative', width: '84px' }}>
                      <img src={img.url} alt={img.name || 'img'} style={{ width: '84px', height: '84px', objectFit: 'cover', borderRadius: '6px' }} />
                      <button
                        type="button"
                        onClick={() => handleRemoveAttachment(index)}
                        style={{ position: 'absolute', top: '2px', right: '2px', width: '20px', height: '20px', border: 'none', borderRadius: '50%', background: 'rgba(0,0,0,.65)', color: '#fff', cursor: 'pointer' }}
                      >
                        x
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button type="button" className="btn btn-o" onClick={() => navigate('/admin/work-reports')} disabled={saving}>ยกเลิก</button>
              <button type="submit" className="btn btn-pr" disabled={saving}>บันทึก</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default AdminWorkReportForm
