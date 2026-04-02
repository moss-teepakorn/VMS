import React, { useEffect, useMemo, useState } from 'react'
import Swal from 'sweetalert2'
import {
  listDisbursements, createDisbursement, updateDisbursement,
  submitDisbursement, approveDisbursement, markPaidDisbursement, deleteDisbursement,
} from '../../lib/disbursements'
import { listPartners } from '../../lib/partners'
import { listPaymentItemTypes } from '../../lib/paymentItemTypes'
import { getActiveBoardMembers } from '../../lib/boardSets'
import { getSetupConfig } from '../../lib/setup'
import { listHouses } from '../../lib/houses'

// ─── helpers ─────────────────────────────────────────────────────────────────
function fmt2(v) {
  return Number(v || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function fmtDate(str) {
  if (!str) return '-'
  const d = new Date(str.includes('T') ? str : str + 'T00:00:00')
  return d.toLocaleDateString('th-TH', { year: 'numeric', month: '2-digit', day: '2-digit' })
}

function fmtMethod(m) {
  if (m === 'transfer') return 'โอนเงิน'
  if (m === 'cash') return 'เงินสด'
  if (m === 'cheque') return 'เช็ค'
  return m || '-'
}

const STATUS_MAP = {
  draft: { label: 'ร่าง', color: '#6b7280', bg: '#f3f4f6' },
  pending: { label: 'รออนุมัติ', color: '#d97706', bg: '#fffbeb' },
  approved: { label: 'อนุมัติแล้ว', color: '#1d4ed8', bg: '#eff6ff' },
  paid: { label: 'จ่ายแล้ว', color: '#16a34a', bg: '#f0fdf4' },
}

function StatusBadge({ status }) {
  const s = STATUS_MAP[status] || { label: status, color: '#6b7280', bg: '#f3f4f6' }
  return (
    <span style={{ display: 'inline-block', padding: '2px 9px', borderRadius: 20, fontSize: 11, fontWeight: 700, color: s.color, background: s.bg }}>
      {s.label}
    </span>
  )
}

const todayStr = () => new Date().toISOString().slice(0, 10)
const nowStr = () => new Date().toISOString().slice(0, 16)

const EMPTY_FORM = () => ({
  recipient_type: 'partner', partner_id: '', house_id: '',
  disbursement_date: todayStr(),
  payment_method: 'transfer', bank_name: '', bank_account_no: '', bank_account_name: '',
  vat_enabled: false, vat_rate: '7', vat_amount: '0.00',
  wht_enabled: false, wht_rate: '3', wht_amount: '0.00',
  note: '',
  items: [{ item_type_id: '', item_label: '', amount: '', note: '' }],
})

// ─── component ────────────────────────────────────────────────────────────────
export default function AdminFeatureExpensePayment() {
  const [disbursements, setDisbursements] = useState([])
  const [loading, setLoading] = useState(false)
  const [partners, setPartners] = useState([])
  const [houses, setHouses] = useState([])
  const [itemTypes, setItemTypes] = useState([])
  const [boardMembers, setBoardMembers] = useState([])
  const [setup, setSetup] = useState({})
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  const [showModal, setShowModal] = useState(false)
  const [modalMode, setModalMode] = useState('create')
  const [editingId, setEditingId] = useState('')
  const [form, setForm] = useState(EMPTY_FORM())
  const [saving, setSaving] = useState(false)

  const [approveTarget, setApproveTarget] = useState(null)
  const [approveForm, setApproveForm] = useState({ approver_id: '', approved_at: nowStr() })
  const [approving, setApproving] = useState(false)

  const [paidTarget, setPaidTarget] = useState(null)
  const [paidForm, setPaidForm] = useState({ payer_id: '', paid_at: nowStr() })
  const [markingPaid, setMarkingPaid] = useState(false)

  const formSubTotal = useMemo(() => form.items.reduce((s, i) => s + Number(i.amount || 0), 0), [form.items])
  const formVatAmount = form.vat_enabled ? +Number(form.vat_amount || 0).toFixed(2) : 0
  const formWhtAmount = form.wht_enabled ? +Number(form.wht_amount || 0).toFixed(2) : 0
  const formTotal = +(formSubTotal + formVatAmount - formWhtAmount).toFixed(2)

  const disburseNoById = useMemo(() => {
    const sorted = [...disbursements].sort((a, b) => {
      const ta = new Date(a.created_at || 0).getTime()
      const tb = new Date(b.created_at || 0).getTime()
      if (ta !== tb) return ta - tb
      return String(a.id || '').localeCompare(String(b.id || ''))
    })
    const dailyCount = {}
    const byId = {}
    for (const d of sorted) {
      const date = new Date(d.created_at || Date.now())
      const yy = String(date.getFullYear()).slice(-2)
      const mm = String(date.getMonth() + 1).padStart(2, '0')
      const dd = String(date.getDate()).padStart(2, '0')
      const key = `${yy}${mm}${dd}`
      const seq = Number(dailyCount[key] || 0) + 1
      dailyCount[key] = seq
      byId[d.id] = `EXP-${key}-${String(seq).padStart(3, '0')}`
    }
    return byId
  }, [disbursements])

  const summary = useMemo(() => ({
    draftCount: disbursements.filter((d) => d.status === 'draft').length,
    pendingCount: disbursements.filter((d) => d.status === 'pending').length,
    approvedCount: disbursements.filter((d) => d.status === 'approved').length,
    paidCount: disbursements.filter((d) => d.status === 'paid').length,
    approvedTotal: disbursements.filter((d) => d.status === 'approved').reduce((s, d) => s + Number(d.total_amount || 0), 0),
    paidTotal: disbursements.filter((d) => d.status === 'paid').reduce((s, d) => s + Number(d.total_amount || 0), 0),
  }), [disbursements])

  const filtered = useMemo(() => {
    let rows = disbursements
    if (statusFilter !== 'all') rows = rows.filter((d) => d.status === statusFilter)
    const kw = search.trim().toLowerCase()
    if (kw) {
      rows = rows.filter((d) => {
        const recipient = d.recipient_type === 'partner' ? (d.partners?.name || '') : `บ้านเลขที่ ${d.houses?.house_no || ''}`
        const no = disburseNoById[d.id] || ''
        const items = (d.disbursement_items || []).map((i) => i.item_label).join(' ')
        return no.toLowerCase().includes(kw) || recipient.toLowerCase().includes(kw) || items.toLowerCase().includes(kw) || (STATUS_MAP[d.status]?.label || '').includes(kw)
      })
    }
    return rows
  }, [disbursements, statusFilter, search, disburseNoById])

  const load = async () => {
    setLoading(true)
    try { setDisbursements(await listDisbursements()) } catch (err) { console.error(err) }
    setLoading(false)
  }

  useEffect(() => {
    load()
    Promise.all([listPartners({ onlyActive: true }), listPaymentItemTypes(), getActiveBoardMembers(), getSetupConfig(), listHouses()])
      .then(([p, it, bm, cfg, h]) => {
        setPartners(p || [])
        setItemTypes((it || []).filter((t) => t.is_active))
        setBoardMembers(bm || [])
        setSetup(cfg || {})
        setHouses(h || [])
      }).catch(console.error)
  }, [])

  const recipientLabel = (d) => {
    if (d.recipient_type === 'partner') return d.partners?.name || '-'
    if (d.recipient_type === 'house') return `บ้านเลขที่ ${d.houses?.house_no || '-'}${d.houses?.owner_name ? ` (${d.houses.owner_name})` : ''}`
    return '-'
  }

  const openCreate = () => { setModalMode('create'); setEditingId(''); setForm(EMPTY_FORM()); setShowModal(true) }

  const openEdit = (d) => {
    setModalMode('edit')
    setEditingId(d.id)
    const items = (d.disbursement_items || []).map((i) => ({ item_type_id: i.item_type_id || '', item_label: i.item_label || '', amount: String(Number(i.amount || 0)), note: i.note || '' }))
    setForm({
      recipient_type: d.recipient_type || 'partner', partner_id: d.partner_id || '', house_id: d.house_id || '',
      disbursement_date: d.disbursement_date || todayStr(),
      payment_method: d.payment_method || 'transfer', bank_name: d.bank_name || '', bank_account_no: d.bank_account_no || '', bank_account_name: d.bank_account_name || '',
      vat_enabled: !!d.vat_enabled, vat_rate: String(d.vat_rate ?? 7), vat_amount: String(Number(d.vat_amount || 0).toFixed(2)),
      wht_enabled: !!d.wht_enabled, wht_rate: String(d.wht_rate ?? 3), wht_amount: String(Number(d.wht_amount || 0).toFixed(2)),
      note: d.note || '',
      items: items.length > 0 ? items : [{ item_type_id: '', item_label: '', amount: '', note: '' }],
    })
    setShowModal(true)
  }

  const closeModal = () => { if (saving) return; setShowModal(false) }

  const handleSave = async () => {
    const payload = { ...form, vat_amount: formVatAmount, wht_amount: formWhtAmount, items: form.items.map((i) => ({ item_type_id: i.item_type_id || null, item_label: i.item_label, amount: Number(i.amount || 0), note: i.note || '' })) }
    try {
      setSaving(true)
      if (modalMode === 'edit' && editingId) await updateDisbursement(editingId, payload)
      else await createDisbursement(payload)
      closeModal()
      Swal.fire({ icon: 'success', title: modalMode === 'edit' ? 'บันทึกแล้ว' : 'สร้างรายการแล้ว', timer: 1100, showConfirmButton: false })
      load()
    } catch (err) { Swal.fire({ icon: 'error', title: 'ผิดพลาด', text: err.message }) }
    finally { setSaving(false) }
  }

  const handleSubmit = async (d) => {
    const res = await Swal.fire({ icon: 'question', title: 'ส่งอนุมัติรายการนี้?', text: `${disburseNoById[d.id] || ''} ยอด ${fmt2(d.total_amount)} บาท`, showCancelButton: true, confirmButtonText: 'ส่งอนุมัติ', cancelButtonText: 'ยกเลิก' })
    if (!res.isConfirmed) return
    try { await submitDisbursement(d.id); load(); Swal.fire({ icon: 'success', title: 'ส่งอนุมัติแล้ว', timer: 1000, showConfirmButton: false }) }
    catch (err) { Swal.fire({ icon: 'error', title: 'ผิดพลาด', text: err.message }) }
  }

  const handleDelete = async (d) => {
    const res = await Swal.fire({ icon: 'warning', title: 'ลบรายการนี้?', text: `${disburseNoById[d.id] || ''} ยอด ${fmt2(d.total_amount)} บาท`, showCancelButton: true, confirmButtonText: 'ลบ', cancelButtonText: 'ยกเลิก', confirmButtonColor: '#dc2626' })
    if (!res.isConfirmed) return
    try { await deleteDisbursement(d.id); load(); Swal.fire({ icon: 'success', title: 'ลบแล้ว', timer: 1000, showConfirmButton: false }) }
    catch (err) { Swal.fire({ icon: 'error', title: 'ผิดพลาด', text: err.message }) }
  }

  const openApprove = (d) => { setApproveTarget(d); setApproveForm({ approver_id: '', approved_at: nowStr() }) }
  const handleApprove = async () => {
    if (!approveForm.approver_id) return Swal.fire({ icon: 'warning', title: 'กรุณาเลือกผู้อนุมัติ' })
    try {
      setApproving(true)
      await approveDisbursement(approveTarget.id, approveForm.approver_id, approveForm.approved_at)
      setApproveTarget(null); load()
      Swal.fire({ icon: 'success', title: 'อนุมัติแล้ว', timer: 1100, showConfirmButton: false })
    } catch (err) { Swal.fire({ icon: 'error', title: 'ผิดพลาด', text: err.message }) }
    finally { setApproving(false) }
  }

  const openMarkPaid = (d) => { setPaidTarget(d); setPaidForm({ payer_id: '', paid_at: nowStr() }) }
  const handleMarkPaid = async () => {
    if (!paidForm.payer_id) return Swal.fire({ icon: 'warning', title: 'กรุณาเลือกผู้จ่ายเงิน' })
    try {
      setMarkingPaid(true)
      await markPaidDisbursement(paidTarget.id, paidForm.payer_id, paidForm.paid_at)
      setPaidTarget(null); load()
      Swal.fire({ icon: 'success', title: 'บันทึกจ่ายแล้ว', timer: 1100, showConfirmButton: false })
    } catch (err) { Swal.fire({ icon: 'error', title: 'ผิดพลาด', text: err.message }) }
    finally { setMarkingPaid(false) }
  }

  const handlePrint = (d) => {
    const disburseNo = disburseNoById[d.id] || 'EXP-??????'
    const recipient = recipientLabel(d)
    const items = d.disbursement_items || []
    const approverName = d.approver?.full_name || ''
    const approverPos = d.approver?.position || 'ผู้อนุมัติ'
    const payerName = d.payer?.full_name || ''
    const payerPos = d.payer?.position || 'ผู้จ่ายเงิน'
    const itemRows = items.map((item, idx) => `<tr><td style="text-align:center">${idx + 1}</td><td>${item.item_label}</td><td style="text-align:right">${fmt2(item.amount)}</td><td>${item.note || '-'}</td></tr>`).join('')
    const html = `<!DOCTYPE html><html><head><title>ใบสั่งจ่าย ${disburseNo}</title>
<link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;600;700&display=swap" rel="stylesheet">
<style>@page{size:A4;margin:0}*{box-sizing:border-box}html,body{font-family:'Sarabun','TH Sarabun New',Tahoma,sans-serif;margin:0;padding:0;color:#111827;background:#fff}.sheet{width:100%;padding:24px 28px;display:flex;flex-direction:column;gap:10px}.head{display:flex;justify-content:space-between;gap:12px;border:1px solid #cbd5e1;border-radius:4px;padding:10px 12px}.brand{display:flex;align-items:flex-start;gap:10px}.brand img{width:48px;height:48px;border-radius:6px;object-fit:cover;border:1px solid #cbd5e1}.doc{font-size:16px;font-weight:700}.village{font-size:11px;font-weight:600;margin-top:3px}.sub{font-size:9px;color:#6b7280;margin-top:2px}.doc-meta{font-size:10px;min-width:200px;display:flex;flex-direction:column;gap:3px}.doc-meta span{color:#6b7280;font-weight:500}.box{border:1px solid #cbd5e1;border-radius:4px;padding:10px 12px}.grid2{display:grid;grid-template-columns:1fr 1fr;gap:6px 10px}.grid2>div{display:flex;flex-direction:column;gap:2px}.grid2 span{font-size:9px;color:#6b7280}.grid2 strong{font-size:11px;font-weight:600}table{width:100%;border-collapse:collapse}th,td{border:1px solid #cbd5e1;padding:6px 8px;font-size:10px}th{background:#f1f5f9;font-weight:600;text-align:left}tfoot td{background:#f8fafc;font-weight:700;font-size:10px}.sign-row{display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;margin-top:4px}.sign-box{border:1px solid #cbd5e1;border-radius:4px;padding:10px 12px;text-align:center;font-size:9px;color:#6b7280}.sign-line{border-top:1px solid #94a3b8;margin:40px 8px 6px}.sign-label{font-size:10px;font-weight:600;color:#1e293b;margin-bottom:2px}.sign-pos{font-size:9px;color:#64748b}</style>
</head><body><div class="sheet">
<div class="head"><div class="brand">${setup.loginCircleLogoUrl ? `<img src="${setup.loginCircleLogoUrl}" alt="logo">` : ''}<div><div class="doc">ใบสั่งจ่าย / ใบสำคัญจ่าย</div><div class="village">${setup.villageName || 'Village Management System'}</div><div class="sub">${setup.address || ''}</div></div></div>
<div class="doc-meta"><div><span>เลขที่:</span> <strong>${disburseNo}</strong></div><div><span>วันที่จ่าย:</span> <strong>${fmtDate(d.disbursement_date)}</strong></div><div><span>วิธีชำระ:</span> <strong>${fmtMethod(d.payment_method)}</strong></div>${d.bank_name || d.bank_account_no ? `<div><span>ธนาคาร/บัญชี:</span> <strong>${d.bank_name || ''} ${d.bank_account_no || ''} ${d.bank_account_name || ''}</strong></div>` : ''}<div><span>สถานะ:</span> <strong>${STATUS_MAP[d.status]?.label || d.status}</strong></div></div></div>
<div class="box"><div class="grid2"><div><span>ผู้รับเงิน</span><strong>${recipient}</strong></div>${d.recipient_type === 'partner' && d.partners?.tax_id ? `<div><span>เลขที่ผู้เสียภาษี</span><strong>${d.partners.tax_id}</strong></div>` : '<div></div>'}</div></div>
<div class="box"><table><thead><tr><th style="width:36px;text-align:center">ลำดับ</th><th>รายการ</th><th style="width:130px;text-align:right">จำนวนเงิน (บาท)</th><th style="width:120px">หมายเหตุ</th></tr></thead><tbody>${itemRows}</tbody><tfoot><tr><td colspan="2" style="text-align:right">ยอดก่อนภาษี</td><td style="text-align:right">${fmt2(d.sub_total)}</td><td></td></tr>${d.vat_enabled ? `<tr><td colspan="2" style="text-align:right">ภาษีมูลค่าเพิ่ม ${d.vat_rate}%</td><td style="text-align:right">${fmt2(d.vat_amount)}</td><td></td></tr>` : ''}${d.wht_enabled ? `<tr><td colspan="2" style="text-align:right">หัก ณ ที่จ่าย ${d.wht_rate}%</td><td style="text-align:right">(${fmt2(d.wht_amount)})</td><td></td></tr>` : ''}<tr><td colspan="2" style="text-align:right"><strong>ยอดสุทธิ</strong></td><td style="text-align:right"><strong>${fmt2(d.total_amount)}</strong></td><td></td></tr></tfoot></table>${d.note ? `<div style="padding-top:6px;font-size:10px;color:#4b5563;border-top:1px dashed #d1d5db;margin-top:4px">หมายเหตุ: ${d.note}</div>` : ''}</div>
<div class="sign-row"><div class="sign-box"><div class="sign-label">ผู้จัดทำ</div><div class="sign-line"></div><div class="sign-pos">ผู้จัดทำรายการ</div></div><div class="sign-box">${setup.juristicSignatureUrl ? `<img src="${setup.juristicSignatureUrl}" alt="" style="max-height:44px;display:block;margin:0 auto 4px;object-fit:contain">` : ''}<div class="sign-line"></div><div class="sign-label">${approverName || '............................................'}</div><div class="sign-pos">${approverPos}</div>${d.approved_at ? `<div style="font-size:9px;color:#6b7280;margin-top:2px">${fmtDate(d.approved_at)}</div>` : ''}</div><div class="sign-box"><div class="sign-line"></div><div class="sign-label">${payerName || '............................................'}</div><div class="sign-pos">${payerPos}</div>${d.paid_at ? `<div style="font-size:9px;color:#6b7280;margin-top:2px">${fmtDate(d.paid_at)}</div>` : ''}</div></div>
</div><script>window.onload=()=>window.print()</script></body></html>`
    const popup = window.open('', '_blank', 'width=900,height=800')
    if (!popup) { Swal.fire({ icon: 'warning', title: 'ไม่สามารถเปิดหน้าพิมพ์ได้', text: 'กรุณาอนุญาต popup ของเบราว์เซอร์' }); return }
    popup.document.write(html)
    popup.document.close()
  }

  const addItem = () => setForm((p) => ({ ...p, items: [...p.items, { item_type_id: '', item_label: '', amount: '', note: '' }] }))
  const removeItem = (idx) => setForm((p) => ({ ...p, items: p.items.filter((_, i) => i !== idx) }))
  const updateItem = (idx, field, value) => setForm((p) => {
    const next = [...p.items]
    next[idx] = { ...next[idx], [field]: value }
    if (field === 'item_type_id' && value) {
      const t = itemTypes.find((t) => t.id === value)
      if (t) { next[idx].item_label = t.label; if (!next[idx].amount) next[idx].amount = String(Number(t.default_amount || 0)) }
    }
    return { ...p, items: next }
  })

  const handleItemAmountChange = (idx, value) => {
    const nextItems = form.items.map((it, i) => i === idx ? { ...it, amount: value } : it)
    setForm((p) => {
      const sub = nextItems.reduce((s, i) => s + Number(i.amount || 0), 0)
      const updates = { items: nextItems }
      if (p.vat_enabled) updates.vat_amount = String(+(sub * Number(p.vat_rate || 0) / 100).toFixed(2))
      if (p.wht_enabled) updates.wht_amount = String(+(sub * Number(p.wht_rate || 0) / 100).toFixed(2))
      return { ...p, ...updates }
    })
  }

  const statCards = [
    { ico: '📝', cls: '', label: 'ร่าง', v: summary.draftCount, s: null, key: 'draft' },
    { ico: '⏳', cls: 'w', label: 'รออนุมัติ', v: summary.pendingCount, s: null, key: 'pending' },
    { ico: '✅', cls: 'p', label: 'อนุมัติแล้ว', v: summary.approvedCount, s: `${fmt2(summary.approvedTotal)} บาท`, key: 'approved' },
    { ico: '💸', cls: 'a', label: 'จ่ายแล้ว', v: summary.paidCount, s: `${fmt2(summary.paidTotal)} บาท`, key: 'paid' },
  ]

  return (
    <div className="pane on houses-compact fees-compact disbursements-compact">

      <div className="ph houses-ph">
        <div className="ph-in">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div className="ph-ico">📤</div>
            <div>
              <div className="ph-h1">การจ่ายเงิน</div>
              <div className="ph-sub">รายการจ่ายเงินออกนิติบุคคล</div>
            </div>
          </div>
        </div>
      </div>

      <div className="stats">
        {statCards.map((c) => (
          <div key={c.key} className="sc" style={{ cursor: 'pointer', outline: statusFilter === c.key ? '2px solid #1E40AF' : undefined, outlineOffset: 2 }} onClick={() => setStatusFilter((p) => p === c.key ? 'all' : c.key)}>
            <div className={`sc-ico ${c.cls}`}>{c.ico}</div>
            <div className="sc-v">{c.v}</div>
            <div className="sc-l">{c.label}</div>
            {c.s && <div className="sc-s">{c.s}</div>}
          </div>
        ))}
      </div>

      <div className="card houses-main-card">
        <div className="ch houses-list-head houses-main-head">
          <div className="ct">รายการจ่ายเงิน{statusFilter !== 'all' ? ` — ${STATUS_MAP[statusFilter]?.label || ''}` : ''}</div>
          <div className="houses-list-actions" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input
              placeholder="ค้นหา..." value={search} onChange={(e) => setSearch(e.target.value)}
              style={{ width: 160, padding: '4px 8px', borderRadius: 6, border: '1.5px solid rgba(255,255,255,0.35)', background: 'rgba(255,255,255,0.15)', color: '#fff', fontSize: 12, outline: 'none' }}
            />
            <button className="btn btn-p btn-sm" onClick={openCreate}>+ สร้างรายการ</button>
          </div>
        </div>
        <div className="cb houses-table-card-body houses-main-body">
          <div className="houses-table-wrap houses-main-wrap disbursements-table-wrap">
            <table className="tw houses-table houses-main-table" style={{ width: '100%', minWidth: 880 }}>
              <thead>
                <tr>
                  <th>เลขที่จ่าย</th><th>ผู้รับเงิน</th><th>รายการ</th><th>วันที่</th>
                  <th style={{ textAlign: 'right' }}>ยอดสุทธิ (บาท)</th><th>สถานะ</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading && <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--mu)', padding: '24px 0' }}>กำลังโหลด...</td></tr>}
                {!loading && filtered.length === 0 && <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--mu)', padding: '24px 0' }}>ไม่พบรายการ</td></tr>}
                {!loading && filtered.map((d) => {
                  const labels = (d.disbursement_items || []).map((i) => i.item_label)
                  const itemsSummary = labels.length === 0 ? '-' : labels.length <= 2 ? labels.join(', ') : `${labels.slice(0, 2).join(', ')} +${labels.length - 2} รายการ`
                  const canEdit = d.status === 'draft' || d.status === 'pending'
                  return (
                    <tr key={d.id}>
                      <td style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{disburseNoById[d.id] || '-'}</td>
                      <td>{recipientLabel(d)}</td>
                      <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{itemsSummary}</td>
                      <td style={{ whiteSpace: 'nowrap' }}>{fmtDate(d.disbursement_date)}</td>
                      <td style={{ textAlign: 'right', fontWeight: 600 }}>{fmt2(d.total_amount)}</td>
                      <td><StatusBadge status={d.status} /></td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        {canEdit && <button className="btn btn-xs btn-o" onClick={() => openEdit(d)}>แก้ไข</button>}
                        {d.status === 'draft' && <button className="btn btn-xs btn-p" style={{ marginLeft: 4 }} onClick={() => handleSubmit(d)}>ส่งอนุมัติ</button>}
                        {d.status === 'pending' && <button className="btn btn-xs btn-p" style={{ marginLeft: 4 }} onClick={() => openApprove(d)}>อนุมัติ</button>}
                        {d.status === 'approved' && <button className="btn btn-xs btn-p" style={{ marginLeft: 4 }} onClick={() => openMarkPaid(d)}>บันทึกจ่าย</button>}
                        {(d.status === 'approved' || d.status === 'paid') && <button className="btn btn-xs btn-o" style={{ marginLeft: 4 }} onClick={() => handlePrint(d)}>🖨 พิมพ์</button>}
                        {canEdit && <button className="btn btn-xs btn-dg" style={{ marginLeft: 4 }} onClick={() => handleDelete(d)}>ลบ</button>}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="house-mo">
          <div className="house-md house-md--md">
            <div className="house-md-head">
              <div>
                <div className="house-md-title">{modalMode === 'edit' ? 'แก้ไขรายการจ่ายเงิน' : 'สร้างรายการจ่ายเงิน'}</div>
                <div className="house-md-sub">ข้อมูลการจ่ายเงินออกนิติบุคคล</div>
              </div>
            </div>
            <div className="house-md-body">
              <section className="house-sec">
                <div style={{ fontWeight: 700, fontSize: 11, color: 'var(--mu)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>ผู้รับเงิน</div>
                <div className="house-grid" style={{ gridTemplateColumns: '1fr 2fr', gap: 10, marginBottom: 12 }}>
                  <label className="house-field">
                    <span>ประเภท</span>
                    <select value={form.recipient_type} onChange={(e) => setForm((p) => ({ ...p, recipient_type: e.target.value, partner_id: '', house_id: '' }))}>
                      <option value="partner">คู่ค้า / บุคคลภายนอก</option>
                      <option value="house">บ้านในโครงการ</option>
                    </select>
                  </label>
                  {form.recipient_type === 'partner' ? (
                    <label className="house-field">
                      <span>คู่ค้า *</span>
                      <select value={form.partner_id} onChange={(e) => setForm((p) => ({ ...p, partner_id: e.target.value }))}>
                        <option value="">— เลือกคู่ค้า —</option>
                        {partners.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                    </label>
                  ) : (
                    <label className="house-field">
                      <span>บ้านเลขที่ *</span>
                      <select value={form.house_id} onChange={(e) => setForm((p) => ({ ...p, house_id: e.target.value }))}>
                        <option value="">— เลือกบ้าน —</option>
                        {houses.map((h) => <option key={h.id} value={h.id}>{h.house_no}{h.owner_name ? ` — ${h.owner_name}` : ''}</option>)}
                      </select>
                    </label>
                  )}
                </div>

                <div className="house-grid" style={{ gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 12 }}>
                  <label className="house-field">
                    <span>วันที่จ่าย *</span>
                    <input type="date" value={form.disbursement_date} onChange={(e) => setForm((p) => ({ ...p, disbursement_date: e.target.value }))} />
                  </label>
                  <label className="house-field">
                    <span>วิธีชำระ</span>
                    <select value={form.payment_method} onChange={(e) => setForm((p) => ({ ...p, payment_method: e.target.value }))}>
                      <option value="transfer">โอนเงิน</option>
                      <option value="cash">เงินสด</option>
                      <option value="cheque">เช็ค</option>
                    </select>
                  </label>
                  <label className="house-field">
                    <span>ธนาคาร</span>
                    <input value={form.bank_name} onChange={(e) => setForm((p) => ({ ...p, bank_name: e.target.value }))} placeholder="เช่น ธนาคารไทยพาณิชย์" />
                  </label>
                </div>
                {form.payment_method !== 'cash' && (
                  <div className="house-grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
                    <label className="house-field">
                      <span>เลขบัญชี</span>
                      <input value={form.bank_account_no} onChange={(e) => setForm((p) => ({ ...p, bank_account_no: e.target.value }))} />
                    </label>
                    <label className="house-field">
                      <span>ชื่อบัญชี</span>
                      <input value={form.bank_account_name} onChange={(e) => setForm((p) => ({ ...p, bank_account_name: e.target.value }))} />
                    </label>
                  </div>
                )}

                <div style={{ fontWeight: 700, fontSize: 11, color: 'var(--mu)', margin: '4px 0 8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>รายการ</div>
                <div style={{ overflowX: 'auto', marginBottom: 8 }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 560 }}>
                    <thead>
                      <tr>
                        <th style={{ width: 32, textAlign: 'center', padding: '5px 4px', border: '1px solid var(--bo)', background: 'var(--bgl)', fontSize: 11 }}>#</th>
                        <th style={{ width: 148, padding: '5px 6px', border: '1px solid var(--bo)', background: 'var(--bgl)', fontSize: 11 }}>ประเภท</th>
                        <th style={{ padding: '5px 6px', border: '1px solid var(--bo)', background: 'var(--bgl)', fontSize: 11 }}>รายการ *</th>
                        <th style={{ width: 98, padding: '5px 6px', border: '1px solid var(--bo)', background: 'var(--bgl)', fontSize: 11 }}>จำนวนเงิน *</th>
                        <th style={{ width: 96, padding: '5px 6px', border: '1px solid var(--bo)', background: 'var(--bgl)', fontSize: 11 }}>หมายเหตุ</th>
                        <th style={{ width: 28, border: '1px solid var(--bo)', background: 'var(--bgl)' }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {form.items.map((item, idx) => (
                        <tr key={idx}>
                          <td style={{ textAlign: 'center', padding: '4px', border: '1px solid var(--bo)', fontSize: 11, color: 'var(--mu)' }}>{idx + 1}</td>
                          <td style={{ padding: '3px', border: '1px solid var(--bo)' }}>
                            <select style={{ width: '100%', border: 'none', outline: 'none', background: 'transparent', fontSize: 11, padding: '2px' }} value={item.item_type_id} onChange={(e) => updateItem(idx, 'item_type_id', e.target.value)}>
                              <option value="">— ประเภท —</option>
                              {itemTypes.map((t) => <option key={t.id} value={t.id}>{t.code} — {t.label}</option>)}
                            </select>
                          </td>
                          <td style={{ padding: '3px', border: '1px solid var(--bo)' }}>
                            <input style={{ width: '100%', border: 'none', outline: 'none', background: 'transparent', fontSize: 11, padding: '2px 3px' }} value={item.item_label} onChange={(e) => updateItem(idx, 'item_label', e.target.value)} placeholder="ชื่อรายการ" />
                          </td>
                          <td style={{ padding: '3px', border: '1px solid var(--bo)' }}>
                            <input type="number" style={{ width: '100%', border: 'none', outline: 'none', background: 'transparent', fontSize: 11, padding: '2px 3px', textAlign: 'right' }} value={item.amount} min={0} onChange={(e) => handleItemAmountChange(idx, e.target.value)} />
                          </td>
                          <td style={{ padding: '3px', border: '1px solid var(--bo)' }}>
                            <input style={{ width: '100%', border: 'none', outline: 'none', background: 'transparent', fontSize: 11, padding: '2px 3px' }} value={item.note} onChange={(e) => updateItem(idx, 'note', e.target.value)} />
                          </td>
                          <td style={{ textAlign: 'center', padding: '3px 2px', border: '1px solid var(--bo)' }}>
                            {form.items.length > 1 && <button type="button" onClick={() => removeItem(idx)} style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: 13, lineHeight: 1 }}>✕</button>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <button type="button" className="btn btn-xs btn-o" onClick={addItem} style={{ marginBottom: 12 }}>+ เพิ่มรายการ</button>

                <div style={{ background: 'var(--bgl)', borderRadius: 8, padding: '12px 14px', marginBottom: 12 }}>
                  <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 10 }}>ภาษีและยอดรวม</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'flex-end', marginBottom: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, cursor: 'pointer' }}>
                        <input type="checkbox" checked={form.vat_enabled} onChange={(e) => { const en = e.target.checked; const sub = form.items.reduce((s, i) => s + Number(i.amount || 0), 0); setForm((p) => ({ ...p, vat_enabled: en, vat_amount: en ? String(+(sub * Number(p.vat_rate || 7) / 100).toFixed(2)) : '0.00' })) }} />
                        ภาษีมูลค่าเพิ่ม
                      </label>
                      {form.vat_enabled && (
                        <>
                          <input type="number" min={0} max={100} style={{ width: 52, padding: '3px 5px', borderRadius: 4, border: '1px solid var(--bo)', fontSize: 12, textAlign: 'right' }} value={form.vat_rate} onChange={(e) => { const r = e.target.value; const sub = form.items.reduce((s, i) => s + Number(i.amount || 0), 0); setForm((p) => ({ ...p, vat_rate: r, vat_amount: String(+(sub * Number(r || 0) / 100).toFixed(2)) })) }} />
                          <span style={{ fontSize: 11 }}>%</span>
                          <input type="number" min={0} style={{ width: 84, padding: '3px 5px', borderRadius: 4, border: '1px solid var(--bo)', fontSize: 12, textAlign: 'right' }} value={form.vat_amount} onChange={(e) => setForm((p) => ({ ...p, vat_amount: e.target.value }))} />
                          <span style={{ fontSize: 11, color: 'var(--mu)' }}>บาท</span>
                        </>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, cursor: 'pointer' }}>
                        <input type="checkbox" checked={form.wht_enabled} onChange={(e) => { const en = e.target.checked; const sub = form.items.reduce((s, i) => s + Number(i.amount || 0), 0); setForm((p) => ({ ...p, wht_enabled: en, wht_amount: en ? String(+(sub * Number(p.wht_rate || 3) / 100).toFixed(2)) : '0.00' })) }} />
                        หัก ณ ที่จ่าย
                      </label>
                      {form.wht_enabled && (
                        <>
                          <input type="number" min={0} max={100} style={{ width: 52, padding: '3px 5px', borderRadius: 4, border: '1px solid var(--bo)', fontSize: 12, textAlign: 'right' }} value={form.wht_rate} onChange={(e) => { const r = e.target.value; const sub = form.items.reduce((s, i) => s + Number(i.amount || 0), 0); setForm((p) => ({ ...p, wht_rate: r, wht_amount: String(+(sub * Number(r || 0) / 100).toFixed(2)) })) }} />
                          <span style={{ fontSize: 11 }}>%</span>
                          <input type="number" min={0} style={{ width: 84, padding: '3px 5px', borderRadius: 4, border: '1px solid var(--bo)', fontSize: 12, textAlign: 'right' }} value={form.wht_amount} onChange={(e) => setForm((p) => ({ ...p, wht_amount: e.target.value }))} />
                          <span style={{ fontSize: 11, color: 'var(--mu)' }}>บาท</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div style={{ borderTop: '1px dashed var(--bo)', paddingTop: 10, display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-end' }}>
                    <div style={{ fontSize: 12 }}>ยอดก่อนภาษี: <strong>{fmt2(formSubTotal)} บาท</strong></div>
                    {form.vat_enabled && <div style={{ fontSize: 12 }}>ภาษีมูลค่าเพิ่ม: <strong>+{fmt2(formVatAmount)} บาท</strong></div>}
                    {form.wht_enabled && <div style={{ fontSize: 12 }}>หัก ณ ที่จ่าย: <strong>-{fmt2(formWhtAmount)} บาท</strong></div>}
                    <div style={{ fontSize: 14, fontWeight: 800, color: '#1E40AF', marginTop: 2 }}>ยอดสุทธิ: {fmt2(formTotal)} บาท</div>
                  </div>
                </div>

                <label className="house-field">
                  <span>หมายเหตุ</span>
                  <input value={form.note} onChange={(e) => setForm((p) => ({ ...p, note: e.target.value }))} placeholder="หมายเหตุเพิ่มเติม (ถ้ามี)" />
                </label>
              </section>
            </div>
            <div className="house-md-foot">
              <button className="btn btn-p" type="button" disabled={saving} onClick={handleSave}>{saving ? 'กำลังบันทึก...' : 'บันทึก'}</button>
              <button className="btn btn-g" type="button" disabled={saving} onClick={closeModal}>ยกเลิก</button>
            </div>
          </div>
        </div>
      )}

      {/* Approve Modal */}
      {approveTarget && (
        <div className="house-mo">
          <div className="house-md house-md--sm">
            <div className="house-md-head">
              <div>
                <div className="house-md-title">อนุมัติรายการจ่ายเงิน</div>
                <div className="house-md-sub">{disburseNoById[approveTarget.id] || ''} — {fmt2(approveTarget.total_amount)} บาท</div>
              </div>
            </div>
            <div className="house-md-body">
              <section className="house-sec">
                <div className="house-grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <label className="house-field">
                    <span>ผู้อนุมัติ (กรรมการ) *</span>
                    <select value={approveForm.approver_id} onChange={(e) => setApproveForm((p) => ({ ...p, approver_id: e.target.value }))}>
                      <option value="">— เลือกกรรมการ —</option>
                      {boardMembers.map((m) => <option key={m.id} value={m.id}>{m.full_name} ({m.position})</option>)}
                    </select>
                  </label>
                  <label className="house-field">
                    <span>วันที่อนุมัติ</span>
                    <input type="datetime-local" value={approveForm.approved_at} onChange={(e) => setApproveForm((p) => ({ ...p, approved_at: e.target.value }))} />
                  </label>
                </div>
              </section>
            </div>
            <div className="house-md-foot">
              <button className="btn btn-p" type="button" disabled={approving} onClick={handleApprove}>{approving ? 'กำลังอนุมัติ...' : 'อนุมัติ'}</button>
              <button className="btn btn-g" type="button" disabled={approving} onClick={() => setApproveTarget(null)}>ยกเลิก</button>
            </div>
          </div>
        </div>
      )}

      {/* Mark Paid Modal */}
      {paidTarget && (
        <div className="house-mo">
          <div className="house-md house-md--sm">
            <div className="house-md-head">
              <div>
                <div className="house-md-title">บันทึกการจ่ายเงิน</div>
                <div className="house-md-sub">{disburseNoById[paidTarget.id] || ''} — {fmt2(paidTarget.total_amount)} บาท</div>
              </div>
            </div>
            <div className="house-md-body">
              <section className="house-sec">
                <div className="house-grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <label className="house-field">
                    <span>ผู้จ่ายเงิน (กรรมการ) *</span>
                    <select value={paidForm.payer_id} onChange={(e) => setPaidForm((p) => ({ ...p, payer_id: e.target.value }))}>
                      <option value="">— เลือกกรรมการ —</option>
                      {boardMembers.map((m) => <option key={m.id} value={m.id}>{m.full_name} ({m.position})</option>)}
                    </select>
                  </label>
                  <label className="house-field">
                    <span>วันที่จ่าย</span>
                    <input type="datetime-local" value={paidForm.paid_at} onChange={(e) => setPaidForm((p) => ({ ...p, paid_at: e.target.value }))} />
                  </label>
                </div>
              </section>
            </div>
            <div className="house-md-foot">
              <button className="btn btn-p" type="button" disabled={markingPaid} onClick={handleMarkPaid}>{markingPaid ? 'กำลังบันทึก...' : 'บันทึกจ่าย'}</button>
              <button className="btn btn-g" type="button" disabled={markingPaid} onClick={() => setPaidTarget(null)}>ยกเลิก</button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
