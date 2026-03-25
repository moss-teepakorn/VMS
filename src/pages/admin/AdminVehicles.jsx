import React from 'react'

const AdminVehicles = () => {
  return (
    <div className="pane on">
      <div className="ph">
        <div className="ph-in">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div className="ph-ico">🚗</div>
            <div>
              <div className="ph-h1">ข้อมูลรถ</div>
              <div className="ph-sub">จัดการยานพาหนะของจำนายขอบ</div>
            </div>
          </div>
          <div className="ph-acts">
            <button className="btn btn-p btn-sm">+ ลงทะเบียนรถใหม่</button>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: '16px' }}>
        <div className="ch"><div className="ct">ยานพาหนะทั้งหมด</div></div>
        <div className="cb">
          <div style={{ overflowX: 'auto' }}>
            <table className="tw" style={{ width: '100%', minWidth: '600px' }}>
              <thead><tr>
                <th>ทะเบียน</th><th>ยี่ห้อ</th><th>เจ้าของ</th><th>สถานะ</th><th/>
              </tr></thead>
              <tbody>
                <tr><td>กท 1234</td><td>Toyota</td><td>นายสมชาติ ใจดี</td><td><span className="bd b-ok">ใช้งาน</span></td><td><button className="btn btn-xs btn-o">ดู</button></td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AdminVehicles
