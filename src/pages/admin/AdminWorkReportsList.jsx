import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Swal from 'sweetalert2'
import html2canvas from 'html2canvas'
import {
  deleteWorkReport,
  deleteWorkReportImagesByPaths,
  listWorkReportImages,
  listWorkReports,
} from '../../lib/workReports'
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

  const [searchTerm, setSearchTerm] = useState('')
  const [filterMonth, setFilterMonth] = useState('')
  const [filterYear, setFilterYear] = useState(String(new Date().getFullYear()))
  const [filterCategory, setFilterCategory] = useState('all')

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

      let imageBlocks = ''
      if (images.length > 0) {
        imageBlocks = images.slice(0, 4).map((img) => (
          '<img src="' + img.url + '" style="width:100%;height:300px;object-fit:cover;border-radius:8px;" />'
        )).join('')
        imageBlocks = '<div style="display:grid;grid-template-columns:repeat(2,1fr);gap:15px;">' + imageBlocks + '</div>'
      }

      const detailBlock = report.detail
        ? '<div style="margin-top:16px;"><div style="font-size:14px;opacity:.9;">รายละเอียด</div><div style="font-size:16px;line-height:1.6;">' + String(report.detail).replace(/\n/g, '<br/>') + '</div></div>'
        : ''

      const html =
        '<div style="width:1080px;padding:40px;background:linear-gradient(135deg,#1B4F72,#1E40AF);color:#fff;font-family:Sarabun,Arial,sans-serif;">' +
          '<div style="text-align:center;margin-bottom:28px;">' +
            '<div style="font-size:36px;font-weight:800;">รายงานผลงานนิติ</div>' +
            '<div style="font-size:24px;opacity:.9;">' + setup.villageName + '</div>' +
          '</div>' +
          '<div style="background:rgba(255,255,255,.12);padding:24px;border-radius:12px;margin-bottom:20px;">' +
            '<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px;">' +
              '<div><div style="font-size:13px;opacity:.85;">เดือน</div><div style="font-size:20px;font-weight:700;">' + monthYear + '</div></div>' +
              '<div><div style="font-size:13px;opacity:.85;">หมวดหมู่</div><div style="font-size:20px;font-weight:700;">' + cat + '</div></div>' +
            '</div>' +
            '<div><div style="font-size:13px;opacity:.85;">สรุป</div><div style="font-size:22px;font-weight:700;line-height:1.4;">' + report.summary + '</div></div>' +
            detailBlock +
          '</div>' +
          imageBlocks +
        '</div>'

      const temp = document.createElement('div')
      temp.innerHTML = html
      temp.style.position = 'fixed'
      temp.style.left = '-9999px'
      document.body.appendChild(temp)

      const canvas = await html2canvas(temp.firstChild, { scale: 1, backgroundColor: '#ffffff', logging: false })
      document.body.removeChild(temp)

      canvas.toBlob((blob) => {
        if (!blob) return
        const link = document.createElement('a')
        link.href = URL.createObjectURL(blob)
        link.download = 'work-report-' + report.month + '-' + report.year + '.png'
        link.click()
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

        <div className="houses-filter-row">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="ค้นหาจากสรุป/รายละเอียด..."
            className="houses-filter-input"
          />
          <select value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)} className="houses-filter-select">
            <option value="">ทุกเดือน</option>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => (
              <option key={m} value={m}>{new Date(2024, m - 1).toLocaleDateString('th-TH', { month: 'long' })}</option>
            ))}
          </select>
          <select value={filterYear} onChange={(e) => setFilterYear(e.target.value)} className="houses-filter-select">
            {YEAR_OPTIONS.map((y) => <option key={y} value={y}>{y + 543}</option>)}
          </select>
          <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className="houses-filter-select">
            <option value="all">ทุกหมวดหมู่</option>
            {CATEGORIES.map((cat) => <option key={cat.value} value={cat.value}>{cat.label}</option>)}
          </select>
          <button className="btn btn-a btn-sm houses-filter-btn" onClick={() => loadReports()}>ค้นหา</button>
        </div>
      </div>

      <div className="card">
        <div className="ch houses-list-head">
          <div className="ct">รายการผลงานนิติ ({reports.length} รายการ)</div>
          <div className="houses-list-actions">
            <button className="btn btn-p btn-sm" onClick={() => navigate('/admin/work-reports/new')}>+ เพิ่มผลงาน</button>
            <button className="btn btn-g btn-sm" onClick={() => loadReports()}>รีเฟรช</button>
          </div>
        </div>
        <div className="cb houses-table-card-body">
          <div className="houses-table-wrap houses-desktop-only">
            <table className="tw houses-table" style={{ width: '100%', minWidth: '780px' }}>
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
                ) : reports.map((report) => (
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
                        <button className="btn btn-xs btn-a" onClick={() => navigate('/admin/work-reports/' + report.id + '/edit')}>แก้ไข</button>
                        <button className="btn btn-xs btn-o" onClick={() => handleExportImage(report)}>ส่ง</button>
                        <button className="btn btn-xs btn-dg" onClick={() => handleDelete(report)}>ลบ</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AdminWorkReportsList
