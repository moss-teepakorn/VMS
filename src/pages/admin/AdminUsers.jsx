import React from 'react'

const AdminUsers = () => {
  return (
    <div className="pane on">
      <div className="ph">
        <div className="ph-in">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div className="ph-ico">👥</div>
            <div>
              <div className="ph-h1">ผู้ใช้งาน</div>
              <div className="ph-sub">จัดการบัญชีผู้ใช้ของระบบ</div>
            </div>
          </div>
          <div className="ph-acts">
            <button className="btn btn-p btn-sm">+ เพิ่มผู้ใช้ใหม่</button>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: '16px' }}>
        <div className="ch"><div className="ct">รายชื่อผู้ใช้งาน</div></div>
        <div className="cb">
          <div style={{ overflowX: 'auto' }}>
            <table className="tw" style={{ width: '100%', minWidth: '600px' }}>
              <thead><tr>
                <th>ชื่อ</th><th>อีเมล</th><th>บทบาท</th><th>สถานะ</th><th/>
              </tr></thead>
              <tbody>
                <tr><td>นายสมชาติ ใจดี</td><td>somchai@greenfield.th</td><td><span className="bd b-pr">เจ้าหน้าที่นิติ</span></td><td><span className="bd b-ok">ใช้งาน</span></td><td><button className="btn btn-xs btn-o">ดู</button></td></tr>
                <tr><td>นางสาวพิชญา สุขใจ</td><td>pichaya@greenfield.th</td><td><span className="bd b-pr">เจ้าหน้าที่</span></td><td><span className="bd b-ok">ใช้งาน</span></td><td><button className="btn btn-xs btn-o">ดู</button></td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AdminUsers
