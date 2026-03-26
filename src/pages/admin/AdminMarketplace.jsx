import React, { useContext } from 'react'
import { ModalContext } from './AdminLayout'

const AdminMarketplace = () => {
  const { openModal } = useContext(ModalContext)

  const handleAddProduct = () => {
    openModal('เพิ่มสินค้า', {
      name: { label: 'ชื่อสินค้า', type: 'text', placeholder: 'ชื่อสินค้า' },
      price: { label: 'ราคา', type: 'number', placeholder: '500' },
      description: { label: 'รายละเอียด', type: 'text', placeholder: 'รายละเอียดสินค้า' },
    }, (data) => {
      console.log('Add product:', data)
    })
  }
  return (
    <div className="pane on">
      <div className="ph">
        <div className="ph-in">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div className="ph-ico">🛒</div>
            <div>
              <div className="ph-h1">ตลาดชุมชน</div>
              <div className="ph-sub">สิ่งของและบริการของสมาชิก</div>
            </div>
          </div>
          <div className="ph-acts">
            <button className="btn btn-p btn-sm">+ โพสต์ใหม่</button>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '16px', marginTop: '16px' }}>
        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ padding: '16px', background: 'var(--bg)', minHeight: '100px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px' }}>📱</div>
          <div style={{ padding: '8px 12px', borderTop: '1px solid var(--bo)' }}>
            <div style={{ fontWeight: 700, fontSize: '12px', color: 'var(--tx)' }}>โทรศัพท์มือถือ</div>
            <div style={{ fontSize: '11px', color: 'var(--mu)', marginTop: '4px' }}>฿5,000</div>
          </div>
        </div>
        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ padding: '16px', background: 'var(--bg)', minHeight: '100px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px' }}>🚴</div>
          <div style={{ padding: '8px 12px', borderTop: '1px solid var(--bo)' }}>
            <div style={{ fontWeight: 700, fontSize: '12px', color: 'var(--tx)' }}>จักรยาน</div>
            <div style={{ fontSize: '11px', color: 'var(--mu)', marginTop: '4px' }}>฿2,500</div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AdminMarketplace
