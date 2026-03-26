import React, { useContext } from 'react'
import { ModalContext } from './AdminLayout'

const AdminIssues = () => {
  const { openModal } = useContext(ModalContext)

  const handleAddIssue = () => {
    openModal('รายงานปัญหาใหม่', {
      title: { label: 'เรื่อง', type: 'text', placeholder: 'ปัญหาไฟฟ้า' },
      description: { label: 'รายละเอียด', type: 'text', placeholder: 'อธิบายปัญหา' },
      location: { label: 'สถานที่', type: 'text', placeholder: '1/1' },
      severity: { label: 'ความรุนแรง', type: 'text', placeholder: 'ปกติ/เร่งด่วน' },
    }, (data) => {
      console.log('Add issue:', data)
    })
  }
  return (
    <div className="pane on">
      <div className="ph">
        <div className="ph-in">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div className="ph-ico">🔧</div>
            <div>
              <div className="ph-h1">จัดการปัญหา</div>
              <div className="ph-sub">ติดตามปัญหาแล้วการซ่อมแซม (3 รายการ)</div>
            </div>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: '16px' }}>
        <div className="ch"><div className="ct">ปัญหาที่ค้างอยู่</div></div>
        <div className="cb">
          <div className="iss" style={{ borderLeft: '3px solid var(--wn)' }}>
            <div className="iss-h">
              <div className="iss-t">ปัญหาไฟฟ้า</div>
              <span className="bd b-wn">รอแก้ไข</span>
            </div>
            <div className="iss-m">บ้าน 22/5 · วันนี้ เวลา 14:30</div>
          </div>
          <div className="iss" style={{ borderLeft: '3px solid var(--ac)' }}>
            <div className="iss-h">
              <div className="iss-t">ท่อน้ำรั่วไหล</div>
              <span className="bd b-ok">แก้แล้ว</span>
            </div>
            <div className="iss-m">บ้าน 15/3 · เมื่อ 2 วันที่แล้ว</div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AdminIssues
