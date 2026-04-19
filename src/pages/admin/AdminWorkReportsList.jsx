import React, { useEffect, useState } from 'react'
import StyledSelect from '../../components/StyledSelect'
import DropdownList from '../../components/DropdownList'
import VmsPagination from '../../components/VmsPagination'
import { useNavigate } from 'react-router-dom'
import Swal from 'sweetalert2'
import html2canvas from 'html2canvas'
import {
  deleteWorkReport,
  deleteWorkReportImagesByPaths,
  listWorkReportImages,
  listWorkReports,
} from '../../lib/workReports'
import AdminWorkReportForm from './AdminWorkReportForm'
import { getSetupConfig } from '../../lib/setup'
import './AdminDashboard.css'

const CATEGORIES = [
  { value: 'maintenance', label: 'บำรุงรักษา' },
  { value: 'cleaning', label: 'ความสะอาด' },
  { value: 'safety', label: 'ความปลอดภัย' },
  { value: 'activities', label: 'กิจกรรม' },
  { value: 'environment', label: 'สิ่งแวดล้อม' },
]

const YEAR_OPTIONS = [2024, 2025, 2026, 2027, 2028]

function categoryLabel(value) {
  return CATEGORIES.find((item) => item.value === value)?.label || value
}

function formatMonthYear(month, year) {
  return new Date(Number(year), Number(month) - 1).toLocaleDateString('th-TH', {
    month: 'long',
    year: 'numeric',
  })
}

const AdminWorkReportsList = () => {
  const navigate = useNavigate()
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(false)
  const [setup, setSetup] = useState({ villageName: 'The Greenfield' })
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingReportId, setEditingReportId] = useState(null)

  const [searchTerm, setSearchTerm] = useState('')
  const [filterMonth, setFilterMonth] = useState('')
  const [filterYear, setFilterYear] = useState(String(new Date().getFullYear()))
  const [filterCategory, setFilterCategory] = useState('all')
  const [page, setPage] = useState(1)
  const [rowsPerPage, setRowsPerPage] = useState('25')

  const monthOptions = [
    { value: '', label: 'ทุกเดือน' },
    ...[1,2,3,4,5,6,7,8,9,10,11,12].map((m) => ({ value: String(m), label: new Date(2024, m - 1).toLocaleDateString('th-TH', { month: 'long' }) })),
  ]
  const yearOptions = YEAR_OPTIONS.map((y) => ({ value: String(y), label: String(y + 543) }))
  const categoryOptions = [
    { value: 'all', label: 'ทุกหมวดหมู่' },
    ...CATEGORIES.map((cat) => ({ value: cat.value, label: cat.label })),
  ]

  const totalPages = rowsPerPage === 'all' ? 1 : Math.ceil(reports.length / Number(rowsPerPage))
  const pagedReports = rowsPerPage === 'all' ? reports : reports.slice((page - 1) * Number(rowsPerPage), page * Number(rowsPerPage))

  const loadReports = async (override = {}) => {
    try {
      setLoading(true)
      const month = override.month ?? filterMonth
      const year = override.year ?? filterYear
      const category = override.category ?? filterCategory
      const search = override.search ?? searchTerm

      const data = await listWorkReports({
        month: month ? Number(month) : null,
        year: year ? Number(year) : null,
        category,
        search,
      })
      setReports(data)
    } catch (error) {
      await Swal.fire({ icon: 'error', title: 'โหลดข้อมูลไม่สำเร็จ', text: error.message })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const init = async () => {
      const cfg = await getSetupConfig()
      setSetup(cfg)
      await loadReports()
    }
    init()
  }, [])

  const handleDelete = async (report) => {
    const result = await Swal.fire({
      icon: 'warning',
      title: 'ยืนยันการลบ',
      text: 'ลบผลงานนิติ ' + categoryLabel(report.category) + ' ใช่หรือไม่?',
      showCancelButton: true,
      confirmButtonText: 'ลบ',
      cancelButtonText: 'ยกเลิก',
      confirmButtonColor: '#c0392b',
    })

    if (!result.isConfirmed) return

    try {
      const images = await listWorkReportImages(report.id)
      const paths = images.map((img) => img.path).filter(Boolean)
      if (paths.length > 0) {
        await deleteWorkReportImagesByPaths(paths)
      }

      await deleteWorkReport(report.id)
      await Swal.fire({ icon: 'success', title: 'ลบสำเร็จ', timer: 1200, showConfirmButton: false })
      await loadReports()
    } catch (error) {
      await Swal.fire({ icon: 'error', title: 'ลบไม่สำเร็จ', text: error.message })
    }
  }

  const handleExportImage = async (report) => {
    try {
      const images = await listWorkReportImages(report.id)
      const monthYear = formatMonthYear(report.month, report.year)
      const cat = categoryLabel(report.category)
      const printDate = new Date().toLocaleDateString('th-TH', { dateStyle: 'long' })
      const statusColor = report.is_published ? '#15803d' : '#b45309'
      const statusBg   = report.is_published ? '#dcfce7' : '#fef3c7'
      const statusText = report.is_published ? 'เผยแพร่แล้ว' : 'ฉบับร่าง'

      let imageGridHtml = ''
      if (images.length > 0) {
        const imgSlice = images.slice(0, 6)
        const cols = imgSlice.length === 1 ? 1 : 2
        const imgTags = imgSlice.map((img) =>
          `<div style="width:100%;height:220px;padding:6px;background:#f8fafc;border:1px solid #e5e7eb;border-radius:6px;display:flex;align-items:center;justify-content:center;overflow:hidden;box-sizing:border-box;">
             <img src="${img.url}" crossorigin="anonymous" style="max-width:100%;max-height:100%;width:auto;height:auto;display:block;" />
           </div>`
        ).join('')
        imageGridHtml = `
          <div style="margin-bottom:16px;">
            <div style="font-size:10px;color:#9ca3af;letter-spacing:1px;text-transform:uppercase;margin-bottom:8px;">ภาพประกอบ (${imgSlice.length} รูป)</div>
            <div style="display:grid;grid-template-columns:repeat(${cols},1fr);gap:10px;">${imgTags}</div>
          </div>`
      }

      const detailHtml = report.detail
        ? `<div style="margin-bottom:24px;">
            <div style="font-size:10px;color:#9ca3af;letter-spacing:1px;text-transform:uppercase;margin-bottom:6px;">รายละเอียด</div>
            <div style="font-size:13px;line-height:1.7;color:#374151;">${String(report.detail).replace(/\n/g, '<br/>')}</div>
          </div>`
        : ''

      const html = `
        <div style="width:794px;min-height:1123px;background:#fff;color:#1f2937;font-family:Sarabun,Arial,sans-serif;box-sizing:border-box;position:relative;padding-bottom:56px;">
          <div style="background:linear-gradient(135deg,#1B4F72 0%,#1E40AF 100%);padding:32px 48px 28px;color:#fff;">
            <div style="display:flex;align-items:center;gap:16px;margin-bottom:4px;">
              <div style="font-size:40px;line-height:1;">🏆</div>
              <div>
                <div style="font-size:10px;letter-spacing:3px;opacity:.7;text-transform:uppercase;margin-bottom:2px;">WORK REPORT</div>
                <div style="font-size:26px;font-weight:800;letter-spacing:.3px;">รายงานผลงานนิติ</div>
              </div>
            </div>
            <div style="font-size:15px;opacity:.85;margin-top:6px;">${setup.villageName}</div>
          </div>
          <div style="padding:32px 48px 0;">
            <div style="display:grid;grid-template-columns:1fr 1fr 1fr;border:1.5px solid #e5e7eb;border-radius:8px;overflow:hidden;margin-bottom:24px;">
              <div style="padding:14px 20px;border-right:1.5px solid #e5e7eb;">
                <div style="font-size:10px;color:#9ca3af;letter-spacing:1px;text-transform:uppercase;margin-bottom:4px;">ประจำเดือน</div>
                <div style="font-size:17px;font-weight:700;color:#1B4F72;">${monthYear}</div>
              </div>
              <div style="padding:14px 20px;border-right:1.5px solid #e5e7eb;">
                <div style="font-size:10px;color:#9ca3af;letter-spacing:1px;text-transform:uppercase;margin-bottom:4px;">หมวดหมู่</div>
                <div style="font-size:17px;font-weight:700;color:#1B4F72;">${cat}</div>
              </div>
              <div style="padding:14px 20px;">
                <div style="font-size:10px;color:#9ca3af;letter-spacing:1px;text-transform:uppercase;margin-bottom:4px;">สถานะ</div>
                <div style="display:inline-block;padding:3px 10px;border-radius:20px;background:${statusBg};color:${statusColor};font-size:12px;font-weight:700;">${statusText}</div>
              </div>
            </div>
            <div style="margin-bottom:22px;">
              <div style="font-size:10px;color:#9ca3af;letter-spacing:1px;text-transform:uppercase;margin-bottom:6px;">สรุปผลงาน</div>
              <div style="font-size:19px;font-weight:700;line-height:1.4;color:#111827;">${report.summary}</div>
            </div>
            ${detailHtml}
            ${imageGridHtml}
          </div>
          <div style="position:absolute;bottom:0;left:0;right:0;padding:14px 48px;background:#f9fafb;border-top:1.5px solid #e5e7eb;display:flex;justify-content:space-between;align-items:center;">
            <div style="font-size:11px;color:#9ca3af;">${setup.villageName} · ผลงานนิติ</div>
            <div style="font-size:11px;color:#9ca3af;">พิมพ์เมื่อ ${printDate}</div>
          </div>
        </div>`

      const temp = document.createElement('div')
      temp.innerHTML = html.trim()
      const el = temp.firstChild
      el.style.position = 'fixed'
      el.style.left = '-9999px'
      el.style.top = '0'
      document.body.appendChild(el)

      // wait for images to load before capturing
      const imgEls = el.querySelectorAll('img')
      await Promise.all(Array.from(imgEls).map((img) =>
        new Promise((resolve) => {
          if (img.complete) { resolve(); return }
          img.onload = resolve
          img.onerror = resolve
        })
      ))

      const canvas = await html2canvas(el, {
        scale: 2,
        useCORS: true,
        allowTaint: false,
        backgroundColor: '#ffffff',
        logging: false,
        width: 794,
      })
      document.body.removeChild(el)

      canvas.toBlob((blob) => {
        if (!blob) return
        const link = document.createElement('a')
        link.href = URL.createObjectURL(blob)
        link.download = 'work-report-' + report.month + '-' + report.year + '.png'
        link.click()
        setTimeout(() => URL.revokeObjectURL(link.href), 5000)
      }, 'image/png')

      await Swal.fire({ icon: 'success', title: 'ดาวน์โหลดสำเร็จ', timer: 1000, showConfirmButton: false })
    } catch (error) {
      await Swal.fire({ icon: 'error', title: 'ดาวน์โหลดไม่สำเร็จ', text: error.message })
    }
  }

  return (
    <div className="pane on houses-compact">
      <div className="ph houses-ph">
        <div className="ph-in">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div className="ph-ico">🏆</div>
            <div>
              <div className="ph-h1">ผลงานนิติ</div>
              <div className="ph-sub">ค้นหาและจัดการรายงานผลงาน</div>
            </div>
          </div>
        </div>

      </div>

      <div className="card houses-main-card">
        <div className="vms-panel-toolbar">
          <div className="vms-toolbar-left">
            <DropdownList compact value={filterMonth} options={monthOptions} onChange={(v) => { setFilterMonth(v); setPage(1) }} placeholder="ทุกเดือน" />
            <DropdownList compact value={filterYear} options={yearOptions} onChange={(v) => { setFilterYear(v); setPage(1) }} placeholder="ปี" />
            <DropdownList compact value={filterCategory} options={categoryOptions} onChange={(v) => { setFilterCategory(v); setPage(1) }} placeholder="ทุกหมวดหมู่" />
            <div className="vms-inline-search">
              <svg width="12" height="12" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd"/>
              </svg>
              <input type="text" value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setPage(1) }} placeholder="ค้นหาจากสรุป/รายละเอียด..." />
            </div>
          </div>
          <div className="vms-toolbar-right">
            <button className="vms-sm-btn vms-sm-btn--primary" onClick={() => setShowCreateModal(true)}>+ เพิ่มผลงาน</button>
            <button className="vms-sm-btn" onClick={() => loadReports()}><svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M17.65 6.35A7.958 7.958 0 0 0 12 4C7.58 4 4.01 7.58 4.01 12S7.58 20 12 20c3.73 0 6.84-2.55 7.73-6h-2.08A5.99 5.99 0 0 1 12 18c-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/></svg></button>
          </div>
        </div>
        <div className="cb houses-table-card-body houses-main-body">
          <div className="houses-table-wrap houses-desktop-only">
            <table className="tw houses-table houses-main-table" style={{ width: '100%', minWidth: '780px' }}>
              <thead>
                <tr>
                  <th>เดือน</th>
                  <th>หมวดหมู่</th>
                  <th>สรุป</th>
                  <th>รูป</th>
                  <th>สถานะ</th>
                  <th>จัดการ</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6} style={{ textAlign: 'center' }}>กำลังโหลด...</td></tr>
                ) : reports.length === 0 ? (
                  <tr><td colSpan={6} style={{ textAlign: 'center' }}>ไม่มีข้อมูล</td></tr>
                ) : pagedReports.map((report) => (
                  <tr key={report.id}>
                    <td>{formatMonthYear(report.month, report.year)}</td>
                    <td>{categoryLabel(report.category)}</td>
                    <td style={{ maxWidth: '280px' }}>{report.summary}</td>
                    <td>{report.image_urls?.length || 0}</td>
                    <td>
                      {report.is_published
                        ? <span className="bd b-ok">เผยแพร่</span>
                        : <span className="bd b-mu">ฉบับร่าง</span>}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button className="btn btn-xs btn-a" onClick={() => setEditingReportId(report.id)}>แก้ไข</button>
                        <button className="btn btn-xs btn-o" title="ส่งออก PNG" onClick={() => handleExportImage(report)}>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block' }}>
                            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                            <circle cx="8.5" cy="8.5" r="1.5" />
                            <polyline points="21 15 16 10 5 21" />
                          </svg>
                        </button>
                        <button className="btn btn-xs btn-dg" onClick={() => handleDelete(report)}>ลบ</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="houses-mobile-only">
            {loading ? (
              <div className="houses-card-empty">กำลังโหลด...</div>
            ) : reports.length === 0 ? (
              <div className="houses-card-empty">ไม่มีข้อมูล</div>
            ) : reports.map((report) => (
              <div key={report.id} className="houses-mcard">
                <div className="houses-mcard-top">
                  <div className="houses-mcard-no">{formatMonthYear(report.month, report.year)}</div>
                  <span className={`bd ${report.is_published ? 'b-ok' : 'b-mu'} houses-mcard-badge`}>
                    {report.is_published ? 'เผยแพร่' : 'ร่าง'}
                  </span>
                </div>
                <div className="houses-mcard-owner">{categoryLabel(report.category)}</div>
                <div style={{ fontSize: '13px', color: 'var(--tx)', marginTop: '2px', lineHeight: '1.4' }}>
                  {report.summary}
                </div>
                {(report.image_urls?.length > 0) && (
                  <div style={{ fontSize: '12px', color: 'var(--mu)', marginTop: '4px' }}>
                    📷 {report.image_urls.length} รูป
                  </div>
                )}
                <div className="houses-mcard-actions">
                  <div className="vms-row-acts">
                    <button className="vms-ra-btn vms-ra-edit" title="แก้ไข" onClick={() => setEditingReportId(report.id)}><svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"/></svg></button>
                    <button className="vms-ra-btn vms-ra-view" title="ส่งออก PNG" onClick={() => handleExportImage(report)}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block' }}>
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                        <circle cx="8.5" cy="8.5" r="1.5" />
                        <polyline points="21 15 16 10 5 21" />
                      </svg>
                    </button>
                    <button className="vms-ra-btn vms-ra-del" title="ลบ" onClick={() => handleDelete(report)}><svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd"/></svg></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <VmsPagination page={page} totalPages={totalPages} rowsPerPage={rowsPerPage} setRowsPerPage={(v) => { setRowsPerPage(v); setPage(1) }} totalRows={reports.length} onPage={setPage} />
      </div>

      {showCreateModal && (
        <div className="house-mo">
          <div className="house-md house-md--lg">
            <div className="house-md-head">
              <div>
                <div className="house-md-title">🏆 เพิ่มผลงานนิติ</div>
                <div className="house-md-sub">บันทึกผลงานประจำเดือน พร้อมแนบรูป</div>
              </div>
            </div>
            <AdminWorkReportForm
              modalMode
              forceCreate
              onCancel={() => setShowCreateModal(false)}
              onSaved={async () => {
                setShowCreateModal(false)
                await loadReports()
              }}
            />
          </div>
        </div>
      )}

      {editingReportId && (
        <div className="house-mo">
          <div className="house-md house-md--lg">
            <div className="house-md-head">
              <div>
                <div className="house-md-title">✏️ แก้ไขผลงานนิติ</div>
                <div className="house-md-sub">แก้ไขผลงาน พร้อมเพิ่ม/ลบรูปแนบ</div>
              </div>
            </div>
            <AdminWorkReportForm
              key={editingReportId}
              modalMode
              reportId={editingReportId}
              onCancel={() => setEditingReportId(null)}
              onSaved={async () => {
                setEditingReportId(null)
                await loadReports()
              }}
            />
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminWorkReportsList