import React from 'react'
import ReportExportButtons from './ReportExportButtons'

const columns = [
  { key: 'docNo', label: 'เลขที่เอกสาร' },
  { key: 'houseNo', label: 'บ้านเลขที่' },
  { key: 'ownerName', label: 'ชื่อ-สกุล' },
  { key: 'period', label: 'งวด' },
  { key: 'amount', label: 'ยอดชำระ', type: 'number' },
  { key: 'method', label: 'ช่องทางชำระ' },
  { key: 'paidAt', label: 'วันที่ชำระ' },
]

const sampleRows = [
  { id: 1, docNo: 'PAY-000123', houseNo: '10/1', ownerName: 'สมชาย แสงดี', period: 'H2/2567', amount: 2750.0, amountRaw: 2750.0, method: 'โอน', paidAt: '2024-07-12' },
  { id: 2, docNo: 'PAY-000124', houseNo: '12/8', ownerName: 'สุดา ใจงาม', period: 'H1/2568', amount: 2900.0, amountRaw: 2900.0, method: 'QR', paidAt: '2024-06-03' },
]

export default function AdminFeatureReceivePayment() {
  return (
    <div className="pane on houses-compact reports-compact">
      <div className="ph">
        <div className="ph-in" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div className="ph-ico">💳</div>
          <div>
            <div className="ph-h1">Feature — รับชำระเงิน</div>
            <div className="ph-sub">Mock page สำหรับการรับชำระเงิน (UI prototype)</div>
          </div>
          <div style={{ marginLeft: 'auto' }}>
            <ReportExportButtons columns={columns} rows={sampleRows} reportTitle="รับชำระเงิน (Mock)" sumAmount={sampleRows.reduce((s,r) => s + (r.amountRaw||0),0)} />
          </div>
        </div>
      </div>

      <div className="card">
        <div className="ch"><div className="ct">รายการรับชำระ (ตัวอย่าง)</div></div>
        <div className="cb">
          <table className="tw" style={{ width: '100%', minWidth: 700 }}>
            <thead>
              <tr>{columns.map(c => <th key={c.key} style={{ textAlign: c.type === 'number' ? 'right' : undefined }}>{c.label}</th>)}</tr>
            </thead>
            import React, { useEffect, useState, useRef } from 'react'
            import Swal from 'sweetalert2'
            import { listPaymentItemTypes } from '../../lib/paymentItemTypes'
            import { listHouses } from '../../lib/houses'
            import { createPayment } from '../../lib/fees'
            import { getSystemConfig } from '../../lib/systemConfig'
            import villageLogo from '../../assets/village-logo.svg'
            import html2canvas from 'html2canvas'
            import { jsPDF } from 'jspdf'

            function fmtCurrency(v) {
              const n = Number(v || 0)
              if (!Number.isFinite(n)) return '-'
              return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
            }

            export default function AdminFeatureReceivePayment() {
              const [items, setItems] = useState([]) // master items
              const [houses, setHouses] = useState([])
              const [selected, setSelected] = useState([]) // selected payment items
              const [payerType, setPayerType] = useState('resident')
              const [selectedHouseId, setSelectedHouseId] = useState('')
              const [externalName, setExternalName] = useState('')
              const [externalContact, setExternalContact] = useState('')
              const [method, setMethod] = useState('transfer')
              const [loading, setLoading] = useState(false)
              const [setup, setSetup] = useState({})
              const receiptRef = useRef(null)

              useEffect(() => {
                (async () => {
                  try {
                    const [it, hs, cfg] = await Promise.all([listPaymentItemTypes({ onlyActive: true }), listHouses({ status: 'normal' }), getSystemConfig().catch(() => ({}))])
                    setItems(it || [])
                    setHouses(hs || [])
                    setSetup(cfg || {})
                  } catch (err) {
                    console.error(err)
                    Swal.fire({ icon: 'error', title: 'ไม่สามารถโหลดข้อมูล', text: err.message })
                  }
                })()
              }, [])

              const addItem = (item) => {
                setSelected((cur) => [...cur, { item_type_id: item.id, code: item.code, label: item.label, due_amount: Number(item.default_amount || 0), paid_amount: Number(item.default_amount || 0) }])
              }

              const removeItem = (index) => setSelected((cur) => cur.filter((_, i) => i !== index))

              const updateItemAmount = (index, value) => {
                setSelected((cur) => cur.map((r, i) => i === index ? { ...r, paid_amount: Number(value || 0) } : r))
              }

              const total = selected.reduce((s, r) => s + Number(r.paid_amount || 0), 0)

              const handleSubmit = async () => {
                if (selected.length === 0) return Swal.fire({ icon: 'warning', title: 'ไม่มีรายการ', text: 'กรุณาเพิ่มรายการก่อนรับชำระ' })
                if (payerType === 'resident' && !selectedHouseId) return Swal.fire({ icon: 'warning', title: 'เลือกบ้าน', text: 'กรุณาเลือกบ้านผู้ชำระ' })
                if (payerType === 'external' && !externalName) return Swal.fire({ icon: 'warning', title: 'กรอกชื่อผู้ชำระ', text: 'กรุณากรอกชื่อผู้ชำระ' })

                const payload = {
                  fee_id: null,
                  house_id: payerType === 'resident' ? selectedHouseId : null,
                  amount: total,
                  payment_method: method,
                  note: JSON.stringify({ payerType, payerName: payerType === 'resident' ? undefined : externalName, payerContact: externalContact }),
                  payment_items: selected.map((s, idx) => ({ item_key: `item_${idx+1}`, item_label: s.label, due_amount: Number(s.due_amount || 0), paid_amount: Number(s.paid_amount || 0) })),
                }

                setLoading(true)
                try {
                  const data = await createPayment(payload)
                  setLoading(false)
                  Swal.fire({ icon: 'success', title: 'บันทึกการรับชำระแล้ว' })
                  // show receipt modal
                  openReceiptModal(data)
                  // reset form
                  setSelected([])
                  setExternalName('')
                  setExternalContact('')
                } catch (err) {
                  setLoading(false)
                  Swal.fire({ icon: 'error', title: 'ผิดพลาด', text: err.message })
                }
              }

              const openReceiptModal = (payment) => {
                // render receipt into hidden div and open window for printing
                const html = buildReceiptHtml(payment)
                const w = window.open('', '_blank', 'width=800,height=900')
                if (!w) return
                w.document.open()
                w.document.write(html)
                w.document.close()
              }

              const buildReceiptHtml = (payment) => {
                const logo = setup.login_circle_logo_url || setup.village_logo_url || villageLogo
                const itemsHtml = (payment.payment_items || []).map(i => `<tr><td>${i.item_label}</td><td style="text-align:right">${fmtCurrency(i.paid_amount)}</td></tr>`).join('')
                const payer = JSON.parse(payment.note || '{}')
                return `
                  <html>
                  <head>
                    <meta charset="utf-8" />
                    <title>ใบเสร็จ ${payment.id}</title>
                    <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;700&display=swap" rel="stylesheet">
                    <style>body{font-family:'Sarabun',sans-serif;padding:20px} .logo{width:64px;height:64px} table{width:100%;border-collapse:collapse} td,th{padding:6px;border-bottom:1px solid #eee}</style>
                  </head>
                  <body>
                    <div style="display:flex;gap:12px;align-items:center">
                      <img src="${logo}" style="width:64px;height:64px;object-fit:contain" />
                      <div><h2>ใบเสร็จรับเงิน</h2><div>เลขที่: ${payment.id}</div></div>
                    </div>
                    <hr/>
                    <div>ผู้ชำระ: ${payer.payerName || (payment.houses?.owner_name || '-')}</div>
                    <div>วิธีการชำระ: ${payment.payment_method || '-'}</div>
                    <table style="margin-top:12px">
                      <thead><tr><th>รายการ</th><th style="text-align:right">จำนวนเงิน</th></tr></thead>
                      <tbody>${itemsHtml}</tbody>
                    </table>
                    <div style="text-align:right;font-weight:700;margin-top:8px">รวมทั้งสิ้น: ${fmtCurrency(payment.amount)}</div>
                  </body>
                  </html>
                `
              }

              return (
                <div className="pane on houses-compact reports-compact">
                  <div className="ph">
                    <div className="ph-in" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                      <div className="ph-ico">💳</div>
                      <div>
                        <div className="ph-h1">รับชำระเงิน (รายการทั่วไป)</div>
                        <div className="ph-sub">สร้างการรับชำระสำหรับรายการที่ไม่ใช่ค่าส่วนกลาง</div>
                      </div>
                    </div>
                  </div>

                  <div className="card">
                    <div className="ch"><div className="ct">เลือกรายการรับชำระ</div></div>
                    <div className="cb" style={{ display: 'flex', gap: 12 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ marginBottom: 8 }}>
                          <select onChange={e => { const id = e.target.value; const it = items.find(x => x.id === id); if (it) addItem(it); e.target.value = '' }}>
                            <option value="">-- เพิ่มรายการ --</option>
                            {items.map(it => <option key={it.id} value={it.id}>{it.code} — {it.label} ({fmtCurrency(it.default_amount)})</option>)}
                          </select>
                        </div>
                        <div style={{ overflow: 'auto' }}>
                          <table className="tw" style={{ width: '100%' }}>
                            <thead><tr><th>รายการ</th><th style={{ textAlign: 'right' }}>จำนวนเงิน</th><th></th></tr></thead>
                            <tbody>
                              {selected.map((s, idx) => (
                                <tr key={idx}>
                                  <td>{s.label}</td>
                                  <td style={{ textAlign: 'right' }}>
                                    <input type="number" value={s.paid_amount} onChange={e => updateItemAmount(idx, e.target.value)} style={{ width: 120, textAlign: 'right' }} />
                                  </td>
                                  <td><button className="btn btn-xs btn-dg" onClick={() => removeItem(idx)}>ลบ</button></td>
                                </tr>
                              ))}
                              {selected.length === 0 && <tr><td colSpan={3} style={{ textAlign: 'center', color: 'var(--mu)' }}>ยังไม่มีรายการ</td></tr>}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      <div style={{ width: 320 }}>
                        <div style={{ marginBottom: 8 }}>
                          <div style={{ fontWeight: 600, marginBottom: 6 }}>ผู้ชำระ</div>
                          <label style={{ display: 'block' }}><input type="radio" checked={payerType === 'resident'} onChange={() => setPayerType('resident')} /> ลูกบ้าน</label>
                          <label style={{ display: 'block' }}><input type="radio" checked={payerType === 'external'} onChange={() => setPayerType('external')} /> บุคคลภายนอก</label>
                        </div>

                        {payerType === 'resident' ? (
                          <div>
                            <select value={selectedHouseId} onChange={e => setSelectedHouseId(e.target.value)} style={{ width: '100%' }}>
                              <option value="">-- เลือกบ้าน --</option>
                              {houses.map(h => <option key={h.id} value={h.id}>{h.soi || ''} / {h.house_no} — {h.owner_name}</option>)}
                            </select>
                          </div>
                        ) : (
                          <div>
                            <input placeholder="ชื่อนามสกุล" value={externalName} onChange={e => setExternalName(e.target.value)} style={{ width: '100%', marginBottom: 8 }} />
                            <input placeholder="ข้อมูลติดต่อ (โทร/อีเมล)" value={externalContact} onChange={e => setExternalContact(e.target.value)} style={{ width: '100%' }} />
                          </div>
                        )}

                        <div style={{ marginTop: 12 }}>
                          <div style={{ fontWeight: 600 }}>วิธีชำระ</div>
                          <select value={method} onChange={e => setMethod(e.target.value)} style={{ width: '100%' }}>
                            <option value="transfer">โอน</option>
                            <option value="cash">เงินสด</option>
                            <option value="qr">QR</option>
                          </select>
                        </div>

                        <div style={{ marginTop: 12 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ fontWeight: 700 }}>รวมทั้งหมด</div>
                            <div style={{ fontWeight: 700 }}>{fmtCurrency(total)}</div>
                          </div>
                          <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
                            <button className="btn btn-dg" onClick={() => { setSelected([]) }}>ยกเลิก</button>
                            <button className="btn btn-p" onClick={handleSubmit} disabled={loading} style={{ marginLeft: 'auto' }}>{loading ? 'กำลังบันทึก...' : 'บันทึก & ออกใบเสร็จ'}</button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )
            }
