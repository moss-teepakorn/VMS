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
    <div className="pane on" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
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
        <div className="ch"><div className="ct">รายการชำระเงินทั้งหมด</div></div>
        <div className="cb">
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
      </div>
    </div>
  )
}
