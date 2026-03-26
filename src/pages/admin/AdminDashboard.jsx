import React from 'react'
import './AdminDashboard.css'

const AdminDashboard = () => {
  return (
    <div className="pane on">
      {/* Page Header */}
      <div className="ph">
        <div className="ph-in">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div className="ph-ico">📊</div>
            <div>
              <div className="ph-h1">Dashboard ภาพรวม</div>
              <div className="ph-sub" id="dash-sub">The Greenfield · 15 มีนาคม 2568</div>
            </div>
          </div>
          <div className="ph-acts">
            <button className="btn btn-w btn-sm">+ เพิ่มบ้านใหม่</button>
            <div style={{ display: 'flex', gap: '14px' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '18px', fontWeight: 800, color: '#fff' }}>128</div>
                <div style={{ fontSize: '9.5px', color: 'rgba(255,255,255,.75)' }}>บ้านทั้งหมด</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '18px', fontWeight: 800, color: '#fff' }}>⭐4.6</div>
                <div style={{ fontSize: '9.5px', color: 'rgba(255,255,255,.75)' }}>คะแนนบริการ</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '18px', fontWeight: 800, color: '#fff' }}>฿48.6K</div>
                <div style={{ fontSize: '9.5px', color: 'rgba(255,255,255,.75)' }}>ค้างชำระรวม</div>
              </div>
            </div>
            <button className="btn btn-w btn-sm">📄 ออกรายงาน</button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="stats">
        <div className="sc">
          <div className="sc-ico p">🏠</div>
          <div>
            <div className="sc-v">128</div>
            <div className="sc-l">บ้านทั้งหมด</div>
            <div className="sc-s"><span className="up">↑3</span> ใหม่เดือนนี้</div>
          </div>
        </div>
        <div className="sc">
          <div className="sc-ico d">💰</div>
          <div>
            <div className="sc-v">24</div>
            <div className="sc-l">ค้างชำระ</div>
            <div className="sc-s"><span className="dn">฿48,600</span></div>
          </div>
        </div>
        <div className="sc">
          <div className="sc-ico w">📝</div>
          <div>
            <div className="sc-v">7</div>
            <div className="sc-l">รออนุมัติทั้งหมด</div>
            <div className="sc-s">กดเพื่อดู</div>
          </div>
        </div>
        <div className="sc">
          <div className="sc-ico a">🔧</div>
          <div>
            <div className="sc-v">3</div>
            <div className="sc-l">ปัญหาค้างอยู่</div>
            <div className="sc-s"><span className="up">⭐4.6</span> คะแนน</div>
          </div>
        </div>
      </div>

      {/* Charts Row 1 */}
      <div className="g2" style={{ marginBottom: '14px' }}>
        <div className="chart-box">
          <div className="ch">
            <h3>💰 ยอดชำระ vs ค้าง — 6 เดือน</h3>
          </div>
          <div className="chart-wrap">
            <svg viewBox="0 0 600 250" style={{ width: '100%', height: '200px' }}>
              {/* Bars for payment vs pending */}
              <rect x="50" y="160" width="30" height="60" fill="#28B463" />
              <rect x="90" y="140" width="30" height="80" fill="#28B463" />
              <rect x="130" y="150" width="30" height="70" fill="#28B463" />
              <rect x="170" y="130" width="30" height="90" fill="#28B463" />
              <rect x="210" y="120" width="30" height="100" fill="#28B463" />
              <rect x="250" y="100" width="30" height="120" fill="#28B463" />
              <rect x="70" y="175" width="20" height="45" fill="#C0392B" />
              <rect x="110" y="165" width="20" height="55" fill="#C0392B" />
              <rect x="150" y="170" width="20" height="50" fill="#C0392B" />
              <rect x="190" y="160" width="20" height="60" fill="#C0392B" />
              <rect x="230" y="155" width="20" height="65" fill="#C0392B" />
              <rect x="270" y="140" width="20" height="80" fill="#C0392B" />
              <text x="40" y="240" fontSize="12" fill="#666">ม.ค.</text>
              <text x="80" y="240" fontSize="12" fill="#666">ก.พ.</text>
              <text x="120" y="240" fontSize="12" fill="#666">มี.ค.</text>
              <text x="165" y="240" fontSize="12" fill="#666">เม.ย.</text>
              <text x="205" y="240" fontSize="12" fill="#666">พ.ค.</text>
              <text x="245" y="240" fontSize="12" fill="#666">มิ.ย.</text>
              <text x="300" y="20" fontSize="14" fontWeight="600" fill="#333">เก็บได้ 3.2M ฿ ค้าง 848k ฿</text>
            </svg>
          </div>
        </div>
        <div className="chart-box">
          <div className="ch">
            <h3>🏠 สถานะบ้านทั้งหมด (128 หลัง)</h3>
          </div>
          <div className="chart-wrap">
            <svg viewBox="0 0 300 250" style={{ width: '100%', height: '200px' }}>
              {/* Pie chart for house status */}
              <circle cx="120" cy="100" r="70" fill="#28B463" />
              <circle cx="120" cy="100" r="60" fill="white" />
              <circle cx="120" cy="100" r="60" fill="#28B463" style={{ clipPath: 'polygon(50% 50%, 50% 0%, 100% 0%, 100% 100%, 50% 100%)' }} opacity="0.8" />
              <text x="120" y="105" textAnchor="middle" fontSize="16" fontWeight="700" fill="#333">104</text>
              <text x="120" y="125" textAnchor="middle" fontSize="12" fill="#666">อยู่อาศัย</text>
              <text x="220" y="50" fontSize="12" fill="#333">⚪ ว่าง: 16 หลัง</text>
              <text x="220" y="70" fontSize="12" fill="#333">🟡 รอจด: 8 หลัง</text>
              <text x="220" y="90" fontSize="12" fill="#333">🟢 อยู่: 104 หลัง</text>
            </svg>
          </div>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="g2" style={{ marginBottom: '14px' }}>
        <div className="chart-box">
          <div className="ch">
            <h3>📈 ยอดเก็บ vs ค้างรายไตรมาส</h3>
          </div>
          <div className="chart-wrap">
            <svg viewBox="0 0 600 250" style={{ width: '100%', height: '200px' }}>
              {/* Quarterly comparison */}
              <rect x="60" y="120" width="50" height="80" fill="#1B4F72" />
              <rect x="120" y="100" width="50" height="100" fill="#1B4F72" />
              <rect x="180" y="90" width="50" height="110" fill="#1B4F72" />
              <rect x="240" y="110" width="50" height="90" fill="#1B4F72" />
              <rect x="85" y="160" width="20" height="40" fill="#E67E22" />
              <rect x="145" y="150" width="20" height="50" fill="#E67E22" />
              <rect x="205" y="145" width="20" height="55" fill="#E67E22" />
              <rect x="265" y="155" width="20" height="45" fill="#E67E22" />
              <text x="80" y="230" fontSize="12" fill="#666">ไตรมาส 1</text>
              <text x="140" y="230" fontSize="12" fill="#666">ไตรมาส 2</text>
              <text x="200" y="230" fontSize="12" fill="#666">ไตรมาส 3</text>
              <text x="260" y="230" fontSize="12" fill="#666">ไตรมาส 4</text>
              <text x="320" y="40" fontSize="12" fontWeight="600" fill="#333">🟦 เก็บได้</text>
              <text x="320" y="70" fontSize="12" fontWeight="600" fill="#333">🟧 ค้างชำระ</text>
            </svg>
          </div>
        </div>
        <div className="chart-box">
          <div className="ch">
            <h3>🔧 ปัญหาตามประเภท</h3>
          </div>
          <div className="chart-wrap">
            <svg viewBox="0 0 400 250" style={{ width: '100%', height: '200px' }}>
              {/* Issue types breakdown */}
              <rect x="40" y="80" width="40" height="100" fill="#E67E22" />
              <rect x="95" y="120" width="40" height="60" fill="#C0392B" />
              <rect x="150" y="100" width="40" height="80" fill="#3498DB" />
              <rect x="205" y="110" width="40" height="70" fill="#8E44AD" />
              <text x="50" y="200" textAnchor="middle" fontSize="11" fill="#666">ไฟฟ้า</text>
              <text x="105" y="200" textAnchor="middle" fontSize="11" fill="#666">น้ำ</text>
              <text x="160" y="200" textAnchor="middle" fontSize="11" fill="#666">ซ่อม</text>
              <text x="215" y="200" textAnchor="middle" fontSize="11" fill="#666">อื่นๆ</text>
              <text x="50" y="60" textAnchor="middle" fontSize="12" fontWeight="600" fill="#333">8</text>
              <text x="105" y="100" textAnchor="middle" fontSize="12" fontWeight="600" fill="#333">4</text>
              <text x="160" y="75" textAnchor="middle" fontSize="12" fontWeight="600" fill="#333">6</text>
              <text x="215" y="85" textAnchor="middle" fontSize="12" fontWeight="600" fill="#333">5</text>
            </svg>
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div className="g2">
        <div className="card">
          <div className="ch">
            <div className="ch-ico">⚡</div>
            <div className="ct">รายการด่วน — รออนุมัติ</div>
            <button className="btn btn-xs btn-o">ดูทั้งหมด</button>
          </div>
          <div className="cb">
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', minWidth: '300px' }}>
                <thead>
                  <tr>
                    <th>ประเภท</th>
                    <th>จาก</th>
                    <th>รายการ</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><span className="bd b-wn">สลิป</span></td>
                    <td>10/1</td>
                    <td style={{ fontSize: '12px' }}>ค่าส่วนกลาง ฿2,750</td>
                    <td><button className="btn btn-xs btn-a">ดู</button></td>
                  </tr>
                  <tr>
                    <td><span className="bd b-pr">รถ</span></td>
                    <td>8/4</td>
                    <td style={{ fontSize: '12px' }}>ขอเพิ่มรถใหม่</td>
                    <td><button className="btn btn-xs btn-a">ดู</button></td>
                  </tr>
                  <tr>
                    <td><span className="bd b-pr">บ้าน</span></td>
                    <td>10/1</td>
                    <td style={{ fontSize: '12px' }}>แก้ไข Email</td>
                    <td><button className="btn btn-xs btn-a">ดู</button></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="ch">
            <div className="ch-ico">⚠️</div>
            <div className="ct">แจ้งเตือนล่าสุด</div>
          </div>
          <div className="cb">
            <div className="vio">
              <div className="vio-t">จอดรถขวางทางเข้า-ออก</div>
              <div style={{ fontSize: '12px', marginTop: '3px' }}>บ้าน 10/1 · 14 มี.ค.</div>
              <div style={{ marginTop: '6px' }}><span className="bd b-wn">รอดำเนินการ</span></div>
            </div>
            <div className="iss">
              <div className="iss-h">
                <div className="iss-t">ส่งเสียงดัง</div>
                <span className="bd b-ok">แก้แล้ว</span>
              </div>
              <div className="iss-m">บ้าน 22/5 · 13 มี.ค.</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AdminDashboard
