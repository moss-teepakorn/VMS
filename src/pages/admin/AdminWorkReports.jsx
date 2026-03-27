import React, { useEffect, useState } from 'react'
import Swal from 'sweetalert2'
import { createWorkReport, deleteWorkReport, deleteWorkReportImagesByPaths, listWorkReports, listWorkReportImages, updateWorkReport, uploadWorkReportImages } from '../../lib/workReports'
import { getSetupConfig } from '../../lib/setup'
import './AdminDashboard.css'
import html2canvas from 'html2canvas'

const CATEGORIES = [
  { value: 'maintenance', label: 'บำรุงรักษา' },
  { value: 'cleaning', label: 'ความสะอาด' },
  { value: 'safety', label: 'ความปลอดภัย' },
  { value: 'activities', label: 'กิจกรรม' },
  { value: 'environment', label: 'สิ่งแวดล้อม' },
]

const EMPTY_FORM = {
  month: '',
  year: new Date().getFullYear(),
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
  let blob = null

  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error(`ไม่สามารถย่อรูป ${file.name} ให้ต่ำกว่า 100KB ได้`)

  for (let attempt = 0; attempt < 14; attempt += 1) {
    canvas.width = Math.max(100, Math.round(width))
    canvas.height = Math.max(100, Math.round(height))
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height)

    blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality))
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

  throw new Error(`ไม่สามารถย่อรูป ${file.name} ให้ต่ำกว่า 100KB ได้`)
}

function blurActiveElement() {
  const activeElement = document.activeElement
  if (activeElement instanceof HTMLElement) {
    activeElement.blur()
  }
}

function showSwal(options) {
  blurActiveElement()
  return Swal.fire({ returnFocus: false, ...options })
}

const AdminWorkReports = () => {
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState({ ...EMPTY_FORM })
  const [attachments, setAttachments] = useState([])
  const [originalImagePaths, setOriginalImagePaths] = useState([])
  const [saving, setSaving] = useState(false)
  const [setup, setSetup] = useState({ villageName: 'The Greenfield' })

  // Filters
  const [filterMonth, setFilterMonth] = useState('')
  const [filterYear, setFilterYear] = useState(new Date().getFullYear())
  const [filterCategory, setFilterCategory] = useState('all')

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)
        const setupCfg = await getSetupConfig()
        setSetup(setupCfg)
        await loadReports()
      } catch (error) {
        console.error('Error loading data:', error)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  useEffect(() => () => revokeBlobUrls(attachments), [attachments])

  const loadReports = async (overrides = {}) => {
    try {
      const month = overrides.month !== undefined ? overrides.month : filterMonth
      const year = overrides.year !== undefined ? overrides.year : filterYear
      const category = overrides.category !== undefined ? overrides.category : filterCategory
      const data = await listWorkReports({
        month: month ? Number(month) : null,
        year: year ? Number(year) : null,
        category,
      })
      setReports(data)
    } catch (error) {
      await showSwal({ icon: 'error', title: 'โหลดข้อมูลไม่สำเร็จ', text: error.message })
    }
  }

  const handleFormChange = (e) => {
    const { name, value, type, checked } = e.target
    setForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }))
  }

  const handleAttachFiles = async (e) => {
    const files = Array.from(e.target.files || [])
    e.target.value = ''
    if (!files.length) return

    const remaining = MAX_ATTACHMENTS - attachments.length
    if (remaining <= 0) {
      await showSwal({ icon: 'warning', title: `แนบรูปได้สูงสุด ${MAX_ATTACHMENTS} รูป` })
      return
    }

    const toProcess = files.slice(0, remaining)
    if (files.length > remaining) {
      await showSwal({ icon: 'info', title: `รับได้แค่ ${remaining} รูป`, text: 'ระบบจะใช้เฉพาะรูปชุดแรก' })
    }

    try {
      const prepared = []
      for (let i = 0; i < toProcess.length; i++) {
        const resized = await resizeImageToLimit(toProcess[i], attachments.length + i + 1)
        prepared.push({ source: 'new', file: resized, url: URL.createObjectURL(resized) })
      }
      setAttachments(prev => [...prev, ...prepared])
    } catch (error) {
      await showSwal({ icon: 'error', title: 'ประมวลผลรูปไม่สำเร็จ', text: error.message })
    }
  }

  const handleRemoveAttachment = (index) => {
    setAttachments(prev => {
      const next = [...prev]
      if (next[index]?.url.startsWith('blob:')) {
        URL.revokeObjectURL(next[index].url)
      }
      next.splice(index, 1)
      return next
    })
  }

  const handleNew = () => {
    revokeBlobUrls(attachments)
    setEditingId(null)
    setForm({ ...EMPTY_FORM })
    setAttachments([])
    setOriginalImagePaths([])
  }

  const handleEdit = async (report) => {
    try {
      revokeBlobUrls(attachments)
      const images = await listWorkReportImages(report.id)
      setEditingId(report.id)
      setForm({
        month: report.month,
        year: report.year,
        category: report.category,
        summary: report.summary || '',
        detail: report.detail || '',
        is_published: report.is_published || false,
      })
      setAttachments(images.map(img => ({ source: 'existing', ...img })))
      setOriginalImagePaths(images.map(img => img.path).filter(Boolean))
    } catch (error) {
      await showSwal({ icon: 'error', title: 'โหลดข้อมูลไม่สำเร็จ', text: error.message })
    }
  }

  const handleSave = async () => {
    if (!form.month || !form.year || !form.category || !form.summary) {
      await showSwal({ icon: 'warning', title: 'กรุณากรอกข้อมูลให้ครบถ้วน' })
      return
    }

    try {
      setSaving(true)

      const keptExistingPaths = attachments
        .filter(a => a.source === 'existing' && a.path)
        .map(a => a.path)

      const newFiles = attachments
        .filter(a => a.source === 'new' && a.file)
        .map(a => a.file)

      if (editingId) {
        const deletePaths = originalImagePaths
          .filter(path => !keptExistingPaths.includes(path))
        if (deletePaths.length > 0) {
          await deleteWorkReportImagesByPaths(deletePaths)
        }
      }

      const payload = {
        month: Number(form.month),
        year: Number(form.year),
        category: form.category,
        summary: form.summary.trim(),
        detail: form.detail.trim(),
        is_published: form.is_published,
        image_urls: [],
      }

      let saved
      if (editingId) {
        saved = await updateWorkReport(editingId, payload)
      } else {
        saved = await createWorkReport(payload)
      }

      if (newFiles.length > 0) {
        await uploadWorkReportImages(saved.id, newFiles)
      }

      const currentImages = await listWorkReportImages(saved.id)
      await updateWorkReport(saved.id, {
        image_urls: currentImages.map(img => img.url).filter(Boolean),
      })

      await showSwal({ icon: 'success', title: 'บันทึกสำเร็จ', timer: 1200, showConfirmButton: false })
      revokeBlobUrls(attachments)
      setEditingId(null)
      setForm({ ...EMPTY_FORM })
      setAttachments([])
      setOriginalImagePaths([])
      await loadReports()
    } catch (error) {
      await showSwal({ icon: 'error', title: 'บันทึกไม่สำเร็จ', text: error.message })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (report) => {
    const catLabel = CATEGORIES.find(c => c.value === report.category)?.label || report.category
    const confirmText = 'ลบผลงานนิติ ' + catLabel + '?'
    const result = await showSwal({
      icon: 'warning',
      title: 'ยืนยันการลบ',
      text: confirmText,
      showCancelButton: true,
      confirmButtonText: 'ลบ',
      cancelButtonText: 'ยกเลิก',
      confirmButtonColor: '#c0392b',
    })

    if (!result.isConfirmed) return

    try {
      const images = await listWorkReportImages(report.id)
      const paths = images.map(img => img.path).filter(Boolean)
      if (paths.length > 0) {
        await deleteWorkReportImagesByPaths(paths)
      }
      await deleteWorkReport(report.id)
      await showSwal({ icon: 'success', title: 'ลบสำเร็จ', timer: 1200, showConfirmButton: false })
      await loadReports()
    } catch (error) {
      await showSwal({ icon: 'error', title: 'ลบไม่สำเร็จ', text: error.message })
    }
  }

  const handleExportImage = async (report) => { try { const images = await listWorkReportImages(report.id); const categoryLabel = CATEGORIES.find(c => c.value === report.category)?.label || report.category; const monthYear = new Date(report.year, report.month - 1).toLocaleDateString('th-TH', { month: 'long', year: 'numeric' }); let imagesSection = ''; if (images.length > 0) { let imgTags = ''; for (let i = 0; i < Math.min(4, images.length); i += 1) { imgTags += '<img src="' + images[i].url + '" style="width:100%;height:300px;object-fit:cover;border-radius:8px;" />'; } imagesSection = '<div style="display:grid;grid-template-columns:repeat(2,1fr);gap:15px;">' + imgTags + '</div>'; } const detailSection = report.detail ? '<div style="margin-top:20px;"><div style="font-size:14px;opacity:0.85;">รายละเอียด</div><div style="font-size:16px;line-height:1.6;">' + report.detail.split('\n').join('<br/>') + '</div></div>' : ''; const htmlContent = '<div style="width:1200px;padding:40px;background:linear-gradient(135deg,#1B4F72,#1E40AF);color:white;font-family:Arial;">' + '<div style="text-align:center;margin-bottom:30px;"><div style="font-size:36px;font-weight:bold;">📊 รายงานผลงานนิติ</div><div style="font-size:24px;opacity:0.9;">' + setup.villageName + '</div></div>' + '<div style="background:rgba(255,255,255,0.1);padding:25px;border-radius:12px;margin-bottom:25px;"><div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:20px;"><div><div style="font-size:14px;opacity:0.85;">เดือน</div><div style="font-size:20px;font-weight:bold;">' + monthYear + '</div></div><div><div style="font-size:14px;opacity:0.85;">หมวดหมู่</div><div style="font-size:20px;font-weight:bold;">' + categoryLabel + '</div></div></div><div><div style="font-size:14px;opacity:0.85;">สรุป</div><div style="font-size:22px;font-weight:bold;line-height:1.4;">' + report.summary + '</div></div>' + detailSection + '</div>' + imagesSection + '<div style="text-align:center;font-size:13px;opacity:0.75;margin-top:30px;">' + new Date().toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' }) + '</div></div>'; const tempDiv = document.createElement('div'); tempDiv.innerHTML = htmlContent; tempDiv.style.position = 'fixed'; tempDiv.style.left = '-9999px'; document.body.appendChild(tempDiv); const canvas = await html2canvas(tempDiv.firstChild, { scale: 1, backgroundColor: '#ffffff', logging: false }); document.body.removeChild(tempDiv); canvas.toBlob(blob => { const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = 'work-report-' + report.month + '-' + report.year + '.png'; link.click(); }, 'image/png'); await showSwal({ icon: 'success', title: 'ดาวน์โหลดสำเร็จ', timer: 1000, showConfirmButton: false }); } catch (error) { await showSwal({ icon: 'error', title: 'ดาวน์โหลดไม่สำเร็จ', text: error.message }); } }

  if (loading) {
    return <div className="pane on"><div className="card"><div className="cb">กำลังโหลด...</div></div></div>
  }

  return (
    <div className="pane on" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Page Header */}
      <div className="ph">
        <div className="ph-in">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div className="ph-ico">📋</div>
            <div>
              <div className="ph-h1">ผลงานนิติ</div>
              <div className="ph-sub">รายงานผลงานบำรุงรักษาและกิจกรรมต่างๆ</div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="ch">
          <div className="ct">ตัวกรอง</div>
        </div>
        <div className="cb">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span style={{ fontSize: '13px', fontWeight: '600' }}>เดือน</span>
                <select value={filterMonth} onChange={(e) => { const value = e.target.value; setFilterMonth(value); loadReports({ month: value }) }} style={{ padding: '8px', border: '1px solid var(--bo)', borderRadius: 'var(--r)', fontSize: '14px' }}>
                <option value="">ทั้งหมด</option>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(m => (
                  <option key={m} value={m}>{new Date(2024, m - 1).toLocaleDateString('th-TH', { month: 'long' })}</option>
                ))}
              </select>
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span style={{ fontSize: '13px', fontWeight: '600' }}>ปี</span>
                <select value={filterYear} onChange={e => { const value = e.target.value; setFilterYear(value); loadReports({ year: value }) }} style={{ padding: '8px', border: '1px solid var(--bo)', borderRadius: 'var(--r)', fontSize: '14px' }}>
                {[2024, 2025, 2026, 2027].map(y => (
                  <option key={y} value={y}>{y + 543}</option>
                ))}
              </select>
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span style={{ fontSize: '13px', fontWeight: '600' }}>หมวดหมู่</span>
                <select value={filterCategory} onChange={e => { const value = e.target.value; setFilterCategory(value); loadReports({ category: value }) }} style={{ padding: '8px', border: '1px solid var(--bo)', borderRadius: 'var(--r)', fontSize: '14px' }}>
                <option value="all">ทั้งหมด</option>
                {CATEGORIES.map(cat => (
                  <option key={cat.value} value={cat.value}>{cat.label}</option>
                ))}
              </select>
            </label>
          </div>
        </div>
      </div>

      {/* List */}
      <div className="card">
        <div className="ch">
          <div className="ct">ผลงานนิติ ({reports.length})</div>
          <button className="btn btn-sm btn-pr" onClick={handleNew} disabled={editingId !== null}>+ เพิ่มใหม่</button>
        </div>
        <div className="cb">
          {reports.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--mu)', padding: '20px' }}>ไม่มีข้อมูล</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '12px' }}>
              {reports.map(report => (
                <div key={report.id} className="mcard">
                  <div className="mcard-top">
                    <div style={{ flex: 1 }}>
                      <div className="mcard-title">{new Date(report.year, report.month - 1).toLocaleDateString('th-TH', { month: 'long', year: 'numeric' })}</div>
                      <div style={{ fontSize: '13px', color: 'var(--mu)', marginTop: '4px' }}>{CATEGORIES.find(c => c.value === report.category)?.label}</div>
                    </div>
                    {report.is_published && <span style={{ fontSize: '11px', background: '#28B463', color: '#fff', padding: '3px 8px', borderRadius: '4px' }}>เผยแพร่</span>}
                  </div>
                  <div className="mcard-meta" style={{ marginTop: '8px' }}>
                    <div style={{ fontSize: '14px', fontWeight: '600' }}>{report.summary}</div>
                  </div>
                  {(report.image_urls?.length > 0 || report.detail) && (
                    <div style={{ fontSize: '12px', color: 'var(--mu)', marginTop: '8px', lineHeight: '1.4' }}>
                      {report.image_urls?.length > 0 && <div>📸 {report.image_urls.length} รูป</div>}
                      {report.detail && <div style={{ marginTop: '4px', maxHeight: '40px', overflow: 'hidden', textOverflow: 'ellipsis' }}>{report.detail}</div>}
                    </div>
                  )}
                  <div className="mcard-actions" style={{ marginTop: '12px', display: 'flex', gap: '6px' }}>
                    <button className="btn btn-xs btn-a" onClick={() => handleEdit(report)}>แก้ไข</button>
                    <button className="btn btn-xs btn-o" onClick={() => handleExportImage(report)}>🖼️ ส่ง</button>
                    <button className="btn btn-xs btn-dg" onClick={() => handleDelete(report)}>ลบ</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Form */}
      <div className="card">
          <div className="ch">
            <div className="ct">{editingId ? 'แก้ไข' : 'เพิ่มผลงานนิติใหม่'}</div>
          </div>
          <div className="cb">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '20px' }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <span style={{ fontSize: '13px', fontWeight: '600' }}>เดือน *</span>
                <select name="month" value={form.month} onChange={handleFormChange} style={{ padding: '8px', border: '1px solid var(--bo)', borderRadius: 'var(--r)' }}>
                  <option value="">เลือก</option>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(m => (
                    <option key={m} value={m}>{new Date(2024, m - 1).toLocaleDateString('th-TH', { month: 'long' })}</option>
                  ))}
                </select>
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <span style={{ fontSize: '13px', fontWeight: '600' }}>ปี *</span>
                <select name="year" value={form.year} onChange={handleFormChange} style={{ padding: '8px', border: '1px solid var(--bo)', borderRadius: 'var(--r)' }}>
                  {[2024, 2025, 2026, 2027].map(y => (
                    <option key={y} value={y}>{y + 543}</option>
                  ))}
                </select>
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <span style={{ fontSize: '13px', fontWeight: '600' }}>หมวดหมู่ *</span>
                <select name="category" value={form.category} onChange={handleFormChange} style={{ padding: '8px', border: '1px solid var(--bo)', borderRadius: 'var(--r)' }}>
                  {CATEGORIES.map(cat => (
                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                  ))}
                </select>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '20px' }}>
                <input type="checkbox" name="is_published" checked={form.is_published} onChange={handleFormChange} />
                <span style={{ fontSize: '13px', fontWeight: '600' }}>เผยแพร่</span>
              </label>
            </div>

            <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '16px' }}>
              <span style={{ fontSize: '13px', fontWeight: '600' }}>สรุป *</span>
              <input type="text" name="summary" value={form.summary} onChange={handleFormChange} placeholder="เช่น ซ่อมแซมไฟทางเดิน, ตัดแต่งต้นไม้" style={{ padding: '8px', border: '1px solid var(--bo)', borderRadius: 'var(--r)' }} />
            </label>

            <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '16px' }}>
              <span style={{ fontSize: '13px', fontWeight: '600' }}>รายละเอียด</span>
              <textarea name="detail" value={form.detail} onChange={handleFormChange} placeholder="เพิ่มรายละเอียดอื่นๆ" style={{ padding: '8px', border: '1px solid var(--bo)', borderRadius: 'var(--r)', minHeight: '80px', fontFamily: 'inherit' }} />
            </label>

            <div style={{ marginBottom: '20px' }}>
              <div style={{ fontSize: '13px', fontWeight: '600', marginBottom: '10px' }}>รูปภาพ (≤{MAX_ATTACHMENTS} รูป, ≤50KB ต่อรูป)</div>
              <label style={{ display: 'inline-block', padding: '8px 12px', background: 'var(--bg)', border: '1px solid var(--bo)', borderRadius: 'var(--r)', cursor: 'pointer', fontSize: '13px' }}>
                <input type="file" accept="image/*" multiple onChange={handleAttachFiles} disabled={attachments.length >= MAX_ATTACHMENTS} style={{ display: 'none' }} />
                📎 แนบไฟล์
              </label>
              <div style={{ marginTop: '8px', fontSize: '12px', color: 'var(--mu)' }}>
                แนบแล้ว {attachments.length}/{MAX_ATTACHMENTS} รูป
              </div>
              {attachments.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '12px' }}>
                  {attachments.map((img, idx) => (
                    <div key={`${img.name}-${idx}`} style={{ position: 'relative', width: '80px' }}>
                      <img src={img.url} alt={img.name} style={{ width: '100%', height: '80px', objectFit: 'cover', borderRadius: '6px' }} />
                      <button type="button" onClick={() => handleRemoveAttachment(idx)} style={{ position: 'absolute', top: '2px', right: '2px', width: '20px', height: '20px', background: 'rgba(0,0,0,0.6)', color: '#fff', border: 'none', borderRadius: '50%', cursor: 'pointer', fontSize: '12px', lineHeight: '20px' }}>✕</button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button className="btn btn-o" onClick={handleNew} disabled={saving}>ยกเลิก</button>
              <button className="btn btn-pr" onClick={handleSave} disabled={saving}>บันทึก</button>
            </div>
          </div>
        </div>
    </div>
  )
}

export default AdminWorkReports
