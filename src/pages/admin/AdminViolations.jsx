import React, { useContext } from 'react'
import { ModalContext } from './AdminLayout'

const AdminViolations = () => {
  const { openModal } = useContext(ModalContext)

  const handleAddViolation = () => {
    openModal('แจ้งกระทำผิดใหม่', {
      type: { label: 'ประเภท', type: 'text', placeholder: 'จอดรถขวาง' },
      house: { label: 'เลขที่บ้าน', type: 'text', placeholder: '10/1' },
      description: { label: 'อธิบายการกระทำ', type: 'text', placeholder: 'รายละเอียด' },
    }, (data) => {
      console.log('Add violation:', data)
    })
  }
  return (
    <div className="pane on">
      <div className="ph">
        <div className="ph-in">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div className="ph-ico">⚠️</div>
            <div>
              <div className="ph-h1">แจ้งกระทำผิด</div>
              <div className="ph-sub">การละเมิดข้อบังคับ</div>
            </div>
          </div>
          <div className="ph-acts">
            <button className="btn btn-p btn-sm" onClick={handleAddViolation}>+ แจ้งกระทำผิด</button>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: '16px' }}>
        <div className="ch"><div className="ct">รายการแจ้งกระทำผิด</div></div>
        <div className="cb">
          <div className="vio">
            <div className="vio-t">จอดรถขวางทางเข้า-ออก</div>
            <div className="vio-d">บ้าน 10/1 · 14 มี.ค. 2568</div>
            <div style={{ marginTop: '8px' }}><span className="bd b-wn">รอดำเนินการ</span></div>
          </div>
          <div className="vio">
            <div className="vio-t">สัตว์ร้ายหลุดไหลออก</div>
            <div className="vio-d">บ้าน 8/2 · 13 มี.ค. 2568</div>
            <div style={{ marginTop: '8px' }}><span className="bd b-ok">ดำเนินการแล้ว</span></div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AdminViolations
