export default function AdminSettings() {
  return (
    <div className="pane on" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div className="ph">
        <div className="ph-in">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div className="ph-ico">⚙️</div>
            <div>
              <div className="ph-h1">ตั้งค่า</div>
              <div className="ph-sub">ตั้งค่าระบบและสิทธิ์การใช้งาน</div>
            </div>
          </div>
        </div>
      </div>
      <div className="card">
        <div className="ch"><div className="ct">การตั้งค่าระบบ</div></div>
        <div className="cb" style={{ color: 'var(--mu)' }}>กำลังสร้าง...</div>
      </div>
    </div>
  )
}
