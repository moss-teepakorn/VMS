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
          <div className="chart-wrap" id="ch-pay6">Loading chart...</div>
        </div>
        <div className="chart-box">
          <div className="ch">
            <h3>🏠 สถานะบ้านทั้งหมด (128 หลัง)</h3>
          </div>
          <div className="chart-wrap" id="ch-hstatus">Loading chart...</div>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="g2" style={{ marginBottom: '14px' }}>
        <div className="chart-box">
          <div className="ch">
            <h3>📈 ยอดเก็บ vs ค้างรายไตรมาส</h3>
          </div>
          <div className="chart-wrap" id="ch-qfee">Loading chart...</div>
        </div>
        <div className="chart-box">
          <div className="ch">
            <h3>🔧 ปัญหาตามประเภท</h3>
          </div>
          <div className="chart-wrap" id="ch-issues">Loading chart...</div>
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
