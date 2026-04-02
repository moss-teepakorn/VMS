import { useEffect, useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import Chart from 'chart.js/auto'
import Swal from 'sweetalert2'
import { useAuth } from '../../contexts/AuthContext'
import {
  listHouseViolations,
  listViolationImages,
  residentUpdateViolation,
  uploadViolationImages,
} from '../../lib/violations'
import { createPayment, listHouseFees, listHousePayments } from '../../lib/fees'
import { listAnnouncements } from '../../lib/announcements'
import { listWorkReports } from '../../lib/workReports'
import { listTechnicians } from '../../lib/technicians'
import { listMarketplace } from '../../lib/marketplace'
import { listVehicles } from '../../lib/vehicles'
import { listIssues, createIssue } from '../../lib/issues'
import { getHouseDetail, updateUser } from '../../lib/users'
import { getSetupConfig, applyDocumentTitle } from '../../lib/setup'
import { insertPageViewLog } from '../../lib/loginLogs'
import '../admin/AdminLayout.css'
import '../admin/AdminDashboard.css'
import './ResidentLayout.css'

const MAX_ATTACHMENTS = 5
const MAX_IMAGE_SIZE_BYTES = 100 * 1024
const MAX_IMAGE_TARGET_BYTES = 95 * 1024
const REJECT_PREFIX = '[REJECT] '

function getRejectedReason(note) {
  const raw = String(note || '')
  if (!raw.startsWith(REJECT_PREFIX)) return ''
  const firstLine = raw.split('\n')[0]
  return firstLine.replace(REJECT_PREFIX, '').trim()
}

function getDisplayNote(note) {
  const raw = String(note || '')
  if (!raw.startsWith(REJECT_PREFIX)) return raw
  const lines = raw.split('\n')
  lines.shift()
  return lines.join('\n').trim()
}

function blurActiveElement() {
  const el = document.activeElement
  if (el instanceof HTMLElement) el.blur()
}

function showSwal(options) {
  blurActiveElement()
  return Swal.fire({ returnFocus: false, ...options })
}

const THEMES = ['normal', 'dark', 'rose', 'sage', 'sand', 'violet', 'teal', 'coral', 'mauve', 'dustyrose']

const NAV_GROUPS = [
  {
    section: 'หลัก',
    items: [
      { key: 'dash', icon: '🏡', label: 'หน้าแรก' },
      { key: 'house', icon: '🏠', label: 'ข้อมูลบ้านของฉัน' },
      { key: 'vehicles', icon: '🚗', label: 'ข้อมูลรถ' },
      { key: 'fees', icon: '💳', label: 'ค่าส่วนกลาง' },
      { key: 'issue', icon: '🔔', label: 'แจ้งปัญหา' },
      { key: 'notif', icon: '⚠️', label: 'การแจ้งเตือน' },
    ],
  },
  {
    section: 'ข้อมูล',
    items: [
      { key: 'news', icon: '📢', label: 'ประกาศ' },
      { key: 'work', icon: '🏆', label: 'ผลงานนิติ' },
      { key: 'tech', icon: '🔨', label: 'ทำเนียบช่าง' },
      { key: 'market', icon: '🛒', label: 'ตลาดชุมชน' },
    ],
  },
  {
    section: 'บัญชี',
    items: [
      { key: 'profile', icon: '👤', label: 'โปรไฟล์' },
    ],
  },
]

const SECTION_TITLE = {
  dash: (hn) => ({ main: 'หน้าแรก', sub: `บ้าน ${hn}` }),
  house: () => ({ main: 'ข้อมูลบ้าน', sub: 'บ้านของฉัน' }),
  vehicles: () => ({ main: 'ข้อมูลรถ', sub: 'รถของฉัน' }),
  fees: () => ({ main: 'ค่าส่วนกลาง', sub: 'การชำระเงิน' }),
  issue: () => ({ main: 'แจ้งปัญหา', sub: 'ติดตามสถานะ' }),
  notif: () => ({ main: 'การแจ้งเตือน', sub: 'จากนิติ' }),
  news: () => ({ main: 'ประกาศ', sub: 'ข่าวสาร' }),
  work: () => ({ main: 'ผลงานนิติ', sub: 'รายงาน' }),
  tech: () => ({ main: 'ทำเนียบช่าง', sub: 'ช่างในชุมชน' }),
  market: () => ({ main: 'ตลาดชุมชน', sub: 'ซื้อ-ขาย-แจก' }),
  profile: () => ({ main: 'โปรไฟล์', sub: 'ตั้งค่าบัญชี' }),
}

function getTypeLabel(type) {
  const MAP = { urgent: 'ด่วน', event: 'กิจกรรม', normal: 'ทั่วไป', general: 'ทั่วไป' }
  return MAP[type] || type || 'ทั่วไป'
}

function getAnnDotClass(type) {
  if (type === 'urgent') return 'ad-urg'
  if (type === 'event') return 'ad-evt'
  return 'ad-gen'
}

function renderStars(rating) {
  const n = Math.min(5, Math.max(0, Math.round(Number(rating || 0))))
  return '★'.repeat(n) + '☆'.repeat(5 - n)
}

function vehicleTypeIcon(vt) {
  if (!vt) return '🚗'
  const t = vt.toLowerCase()
  if (t.includes('motorbike') || t.includes('motorcycle') || t.includes('bike')) return '🏍️'
  if (t.includes('truck')) return '🚛'
  if (t.includes('van')) return '🚐'
  return '🚗'
}

function marketBadgeClass(lt) {
  if (lt === 'free') return 'ms-free'
  if (lt === 'rent') return 'ms-rent'
  if (lt === 'sold') return 'ms-sold'
  return 'ms-sale'
}

function marketBadgeLabel(lt) {
  if (lt === 'free') return 'ฟรี'
  if (lt === 'rent') return 'เช่า'
  if (lt === 'sold') return 'ขายแล้ว'
  return 'ขาย'
}

export default function ResidentLayout() {
  const navigate = useNavigate()
  const { profile, logout } = useAuth()

  const [activeSection, setActiveSection] = useState('dash')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [theme, setTheme] = useState(() => localStorage.getItem('vms-theme') || 'normal')
  const [setupOpen, setSetupOpen] = useState(false)
  const [houseNo, setHouseNo] = useState('-')
  const [setup, setSetup] = useState({ villageName: 'The Greenfield', appLineMain: 'Village Management', version: 'v12.3' })

  const [fees, setFees] = useState([])
  const [payments, setPayments] = useState([])
  const [feeLoading, setFeeLoading] = useState(false)
  const [feeStatusFilter, setFeeStatusFilter] = useState('all')
  const [feeYearFilter, setFeeYearFilter] = useState('all')
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [selectedFee, setSelectedFee] = useState(null)
  const [paymentForm, setPaymentForm] = useState({ amount: '', payment_method: 'transfer', slip_url: '', note: '' })

  const [violations, setViolations] = useState([])
  const [statusFilter, setStatusFilter] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(false)
  const [showViolationModal, setShowViolationModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editingViolation, setEditingViolation] = useState(null)
  const [residentNote, setResidentNote] = useState('')
  const [attachments, setAttachments] = useState([])

  const [announcements, setAnnouncements] = useState([])
  const [workReports, setWorkReports] = useState([])
  const [technicians, setTechnicians] = useState([])
  const [marketplace, setMarketplace] = useState([])
  const [vehicles, setVehicles] = useState([])
  const [issues, setIssues] = useState([])
  const [houseDetail, setHouseDetail] = useState(null)

  const [showIssueForm, setShowIssueForm] = useState(false)
  const [issueForm, setIssueForm] = useState({ title: '', detail: '', category: 'general' })
  const [issueSubmitting, setIssueSubmitting] = useState(false)

  const [profileForm, setProfileForm] = useState({ full_name: '', phone: '', email: '' })
  const [profileSaving, setProfileSaving] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordSaving, setPasswordSaving] = useState(false)
  const [showNewPw, setShowNewPw] = useState(false)
  const [showConfPw, setShowConfPw] = useState(false)

  const [techSearch, setTechSearch] = useState('')
  const [marketSearch, setMarketSearch] = useState('')
  const [marketFilter, setMarketFilter] = useState('all')

  const chartCanvasRef = useRef(null)
  const chartInstanceRef = useRef(null)

  useEffect(() => {
    document.body.setAttribute('data-theme', theme)
    localStorage.setItem('vms-theme', theme)
  }, [theme])

  useEffect(() => {
    getSetupConfig().then((s) => {
      setSetup(s)
      applyDocumentTitle(s.villageName)
    }).catch(() => {})
  }, [])

  useEffect(() => {
    if (!profile?.house_id) { setHouseNo('-'); return }
    getHouseDetail(profile.house_id)
      .then((d) => setHouseNo(d?.house_no || '-'))
      .catch(() => setHouseNo('-'))
  }, [profile?.house_id])

  useEffect(() => {
    if (profile) {
      setProfileForm({
        full_name: profile.full_name || '',
        phone: profile.phone || '',
        email: profile.email || '',
      })
    }
  }, [profile])

  useEffect(() => {
    if (!profile?.id) return
    insertPageViewLog({
      user_id: profile.id,
      username: profile.username,
      full_name: profile.full_name,
      role: profile.role,
      page_path: `/resident/${activeSection}`,
    })
  }, [activeSection, profile?.id])

  useEffect(() => {
    if (!setupOpen) return
    const handle = (e) => {
      const menu = document.getElementById('r-setup-menu')
      const btn = document.getElementById('r-setup-btn')
      if (menu && !menu.contains(e.target) && btn && !btn.contains(e.target)) {
        setSetupOpen(false)
      }
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [setupOpen])

  useEffect(() => {
    const fn = () => { if (window.innerWidth >= 1024) setSidebarOpen(false) }
    window.addEventListener('resize', fn)
    return () => window.removeEventListener('resize', fn)
  }, [])

  const loadFeeData = useCallback(async (override = {}) => {
    if (!profile?.house_id) return
    try {
      setFeeLoading(true)
      const [feeRows, paymentRows] = await Promise.all([
        listHouseFees(profile.house_id, {
          status: override.status ?? feeStatusFilter,
          year: override.year ?? feeYearFilter,
        }),
        listHousePayments(profile.house_id),
      ])
      setFees(feeRows)
      setPayments(paymentRows)
    } catch (error) {
      await showSwal({ icon: 'error', title: 'โหลดค่าส่วนกลางไม่สำเร็จ', text: error.message })
    } finally {
      setFeeLoading(false)
    }
  }, [profile?.house_id, feeStatusFilter, feeYearFilter])

  useEffect(() => { loadFeeData() }, [profile?.house_id])

  const loadViolations = useCallback(async (override = {}) => {
    if (!profile?.house_id) return
    try {
      setLoading(true)
      const data = await listHouseViolations(profile.house_id, {
        status: override.status ?? statusFilter,
        search: override.search ?? searchTerm,
      })
      setViolations(data)
    } catch (error) {
      await showSwal({ icon: 'error', title: 'โหลดข้อมูลไม่สำเร็จ', text: error.message })
    } finally {
      setLoading(false)
    }
  }, [profile?.house_id, statusFilter, searchTerm])

  useEffect(() => { loadViolations() }, [profile?.house_id])

  useEffect(() => {
    if (activeSection === 'news' && announcements.length === 0) {
      listAnnouncements().then(setAnnouncements).catch(() => {})
    }
    if (activeSection === 'work' && workReports.length === 0) {
      listWorkReports().then(setWorkReports).catch(() => {})
    }
    if (activeSection === 'tech' && technicians.length === 0) {
      listTechnicians().then(setTechnicians).catch(() => {})
    }
    if (activeSection === 'market' && marketplace.length === 0) {
      listMarketplace({ status: 'active' }).then(setMarketplace).catch(() => {})
    }
    if (activeSection === 'vehicles' && vehicles.length === 0 && profile?.house_id) {
      listVehicles().then((all) => setVehicles(all.filter((v) => v.house_id === profile.house_id))).catch(() => {})
    }
    if (activeSection === 'issue' && issues.length === 0 && profile?.house_id) {
      listIssues().then((all) => setIssues(all.filter((i) => i.house_id === profile.house_id))).catch(() => {})
    }
    if (activeSection === 'house' && !houseDetail && profile?.house_id) {
      getHouseDetail(profile.house_id).then(setHouseDetail).catch(() => {})
    }
    if (activeSection === 'dash' && announcements.length === 0) {
      listAnnouncements().then(setAnnouncements).catch(() => {})
    }
  }, [activeSection, profile?.house_id])

  useEffect(() => {
    if (activeSection !== 'dash') return
    if (!chartCanvasRef.current) return
    const sorted = [...fees]
      .sort((a, b) => {
        if (Number(b.year || 0) !== Number(a.year || 0)) return Number(b.year || 0) - Number(a.year || 0)
        return String(b.period || '').localeCompare(String(a.period || ''))
      })
      .slice(0, 8)
      .reverse()

    if (sorted.length === 0) return

    if (chartInstanceRef.current) { chartInstanceRef.current.destroy(); chartInstanceRef.current = null }

    const labels = sorted.map((f) => `${f.period || ''} ${f.year || ''}`.trim())
    const data = sorted.map((f) => Number(f.total_amount || 0))
    const bgColors = sorted.map((f) => {
      if (f.status === 'paid') return '#22c55e'
      if (f.status === 'overdue') return '#ef4444'
      return '#f59e0b'
    })

    chartInstanceRef.current = new Chart(chartCanvasRef.current, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'ค่าส่วนกลาง',
          data,
          backgroundColor: bgColors,
          borderRadius: 6,
          barThickness: 28,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: (ctx) => `฿${Number(ctx.raw || 0).toLocaleString('th-TH')}` } },
        },
        scales: {
          x: { grid: { display: false } },
          y: { ticks: { callback: (v) => `฿${Number(v).toLocaleString()}` } },
        },
      },
    })

    return () => {
      if (chartInstanceRef.current) { chartInstanceRef.current.destroy(); chartInstanceRef.current = null }
    }
  }, [activeSection, fees])

  function getFeeStatusBadge(status) {
    if (status === 'paid') return { className: 'bd b-ok', label: 'ชำระแล้ว' }
    if (status === 'pending') return { className: 'bd b-pr', label: 'รอตรวจสอบ' }
    if (status === 'overdue') return { className: 'bd b-dg', label: 'ค้างชำระ' }
    return { className: 'bd b-wn', label: 'ยังไม่ชำระ' }
  }

  function getPaymentStatusBadge(row) {
    if (row.verified_at) return { className: 'bd b-ok', label: 'อนุมัติแล้ว' }
    if (getRejectedReason(row.note)) return { className: 'bd b-dg', label: 'ตีกลับ' }
    return { className: 'bd b-wn', label: 'รอตรวจสอบ' }
  }

  function getStatusBadge(status) {
    if (status === 'resolved') return { className: 'bd b-ok', label: 'แก้ไขแล้ว' }
    if (status === 'in_progress') return { className: 'bd b-pr', label: 'กำลังดำเนินการ' }
    if (status === 'pending') return { className: 'bd b-wn', label: 'รอดำเนินการ' }
    if (status === 'cancelled') return { className: 'bd b-dg', label: 'ยกเลิก' }
    return { className: 'bd b-mu', label: status }
  }

  function formatDate(value) {
    if (!value) return '-'
    return new Date(value).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' })
  }

  function formatMoney(value) {
    return Number(value || 0).toLocaleString('th-TH')
  }

  function formatMethod(method) {
    if (method === 'transfer') return 'โอนเงิน'
    if (method === 'cash') return 'เงินสด'
    if (method === 'qr') return 'QR'
    return method || '-'
  }

  const unresolvedFees = fees.filter((f) => f.status === 'unpaid' || f.status === 'overdue')
  const overdueAmount = unresolvedFees.reduce((sum, f) => sum + Number(f.total_amount || 0), 0)
  const inProgressViolations = violations.filter((v) => v.status === 'pending' || v.status === 'in_progress')
  const latestViolation = violations[0] || null
  const pendingIssues = issues.filter((i) => i.status === 'pending' || i.status === 'in_progress')
  const latestAnnouncements = announcements.slice(0, 3)

  const filteredTechs = technicians.filter((t) => {
    if (!techSearch) return true
    const kw = techSearch.toLowerCase()
    const skills = (t.technician_services || []).map((s) => s.skill).join(' ')
    return [t.name, t.phone, skills].join(' ').toLowerCase().includes(kw)
  })

  const filteredMarket = marketplace.filter((m) => {
    if (marketFilter !== 'all' && m.listing_type !== marketFilter) return false
    if (!marketSearch) return true
    const kw = marketSearch.toLowerCase()
    return [m.title, m.category, m.contact].join(' ').toLowerCase().includes(kw)
  })

  const titleFn = SECTION_TITLE[activeSection] || SECTION_TITLE.dash
  const titleData = titleFn(houseNo)

  function navTo(key) {
    setActiveSection(key)
    setSidebarOpen(false)
  }

  function openPaymentModal(fee) {
    setSelectedFee(fee)
    setPaymentForm({ amount: String(Number(fee.total_amount || 0)), payment_method: 'transfer', slip_url: '', note: '' })
    setShowPaymentModal(true)
  }

  function closePaymentModal() {
    setShowPaymentModal(false)
    setSelectedFee(null)
    setPaymentForm({ amount: '', payment_method: 'transfer', slip_url: '', note: '' })
  }

  async function handleSubmitPayment(event) {
    event.preventDefault()
    if (!selectedFee) return
    if (!paymentForm.amount || Number(paymentForm.amount) <= 0) {
      await showSwal({ icon: 'warning', title: 'กรุณาระบุยอดชำระ' }); return
    }
    if (!paymentForm.slip_url.trim()) {
      await showSwal({ icon: 'warning', title: 'กรุณาแนบลิงก์หลักฐานการชำระ' }); return
    }
    try {
      await createPayment({
        fee_id: selectedFee.id,
        house_id: profile?.house_id,
        amount: Number(paymentForm.amount),
        payment_method: paymentForm.payment_method,
        slip_url: paymentForm.slip_url,
        note: paymentForm.note,
        payment_items: [{
          item_key: 'resident_submitted_total',
          item_label: 'ยอดชำระที่ลูกบ้านส่งมา',
          due_amount: Number(selectedFee.total_amount || 0),
          paid_amount: Number(paymentForm.amount || 0),
        }],
      })
      await showSwal({ icon: 'success', title: 'ส่งหลักฐานแล้ว', text: 'รอนิติตรวจสอบ', timer: 1400, showConfirmButton: false })
      closePaymentModal()
      await loadFeeData({ status: feeStatusFilter, year: feeYearFilter })
    } catch (error) {
      await showSwal({ icon: 'error', title: 'ส่งหลักฐานไม่สำเร็จ', text: error.message })
    }
  }

  async function openViolationModal(item) {
    setEditingViolation(item)
    setResidentNote(item.resident_note || '')
    try {
      const imgs = await listViolationImages(item.id)
      setAttachments(imgs.map((img) => ({ ...img, source: 'existing' })))
    } catch {
      setAttachments([])
    }
    setShowViolationModal(true)
  }

  function closeViolationModal(force = false) {
    if (saving && !force) return
    setShowViolationModal(false)
    setEditingViolation(null)
    setResidentNote('')
    setAttachments([])
  }

  function formatResidentFileName(index) {
    const now = new Date()
    const date = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`
    const time = `${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`
    return `VIO_RES_${date}_${time}_${String(index).padStart(3, '0')}.jpg`
  }

  function readImageElement(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        const image = new Image()
        image.onload = () => resolve(image)
        image.onerror = reject
        image.src = reader.result
      }
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  function canvasToBlob(canvas, quality) {
    return new Promise((resolve) => {
      canvas.toBlob((blob) => resolve(blob), 'image/jpeg', quality)
    })
  }

  async function resizeImageToLimit(file, sequence) {
    const image = await readImageElement(file)
    const canvas = document.createElement('canvas')
    const context = canvas.getContext('2d')
    if (!context) throw new Error('ไม่สามารถประมวลผลรูปภาพได้')
    let width = image.width; let height = image.height
    const maxDimension = 1600
    if (width > maxDimension || height > maxDimension) {
      const scale = Math.min(maxDimension / width, maxDimension / height)
      width = Math.round(width * scale); height = Math.round(height * scale)
    }
    canvas.width = width; canvas.height = height
    context.drawImage(image, 0, 0, width, height)
    let quality = 0.9
    let blob = await canvasToBlob(canvas, quality)
    while (blob && blob.size > MAX_IMAGE_TARGET_BYTES && quality > 0.25) { quality -= 0.08; blob = await canvasToBlob(canvas, quality) }
    while (blob && blob.size > MAX_IMAGE_TARGET_BYTES && (canvas.width > 480 || canvas.height > 480)) {
      canvas.width = Math.round(canvas.width * 0.9); canvas.height = Math.round(canvas.height * 0.9)
      context.clearRect(0, 0, canvas.width, canvas.height)
      context.drawImage(image, 0, 0, canvas.width, canvas.height)
      quality = 0.82; blob = await canvasToBlob(canvas, quality)
      while (blob && blob.size > MAX_IMAGE_TARGET_BYTES && quality > 0.25) { quality -= 0.08; blob = await canvasToBlob(canvas, quality) }
    }
    if (!blob || blob.size > MAX_IMAGE_SIZE_BYTES) throw new Error(`ไม่สามารถย่อรูป ${file.name} ได้`)
    return new File([blob], formatResidentFileName(sequence), { type: 'image/jpeg' })
  }

  async function handleAttachFiles(event) {
    const selectedFiles = Array.from(event.target.files || [])
    event.target.value = ''
    if (selectedFiles.length === 0) return
    const newFileCount = attachments.filter((item) => item.source === 'new').length
    const remainingSlots = MAX_ATTACHMENTS - newFileCount
    if (remainingSlots <= 0) { await showSwal({ icon: 'warning', title: 'แนบรูปได้สูงสุด 5 รูป' }); return }
    const filesToProcess = selectedFiles.slice(0, remainingSlots)
    if (selectedFiles.length > remainingSlots) await showSwal({ icon: 'info', title: `รับได้แค่ ${remainingSlots} รูป` })
    try {
      const startIndex = newFileCount + 1
      const prepared = []
      for (let i = 0; i < filesToProcess.length; i += 1) {
        const resizedFile = await resizeImageToLimit(filesToProcess[i], startIndex + i)
        prepared.push({ source: 'new', name: resizedFile.name, file: resizedFile, url: URL.createObjectURL(resizedFile) })
      }
      setAttachments((cur) => [...cur, ...prepared])
    } catch (error) {
      await showSwal({ icon: 'error', title: 'แนบรูปไม่สำเร็จ', text: error.message })
    }
  }

  function handleRemoveAttachment(target) {
    setAttachments((cur) => {
      const next = cur.filter((item) => item !== target)
      if (target.source === 'new' && target.url) URL.revokeObjectURL(target.url)
      return next
    })
  }

  function handlePreviewAttachment(target) {
    if (!target.url) return
    showSwal({ imageUrl: target.url, imageAlt: target.name, showConfirmButton: false, showCloseButton: true, width: 'auto', background: '#0f172a' })
  }

  async function handleResidentSubmit(event) {
    event.preventDefault()
    if (!editingViolation) return
    if (!residentNote.trim()) { await showSwal({ icon: 'warning', title: 'กรุณากรอกข้อความอัปเดต' }); return }
    try {
      setSaving(true)
      await residentUpdateViolation(editingViolation.id, { status: 'in_progress', resident_note: residentNote })
      const newFiles = attachments.filter((item) => item.source === 'new' && item.file).map((item) => item.file)
      if (newFiles.length > 0) await uploadViolationImages(editingViolation.id, newFiles)
      await showSwal({ icon: 'success', title: 'อัปเดตสำเร็จ', timer: 1400, showConfirmButton: false })
      closeViolationModal(true)
      await loadViolations({ status: statusFilter, search: searchTerm })
    } catch (error) {
      await showSwal({ icon: 'error', title: 'อัปเดตไม่สำเร็จ', text: error.message })
    } finally {
      setSaving(false)
    }
  }

  async function handleSubmitIssue(e) {
    e.preventDefault()
    if (!issueForm.title.trim()) { await showSwal({ icon: 'warning', title: 'กรุณากรอกหัวข้อปัญหา' }); return }
    setIssueSubmitting(true)
    try {
      await createIssue({ house_id: profile?.house_id, title: issueForm.title, detail: issueForm.detail, category: issueForm.category, status: 'pending' })
      await showSwal({ icon: 'success', title: 'ส่งคำร้องแล้ว', text: 'นิติจะดำเนินการและแจ้งกลับ', timer: 1600, showConfirmButton: false })
      setIssueForm({ title: '', detail: '', category: 'general' })
      setShowIssueForm(false)
      const all = await listIssues()
      setIssues(all.filter((i) => i.house_id === profile.house_id))
    } catch (error) {
      await showSwal({ icon: 'error', title: 'ส่งคำร้องไม่สำเร็จ', text: error.message })
    } finally {
      setIssueSubmitting(false)
    }
  }

  async function handleSaveProfile(e) {
    e.preventDefault()
    setProfileSaving(true)
    try {
      await updateUser(profile.id, { full_name: profileForm.full_name, phone: profileForm.phone, email: profileForm.email })
      await showSwal({ icon: 'success', title: 'บันทึกแล้ว', timer: 1400, showConfirmButton: false })
    } catch (error) {
      await showSwal({ icon: 'error', title: 'บันทึกไม่สำเร็จ', text: error.message })
    } finally {
      setProfileSaving(false)
    }
  }

  async function handleChangePassword(e) {
    e.preventDefault()
    if (!newPassword || !confirmPassword) { await showSwal({ icon: 'warning', title: 'ข้อมูลไม่ครบ' }); return }
    if (newPassword.length < 6) { await showSwal({ icon: 'warning', title: 'รหัสผ่านสั้นเกินไป', text: 'อย่างน้อย 6 ตัวอักษร' }); return }
    if (newPassword !== confirmPassword) { await showSwal({ icon: 'warning', title: 'รหัสผ่านไม่ตรงกัน' }); return }
    setPasswordSaving(true)
    try {
      await updateUser(profile.id, { password: newPassword })
      setNewPassword(''); setConfirmPassword('')
      await showSwal({ icon: 'success', title: 'เปลี่ยนรหัสผ่านแล้ว', timer: 1400, showConfirmButton: false })
    } catch (error) {
      await showSwal({ icon: 'error', title: 'ไม่สำเร็จ', text: error.message })
    } finally {
      setPasswordSaving(false)
    }
  }

  async function handleLogout() {
    const { isConfirmed } = await showSwal({
      icon: 'question', title: 'ออกจากระบบ?',
      showCancelButton: true, confirmButtonText: 'ออก', cancelButtonText: 'ยกเลิก',
    })
    if (isConfirmed) logout()
  }

  return (
    <div className="app">
      <div className={`sb-overlay ${sidebarOpen ? 'show' : ''}`} onClick={() => setSidebarOpen(false)} />

      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sb-logo">
          <div className="sb-logo-ico">🏘️</div>
          <div>
            <div className="sb-logo-name">{setup.villageName}</div>
            <div className="sb-logo-sub">Village Management {setup.version || 'v12.3'}</div>
          </div>
        </div>

        <div className="sb-role">
          <span className="sb-role-dot" />
          <span className="sb-role-txt">ลูกบ้าน</span>
        </div>

        <nav className="sb-nav">
          {NAV_GROUPS.map((group) => (
            <div key={group.section}>
              <div className="sb-sec">{group.section}</div>
              {group.items.map((item) => (
                <div
                  key={item.key}
                  className={`sb-item ${activeSection === item.key ? 'act' : ''}`}
                  onClick={() => navTo(item.key)}
                >
                  <span className="sb-ico">{item.icon}</span>
                  <span className="sb-label">{item.label}</span>
                </div>
              ))}
            </div>
          ))}
        </nav>

        <div className="sb-foot">
          <div className="sb-res-account">
            <span className="sb-role-dot" />
            <div>
              <div className="sb-role-txt" style={{ fontWeight: 700 }}>{profile?.full_name || profile?.username || ''}</div>
              <div style={{ fontSize: '10px', color: 'var(--sbm)', marginTop: '1px' }}>บ้าน {houseNo}</div>
            </div>
          </div>
          {profile?.role === 'admin' && (
            <div className="sb-item" style={{ color: '#34d399', marginBottom: 2 }} onClick={() => navigate('/admin/dashboard')}>
              <span className="sb-ico">🛡️</span>
              <span className="sb-label">โหมดแอดมิน</span>
            </div>
          )}
          <div className="sb-res-logout" onClick={handleLogout}>
            <span style={{ fontSize: '18px' }}>🚪</span>
            <span>ออกจากระบบ</span>
          </div>
        </div>
      </aside>

      <div className="main">
        <div className="topbar">
          <div className="tb-ham" onClick={() => setSidebarOpen(!sidebarOpen)}>☰</div>
          <div className="tb-title">
            {titleData.main} — <span className="hl">{titleData.sub}</span>
          </div>
          <div className="tb-right">
            <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--tx)', whiteSpace: 'nowrap', marginRight: '4px' }}>
              {profile?.full_name || profile?.username || ''}
            </span>

            {profile?.role === 'admin' && (
              <div style={{ display: 'flex', background: 'var(--bg)', border: '1.5px solid var(--bo)', borderRadius: '10px', overflow: 'hidden', flexShrink: 0 }}>
                <button
                  type="button"
                  style={{ padding: '5px 10px', fontSize: '11.5px', fontWeight: 700, cursor: 'pointer', border: 'none', background: 'transparent', color: 'var(--mu)', fontFamily: 'Sarabun, sans-serif', whiteSpace: 'nowrap' }}
                  onClick={() => navigate('/admin/dashboard')}
                >Admin</button>
                <button
                  type="button"
                  style={{ padding: '5px 10px', fontSize: '11.5px', fontWeight: 700, cursor: 'pointer', border: 'none', background: 'var(--prb)', color: '#fff', borderRadius: '8px', margin: '2px', fontFamily: 'Sarabun, sans-serif', whiteSpace: 'nowrap' }}
                >ลูกบ้าน</button>
              </div>
            )}

            <div style={{ position: 'relative' }}>
              <div className="tb-ico" id="r-setup-btn" onClick={() => setSetupOpen((p) => !p)}>⚙️</div>
              {setupOpen && (
                <div className="r-setup-menu" id="r-setup-menu">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <div className="r-setup-title">ตั้งค่า</div>
                    <button type="button" style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px', color: 'var(--mu)', lineHeight: 1 }} onClick={() => setSetupOpen(false)}>✕</button>
                  </div>

                  <div style={{ marginBottom: 12, paddingBottom: 12, borderBottom: '1px solid var(--bo)' }}>
                    <div className="r-setup-title">โปรไฟล์</div>
                    <div className="r-setup-row"><span>ชื่อ</span><strong>{profile?.full_name || '-'}</strong></div>
                    <div className="r-setup-row"><span>Username</span><strong>{profile?.username || '-'}</strong></div>
                    <div className="r-setup-row"><span>บ้าน</span><strong>{houseNo}</strong></div>
                  </div>

                  <div style={{ marginBottom: 12, paddingBottom: 12, borderBottom: '1px solid var(--bo)' }}>
                    <div className="r-setup-title" style={{ marginBottom: 8 }}>ธีม</div>
                    <div className="theme-strip">
                      {THEMES.map((t) => (
                        <div key={t} className={`th-dot ${theme === t ? 'on' : ''}`} data-t={t} onClick={() => setTheme(t)} title={t} />
                      ))}
                    </div>
                  </div>

                  {profile?.role === 'admin' && (
                    <button className="btn btn-a btn-sm" style={{ width: '100%', marginBottom: 6 }} onClick={() => { setSetupOpen(false); navigate('/admin/dashboard') }}>
                      🛡️ โหมดแอดมิน
                    </button>
                  )}
                  <button className="btn btn-p btn-sm" style={{ width: '100%', marginBottom: 6 }} onClick={() => { setSetupOpen(false); navTo('profile') }}>
                    👤 โปรไฟล์ / เปลี่ยนรหัสผ่าน
                  </button>
                  <button className="btn btn-g btn-sm" style={{ width: '100%' }} onClick={() => setSetupOpen(false)}>ปิด</button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="page">

          {activeSection === 'dash' && (
            <>
              <div className="ph" style={{ marginBottom: 18 }}>
                <div className="ph-in">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div className="ph-ico">🏡</div>
                    <div>
                      <div className="ph-h1">สวัสดี คุณ{profile?.full_name || profile?.username || 'ลูกบ้าน'} 👋</div>
                      <div className="ph-sub">บ้าน {houseNo} · {setup.villageName}</div>
                    </div>
                  </div>
                  <div className="ph-acts">
                    {overdueAmount > 0 && (
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 17, fontWeight: 800, color: '#fff' }}>฿{formatMoney(overdueAmount)}</div>
                        <div style={{ fontSize: '9.5px', color: 'rgba(255,255,255,.75)' }}>ค้างชำระ</div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {overdueAmount > 0 && (
                <div className="al al-w">⚠️ มียอดค้างชำระ <strong>฿{formatMoney(overdueAmount)}</strong> — กรุณาชำระโดยเร็ว</div>
              )}

              <div className="stats" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: 18 }}>
                <div className="sc" style={{ cursor: 'pointer' }} onClick={() => navTo('fees')}>
                  <div className="sc-ico d">💳</div>
                  <div>
                    <div className="sc-v" style={{ fontSize: 16 }}>฿{formatMoney(overdueAmount)}</div>
                    <div className="sc-l">ค้างชำระ</div>
                  </div>
                </div>
                <div className="sc" style={{ cursor: 'pointer' }} onClick={() => navTo('issue')}>
                  <div className="sc-ico w">🔧</div>
                  <div>
                    <div className="sc-v">{pendingIssues.length}</div>
                    <div className="sc-l">ปัญหาคงค้าง</div>
                  </div>
                </div>
                <div className="sc" style={{ cursor: 'pointer' }} onClick={() => navTo('notif')}>
                  <div className="sc-ico d">⚠️</div>
                  <div>
                    <div className="sc-v">{inProgressViolations.length}</div>
                    <div className="sc-l">แจ้งเตือน</div>
                  </div>
                </div>
              </div>

              {fees.length > 0 && (
                <div className="r-chart-box">
                  <h3>💳 ประวัติการชำระค่าส่วนกลาง</h3>
                  <div className="r-chart-wrap">
                    <canvas ref={chartCanvasRef} />
                  </div>
                </div>
              )}

              <div className="g2">
                <div className="card">
                  <div className="ch"><div className="ch-ico">📢</div><div className="ct">ประกาศล่าสุด</div></div>
                  <div className="cb" style={{ padding: 14 }}>
                    {latestAnnouncements.length === 0 ? (
                      <div style={{ color: 'var(--mu)', fontSize: 13 }}>ยังไม่มีประกาศ</div>
                    ) : latestAnnouncements.map((ann) => (
                      <div key={ann.id} className="ann" style={{ cursor: 'pointer' }} onClick={() => navTo('news')}>
                        <div className={`ann-dot ${getAnnDotClass(ann.type)}`} />
                        <div>
                          <div className="ann-t">{ann.title}</div>
                          {ann.content && <div className="ann-b" style={{ WebkitLineClamp: 2 }}>{ann.content}</div>}
                          <div className="ann-d">{formatDate(ann.announcement_date || ann.created_at)} · {getTypeLabel(ann.type)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="card">
                  <div className="ch"><div className="ch-ico">⚠️</div><div className="ct">การแจ้งเตือนล่าสุด</div></div>
                  <div className="cb" style={{ padding: 14 }}>
                    {latestViolation ? (
                      <div className="vio" style={{ cursor: 'pointer', marginBottom: 0 }} onClick={() => navTo('notif')}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', marginBottom: 7 }}>
                          <div className="vio-t">{latestViolation.type || '-'}</div>
                          <span className={getStatusBadge(latestViolation.status).className}>{getStatusBadge(latestViolation.status).label}</span>
                        </div>
                        <div className="vio-d">{latestViolation.detail || '-'}</div>
                        {latestViolation.due_date && <div className="vio-dl">⏰ กำหนด: {formatDate(latestViolation.due_date)}</div>}
                      </div>
                    ) : (
                      <div style={{ color: 'var(--mu)', fontSize: 13 }}>ไม่มีการแจ้งเตือน</div>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}

          {activeSection === 'house' && (
            <>
              <div className="ph" style={{ marginBottom: 18 }}>
                <div className="ph-in">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div className="ph-ico">🏠</div>
                    <div>
                      <div className="ph-h1">ข้อมูลบ้านของฉัน</div>
                      <div className="ph-sub">บ้าน {houseDetail?.house_no || houseNo}</div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="g2">
                <div className="card">
                  <div className="ch"><div className="ch-ico">🏠</div><div className="ct">ข้อมูลที่อยู่</div></div>
                  <div className="cb">
                    {houseDetail ? (
                      <>
                        <div className="sl">ที่อยู่</div>
                        <div className="ig">
                          <div className="ii"><div className="ik">บ้านเลขที่</div><div className="iv">{houseDetail.house_no || '-'}</div></div>
                          <div className="ii"><div className="ik">ซอย</div><div className="iv">{houseDetail.soi || '-'}</div></div>
                          <div className="ii"><div className="ik">ถนน</div><div className="iv">{houseDetail.road || houseDetail.address || '-'}</div></div>
                          <div className="ii"><div className="ik">พื้นที่</div><div className="iv">{houseDetail.area ? `${houseDetail.area} ตร.ว.` : '-'}</div></div>
                          <div className="ii"><div className="ik">ค่าส่วนกลาง/ปี</div><div className="iv" style={{ color: 'var(--pr)', fontWeight: 800 }}>{houseDetail.annual_fee ? `฿${formatMoney(houseDetail.annual_fee)}` : '-'}</div></div>
                          <div className="ii"><div className="ik">สถานะ</div><div className="iv"><span className={`hs ${houseDetail.status === 'normal' ? 'hs-ok' : 'hs-lt'}`}>● {houseDetail.status === 'normal' ? 'ปกติ' : (houseDetail.status || '-')}</span></div></div>
                        </div>
                        <div className="sl" style={{ marginTop: 16 }}>ผู้อาศัย</div>
                        <div className="ig">
                          <div className="ii"><div className="ik">เจ้าของกรรมสิทธิ์</div><div className="iv">{houseDetail.owner_name || '-'}</div></div>
                          <div className="ii"><div className="ik">ผู้เช่า</div><div className="iv">{houseDetail.resident_name || '-'}</div></div>
                          <div className="ii"><div className="ik">เบอร์โทร</div><div className="iv">{houseDetail.phone || '-'}</div></div>
                          <div className="ii"><div className="ik">Email</div><div className="iv" style={{ fontSize: 12 }}>{houseDetail.email || '-'}</div></div>
                          <div className="ii"><div className="ik">ประเภทผู้อยู่อาศัย</div><div className="iv">{houseDetail.residence_type || '-'}</div></div>
                          <div className="ii"><div className="ik">ประเภทบ้าน</div><div className="iv">{houseDetail.house_type || '-'}</div></div>
                        </div>
                      </>
                    ) : (
                      <div style={{ color: 'var(--mu)', padding: '16px 0', textAlign: 'center' }}>กำลังโหลด...</div>
                    )}
                  </div>
                </div>
                <div className="card">
                  <div className="ch"><div className="ch-ico">🚗</div><div className="ct">รถที่ลงทะเบียน</div></div>
                  <div className="cb">
                    {vehicles.length === 0 ? (
                      <div style={{ color: 'var(--mu)', textAlign: 'center', padding: '16px 0' }}>ยังไม่มีข้อมูลรถ</div>
                    ) : vehicles.map((v) => (
                      <div key={v.id} className="vc">
                        <div className="vc-ico">{vehicleTypeIcon(v.vehicle_type)}</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div className="vc-pl">{v.license_plate} {v.province || ''}</div>
                          <div className="vc-dt">{[v.brand, v.model, v.color].filter(Boolean).join(' · ')}</div>
                          <div style={{ marginTop: 5 }}>
                            <span className={`bd ${v.status === 'active' ? 'b-ok' : 'b-mu'}`}>{v.status === 'active' ? 'ใช้งาน' : (v.status || '-')}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}

          {activeSection === 'vehicles' && (
            <>
              <div className="ph" style={{ marginBottom: 18 }}>
                <div className="ph-in">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                    <div className="ph-ico">🚗</div>
                    <div><div className="ph-h1">ข้อมูลรถของฉัน</div><div className="ph-sub">ยานพาหนะที่ลงทะเบียนไว้</div></div>
                  </div>
                </div>
              </div>
              <div className="al al-i">ℹ️ การขอแก้ไขข้อมูลรถต้องผ่านนิติก่อนจึงจะมีผล</div>
              <div className="card" style={{ marginBottom: 14 }}>
                <div className="ch"><div className="ch-ico">🚗</div><div className="ct">รถที่ลงทะเบียน ({vehicles.length} คัน)</div></div>
                <div className="cb">
                  {vehicles.length === 0 ? (
                    <div style={{ color: 'var(--mu)', textAlign: 'center', padding: '20px 0' }}>ยังไม่มีข้อมูลรถ</div>
                  ) : vehicles.map((v) => (
                    <div key={v.id} className="vc">
                      <div className="vc-ico">{vehicleTypeIcon(v.vehicle_type)}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="vc-pl">{v.license_plate} {v.province || ''}</div>
                        <div className="vc-dt">{[v.brand, v.model, v.color, v.parking_location].filter(Boolean).join(' · ')}</div>
                        <div style={{ marginTop: 5, display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                          <span className={`bd ${v.status === 'active' ? 'b-ok' : 'b-mu'}`}>{v.status === 'active' ? 'ใช้งาน' : (v.status || '-')}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {activeSection === 'fees' && (
            <>
              <div className="ph" style={{ marginBottom: 18 }}>
                <div className="ph-in">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div className="ph-ico">💳</div>
                    <div><div className="ph-h1">ค่าส่วนกลาง</div><div className="ph-sub">ใบแจ้งหนี้และประวัติการชำระ</div></div>
                  </div>
                  {overdueAmount > 0 && (
                    <div className="ph-acts">
                      <button className="btn btn-w btn-sm" onClick={() => { const f = unresolvedFees[0]; if (f) openPaymentModal(f) }}>💳 แจ้งชำระ</button>
                    </div>
                  )}
                </div>
              </div>

              {overdueAmount > 0 && (
                <div className="fee-hero" style={{ marginBottom: 18 }}>
                  <div className="fhi">
                    <div className="f-lbl">ยอดค้างชำระปัจจุบัน</div>
                    <div className="f-amt">฿{formatMoney(overdueAmount)}</div>
                    <div className="f-per">{unresolvedFees.length} รายการ</div>
                    <div className="f-btns">
                      <button className="btn btn-w btn-sm" onClick={() => { const f = unresolvedFees[0]; if (f) openPaymentModal(f) }}>💳 แจ้งชำระ</button>
                    </div>
                  </div>
                </div>
              )}

              <div className="card" style={{ marginBottom: 14 }}>
                <div className="ch"><div className="ct">ค้นหาและกรองข้อมูล</div></div>
                <div className="cb" style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <select className="fs" style={{ flex: 1, minWidth: 140 }} value={feeStatusFilter} onChange={(e) => setFeeStatusFilter(e.target.value)}>
                    <option value="all">ทุกสถานะ</option>
                    <option value="unpaid">ยังไม่ชำระ</option>
                    <option value="pending">รอตรวจสอบ</option>
                    <option value="paid">ชำระแล้ว</option>
                    <option value="overdue">ค้างชำระ</option>
                  </select>
                  <select className="fs" style={{ flex: 1, minWidth: 100 }} value={feeYearFilter} onChange={(e) => setFeeYearFilter(e.target.value)}>
                    <option value="all">ทุกปี</option>
                    {[...new Set(fees.map((r) => r.year).filter(Boolean))].sort((a, b) => b - a).map((y) => <option key={y} value={y}>{y}</option>)}
                  </select>
                  <button className="btn btn-a btn-sm" onClick={() => loadFeeData({ status: feeStatusFilter, year: feeYearFilter })}>ค้นหา</button>
                </div>
              </div>

              <div className="card" style={{ marginBottom: 14 }}>
                <div className="ch"><div className="ct">ใบแจ้งหนี้ ({fees.length} รายการ)</div></div>
                <div className="cb" style={{ padding: 0 }}>
                  <div className="tw">
                    <table>
                      <thead><tr><th>ปี</th><th>งวด</th><th>ออกวันที่</th><th>ครบกำหนด</th><th>ยอด</th><th>สถานะ</th><th></th></tr></thead>
                      <tbody>
                        {feeLoading ? (
                          <tr><td colSpan="7" style={{ textAlign: 'center', color: 'var(--mu)', padding: 20 }}>กำลังโหลด...</td></tr>
                        ) : fees.length === 0 ? (
                          <tr><td colSpan="7" style={{ textAlign: 'center', color: 'var(--mu)', padding: 20 }}>ยังไม่มีใบแจ้งหนี้</td></tr>
                        ) : fees.map((fee) => {
                          const badge = getFeeStatusBadge(fee.status)
                          return (
                            <tr key={fee.id}>
                              <td>{fee.year || '-'}</td>
                              <td>{fee.period || '-'}</td>
                              <td>{formatDate(fee.invoice_date)}</td>
                              <td>{formatDate(fee.due_date)}</td>
                              <td><strong>฿{formatMoney(fee.total_amount)}</strong></td>
                              <td><span className={badge.className}>{badge.label}</span></td>
                              <td>
                                {(fee.status === 'unpaid' || fee.status === 'overdue') && (
                                  <button className="btn btn-xs btn-a" onClick={() => openPaymentModal(fee)}>ส่งหลักฐาน</button>
                                )}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="ch"><div className="ct">ประวัติการชำระ ({payments.length} รายการ)</div></div>
                <div className="cb" style={{ padding: 0 }}>
                  <div className="tw">
                    <table>
                      <thead><tr><th>งวด</th><th>ยอด</th><th>วิธี</th><th>หลักฐาน</th><th>วันที่</th><th>สถานะ</th><th>หมายเหตุ</th></tr></thead>
                      <tbody>
                        {feeLoading ? (
                          <tr><td colSpan="7" style={{ textAlign: 'center', color: 'var(--mu)', padding: 20 }}>กำลังโหลด...</td></tr>
                        ) : payments.length === 0 ? (
                          <tr><td colSpan="7" style={{ textAlign: 'center', color: 'var(--mu)', padding: 20 }}>ยังไม่มีประวัติ</td></tr>
                        ) : payments.map((row) => {
                          const badge = getPaymentStatusBadge(row)
                          return (
                            <tr key={row.id}>
                              <td>{row.fees ? `${row.fees.period} ${row.fees.year}` : '-'}</td>
                              <td>฿{formatMoney(row.amount)}</td>
                              <td>{formatMethod(row.payment_method)}</td>
                              <td>{row.slip_url ? <a href={row.slip_url} target="_blank" rel="noreferrer">ดูสลิป</a> : '-'}</td>
                              <td>{new Date(row.paid_at).toLocaleString('th-TH')}</td>
                              <td><span className={badge.className}>{badge.label}</span></td>
                              <td style={{ fontSize: 12 }}>
                                {getRejectedReason(row.note) && <div style={{ color: 'var(--dg)' }}>เหตุผล: {getRejectedReason(row.note)}</div>}
                                {getDisplayNote(row.note) || '-'}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </>
          )}

          {activeSection === 'issue' && (
            <>
              <div className="ph" style={{ marginBottom: 18 }}>
                <div className="ph-in">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div className="ph-ico">🔔</div>
                    <div><div className="ph-h1">แจ้งปัญหา</div><div className="ph-sub">แจ้งและติดตามสถานะ</div></div>
                  </div>
                  <div className="ph-acts">
                    <button className="btn btn-w btn-sm" onClick={() => setShowIssueForm((p) => !p)}>
                      {showIssueForm ? '✕ ยกเลิก' : '+ แจ้งปัญหาใหม่'}
                    </button>
                  </div>
                </div>
              </div>

              {showIssueForm && (
                <div className="card" style={{ marginBottom: 16 }}>
                  <div className="ch"><div className="ch-ico">🔔</div><div className="ct">แจ้งปัญหาใหม่</div></div>
                  <div className="cb">
                    <form onSubmit={handleSubmitIssue}>
                      <div className="fg">
                        <label className="fl">หัวข้อปัญหา *</label>
                        <input className="fi" value={issueForm.title} onChange={(e) => setIssueForm((p) => ({ ...p, title: e.target.value }))} placeholder="เช่น ไฟส่องสว่างดับ, ท่อรั่ว" />
                      </div>
                      <div className="fg">
                        <label className="fl">รายละเอียด</label>
                        <textarea className="fi ft" rows={3} value={issueForm.detail} onChange={(e) => setIssueForm((p) => ({ ...p, detail: e.target.value }))} placeholder="อธิบายปัญหาเพิ่มเติม" />
                      </div>
                      <div className="fg">
                        <label className="fl">หมวดหมู่</label>
                        <select className="fs" value={issueForm.category} onChange={(e) => setIssueForm((p) => ({ ...p, category: e.target.value }))}>
                          <option value="general">ทั่วไป</option>
                          <option value="electrical">ไฟฟ้า</option>
                          <option value="plumbing">ประปา</option>
                          <option value="security">ความปลอดภัย</option>
                          <option value="cleaning">ทำความสะอาด</option>
                          <option value="structure">โครงสร้าง</option>
                        </select>
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button className="btn btn-p btn-sm" type="submit" disabled={issueSubmitting}>
                          {issueSubmitting ? 'กำลังส่ง...' : '📤 ส่งคำร้อง'}
                        </button>
                        <button className="btn btn-g btn-sm" type="button" onClick={() => setShowIssueForm(false)}>ยกเลิก</button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
                {issues.length === 0 ? (
                  <div className="card"><div className="cb" style={{ textAlign: 'center', color: 'var(--mu)', padding: '24px 0' }}>ยังไม่มีการแจ้งปัญหา<br /><span style={{ fontSize: 12 }}>กดปุ่ม "+ แจ้งปัญหาใหม่" ด้านบนเพื่อเริ่ม</span></div></div>
                ) : issues.map((issue) => (
                  <div key={issue.id} className="card">
                    <div className="cb" style={{ padding: '13px 15px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 7, marginBottom: 11 }}>
                        <div>
                          <div style={{ fontSize: '13.5px', fontWeight: 800, color: 'var(--tx)' }}>🔦 {issue.title}</div>
                          <div style={{ fontSize: '12px', color: 'var(--tx)', marginTop: 2 }}>แจ้ง {formatDate(issue.created_at)} · {issue.category || 'ทั่วไป'}</div>
                        </div>
                        <span className={getStatusBadge(issue.status).className}>{getStatusBadge(issue.status).label}</span>
                      </div>
                      {issue.detail && (
                        <div style={{ fontSize: '12.5px', color: 'var(--tx)', marginBottom: 10, background: 'var(--bg)', borderRadius: 7, padding: '8px 10px' }}>
                          {issue.detail}
                        </div>
                      )}
                      <div style={{ background: 'var(--bg)', borderRadius: 9, padding: 11 }}>
                        <div style={{ fontSize: '10.5px', fontWeight: 800, color: 'var(--mu)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 9 }}>ความคืบหน้า</div>
                        <div className="tl">
                          <div className="tli">
                            <div className="tld td-done" />
                            <div className="tl-l">รับเรื่องแล้ว</div>
                            <div className="tl-s">{formatDate(issue.created_at)}</div>
                          </div>
                          {issue.admin_note && (
                            <div className="tli">
                              <div className="tld td-active" />
                              <div style={{ flex: 1 }}>
                                <div className="tl-l">บันทึกจากนิติ</div>
                                <div style={{ marginTop: 5, background: 'var(--prl)', borderRadius: 7, padding: '8px 10px', fontSize: '12.5px', color: 'var(--pr)' }}>
                                  📋 {issue.admin_note}
                                </div>
                              </div>
                            </div>
                          )}
                          <div className="tli">
                            <div className={`tld ${issue.status === 'resolved' ? 'td-done' : 'td-pend'}`} />
                            <div className="tl-l" style={{ color: issue.status === 'resolved' ? 'var(--tx)' : 'var(--mu)' }}>เสร็จสิ้น</div>
                            {issue.resolved_at && <div className="tl-s">{formatDate(issue.resolved_at)}</div>}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {activeSection === 'notif' && (
            <>
              <div className="ph" style={{ marginBottom: 18 }}>
                <div className="ph-in">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div className="ph-ico">⚠️</div>
                    <div><div className="ph-h1">การแจ้งเตือนจากนิติ</div><div className="ph-sub">การกระทำผิดและข้อมูลสำคัญ</div></div>
                  </div>
                </div>
              </div>

              <div className="card" style={{ marginBottom: 14 }}>
                <div className="ch"><div className="ct">ค้นหา</div></div>
                <div className="cb" style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <input className="fi" style={{ flex: 1, minWidth: 200 }} type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="ค้นหา ประเภท / รายละเอียด" />
                  <select className="fs" style={{ flex: 1, minWidth: 140 }} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                    <option value="all">ทุกสถานะ</option>
                    <option value="pending">รอดำเนินการ</option>
                    <option value="in_progress">กำลังดำเนินการ</option>
                    <option value="resolved">แก้ไขแล้ว</option>
                    <option value="cancelled">ยกเลิก</option>
                  </select>
                  <button className="btn btn-a btn-sm" onClick={() => loadViolations({ status: statusFilter, search: searchTerm })}>ค้นหา</button>
                </div>
              </div>

              <div className="card">
                <div className="ch"><div className="ct">รายการแจ้งเตือน ({violations.length} รายการ)</div></div>
                <div className="cb" style={{ padding: 0 }}>
                  <div className="tw">
                    <table>
                      <thead><tr><th>ประเภท</th><th>รายละเอียด</th><th>หมายเหตุนิติ</th><th>ลูกบ้านอัปเดต</th><th>กำหนด</th><th>สถานะ</th><th></th></tr></thead>
                      <tbody>
                        {loading ? (
                          <tr><td colSpan="7" style={{ textAlign: 'center', color: 'var(--mu)', padding: 20 }}>กำลังโหลด...</td></tr>
                        ) : violations.length === 0 ? (
                          <tr><td colSpan="7" style={{ textAlign: 'center', color: 'var(--mu)', padding: 20 }}>ไม่พบข้อมูล</td></tr>
                        ) : violations.map((item) => {
                          const badge = getStatusBadge(item.status)
                          return (
                            <tr key={item.id}>
                              <td>{item.type || '-'}</td>
                              <td style={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.detail || '-'}</td>
                              <td style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.admin_note || '-'}</td>
                              <td>
                                <div style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.resident_note || '-'}</div>
                                <div style={{ fontSize: '11px', color: 'var(--mu)' }}>{formatDate(item.resident_updated_at)}</div>
                              </td>
                              <td>{formatDate(item.due_date)}</td>
                              <td><span className={badge.className}>{badge.label}</span></td>
                              <td><button className="btn btn-xs btn-a" onClick={() => openViolationModal(item)}>อัปเดต</button></td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </>
          )}

          {activeSection === 'news' && (
            <>
              <div className="ph" style={{ marginBottom: 18 }}>
                <div className="ph-in">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div className="ph-ico">📢</div>
                    <div><div className="ph-h1">ประกาศ / ข่าวสาร</div><div className="ph-sub">ข่าวสารจากนิติบุคคล</div></div>
                  </div>
                </div>
              </div>
              <div className="card">
                <div className="ch"><div className="ch-ico">📢</div><div className="ct">ประกาศทั้งหมด ({announcements.length} รายการ)</div></div>
                <div className="cb" style={{ padding: 14 }}>
                  {announcements.length === 0 ? (
                    <div style={{ color: 'var(--mu)', textAlign: 'center', padding: '16px 0' }}>ยังไม่มีประกาศ</div>
                  ) : announcements.map((ann) => (
                    <div key={ann.id} className="ann">
                      <div className={`ann-dot ${getAnnDotClass(ann.type)}`} />
                      <div style={{ flex: 1 }}>
                        <div className="ann-t">{ann.is_pinned ? '📌 ' : ''}{ann.title}</div>
                        {ann.content && <div className="ann-b">{ann.content}</div>}
                        <div className="ann-d">{formatDate(ann.announcement_date || ann.created_at)} · {getTypeLabel(ann.type)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {activeSection === 'work' && (
            <>
              <div className="ph" style={{ marginBottom: 18 }}>
                <div className="ph-in">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div className="ph-ico">🏆</div>
                    <div><div className="ph-h1">ผลงานนิติ</div><div className="ph-sub">รายงานการดูแลหมู่บ้าน</div></div>
                  </div>
                </div>
              </div>
              <div className="card">
                <div className="ch"><div className="ch-ico">🏆</div><div className="ct">รายงานทั้งหมด ({workReports.length} รายการ)</div></div>
                <div className="cb" style={{ padding: 14 }}>
                  {workReports.length === 0 ? (
                    <div style={{ color: 'var(--mu)', textAlign: 'center', padding: '16px 0' }}>ยังไม่มีรายงาน</div>
                  ) : workReports.map((rp) => {
                    const MONTH_TH = ['', 'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.']
                    const monthName = MONTH_TH[rp.month] || rp.month
                    return (
                      <div key={rp.id} className="ann">
                        <div className="ann-dot ad-evt" />
                        <div style={{ flex: 1 }}>
                          <div className="ann-t">รายงาน {monthName} {rp.year}</div>
                          {rp.summary && <div className="ann-b">{rp.summary}</div>}
                          <div className="ann-d">{formatDate(rp.created_at)} · {rp.category || 'บำรุงรักษา'}</div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </>
          )}

          {activeSection === 'tech' && (
            <>
              <div className="ph" style={{ marginBottom: 18 }}>
                <div className="ph-in">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                    <div className="ph-ico">🔨</div>
                    <div><div className="ph-h1">ทำเนียบช่าง</div><div className="ph-sub">ช่างในชุมชนที่ได้รับการรับรอง</div></div>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 7, marginBottom: 14, flexWrap: 'wrap' }}>
                <input className="fi" style={{ flex: 1, minWidth: 160 }} value={techSearch} onChange={(e) => setTechSearch(e.target.value)} placeholder="🔍 ค้นหาชื่อ หรือบริการ..." />
              </div>

              {filteredTechs.length === 0 ? (
                <div className="card"><div className="cb" style={{ textAlign: 'center', color: 'var(--mu)', padding: '24px 0' }}>ยังไม่มีข้อมูลช่าง</div></div>
              ) : (
                <div className="tech-grid">
                  {filteredTechs.map((t) => {
                    const skills = t.technician_services || []
                    return (
                      <div key={t.id} className="tech-card">
                        <div style={{ display: 'flex', gap: 11, alignItems: 'flex-start' }}>
                          <div className="tech-avatar">{t.avatar_url ? <img src={t.avatar_url} alt={t.name} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 12 }} /> : '🔨'}</div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div className="tech-name">{t.name}</div>
                            <div className="tech-phone">📞 {t.phone || '-'}{t.line_id ? ` · LINE: ${t.line_id}` : ''}</div>
                            {t.rating != null && (
                              <div style={{ marginTop: 3 }}>
                                <span className="rating-stars">{renderStars(t.rating)}</span>
                                <span style={{ fontSize: '10.5px', color: 'var(--mu)' }}> {Number(t.rating || 0).toFixed(1)} ({t.review_count || 0})</span>
                              </div>
                            )}
                          </div>
                        </div>
                        {skills.length > 0 && (
                          <div className="tech-tags">
                            {skills.map((s) => <span key={s.id} className="tech-tag">{s.skill}</span>)}
                          </div>
                        )}
                        {t.phone && (
                          <div style={{ marginTop: 9 }}>
                            <a href={`tel:${t.phone.replace(/[^0-9]/g, '')}`} style={{ textDecoration: 'none' }}>
                              <button className="btn btn-p btn-sm" style={{ width: '100%' }}>📞 โทรหา</button>
                            </a>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </>
          )}

          {activeSection === 'market' && (
            <>
              <div className="ph" style={{ marginBottom: 18 }}>
                <div className="ph-in">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                    <div className="ph-ico">🛒</div>
                    <div><div className="ph-h1">ตลาดชุมชน</div><div className="ph-sub">ซื้อ-ขาย-แจก-เช่า ในหมู่บ้าน</div></div>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 7, marginBottom: 14, flexWrap: 'wrap' }}>
                <input className="fi" style={{ flex: 1, minWidth: 150 }} value={marketSearch} onChange={(e) => setMarketSearch(e.target.value)} placeholder="🔍 ค้นหาสินค้า..." />
                <select className="fs" style={{ width: 'auto', minWidth: 120 }} value={marketFilter} onChange={(e) => setMarketFilter(e.target.value)}>
                  <option value="all">ทุกประเภท</option>
                  <option value="sell">ขาย</option>
                  <option value="free">ให้ฟรี</option>
                  <option value="rent">ให้เช่า</option>
                </select>
              </div>

              {filteredMarket.length === 0 ? (
                <div className="card"><div className="cb" style={{ textAlign: 'center', color: 'var(--mu)', padding: '24px 0' }}>ยังไม่มีประกาศ</div></div>
              ) : (
                <div className="mkt-grid">
                  {filteredMarket.map((item) => (
                    <div key={item.id} className="r-mcard">
                      <div className="r-mcard-img">
                        {item.image_url ? <img src={item.image_url} alt={item.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '🛒'}
                        <span className={`r-mcard-badge ${marketBadgeClass(item.listing_type)}`}>{marketBadgeLabel(item.listing_type)}</span>
                      </div>
                      <div className="r-mcard-body">
                        <div className="r-mcard-cat">{item.category || 'สินค้า'}</div>
                        <div className="r-mcard-title">{item.title}</div>
                        <div className="r-mcard-price">
                          {item.listing_type === 'free' ? 'ให้ฟรี 🎁' : item.price ? `฿${formatMoney(item.price)}` : '-'}
                        </div>
                        <div className="r-mcard-meta">
                          {item.houses?.house_no ? `บ้าน ${item.houses.house_no}` : ''}{item.houses?.soi ? ` ซอย ${item.houses.soi}` : ''} · {formatDate(item.created_at)}
                        </div>
                        {item.contact && <div style={{ marginTop: 5, fontSize: '12px' }}>📞 {item.contact}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {activeSection === 'profile' && (
            <>
              <div className="ph" style={{ marginBottom: 18 }}>
                <div className="ph-in">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div className="ph-ico">👤</div>
                    <div><div className="ph-h1">โปรไฟล์</div><div className="ph-sub">จัดการข้อมูลส่วนตัวและรหัสผ่าน</div></div>
                  </div>
                </div>
              </div>

              <div className="g2">
                <div className="card">
                  <div className="ch"><div className="ch-ico">👤</div><div className="ct">ข้อมูลส่วนตัว</div></div>
                  <div className="cb">
                    <form onSubmit={handleSaveProfile}>
                      <div className="fg">
                        <label className="fl">ชื่อผู้ใช้ (แก้ไขไม่ได้)</label>
                        <input className="fi" value={profile?.username || ''} disabled />
                      </div>
                      <div className="fg">
                        <label className="fl">ชื่อ-นามสกุล</label>
                        <input className="fi" value={profileForm.full_name} onChange={(e) => setProfileForm((p) => ({ ...p, full_name: e.target.value }))} placeholder="ชื่อ-นามสกุล" />
                      </div>
                      <div className="fg">
                        <label className="fl">เบอร์โทรศัพท์</label>
                        <input className="fi" type="tel" value={profileForm.phone} onChange={(e) => setProfileForm((p) => ({ ...p, phone: e.target.value }))} placeholder="081-xxx-xxxx" />
                      </div>
                      <div className="fg">
                        <label className="fl">Email</label>
                        <input className="fi" type="email" value={profileForm.email} onChange={(e) => setProfileForm((p) => ({ ...p, email: e.target.value }))} placeholder="email@example.com" />
                      </div>
                      <div className="fg">
                        <label className="fl">บ้านเลขที่ (แก้ไขไม่ได้)</label>
                        <input className="fi" value={houseNo} disabled />
                      </div>
                      <button className="btn btn-p btn-sm" type="submit" disabled={profileSaving}>
                        {profileSaving ? 'กำลังบันทึก...' : '💾 บันทึกข้อมูล'}
                      </button>
                    </form>
                  </div>
                </div>

                <div className="card">
                  <div className="ch"><div className="ch-ico">🔒</div><div className="ct">เปลี่ยนรหัสผ่าน</div></div>
                  <div className="cb">
                    <div className="al al-i">ℹ️ รหัสผ่านใหม่ต้องอย่างน้อย 6 ตัวอักษร</div>
                    <form onSubmit={handleChangePassword}>
                      <div className="fg">
                        <label className="fl">รหัสผ่านใหม่</label>
                        <div className="pw-wrap">
                          <input className="fi" type={showNewPw ? 'text' : 'password'} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="••••••••" />
                          <span className="pw-eye" onClick={() => setShowNewPw((p) => !p)}>{showNewPw ? '🙈' : '👁️'}</span>
                        </div>
                      </div>
                      <div className="fg">
                        <label className="fl">ยืนยันรหัสผ่านใหม่</label>
                        <div className="pw-wrap">
                          <input className="fi" type={showConfPw ? 'text' : 'password'} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="••••••••" />
                          <span className="pw-eye" onClick={() => setShowConfPw((p) => !p)}>{showConfPw ? '🙈' : '👁️'}</span>
                        </div>
                      </div>
                      <button className="btn btn-p btn-sm" type="submit" disabled={passwordSaving}>
                        {passwordSaving ? 'กำลังเปลี่ยน...' : '🔒 เปลี่ยนรหัสผ่าน'}
                      </button>
                    </form>
                  </div>
                </div>
              </div>
            </>
          )}

        </div>

        {showPaymentModal && (
          <div className="house-mo">
            <div className="house-md house-md--sm">
              <div className="house-md-head">
                <div>
                  <div className="house-md-title">💳 ส่งหลักฐานการชำระ</div>
                  <div className="house-md-sub">งวด {selectedFee?.period || '-'} {selectedFee?.year || ''}</div>
                </div>
              </div>
              <form onSubmit={handleSubmitPayment}>
                <div className="house-md-body">
                  <section className="house-sec">
                    <div className="house-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
                      <label className="house-field">
                        <span>ยอดชำระ *</span>
                        <input type="number" min="0" step="0.01" value={paymentForm.amount} onChange={(e) => setPaymentForm((p) => ({ ...p, amount: e.target.value }))} />
                      </label>
                      <label className="house-field">
                        <span>วิธีชำระ *</span>
                        <select value={paymentForm.payment_method} onChange={(e) => setPaymentForm((p) => ({ ...p, payment_method: e.target.value }))}>
                          <option value="transfer">โอนเงิน</option>
                          <option value="cash">เงินสด</option>
                          <option value="qr">QR</option>
                        </select>
                      </label>
                      <label className="house-field" style={{ gridColumn: '1 / -1' }}>
                        <span>ลิงก์หลักฐาน (สลิป) *</span>
                        <input type="url" placeholder="https://..." value={paymentForm.slip_url} onChange={(e) => setPaymentForm((p) => ({ ...p, slip_url: e.target.value }))} />
                      </label>
                      <label className="house-field" style={{ gridColumn: '1 / -1' }}>
                        <span>หมายเหตุ</span>
                        <textarea rows="2" value={paymentForm.note} onChange={(e) => setPaymentForm((p) => ({ ...p, note: e.target.value }))} placeholder="รายละเอียดเพิ่มเติม" />
                      </label>
                    </div>
                  </section>
                </div>
                <div className="house-md-foot">
                  <button className="btn btn-g" type="button" onClick={closePaymentModal}>ยกเลิก</button>
                  <button className="btn btn-p" type="submit">ส่งตรวจสอบ</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {showViolationModal && (
          <div className="house-mo">
            <div className="house-md house-md--md">
              <div className="house-md-head">
                <div>
                  <div className="house-md-title">📝 อัปเดตข้อมูลจากลูกบ้าน</div>
                  <div className="house-md-sub">{editingViolation?.type || '-'}</div>
                </div>
              </div>
              <form onSubmit={handleResidentSubmit}>
                <div className="house-md-body">
                  <section className="house-sec">
                    <div className="house-sec-title">ข้อความอัปเดต</div>
                    <div className="house-grid house-grid-1">
                      <label className="house-field">
                        <span>รายละเอียดที่ต้องการแจ้งกลับ *</span>
                        <textarea value={residentNote} onChange={(e) => setResidentNote(e.target.value)} rows="4" placeholder="เช่น ได้แก้ไขแล้ว กำลังรอตรวจสอบ" />
                      </label>
                    </div>
                  </section>

                  <section className="house-sec">
                    <div className="house-sec-title">รูปแนบจากลูกบ้าน (สูงสุด 5 รูป)</div>
                    <label className="house-field">
                      <span>แนบไฟล์รูปภาพ</span>
                      <input type="file" accept="image/*" multiple onChange={handleAttachFiles} />
                    </label>
                    <div style={{ marginTop: '8px', fontSize: '12px', color: 'var(--mu)' }}>
                      ระบบย่อไฟล์ไม่เกิน 100KB อัตโนมัติ
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' }}>
                      {attachments.length === 0 ? (
                        <div style={{ fontSize: '12px', color: 'var(--mu)' }}>ยังไม่มีรูปแนบ</div>
                      ) : attachments.map((image, index) => (
                        <div key={`${image.name}-${index}`} style={{ width: '64px' }}>
                          <button type="button" onClick={() => handlePreviewAttachment(image)} style={{ width: '64px', height: '64px', borderRadius: '8px', border: '1px solid var(--bo)', background: '#fff', padding: 0, overflow: 'hidden', cursor: 'pointer' }}>
                            <img src={image.url} alt={image.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          </button>
                          {image.source === 'new' && (
                            <button type="button" onClick={() => handleRemoveAttachment(image)} className="btn btn-xs btn-dg" style={{ marginTop: '4px', width: '100%' }}>ลบ</button>
                          )}
                        </div>
                      ))}
                    </div>
                  </section>
                </div>
                <div className="house-md-foot">
                  <button className="btn btn-g" type="button" onClick={() => closeViolationModal()}>ยกเลิก</button>
                  <button className="btn btn-p" type="submit" disabled={saving}>{saving ? 'กำลังบันทึก...' : 'ส่งอัปเดต'}</button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
