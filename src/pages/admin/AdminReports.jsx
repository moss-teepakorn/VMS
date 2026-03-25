import React from 'react'

const AdminReports = () => {
  return (
    <div className="pane on">
      <div className="ph">
        <div className="ph-in">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div className="ph-ico">🏆</div>
            <div>
              <div className="ph-h1">ผลงานนิติ</div>
              <div className="ph-sub">รายงานประวัติและประสิทธิภาพ</div>
            </div>
          </div>
          <div className="ph-acts">
            <button className="btn btn-p btn-sm">📄 ออกรายงาน</button>
          </div>
        </div>
      </div>

      <div className="stats" style={{ marginTop: '16px' }}>
        <div className="sc"><div className="sc-ico p">📋</div><div><div className="sc-v">242</div><div className="sc-l">การประชุมทั้งหมด</div></div></div>
        <div className="sc"><div className="sc-ico a">✅</div><div><div className="sc-v">95%</div><div className="sc-l">อัตราการมาประชุม</div></div></div>
      </div>

      <div className="card" style={{ marginTop: '16px' }}>
        <div className="ch"><div className="ct">ประวัติการประชุม</div></div>
        <div className="cb">
          <div style={{ minHeight: '150px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--mu)' }}>
            ข้อมูลประวัติการประชุม
          </div>
        </div>
      </div>
    </div>
  )
}

export default AdminReports
