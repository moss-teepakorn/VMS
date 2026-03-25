import React from 'react'

const AdminFees = () => {
  return (
    <div className="pane on">
      <div className="ph">
        <div className="ph-in">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div className="ph-ico">💰</div>
            <div>
              <div className="ph-h1">ค่าส่วนกลาง</div>
              <div className="ph-sub">จัดสรรและเก็บค่าส่วนกลาง</div>
            </div>
          </div>
          <div className="ph-acts">
            <button className="btn btn-p btn-sm">+ สร้างใบแจ้งหนี้</button>
          </div>
        </div>
      </div>

      <div className="stats" style={{ marginTop: '16px' }}>
        <div className="sc"><div className="sc-ico a">💵</div><div><div className="sc-v">฿456,800</div><div className="sc-l">รวมเก็บแล้ว</div></div></div>
        <div className="sc"><div className="sc-ico d">⏳</div><div><div className="sc-v">฿48,600</div><div className="sc-l">ค้างชำระ</div></div></div>
      </div>

      <div className="card" style={{ marginTop: '16px' }}>
        <div className="ch"><div className="ct">ประวัติการเก็บ</div></div>
        <div className="cb">
          <div style={{ minHeight: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--mu)' }}>
            ข้อมูลประวัติการเก็บในปัจจุบัน
          </div>
        </div>
      </div>
    </div>
  )
}

export default AdminFees
