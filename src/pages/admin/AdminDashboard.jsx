import { useAuth } from '../../contexts/AuthContext'
import './AdminDashboard.css'

export default function AdminDashboard() {
  const { user, profile } = useAuth()

  const stats = [
    { label: 'ผู้พักอาศัยทั้งหมด', value: '156', icon: '👥', type: 'p' },
    { label: 'ห้องว่างพร้อมให้เช่า', value: '12', icon: '🏠', type: 'a' },
    { label: 'การชำระเงินค้างชำระ', value: '8', icon: '⚠️', type: 'w' },
    { label: 'ใบแจ้งซ่อมรอดำเนิน', value: '5', icon: '🔧', type: 'd' },
  ]

  const recentActivity = [
    { action: 'ผู้ใช้ใหม่ลงทะเบียน', time: '2 ชั่วโมงที่แล้ว', icon: '✓', type: 'gen' },
    { action: 'การชำระเงินได้รับการยืนยัน', time: '5 ชั่วโมงที่แล้ว', icon: '✓', type: 'gen' },
    { action: 'ใบแจ้งซ่อมใหม่สร้างขึ้น', time: '1 วันที่แล้ว', icon: '⚙️', type: 'evt' },
    { action: 'รายงานประจำเดือนถูกสร้างขึ้น', time: '2 วันที่แล้ว', icon: '📊', type: 'gen' },
  ]

  return (
    <div className="dashboard">
      {/* Page Header */}
      <div className="ph">
        <div className="ph-in">
          <div>
            <div className="ph-ico">📊</div>
            <h1 className="ph-h1">Dashboard</h1>
            <p className="ph-sub">ยินดีต้อนรับกลับมา {user?.email}</p>
          </div>
          <div className="ph-acts">
            <button className="btn btn-p">+ เพิ่มผู้พักอาศัย</button>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="stats">
        {stats.map((stat, idx) => (
          <div key={idx} className="sc">
            <div className={`sc-ico ${stat.type}`}>{stat.icon}</div>
            <div>
              <div className="sc-v">{stat.value}</div>
              <div className="sc-l">{stat.label}</div>
              <div className="sc-s">↑ 5% from last month</div>
            </div>
          </div>
        ))}
      </div>

      {/* Two Column Grid */}
      <div className="g2">
        {/* Left: Recent Activity */}
        <div className="card">
          <div className="ch">
            <div className="ch-ico">📜</div>
            <div className="ct">กิจกรรมเมื่อเร็ว ๆ นี้</div>
          </div>
          <div className="cb">
            <div className="tl">
              {recentActivity.map((item, idx) => (
                <div key={idx} className="tli">
                  <div className={`tld td-${idx === 0 ? 'done' : 'pend'}`}></div>
                  <div>
                    <div className="tl-l">{item.action}</div>
                    <div className="tl-s">{item.time}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Quick Stats */}
        <div className="card">
          <div className="ch">
            <div className="ch-ico">📈</div>
            <div className="ct">สรุปการใช้บริการ</div>
          </div>
          <div className="cb">
            <div className="ig">
              <div className="ii">
                <div className="ik">ห้องโดยรวม</div>
                <div className="iv">240</div>
              </div>
              <div className="ii">
                <div className="ik">อัตราเต็ม</div>
                <div className="iv">88.5%</div>
              </div>
              <div className="ii">
                <div className="ik">ผู้พักใหม่เดือนนี้</div>
                <div className="iv">12</div>
              </div>
              <div className="ii">
                <div className="ik">คนออกเดือนนี้</div>
                <div className="iv">3</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Maintenance & Payments Info */}
      <div className="g2">
        {/* Maintenance Section */}
        <div className="card">
          <div className="ch">
            <div className="ch-ico">🔧</div>
            <div className="ct">สถานะการซ่อมบำรุง</div>
          </div>
          <div className="cb">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--bo)' }}>
              <span style={{ color: 'var(--mu)' }}>กำลังดำเนิน</span>
              <span style={{ fontWeight: 800, color: 'var(--tx)' }}>5</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--bo)' }}>
              <span style={{ color: 'var(--mu)' }}>รอการยืนยัน</span>
              <span style={{ fontWeight: 800, color: 'var(--tx)' }}>8</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0' }}>
              <span style={{ color: 'var(--mu)' }}>เสร็จแล้ว</span>
              <span style={{ fontWeight: 800, color: 'var(--tx)' }}>42</span>
            </div>
          </div>
        </div>

        {/* Payments Section */}
        <div className="card">
          <div className="ch">
            <div className="ch-ico">💳</div>
            <div className="ct">สถานะการชำระเงิน</div>
          </div>
          <div className="cb">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--bo)' }}>
              <span style={{ color: 'var(--mu)' }}>รับแล้วเต็มจำนวน</span>
              <span className="bd b-ok">132</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--bo)' }}>
              <span style={{ color: 'var(--mu)' }}>ค้างชำระ</span>
              <span className="bd b-wn">8</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0' }}>
              <span style={{ color: 'var(--mu)' }}>อยู่ระหว่างการตรวจสอบ</span>
              <span className="bd b-mu">16</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
