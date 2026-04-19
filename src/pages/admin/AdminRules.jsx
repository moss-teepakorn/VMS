import React, { useEffect, useState } from 'react'
import StyledSelect from '../../components/StyledSelect'
import DropdownList from '../../components/DropdownList'
import VmsPagination from '../../components/VmsPagination'
import Swal from 'sweetalert2'
import {
  createRuleDocument,
  deleteRuleDocument,
  deleteRulePdfByPath,
  listRuleDocuments,
  updateRuleDocument,
  uploadRulePdf,
} from '../../lib/rules'

const CATEGORY_OPTIONS = [
  { value: 'village', label: 'กฎระเบียบหมู่บ้าน' },
  { value: 'living', label: 'ระเบียบการอยู่อาศัย' },
]

const EMPTY_FORM = {
  category: 'village',
  topic_no: '',
  title: '',
  description: '',
}

function blurActiveElement() {
  const el = document.activeElement
  if (el instanceof HTMLElement) el.blur()
}

function showSwal(options) {
  blurActiveElement()
  return Swal.fire({ returnFocus: false, ...options })
}

function formatDate(str) {
  if (!str) return '-'
  return new Date(str).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' })
}

function nextTopicNo(items, category) {
  const list = (items || []).filter((item) => item.category === category)
  const maxNo = list.reduce((max, item) => Math.max(max, Number(item.topic_no || 0)), 0)
  return maxNo + 1
}

export default function AdminRules() {
  const [rules, setRules] = useState([])
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [pdfFile, setPdfFile] = useState(null)
  const [existingPdf, setExistingPdf] = useState({ url: '', path: '' })
  const [showPdfViewerModal, setShowPdfViewerModal] = useState(false)
  const [pdfViewerUrl, setPdfViewerUrl] = useState('')
  const [pdfViewerTitle, setPdfViewerTitle] = useState('เอกสาร PDF')
  const [page, setPage] = useState(1)
  const [rowsPerPage, setRowsPerPage] = useState('25')

  const ruleCategoryOptions = [
    { value: 'all', label: 'ทุกหมวด' },
    ...CATEGORY_OPTIONS.map((option) => ({ value: option.value, label: option.label })),
  ]

  const totalPages = rowsPerPage === 'all' ? 1 : Math.ceil(rules.length / Number(rowsPerPage))
  const pagedRules = rowsPerPage === 'all' ? rules : rules.slice((page - 1) * Number(rowsPerPage), page * Number(rowsPerPage))

  const loadData = async (override = {}) => {
    try {
      setLoading(true)
      const data = await listRuleDocuments({ category: override.category ?? categoryFilter, search: override.search ?? searchTerm })
      setRules(data)
    } catch (error) {
      await showSwal({ icon: 'error', title: 'โหลดข้อมูลไม่สำเร็จ', text: error.message })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadData() }, [])

  useEffect(() => {
    const timer = setTimeout(() => { loadData({ search: searchTerm }) }, 400)
    return () => clearTimeout(timer)
  }, [searchTerm])

  const openAddModal = () => {
    setEditingItem(null)
    setForm({ ...EMPTY_FORM, topic_no: String(nextTopicNo(rules, 'village')) })
    setPdfFile(null)
    setExistingPdf({ url: '', path: '' })
    setShowModal(true)
  }

  const openEditModal = (item) => {
    setEditingItem(item)
    setForm({
      category: item.category || 'village',
      topic_no: String(item.topic_no || ''),
      title: item.title || '',
      description: item.description || '',
    })
    setPdfFile(null)
    setExistingPdf({ url: item.pdf_url || '', path: item.pdf_path || '' })
    setShowModal(true)
  }

  const closeModal = () => {
    if (saving) return
    setShowModal(false)
    setEditingItem(null)
    setForm(EMPTY_FORM)
    setPdfFile(null)
    setExistingPdf({ url: '', path: '' })
  }

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    const isPdf = String(file.type || '').toLowerCase() === 'application/pdf' || String(file.name || '').toLowerCase().endsWith('.pdf')
    if (!isPdf) {
      await showSwal({ icon: 'warning', title: 'รองรับเฉพาะไฟล์ PDF เท่านั้น' })
      return
    }

    setPdfFile(file)
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!form.title.trim()) { await showSwal({ icon: 'warning', title: 'กรุณากรอกหัวข้อเรื่อง' }); return }
    const topicNo = Number(form.topic_no || 0)
    if (!Number.isFinite(topicNo) || topicNo <= 0) { await showSwal({ icon: 'warning', title: 'กรุณาระบุเลขเรื่องเป็นจำนวนเต็มมากกว่า 0' }); return }
    if (!editingItem && !pdfFile) { await showSwal({ icon: 'warning', title: 'กรุณาแนบไฟล์ PDF' }); return }

    try {
      setSaving(true)
      let nextPdfUrl = existingPdf.url || ''
      let nextPdfPath = existingPdf.path || ''

      if (pdfFile) {
        const uploaded = await uploadRulePdf(pdfFile, { category: form.category })
        nextPdfUrl = uploaded?.url || ''
        nextPdfPath = uploaded?.path || ''
      }

      if (editingItem) {
        await updateRuleDocument(editingItem.id, {
          category: form.category,
          topic_no: topicNo,
          title: form.title,
          description: form.description,
          pdf_url: nextPdfUrl,
          pdf_path: nextPdfPath,
        })
        if (pdfFile && existingPdf.path && existingPdf.path !== nextPdfPath) {
          await deleteRulePdfByPath(existingPdf.path)
        }
        await showSwal({ icon: 'success', title: 'บันทึกสำเร็จ', timer: 1200, showConfirmButton: false })
      } else {
        await createRuleDocument({
          category: form.category,
          topic_no: topicNo,
          title: form.title,
          description: form.description,
          pdf_url: nextPdfUrl,
          pdf_path: nextPdfPath,
        })
        await showSwal({ icon: 'success', title: 'เพิ่มกฎระเบียบสำเร็จ', timer: 1200, showConfirmButton: false })
      }

      closeModal()
      await loadData({ category: categoryFilter, search: searchTerm })
    } catch (error) {
      await showSwal({ icon: 'error', title: 'บันทึกไม่สำเร็จ', text: error.message })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (item) => {
    const result = await showSwal({
      icon: 'warning',
      title: 'ยืนยันการลบ',
      text: `ลบเรื่อง "${item.title}" ใช่หรือไม่?`,
      showCancelButton: true,
      confirmButtonText: 'ลบ',
      cancelButtonText: 'ยกเลิก',
      confirmButtonColor: '#c0392b',
    })
    if (!result.isConfirmed) return

    try {
      await deleteRuleDocument(item.id)
      if (item.pdf_path) await deleteRulePdfByPath(item.pdf_path)
      await showSwal({ icon: 'success', title: 'ลบสำเร็จ', timer: 1000, showConfirmButton: false })
      await loadData({ category: categoryFilter, search: searchTerm })
    } catch (error) {
      await showSwal({ icon: 'error', title: 'ลบไม่สำเร็จ', text: error.message })
    }
  }

  const openPdfViewer = (url, title) => {
    const targetUrl = String(url || '').trim()
    if (!targetUrl) {
      showSwal({ icon: 'warning', title: 'ไม่พบไฟล์ PDF' })
      return
    }
    setPdfViewerUrl(targetUrl)
    setPdfViewerTitle(title || 'เอกสาร PDF')
    setShowPdfViewerModal(true)
  }

  const closePdfViewer = () => {
    setShowPdfViewerModal(false)
    setPdfViewerUrl('')
    setPdfViewerTitle('เอกสาร PDF')
  }

  return (
    <div className="pane on houses-compact">
      <div className="ph">
        <div className="ph-in">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div className="ph-ico">📘</div>
            <div>
              <div className="ph-h1">กฎระเบียบ</div>
              <div className="ph-sub">จัดการกฎระเบียบหมู่บ้านและระเบียบการอยู่อาศัย (ไฟล์ PDF)</div>
            </div>
          </div>
        </div>
      </div>

      <div className="card houses-main-card">
        <div className="vms-panel-toolbar">
          <div className="vms-toolbar-left">
            <DropdownList compact value={categoryFilter} options={ruleCategoryOptions} onChange={(v) => { setCategoryFilter(v); setPage(1); loadData({ category: v, search: searchTerm }) }} placeholder="ทุกหมวด" />
            <div className="vms-inline-search">
              <svg width="12" height="12" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd"/>
              </svg>
              <input type="text" value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setPage(1) }} placeholder="ค้นหา หัวข้อ / รายละเอียด" />
            </div>
          </div>
          <div className="vms-toolbar-right">
            <button className="vms-sm-btn vms-sm-btn--primary" onClick={openAddModal}>+ เพิ่มเรื่องใหม่</button>
            <button className="vms-sm-btn" onClick={() => loadData({ category: categoryFilter, search: searchTerm })}><svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M17.65 6.35A7.958 7.958 0 0 0 12 4C7.58 4 4.01 7.58 4.01 12S7.58 20 12 20c3.73 0 6.84-2.55 7.73-6h-2.08A5.99 5.99 0 0 1 12 18c-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/></svg></button>
          </div>
        </div>

        <div className="cb houses-table-card-body houses-main-body">
          <div className="houses-desktop-only" style={{ overflowX: 'auto' }}>
            <table className="tw houses-table houses-main-table" style={{ width: '100%', minWidth: '860px' }}>
              <thead>
                <tr>
                  <th>หมวด</th>
                  <th>เรื่องที่</th>
                  <th>หัวข้อ</th>
                  <th>รายละเอียด</th>
                  <th>ไฟล์ PDF</th>
                  <th>วันที่</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="7" style={{ textAlign: 'center', color: 'var(--mu)', padding: '20px' }}>กำลังโหลด...</td></tr>
                ) : rules.length === 0 ? (
                  <tr><td colSpan="7" style={{ textAlign: 'center', color: 'var(--mu)', padding: '20px' }}>ยังไม่มีข้อมูล</td></tr>
                ) : pagedRules.map((item) => (
                  <tr key={item.id}>
                    <td>{item.category_label}</td>
                    <td>{item.topic_no || '-'}</td>
                    <td><strong>{item.title}</strong></td>
                    <td style={{ maxWidth: '320px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.description || '-'}</td>
                    <td>
                      {item.pdf_url ? (
                        <button type="button" className="btn btn-xs btn-o" onClick={() => openPdfViewer(item.pdf_url, item.title)}>📄 เปิด PDF</button>
                      ) : '-'}
                    </td>
                    <td>{formatDate(item.announcement_date || item.created_at)}</td>
                    <td>
                      <div className="vms-row-acts">
                        <button className="vms-ra-btn vms-ra-edit" title="แก้ไข" onClick={() => openEditModal(item)}><svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"/></svg></button>
                        <button className="vms-ra-btn vms-ra-del" title="ลบ" onClick={() => handleDelete(item)}><svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd"/></svg></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="houses-mobile-only" style={{ gap: 10, padding: '4px 0' }}>
            {loading ? (
              <div className="mcard-empty">กำลังโหลด...</div>
            ) : rules.length === 0 ? (
              <div className="mcard-empty">ยังไม่มีข้อมูล</div>
            ) : rules.map((item) => (
              <div key={`m-${item.id}`} className="mcard">
                <div className="mcard-top">
                  <div className="mcard-title">เรื่องที่ {item.topic_no || '-'} · {item.title}</div>
                  <span className="bd b-pr mcard-badge">{item.category_label}</span>
                </div>
                <div className="mcard-meta">
                  <span><span className="mcard-label">วันที่</span> {formatDate(item.announcement_date || item.created_at)}</span>
                  <span><span className="mcard-label">รายละเอียด</span> {item.description || '-'}</span>
                </div>
                <div className="mcard-actions">
                  <div className="vms-row-acts">
                    {item.pdf_url && <button type="button" className="vms-ra-btn vms-ra-view" title="เปิด PDF" onClick={() => openPdfViewer(item.pdf_url, item.title)}><svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd"/></svg></button>}
                    <button className="vms-ra-btn vms-ra-edit" title="แก้ไข" onClick={() => openEditModal(item)}><svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"/></svg></button>
                    <button className="vms-ra-btn vms-ra-del" title="ลบ" onClick={() => handleDelete(item)}><svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd"/></svg></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <VmsPagination page={page} totalPages={totalPages} rowsPerPage={rowsPerPage} setRowsPerPage={(v) => { setRowsPerPage(v); setPage(1) }} totalRows={rules.length} onPage={setPage} />
      </div>

      {showModal && (
        <div className="house-mo">
          <div className="house-md house-md--md">
            <div className="house-md-head">
              <div>
                <div className="house-md-title">📘 {editingItem ? 'แก้ไขกฎระเบียบ' : 'เพิ่มกฎระเบียบใหม่'}</div>
                <div className="house-md-sub">รองรับเฉพาะไฟล์ PDF เท่านั้น</div>
              </div>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="house-md-body">
                <section className="house-sec">
                  <div className="house-grid house-grid-2">
                    <label className="house-field">
                      <span>หมวดหมู่ *</span>
                      <StyledSelect value={form.category} onChange={(e) => setForm((cur) => ({ ...cur, category: e.target.value, topic_no: editingItem ? cur.topic_no : String(nextTopicNo(rules, e.target.value)) }))}>
                        {CATEGORY_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                      </StyledSelect>
                    </label>
                    <label className="house-field">
                      <span>เรื่องที่ *</span>
                      <input type="number" min="1" step="1" value={form.topic_no} onChange={(e) => setForm((cur) => ({ ...cur, topic_no: e.target.value }))} placeholder="เช่น 1" />
                    </label>
                    <label className="house-field">
                      <span>หัวข้อเรื่อง *</span>
                      <input value={form.title} onChange={(e) => setForm((cur) => ({ ...cur, title: e.target.value }))} placeholder="เช่น ระเบียบการจอดรถ" />
                    </label>
                    <label className="house-field house-field-span-2">
                      <span>รายละเอียด (ไม่บังคับ)</span>
                      <textarea rows="4" value={form.description} onChange={(e) => setForm((cur) => ({ ...cur, description: e.target.value }))} placeholder="สรุปรายละเอียดสั้นๆ" />
                    </label>
                    <label className="house-field house-field-span-2">
                      <span>ไฟล์ PDF {editingItem ? '(เลือกใหม่เมื่อต้องการเปลี่ยนไฟล์)' : '*'}</span>
                      <input type="file" accept="application/pdf,.pdf" onChange={handleFileChange} />
                    </label>
                    <div className="house-field house-field-span-2" style={{ fontSize: '12px', color: 'var(--mu)' }}>
                      {pdfFile ? `ไฟล์ใหม่: ${pdfFile.name}` : (existingPdf.url ? 'ใช้ไฟล์เดิม' : 'ยังไม่ได้แนบไฟล์')}
                      {existingPdf.url && !pdfFile && (
                        <a href={existingPdf.url} target="_blank" rel="noreferrer" style={{ marginLeft: '8px', textDecoration: 'none' }}>เปิดไฟล์ปัจจุบัน</a>
                      )}
                    </div>
                  </div>
                </section>
              </div>
              <div className="house-md-foot">
                <button className="btn btn-g" type="button" onClick={closeModal}>ยกเลิก</button>
                <button className="btn btn-p" type="submit" disabled={saving}>{saving ? 'กำลังบันทึก...' : 'บันทึก'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showPdfViewerModal && (
        <div className="house-mo" style={{ zIndex: 9900 }}>
          <div className="house-md" style={{ width: 'min(96vw, 1120px)', maxWidth: '1120px', height: 'min(92vh, 860px)' }}>
            <div className="house-md-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div className="house-md-title">📄 {pdfViewerTitle}</div>
                <div className="house-md-sub">แสดงตัวอย่างเอกสาร PDF</div>
              </div>
              <button type="button" className="btn btn-g btn-xs" onClick={closePdfViewer}>✕ ปิด</button>
            </div>
            <div className="house-md-body" style={{ padding: 0, overflow: 'hidden' }}>
              {pdfViewerUrl ? (
                <iframe
                  title={pdfViewerTitle}
                  src={pdfViewerUrl}
                  style={{ width: '100%', height: '100%', minHeight: '66vh', border: 'none', background: '#fff' }}
                />
              ) : (
                <div style={{ padding: 16, color: 'var(--mu)' }}>ไม่พบไฟล์ PDF</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}