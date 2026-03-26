import React, { useEffect, useState } from 'react'
import { listPayments } from '../../lib/fees'

export default function AdminPayments() {
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
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

    loadPayments()
  }, [])

  return (
    <div className="pane on page-compact" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div className="ph">
        <div className="ph-in">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div className="ph-ico">💳</div>
            <div>
              <div className="ph-h1">การชำระเงิน</div>
              <div className="ph-sub">รายการรับชำระจากฐานข้อมูลจริง</div>
            </div>
          </div>
        </div>
      </div>

        <div className="card">
        <div className="ch page-list-head">
          <div className="ct">รายการชำระเงินทั้งหมด</div>
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
                  ) : payments.length === 0 ? (
                    <tr><td colSpan="6" style={{ textAlign: 'center', color: 'var(--mu)', padding: '20px' }}>ยังไม่มีรายการชำระเงิน</td></tr>
                  ) : (
                    payments.map((payment) => (
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
            ) : payments.length === 0 ? (
              <div className="mcard-empty">ยังไม่มีรายการชำระเงิน</div>
            ) : payments.map((payment) => (
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
