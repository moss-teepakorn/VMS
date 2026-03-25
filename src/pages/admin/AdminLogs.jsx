import React from 'react'

const AdminLogs = () => {
  return (
    <div className="pane on">
      <div className="ph">
        <div className="ph-in">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div className="ph-ico">📋</div>
            <div>
              <div className="ph-h1">ข้อมูล Log</div>
              <div className="ph-sub">บันทึกกิจกรรมของระบบ</div>
            </div>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: '16px' }}>
        <div className="ch"><div className="ct">ข้อมูล Log ล่าสุด</div></div>
        <div className="cb">
          <div style={{ overflowX: 'auto' }}>
            <table className="tw" style={{ width: '100%', minWidth: '700px', fontSize: '12px' }}>
              <thead><tr>
                <th>เวลา</th><th>ผู้ใช้</th><th>การดำเนินการ</th><th>รายละเอียด</th>
              </tr></thead>
              <tbody>
                <tr><td>14:30:22</td><td>อ.สมชาติ</td><td><span className="bd b-pr">สร้าง</span></td><td>บ้าน 10/1 - เพิ่มข้อมูลใหม่</td></tr>
                <tr><td>14:25:15</td><td>อ.พิชญา</td><td><span className="bd b-a">แก้ไข</span></td><td>ค่าส่วนกลาง - อัปเดตข้อมูล</td></tr>
                <tr><td>14:20:08</td><td>ระบบ</td><td><span className="bd b-mu">ระบบ</span></td><td>Backup ฐานข้อมูลประจำวัน</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AdminLogs
