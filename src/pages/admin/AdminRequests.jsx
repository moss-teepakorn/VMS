import React from 'react'

const AdminRequests = () => {
  return (
    <div className="pane on">
      <div className="ph">
        <div className="ph-in">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div className="ph-ico">📝</div>
            <div>
              <div className="ph-h1">คำขอแก้ไข</div>
              <div className="ph-sub">รายการรอการอนุมัติ (7 รายการ)</div>
            </div>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: '16px' }}>
        <div className="ch"><div className="ct">คำขอลำดับสำคัญ</div></div>
        <div className="cb">
          <div style={{ overflowX: 'auto' }}>
            <table className="tw" style={{ width: '100%', minWidth: '600px' }}>
              <thead><tr>
                <th>วันที่</th><th>ประเภท</th><th>จากเจ้าของ</th><th>รายละเอียด</th><th>สถานะ</th><th/>
              </tr></thead>
              <tbody>
                <tr><td>14 มี.ค.</td><td><span className="bd b-wn">สลิป</span></td><td>10/1</td><td>ค่าส่วนกลาง ฿2,750</td><td><span className="bd b-pr">รอตรวจสอบ</span></td><td><button className="btn btn-xs btn-a">ดู</button></td></tr>
                <tr><td>13 มี.ค.</td><td><span className="bd b-pr">รถ</span></td><td>8/4</td><td>ขอเพิ่มรถใหม่</td><td><span className="bd b-pr">รอตรวจสอบ</span></td><td><button className="btn btn-xs btn-a">ดู</button></td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AdminRequests
