import React, { useEffect, useState } from 'react'
import { listPayments } from '../../lib/fees'

export default function AdminPayments() {
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')

  const totalAmount = payments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0)

  const filtered = payments.filter((payment) => {
    const kw = search.trim().toLowerCase()
    if (!kw) return true
    return (
      (payment.houses?.house_no || '').toLowerCase().includes(kw)
      || (payment.payment_method || '').toLowerCase().includes(kw)
      || (payment.note || '').toLowerCase().includes(kw)
    )
  })

  const loadPayments = async () => {
    try {
      setLoading(true)
      setPayments(await listPayments())
    } catch (error) {
      console.error('Error loading payments:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadPayments()
  }, [])

  return (
    <div className="pane on page-compact" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div className="ph">
        <div className="ph-in">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div className="ph-ico">💳</div>
            <div>
              <div className="ph-h1">จ่ายค่าส่วนกลาง</div>
              <div className="ph-sub">ตาราง payments จากฐานข้อมูลจริง · {payments.length} รายการ · รวม ฿{totalAmount.toLocaleString('th-TH')}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="ch page-list-head">
          <div className="ct">รายการชำระเงินทั้งหมด {filtered.length} รายการ</div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            <input
              type="text"
              className="page-filter-input"
              placeholder="ค้นหา บ้าน / วิธีชำระ / หมายเหตุ"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ minWidth: '240px' }}
            />
            <button className="btn btn-sm btn-o" onClick={loadPayments} disabled={loading}>↻ โหลดใหม่</button>
          </div>
        </div>
        <div className="cb page-table-body">
          <div className="desktop-only">
            <div style={{ overflowX: 'auto' }}>
              <table className="tw" style={{ width: '100%', minWidth: '720px' }}>
                <thead>
                  <tr>
                    <th>บ้าน</th>
                    <th>งวด</th>
                    <th>จำนวนเงิน</th>
                    <th>วิธีชำระ</th>
                    <th>วันที่</th>
                    <th>หมายเหตุ</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan="6" style={{ textAlign: 'center', color: 'var(--mu)', padding: '20px' }}>กำลังโหลดข้อมูล...</td></tr>
                  ) : filtered.length === 0 ? (
                    <tr><td colSpan="6" style={{ textAlign: 'center', color: 'var(--mu)', padding: '20px' }}>ยังไม่มีรายการชำระเงิน</td></tr>
                  ) : (
                    filtered.map((payment) => (
                      <tr key={payment.id}>
                        <td>{payment.houses?.house_no || '-'}</td>
                        <td>{payment.fees ? `${payment.fees.period} ${payment.fees.year}` : '-'}</td>
                        <td>฿{Number(payment.amount || 0).toLocaleString('th-TH')}</td>
                        <td>{payment.payment_method}</td>
                        <td>{payment.paid_at ? new Date(payment.paid_at).toLocaleString('th-TH') : '-'}</td>
                        <td>{payment.note || '-'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
          <div className="mobile-only">
            {loading ? (
              <div className="mcard-empty">กำลังโหลดข้อมูล...</div>
            ) : filtered.length === 0 ? (
              <div className="mcard-empty">ยังไม่มีรายการชำระเงิน</div>
            ) : filtered.map((payment) => (
              <div key={payment.id} className="mcard">
                <div className="mcard-top">
                  <div className="mcard-title">{payment.houses?.house_no || '-'}</div>
                  <div className="mcard-sub">{payment.fees ? `${payment.fees.period} ${payment.fees.year}` : '-'}</div>
                </div>
                <div className="mcard-meta">
                  <span><span className="mcard-label">จำนวนเงิน</span> ฿{Number(payment.amount || 0).toLocaleString('th-TH')}</span>
                  <span><span className="mcard-label">วิธีชำระ</span> {payment.payment_method}</span>
                  <span><span className="mcard-label">วันที่</span> {payment.paid_at ? new Date(payment.paid_at).toLocaleString('th-TH') : '-'}</span>
                  {payment.note && <span><span className="mcard-label">หมายเหตุ</span> {payment.note}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
