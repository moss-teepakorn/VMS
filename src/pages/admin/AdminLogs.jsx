import React, { useContext } from 'react'
import { ModalContext } from './AdminLayout'

const AdminLogs = () => {
  const { openModal } = useContext(ModalContext)

  const handleViewLog = (logId) => {
    openModal('\u0e23า\u0e22\u0e25\u0e30\u0e40\u0e2d\u0e35\u0e22\u0e14 Log ID: ' + logId, {
      timestamp: { label: '\u0e40\u0e27\u0e25\u0e32\u0e2a\u0e21\u0e2b', type: 'text', placeholder: '' },
      action: { label: '\u0e01\u0e32\u0e23\u0e01\u0e23\u0e23\u0e21\u0e01\u0e32ร', type: 'text', placeholder: '' },
      user: { label: '\u0e1c\u0e39\u0e49\u0e43\u0e0a\u0e49', type: 'text', placeholder: '' },
    }, null)
  }
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
