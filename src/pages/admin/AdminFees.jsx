import React, { useContext, useEffect, useMemo, useState } from 'react'
import { ModalContext } from './AdminLayout'
import { listHouses } from '../../lib/houses'
import { createFee, createPayment, deleteFee, listFees, listPayments, summarizeFees, updateFee } from '../../lib/fees'

const AdminFees = () => {
  const { openModal } = useContext(ModalContext)
  const [fees, setFees] = useState([])
  const [payments, setPayments] = useState([])
  const [houses, setHouses] = useState([])
  const [statusFilter, setStatusFilter] = useState('all')
  const [yearFilter, setYearFilter] = useState('all')
  const [loading, setLoading] = useState(false)

  const houseOptions = useMemo(() => ([
    { value: '', label: 'เลือกบ้าน' },
    ...houses.map((house) => ({ value: house.id, label: `${house.house_no}${house.owner_name ? ` - ${house.owner_name}` : ''}` })),
  ]), [houses])

  const yearOptions = useMemo(() => {
    const years = [...new Set(fees.map((fee) => fee.year).filter(Boolean))].sort((a, b) => b - a)
    return years
  }, [fees])

  const loadFeeData = async (override = {}) => {
    try {
      setLoading(true)
      const [feeData, paymentData, houseData] = await Promise.all([
        listFees({ status: override.status ?? statusFilter, year: override.year ?? yearFilter }),
        listPayments({ limit: 10 }),
        houses.length === 0 ? listHouses() : Promise.resolve(houses),
      ])
      setFees(feeData)
      setPayments(paymentData)
      setHouses(houseData)
    } catch (error) {
      console.error('Error loading fees:', error)
      alert(`ไม่สามารถโหลดข้อมูลค่าส่วนกลางได้: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadFeeData()
  }, [])

  const summary = useMemo(() => summarizeFees(fees, payments), [fees, payments])

  const getFeeStatusBadge = (status) => {
    if (status === 'paid') return { className: 'bd b-ok', label: 'ชำระแล้ว' }
    if (status === 'pending') return { className: 'bd b-pr', label: 'รอตรวจสอบ' }
    if (status === 'overdue') return { className: 'bd b-dg', label: 'ค้างชำระ' }
    return { className: 'bd b-wn', label: 'ยังไม่ชำระ' }
  }

  const handleAddFee = () => {
    openModal('สร้างใบแจ้งหนี้', {
      house_id: { label: 'บ้าน', type: 'select', options: houseOptions, value: '' },
      year: { label: 'ปี', type: 'number', value: String(new Date().getFullYear()) },
      period: { label: 'งวด', type: 'select', options: [{ value: 'first_half', label: 'ครึ่งปีแรก' }, { value: 'second_half', label: 'ครึ่งปีหลัง' }, { value: 'full_year', label: 'เต็มปี' }], value: 'full_year' },
      invoice_date: { label: 'วันที่ออกใบแจ้งหนี้', type: 'date', value: new Date().toISOString().slice(0, 10) },
      due_date: { label: 'วันที่ครบกำหนด', type: 'date', value: new Date().toISOString().slice(0, 10) },
      fee_common: { label: 'ค่าส่วนกลาง', type: 'number', value: '0' },
      fee_parking: { label: 'ค่าจอดรถ', type: 'number', value: '0' },
      fee_waste: { label: 'ค่าขยะ', type: 'number', value: '0' },
      fee_other: { label: 'ค่าอื่นๆ', type: 'number', value: '0' },
      note: { label: 'หมายเหตุ', type: 'textarea', value: '' },
    }, async (data) => {
      try {
        if (!data.house_id?.value || !data.year?.value) {
          alert('กรุณาเลือกบ้านและระบุปี')
          return
        }

        await createFee({
          house_id: data.house_id?.value,
          year: data.year?.value,
          period: data.period?.value,
          invoice_date: data.invoice_date?.value,
          due_date: data.due_date?.value,
          fee_common: data.fee_common?.value,
          fee_parking: data.fee_parking?.value,
          fee_waste: data.fee_waste?.value,
          fee_other: data.fee_other?.value,
          note: data.note?.value,
        })
        await loadFeeData()
      } catch (error) {
        console.error('Error creating fee:', error)
        alert(`ไม่สามารถสร้างใบแจ้งหนี้ได้: ${error.message}`)
      }
    })
  }

  const handleEditFee = (fee) => {
    openModal('แก้ไขใบแจ้งหนี้', {
      status: { label: 'สถานะ', type: 'select', options: [{ value: 'unpaid', label: 'ยังไม่ชำระ' }, { value: 'pending', label: 'รอตรวจสอบ' }, { value: 'paid', label: 'ชำระแล้ว' }, { value: 'overdue', label: 'ค้างชำระ' }], value: fee.status || 'unpaid' },
      due_date: { label: 'วันที่ครบกำหนด', type: 'date', value: fee.due_date || '' },
      fee_common: { label: 'ค่าส่วนกลาง', type: 'number', value: String(fee.fee_common || 0) },
      fee_parking: { label: 'ค่าจอดรถ', type: 'number', value: String(fee.fee_parking || 0) },
      fee_waste: { label: 'ค่าขยะ', type: 'number', value: String(fee.fee_waste || 0) },
      fee_other: { label: 'ค่าอื่นๆ', type: 'number', value: String(fee.fee_other || 0) },
      note: { label: 'หมายเหตุ', type: 'textarea', value: fee.note || '' },
    }, async (data) => {
      try {
        await updateFee(fee.id, {
          status: data.status?.value || 'unpaid',
          due_date: data.due_date?.value || null,
          fee_common: Number(data.fee_common?.value || 0),
          fee_parking: Number(data.fee_parking?.value || 0),
          fee_waste: Number(data.fee_waste?.value || 0),
          fee_other: Number(data.fee_other?.value || 0),
          note: data.note?.value || null,
        })
        await loadFeeData()
      } catch (error) {
        console.error('Error updating fee:', error)
        alert(`ไม่สามารถแก้ไขใบแจ้งหนี้ได้: ${error.message}`)
      }
    })
  }

  const handleDeleteFee = async (fee) => {
    if (!window.confirm(`ยืนยันลบใบแจ้งหนี้ ${fee.houses?.house_no || ''} ${fee.period} ${fee.year}?`)) return
    try {
      await deleteFee(fee.id)
      await loadFeeData()
    } catch (error) {
      console.error('Error deleting fee:', error)
      alert(`ไม่สามารถลบใบแจ้งหนี้ได้: ${error.message}`)
    }
  }

  const handleAddPayment = (fee) => {
    openModal('บันทึกการชำระเงิน', {
      amount: { label: 'จำนวนเงิน', type: 'number', value: String(fee.total_amount || 0) },
      payment_method: { label: 'วิธีชำระ', type: 'select', options: [{ value: 'transfer', label: 'โอนเงิน' }, { value: 'cash', label: 'เงินสด' }, { value: 'qr', label: 'QR' }], value: 'transfer' },
      paid_at: { label: 'วันเวลา', type: 'datetime-local', value: new Date().toISOString().slice(0, 16) },
      note: { label: 'หมายเหตุ', type: 'textarea', value: '' },
    }, async (data) => {
      try {
        await createPayment({
          fee_id: fee.id,
          house_id: fee.house_id,
          amount: data.amount?.value,
          payment_method: data.payment_method?.value,
          paid_at: data.paid_at?.value,
          note: data.note?.value,
        })
        await loadFeeData()
      } catch (error) {
        console.error('Error creating payment:', error)
        alert(`ไม่สามารถบันทึกการชำระเงินได้: ${error.message}`)
      }
    })
  }

  return (
    <div className="pane on page-compact" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div className="ph">
        <div className="ph-in">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div className="ph-ico">💰</div>
            <div>
              <div className="ph-h1">ค่าส่วนกลาง</div>
              <div className="ph-sub">จัดสรรและเก็บค่าส่วนกลาง</div>
            </div>
          </div>
        </div>
        <div className="page-filter-row">
          <select className="page-filter-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="all">ทุกสถานะ</option>
            <option value="unpaid">ยังไม่ชำระ</option>
            <option value="pending">รอตรวจสอบ</option>
            <option value="paid">ชำระแล้ว</option>
            <option value="overdue">ค้างชำระ</option>
          </select>
          <select className="page-filter-select" value={yearFilter} onChange={(e) => setYearFilter(e.target.value)}>
            <option value="all">ทุกปี</option>
            {yearOptions.map((year) => <option key={year} value={year}>{year}</option>)}
          </select>
          <button className="btn btn-a btn-sm page-filter-btn" onClick={() => loadFeeData()}>ค้นหา</button>
        </div>
      </div>

      <div className="stats">
        <div className="sc"><div className="sc-ico a">💵</div><div><div className="sc-v">฿{summary.totalCollected.toLocaleString('th-TH')}</div><div className="sc-l">รวมเก็บแล้ว</div></div></div>
        <div className="sc"><div className="sc-ico d">⏳</div><div><div className="sc-v">฿{summary.totalOutstanding.toLocaleString('th-TH')}</div><div className="sc-l">ค้างชำระ</div></div></div>
        <div className="sc"><div className="sc-ico p">🧾</div><div><div className="sc-v">฿{summary.totalInvoiced.toLocaleString('th-TH')}</div><div className="sc-l">ยอดออกใบแจ้งหนี้</div></div></div>
      </div>

      <div className="card">
        <div className="ch page-list-head">
          <div className="ct">ใบแจ้งหนี้ล่าสุด</div>
          <div className="page-list-actions">
            <button className="btn btn-p btn-sm" onClick={handleAddFee}>+ สร้างใบแจ้งหนี้</button>
            <button className="btn btn-g btn-sm" onClick={() => loadFeeData()}>🔄 รีเฟรช</button>
          </div>
        </div>
        <div className="cb page-table-body">
          <div className="desktop-only">
            <div style={{ overflowX: 'auto' }}>
              <table className="tw" style={{ width: '100%', minWidth: '860px' }}>
                <thead>
                  <tr>
                    <th>บ้าน</th>
                    <th>ปี</th>
                    <th>งวด</th>
                    <th>ครบกำหนด</th>
                    <th>ยอดรวม</th>
                    <th>สถานะ</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan="7" style={{ textAlign: 'center', color: 'var(--mu)', padding: '20px' }}>กำลังโหลดข้อมูล...</td></tr>
                  ) : fees.length === 0 ? (
                    <tr><td colSpan="7" style={{ textAlign: 'center', color: 'var(--mu)', padding: '20px' }}>ยังไม่มีใบแจ้งหนี้</td></tr>
                  ) : (
                    fees.map((fee) => {
                      const badge = getFeeStatusBadge(fee.status)
                      return (
                        <tr key={fee.id}>
                          <td>{fee.houses?.house_no || '-'}<div style={{ fontSize: '11px', color: 'var(--mu)' }}>{fee.houses?.owner_name || '-'}</div></td>
                          <td>{fee.year}</td>
                          <td>{fee.period}</td>
                          <td>{fee.due_date ? new Date(fee.due_date).toLocaleDateString('th-TH') : '-'}</td>
                          <td><strong>฿{Number(fee.total_amount || 0).toLocaleString('th-TH')}</strong></td>
                          <td><span className={badge.className}>{badge.label}</span></td>
                          <td><div className="td-acts">
                            <button className="btn btn-xs btn-a" onClick={() => handleEditFee(fee)}>แก้ไข</button>
                            {fee.status !== 'paid' && <button className="btn btn-xs btn-p" onClick={() => handleAddPayment(fee)}>รับชำระ</button>}
                            <button className="btn btn-xs btn-dg" onClick={() => handleDeleteFee(fee)}>ลบ</button>
                          </div></td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
          <div className="mobile-only">
            {loading ? (
              <div className="mcard-empty">กำลังโหลดข้อมูล...</div>
            ) : fees.length === 0 ? (
              <div className="mcard-empty">ยังไม่มีใบแจ้งหนี้</div>
            ) : fees.map((fee) => {
              const badge = getFeeStatusBadge(fee.status)
              return (
                <div key={fee.id} className="mcard">
                  <div className="mcard-top">
                    <div className="mcard-title">{fee.houses?.house_no || '-'}</div>
                    <div className="mcard-sub">{fee.year} · {fee.period}</div>
                    <span className={`${badge.className} mcard-badge`}>{badge.label}</span>
                  </div>
                  <div className="mcard-body">{fee.houses?.owner_name || '-'}</div>
                  <div className="mcard-meta">
                    <span><span className="mcard-label">ครบกำหนด</span> {fee.due_date ? new Date(fee.due_date).toLocaleDateString('th-TH') : '-'}</span>
                    <span><span className="mcard-label">ยอดรวม</span> ฿{Number(fee.total_amount || 0).toLocaleString('th-TH')}</span>
                  </div>
                  <div className="mcard-actions">
                    <button className="btn btn-xs btn-a" onClick={() => handleEditFee(fee)}>แก้ไข</button>
                    {fee.status !== 'paid' && <button className="btn btn-xs btn-p" onClick={() => handleAddPayment(fee)}>รับชำระ</button>}
                    <button className="btn btn-xs btn-dg" onClick={() => handleDeleteFee(fee)}>ลบ</button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="ch"><div className="ct">การชำระเงินล่าสุด</div></div>
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
                  </tr>
                </thead>
                <tbody>
                  {payments.length === 0 ? (
                    <tr><td colSpan="5" style={{ textAlign: 'center', color: 'var(--mu)', padding: '20px' }}>ยังไม่มีรายการชำระเงิน</td></tr>
                  ) : (
                    payments.map((payment) => (
                      <tr key={payment.id}>
                        <td>{payment.houses?.house_no || '-'}<div style={{ fontSize: '11px', color: 'var(--mu)' }}>{payment.houses?.owner_name || '-'}</div></td>
                        <td>{payment.fees ? `${payment.fees.period} ${payment.fees.year}` : '-'}</td>
                        <td>฿{Number(payment.amount || 0).toLocaleString('th-TH')}</td>
                        <td>{payment.payment_method}</td>
                        <td>{payment.paid_at ? new Date(payment.paid_at).toLocaleString('th-TH') : '-'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
          <div className="mobile-only">
            {payments.length === 0 ? (
              <div className="mcard-empty">ยังไม่มีรายการชำระเงิน</div>
            ) : payments.map((payment) => (
              <div key={payment.id} className="mcard">
                <div className="mcard-top">
                  <div className="mcard-title">{payment.houses?.house_no || '-'}</div>
                  <div className="mcard-sub">{payment.fees ? `${payment.fees.period} ${payment.fees.year}` : '-'}</div>
                </div>
                <div className="mcard-body">{payment.houses?.owner_name || '-'}</div>
                <div className="mcard-meta">
                  <span><span className="mcard-label">จำนวน</span> ฿{Number(payment.amount || 0).toLocaleString('th-TH')}</span>
                  <span><span className="mcard-label">วิธีชำระ</span> {payment.payment_method}</span>
                  <span><span className="mcard-label">วันที่</span> {payment.paid_at ? new Date(payment.paid_at).toLocaleDateString('th-TH') : '-'}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default AdminFees
