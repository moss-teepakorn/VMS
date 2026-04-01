import React, { useEffect, useMemo, useRef, useState } from 'react'
import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'
import Swal from 'sweetalert2'
import { listPaymentItemTypes } from '../../lib/paymentItemTypes'
import { listHouses } from '../../lib/houses'
import { createPayment, listPaymentsByMonth, listPaymentMonthOptions } from '../../lib/fees'
import { listPartners } from '../../lib/partners'
import { getSetupConfig } from '../../lib/setup'
import villageLogo from '../../assets/village-logo.svg'
import './AdminFeatureReceivePayment.css'

function fmtCurrency(v) {
  const n = Number(v || 0)
  if (!Number.isFinite(n)) return '-'
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function formatDateTime(value) {
  if (!value) return '-'
  return new Date(value).toLocaleString('th-TH', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatMethod(method) {
  if (method === 'transfer') return 'โอนเงิน'
  if (method === 'cash') return 'เงินสด'
  if (method === 'qr') return 'QR'
  return method || '-'
}

function buildMonthLabel(year, month) {
  const d = new Date(year, month - 1, 1)
  return d.toLocaleString('th-TH', { month: 'long', year: 'numeric' })
}

function buildMonthTimeline(currentYear, currentMonth, earliestYear, earliestMonth) {
  const out = []
  let y = currentYear
  let m = currentMonth

  while (y > earliestYear || (y === earliestYear && m >= earliestMonth)) {
    out.push({ key: `${y}-${String(m).padStart(2, '0')}`, year: y, month: m })
    m -= 1
    if (m <= 0) {
      m = 12
      y -= 1
    }
  }
  return out
}

export default function AdminFeatureReceivePayment() {
  const [items, setItems] = useState([])
  const [houses, setHouses] = useState([])
  const [partners, setPartners] = useState([])
  const [payments, setPayments] = useState([])
  const [monthOptions, setMonthOptions] = useState([])
  const [selectedMonthKey, setSelectedMonthKey] = useState('')
  const [selected, setSelected] = useState([])
  const [payerType, setPayerType] = useState('resident')
  const [selectedHouseId, setSelectedHouseId] = useState('')
  const [selectedPartnerId, setSelectedPartnerId] = useState('')
  const [method, setMethod] = useState('transfer')
  const [paidAt, setPaidAt] = useState(() => new Date().toISOString().slice(0, 16))
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingTable, setLoadingTable] = useState(false)
  const [setup, setSetup] = useState({ villageName: 'The Greenfield' })
  const [detailPayment, setDetailPayment] = useState(null)
  const [receiptTarget, setReceiptTarget] = useState(null)
  const [showReceiptActionModal, setShowReceiptActionModal] = useState(false)
  const [runningReceiptAction, setRunningReceiptAction] = useState(false)
  const [pendingItemId, setPendingItemId] = useState('')
  const itemPickerRef = useRef(null)

  // UX: focus the first control so operators can start quickly.
  useEffect(() => {
    itemPickerRef.current?.focus()
  }, [])

  useEffect(() => {
    (async () => {
      try {
        const [it, hs, ps, cfg, monthRows] = await Promise.all([
          listPaymentItemTypes({ onlyActive: true }),
          listHouses({ status: 'normal' }),
          listPartners({ onlyActive: true }),
          getSetupConfig().catch(() => ({})),
          listPaymentMonthOptions().catch(() => []),
        ])
        setItems(it || [])
        setHouses(hs || [])
        setPartners(ps || [])
        setSetup(cfg || {})

        const now = new Date()
        const currentYear = now.getFullYear()
        const currentMonth = now.getMonth() + 1
        const earliest = (monthRows || []).slice().sort((a, b) => {
          if (a.year !== b.year) return a.year - b.year
          return a.month - b.month
        })[0]
        const earliestYear = earliest?.year || currentYear
        const earliestMonth = earliest?.month || currentMonth

        const currentKey = `${currentYear}-${String(currentMonth).padStart(2, '0')}`
        setMonthOptions(buildMonthTimeline(currentYear, currentMonth, earliestYear, earliestMonth))
        setSelectedMonthKey(currentKey)
      } catch (err) {
        console.error(err)
        Swal.fire({ icon: 'error', title: 'ไม่สามารถโหลดข้อมูล', text: err.message })
      }
    })()
  }, [])

  useEffect(() => {
    if (!selectedMonthKey) return
    const [y, m] = selectedMonthKey.split('-')
    const year = Number(y)
    const month = Number(m)
    if (!year || !month) return

    ;(async () => {
      try {
        setLoadingTable(true)
        const rows = await listPaymentsByMonth({ year, month })
        setPayments(rows || [])
      } catch (err) {
        Swal.fire({ icon: 'error', title: 'โหลดรายการรับชำระไม่สำเร็จ', text: err.message })
      } finally {
        setLoadingTable(false)
      }
    })()
  }, [selectedMonthKey])

  const addItem = (item) => {
    setSelected((cur) => {
      const exists = cur.some((row) => row.item_type_id === item.id)
      if (exists) return cur
      return [...cur, {
        item_type_id: item.id,
        code: item.code,
        label: item.label,
        due_amount: Number(item.default_amount || 0),
        paid_amount: Number(item.default_amount || 0),
      }]
    })
  }

  const handleAddPendingItem = () => {
    if (!pendingItemId) return
    const selectedItem = items.find((x) => x.id === pendingItemId)
    if (selectedItem) addItem(selectedItem)
    setPendingItemId('')
    itemPickerRef.current?.focus()
  }

  const handleItemPickerKeyDown = (event) => {
    if (event.key !== 'Enter') return
    event.preventDefault()
    handleAddPendingItem()
  }

  const removeItem = (index) => setSelected((cur) => cur.filter((_, i) => i !== index))

  const updateItemAmount = (index, value) => {
    setSelected((cur) => cur.map((r, i) => i === index ? { ...r, paid_amount: Number(value || 0) } : r))
  }

  const total = selected.reduce((s, r) => s + Number(r.paid_amount || 0), 0)

  const selectedPartner = useMemo(
    () => partners.find((p) => p.id === selectedPartnerId) || null,
    [partners, selectedPartnerId],
  )

  const handleSubmit = async () => {
    if (selected.length === 0) return Swal.fire({ icon: 'warning', title: 'ไม่มีรายการ', text: 'กรุณาเพิ่มรายการก่อนรับชำระ' })
    if (payerType === 'resident' && !selectedHouseId) return Swal.fire({ icon: 'warning', title: 'เลือกบ้าน', text: 'กรุณาเลือกบ้านผู้ชำระ' })
    if (payerType === 'external' && !selectedPartnerId) return Swal.fire({ icon: 'warning', title: 'เลือกคู่ค้า', text: 'กรุณาเลือกคู่ค้าภายนอกจาก Setup' })

    const payload = {
      fee_id: null,
      house_id: payerType === 'resident' ? selectedHouseId : null,
      amount: total,
      payment_method: method,
      paid_at: paidAt ? new Date(paidAt).toISOString() : new Date().toISOString(),
      note: note?.trim() || null,
      payer_type: payerType === 'resident' ? 'resident' : 'external',
      payer_name: payerType === 'external' ? selectedPartner?.name : undefined,
      payer_contact: payerType === 'external' ? selectedPartner?.phone : undefined,
      payer_tax_id: payerType === 'external' ? selectedPartner?.tax_id : undefined,
      payer_address: payerType === 'external' ? selectedPartner?.address : undefined,
      partner_id: payerType === 'external' ? selectedPartner?.id : undefined,
      payment_items: selected.map((s, idx) => ({ item_key: `item_${idx+1}`, item_label: s.label, due_amount: Number(s.due_amount || 0), paid_amount: Number(s.paid_amount || 0) })),
    }

    setLoading(true)
    try {
      const data = await createPayment(payload)
      setLoading(false)
      Swal.fire({
        icon: 'success',
        title: 'บันทึกสำเร็จ',
        toast: true,
        timer: 1800,
        position: 'top-end',
        showConfirmButton: false,
      })
      await refreshCurrentMonth()
      setReceiptTarget(data)
      setShowReceiptActionModal(true)
      setSelected([])
      setSelectedHouseId('')
      setSelectedPartnerId('')
      setNote('')
      setPaidAt(new Date().toISOString().slice(0, 16))
      itemPickerRef.current?.focus()
    } catch (err) {
      setLoading(false)
      Swal.fire({ icon: 'error', title: 'ผิดพลาด', text: err.message })
    }
  }

  const refreshCurrentMonth = async () => {
    if (!selectedMonthKey) return
    const [y, m] = selectedMonthKey.split('-')
    const rows = await listPaymentsByMonth({ year: Number(y), month: Number(m) })
    setPayments(rows || [])
  }

  const buildReceiptHtml = (payment, { autoPrint = false, forCapture = false } = {}) => {
    const logo = setup.loginCircleLogoUrl || villageLogo
    const itemRows = (payment.payment_items || []).map((i, index) => `
      <tr>
        <td class="c">${index + 1}</td>
        <td>${i.item_label || '-'}</td>
        <td class="r">${fmtCurrency(i.due_amount)}</td>
        <td class="r">${fmtCurrency(i.paid_amount)}</td>
      </tr>
    `).join('')
    const payer = payment.payer_name || payment.houses?.owner_name || '-'
    const receiptNo = payment.receipt_no || payment.id
    const totalPaid = Number(payment.amount || 0)
    const paidDate = formatDateTime(payment.paid_at)

    const renderSheet = (copyLabel) => `
      <div class="sheet page-break">
        <div class="head">
          <div class="brand">
            <img src="${logo}" alt="logo" />
            <div>
              <div class="doc">ใบเสร็จรับเงิน</div>
              <div class="village">${setup.villageName || 'Village Management System'}</div>
              <div class="sub">${setup.address || '-'}</div>
            </div>
          </div>
          <div class="doc-meta">
            <div><span>เลขที่ใบเสร็จ:</span> <strong>${receiptNo}</strong></div>
            <div><span>วันที่รับชำระ:</span> <strong>${paidDate}</strong></div>
            <div class="copy-mark-row"><div class="copy-mark">${copyLabel}</div></div>
          </div>
        </div>

        <section class="box">
          <div class="grid">
            <div><span>ผู้ชำระ</span><strong>${payer}</strong></div>
            <div><span>ประเภทผู้ชำระ</span><strong>${payment.payer_type === 'external' ? 'บุคคลภายนอก' : 'ลูกบ้าน'}</strong></div>
            <div><span>วิธีชำระ</span><strong>${formatMethod(payment.payment_method)}</strong></div>
            <div><span>ติดต่อ</span><strong>${payment.payer_contact || '-'}</strong></div>
          </div>
        </section>

        <section class="box">
          <table>
            <thead>
              <tr>
                <th class="c" style="width:56px;">ลำดับ</th>
                <th>รายการ</th>
                <th class="r" style="width:170px;">ยอดที่ต้องชำระ (บาท)</th>
                <th class="r" style="width:170px;">ยอดชำระจริง (บาท)</th>
              </tr>
            </thead>
            <tbody>
              ${itemRows}
            </tbody>
            <tfoot>
              <tr>
                <td colspan="3" class="r"><strong>รวมชำระ</strong></td>
                <td class="r"><strong>${fmtCurrency(totalPaid)}</strong></td>
              </tr>
            </tfoot>
          </table>
          ${payment.note ? `<div class="note-box">หมายเหตุ: ${payment.note}</div>` : ''}
        </section>
      </div>
    `

    return `
      <html>
      <head>
        <meta charset="utf-8" />
        <title>ใบเสร็จ ${receiptNo}</title>
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;500;700&display=swap" rel="stylesheet">
        <style>
          @page { size: A4; margin: 0; }
          * { box-sizing: border-box; }
          html, body { font-family: 'Sarabun', 'TH Sarabun New', Tahoma, sans-serif; margin: 0; padding: 0; color: #111827; background: #fff; }
          .sheet {
            position: relative;
            width: ${forCapture ? '794px' : '100%'};
            ${forCapture ? 'height: 1122px; overflow: hidden;' : 'page-break-after: always; break-after: page; break-inside: avoid;'}
            background: #fff;
            padding: 24px 28px;
            display: flex;
            flex-direction: column;
            gap: 8px;
          }
          .head { display: flex; justify-content: space-between; gap: 12px; border: 1px solid #cbd5e1; border-radius: 4px; padding: 10px 12px; background: #ffffff; }
          .brand { display: flex; align-items: flex-start; gap: 10px; flex: 1; min-width: 0; }
          .brand img { width: 48px; height: 48px; border-radius: 6px; object-fit: cover; border: 1px solid #cbd5e1; }
          .doc { font-size: 16px; font-weight: 700; line-height: 1.3; }
          .village { font-size: 11px; margin-top: 3px; font-weight: 600; }
          .sub { font-size: 9px; color: #6b7280; margin-top: 2px; }
          .doc-meta { font-size: 10px; min-width: 200px; display: flex; flex-direction: column; gap: 2px; word-break: break-word; }
          .doc-meta span { color: #6b7280; font-weight: 500; }
          .copy-mark-row { display: flex; justify-content: flex-end; margin-top: 10px; }
          .copy-mark { border: none; border-radius: 4px; padding: 3px 10px; text-align: center; font-size: 14px; font-weight: 700; line-height: 1.3; color: #0c4a6e; background: transparent; }
          .box { border: 1px solid #cbd5e1; border-radius: 4px; padding: 10px 12px; }
          .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 10px; word-break: break-word; }
          .grid > div { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
          .grid span { font-size: 9px; color: #6b7280; font-weight: 500; }
          .grid strong { font-size: 11px; font-weight: 600; }
          table { width: 100%; border-collapse: collapse; table-layout: auto; }
          th, td { border: 1px solid #cbd5e1; padding: 6px 8px; font-size: 10px; word-wrap: break-word; overflow-wrap: break-word; }
          th { background: #f1f5f9; text-align: left; font-weight: 600; }
          .c { text-align: center; }
          .r { text-align: right; }
          tfoot td { background: #f8fafc; font-weight: 700; }
          .note-box { border-top: 1px dashed #d1d5db; padding-top: 4px; font-size: 10px; color: #4b5563; margin-top: 4px; }
          @media print {
            html, body { background: #fff; }
            .sheet { page-break-after: always; break-after: page; break-inside: avoid; }
            .sheet:last-child { page-break-after: avoid; break-after: avoid; }
          }
        </style>
      </head>
      <body>
        ${renderSheet('ต้นฉบับ')}
        ${renderSheet('สำเนา')}
        ${autoPrint ? '<script>window.onload = () => window.print();</script>' : ''}
      </body>
      </html>
    `
  }

  const renderReceiptsInIframe = async (html, sheetCount = 2) => {
    const iframe = document.createElement('iframe')
    iframe.style.cssText = 'position:fixed;left:-9999px;top:0;border:none;'
    iframe.style.width = '794px'
    iframe.style.height = `${sheetCount * 1200}px`
    document.body.appendChild(iframe)

    const doc = iframe.contentDocument
    doc.open()
    doc.write(html)
    doc.close()

    await new Promise((resolve) => setTimeout(resolve, 1000))
    return {
      iframe,
      sheets: Array.from(doc.querySelectorAll('.sheet')),
    }
  }

  const runReceiptAction = async (mode) => {
    if (!receiptTarget) return
    setRunningReceiptAction(true)

    try {
      const target = receiptTarget
      const fileLabel = `receipt-${target.receipt_no || target.id}`

      if (mode === 'paper') {
        const popup = window.open('', '_blank', 'width=1200,height=900')
        if (!popup) throw new Error('กรุณาอนุญาต popup ของเบราว์เซอร์')
        popup.document.open()
        popup.document.write(buildReceiptHtml(target, { autoPrint: true }))
        popup.document.close()
        setShowReceiptActionModal(false)
        return
      }

      const html = buildReceiptHtml(target, { forCapture: true })
      const { iframe, sheets } = await renderReceiptsInIframe(html, 2)
      if (sheets.length === 0) {
        document.body.removeChild(iframe)
        throw new Error('ไม่พบหน้าสำหรับพิมพ์ใบเสร็จ')
      }

      if (mode === 'image') {
        for (let i = 0; i < sheets.length; i += 1) {
          const canvas = await html2canvas(sheets[i], {
            scale: 2,
            useCORS: true,
            backgroundColor: '#ffffff',
            width: 794,
            height: 1122,
          })
          const link = document.createElement('a')
          link.href = canvas.toDataURL('image/png')
          link.download = `${fileLabel}-${i + 1}.png`
          link.click()
        }
      } else {
        const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
        const w = pdf.internal.pageSize.getWidth()
        const h = pdf.internal.pageSize.getHeight()
        for (let i = 0; i < sheets.length; i += 1) {
          const canvas = await html2canvas(sheets[i], {
            scale: 2,
            useCORS: true,
            backgroundColor: '#ffffff',
            width: 794,
            height: 1122,
          })
          const imgData = canvas.toDataURL('image/jpeg', 0.95)
          if (i > 0) pdf.addPage()
          pdf.addImage(imgData, 'JPEG', 0, 0, w, h, undefined, 'FAST')
        }
        pdf.save(`${fileLabel}.pdf`)
      }

      document.body.removeChild(iframe)
      setShowReceiptActionModal(false)
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'พิมพ์ใบเสร็จไม่สำเร็จ', text: err.message })
    } finally {
      setRunningReceiptAction(false)
    }
  }

  const summaryTotal = payments.reduce((sum, p) => sum + Number(p.amount || 0), 0)

  return (
    <div className="pane on houses-compact reports-compact rp-wrap">
      <div className="ph rp-hero">
        <div className="ph-in" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div className="ph-ico">💳</div>
          <div>
            <div className="ph-h1">รับชำระเงิน</div>
            <div className="ph-sub">ระบบรับชำระแบบองค์กร: หลายรายการต่อใบ, รายเดือน, และออกใบเสร็จทันที</div>
          </div>
        </div>
      </div>

      <div className="rp-grid">
        <div className="rp-panel">
          <div className="rp-panel-head">
            <div className="rp-panel-title">📄 รายการชำระในใบนี้</div>
          </div>
          <div className="rp-panel-body">
            <div className="rp-toolbar">
              <select
                ref={itemPickerRef}
                className="rp-select"
                value={pendingItemId}
                onChange={(e) => setPendingItemId(e.target.value)}
                onKeyDown={handleItemPickerKeyDown}
              >
                <option value="">เลือกประเภทค่ารับชำระ</option>
                {items.map((it) => <option key={it.id} value={it.id}>{it.code} - {it.label} ({fmtCurrency(it.default_amount)})</option>)}
              </select>
              <button className="btn btn-p" onClick={handleAddPendingItem}>+ เพิ่มรายการ</button>
            </div>

            {selected.length === 0 ? (
              <div className="rp-empty">
                <h4>📄 ยังไม่มีรายการชำระ</h4>
                <p>เริ่มต้นโดยเพิ่มรายการ เช่น:</p>
                <ul>
                  <li>ค่าส่วนกลาง</li>
                  <li>ค่าปรับ</li>
                  <li>ค่าน้ำ / ไฟ</li>
                </ul>
                <button className="btn btn-p" style={{ marginTop: 10 }} onClick={() => itemPickerRef.current?.focus()}>+ เพิ่มรายการ</button>
              </div>
            ) : (
              <div className="rp-item-table" style={{ marginTop: 10 }}>
                <table className="tw" style={{ width: '100%' }}>
                  <thead>
                    <tr>
                      <th>รายการ</th>
                      <th style={{ textAlign: 'right' }}>จำนวนเงิน</th>
                      <th style={{ width: 80 }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {selected.map((s, idx) => (
                      <tr key={idx}>
                        <td>{s.label}</td>
                        <td style={{ textAlign: 'right' }}>
                          <input className="rp-input rp-amount-input" type="number" value={s.paid_amount} onChange={e => updateItemAmount(idx, e.target.value)} />
                        </td>
                        <td><button className="btn btn-xs btn-dg" onClick={() => removeItem(idx)}>ลบ</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        <div className="rp-panel">
          <div className="rp-panel-head">
            <div className="rp-panel-title">🧾 ข้อมูลการชำระ</div>
          </div>
          <div className="rp-panel-body">
            <div className="rp-section">
              <div className="rp-section-title">ผู้ชำระ</div>
              <div className="rp-payer-toggle">
                <label className={`rp-radio ${payerType === 'resident' ? 'active' : ''}`}>
                  <input type="radio" checked={payerType === 'resident'} onChange={() => setPayerType('resident')} />
                  ลูกบ้าน
                </label>
                <label className={`rp-radio ${payerType === 'external' ? 'active' : ''}`}>
                  <input type="radio" checked={payerType === 'external'} onChange={() => setPayerType('external')} />
                  บุคคลภายนอก
                </label>
              </div>

              {payerType === 'resident' ? (
                <div style={{ marginTop: 8 }}>
                  <select className="rp-select" value={selectedHouseId} onChange={e => setSelectedHouseId(e.target.value)}>
                    <option value="">เลือกบ้านผู้ชำระ</option>
                    {houses.map(h => <option key={h.id} value={h.id}>{h.soi || ''} / {h.house_no} - {h.owner_name}</option>)}
                  </select>
                </div>
              ) : (
                <div style={{ marginTop: 8 }}>
                  <select className="rp-select" value={selectedPartnerId} onChange={(e) => setSelectedPartnerId(e.target.value)}>
                    <option value="">เลือกคู่ค้านิติบุคคล</option>
                    {partners.map((p) => <option key={p.id} value={p.id}>{p.name} {p.tax_id ? `(${p.tax_id})` : ''}</option>)}
                  </select>
                  {selectedPartner && (
                    <div className="rp-partner-card">
                      <div>เลขผู้เสียภาษี: {selectedPartner.tax_id || '-'}</div>
                      <div>ที่อยู่: {selectedPartner.address || '-'}</div>
                      <div>เบอร์โทร: {selectedPartner.phone || '-'}</div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="rp-section">
              <div className="rp-section-title">วิธีชำระ</div>
              <div style={{ display: 'grid', gap: 8 }}>
                <select className="rp-select" value={method} onChange={e => setMethod(e.target.value)}>
                  <option value="cash">เงินสด</option>
                  <option value="transfer">โอน</option>
                  <option value="qr">QR</option>
                </select>
              </div>
            </div>

            <div className="rp-section">
              <div className="rp-section-title">เวลา & หมายเหตุ</div>
              <div style={{ display: 'grid', gap: 8 }}>
                <input className="rp-input" type="datetime-local" value={paidAt} onChange={(e) => setPaidAt(e.target.value)} />
                <textarea className="rp-textarea" value={note} onChange={(e) => setNote(e.target.value)} placeholder="รายละเอียดเพิ่มเติม" style={{ minHeight: 78 }} />
              </div>
            </div>

            <div className="rp-total-hero">
              <div className="rp-total-label">💰 รวมทั้งหมด</div>
              <div className="rp-total-value">{fmtCurrency(total)} บาท</div>
            </div>

            <div className="rp-actions" style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-o" onClick={() => { setSelected([]); setNote('') }}>ยกเลิก</button>
              <button className="btn rp-primary" onClick={handleSubmit} disabled={loading} style={{ marginLeft: 'auto' }}>
                {loading ? 'กำลังบันทึก...' : 'บันทึก & ออกใบเสร็จ'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <div className="ch" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
          <div className="ct">รายการรับชำระตามเลขที่ใบรับชำระ</div>
          <div className="rp-head-tools">
            <select className="rp-select" value={selectedMonthKey} onChange={(e) => setSelectedMonthKey(e.target.value)}>
              {monthOptions.map((opt) => (
                <option key={opt.key} value={opt.key}>{buildMonthLabel(opt.year, opt.month)}</option>
              ))}
            </select>
            <button className="btn btn-g" onClick={refreshCurrentMonth}>รีเฟรช</button>
          </div>
        </div>
        <div className="cb">
          <div className="rp-summary">
            <div>ทั้งหมด {payments.length} รายการ</div>
            <div>รวมยอดรับชำระ ฿{fmtCurrency(summaryTotal)}</div>
          </div>
          <div className="rp-table-wrap">
            <table className="tw" style={{ width: '100%', minWidth: 980 }}>
              <thead>
                <tr>
                  <th>เลขที่ใบรับชำระ</th>
                  <th>วันที่รับชำระ</th>
                  <th>ผู้ชำระ</th>
                  <th>ประเภท</th>
                  <th style={{ textAlign: 'right' }}>จำนวนเงิน</th>
                  <th>วิธีชำระ</th>
                  <th>สถานะ</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.id} className="rp-row">
                    <td>{p.receipt_no || p.id}</td>
                    <td>{formatDateTime(p.paid_at)}</td>
                    <td><span className="rp-icon">👤</span> {p.payer_name || p.houses?.owner_name || '-'}</td>
                    <td>{p.payer_type === 'external' ? 'บุคคลภายนอก' : 'ลูกบ้าน'}</td>
                    <td style={{ textAlign: 'right' }}>{fmtCurrency(p.amount)}</td>
                    <td>{formatMethod(p.payment_method)}</td>
                    <td>
                      {p.verified_at
                        ? <span className="rp-status ok">✅ อนุมัติแล้ว</span>
                        : <span className="rp-status pending">⏳ รอตรวจสอบ</span>}
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <button className="btn btn-xs btn-o" onClick={() => setDetailPayment(p)}>ดูรายละเอียด</button>
                      <button className="btn btn-xs btn-p" style={{ marginLeft: 8 }} onClick={() => { setReceiptTarget(p); setShowReceiptActionModal(true) }}>ออกรายงาน</button>
                    </td>
                  </tr>
                ))}
                {payments.length === 0 && (
                  <tr><td colSpan={8} style={{ textAlign: 'center', color: 'var(--mu)' }}>{loadingTable ? 'กำลังโหลด...' : 'ไม่พบข้อมูลของเดือนที่เลือก'}</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {detailPayment && (
        <div className="modal-root"><div className="modal" style={{ maxWidth: 920 }}>
          <div className="modal-head"><div className="modal-title">รายละเอียดการรับชำระ #{detailPayment.receipt_no || detailPayment.id}</div></div>
          <div className="modal-body">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: 10, marginBottom: 12 }}>
              <div><strong>ผู้ชำระ:</strong> {detailPayment.payer_name || detailPayment.houses?.owner_name || '-'}</div>
              <div><strong>ประเภทผู้ชำระ:</strong> {detailPayment.payer_type === 'external' ? 'บุคคลภายนอก' : 'ลูกบ้าน'}</div>
              <div><strong>วิธีชำระ:</strong> {formatMethod(detailPayment.payment_method)}</div>
              <div><strong>วันที่ชำระ:</strong> {formatDateTime(detailPayment.paid_at)}</div>
              <div><strong>ติดต่อ:</strong> {detailPayment.payer_contact || '-'}</div>
              <div><strong>เลขผู้เสียภาษี:</strong> {detailPayment.payer_tax_id || '-'}</div>
            </div>

            <table className="tw" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th>รายการ</th>
                  <th style={{ textAlign: 'right' }}>ยอดที่ต้องชำระ</th>
                  <th style={{ textAlign: 'right' }}>ยอดชำระจริง</th>
                </tr>
              </thead>
              <tbody>
                {(detailPayment.payment_items || []).map((item) => (
                  <tr key={item.id || `${item.item_key}-${item.item_label}`}>
                    <td>{item.item_label || '-'}</td>
                    <td style={{ textAlign: 'right' }}>{fmtCurrency(item.due_amount)}</td>
                    <td style={{ textAlign: 'right' }}>{fmtCurrency(item.paid_amount)}</td>
                  </tr>
                ))}
                {(!detailPayment.payment_items || detailPayment.payment_items.length === 0) && <tr><td colSpan={3} style={{ textAlign: 'center', color: 'var(--mu)' }}>ไม่มีรายการย่อย</td></tr>}
              </tbody>
              <tfoot>
                <tr>
                  <td style={{ textAlign: 'right', fontWeight: 700 }}>รวม</td>
                  <td></td>
                  <td style={{ textAlign: 'right', fontWeight: 700 }}>{fmtCurrency(detailPayment.amount)}</td>
                </tr>
              </tfoot>
            </table>

            {detailPayment.note ? <div style={{ marginTop: 12 }}><strong>หมายเหตุ:</strong> {detailPayment.note}</div> : null}
          </div>
          <div className="modal-foot">
            <button className="btn btn-g" onClick={() => setDetailPayment(null)}>ปิด</button>
            <button className="btn btn-p" onClick={() => { setReceiptTarget(detailPayment); setShowReceiptActionModal(true) }}>ออกรายงานใบเสร็จ</button>
          </div>
        </div></div>
      )}

      {showReceiptActionModal && (
        <div className="modal-root"><div className="modal" style={{ maxWidth: 420 }}>
          <div className="modal-head"><div className="modal-title">Modal ออกรายงาน (3 แบบ)</div></div>
          <div className="modal-body">
            <div style={{ color: 'var(--mu)', marginBottom: 8 }}>เลือกวิธีออกรายงานใบเสร็จรับเงิน</div>
            <div style={{ display: 'grid', gap: 8 }}>
              <button className="btn btn-p" disabled={runningReceiptAction} onClick={() => runReceiptAction('paper')}>พิมพ์เอกสาร (Paper)</button>
              <button className="btn btn-o" disabled={runningReceiptAction} onClick={() => runReceiptAction('pdf')}>ดาวน์โหลด PDF</button>
              <button className="btn btn-g" disabled={runningReceiptAction} onClick={() => runReceiptAction('image')}>ดาวน์โหลด PNG</button>
            </div>
          </div>
          <div className="modal-foot">
            <button className="btn btn-g" onClick={() => setShowReceiptActionModal(false)} disabled={runningReceiptAction}>ปิด</button>
          </div>
        </div></div>
      )}
    </div>
  )
}
