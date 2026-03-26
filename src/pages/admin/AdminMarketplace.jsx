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
        <div className="card" style={{ textAlign: 'center', cursor: 'pointer' }}>
          <div style={{ padding: '16px', background: 'var(--bg)', minHeight: '100px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px' }}>📱</div>
          <div style={{ padding: '8px 12px', borderTop: '1px solid var(--bo)' }}>
            <div style={{ fontWeight: 700, fontSize: '12px', color: 'var(--tx)' }}>โทรศัพท์มือถือ</div>
            <div style={{ fontSize: '11px', color: 'var(--ac)', marginTop: '4px', fontWeight: 600 }}>฿5,000</div>
            <div style={{ fontSize: '10px', color: 'var(--mu)', marginTop: '2px' }}>10/3</div>
          </div>
        </div>
        <div className="card" style={{ textAlign: 'center', cursor: 'pointer' }}>
          <div style={{ padding: '16px', background: 'var(--bg)', minHeight: '100px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px' }}>🚴</div>
          <div style={{ padding: '8px 12px', borderTop: '1px solid var(--bo)' }}>
            <div style={{ fontWeight: 700, fontSize: '12px', color: 'var(--tx)' }}>จักรยาน</div>
            <div style={{ fontSize: '11px', color: 'var(--ac)', marginTop: '4px', fontWeight: 600 }}>฿2,500</div>
            <div style={{ fontSize: '10px', color: 'var(--mu)', marginTop: '2px' }}>8/2</div>
          </div>
        </div>
        <div className="card" style={{ textAlign: 'center', cursor: 'pointer' }}>
          <div style={{ padding: '16px', background: 'var(--bg)', minHeight: '100px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px' }}>🛋️</div>
          <div style={{ padding: '8px 12px', borderTop: '1px solid var(--bo)' }}>
            <div style={{ fontWeight: 700, fontSize: '12px', color: 'var(--tx)' }}>เก้าอี้นวม</div>
            <div style={{ fontSize: '11px', color: 'var(--ac)', marginTop: '4px', fontWeight: 600 }}>฿3,200</div>
            <div style={{ fontSize: '10px', color: 'var(--mu)', marginTop: '2px' }}>10/1</div>
          </div>
        </div>
        <div className="card" style={{ textAlign: 'center', cursor: 'pointer' }}>
          <div style={{ padding: '16px', background: 'var(--bg)', minHeight: '100px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px' }}>📚</div>
          <div style={{ padding: '8px 12px', borderTop: '1px solid var(--bo)' }}>
            <div style={{ fontWeight: 700, fontSize: '12px', color: 'var(--tx)' }}>หนังสือภาษาอังกฤษ</div>
            <div style={{ fontSize: '11px', color: 'var(--ac)', marginTop: '4px', fontWeight: 600 }}>฿800</div>
            <div style={{ fontSize: '10px', color: 'var(--mu)', marginTop: '2px' }}>9/4</div>
          </div>
        </div>
        <div className="card" style={{ textAlign: 'center', cursor: 'pointer' }}>
          <div style={{ padding: '16px', background: 'var(--bg)', minHeight: '100px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px' }}>🎮</div>
          <div style={{ padding: '8px 12px', borderTop: '1px solid var(--bo)' }}>
            <div style={{ fontWeight: 700, fontSize: '12px', color: 'var(--tx)' }}>เกมเกียร์</div>
            <div style={{ fontSize: '11px', color: 'var(--ac)', marginTop: '4px', fontWeight: 600 }}>฿1,500</div>
            <div style={{ fontSize: '10px', color: 'var(--mu)', marginTop: '2px' }}>7/5</div>
          </div>
        </div>
        <div className="card" style={{ textAlign: 'center', cursor: 'pointer' }}>
          <div style={{ padding: '16px', background: 'var(--bg)', minHeight: '100px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px' }}>🧘</div>
          <div style={{ padding: '8px 12px', borderTop: '1px solid var(--bo)' }}>
            <div style={{ fontWeight: 700, fontSize: '12px', color: 'var(--tx)' }}>โยคะ (บริการ)</div>
            <div style={{ fontSize: '11px', color: 'var(--ac)', marginTop: '4px', fontWeight: 600 }}>฿500/ครั้ง</div>
            <div style={{ fontSize: '10px', color: 'var(--mu)', marginTop: '2px' }}>5/5</div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AdminMarketplace
