import React, { useContext } from 'react'
import { ModalContext } from './AdminLayout'

const AdminRequests = () => {
  const { openModal } = useContext(ModalContext)

  const handleAddRequest = () => {
    openModal('สร้างรายการคำขอใหม่', {
      type: { label: 'ประเภทคำขอ', type: 'text', placeholder: 'ซ่อมแซม' },
      description: { label: 'รายละเอียด', type: 'text', placeholder: 'อธิบายปัญหา' },
      house: { label: 'เลขที่บ้าน', type: 'text', placeholder: '10/1' },
    }, (data) => {
      console.log('Add request:', data)
    })
  }
  return (
    <div className="pane on houses-compact">
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

      <div className="card houses-main-card">
        <div className="ch houses-list-head"><div className="ct">คำขอลำดับสำคัญ</div></div>
        <div className="cb houses-table-card-body">
          <div style={{ overflowX: 'auto' }}>
            <table className="tw houses-table" style={{ width: '100%', minWidth: '600px' }}>
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
