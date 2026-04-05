import { useEffect, useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import Chart from 'chart.js/auto'
import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'
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
import { createMarketplaceItem, listMarketplace, listMarketplaceImages, updateMarketplaceItem, uploadMarketplaceImages } from '../../lib/marketplace'
import { listVehicles, listVehicleImages, deleteVehicleImagesByPaths } from '../../lib/vehicles'
import {
  listVehicleRequests,
  createVehicleRequest,
  listVehicleRequestImages,
  updateVehicleRequestImageUrls,
  uploadVehicleRequestImages,
  cancelVehicleRequest,
  deleteVehicleRequestImagesByPaths,
} from '../../lib/vehicleRequests'
import { listIssues, createIssue, uploadIssueImages, updateIssue } from '../../lib/issues'
import { listRuleDocuments } from '../../lib/rules'
import { getHouseDetail, updateUser } from '../../lib/users'
import { getSetupConfig, applyDocumentTitle } from '../../lib/setup'
import { insertPageViewLog } from '../../lib/loginLogs'
import villageLogo from '../../assets/village-logo.svg'
import '../admin/AdminLayout.css'
import '../admin/AdminDashboard.css'
import './ResidentLayout.css'

const BUILD_SHA = typeof __BUILD_SHA__ !== 'undefined' ? __BUILD_SHA__ : 'local'
const BUILD_DATE = typeof __BUILD_DATE__ !== 'undefined' ? __BUILD_DATE__ : '-'
const APP_VERSION = '1.0.0'

const MAX_ATTACHMENTS = 5
const MAX_IMAGE_SIZE_BYTES = 100 * 1024
const MAX_IMAGE_TARGET_BYTES = 95 * 1024
const REJECT_PREFIX = '[REJECT] '
const ISSUE_CATEGORY_OPTIONS = ['ทั่วไป', 'ไฟฟ้า', 'ประปา', 'ความปลอดภัย', 'ความสะอาด', 'โครงสร้าง', 'ถนน', 'อื่นๆ']
const MARKETPLACE_MAX_ATTACHMENTS = 2
const MARKET_CATEGORY_OPTIONS = [
  'อาหารและเครื่องดื่ม',
  'ผักผลไม้',
  'ของใช้ในบ้าน',
  'เครื่องใช้ไฟฟ้า',
  'อิเล็กทรอนิกส์',
  'มือถือและอุปกรณ์',
  'คอมพิวเตอร์และไอที',
  'เฟอร์นิเจอร์',
  'เสื้อผ้าแฟชั่น',
  'รองเท้าและกระเป๋า',
  'เครื่องสำอางความงาม',
  'สุขภาพและยา',
  'แม่และเด็ก',
  'สัตว์เลี้ยง',
  'หนังสือและเครื่องเขียน',
  'กีฬาและฟิตเนส',
  'ยานยนต์และอะไหล่',
  'งานซ่อมและบริการ',
  'อสังหาฯ/เช่า',
  'มือสองทั่วไป',
  'งานฝีมือ',
  'อื่นๆ',
]

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

const VEHICLE_TYPES_OPT = ['รถยนต์', 'รถจักรยานยนต์', 'รถกระบะ', 'รถตู้', 'รถอื่นๆ']
const BRAND_OPTIONS = [
  'Toyota', 'Honda', 'Isuzu', 'Mitsubishi', 'Nissan', 'Mazda', 'Ford', 'MG',
  'BYD', 'GWM', 'Suzuki', 'Subaru', 'Hyundai', 'Kia', 'Mercedes-Benz',
  'BMW', 'Audi', 'Volvo', 'Lexus', 'Chevrolet', 'Peugeot', 'Yamaha', 'Honda Motorcycle',
  'Kawasaki', 'Suzuki Motorcycle', 'Vespa', 'Ducati', 'Triumph', 'Royal Enfield', 'อื่นๆ',
]
const COLOR_OPTIONS = ['ขาว', 'ดำ', 'เทา', 'เงิน', 'น้ำเงิน', 'แดง', 'เขียว', 'เหลือง', 'ส้ม', 'น้ำตาล', 'ม่วง', 'ชมพู', 'ทอง', 'ฟ้า', 'อื่นๆ']
const PROVINCE_OPTIONS = [
  'กรุงเทพมหานคร', 'กระบี่', 'กาญจนบุรี', 'กาฬสินธุ์', 'กำแพงเพชร', 'ขอนแก่น', 'จันทบุรี', 'ฉะเชิงเทรา',
  'ชลบุรี', 'ชัยนาท', 'ชัยภูมิ', 'ชุมพร', 'เชียงราย', 'เชียงใหม่', 'ตรัง', 'ตราด', 'ตาก', 'นครนายก',
  'นครปฐม', 'นครพนม', 'นครราชสีมา', 'นครศรีธรรมราช', 'นครสวรรค์', 'นนทบุรี', 'นราธิวาส', 'น่าน',
  'บึงกาฬ', 'บุรีรัมย์', 'ปทุมธานี', 'ประจวบคีรีขันธ์', 'ปราจีนบุรี', 'ปัตตานี', 'พระนครศรีอยุธยา',
  'พะเยา', 'พังงา', 'พัทลุง', 'พิจิตร', 'พิษณุโลก', 'เพชรบุรี', 'เพชรบูรณ์', 'แพร่', 'ภูเก็ต',
  'มหาสารคาม', 'มุกดาหาร', 'แม่ฮ่องสอน', 'ยะลา', 'ร้อยเอ็ด', 'ระนอง', 'ระยอง', 'ราชบุรี', 'ลพบุรี',
  'ลำปาง', 'ลำพูน', 'เลย', 'ศรีสะเกษ', 'สกลนคร', 'สงขลา', 'สตูล', 'สมุทรปราการ', 'สมุทรสงคราม',
  'สมุทรสาคร', 'สระแก้ว', 'สระบุรี', 'สิงห์บุรี', 'สุโขทัย', 'สุพรรณบุรี', 'สุราษฎร์ธานี', 'สุรินทร์',
  'หนองคาย', 'หนองบัวลำภู', 'อ่างทอง', 'อำนาจเจริญ', 'อุดรธานี', 'อุตรดิตถ์', 'อุทัยธานี', 'อุบลราชธานี', 'เบตง',
]
const PARKING_OPTIONS = ['ในบ้าน', 'หน้าบ้าน', 'ส่วนกลาง']

const EMPTY_VR_FORM = {
  license_plate_prefix: '',
  license_plate_number: '',
  province: 'กรุงเทพมหานคร',
  vehicle_type: 'รถยนต์',
  brand: 'Toyota',
  brand_other: '',
  model: '',
  color: 'ขาว',
  color_other: '',
  vehicle_status: 'active',
  parking_location: 'ในบ้าน',
  parking_lock_no: '',
  parking_fee: '0',
  note: '',
}

const THEMES = ['normal', 'dark', 'rose', 'sage', 'sand', 'violet', 'teal', 'coral', 'mauve', 'dustyrose']

const NAV_GROUPS = [
  {
    section: 'กฎระเบียบ',
    tone: 'insight',
    sectionIcon: '📘',
    items: [
      { key: 'rules', icon: '📘', label: 'กฎระเบียบ' },
    ],
  },
  {
    section: 'หน้าหลัก',
    tone: 'core',
    sectionIcon: '🏠',
    items: [
      { key: 'dash', icon: '🏡', label: 'หน้าหลัก' },
      { key: 'house', icon: '🏠', label: 'ข้อมูลบ้านของฉัน' },
      { key: 'vehicles', icon: '🚗', label: 'ข้อมูลรถ' },
      { key: 'fees', icon: '💳', label: 'ค่าส่วนกลาง' },
      { key: 'issue', icon: '🔔', label: 'แจ้งปัญหา' },
      { key: 'notif', icon: '⚠️', label: 'การแจ้งเตือน' },
    ],
  },
  {
    section: 'ข้อมูล',
    tone: 'insight',
    sectionIcon: '📋',
    items: [
      { key: 'news', icon: '📢', label: 'ประกาศ' },
      { key: 'work', icon: '🏆', label: 'ผลงานนิติ' },
      { key: 'tech', icon: '🔨', label: 'ทำเนียบช่าง' },
      { key: 'market', icon: '🛒', label: 'ตลาดชุมชน' },
    ],
  },
  {
    section: 'บัญชี',
    tone: 'system',
    sectionIcon: '👤',
    items: [
      { key: 'profile', icon: '👤', label: 'โปรไฟล์' },
    ],
  },
]

const SECTION_TITLE = {
  rules: () => ({ main: 'กฎระเบียบ', sub: 'เอกสารกฎและระเบียบการอยู่อาศัย' }),
  dash: (hn) => ({ main: 'หน้าหลัก', sub: `บ้าน ${hn}` }),
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

function isImageLink(url) {
  const value = String(url || '').toLowerCase()
  return /\.(png|jpe?g|gif|webp|svg)(\?|#|$)/.test(value)
}

function getFileKind(url) {
  const value = String(url || '').toLowerCase()
  if (/\.(pdf)(\?|#|$)/.test(value)) return { icon: '📄', label: 'PDF' }
  if (/\.(doc|docx)(\?|#|$)/.test(value)) return { icon: '📝', label: 'DOC' }
  if (/\.(xls|xlsx|csv)(\?|#|$)/.test(value)) return { icon: '📊', label: 'XLS' }
  if (/\.(ppt|pptx)(\?|#|$)/.test(value)) return { icon: '📈', label: 'PPT' }
  if (/\.(zip|rar|7z)(\?|#|$)/.test(value)) return { icon: '🗜️', label: 'ZIP' }
  if (/\.(txt)(\?|#|$)/.test(value)) return { icon: '📄', label: 'TXT' }
  return { icon: '📎', label: 'FILE' }
}

function extractUrlsFromText(text) {
  const matches = String(text || '').match(/https?:\/\/[^\s)\]]+/g) || []
  const clean = matches.map((url) => url.replace(/[),.;]+$/, ''))
  return Array.from(new Set(clean))
}

function buildAttachmentItems({ imageUrls = [], text = '', maxItems = 6 }) {
  const fromImages = (Array.isArray(imageUrls) ? imageUrls : [])
    .filter(Boolean)
    .map((url, index) => ({ id: `img-${index}`, url, isImage: true, title: `รูปแนบ ${index + 1}` }))
  const fromText = extractUrlsFromText(text).map((url, index) => ({
    id: `txt-${index}`,
    url,
    isImage: isImageLink(url),
    title: `ไฟล์แนบ ${index + 1}`,
  }))

  const dedup = []
  const seen = new Set()
  for (const item of [...fromImages, ...fromText]) {
    if (!item.url || seen.has(item.url)) continue
    seen.add(item.url)
    dedup.push(item)
    if (dedup.length >= maxItems) break
  }
  return dedup
}

export default function ResidentLayout() {
  const navigate = useNavigate()
  const { profile, logout } = useAuth()

  const [activeSection, setActiveSection] = useState('dash')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed] = useState(false)
  const [menuSearch, setMenuSearch] = useState('')
  const [sectionOpen, setSectionOpen] = useState({
    กฎระเบียบ: true,
    หน้าหลัก: true,
    ข้อมูล: false,
    บัญชี: false,
  })
  const [theme, setTheme] = useState(() => localStorage.getItem('vms-theme') || 'normal')
  const [setupOpen, setSetupOpen] = useState(false)
  const [houseNo, setHouseNo] = useState('-')
  const [setup, setSetup] = useState({ villageName: 'The Greenfield', appLineMain: 'Village Management', version: 'v12.3' })

  const [fees, setFees] = useState([])
  const [allFees, setAllFees] = useState([])
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
  const [notifDateFilter, setNotifDateFilter] = useState('all')
  const [loading, setLoading] = useState(false)
  const [showViolationModal, setShowViolationModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editingViolation, setEditingViolation] = useState(null)
  const [residentNote, setResidentNote] = useState('')
  const [residentViolationStatus, setResidentViolationStatus] = useState('in_progress')
  const [attachments, setAttachments] = useState([])

  const [announcements, setAnnouncements] = useState([])
  const [ruleDocs, setRuleDocs] = useState([])
  const [workReports, setWorkReports] = useState([])
  const [technicians, setTechnicians] = useState([])
  const [marketplace, setMarketplace] = useState([])
  const [vehicles, setVehicles] = useState([])
  const [vehiclesLoaded, setVehiclesLoaded] = useState(false)
  const [issues, setIssues] = useState([])
  const [houseDetail, setHouseDetail] = useState(null)
  const [houseDetailLoaded, setHouseDetailLoaded] = useState(false)

  const [showIssueForm, setShowIssueForm] = useState(false)
  const [issueForm, setIssueForm] = useState({ title: '', detail: '', category: 'ทั่วไป' })
  const [issueAttachments, setIssueAttachments] = useState([])
  const [issueSubmitting, setIssueSubmitting] = useState(false)

  const [profileForm, setProfileForm] = useState({ full_name: '', phone: '', email: '' })
  const [profileSaving, setProfileSaving] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordSaving, setPasswordSaving] = useState(false)
  const [showNewPw, setShowNewPw] = useState(false)
  const [showConfPw, setShowConfPw] = useState(false)

  const [techSearch, setTechSearch] = useState('')
  const [selectedTech, setSelectedTech] = useState(null)
  const [marketSearch, setMarketSearch] = useState('')
  const [marketFilter, setMarketFilter] = useState('all')
  const [showMarketPostModal, setShowMarketPostModal] = useState(false)
  const [marketPosting, setMarketPosting] = useState(false)
  const [marketPostForm, setMarketPostForm] = useState({ title: '', detail: '', category: '', listing_type: 'sell', price: '', contact: '', status: 'pending' })
  const [marketPostAttachments, setMarketPostAttachments] = useState([])
  const [showMarketDetailModal, setShowMarketDetailModal] = useState(false)
  const [marketDetailItem, setMarketDetailItem] = useState(null)
  const [marketDetailImages, setMarketDetailImages] = useState([])
  const [marketDetailIndex, setMarketDetailIndex] = useState(0)
  const [marketDetailLoading, setMarketDetailLoading] = useState(false)
  const [showPdfViewerModal, setShowPdfViewerModal] = useState(false)
  const [pdfViewerUrl, setPdfViewerUrl] = useState('')
  const [pdfViewerTitle, setPdfViewerTitle] = useState('เอกสาร PDF')
  const [showPrintPreviewModal, setShowPrintPreviewModal] = useState(false)
  const [printPreviewHtml, setPrintPreviewHtml] = useState('')
  const [printPreviewTitle, setPrintPreviewTitle] = useState('เอกสารสำหรับพิมพ์')
  const [printPreviewFileBase, setPrintPreviewFileBase] = useState('document')
  const [printPreviewExporting, setPrintPreviewExporting] = useState(false)

  // Vehicle request states
  const [vehicleRequests, setVehicleRequests] = useState([])
  const [vehicleRequestsLoaded, setVehicleRequestsLoaded] = useState(false)
  const [showVehicleReqModal, setShowVehicleReqModal] = useState(false)
  const [vehicleReqMode, setVehicleReqMode] = useState('add') // 'add' | 'edit'
  const [vehicleReqTarget, setVehicleReqTarget] = useState(null) // vehicle being edited
  const [vehicleReqForm, setVehicleReqForm] = useState(EMPTY_VR_FORM)
  const [vehicleReqSaving, setVehicleReqSaving] = useState(false)
  const [vehicleReqAttachments, setVehicleReqAttachments] = useState([])
  const [vehicleReqRemovedPaths, setVehicleReqRemovedPaths] = useState([])

  const chartCanvasRef = useRef(null)
  const chartInstanceRef = useRef(null)
  const printPreviewIframeRef = useRef(null)

  useEffect(() => {
    document.body.setAttribute('data-theme', theme)
    localStorage.setItem('vms-theme', theme)
  }, [theme])

  useEffect(() => {
    const activeGroup = NAV_GROUPS.find((group) => group.items.some((item) => item.key === activeSection))
    if (!activeGroup) return
    setSectionOpen((prev) => ({ ...prev, [activeGroup.section]: true }))
  }, [activeSection])

  useEffect(() => {
    getSetupConfig().then((s) => {
      setSetup(s)
      applyDocumentTitle(s.villageName)
    }).catch(() => {})
  }, [])

  useEffect(() => {
    if (!profile?.house_id) {
      setHouseNo('-')
      setHouseDetail(null)
      setHouseDetailLoaded(true)
      setVehicles([])
      setVehiclesLoaded(true)
      setVehicleRequests([])
      setVehicleRequestsLoaded(true)
      return
    }

    setHouseDetailLoaded(false)
    setVehiclesLoaded(false)
    setVehicleRequestsLoaded(false)

    Promise.all([
      getHouseDetail(profile.house_id),
      listVehicles(),
      listVehicleRequests({ houseId: profile.house_id }),
    ])
      .then(([detail, allVehicles, requests]) => {
        setHouseDetail(detail)
        setHouseNo(detail?.house_no || '-')
        setVehicles((allVehicles || []).filter((item) => String(item.house_id) === String(profile.house_id)))
        setVehicleRequests(requests || [])
      })
      .catch(() => {
        setHouseNo('-')
        setHouseDetail(null)
        setVehicles([])
        setVehicleRequests([])
      })
      .finally(() => {
        setHouseDetailLoaded(true)
        setVehiclesLoaded(true)
        setVehicleRequestsLoaded(true)
      })
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

  useEffect(() => () => {
    marketPostAttachments.forEach((item) => {
      if (item?.url && String(item.url).startsWith('blob:')) URL.revokeObjectURL(item.url)
    })
  }, [marketPostAttachments])

  useEffect(() => {
    const fn = () => { if (window.innerWidth >= 1024) setSidebarOpen(false) }
    window.addEventListener('resize', fn)
    return () => window.removeEventListener('resize', fn)
  }, [])

  const loadFeeData = useCallback(async (override = {}) => {
    if (!profile?.house_id) return
    try {
      setFeeLoading(true)
      const [feeRows, allFeeRows, paymentRows] = await Promise.all([
        listHouseFees(profile.house_id, {
          status: override.status ?? feeStatusFilter,
          year: override.year ?? feeYearFilter,
        }),
        listHouseFees(profile.house_id),
        listHousePayments(profile.house_id),
      ])
      setFees(feeRows)
      setAllFees(allFeeRows)
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
    if (activeSection === 'rules' && ruleDocs.length === 0) {
      listRuleDocuments().then(setRuleDocs).catch(() => {})
    }
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
      listMarketplace({ status: 'all' }).then(setMarketplace).catch(() => {})
    }
    if (activeSection === 'issue' && issues.length === 0 && profile?.house_id) {
      listIssues().then((all) => setIssues(all.filter((i) => String(i.house_id) === String(profile.house_id)))).catch(() => {})
    }
    if (activeSection === 'dash' && announcements.length === 0) {
      listAnnouncements().then(setAnnouncements).catch(() => {})
    }
  }, [activeSection, profile?.house_id])

  useEffect(() => {
    if (activeSection !== 'dash') return
    if (!chartCanvasRef.current) return
    if (allFees.length === 0) return

    if (chartInstanceRef.current) { chartInstanceRef.current.destroy(); chartInstanceRef.current = null }

    const paidByFeeId = payments.reduce((acc, payment) => {
      if (!payment?.fee_id || getRejectedReason(payment.note)) return acc
      const itemTotal = Array.isArray(payment.payment_items)
        ? payment.payment_items.reduce((sum, item) => sum + Number(item?.paid_amount || 0), 0)
        : 0
      const amount = itemTotal > 0 ? itemTotal : Number(payment.amount || 0)
      acc[payment.fee_id] = Number(acc[payment.fee_id] || 0) + amount
      return acc
    }, {})

    // Group allFees by year and sum amounts
    const yearMap = {}
    allFees.forEach((fee) => {
      const yr = String(fee.year || '').trim()
      if (!yr) return
      if (!yearMap[yr]) yearMap[yr] = { billed: 0, paid: 0 }
      yearMap[yr].billed += Number(fee.total_amount || 0)
      yearMap[yr].paid += Number(paidByFeeId[fee.id] || 0)
    })

    // Get last 5 years sorted ascending
    const years = Object.keys(yearMap).sort((a, b) => Number(a) - Number(b)).slice(-5)
    if (years.length === 0) return

    const labels = years.map((yr) => `ปี ${yr}`)
    const dueData = years.map((yr) => yearMap[yr].billed)
    const paidData = years.map((yr) => yearMap[yr].paid)

    chartInstanceRef.current = new Chart(chartCanvasRef.current, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'ยอดใบแจ้งหนี้',
            data: dueData,
            backgroundColor: '#1d4ed8',
            borderRadius: 6,
            barThickness: 22,
          },
          {
            label: 'ยอดที่ชำระแล้ว',
            data: paidData,
            backgroundColor: '#22c55e',
            borderRadius: 6,
            barThickness: 22,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: true, position: 'bottom' },
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
  }, [activeSection, allFees, payments])

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
    if (status === 'resolved') return { className: 'bd b-pr', label: 'รอประเมิน' }
    if (status === 'in_progress') return { className: 'bd b-pr', label: 'กำลังดำเนินการ' }
    if (status === 'pending') return { className: 'bd b-wn', label: 'รอดำเนินการ' }
    if (status === 'closed') return { className: 'bd b-ok', label: 'ปิดงานแล้ว' }
    if (status === 'cancelled') return { className: 'bd b-dg', label: 'ยกเลิก' }
    return { className: 'bd b-mu', label: status }
  }

  function getViolationStatusBadge(status) {
    if (status === 'new' || status === 'pending') return { className: 'bd b-dg', label: 'ยังไม่ดำเนินการ' }
    if (status === 'in_progress') return { className: 'bd b-pr', label: 'กำลังดำเนินการ' }
    if (status === 'resolved') return { className: 'bd b-ok', label: 'ดำเนินการแล้ว' }
    if (status === 'not_fixed') return { className: 'bd b-wn', label: 'ส่งกลับไปดำเนินการใหม่' }
    if (status === 'closed') return { className: 'bd b-ok', label: 'ปิดรายการ' }
    if (status === 'cancelled') return { className: 'bd b-mu', label: 'ยกเลิก' }
    return { className: 'bd b-mu', label: status || '-' }
  }

  function getViolationTypeBadgeClass(type) {
    const text = String(type || '').toLowerCase()
    if (text.includes('จอดรถ')) return 'bd b-pr'
    if (text.includes('เสียง')) return 'bd b-wn'
    if (text.includes('ขยะ')) return 'bd b-ac'
    return 'bd b-mu'
  }

  function parseConversationEntries(rawText, side) {
    const lines = String(rawText || '').split('\n').map((line) => line.trim()).filter(Boolean)
    const entries = []
    const pattern = /^\[([^\]]+)\]\s*(.+?):\s*(.+)$/
    lines.forEach((line, index) => {
      const matched = line.match(pattern)
      if (matched) {
        const when = new Date(matched[1])
        entries.push({
          id: `${side}-${index}`,
          side,
          actor: matched[2] || (side === 'admin' ? 'นิติ' : 'ลูกบ้าน'),
          text: matched[3] || '-',
          at: Number.isNaN(when.getTime()) ? null : when,
        })
      } else {
        entries.push({
          id: `${side}-${index}`,
          side,
          actor: side === 'admin' ? 'นิติ' : 'ลูกบ้าน',
          text: line,
          at: null,
        })
      }
    })
    return entries
  }

  function getViolationConversation(violation) {
    const initial = {
      id: `${violation.id}-created`,
      side: 'system',
      actor: 'ระบบ',
      text: 'สร้างรายการแจ้งเตือน',
      at: violation.created_at ? new Date(violation.created_at) : null,
    }
    const entries = [
      initial,
      ...parseConversationEntries(violation.admin_note, 'admin'),
      ...parseConversationEntries(violation.resident_note, 'resident'),
    ]
    return entries.sort((left, right) => {
      const leftTime = left.at ? left.at.getTime() : 0
      const rightTime = right.at ? right.at.getTime() : 0
      return leftTime - rightTime
    })
  }

  function isViolationWithinDateFilter(violation, filterValue) {
    if (!filterValue || filterValue === 'all') return true
    const baseDate = new Date(violation.created_at || violation.due_date || violation.resident_updated_at || 0)
    if (Number.isNaN(baseDate.getTime())) return false
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const entryStart = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate())
    if (filterValue === 'today') return entryStart.getTime() === todayStart.getTime()
    const diffDays = Math.floor((todayStart.getTime() - entryStart.getTime()) / (1000 * 60 * 60 * 24))
    if (filterValue === '7d') return diffDays >= 0 && diffDays <= 7
    if (filterValue === '30d') return diffDays >= 0 && diffDays <= 30
    return true
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

  function formatFeePeriodLabel(fee) {
    if (!fee) return '-'
    if (fee.period === 'first_half') return `${fee.year || '-'} / 1`
    if (fee.period === 'second_half') return `${fee.year || '-'} / 2`
    if (fee.period === 'full_year') return `${fee.year || '-'} / ทั้งปี`
    return [fee.year, fee.period].filter(Boolean).join(' / ') || '-'
  }

  function getFeeStatusSummary() {
    if (overdueAmount > 0) return { label: 'ค้างชำระ', tone: 'error' }
    if (fees.some((fee) => fee.status === 'pending')) return { label: 'รอตรวจสอบ', tone: 'warning' }
    if (fees.some((fee) => fee.status === 'paid')) return { label: 'ปกติ', tone: 'success' }
    return { label: 'ยังไม่มีข้อมูล', tone: 'primary' }
  }

  function getPaymentBreakdown(row) {
    return (Array.isArray(row?.payment_items) ? row.payment_items : [])
      .filter((item) => Number(item?.paid_amount || 0) > 0)
      .map((item) => ({
        label: item.item_label || item.item_key || 'รายการชำระ',
        amount: Number(item.paid_amount || 0),
      }))
  }

  function getPaymentAmount(row) {
    const itemTotal = getPaymentBreakdown(row).reduce((sum, item) => sum + Number(item.amount || 0), 0)
    return itemTotal > 0 ? itemTotal : Number(row?.amount || 0)
  }

  const feeItemDefs = [
    { key: 'fee_common', label: 'ค่าส่วนกลาง' },
    { key: 'fee_parking', label: 'ค่าจอดรถ' },
    { key: 'fee_waste', label: 'ค่าขยะ' },
    { key: 'fee_overdue_common', label: 'ยอดค้างยกมา' },
    { key: 'fee_overdue_fine', label: 'ค่าปรับยอดค้าง' },
    { key: 'fee_overdue_notice', label: 'ค่าทวงถามยอดค้าง' },
    { key: 'fee_fine', label: 'ค่าปรับ' },
    { key: 'fee_notice', label: 'ค่าทวงถาม' },
    { key: 'fee_violation', label: 'ค่ากระทำผิด' },
    { key: 'fee_other', label: 'ค่าอื่นๆ' },
  ]

  function getInvoiceFeeItemRows(fee) {
    return feeItemDefs
      .map((item) => ({
        ...item,
        amount: Number(fee?.[item.key] || 0),
      }))
      .filter((item) => item.amount !== 0)
  }

  function getPaymentTypeLabel(row) {
    return row?.fee_id ? 'ค่าส่วนกลาง' : 'ค่าอื่นๆ'
  }

  function openHtmlInWindow(html) {
    const w = window.open('', '_blank', 'width=1100,height=900')
    if (!w) return null
    w.document.write(html)
    w.document.close()
    return w
  }

  function toThaiBahtText(value) {
    const amount = Number(value || 0)
    if (!Number.isFinite(amount) || amount < 0) return '-'
    if (amount === 0) return 'ศูนย์บาทถ้วน'
    const numberText = ['ศูนย์', 'หนึ่ง', 'สอง', 'สาม', 'สี่', 'ห้า', 'หก', 'เจ็ด', 'แปด', 'เก้า']
    const positionText = ['', 'สิบ', 'ร้อย', 'พัน', 'หมื่น', 'แสน', 'ล้าน']
    const convertInteger = (num) => {
      if (num === 0) return ''
      let result = ''
      const digits = String(num).split('').map((d) => Number(d))
      const len = digits.length
      digits.forEach((digit, idx) => {
        const pos = len - idx - 1
        if (digit === 0) return
        if (pos === 0 && digit === 1 && len > 1) { result += 'เอ็ด'; return }
        if (pos === 1 && digit === 1) { result += 'สิบ'; return }
        if (pos === 1 && digit === 2) { result += 'ยี่สิบ'; return }
        result += `${numberText[digit]}${positionText[pos]}`
      })
      return result
    }
    const [intPartRaw, decPartRaw = '00'] = amount.toFixed(2).split('.')
    let intPart = Number(intPartRaw)
    const decPart = Number(decPartRaw)
    const millionChunks = []
    while (intPart > 0) { millionChunks.unshift(intPart % 1000000); intPart = Math.floor(intPart / 1000000) }
    const bahtText = millionChunks.map((chunk, index) => {
      const text = convertInteger(chunk)
      if (!text) return ''
      return index === millionChunks.length - 1 ? text : `${text}ล้าน`
    }).join('') || 'ศูนย์'
    if (decPart === 0) return `${bahtText}บาทถ้วน`
    return `${bahtText}บาท${convertInteger(decPart)}สตางค์`
  }

  const PRINT_SHARED_CSS = `
    @page { size: A4; margin: 0; }
    * { box-sizing: border-box; }
    html, body { font-family: 'Sarabun', 'TH Sarabun New', Tahoma, sans-serif; margin: 0; padding: 0; color: #111827; background: #fff; }
    .sheet { width: 100%; page-break-after: always; break-after: page; break-inside: avoid; background: #fff; padding: 24px 28px; display: flex; flex-direction: column; gap: 8px; }
    .head { display: flex; justify-content: space-between; gap: 12px; border: 1px solid #cbd5e1; border-radius: 4px; padding: 10px 12px; background: #fff; margin-bottom: 4px; }
    .brand { display: flex; align-items: flex-start; gap: 10px; flex: 1; min-width: 0; }
    .logo-wrap { width: 54px; height: 54px; border-radius: 10px; background: #f1f5f9; border: 1.5px solid #cbd5e1; padding: 5px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .logo-wrap img { width: 100%; height: 100%; object-fit: contain; }
    .doc { font-size: 16px; font-weight: 700; line-height: 1.3; }
    .village { font-size: 11px; margin-top: 3px; font-weight: 600; }
    .sub { font-size: 9px; color: #6b7280; margin-top: 2px; }
    .doc-meta { font-size: 10px; min-width: 180px; display: flex; flex-direction: column; gap: 2px; word-break: break-word; }
    .doc-meta span { color: #6b7280; font-weight: 500; }
    .copy-mark-row { display: flex; justify-content: flex-end; margin-top: 10px; }
    .copy-mark { font-size: 14px; font-weight: 700; color: #0c4a6e; }
    .box { border: 1px solid #cbd5e1; border-radius: 4px; padding: 10px 12px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 10px; }
    .grid > div { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
    .grid span { font-size: 9px; color: #6b7280; font-weight: 500; }
    .grid strong { font-size: 11px; font-weight: 600; }
    table { width: 100%; border-collapse: collapse; }
    th, td { border: 1px solid #cbd5e1; padding: 6px 8px; font-size: 10px; word-wrap: break-word; }
    th { background: #f1f5f9; text-align: left; font-weight: 600; }
    .c { text-align: center; } .r { text-align: right; }
    tfoot td { background: #f1f5f9; font-weight: 600; }
    .amount-text { margin-top: 4px; font-size: 10px; color: #374151; font-weight: 500; text-align: right; }
    .payment-box { display: flex; flex-direction: column; gap: 6px; }
    .payment-title { font-size: 11px; font-weight: 700; }
    .payment-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 10px; }
    .payment-grid > div { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
    .payment-grid span { font-size: 9px; color: #6b7280; font-weight: 500; }
    .payment-grid strong { font-size: 11px; font-weight: 600; }
    .payment-note { border-top: 1px dashed #d1d5db; padding-top: 4px; font-size: 10px; color: #4b5563; margin-top: 4px; }
    .foot { margin-top: 8px; border: 1px solid #cbd5e1; border-radius: 4px; padding: 10px 12px; display: flex; align-items: flex-end; justify-content: space-between; gap: 12px; background: #f9fafb; }
    .note { font-size: 9px; color: #64748b; line-height: 1.4; }
    .sign-wrap { min-width: 140px; text-align: center; font-size: 9px; color: #64748b; }
    .sign-wrap img { max-width: 100px; max-height: 36px; object-fit: contain; display: block; margin: 0 auto 4px; }
    .sign-line { border-top: 1px solid #cbd5e1; margin: 4px 0; }
    @media print { .sheet { page-break-after: always; break-after: page; } .sheet:last-of-type { page-break-after: avoid; break-after: avoid; } }
  `

  function buildResidentInvoiceHtml(fee) {
    const logoSrc = setup.loginCircleLogoUrl || setup.villageLogoUrl || ''
    const invoiceNo = `INV-${String(fee?.year || '').slice(-2)}-${String(fee?.id || '').slice(0, 8).toUpperCase()}`
    const periodText = formatFeePeriodLabel(fee)
    const ownerName = houseDetail?.owner_name || profile?.full_name || '-'
    const fmtDate = (v) => v ? new Date(v).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' }) : '-'
    const fmtMoney = (v) => Number(v || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    const totalAmount = Number(fee.total_amount || 0)
    const invoiceRows = getInvoiceFeeItemRows(fee)
    const renderRows = () => {
      if (invoiceRows.length === 0) {
        return `
          <tr>
            <td class="c">1</td>
            <td>ไม่มีรายการเรียกเก็บ</td>
            <td class="r">0.00</td>
          </tr>
        `
      }
      return invoiceRows.map((item, index) => `
        <tr>
          <td class="c">${index + 1}</td>
          <td>${item.label}</td>
          <td class="r">${fmtMoney(item.amount)}</td>
        </tr>
      `).join('')
    }
    const renderSheet = (copyLabel) => `
      <div class="sheet">
        <div class="head">
          <div class="brand">
            ${logoSrc ? `<div class="logo-wrap"><img src="${logoSrc}" alt="logo" /></div>` : ''}
            <div>
              <div class="doc">ใบแจ้งหนี้ค่าส่วนกลาง</div>
              <div class="village">${setup.villageName || 'The Greenfield'}</div>
              <div class="sub">${setup.address || '-'}</div>
            </div>
          </div>
          <div class="doc-meta">
            <div><span>เลขที่เอกสาร:</span> <strong>${invoiceNo}</strong></div>
            <div><span>วันที่ออกเอกสาร:</span> <strong>${fmtDate(fee.invoice_date)}</strong></div>
            <div><span>ครบกำหนดชำระ:</span> <strong>${fmtDate(fee.due_date)}</strong></div>
            <div class="copy-mark-row"><div class="copy-mark">${copyLabel}</div></div>
          </div>
        </div>
        <section class="box">
          <div class="grid">
            <div><span>บ้านเลขที่</span><strong>${houseNo || '-'}</strong></div>
            <div><span>ชื่อเจ้าของบ้าน</span><strong>${ownerName}</strong></div>
            <div><span>งวดเรียกเก็บ</span><strong>${periodText}</strong></div>
          </div>
        </section>
        <section class="box">
          <table>
            <thead>
              <tr>
                <th class="c" style="width:56px;">ลำดับ</th>
                <th>รายการ</th>
                <th class="r" style="width:180px;">จำนวนเงิน (บาท)</th>
              </tr>
            </thead>
            <tbody>${renderRows()}</tbody>
            <tfoot>
              <tr>
                <td colspan="2" class="r"><strong>รวมทั้งสิ้น</strong></td>
                <td class="r"><strong>${fmtMoney(totalAmount)}</strong></td>
              </tr>
            </tfoot>
          </table>
          <div class="amount-text">(${toThaiBahtText(totalAmount)})</div>
        </section>
        <section class="box payment-box">
          <div class="payment-title">รายละเอียดการชำระเงิน</div>
          <div class="payment-grid">
            <div><span>ธนาคาร</span><strong>${setup.bankName || '-'}</strong></div>
            <div><span>เลขที่บัญชี</span><strong>${setup.bankAccountNo || '-'}</strong></div>
            <div><span>ชื่อบัญชี</span><strong>${setup.bankAccountName || '-'}</strong></div>
            <div><span>กำหนดชำระ</span><strong>${fmtDate(fee.due_date)}</strong></div>
          </div>
          <div class="payment-note">กรุณาชำระภายในวันที่ครบกำหนด หากพ้นกำหนดจะมีค่าปรับตามประกาศนิติบุคคล</div>
        </section>
        <section class="foot">
          <div class="note">หมายเหตุ: กรุณาชำระภายในวันที่ครบกำหนด เพื่อหลีกเลี่ยงค่าปรับเพิ่มเติม</div>
          <div class="sign-wrap">
            ${setup.juristicSignatureUrl ? `<img src="${setup.juristicSignatureUrl}" alt="signature" />` : ''}
            <div class="sign-line"></div>
            <div>ผู้มีอำนาจลงนาม</div>
          </div>
        </section>
      </div>
    `
    return `
      <html>
        <head>
          <title>ใบแจ้งหนี้ ${invoiceNo}</title>
          <link rel="preconnect" href="https://fonts.googleapis.com">
          <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
          <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;500;700&display=swap" rel="stylesheet">
          <style>${PRINT_SHARED_CSS}</style>
        </head>
        <body>
          ${renderSheet('ต้นฉบับ')}
          ${renderSheet('สำเนา')}
        </body>
      </html>
    `
  }

  function buildResidentReceiptHtml(payment) {
    const receiptNo = payment?.receipt_no || `REC-${String(payment?.id || '').slice(0, 8).toUpperCase()}`
    const logoSrc = setup.loginCircleLogoUrl || setup.villageLogoUrl || ''
    const ownerName = houseDetail?.owner_name || profile?.full_name || '-'
    const fmtDate = (v) => v ? new Date(v).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' }) : '-'
    const fmtMoney = (v) => Number(v || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    const breakdown = getPaymentBreakdown(payment)
    const totalPaid = getPaymentAmount(payment)
    const periodLabel = payment.fees ? `งวด ${formatFeePeriodLabel(payment.fees)}` : 'รับชำระทั่วไป'
    const paymentType = getPaymentTypeLabel(payment)
    const receiptDocTitle = paymentType === 'ค่าส่วนกลาง' ? 'ใบเสร็จรับเงินค่าส่วนกลาง' : 'ใบเสร็จรับเงินค่าอื่นๆ'
    const renderRows = () => {
      if (breakdown.length > 0) {
        return breakdown.map((item, idx) => `
          <tr>
            <td class="c">${idx + 1}</td>
            <td>${item.label}</td>
            <td class="r">${fmtMoney(item.amount)}</td>
          </tr>
        `).join('')
      }
      return `
        <tr>
          <td class="c">1</td>
          <td>${paymentType} ${periodLabel}</td>
          <td class="r">${fmtMoney(totalPaid)}</td>
        </tr>
      `
    }
    const renderSheet = (copyLabel) => `
      <div class="sheet">
        <div class="head">
          <div class="brand">
            ${logoSrc ? `<div class="logo-wrap"><img src="${logoSrc}" alt="logo" /></div>` : ''}
            <div>
              <div class="doc">${receiptDocTitle}</div>
              <div class="village">${setup.villageName || 'The Greenfield'}</div>
              <div class="sub">${setup.address || '-'}</div>
            </div>
          </div>
          <div class="doc-meta">
            <div><span>เลขที่ใบเสร็จ:</span> <strong>${receiptNo}</strong></div>
            <div><span>วันที่รับชำระ:</span> <strong>${fmtDate(payment.paid_at)}</strong></div>
            <div><span>วันที่อนุมัติ:</span> <strong>${fmtDate(payment.verified_at)}</strong></div>
            <div class="copy-mark-row"><div class="copy-mark">${copyLabel}</div></div>
          </div>
        </div>
        <section class="box">
          <div class="grid">
            <div><span>บ้านเลขที่</span><strong>${houseNo || '-'}</strong></div>
            <div><span>ชื่อผู้ชำระ</span><strong>${ownerName}</strong></div>
            <div><span>ประเภทการชำระ</span><strong>${paymentType}</strong></div>
            <div><span>รอบใบแจ้งหนี้</span><strong>${periodLabel}</strong></div>
            <div><span>วิธีชำระ</span><strong>${formatMethod(payment.payment_method)}</strong></div>
          </div>
        </section>
        <section class="box">
          <table>
            <thead>
              <tr>
                <th class="c" style="width:56px;">ลำดับ</th>
                <th>รายการ</th>
                <th class="r" style="width:170px;">ยอดชำระ (บาท)</th>
              </tr>
            </thead>
            <tbody>${renderRows()}</tbody>
            <tfoot>
              <tr>
                <td colspan="2" class="r"><strong>รวมยอดชำระ</strong></td>
                <td class="r"><strong>${fmtMoney(totalPaid)}</strong></td>
              </tr>
            </tfoot>
          </table>
          <div class="amount-text">(${toThaiBahtText(totalPaid)})</div>
        </section>
        <section class="foot">
          <div class="note">
            ออกใบเสร็จหลังจากตรวจสอบการชำระเรียบร้อยแล้ว<br/>
            บัญชีอ้างอิง ${setup.bankAccountName || '-'} ${setup.bankAccountNo || ''}
          </div>
          <div class="sign-wrap">
            ${setup.juristicSignatureUrl ? `<img src="${setup.juristicSignatureUrl}" alt="signature" />` : ''}
            <div class="sign-line"></div>
            <div>ผู้ตรวจสอบ / ผู้ออกใบเสร็จ</div>
          </div>
        </section>
      </div>
    `
    return `
      <html>
        <head>
          <title>${receiptDocTitle} ${receiptNo}</title>
          <link rel="preconnect" href="https://fonts.googleapis.com">
          <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
          <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;500;700&display=swap" rel="stylesheet">
          <style>${PRINT_SHARED_CSS}</style>
        </head>
        <body>
          ${renderSheet('ต้นฉบับ')}
          ${renderSheet('สำเนา')}
        </body>
      </html>
    `
  }

  function sanitizeFileBaseName(input, fallback = 'document') {
    const safe = String(input || '')
      .trim()
      .replace(/[^\w\-.]+/g, '-')
      .replace(/-{2,}/g, '-')
      .replace(/^-+|-+$/g, '')
    return safe || fallback
  }

  function openPrintPreviewModal({ html, title, fileBase }) {
    setPrintPreviewHtml(html)
    setPrintPreviewTitle(title || 'เอกสารสำหรับพิมพ์')
    setPrintPreviewFileBase(sanitizeFileBaseName(fileBase, 'document'))
    setShowPrintPreviewModal(true)
  }

  function closePrintPreviewModal() {
    if (printPreviewExporting) return
    setShowPrintPreviewModal(false)
    setPrintPreviewHtml('')
    setPrintPreviewTitle('เอกสารสำหรับพิมพ์')
    setPrintPreviewFileBase('document')
  }

  function handlePrintFromPreview() {
    const frameWindow = printPreviewIframeRef.current?.contentWindow
    if (!frameWindow) {
      showSwal({ icon: 'warning', title: 'ยังไม่พร้อมพิมพ์', text: 'กรุณารอสักครู่แล้วลองอีกครั้ง' })
      return
    }
    frameWindow.focus()
    frameWindow.print()
  }

  async function capturePrintPreviewSheets() {
    const html = String(printPreviewHtml || '').trim()
    if (!html) throw new Error('ไม่พบเอกสารสำหรับดาวน์โหลด')

    const host = document.createElement('iframe')
    host.setAttribute('aria-hidden', 'true')
    host.style.position = 'fixed'
    host.style.left = '-99999px'
    host.style.top = '-99999px'
    host.style.width = '820px'
    host.style.height = '1200px'
    host.style.visibility = 'hidden'
    host.style.pointerEvents = 'none'

    document.body.appendChild(host)

    try {
      await new Promise((resolve, reject) => {
        host.onload = () => resolve()
        host.onerror = () => reject(new Error('โหลดเอกสารไม่สำเร็จ'))
        host.srcdoc = html
      })

      const doc = host.contentDocument
      if (!doc) throw new Error('ไม่สามารถเข้าถึงเอกสารสำหรับดาวน์โหลด')
      if (doc.fonts?.ready) {
        await doc.fonts.ready.catch(() => {})
      }

      const sheets = Array.from(doc.querySelectorAll('.sheet'))
      if (sheets.length === 0) throw new Error('ไม่พบหน้าสำหรับดาวน์โหลด')

      const canvases = []
      for (const sheet of sheets) {
        const rect = sheet.getBoundingClientRect()
        const width = Math.max(794, Math.ceil(rect.width || 794))
        const height = Math.max(1123, Math.ceil(rect.height || 1123))
        const canvas = await html2canvas(sheet, {
          scale: 2,
          useCORS: true,
          backgroundColor: '#ffffff',
          width,
          height,
          windowWidth: width,
          windowHeight: height,
          scrollX: 0,
          scrollY: 0,
        })
        canvases.push(canvas)
      }

      return canvases
    } finally {
      host.remove()
    }
  }

  async function downloadPreviewAsPdf() {
    if (printPreviewExporting) return
    try {
      setPrintPreviewExporting(true)
      const canvases = await capturePrintPreviewSheets()
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
      canvases.forEach((canvas, index) => {
        if (index > 0) pdf.addPage()
        const imgData = canvas.toDataURL('image/jpeg', 0.95)
        pdf.addImage(imgData, 'JPEG', 0, 0, 210, 297)
      })
      pdf.save(`${printPreviewFileBase}.pdf`)
    } catch (error) {
      showSwal({ icon: 'error', title: 'ดาวน์โหลด PDF ไม่สำเร็จ', text: error.message || 'โปรดลองอีกครั้ง' })
    } finally {
      setPrintPreviewExporting(false)
    }
  }

  async function downloadPreviewAsImage() {
    if (printPreviewExporting) return
    try {
      setPrintPreviewExporting(true)
      const canvases = await capturePrintPreviewSheets()
      canvases.forEach((canvas, index) => {
        const anchor = document.createElement('a')
        const suffix = canvases.length > 1 ? `-${index + 1}` : ''
        anchor.href = canvas.toDataURL('image/png')
        anchor.download = `${printPreviewFileBase}${suffix}.png`
        document.body.appendChild(anchor)
        anchor.click()
        anchor.remove()
      })
    } catch (error) {
      showSwal({ icon: 'error', title: 'ดาวน์โหลดรูปภาพไม่สำเร็จ', text: error.message || 'โปรดลองอีกครั้ง' })
    } finally {
      setPrintPreviewExporting(false)
    }
  }

  function handlePrintInvoice(fee) {
    const invoiceNo = `INV-${String(fee?.year || '').slice(-2)}-${String(fee?.id || '').slice(0, 8).toUpperCase()}`
    const html = buildResidentInvoiceHtml(fee)
    openPrintPreviewModal({
      html,
      title: `ใบแจ้งหนี้ ${invoiceNo}`,
      fileBase: invoiceNo,
    })
  }

  function handlePrintReceipt(payment) {
    const receiptNo = payment?.receipt_no || `REC-${String(payment?.id || '').slice(0, 8).toUpperCase()}`
    const html = buildResidentReceiptHtml(payment)
    openPrintPreviewModal({
      html,
      title: `ใบเสร็จ ${receiptNo}`,
      fileBase: receiptNo,
    })
  }

  const unresolvedFees = fees.filter((f) => f.status === 'unpaid' || f.status === 'overdue')
  const overdueAmount = unresolvedFees.reduce((sum, f) => sum + Number(f.total_amount || 0), 0)
  const nextDueFee = [...unresolvedFees].sort((left, right) => new Date(left.due_date || 0) - new Date(right.due_date || 0))[0] || null
  const approvedPaymentCount = payments.filter((row) => row.verified_at && !getRejectedReason(row.note)).length
  const feeStatusSummary = getFeeStatusSummary()
  const feeYearOptions = [...new Set(allFees.map((row) => row.year).filter(Boolean))].sort((a, b) => b - a)
  const inProgressViolations = violations.filter((v) => v.status === 'pending' || v.status === 'in_progress')
  const latestViolation = violations[0] || null
  const pendingIssues = issues.filter((i) => i.status === 'pending' || i.status === 'in_progress')
  const filteredNotifViolations = violations.filter((violation) => isViolationWithinDateFilter(violation, notifDateFilter))
  const latestAnnouncements = announcements.slice(0, 3)
  const houseAreaSqw = Number(houseDetail?.area_sqw ?? houseDetail?.area ?? 0)
  const houseAnnualFee = Number(houseDetail?.annual_fee || (houseAreaSqw > 0 ? houseAreaSqw * 12 * Number(houseDetail?.fee_rate || 0) : 0))
  const houseVehicles = vehicles.filter((vehicle) => String(vehicle.house_id) === String(profile?.house_id))
  const houseAddressText = [houseDetail?.address, houseDetail?.soi ? `ซอย ${houseDetail.soi}` : '', houseDetail?.house_no ? `บ้าน ${houseDetail.house_no}` : '']
    .filter(Boolean)
    .join(' · ')

  const filteredTechs = technicians.filter((t) => {
    if (t.status && t.status !== 'approved' && t.status !== 'active') return false
    if (!techSearch) return true
    const kw = techSearch.toLowerCase()
    const skills = (t.technician_services || []).map((s) => s.skill).join(' ')
    return [t.name, t.phone, skills].join(' ').toLowerCase().includes(kw)
  })

  const residentVisibleMarket = marketplace.filter((m) => {
    const isPublic = m.status === 'approved' || m.status === 'active'
    const isOwnPending = String(m.house_id || '') === String(profile?.house_id || '') && m.status === 'pending'
    return isPublic || isOwnPending
  })

  const filteredMarket = residentVisibleMarket.filter((m) => {
    if (marketFilter !== 'all' && m.listing_type !== marketFilter) return false
    if (!marketSearch) return true
    const kw = marketSearch.toLowerCase()
    return [m.title, m.category, m.contact].join(' ').toLowerCase().includes(kw)
  })

  const myPendingMarketCount = residentVisibleMarket.filter((m) => String(m.house_id || '') === String(profile?.house_id || '') && m.status === 'pending').length
  const villageRuleDocs = ruleDocs.filter((item) => item.category === 'village')
  const livingRuleDocs = ruleDocs.filter((item) => item.category === 'living')

  const titleFn = SECTION_TITLE[activeSection] || SECTION_TITLE.dash
  const titleData = titleFn(houseNo)

  function navTo(key) {
    setActiveSection(key)
    setSidebarOpen(false)
  }

  function openTechModal(item) {
    setSelectedTech(item)
  }

  function closeTechModal() {
    setSelectedTech(null)
  }

  function openMarketPostModal() {
    setMarketPostForm({
      title: '',
      detail: '',
      category: '',
      listing_type: 'sell',
      price: '',
      contact: profile?.phone || '',
      status: 'pending',
    })
    marketPostAttachments.forEach((item) => {
      if (item?.url && String(item.url).startsWith('blob:')) URL.revokeObjectURL(item.url)
    })
    setMarketPostAttachments([])
    setShowMarketPostModal(true)
  }

  function closeMarketPostModal() {
    if (marketPosting) return
    marketPostAttachments.forEach((item) => {
      if (item?.url && String(item.url).startsWith('blob:')) URL.revokeObjectURL(item.url)
    })
    setMarketPostAttachments([])
    setShowMarketPostModal(false)
  }

  async function handleMarketPostAttachFiles(e) {
    const files = Array.from(e.target.files || [])
    e.target.value = ''
    if (files.length === 0) return

    const remainingSlots = MARKETPLACE_MAX_ATTACHMENTS - marketPostAttachments.length
    if (remainingSlots <= 0) {
      await showSwal({ icon: 'warning', title: 'แนบรูปได้สูงสุด 2 รูป' })
      return
    }
    const filesToProcess = files.slice(0, remainingSlots)
    if (files.length > remainingSlots) {
      await showSwal({ icon: 'info', title: `รับได้แค่ ${remainingSlots} รูป`, text: 'ระบบจะใช้เฉพาะรูปชุดแรก' })
    }

    try {
      const prepared = []
      const startIndex = marketPostAttachments.length + 1
      for (let i = 0; i < filesToProcess.length; i += 1) {
        const resized = await resizeIssueImageToLimit(filesToProcess[i], startIndex + i)
        prepared.push({ source: 'new', name: resized.name, file: resized, url: URL.createObjectURL(resized) })
      }
      setMarketPostAttachments((cur) => [...cur, ...prepared])
    } catch (error) {
      await showSwal({ icon: 'error', title: 'ประมวลผลรูปไม่สำเร็จ', text: error.message })
    }
  }

  function handleMarketPostRemoveAttachment(target) {
    setMarketPostAttachments((cur) => {
      const next = cur.filter((item) => item !== target)
      if (target?.url && String(target.url).startsWith('blob:')) URL.revokeObjectURL(target.url)
      return next
    })
  }

  async function submitMarketPost(e) {
    e.preventDefault()
    if (!profile?.house_id) { await showSwal({ icon: 'warning', title: 'ไม่พบบ้านของผู้ใช้งาน' }); return }
    if (!marketPostForm.title.trim()) { await showSwal({ icon: 'warning', title: 'กรุณากรอกชื่อสินค้า/รายการ' }); return }

    try {
      setMarketPosting(true)
      const created = await createMarketplaceItem({
        house_id: profile.house_id,
        title: marketPostForm.title,
        detail: marketPostForm.detail,
        category: marketPostForm.category,
        listing_type: marketPostForm.listing_type,
        price: Number(String(marketPostForm.price || '').replace(/,/g, '')) || 0,
        contact: marketPostForm.contact,
        image_url: null,
        status: 'pending',
      })

      const newFiles = marketPostAttachments.filter((item) => item.source === 'new' && item.file).map((item) => item.file)
      if (newFiles.length > 0) {
        const uploaded = await uploadMarketplaceImages(created.id, newFiles)
        const firstUrl = uploaded[0]?.url || null
        if (firstUrl) await updateMarketplaceItem(created.id, { image_url: firstUrl })
      }

      await showSwal({
        icon: 'success',
        title: 'ส่งโพสต์เรียบร้อย',
        text: 'รายการของคุณรอการอนุมัติจากนิติ ก่อนแสดงเป็นโพสต์สาธารณะ',
      })

      closeMarketPostModal()
      const latest = await listMarketplace({ status: 'all' })
      setMarketplace(latest)
    } catch (error) {
      await showSwal({ icon: 'error', title: 'ส่งโพสต์ไม่สำเร็จ', text: error.message })
    } finally {
      setMarketPosting(false)
    }
  }

  async function openMarketDetailModal(item) {
    setMarketDetailItem(item)
    setMarketDetailImages(item.image_url ? [{ url: item.image_url, name: 'ภาพหลัก' }] : [])
    setMarketDetailIndex(0)
    setShowMarketDetailModal(true)
    try {
      setMarketDetailLoading(true)
      const images = await listMarketplaceImages(item.id)
      if (images.length > 0) {
        setMarketDetailImages(images)
        setMarketDetailIndex(0)
      }
    } catch {
      // Keep first image fallback from row data.
    } finally {
      setMarketDetailLoading(false)
    }
  }

  function closeMarketDetailModal() {
    setShowMarketDetailModal(false)
    setMarketDetailItem(null)
    setMarketDetailImages([])
    setMarketDetailIndex(0)
    setMarketDetailLoading(false)
  }

  function openPdfViewer(url, title = 'เอกสาร PDF') {
    const target = String(url || '').trim()
    if (!target) {
      showSwal({ icon: 'warning', title: 'ไม่พบไฟล์ PDF' })
      return
    }
    setPdfViewerTitle(title)
    setPdfViewerUrl(target)
    setShowPdfViewerModal(true)
  }

  function closePdfViewer() {
    setShowPdfViewerModal(false)
    setPdfViewerUrl('')
    setPdfViewerTitle('เอกสาร PDF')
  }

  function openResidentAttachment(url, title = 'เอกสารแนบ') {
    const target = String(url || '').trim()
    if (!target) {
      showSwal({ icon: 'warning', title: 'ไม่พบไฟล์แนบ' })
      return
    }

    if (isImageLink(target)) {
      showSwal({ imageUrl: target, imageAlt: title, showConfirmButton: false, showCloseButton: true, width: 'auto', background: '#0f172a' })
      return
    }

    openPdfViewer(target, title)
  }

  function isSectionCurrent(section) {
    if (!section) return false
    return section.items.some((item) => item.key === activeSection)
  }

  function toggleSection(sectionName) {
    setSectionOpen((prev) => ({ ...prev, [sectionName]: !prev[sectionName] }))
  }

  const searchKeyword = menuSearch.trim().toLowerCase()
  const visibleNavSections = NAV_GROUPS
    .map((section) => {
      if (!searchKeyword) return section
      const filtered = section.items.filter((item) => {
        const haystack = `${item.label} ${item.key}`.toLowerCase()
        return haystack.includes(searchKeyword)
      })
      if (filtered.length === 0) return null
      return { ...section, items: filtered }
    })
    .filter(Boolean)

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
    setResidentNote('')
    if (item.status === 'resolved') setResidentViolationStatus('resolved')
    else setResidentViolationStatus('in_progress')
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
    setResidentViolationStatus('in_progress')
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
    if (editingViolation.status === 'closed') { await showSwal({ icon: 'info', title: 'รายการนี้ปิดแล้ว', text: 'ไม่สามารถอัปเดตเพิ่มเติมได้' }); return }
    if (!residentNote.trim()) { await showSwal({ icon: 'warning', title: 'กรุณากรอกข้อความอัปเดต' }); return }
    try {
      setSaving(true)
      await residentUpdateViolation(editingViolation.id, { status: residentViolationStatus, resident_note: residentNote })
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
      const created = await createIssue({ house_id: profile?.house_id, title: issueForm.title, detail: issueForm.detail, category: issueForm.category, status: 'pending' })
      const newFiles = issueAttachments.filter((item) => item.source === 'new' && item.file).map((item) => item.file)
      if (newFiles.length > 0) {
        const uploaded = await uploadIssueImages(created.id, newFiles)
        if (uploaded.length > 0) {
          await updateIssue(created.id, { image_url: uploaded[0].url || null })
        }
      }
      await showSwal({ icon: 'success', title: 'ส่งคำร้องแล้ว', text: 'นิติจะดำเนินการและแจ้งกลับ', timer: 1600, showConfirmButton: false })
      issueAttachments.forEach((item) => {
        if (item.source === 'new' && item.url) URL.revokeObjectURL(item.url)
      })
      setIssueAttachments([])
      setIssueForm({ title: '', detail: '', category: 'ทั่วไป' })
      setShowIssueForm(false)
      const all = await listIssues()
      setIssues(all.filter((i) => i.house_id === profile.house_id))
    } catch (error) {
      await showSwal({ icon: 'error', title: 'ส่งคำร้องไม่สำเร็จ', text: error.message })
    } finally {
      setIssueSubmitting(false)
    }
  }

  function formatIssueFileName(index) {
    const now = new Date()
    const date = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`
    const time = `${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`
    return `ISS_RES_${date}_${time}_${String(index).padStart(3, '0')}.jpg`
  }

  async function resizeIssueImageToLimit(file, sequence) {
    const image = await readImageElement(file)
    const canvas = document.createElement('canvas')
    const context = canvas.getContext('2d')
    if (!context) throw new Error('ไม่สามารถประมวลผลรูปภาพได้')

    let width = image.width
    let height = image.height
    const maxDimension = 1600
    if (width > maxDimension || height > maxDimension) {
      const scale = Math.min(maxDimension / width, maxDimension / height)
      width = Math.round(width * scale)
      height = Math.round(height * scale)
    }
    canvas.width = width
    canvas.height = height
    context.drawImage(image, 0, 0, width, height)

    let quality = 0.9
    let blob = await canvasToBlob(canvas, quality)
    while (blob && blob.size > MAX_IMAGE_TARGET_BYTES && quality > 0.25) {
      quality -= 0.08
      blob = await canvasToBlob(canvas, quality)
    }

    while (blob && blob.size > MAX_IMAGE_TARGET_BYTES && (canvas.width > 480 || canvas.height > 480)) {
      canvas.width = Math.round(canvas.width * 0.9)
      canvas.height = Math.round(canvas.height * 0.9)
      context.clearRect(0, 0, canvas.width, canvas.height)
      context.drawImage(image, 0, 0, canvas.width, canvas.height)
      quality = 0.82
      blob = await canvasToBlob(canvas, quality)
      while (blob && blob.size > MAX_IMAGE_TARGET_BYTES && quality > 0.25) {
        quality -= 0.08
        blob = await canvasToBlob(canvas, quality)
      }
    }

    if (!blob || blob.size > MAX_IMAGE_SIZE_BYTES) {
      throw new Error(`ไม่สามารถย่อรูป ${file.name} ได้`)
    }

    return new File([blob], formatIssueFileName(sequence), { type: 'image/jpeg' })
  }

  async function handleIssueAttachFiles(event) {
    const selectedFiles = Array.from(event.target.files || [])
    event.target.value = ''
    if (selectedFiles.length === 0) return

    const remainingSlots = MAX_ATTACHMENTS - issueAttachments.length
    if (remainingSlots <= 0) {
      await showSwal({ icon: 'warning', title: 'แนบรูปได้สูงสุด 5 รูป' })
      return
    }

    const filesToProcess = selectedFiles.slice(0, remainingSlots)
    if (selectedFiles.length > remainingSlots) {
      await showSwal({ icon: 'info', title: `รับได้แค่ ${remainingSlots} รูป` })
    }

    try {
      const startIndex = issueAttachments.length + 1
      const prepared = []
      for (let i = 0; i < filesToProcess.length; i += 1) {
        const resizedFile = await resizeIssueImageToLimit(filesToProcess[i], startIndex + i)
        prepared.push({
          source: 'new',
          name: resizedFile.name,
          file: resizedFile,
          url: URL.createObjectURL(resizedFile),
        })
      }
      setIssueAttachments((cur) => [...cur, ...prepared])
    } catch (error) {
      await showSwal({ icon: 'error', title: 'แนบรูปไม่สำเร็จ', text: error.message })
    }
  }

  function handleIssueRemoveAttachment(target) {
    setIssueAttachments((cur) => {
      const next = cur.filter((item) => item !== target)
      if (target.source === 'new' && target.url) URL.revokeObjectURL(target.url)
      return next
    })
  }

  async function handleResidentRateIssue(issue) {
    const result = await showSwal({
      title: 'ให้คะแนนการแก้ไขปัญหา',
      html: `
        <select id="resident-issue-rating" class="swal2-input" style="margin: 0 0 10px 0; width: 100%;">
          <option value="">เลือกคะแนน</option>
          <option value="1">1 - ต้องปรับปรุง</option>
          <option value="2">2 - พอใจน้อย</option>
          <option value="3">3 - ปานกลาง</option>
          <option value="4">4 - ดี</option>
          <option value="5">5 - ดีมาก</option>
        </select>
        <input id="resident-issue-rating-note" class="swal2-input" placeholder="เหตุผลประกอบคะแนน (ไม่บังคับ)">
      `,
      showCancelButton: true,
      confirmButtonText: 'ให้คะแนนและปิดงาน',
      cancelButtonText: 'ยกเลิก',
      preConfirm: () => {
        const ratingEl = document.getElementById('resident-issue-rating')
        const noteEl = document.getElementById('resident-issue-rating-note')
        const rating = Number(ratingEl?.value || 0)
        if (!rating || rating < 1 || rating > 5) {
          Swal.showValidationMessage('กรุณาเลือกคะแนน 1-5')
          return null
        }
        return {
          rating,
          rating_note: String(noteEl?.value || '').trim() || null,
        }
      },
    })

    if (!result.isConfirmed || !result.value) return

    try {
      await updateIssue(issue.id, {
        rating: result.value.rating,
        rating_note: result.value.rating_note,
        status: 'closed',
      })
      await showSwal({ icon: 'success', title: 'ให้คะแนนเรียบร้อย', text: 'ระบบปิดงานให้แล้ว', timer: 1400, showConfirmButton: false })
      const all = await listIssues()
      setIssues(all.filter((i) => i.house_id === profile.house_id))
    } catch (error) {
      await showSwal({ icon: 'error', title: 'บันทึกคะแนนไม่สำเร็จ', text: error.message })
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

  // ── Vehicle request handlers ────────────────────────────────────────────────

  function openAddVehicleRequest() {
    setVehicleReqMode('add')
    setVehicleReqTarget(null)
    setVehicleReqForm(EMPTY_VR_FORM)
    setVehicleReqRemovedPaths([])
    setVehicleReqAttachments([])
    setShowVehicleReqModal(true)
  }

  async function loadVehicleReqAttachments({ vehicleId = null, requestId = null, includeVehicleImages = false }) {
    const attachments = []

    if (includeVehicleImages && vehicleId) {
      const vehicleImages = await listVehicleImages(vehicleId)
      attachments.push(...vehicleImages.map((img) => ({
        source: 'existing-vehicle',
        name: img.name,
        path: img.path,
        url: img.url,
      })))
    }

    if (requestId) {
      const requestImages = await listVehicleRequestImages(requestId)
      attachments.push(...requestImages.map((img) => ({
        source: 'existing-request',
        name: img.name,
        path: img.path,
        url: img.url,
      })))
    }

    setVehicleReqAttachments(attachments)
    return attachments
  }

  function findApprovedRequestImageFallback(vehicle) {
    return [...vehicleRequests]
      .filter((req) => req.status === 'approved')
      .filter((req) => {
        if (req.vehicle_id && String(req.vehicle_id) === String(vehicle.id)) return true
        return req.license_plate === vehicle.license_plate
          && req.province === vehicle.province
          && req.vehicle_type === vehicle.vehicle_type
      })
      .sort((left, right) => new Date(right.created_at) - new Date(left.created_at))[0] || null
  }

  async function openEditVehicleRequest(vehicle) {
    const baseColor = COLOR_OPTIONS.includes(vehicle.color || '') ? vehicle.color : 'อื่นๆ'
    const [prefix = '', number = ''] = String(vehicle.license_plate || '').split('-')
    setVehicleReqMode('edit')
    setVehicleReqTarget(vehicle)
    setVehicleReqForm({
      ...EMPTY_VR_FORM,
      license_plate_prefix: prefix.trim(),
      license_plate_number: number.trim(),
      province: vehicle.province || 'กรุงเทพมหานคร',
      vehicle_type: vehicle.vehicle_type || 'รถยนต์',
      brand: vehicle.brand || 'Toyota',
      brand_other: '',
      model: vehicle.model || '',
      color: baseColor,
      color_other: baseColor === 'อื่นๆ' ? (vehicle.color || '') : '',
      vehicle_status: vehicle.status === 'active' ? 'active' : 'inactive',
      parking_location: vehicle.parking_location || 'ในบ้าน',
      parking_lock_no: vehicle.parking_lock_no || '',
      parking_fee: String(vehicle.parking_fee || '0'),
      note: '',
    })
    setVehicleReqRemovedPaths([])
    setVehicleReqAttachments([])
    setShowVehicleReqModal(true)
    try {
      const attachments = await loadVehicleReqAttachments({ vehicleId: vehicle.id, includeVehicleImages: true })
      if (attachments.length === 0) {
        const fallbackRequest = findApprovedRequestImageFallback(vehicle)
        if (fallbackRequest) {
          await loadVehicleReqAttachments({ requestId: fallbackRequest.id })
        }
      }
    } catch { /* no existing images or error — leave empty */ }
  }

  function closeVehicleReqModal() {
    if (vehicleReqSaving) return
    setShowVehicleReqModal(false)
    setVehicleReqTarget(null)
    setVehicleReqForm(EMPTY_VR_FORM)
    setVehicleReqAttachments([])
      setVehicleReqRemovedPaths([])
    }

  function handleVehicleReqFormChange(e) {
    const { name, value } = e.target
    setVehicleReqForm((prev) => {
      const next = { ...prev, [name]: value }
      if (name === 'brand' && value !== 'อื่นๆ') next.brand_other = ''
      if (name === 'color' && value !== 'อื่นๆ') next.color_other = ''
      if (name === 'parking_location' && value !== 'ส่วนกลาง') next.parking_lock_no = ''
      return next
    })
  }

  async function handleVehicleReqAttachFiles(event) {
    const selectedFiles = Array.from(event.target.files || [])
    event.target.value = ''
    if (selectedFiles.length === 0) return
    const remaining = MAX_ATTACHMENTS - vehicleReqAttachments.length
    if (remaining <= 0) { await showSwal({ icon: 'warning', title: 'แนบรูปได้สูงสุด 5 รูป' }); return }
    const toProcess = selectedFiles.slice(0, remaining)
    try {
      const startIdx = vehicleReqAttachments.length + 1
      const prepared = []
      for (let i = 0; i < toProcess.length; i++) {
        const resized = await resizeImageToLimit(toProcess[i], startIdx + i)
        prepared.push({ source: 'new', name: resized.name, file: resized, url: URL.createObjectURL(resized) })
      }
      setVehicleReqAttachments((cur) => [...cur, ...prepared])
    } catch (error) {
      await showSwal({ icon: 'error', title: 'แนบรูปไม่สำเร็จ', text: error.message })
    }
  }

  function handleRemoveVehicleReqAttachment(target) {
    setVehicleReqAttachments((cur) => {
      const next = cur.filter((item) => item !== target)
      if (target.source === 'new' && target.url) URL.revokeObjectURL(target.url)
      if ((target.source === 'existing-vehicle' || target.source === 'existing-request') && target.path) {
        setVehicleReqRemovedPaths((prev) => (prev.includes(target.path) ? prev : [...prev, target.path]))
      }
      return next
    })
  }

  async function handleSubmitVehicleRequest(e) {
    e.preventDefault()
    if (!profile?.house_id) return

    const licensePlate = `${vehicleReqForm.license_plate_prefix.trim()}-${vehicleReqForm.license_plate_number.trim()}`
    if (!vehicleReqForm.license_plate_prefix.trim() || !vehicleReqForm.license_plate_number.trim()) {
      await showSwal({ icon: 'warning', title: 'กรุณากรอกทะเบียนรถ' }); return
    }
    if (vehicleReqMode === 'add' && vehicleReqForm.brand === 'อื่นๆ' && !vehicleReqForm.brand_other.trim()) {
      await showSwal({ icon: 'warning', title: 'กรุณากรอกยี่ห้อรถ' }); return
    }
    if (vehicleReqMode === 'add' && vehicleReqAttachments.length === 0) {
      await showSwal({ icon: 'warning', title: 'กรุณาแนบรูปรถอย่างน้อย 1 รูป' }); return
    }

    try {
      setVehicleReqSaving(true)
      const brandName = vehicleReqMode === 'add'
        ? (vehicleReqForm.brand === 'อื่นๆ' ? vehicleReqForm.brand_other : vehicleReqForm.brand)
        : vehicleReqTarget?.brand
      const colorName = vehicleReqForm.color === 'อื่นๆ' ? vehicleReqForm.color_other : vehicleReqForm.color

      const payload = {
        house_id: profile.house_id,
        vehicle_id: vehicleReqMode === 'edit' ? (vehicleReqTarget?.id || null) : null,
        request_type: vehicleReqMode,
        license_plate: licensePlate,
        province: vehicleReqForm.province,
        brand: brandName,
        model: vehicleReqMode === 'add' ? vehicleReqForm.model : vehicleReqTarget?.model,
        color: colorName,
        vehicle_type: vehicleReqMode === 'add' ? vehicleReqForm.vehicle_type : vehicleReqTarget?.vehicle_type,
        vehicle_status: vehicleReqForm.vehicle_status,
        parking_location: vehicleReqForm.parking_location,
        parking_lock_no: null,
        parking_fee: Number(String(vehicleReqForm.parking_fee).replace(/,/g, '')) || 0,
        note: vehicleReqForm.note,
        created_by_id: profile.id,
      }

      const req = await createVehicleRequest(payload)

      const retainedRequestImageUrls = vehicleReqAttachments
        .filter((a) => a.source === 'existing-request' && a.url)
        .map((a) => a.url)
      const newFiles = vehicleReqAttachments.filter((a) => a.source === 'new' && a.file).map((a) => a.file)
      let uploadedUrls = []
      if (newFiles.length > 0) {
        uploadedUrls = await uploadVehicleRequestImages(req.id, newFiles)
      }

      const imageUrls = [...retainedRequestImageUrls, ...uploadedUrls]
      if (imageUrls.length > 0) {
        await updateVehicleRequestImageUrls(req.id, imageUrls)
      }

      if (vehicleReqRemovedPaths.length > 0) {
        const vehiclePaths = vehicleReqRemovedPaths.filter((path) => !String(path || '').startsWith('requests/'))
        const requestPaths = vehicleReqRemovedPaths.filter((path) => String(path || '').startsWith('requests/'))
        if (vehiclePaths.length > 0) await deleteVehicleImagesByPaths(vehiclePaths).catch(() => {})
        if (requestPaths.length > 0) await deleteVehicleRequestImagesByPaths(requestPaths).catch(() => {})
      }

      await showSwal({ icon: 'success', title: vehicleReqMode === 'add' ? 'ส่งคำขอเพิ่มรถแล้ว' : 'ส่งคำขอแก้ไขรถแล้ว', text: 'รอนิติอนุมัติ', timer: 1600, showConfirmButton: false })
      closeVehicleReqModal()
      const reqs = await listVehicleRequests({ houseId: profile.house_id })
      setVehicleRequests(reqs)
    } catch (error) {
      await showSwal({ icon: 'error', title: 'ส่งคำขอไม่สำเร็จ', text: error.message })
    } finally {
      setVehicleReqSaving(false)
    }
  }

  async function cancelVehicleReq(requestId) {
    const { isConfirmed } = await showSwal({
      icon: 'warning', title: 'ยกเลิกคำขอ?', text: 'เมื่อยกเลิกแล้วจะแก้ไขไม่ได้อีก',
      showCancelButton: true, confirmButtonText: 'ยืนยัน', cancelButtonText: 'ไม่',
    })
    if (!isConfirmed) return
    try {
      await cancelVehicleRequest(requestId)
      await showSwal({ icon: 'success', title: 'ยกเลิกแล้ว', timer: 1200, showConfirmButton: false })
      const reqs = await listVehicleRequests({ houseId: profile.house_id })
      setVehicleRequests(reqs)
    } catch (error) {
      await showSwal({ icon: 'error', title: 'ไม่สำเร็จ', text: error.message })
    }
  }

  async function openRejectedVehicleReq(req) {
    const [prefix = '', number = ''] = String(req.license_plate || '').split('-')

    if (req.request_type === 'add') {
      const baseBrand = BRAND_OPTIONS.includes(req.brand || '') ? req.brand : 'อื่นๆ'
      const baseColor = COLOR_OPTIONS.includes(req.color || '') ? req.color : 'อื่นๆ'
      setVehicleReqMode('add')
      setVehicleReqTarget(null)
      setVehicleReqForm({
        ...EMPTY_VR_FORM,
        license_plate_prefix: prefix.trim(),
        license_plate_number: number.trim(),
        province: req.province || 'กรุงเทพมหานคร',
        vehicle_type: req.vehicle_type || 'รถยนต์',
        brand: baseBrand,
        brand_other: baseBrand === 'อื่นๆ' ? (req.brand || '') : '',
        model: req.model || '',
        color: baseColor,
        color_other: baseColor === 'อื่นๆ' ? (req.color || '') : '',
        vehicle_status: req.vehicle_status || 'active',
        parking_location: req.parking_location || 'ในบ้าน',
        parking_lock_no: req.parking_lock_no || '',
        parking_fee: String(req.parking_fee || '0'),
        note: req.note || '',
      })
      setVehicleReqRemovedPaths([])
      setVehicleReqAttachments([])
      setShowVehicleReqModal(true)
      try {
        await loadVehicleReqAttachments({ requestId: req.id })
      } catch { /* ignore image load errors */ }
      return
    }

    const fallbackVehicle = {
      id: req.vehicle_id,
      license_plate: req.license_plate || '',
      province: req.province || '',
      brand: req.brand || '',
      model: req.model || '',
      color: req.color || '',
      vehicle_type: req.vehicle_type || 'รถยนต์',
      status: req.vehicle_status || 'active',
      parking_location: req.parking_location || 'ในบ้าน',
      parking_lock_no: req.parking_lock_no || '',
      parking_fee: req.parking_fee || 0,
    }
    const target = houseVehicles.find((v) => String(v.id) === String(req.vehicle_id)) || fallbackVehicle
    setVehicleReqMode('edit')
    setVehicleReqTarget(target)
    const baseColor = COLOR_OPTIONS.includes(req.color || '') ? req.color : 'อื่นๆ'
    setVehicleReqForm({
      ...EMPTY_VR_FORM,
      license_plate_prefix: prefix.trim(),
      license_plate_number: number.trim(),
      province: req.province || 'กรุงเทพมหานคร',
      vehicle_type: target.vehicle_type || 'รถยนต์',
      brand: target.brand || 'Toyota',
      brand_other: '',
      model: target.model || '',
      color: baseColor,
      color_other: baseColor === 'อื่นๆ' ? (req.color || '') : '',
      vehicle_status: req.vehicle_status || 'active',
      parking_location: req.parking_location || 'ในบ้าน',
      parking_lock_no: req.parking_lock_no || '',
      parking_fee: String(req.parking_fee || '0'),
      note: req.note || '',
    })
    setVehicleReqRemovedPaths([])
    setVehicleReqAttachments([])
    setShowVehicleReqModal(true)
    try {
      await loadVehicleReqAttachments({ vehicleId: target.id, requestId: req.id, includeVehicleImages: true })
    } catch { /* ignore image load errors */ }
  }

  return (
    <div className="app">
      <div className={`sb-overlay ${sidebarOpen ? 'show' : ''}`} onClick={() => setSidebarOpen(false)} />

      <aside className={`sidebar ${sidebarOpen ? 'open' : ''} ${sidebarCollapsed ? 'collapsed' : ''}`}>
        <div className="sb-logo">
          <div className="sb-logo-ico sb-logo-ico-img">
            <img src={setup.loginCircleLogoUrl || setup.villageLogoUrl || villageLogo} alt="Village Logo" className="sb-logo-image" />
          </div>
          <div>
            <div className="sb-logo-name">{setup.villageName}</div>
            <div className="sb-logo-sub">Village Management {setup.version || 'v12.3'}</div>
          </div>
        </div>

        <div className="sb-search-wrap">
          <div className="sb-search-input-wrap">
            <span className="sb-search-icon">🔍</span>
            <input
              className="sb-search-input"
              type="text"
              placeholder="ค้นหาเมนู"
              value={menuSearch}
              onChange={(e) => setMenuSearch(e.target.value)}
            />
          </div>
        </div>

        <nav className="sb-nav">
          {visibleNavSections.map((group) => {
            const expanded = sidebarCollapsed || Boolean(searchKeyword) || Boolean(sectionOpen[group.section])
            return (
              <div key={group.section} className={`sb-major-group tone-${group.tone || 'default'}`}>
                <button
                  type="button"
                  className={`sb-sec sb-sec-btn tone-${group.tone || 'default'} ${isSectionCurrent(group) ? 'sec-act' : ''}`}
                  onClick={() => toggleSection(group.section)}
                  aria-expanded={expanded}
                  title={group.section}
                >
                  <span className="sb-sec-left">
                    <span className="sb-sec-ico">{group.sectionIcon || '>'}</span>
                    <span className="sb-sec-title">{group.section}</span>
                  </span>
                  <span className={`sb-sec-arrow ${expanded ? 'open' : ''}`}>▾</span>
                </button>
                {expanded && (
                  <div className="sb-submenu-wrap">
                    {group.items.map((item) => (
                      <div
                        key={item.key}
                        className={`sb-item ${activeSection === item.key ? 'act' : ''} ${group.tone === 'core' ? 'core-item' : ''}`}
                        onClick={() => navTo(item.key)}
                      >
                        <span className="sb-ico">{item.icon}</span>
                        <span className="sb-label">{item.label}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </nav>

        <div className="sb-foot">
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
          <div className="tb-title tb-title-desktop">
            {titleData.main} — <span className="hl">{titleData.sub}</span>
          </div>
          <div className="tb-title tb-title-mobile">สวัสดี บ้าน {houseNo || '-'}</div>
          <div className="tb-right">
            <span className="tb-user-name" style={{ fontSize: '13px', fontWeight: 500, color: 'var(--tx)', whiteSpace: 'nowrap', marginRight: '4px' }}>
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

          {activeSection === 'rules' && (
            <>
              <div className="ph" style={{ marginBottom: 18 }}>
                <div className="ph-in">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div className="ph-ico">📘</div>
                    <div>
                      <div className="ph-h1">กฎระเบียบ</div>
                      <div className="ph-sub">เอกสารที่นิติประกาศให้ลูกบ้านอ่าน (ไฟล์ PDF)</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="card" style={{ marginBottom: 12 }}>
                <div className="ch"><div className="ch-ico">🏘️</div><div className="ct">กฎระเบียบหมู่บ้าน ({villageRuleDocs.length} เรื่อง)</div></div>
                <div className="cb" style={{ padding: 14 }}>
                  {villageRuleDocs.length === 0 ? (
                    <div style={{ color: 'var(--mu)', textAlign: 'center', padding: '8px 0' }}>ยังไม่มีข้อมูล</div>
                  ) : villageRuleDocs.map((item) => (
                    <div key={item.id} className="ann">
                      <div className="ann-dot ad-gen" />
                      <div style={{ flex: 1 }}>
                        <div className="ann-t">เรื่องที่ {item.topic_no || '-'} {item.title}</div>
                        {item.description && <div className="ann-b">{item.description}</div>}
                        <div className="ann-d">{formatDate(item.announcement_date || item.created_at)}</div>
                      </div>
                      {item.pdf_url && (
                        <button type="button" className="btn btn-sm btn-o" style={{ whiteSpace: 'nowrap' }} onClick={() => openPdfViewer(item.pdf_url, `เรื่องที่ ${item.topic_no || '-'} ${item.title || ''}`)}>📄 อ่าน PDF</button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="card">
                <div className="ch"><div className="ch-ico">🏠</div><div className="ct">ระเบียบการอยู่อาศัย ({livingRuleDocs.length} เรื่อง)</div></div>
                <div className="cb" style={{ padding: 14 }}>
                  {livingRuleDocs.length === 0 ? (
                    <div style={{ color: 'var(--mu)', textAlign: 'center', padding: '8px 0' }}>ยังไม่มีข้อมูล</div>
                  ) : livingRuleDocs.map((item) => (
                    <div key={item.id} className="ann">
                      <div className="ann-dot ad-evt" />
                      <div style={{ flex: 1 }}>
                        <div className="ann-t">เรื่องที่ {item.topic_no || '-'} {item.title}</div>
                        {item.description && <div className="ann-b">{item.description}</div>}
                        <div className="ann-d">{formatDate(item.announcement_date || item.created_at)}</div>
                      </div>
                      {item.pdf_url && (
                        <button type="button" className="btn btn-sm btn-o" style={{ whiteSpace: 'nowrap' }} onClick={() => openPdfViewer(item.pdf_url, `เรื่องที่ ${item.topic_no || '-'} ${item.title || ''}`)}>📄 อ่าน PDF</button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

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

              {allFees.length > 0 && (
                <div className="r-chart-box">
                  <h3>💳 ประวัติการชำระค่าส่วนกลาง 5 งวดย้อนหลัง</h3>
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
                    {houseDetailLoaded ? (
                      houseDetail ? (
                      <>
                        <div className="sl">ที่อยู่</div>
                        <div className="ig">
                          <div className="ii"><div className="ik">บ้านเลขที่</div><div className="iv">{houseDetail.house_no || '-'}</div></div>
                          <div className="ii"><div className="ik">ซอย</div><div className="iv">{houseDetail.soi || '-'}</div></div>
                          <div className="ii"><div className="ik">ที่อยู่</div><div className="iv">{houseAddressText || '-'}</div></div>
                          <div className="ii"><div className="ik">พื้นที่</div><div className="iv">{houseAreaSqw > 0 ? `${formatMoney(houseAreaSqw)} ตร.ว.` : '-'}</div></div>
                          <div className="ii"><div className="ik">อัตราค่าส่วนกลาง</div><div className="iv">{houseDetail.fee_rate ? `฿${formatMoney(houseDetail.fee_rate)} / ตร.ว. / เดือน` : '-'}</div></div>
                          <div className="ii"><div className="ik">ค่าส่วนกลาง/ปี</div><div className="iv" style={{ color: 'var(--pr)', fontWeight: 800 }}>{houseAnnualFee > 0 ? `฿${formatMoney(houseAnnualFee)}` : '-'}</div></div>
                          <div className="ii"><div className="ik">สถานะ</div><div className="iv"><span className={`hs ${houseDetail.status === 'normal' ? 'hs-ok' : 'hs-lt'}`}>● {houseDetail.status === 'normal' ? 'ปกติ' : (houseDetail.status || '-')}</span></div></div>
                        </div>
                        <div className="sl" style={{ marginTop: 16 }}>ผู้อาศัย</div>
                        <div className="ig">
                          <div className="ii"><div className="ik">เจ้าของบ้าน</div><div className="iv">{houseDetail.owner_name || '-'}</div></div>
                          <div className="ii"><div className="ik">ผู้อยู่อาศัย</div><div className="iv">{houseDetail.resident_name || '-'}</div></div>
                          <div className="ii"><div className="ik">ผู้ติดต่อหลัก</div><div className="iv">{houseDetail.contact_name || houseDetail.resident_name || houseDetail.owner_name || '-'}</div></div>
                          <div className="ii"><div className="ik">เบอร์โทร</div><div className="iv">{houseDetail.phone || '-'}</div></div>
                          <div className="ii"><div className="ik">Line ID</div><div className="iv">{houseDetail.line_id || '-'}</div></div>
                          <div className="ii"><div className="ik">Email</div><div className="iv" style={{ fontSize: 12 }}>{houseDetail.email || '-'}</div></div>
                          <div className="ii"><div className="ik">ลักษณะการอยู่อาศัย</div><div className="iv">{houseDetail.house_type || '-'}</div></div>
                        </div>
                      </>
                    ) : (
                      <div style={{ color: 'var(--mu)', padding: '16px 0', textAlign: 'center' }}>ไม่พบข้อมูลบ้าน</div>
                    )
                    ) : (
                      <div style={{ color: 'var(--mu)', padding: '16px 0', textAlign: 'center' }}>กำลังโหลด...</div>
                    )}
                  </div>
                </div>
                <div className="card">
                  <div className="ch"><div className="ch-ico">🚗</div><div className="ct">รถที่ลงทะเบียน</div></div>
                  <div className="cb">
                    {!vehiclesLoaded ? (
                      <div style={{ color: 'var(--mu)', textAlign: 'center', padding: '16px 0' }}>กำลังโหลด...</div>
                    ) : houseVehicles.length === 0 ? (
                      <div style={{ color: 'var(--mu)', textAlign: 'center', padding: '16px 0' }}>ยังไม่มีข้อมูลรถ</div>
                    ) : houseVehicles.map((v) => (
                      <div key={v.id} className="vc vc-compact">
                        <div className="vc-row">
                          <div className="vc-pl"><span className="vc-ico">{vehicleTypeIcon(v.vehicle_type)}</span> {v.license_plate || '-'} <span className="vc-province">{v.province || '-'}</span></div>
                          <span className={`bd ${v.status === 'active' ? 'b-ok' : v.status === 'pending' ? 'b-wn' : 'b-mu'}`}>{v.status === 'active' ? 'ใช้งาน' : v.status === 'pending' ? 'รออนุมัติ' : (v.status || '-')}</span>
                        </div>
                        <div className="vc-line">
                          {[v.brand, v.model].filter(Boolean).join(' ') || '-'} | สี{v.color || '-'} | จอด: {v.parking_location || '-'} | Lock: {v.parking_lock_no || '-'} | ค่าจอด: ฿{v.parking_fee > 0 ? formatMoney(v.parking_fee) : '0'}/เดือน
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
              <div className="ph ph-veh-head" style={{ marginBottom: 12 }}>
                <div className="ph-in">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                    <div className="ph-ico">🚗</div>
                    <div><div className="ph-h1">ข้อมูลรถของฉัน</div><div className="ph-sub">รายการรถที่ลงทะเบียนในบ้านของฉัน</div></div>
                  </div>
                  <div className="ph-acts">
                    <button className="btn btn-p btn-sm" onClick={openAddVehicleRequest}>+ เพิ่มรถ</button>
                  </div>
                </div>
              </div>
              {vehicleRequestsLoaded && vehicleRequests.some((r) => r.status === 'pending' || r.status === 'rejected') && (
                <div className="veh-note">ℹ️ คำขอแก้ไขรถต้องรอนิติอนุมัติก่อนมีผล</div>
              )}

              {/* Pending requests block */}
              {vehicleRequestsLoaded && vehicleRequests.filter((r) => r.status === 'pending' || r.status === 'rejected').length > 0 && (
                <div className="card" style={{ marginBottom: 14 }}>
                  <div className="ch"><div className="ch-ico">📋</div><div className="ct">คำขอที่รอดำเนินการ ({vehicleRequests.filter((r) => r.status === 'pending' || r.status === 'rejected').length} รายการ)</div></div>
                  <div className="cb" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {vehicleRequests.filter((r) => r.status === 'pending' || r.status === 'rejected').map((req) => (
                      <div key={req.id} style={{ background: 'var(--bg)', borderRadius: 10, padding: 12, border: '1px solid var(--bo)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 7, marginBottom: 6 }}>
                          <div>
                            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--tx)' }}>
                              {req.request_type === 'add' ? '🆕 ขอเพิ่มรถ' : '✏️ ขอแก้ไขรถ'} — {req.license_plate || '-'}
                            </span>
                            <div style={{ fontSize: 11.5, color: 'var(--mu)', marginTop: 2 }}>{formatDate(req.created_at)}</div>
                          </div>
                          <div style={{ display: 'flex', gap: 6, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                            <span className={`bd ${req.status === 'pending' ? 'b-wn' : 'b-dg'}`}>{req.status === 'pending' ? 'รอดำเนินการ' : 'ถูกปฏิเสธ'}</span>
                          </div>
                        </div>
                        {req.admin_note && (
                          <div style={{ background: 'var(--prl)', borderRadius: 7, padding: '7px 10px', fontSize: 12.5, color: 'var(--dg)', marginBottom: 8 }}>
                            💬 หมายเหตุนิติ: {req.admin_note}
                          </div>
                        )}
                        <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
                          {req.status === 'rejected' && (
                            <button className="btn btn-xs btn-p" onClick={() => openRejectedVehicleReq(req)}>✏️ แก้ไขและส่งใหม่</button>
                          )}
                          <button className="btn btn-xs btn-dg" onClick={() => cancelVehicleReq(req.id)}>ยกเลิกคำขอ</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="card" style={{ marginBottom: 14 }}>
                <div className="ch"><div className="ch-ico">🚗</div><div className="ct">รถที่ลงทะเบียน ({houseVehicles.length} คัน)</div></div>
                <div className="cb">
                  {!vehiclesLoaded ? (
                    <div style={{ color: 'var(--mu)', textAlign: 'center', padding: '20px 0' }}>กำลังโหลด...</div>
                  ) : houseVehicles.length === 0 ? (
                    <div style={{ color: 'var(--mu)', textAlign: 'center', padding: '20px 0' }}>ยังไม่มีข้อมูลรถ</div>
                  ) : houseVehicles.map((v) => (
                    <div key={v.id} className="vc vc-compact">
                      <div className="vc-row">
                        <div className="vc-pl"><span className="vc-ico">{vehicleTypeIcon(v.vehicle_type)}</span> {v.license_plate || '-'} <span className="vc-province">{v.province || '-'}</span></div>
                        <div className="vc-actions">
                          <span className={`bd ${v.status === 'active' ? 'b-ok' : v.status === 'pending' ? 'b-wn' : 'b-mu'}`}>{v.status === 'active' ? 'ใช้งาน' : v.status === 'pending' ? 'รออนุมัติ' : (v.status || '-')}</span>
                          <button className="btn btn-xs btn-a" onClick={() => openEditVehicleRequest(v)}>แก้ไข</button>
                        </div>
                      </div>
                      <div className="vc-line">
                        {[v.brand, v.model].filter(Boolean).join(' ') || '-'} | สี{v.color || '-'} | จอด: {v.parking_location || '-'} | Lock: {v.parking_lock_no || '-'} | ค่าจอด: ฿{v.parking_fee > 0 ? formatMoney(v.parking_fee) : '0'}/เดือน
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {activeSection === 'fees' && (
            <>
              <div className="ph" style={{ marginBottom: 14 }}>
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

              <div className="fee-summary-bar">
                <div className="fee-summary-card tone-error">
                  <div className="fee-summary-label">💸 ค้างชำระ</div>
                  <div className="fee-summary-value">฿{formatMoney(overdueAmount)}</div>
                </div>
                <div className="fee-summary-card tone-primary">
                  <div className="fee-summary-label">📅 งวดถัดไป</div>
                  <div className="fee-summary-value fee-summary-value--date">{nextDueFee ? formatDate(nextDueFee.due_date) : 'ไม่มี'}</div>
                </div>
                <div className={`fee-summary-card tone-${feeStatusSummary.tone}`}>
                  <div className="fee-summary-label">🧾 สถานะ</div>
                  <div className="fee-summary-value fee-summary-value--status">{feeStatusSummary.label}</div>
                </div>
                <div className="fee-summary-card tone-success">
                  <div className="fee-summary-label">✅ ชำระแล้ว</div>
                  <div className="fee-summary-value">{approvedPaymentCount}</div>
                </div>
              </div>

              {overdueAmount > 0 && (
                <div className="al al-w" style={{ marginBottom: 12 }}>
                  ⚠️ มียอดค้างชำระ <strong>฿{formatMoney(overdueAmount)}</strong> กรุณาดำเนินการก่อนครบกำหนด
                </div>
              )}

              <div className="fee-toolbar-row" style={{ marginBottom: 16 }}>
                <select className="fs fee-toolbar-select" value={feeStatusFilter} onChange={(e) => setFeeStatusFilter(e.target.value)}>
                  <option value="all">ทุกสถานะ</option>
                  <option value="unpaid">ยังไม่ชำระ</option>
                  <option value="pending">รอตรวจสอบ</option>
                  <option value="paid">ชำระแล้ว</option>
                  <option value="overdue">ค้างชำระ</option>
                </select>
                <select className="fs fee-toolbar-select" value={feeYearFilter} onChange={(e) => setFeeYearFilter(e.target.value)}>
                  <option value="all">ทุกปี</option>
                  {feeYearOptions.map((year) => <option key={year} value={year}>{year}</option>)}
                </select>
                <button className="btn btn-a btn-sm fee-toolbar-button" onClick={() => loadFeeData({ status: feeStatusFilter, year: feeYearFilter })}>🔍 ค้นหา</button>
              </div>

              <div className="sl">🧾 ใบแจ้งหนี้ <span style={{ fontWeight: 400, marginLeft: 6 }}>{fees.length} รายการ</span></div>
              <div className="fee-invoice-table">
                <div className="fee-invoice-head">
                  <div>งวด</div>
                  <div>ประเภท</div>
                  <div>ครบกำหนด</div>
                  <div>ยอด</div>
                  <div>สถานะ</div>
                </div>

                {feeLoading ? (
                  <div className="fee-empty">กำลังโหลด...</div>
                ) : fees.length === 0 ? (
                  <div className="fee-empty">ยังไม่มีใบแจ้งหนี้</div>
                ) : fees.map((fee) => {
                  const badge = getFeeStatusBadge(fee.status)
                  const canSubmitSlip = fee.status === 'unpaid' || fee.status === 'overdue'
                  const tone = fee.status === 'paid' ? 'success' : fee.status === 'pending' ? 'primary' : fee.status === 'overdue' ? 'error' : 'warning'
                  return (
                    <div key={fee.id} className={`fee-invoice-row tone-${tone}`}>
                      <div className="fee-invoice-cell">
                        <div className="fee-cell-kicker">งวด</div>
                        <div className="fee-cell-main">{formatFeePeriodLabel(fee)}</div>
                      </div>
                      <div className="fee-invoice-cell">
                        <div className="fee-cell-kicker">ประเภท</div>
                        <div className="fee-cell-main">ค่าส่วนกลาง</div>
                      </div>
                      <div className="fee-invoice-cell">
                        <div className="fee-cell-kicker">ครบกำหนด</div>
                        <div className="fee-cell-main">{formatDate(fee.due_date)}</div>
                      </div>
                      <div className="fee-invoice-cell">
                        <div className="fee-cell-kicker">ยอดรวม</div>
                        <div className="fee-cell-main fee-amount-strong">฿{formatMoney(fee.total_amount)}</div>
                      </div>
                      <div className="fee-invoice-cell">
                        <div className="fee-cell-kicker">สถานะและการจัดการ</div>
                        <div className="fee-invoice-actions">
                          <span className={badge.className}>{badge.label}</span>
                          <div className="fee-inline-btns">
                            {canSubmitSlip && (
                              <button className="btn btn-xs btn-a" onClick={() => openPaymentModal(fee)}>ส่งหลักฐาน</button>
                            )}
                            <button className="btn btn-xs btn-g" onClick={() => handlePrintInvoice(fee)}>🖨 ใบแจ้งหนี้</button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              <div className="sl" style={{ marginTop: 20 }}>📋 ประวัติการชำระ <span style={{ fontWeight: 400, marginLeft: 6 }}>{payments.length} รายการ</span></div>
              <div className="fee-payment-list">
                <div className="fee-payment-head">
                  <div>วันที่ / งวด</div>
                  <div>จำนวนเงิน</div>
                  <div>ประเภท</div>
                  <div>วิธี</div>
                  <div>สถานะ</div>
                </div>

                {feeLoading ? (
                  <div className="fee-empty">กำลังโหลด...</div>
                ) : payments.length === 0 ? (
                  <div className="fee-empty">ยังไม่มีประวัติการชำระ</div>
                ) : payments.map((row) => {
                  const badge = getPaymentStatusBadge(row)
                  const breakdown = getPaymentBreakdown(row)
                  const amount = getPaymentAmount(row)
                  const paymentType = getPaymentTypeLabel(row)
                  const rejectedReason = getRejectedReason(row.note)
                  const hasDetails = breakdown.length > 0 || row.slip_url || rejectedReason
                  const canPrintReceipt = !!row.verified_at
                  return (
                    <details key={row.id} className="fee-payment-item" open={false}>
                      <summary className="fee-payment-summary">
                        <div className="fee-payment-col">
                          <div className="fee-cell-kicker">วันที่ / งวด</div>
                          <div className="fee-cell-main">{formatDate(row.paid_at)}</div>
                          <div className="fee-cell-sub">{row.fees ? `งวด ${formatFeePeriodLabel(row.fees)}` : 'ไม่ระบุงวด'}</div>
                        </div>
                        <div className="fee-payment-col fee-payment-col--amount">
                          <div className="fee-cell-kicker">จำนวนเงิน</div>
                          <div className="fee-cell-main fee-amount-strong">฿{formatMoney(amount)}</div>
                        </div>
                        <div className="fee-payment-col">
                          <div className="fee-cell-kicker">ประเภท</div>
                          <div className="fee-cell-main">{paymentType}</div>
                        </div>
                        <div className="fee-payment-col">
                          <div className="fee-cell-kicker">วิธีชำระ</div>
                          <div className="fee-cell-main">{formatMethod(row.payment_method)}</div>
                        </div>
                        <div className="fee-payment-col fee-payment-col--status">
                          <div className="fee-cell-kicker">สถานะและการจัดการ</div>
                          <span className={badge.className}>{badge.label}</span>
                          {canPrintReceipt && (
                            <button className="btn btn-xs btn-g" onClick={(e) => { e.preventDefault(); handlePrintReceipt(row) }}>🖨 ใบเสร็จ</button>
                          )}
                        </div>
                      </summary>

                      {hasDetails && (
                        <div className="fee-payment-detail">
                          {breakdown.length > 0 && (
                            <div className="fee-breakdown-block">
                              <div className="fee-breakdown-list">
                                {breakdown.map((item, index) => (
                                  <div key={`${row.id}-${item.label}-${index}`} className="fee-breakdown-row">
                                    <span>{item.label}</span>
                                    <strong>฿{formatMoney(item.amount)}</strong>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {row.slip_url && (
                            <div className="fee-payment-links">
                              <button type="button" className="btn btn-xs btn-o" onClick={() => openResidentAttachment(row.slip_url, 'หลักฐานการชำระเงิน')}>ดูหลักฐานการชำระ</button>
                            </div>
                          )}

                          {rejectedReason && (
                            <div className="fee-payment-note">
                              {rejectedReason && <div className="fee-payment-note-row fee-payment-note-row--error">เหตุผลตีกลับ: {rejectedReason}</div>}
                            </div>
                          )}
                        </div>
                      )}
                    </details>
                  )
                })}
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
                          {ISSUE_CATEGORY_OPTIONS.map((category) => (
                            <option key={category} value={category}>{category}</option>
                          ))}
                        </select>
                      </div>
                      <div className="fg">
                        <label className="fl">แนบรูปภาพ (ไม่บังคับ)</label>
                        <input className="fi" type="file" accept="image/*" multiple onChange={handleIssueAttachFiles} disabled={issueAttachments.length >= MAX_ATTACHMENTS} />
                        <div style={{ marginTop: 6, fontSize: 11.5, color: 'var(--mu)' }}>
                          แนบแล้ว {issueAttachments.length}/{MAX_ATTACHMENTS} รูป • ระบบย่อไฟล์ไม่เกิน 100KB อัตโนมัติ
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                          {issueAttachments.length === 0 ? (
                            <div style={{ fontSize: 11.5, color: 'var(--mu)' }}>ยังไม่มีรูปแนบ</div>
                          ) : issueAttachments.map((img, idx) => (
                            <div key={`${img.name}-${idx}`} style={{ width: 64 }}>
                              <button
                                type="button"
                                onClick={() => handlePreviewAttachment(img)}
                                style={{ width: 64, height: 64, borderRadius: 8, border: '1px solid var(--bo)', background: '#fff', padding: 0, overflow: 'hidden', cursor: 'pointer' }}
                              >
                                <img src={img.url} alt={img.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              </button>
                              <button type="button" className="btn btn-xs btn-dg" onClick={() => handleIssueRemoveAttachment(img)} style={{ marginTop: 4, width: '100%' }}>ลบ</button>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button className="btn btn-p btn-sm" type="submit" disabled={issueSubmitting}>
                          {issueSubmitting ? 'กำลังส่ง...' : '📤 ส่งคำร้อง'}
                        </button>
                        <button
                          className="btn btn-g btn-sm"
                          type="button"
                          onClick={() => {
                            issueAttachments.forEach((item) => {
                              if (item.source === 'new' && item.url) URL.revokeObjectURL(item.url)
                            })
                            setIssueAttachments([])
                            setIssueForm({ title: '', detail: '', category: 'ทั่วไป' })
                            setShowIssueForm(false)
                          }}
                        >
                          ยกเลิก
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
                {issues.length === 0 ? (
                  <div className="card"><div className="cb" style={{ textAlign: 'center', color: 'var(--mu)', padding: '24px 0' }}>ยังไม่มีการแจ้งปัญหา<br /><span style={{ fontSize: 12 }}>กดปุ่ม "+ แจ้งปัญหาใหม่" ด้านบนเพื่อเริ่ม</span></div></div>
                ) : issues.map((issue) => {
                  const isClosedIssue = issue.status === 'closed'
                  const content = (
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
                      {issue.rating != null && (
                        <div style={{ fontSize: '12px', color: 'var(--tx)', marginBottom: 10, background: 'var(--prl)', borderRadius: 7, padding: '8px 10px' }}>
                          ⭐ คะแนนลูกบ้าน: {renderStars(issue.rating)} ({issue.rating}/5)
                          {issue.rating_note ? ` · ${issue.rating_note}` : ''}
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
                            <div className={`tld ${issue.status === 'resolved' || issue.status === 'closed' ? 'td-done' : 'td-pend'}`} />
                            <div className="tl-l" style={{ color: issue.status === 'resolved' || issue.status === 'closed' ? 'var(--tx)' : 'var(--mu)' }}>เสร็จสิ้น</div>
                            {issue.resolved_at && <div className="tl-s">{formatDate(issue.resolved_at)}</div>}
                          </div>
                          <div className="tli">
                            <div className={`tld ${issue.status === 'closed' ? 'td-done' : 'td-pend'}`} />
                            <div className="tl-l" style={{ color: issue.status === 'closed' ? 'var(--tx)' : 'var(--mu)' }}>ปิดงาน</div>
                          </div>
                        </div>
                      </div>
                      {issue.status === 'resolved' && issue.rating == null && (
                        <div style={{ marginTop: 10, display: 'flex', justifyContent: 'flex-end' }}>
                          <button className="btn btn-xs btn-a" onClick={() => handleResidentRateIssue(issue)}>⭐ ให้คะแนนและปิดงาน</button>
                        </div>
                      )}
                    </div>
                  )

                  if (isClosedIssue) {
                    return (
                      <details key={issue.id} className="card issue-collapsible-card">
                        <summary className="issue-collapsible-summary">
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--tx)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>🔦 {issue.title}</div>
                            <div style={{ fontSize: '11px', color: 'var(--mu)', marginTop: 2 }}>แจ้ง {formatDate(issue.created_at)} · {issue.category || 'ทั่วไป'}</div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                            {issue.rating != null && <span style={{ fontSize: '11px', color: 'var(--mu)' }}>{issue.rating}/5</span>}
                            <span className={getStatusBadge(issue.status).className}>{getStatusBadge(issue.status).label}</span>
                          </div>
                        </summary>
                        {content}
                      </details>
                    )
                  }

                  return <div key={issue.id} className="card">{content}</div>
                })}
              </div>
            </>
          )}

          {activeSection === 'notif' && (
            <>
              <div className="ph notif-head" style={{ marginBottom: 12 }}>
                <div className="ph-in">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div className="ph-ico">⚠️</div>
                    <div><div className="ph-h1">การแจ้งเตือนจากนิติ</div><div className="ph-sub">การกระทำผิดและข้อมูลสำคัญ</div></div>
                  </div>
                  <div className="ph-acts">
                    <button className="btn btn-p btn-sm" onClick={() => { setShowIssueForm(true); navTo('issue') }}>+ แจ้งเตือนใหม่</button>
                  </div>
                </div>
              </div>

              <div className="card notif-search-card" style={{ marginBottom: 14 }}>
                <div className="cb notif-search-row">
                  <div className="notif-input-wrap">
                    <span className="notif-input-icon">🔍</span>
                    <input className="fi notif-input" type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="ค้นหา ประเภท / รายละเอียด" />
                  </div>
                  <select className="fs notif-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                    <option value="all">ทุกสถานะ</option>
                    <option value="new">ยังไม่ดำเนินการ</option>
                    <option value="in_progress">กำลังดำเนินการ</option>
                    <option value="resolved">ดำเนินการแล้ว</option>
                    <option value="not_fixed">ส่งกลับไปดำเนินการใหม่</option>
                    <option value="closed">ปิดรายการ</option>
                    <option value="cancelled">ยกเลิก</option>
                  </select>
                  <select className="fs notif-select" value={notifDateFilter} onChange={(e) => setNotifDateFilter(e.target.value)}>
                    <option value="all">ทุกช่วงเวลา</option>
                    <option value="today">วันนี้</option>
                    <option value="7d">7 วันล่าสุด</option>
                    <option value="30d">30 วันล่าสุด</option>
                  </select>
                  <button className="btn btn-p btn-sm notif-search-btn" onClick={() => loadViolations({ status: statusFilter, search: searchTerm })}>ค้นหา</button>
                </div>
              </div>

              <div className="card notif-list-card">
                <div className="ch"><div className="ct notif-card-title">รายการแจ้งเตือน ({filteredNotifViolations.length} รายการ)</div></div>
                <div className="cb notif-table-wrap" style={{ padding: 0 }}>
                  <div className="tw notif-table-scroll">
                    <table style={{ width: '100%', minWidth: '1080px' }}>
                      <thead><tr><th>ประเภท</th><th>รายละเอียด</th><th>โต้ตอบล่าสุด</th><th>กำหนด</th><th>สถานะ</th><th>การจัดการ</th></tr></thead>
                      <tbody>
                        {loading ? (
                          Array.from({ length: 5 }).map((_, index) => (
                            <tr key={`sk-${index}`} className="notif-skeleton-row"><td colSpan="6"><div className="notif-skeleton-line" /></td></tr>
                          ))
                        ) : filteredNotifViolations.length === 0 ? (
                          <tr><td colSpan="6" style={{ textAlign: 'center', color: 'var(--mu)', padding: 20 }}>ไม่พบข้อมูล</td></tr>
                        ) : filteredNotifViolations.map((item) => {
                          const statusBadge = getViolationStatusBadge(item.status)
                          const convo = getViolationConversation(item)
                          const latestRound = convo[convo.length - 1]
                          return (
                            <tr key={item.id} className="notif-row" onClick={() => openViolationModal(item)}>
                              <td><span className={getViolationTypeBadgeClass(item.type)}>{item.type || '-'}</span></td>
                              <td style={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.detail || '-'}</td>
                              <td>
                                <div style={{ maxWidth: 210, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 600 }}>{latestRound?.text || '-'}</div>
                                <div style={{ fontSize: '11px', color: 'var(--mu)' }}>{latestRound?.actor || '-'} • {latestRound?.at ? formatDate(latestRound.at) : '-'}</div>
                              </td>
                              <td>{formatDate(item.due_date)}</td>
                              <td><span className={statusBadge.className}>{statusBadge.label}</span></td>
                              <td>
                                <div style={{ display: 'flex', gap: 6 }}>
                                  <button className="btn btn-xs btn-a" onClick={(e) => { e.stopPropagation(); openViolationModal(item) }}>✏️ อัปเดต</button>
                                  <button className="btn btn-xs btn-g" onClick={(e) => { e.stopPropagation(); openViolationModal(item) }}>👁 ดู</button>
                                </div>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="notif-mobile-list">
                  {loading ? (
                    Array.from({ length: 4 }).map((_, index) => (
                      <div key={`m-sk-${index}`} className="notif-mobile-card notif-mobile-card--skeleton">
                        <div className="notif-skeleton-line" />
                      </div>
                    ))
                  ) : filteredNotifViolations.length === 0 ? (
                    <div className="mcard-empty">ไม่พบข้อมูล</div>
                  ) : filteredNotifViolations.map((item) => {
                    const statusBadge = getViolationStatusBadge(item.status)
                    const convo = getViolationConversation(item)
                    const latestRound = convo[convo.length - 1]
                    return (
                      <div key={`m-${item.id}`} className="notif-mobile-card" onClick={() => openViolationModal(item)}>
                        <div className="notif-mobile-top">
                          <span className={getViolationTypeBadgeClass(item.type)}>{item.type || '-'}</span>
                          <span className={statusBadge.className}>{statusBadge.label}</span>
                        </div>
                        <div className="notif-mobile-detail">{item.detail || '-'}</div>
                        <div className="notif-mobile-latest">{latestRound?.text || '-'}</div>
                        <div className="notif-mobile-meta">{latestRound?.actor || '-'} • {latestRound?.at ? formatDate(latestRound.at) : '-'}</div>
                        <div className="notif-mobile-due">กำหนด: {formatDate(item.due_date)}</div>
                        <div className="notif-mobile-actions">
                          <button className="btn btn-xs btn-a" onClick={(e) => { e.stopPropagation(); openViolationModal(item) }}>✏️ อัปเดต</button>
                          <button className="btn btn-xs btn-g" onClick={(e) => { e.stopPropagation(); openViolationModal(item) }}>👁 ดู</button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {!loading && filteredNotifViolations.map((item) => {
                const rounds = getViolationConversation(item)
                return (
                  <details key={`log-${item.id}`} className="card notif-log-card">
                    <summary className="notif-log-summary">
                      <span style={{ fontWeight: 700 }}>🧠 ประวัติการโต้ตอบ • {item.type || '-'}</span>
                      <span style={{ color: 'var(--mu)', fontSize: 12 }}>{rounds.length} รายการ</span>
                    </summary>
                    <div className="notif-log-list">
                      {rounds.map((entry) => (
                        <div key={`${item.id}-${entry.id}`} className={`notif-log-item side-${entry.side}`}>
                          <div className="notif-log-head">
                            <strong>{entry.actor}</strong>
                            <span>{entry.at ? formatDate(entry.at) : '-'}</span>
                          </div>
                          <div className="notif-log-text">{entry.text}</div>
                        </div>
                      ))}
                    </div>
                  </details>
                )
              })}
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
                    (() => {
                      const attachments = buildAttachmentItems({ imageUrls: [ann.image_url], text: ann.content, maxItems: 4 })
                      return (
                        <div key={ann.id} className="ann">
                          <div className={`ann-dot ${getAnnDotClass(ann.type)}`} />
                          <div style={{ flex: 1 }}>
                            <div className="ann-t">{ann.is_pinned ? '📌 ' : ''}{ann.title}</div>
                            {ann.content && <div className="ann-b">{ann.content}</div>}
                            {attachments.length > 0 && (
                              <div className="ann-attachments">
                                {attachments.map((att) => (
                                  <button key={`${ann.id}-${att.id}`} type="button" className="ann-attach-item ann-attach-btn" onClick={() => openResidentAttachment(att.url, `${ann.title || 'ประกาศ'} - ${att.title || 'ไฟล์แนบ'}`)}>
                                    {att.isImage ? (
                                      <img src={att.url} alt={att.title} className="ann-attach-thumb" />
                                    ) : (
                                      <span className="ann-attach-file">{getFileKind(att.url).icon} {getFileKind(att.url).label}</span>
                                    )}
                                  </button>
                                ))}
                              </div>
                            )}
                            <div className="ann-d">{formatDate(ann.announcement_date || ann.created_at)} · {getTypeLabel(ann.type)}</div>
                          </div>
                        </div>
                      )
                    })()
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
                    const imageUrls = Array.isArray(rp.image_urls) ? rp.image_urls : []
                    const attachments = buildAttachmentItems({ imageUrls, text: rp.detail, maxItems: 6 })
                    return (
                      <div key={rp.id} className="ann">
                        <div className="ann-dot ad-evt" />
                        <div style={{ flex: 1 }}>
                          <div className="ann-t">รายงาน {monthName} {rp.year}</div>
                          {rp.summary && <div className="ann-b">{rp.summary}</div>}
                          {attachments.length > 0 && (
                            <div className="ann-attachments">
                              {attachments.map((att) => (
                                <button key={`${rp.id}-${att.id}`} type="button" className="ann-attach-item ann-attach-btn" onClick={() => openResidentAttachment(att.url, `${rp.summary || 'ผลงานนิติ'} - ${att.title || 'ไฟล์แนบ'}`)}>
                                  {att.isImage ? (
                                    <img src={att.url} alt={att.title} className="ann-attach-thumb" />
                                  ) : (
                                    <span className="ann-attach-file">{getFileKind(att.url).icon} {getFileKind(att.url).label}</span>
                                  )}
                                </button>
                              ))}
                            </div>
                          )}
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
                      <button key={t.id} type="button" className="tech-card tech-card-btn" onClick={() => openTechModal(t)}>
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
                        <div style={{ marginTop: 9, fontSize: 12, color: 'var(--mu)' }}>แตะเพื่อดูรายละเอียด</div>
                      </button>
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
                  <div className="ph-acts" style={{ gap: 8 }}>
                    <button className="btn btn-w btn-sm" onClick={openMarketPostModal}>+ โพสต์ขายของ</button>
                  </div>
                </div>
              </div>

              {myPendingMarketCount > 0 && (
                <div className="al al-i">ℹ️ โพสต์ของคุณที่รออนุมัติอยู่ {myPendingMarketCount} รายการ (จะแสดงสาธารณะหลังนิติอนุมัติ)</div>
              )}

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
                    <button key={item.id} type="button" className="r-mcard" onClick={() => openMarketDetailModal(item)}>
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
                        {item.status === 'pending' && <div style={{ marginTop: 4, fontSize: 11.5, color: 'var(--wn)', fontWeight: 700 }}>รออนุมัติจากนิติ</div>}
                        {item.contact && <div style={{ marginTop: 5, fontSize: '12px' }}>📞 {item.contact}</div>}
                      </div>
                    </button>
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
                    <div className="house-sec-title">ประวัติการโต้ตอบ</div>
                    <div className="notif-log-list">
                      {getViolationConversation(editingViolation || {}).map((entry, index) => (
                        <div key={`md-log-${entry.id || index}`} className={`notif-log-item side-${entry.side || 'system'}`}>
                          <div className="notif-log-head">
                            <strong>{entry.actor}</strong>
                            <span>{entry.at ? formatDate(entry.at) : '-'}</span>
                          </div>
                          <div className="notif-log-text">{entry.text}</div>
                        </div>
                      ))}
                    </div>
                  </section>

                  <section className="house-sec">
                    <div className="house-sec-title">ข้อความอัปเดต</div>
                    <div className="house-grid house-grid-1">
                      <label className="house-field">
                        <span>สถานะงานที่ลูกบ้านแจ้งกลับ</span>
                        <select value={residentViolationStatus} onChange={(e) => setResidentViolationStatus(e.target.value)} disabled={editingViolation?.status === 'closed'}>
                          <option value="in_progress">กำลังดำเนินการ</option>
                          <option value="resolved">แก้ไขแล้ว</option>
                        </select>
                      </label>
                      <label className="house-field">
                        <span>รายละเอียดที่ต้องการแจ้งกลับ *</span>
                        <textarea value={residentNote} onChange={(e) => setResidentNote(e.target.value)} rows="4" placeholder="พิมพ์ข้อความรอบใหม่ เช่น ได้แก้ไขแล้ว กำลังรอตรวจสอบ" disabled={editingViolation?.status === 'closed'} />
                      </label>
                    </div>
                  </section>

                  <section className="house-sec">
                    <div className="house-sec-title">รูปแนบจากลูกบ้าน (สูงสุด 5 รูป)</div>
                    <label className="house-field">
                      <span>แนบไฟล์รูปภาพ</span>
                      <input type="file" accept="image/*" multiple onChange={handleAttachFiles} disabled={editingViolation?.status === 'closed'} />
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
                  <button className="btn btn-p" type="submit" disabled={saving || editingViolation?.status === 'closed'}>{editingViolation?.status === 'closed' ? 'รายการปิดแล้ว' : (saving ? 'กำลังบันทึก...' : 'ส่งอัปเดต')}</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {showVehicleReqModal && (
          <div className="house-mo house-mo--vehicle-req">
            <div className="house-md house-md--xl house-md--vehicle-req">
              <div className="house-md-head">
                <div>
                  <div className="house-md-title">
                    {vehicleReqMode === 'add' ? '🆕 ขอเพิ่มรถ' : '✏️ ขอแก้ไขข้อมูลรถ'}
                  </div>
                  <div className="house-md-sub">
                    {vehicleReqMode === 'edit' ? `รถ: ${vehicleReqTarget?.license_plate || '-'} ${vehicleReqTarget?.brand || ''} ${vehicleReqTarget?.model || ''}` : 'กรอกข้อมูลรถที่ต้องการเพิ่ม'}
                  </div>
                </div>
              </div>
              <form onSubmit={handleSubmitVehicleRequest}>
                <div className="house-md-body">

                  <section className="house-sec">
                    <div className="house-sec-title">ข้อมูลทะเบียนรถ</div>
                    <div className="house-grid house-grid-4">
                      <label className="house-field">
                        <span>ทะเบียนรถ *</span>
                        <div className="plate-split-wrap">
                          <input className="plate-prefix" name="license_plate_prefix" value={vehicleReqForm.license_plate_prefix} onChange={handleVehicleReqFormChange} placeholder="7กจ" />
                          <span className="plate-dash">-</span>
                          <input className="plate-number" name="license_plate_number" value={vehicleReqForm.license_plate_number} onChange={handleVehicleReqFormChange} placeholder="5533" />
                        </div>
                      </label>
                      <label className="house-field">
                        <span>จังหวัด</span>
                        <select name="province" value={vehicleReqForm.province} onChange={handleVehicleReqFormChange}>
                          {PROVINCE_OPTIONS.map((p) => <option key={p} value={p}>{p}</option>)}
                        </select>
                      </label>
                      {vehicleReqMode === 'add' && (
                        <label className="house-field">
                          <span>ประเภทรถ</span>
                          <select name="vehicle_type" value={vehicleReqForm.vehicle_type} onChange={handleVehicleReqFormChange}>
                            {VEHICLE_TYPES_OPT.map((t) => <option key={t} value={t}>{t}</option>)}
                          </select>
                        </label>
                      )}
                    </div>
                  </section>

                  {vehicleReqMode === 'add' && (
                    <section className="house-sec">
                      <div className="house-sec-title">รายละเอียดรถ</div>
                      <div className="house-grid house-grid-3">
                        <label className="house-field">
                          <span>ยี่ห้อ</span>
                          <select name="brand" value={vehicleReqForm.brand} onChange={handleVehicleReqFormChange}>
                            {BRAND_OPTIONS.map((b) => <option key={b} value={b}>{b}</option>)}
                          </select>
                        </label>
                        {vehicleReqForm.brand === 'อื่นๆ' && (
                          <label className="house-field">
                            <span>ระบุยี่ห้ออื่นๆ *</span>
                            <input name="brand_other" value={vehicleReqForm.brand_other} onChange={handleVehicleReqFormChange} placeholder="เช่น NETA" />
                          </label>
                        )}
                        <label className="house-field">
                          <span>รุ่น</span>
                          <input name="model" value={vehicleReqForm.model} onChange={handleVehicleReqFormChange} placeholder="เช่น City / Revo" />
                        </label>
                      </div>
                    </section>
                  )}

                  <section className="house-sec">
                    <div className="house-sec-title">สี / สถานะ / ที่จอด</div>
                    <div className="house-grid house-grid-3">
                      <label className="house-field">
                        <span>สี</span>
                        <select name="color" value={vehicleReqForm.color} onChange={handleVehicleReqFormChange}>
                          {COLOR_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </label>
                      {vehicleReqForm.color === 'อื่นๆ' && (
                        <label className="house-field">
                          <span>ระบุสีอื่นๆ</span>
                          <input name="color_other" value={vehicleReqForm.color_other} onChange={handleVehicleReqFormChange} placeholder="เช่น สีครีม" />
                        </label>
                      )}
                      <label className="house-field">
                        <span>สถานะการใช้รถ</span>
                        <select name="vehicle_status" value={vehicleReqForm.vehicle_status} onChange={handleVehicleReqFormChange}>
                          <option value="active">ใช้งาน / จอดในพื้นที่</option>
                          <option value="inactive">ไม่ได้จอดในพื้นที่</option>
                        </select>
                      </label>
                      <label className="house-field">
                        <span>สถานที่จอด</span>
                        <select name="parking_location" value={vehicleReqForm.parking_location} onChange={handleVehicleReqFormChange}>
                          {PARKING_OPTIONS.map((p) => <option key={p} value={p}>{p}</option>)}
                        </select>
                      </label>
                    </div>
                  </section>

                  <section className="house-sec">
                    <div className="house-sec-title">รูปรถ {vehicleReqMode === 'add' ? '(บังคับ ≥ 1 รูป)' : '(รูปเดิม + รูปใหม่)'}</div>
                    <label className="house-field">
                      <span>{vehicleReqMode === 'add' ? 'แนบรูปรถ' : 'เพิ่ม/แทนที่รูปเดิม'}</span>
                      <input type="file" accept="image/*" multiple onChange={handleVehicleReqAttachFiles} />
                    </label>
                    <div style={{ marginTop: 8, fontSize: 12, color: 'var(--mu)' }}>ระบบย่อไฟล์ไม่เกิน 100KB อัตโนมัติ และเปลี่ยนชื่อไฟล์ให้ใหม่</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                      {vehicleReqAttachments.length === 0 ? (
                        <div style={{ fontSize: 12, color: vehicleReqMode === 'add' ? 'var(--dg)' : 'var(--mu)' }}>
                          {vehicleReqMode === 'add' ? '⚠️ กรุณาแนบรูปรถอย่างน้อย 1 รูป' : 'ยังไม่มีรูปแนบ'}
                        </div>
                      ) : vehicleReqAttachments.map((att, idx) => (
                        <div key={`${att.name}-${idx}`} style={{ width: 74 }}>
                          <button type="button" onClick={() => showSwal({ imageUrl: att.url, showConfirmButton: false, showCloseButton: true, width: 'auto', background: '#0f172a' })} style={{ width: 64, height: 64, borderRadius: 8, border: '1px solid var(--bo)', background: '#fff', padding: 0, overflow: 'hidden', cursor: 'pointer' }}>
                            <img src={att.url} alt={att.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          </button>
                          <div style={{ fontSize: 10.5, color: 'var(--mu)', marginTop: 2, textAlign: 'center' }}>
                            {att.source === 'existing-vehicle' ? 'เดิมในระบบ' : att.source === 'existing-request' ? 'รูปคำขอเดิม' : 'ใหม่'}
                          </div>
                          <button type="button" onClick={() => handleRemoveVehicleReqAttachment(att)} className="btn btn-xs btn-dg" style={{ marginTop: 4, width: '100%' }}>ลบ</button>
                        </div>
                      ))}
                    </div>
                  </section>

                  <section className="house-sec">
                    <div className="house-grid house-grid-1">
                      <label className="house-field">
                        <span>หมายเหตุเพิ่มเติม</span>
                        <textarea name="note" rows={2} value={vehicleReqForm.note} onChange={handleVehicleReqFormChange} placeholder="รายละเอียดเพิ่มเติม (ถ้ามี)" />
                      </label>
                    </div>
                  </section>

                </div>
                <div className="house-md-foot">
                  <button className="btn btn-g" type="button" onClick={closeVehicleReqModal} disabled={vehicleReqSaving}>ยกเลิก</button>
                  <button className="btn btn-p" type="submit" disabled={vehicleReqSaving}>
                    {vehicleReqSaving ? 'กำลังส่ง...' : '📤 ส่งคำขอ'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {selectedTech && (
          <div className="house-mo">
            <div className="house-md house-md--sm tech-detail-modal">
              <div className="house-md-head">
                <div>
                  <div className="house-md-title">🔨 รายละเอียดช่าง</div>
                  <div className="house-md-sub">{selectedTech.name || '-'}</div>
                </div>
              </div>
              <div className="house-md-body">
                <section className="house-sec">
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <div className="tech-avatar" style={{ width: 62, height: 62 }}>
                      {selectedTech.avatar_url ? <img src={selectedTech.avatar_url} alt={selectedTech.name} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 12 }} /> : '🔨'}
                    </div>
                    <div>
                      <div className="tech-name" style={{ fontSize: 16 }}>{selectedTech.name || '-'}</div>
                      <div className="tech-phone">📞 {selectedTech.phone || '-'}</div>
                      <div className="tech-phone">💬 LINE: {selectedTech.line_id || '-'}</div>
                      {selectedTech.rating != null && (
                        <div style={{ marginTop: 3 }}>
                          <span className="rating-stars">{renderStars(selectedTech.rating)}</span>
                          <span style={{ fontSize: 11, color: 'var(--mu)' }}> {Number(selectedTech.rating || 0).toFixed(1)} ({selectedTech.review_count || 0})</span>
                        </div>
                      )}
                    </div>
                  </div>
                </section>

                <section className="house-sec">
                  <div className="house-sec-title">บริการและราคา</div>
                  <div className="tech-tags" style={{ marginTop: 0 }}>
                    {(selectedTech.technician_services || []).length === 0 ? (
                      <span style={{ fontSize: 12, color: 'var(--mu)' }}>ยังไม่ได้ระบุบริการ</span>
                    ) : (selectedTech.technician_services || []).map((svc) => (
                      <span key={svc.id} className="tech-tag">
                        {svc.skill}
                        {(Number(svc.price_min || 0) > 0 || Number(svc.price_max || 0) > 0) && ` • ฿${formatMoney(svc.price_min || 0)}-${formatMoney(svc.price_max || 0)}`}
                      </span>
                    ))}
                  </div>
                  {selectedTech.note && <div style={{ marginTop: 10, fontSize: 12.5, color: 'var(--tx)', whiteSpace: 'pre-wrap' }}>หมายเหตุ: {selectedTech.note}</div>}
                </section>
              </div>
              <div className="house-md-foot">
                <button className="btn btn-g" type="button" onClick={closeTechModal}>ปิด</button>
                {selectedTech.phone && (
                  <a href={`tel:${String(selectedTech.phone).replace(/[^0-9]/g, '')}`} style={{ textDecoration: 'none' }}>
                    <button className="btn btn-p" type="button">📞 โทรหา</button>
                  </a>
                )}
              </div>
            </div>
          </div>
        )}

        {showMarketPostModal && (
          <div className="house-mo">
            <div className="house-md house-md--md">
              <div className="house-md-head">
                <div>
                  <div className="house-md-title">🛒 โพสต์ขายของในตลาดชุมชน</div>
                  <div className="house-md-sub">โพสต์จะต้องผ่านการอนุมัติจากนิติก่อนแสดงสาธารณะ</div>
                </div>
              </div>
              <form onSubmit={submitMarketPost}>
                <div className="house-md-body">
                  <section className="house-sec">
                    <div className="house-grid house-grid-3">
                      <label className="house-field house-field-span-2">
                        <span>ชื่อสินค้า/บริการ *</span>
                        <input value={marketPostForm.title} onChange={(e) => setMarketPostForm((cur) => ({ ...cur, title: e.target.value }))} placeholder="เช่น โต๊ะทำงานมือสอง" />
                      </label>
                      <label className="house-field">
                        <span>ประเภท</span>
                        <select value={marketPostForm.listing_type} onChange={(e) => setMarketPostForm((cur) => ({ ...cur, listing_type: e.target.value }))}>
                          <option value="sell">ขาย</option>
                          <option value="free">ให้ฟรี</option>
                          <option value="rent">ให้เช่า</option>
                          <option value="wanted">ต้องการ</option>
                        </select>
                      </label>
                      <label className="house-field">
                        <span>หมวดหมู่</span>
                        <select value={marketPostForm.category} onChange={(e) => setMarketPostForm((cur) => ({ ...cur, category: e.target.value }))}>
                          <option value="">เลือกหมวดหมู่</option>
                          {MARKET_CATEGORY_OPTIONS.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
                        </select>
                      </label>
                      <label className="house-field">
                        <span>ราคา (บาท)</span>
                        <input type="number" min="0" value={marketPostForm.price} onChange={(e) => setMarketPostForm((cur) => ({ ...cur, price: e.target.value }))} placeholder="0" />
                      </label>
                      <label className="house-field">
                        <span>ติดต่อ</span>
                        <input value={marketPostForm.contact} onChange={(e) => setMarketPostForm((cur) => ({ ...cur, contact: e.target.value }))} placeholder="เบอร์โทรหรือ Line" />
                      </label>
                      <label className="house-field house-field-span-3">
                        <span>รายละเอียด</span>
                        <textarea rows={4} value={marketPostForm.detail} onChange={(e) => setMarketPostForm((cur) => ({ ...cur, detail: e.target.value }))} placeholder="รายละเอียดสินค้า/เงื่อนไข" />
                      </label>
                    </div>
                  </section>

                  <section className="house-sec">
                    <div className="house-sec-title">รูปสินค้า (สูงสุด 2 รูป)</div>
                    <label className="house-field">
                      <span>แนบไฟล์รูปภาพ</span>
                      <input type="file" accept="image/*" multiple onChange={handleMarketPostAttachFiles} disabled={marketPostAttachments.length >= MARKETPLACE_MAX_ATTACHMENTS} />
                    </label>
                    <div style={{ marginTop: 8, fontSize: 12, color: 'var(--mu)' }}>แนบแล้ว {marketPostAttachments.length}/{MARKETPLACE_MAX_ATTACHMENTS} รูป • ระบบย่อไฟล์ไม่เกิน 100KB</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                      {marketPostAttachments.length === 0 ? (
                        <div style={{ fontSize: 12, color: 'var(--mu)' }}>ยังไม่มีรูปแนบ</div>
                      ) : marketPostAttachments.map((img, idx) => (
                        <div key={`${img.name}-${idx}`} style={{ width: 74 }}>
                          <button type="button" onClick={() => showSwal({ imageUrl: img.url, showConfirmButton: false, showCloseButton: true, width: 'auto', background: '#0f172a' })} style={{ width: 64, height: 64, borderRadius: 8, border: '1px solid var(--bo)', background: '#fff', padding: 0, overflow: 'hidden', cursor: 'pointer' }}>
                            <img src={img.url} alt={img.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          </button>
                          <button type="button" onClick={() => handleMarketPostRemoveAttachment(img)} className="btn btn-xs btn-dg" style={{ marginTop: 4, width: '100%' }}>ลบ</button>
                        </div>
                      ))}
                    </div>
                  </section>
                </div>
                <div className="house-md-foot">
                  <button className="btn btn-g" type="button" onClick={closeMarketPostModal} disabled={marketPosting}>ยกเลิก</button>
                  <button className="btn btn-p" type="submit" disabled={marketPosting}>{marketPosting ? 'กำลังส่ง...' : 'ส่งโพสต์'}</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {showMarketDetailModal && marketDetailItem && (
          <div className="house-mo">
            <div className="house-md house-md--sm">
              <div className="house-md-head">
                <div>
                  <div className="house-md-title">🔍 รายละเอียดโพสต์</div>
                  <div className="house-md-sub">{marketDetailItem.title || '-'}</div>
                </div>
              </div>
              <div className="house-md-body">
                <section className="house-sec">
                  <div className="tech-tags" style={{ marginTop: 0, marginBottom: 8 }}>
                    <span className="tech-tag">{marketBadgeLabel(marketDetailItem.listing_type)}</span>
                    {marketDetailItem.status === 'pending' && <span className="tech-tag wn-tag">รออนุมัติ</span>}
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--tx)' }}>{marketDetailItem.category || '-'}</div>
                  <div className="r-mcard-price" style={{ marginTop: 6 }}>
                    {marketDetailItem.listing_type === 'free' ? 'ให้ฟรี 🎁' : (marketDetailItem.price ? `฿${formatMoney(marketDetailItem.price)}` : '-')}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--mu)', marginTop: 4 }}>{formatDate(marketDetailItem.created_at)}</div>
                </section>

                <section className="house-sec">
                  <div className="house-sec-title">รายละเอียด</div>
                  <div style={{ fontSize: 13, color: 'var(--tx)', whiteSpace: 'pre-wrap', lineHeight: 1.55 }}>{marketDetailItem.detail || '-'}</div>
                  {marketDetailItem.contact && <div style={{ marginTop: 10, fontSize: 13 }}>📞 {marketDetailItem.contact}</div>}
                </section>

                <section className="house-sec">
                  <div className="house-sec-title">รูปภาพ</div>
                  {marketDetailLoading ? (
                    <div style={{ fontSize: 12, color: 'var(--mu)' }}>กำลังโหลดรูป...</div>
                  ) : marketDetailImages.length === 0 ? (
                    <div style={{ fontSize: 12, color: 'var(--mu)' }}>ไม่มีรูปแนบ</div>
                  ) : (
                    <>
                      <img src={marketDetailImages[Math.min(marketDetailIndex, marketDetailImages.length - 1)]?.url} alt="market-detail" style={{ width: '100%', height: 220, objectFit: 'contain', border: '1px solid var(--bo)', borderRadius: 10, background: '#fff' }} />
                      {marketDetailImages.length > 1 && (
                        <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                          <button type="button" className="btn btn-xs btn-o" onClick={() => setMarketDetailIndex((idx) => Math.max(0, idx - 1))} disabled={marketDetailIndex <= 0}>ก่อนหน้า</button>
                          <div style={{ fontSize: 12, color: 'var(--mu)', alignSelf: 'center' }}>รูป {marketDetailIndex + 1}/{marketDetailImages.length}</div>
                          <button type="button" className="btn btn-xs btn-o" onClick={() => setMarketDetailIndex((idx) => Math.min(marketDetailImages.length - 1, idx + 1))} disabled={marketDetailIndex >= marketDetailImages.length - 1}>ถัดไป</button>
                        </div>
                      )}
                    </>
                  )}
                </section>
              </div>
              <div className="house-md-foot">
                <button className="btn btn-g" type="button" onClick={closeMarketDetailModal}>ปิด</button>
              </div>
            </div>
          </div>
        )}

        {showPdfViewerModal && (
          <div className="house-mo">
            <div className="house-md house-md--xl" style={{ '--house-md-max-w': '1120px', '--house-md-max-h': 'calc(100dvh - 36px)' }}>
              <div className="house-md-head">
                <div>
                  <div className="house-md-title">📄 {pdfViewerTitle}</div>
                  <div className="house-md-sub">อ่านเอกสารภายในระบบ</div>
                </div>
              </div>
              <div className="house-md-body" style={{ padding: 10, background: '#eef2f7' }}>
                <div style={{ border: '1px solid var(--bo)', borderRadius: 10, overflow: 'hidden', background: '#fff', height: 'calc(100dvh - 220px)', minHeight: 420 }}>
                  <iframe
                    title={pdfViewerTitle}
                    src={`${pdfViewerUrl}#view=FitH&toolbar=1&navpanes=0`}
                    style={{ width: '100%', height: '100%', border: 'none' }}
                  />
                </div>
              </div>
              <div className="house-md-foot">
                <a href={pdfViewerUrl} target="_blank" rel="noreferrer" className="btn btn-o" style={{ textDecoration: 'none' }}>↗ เปิดแท็บใหม่</a>
                <button className="btn btn-g" type="button" onClick={closePdfViewer}>ปิด</button>
              </div>
            </div>
          </div>
        )}

        {showPrintPreviewModal && (
          <div className="house-mo">
            <div className="house-md house-md--xl" style={{ '--house-md-max-w': '1120px', '--house-md-max-h': 'calc(100dvh - 36px)' }}>
              <div className="house-md-head">
                <div>
                  <div className="house-md-title">🖨 {printPreviewTitle}</div>
                  <div className="house-md-sub">แสดงตัวอย่างก่อนพิมพ์และดาวน์โหลดเอกสาร</div>
                </div>
              </div>
              <div className="house-md-body" style={{ padding: 10, background: '#eef2f7' }}>
                <div style={{ border: '1px solid var(--bo)', borderRadius: 10, overflow: 'hidden', background: '#fff', height: 'calc(100dvh - 220px)', minHeight: 420 }}>
                  <iframe
                    ref={printPreviewIframeRef}
                    title={printPreviewTitle}
                    srcDoc={printPreviewHtml}
                    style={{ width: '100%', height: '100%', border: 'none' }}
                  />
                </div>
              </div>
              <div className="house-md-foot">
                <button className="btn btn-o" type="button" onClick={downloadPreviewAsPdf} disabled={printPreviewExporting}>{printPreviewExporting ? 'กำลังสร้างไฟล์...' : '⬇ PDF'}</button>
                <button className="btn btn-o" type="button" onClick={downloadPreviewAsImage} disabled={printPreviewExporting}>{printPreviewExporting ? 'กำลังสร้างไฟล์...' : '⬇ Image'}</button>
                <button className="btn btn-a" type="button" onClick={handlePrintFromPreview} disabled={printPreviewExporting}>🖨 พิมพ์</button>
                <button className="btn btn-g" type="button" onClick={closePrintPreviewModal} disabled={printPreviewExporting}>ปิด</button>
              </div>
            </div>
          </div>
        )}

        <footer className="fixed bottom-0 right-0 left-0 sm:left-60 bg-white/80 border-t border-slate-200 px-6 py-3 text-center text-xs text-slate-500">
          <p>©VMS™ All Rights Reserved 2026 | version {APP_VERSION} | Built no : {BUILD_SHA} | Built date : {BUILD_DATE}</p>
        </footer>

      </div>
    </div>
  )
}
