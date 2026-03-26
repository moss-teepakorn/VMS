import React, { useState, useContext } from 'react'
import { ModalContext } from './AdminLayout'

const AdminConfig = () => {
  const { openModal } = useContext(ModalContext)
  const [settings, setSettings] = useState({ siteName: 'The Greenfield', maxHouses: 128 })

  return (
    <div className="pane on">
      <div className="ph">
        <div className="ph-in">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div className="ph-ico">⚙️</div>
            <div>
              <div className="ph-h1">Config ระบบ</div>
              <div className="ph-sub">ตั้งค่าการทำงานของระบบ</div>
            </div>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: '16px', maxWidth: '500px' }}>
        <div className="ch"><div className="ct">การตั้งค่าทั่วไป</div></div>
        <div className="cb">
          <div className="fg">
            <label className="fl">ชื่อจำหน่าย</label>
            <input type="text" value={settings.siteName} onChange={(e) => setSettings({...settings, siteName: e.target.value})} style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--bo)', borderRadius: '6px' }} />
          </div>
          <div className="fg" style={{ marginBottom: 0 }}>
            <label className="fl">จำนวนหลังสูงสุด</label>
            <input type="number" value={settings.maxHouses} onChange={(e) => setSettings({...settings, maxHouses: e.target.value})} style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--bo)', borderRadius: '6px' }} />
          </div>
          <button className="btn btn-p" style={{ marginTop: '16px' }}>บันทึก</button>
        </div>
      </div>
    </div>
  )
}

export default AdminConfig
