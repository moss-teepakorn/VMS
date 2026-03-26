import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getDashboardData } from '../../lib/dashboard'
import './AdminDashboard.css'

const AdminDashboard = () => {
  const navigate = useNavigate()
  const [dashboard, setDashboard] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        setLoading(true)
        setDashboard(await getDashboardData())
      } catch (error) {
        console.error('Error loading dashboard:', error)
      } finally {
        setLoading(false)
      }
    }

    loadDashboard()
  }, [])

  const paymentMax = useMemo(() => {
    if (!dashboard) return 1
    return Math.max(...dashboard.paymentTrend.flatMap((item) => [item.collected, item.outstanding]), 1)
  }, [dashboard])

  const quarterMax = useMemo(() => {
    if (!dashboard) return 1
    return Math.max(...dashboard.quarterlyTrend.flatMap((item) => [item.paid, item.outstanding]), 1)
  }, [dashboard])

  const categoryMax = useMemo(() => {
    if (!dashboard) return 1
    return Math.max(...dashboard.issueCategories.map((item) => item.count), 1)
  }, [dashboard])

  if (loading && !dashboard) {
    return <div className="pane on"><div className="card"><div className="cb" style={{ padding: '24px', textAlign: 'center', color: 'var(--mu)' }}>กำลังโหลดข้อมูล dashboard...</div></div></div>
  }

  const todayLabel = new Date().toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' })
  const data = dashboard || {
    header: { totalHouses: 0, averageRating: 0, totalOutstanding: 0 },
    kpis: { totalHouses: 0, newHousesThisMonth: 0, overdueCount: 0, overdueAmount: 0, pendingApprovals: 0, openIssues: 0, averageRating: 0 },
    paymentTrend: [],
    houseStatus: { normal: 0, overdue: 0, suspended: 0, lawsuit: 0 },
    quarterlyTrend: [],
    issueCategories: [],
    quickApprovals: [],
    alerts: [],
  }

  return (
    <div className="pane on" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Page Header */}
      <div className="ph">
        <div className="ph-in">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div className="ph-ico">📊</div>
            <div>
              <div className="ph-h1">Dashboard ภาพรวม</div>
              <div className="ph-sub" id="dash-sub">The Greenfield · {todayLabel}</div>
            </div>
          </div>
          <div className="ph-acts">
            <div style={{ display: 'flex', gap: '14px' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '18px', fontWeight: 800, color: '#fff' }}>{data.header.totalHouses}</div>
                <div style={{ fontSize: '9.5px', color: 'rgba(255,255,255,.75)' }}>บ้านทั้งหมด</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '18px', fontWeight: 800, color: '#fff' }}>⭐{data.header.averageRating.toFixed(1)}</div>
                <div style={{ fontSize: '9.5px', color: 'rgba(255,255,255,.75)' }}>คะแนนบริการ</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '18px', fontWeight: 800, color: '#fff' }}>฿{Math.round(data.header.totalOutstanding / 1000)}K</div>
                <div style={{ fontSize: '9.5px', color: 'rgba(255,255,255,.75)' }}>ค้างชำระรวม</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="stats">
        <div className="sc">
          <div className="sc-ico p">🏠</div>
          <div>
            <div className="sc-v">{data.kpis.totalHouses}</div>
            <div className="sc-l">บ้านทั้งหมด</div>
            <div className="sc-s"><span className="up">↑{data.kpis.newHousesThisMonth}</span> ใหม่เดือนนี้</div>
          </div>
        </div>
        <div className="sc">
          <div className="sc-ico d">💰</div>
          <div>
            <div className="sc-v">{data.kpis.overdueCount}</div>
            <div className="sc-l">ค้างชำระ</div>
            <div className="sc-s"><span className="dn">฿{data.kpis.overdueAmount.toLocaleString('th-TH')}</span></div>
          </div>
        </div>
        <div className="sc">
          <div className="sc-ico w">📝</div>
          <div>
            <div className="sc-v">{data.kpis.pendingApprovals}</div>
            <div className="sc-l">รออนุมัติทั้งหมด</div>
            <div className="sc-s">จากรถ, ชำระเงิน, ตลาด, ช่าง</div>
          </div>
        </div>
        <div className="sc">
          <div className="sc-ico a">🔧</div>
          <div>
            <div className="sc-v">{data.kpis.openIssues}</div>
            <div className="sc-l">ปัญหาค้างอยู่</div>
            <div className="sc-s"><span className="up">⭐{data.kpis.averageRating.toFixed(1)}</span> คะแนน</div>
          </div>
        </div>
      </div>

      {/* Charts Row 1 */}
      <div className="g2">
        <div className="chart-box">
          <div className="ch">
            <h3>💰 ยอดชำระ vs ค้าง — 6 เดือน</h3>
          </div>
          <div className="chart-wrap">
            <svg viewBox="0 0 600 250" style={{ width: '100%', height: '200px' }}>
              {data.paymentTrend.map((item, index) => {
                const baseX = 50 + index * 70
                const collectedHeight = (item.collected / paymentMax) * 120
                const outstandingHeight = (item.outstanding / paymentMax) * 120
                return (
                  <g key={item.key}>
                    <rect x={baseX} y={220 - collectedHeight} width="30" height={collectedHeight} fill="#28B463" />
                    <rect x={baseX + 35} y={220 - outstandingHeight} width="20" height={outstandingHeight} fill="#C0392B" />
                    <text x={baseX} y="240" fontSize="12" fill="#666">{item.label}</text>
                  </g>
                )
              })}
              <text x="300" y="20" fontSize="14" fontWeight="600" fill="#333">เก็บได้ {data.paymentTrend.reduce((sum, item) => sum + item.collected, 0).toLocaleString('th-TH')} ฿ ค้าง {data.paymentTrend.reduce((sum, item) => sum + item.outstanding, 0).toLocaleString('th-TH')} ฿</text>
            </svg>
          </div>
        </div>
        <div className="chart-box">
          <div className="ch">
            <h3>🏠 สถานะบ้านทั้งหมด (128 หลัง)</h3>
          </div>
          <div className="chart-wrap">
            <svg viewBox="0 0 300 250" style={{ width: '100%', height: '200px' }}>
              <circle cx="120" cy="100" r="70" fill="#28B463" />
              <circle cx="120" cy="100" r="60" fill="white" />
              <text x="120" y="105" textAnchor="middle" fontSize="16" fontWeight="700" fill="#333">{data.houseStatus.normal}</text>
              <text x="120" y="125" textAnchor="middle" fontSize="12" fill="#666">ปกติ</text>
              <text x="220" y="50" fontSize="12" fill="#333">🟢 ปกติ: {data.houseStatus.normal} หลัง</text>
              <text x="220" y="70" fontSize="12" fill="#333">🟠 ค้างชำระ: {data.houseStatus.overdue} หลัง</text>
              <text x="220" y="90" fontSize="12" fill="#333">🔴 ระงับสิทธิ์: {data.houseStatus.suspended} หลัง</text>
              <text x="220" y="110" fontSize="12" fill="#333">⚫ ฟ้องร้อง: {data.houseStatus.lawsuit} หลัง</text>
            </svg>
          </div>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="g2">
        <div className="chart-box">
          <div className="ch">
            <h3>📈 ยอดเก็บ vs ค้างรายไตรมาส</h3>
          </div>
          <div className="chart-wrap">
            <svg viewBox="0 0 600 250" style={{ width: '100%', height: '200px' }}>
              {data.quarterlyTrend.map((item, index) => {
                const baseX = 60 + index * 80
                const paidHeight = (item.paid / quarterMax) * 110
                const outstandingHeight = (item.outstanding / quarterMax) * 110
                return (
                  <g key={item.key}>
                    <rect x={baseX} y={200 - paidHeight} width="50" height={paidHeight} fill="#1B4F72" />
                    <rect x={baseX + 25} y={200 - outstandingHeight} width="20" height={outstandingHeight} fill="#E67E22" />
                    <text x={baseX + 5} y="230" fontSize="12" fill="#666">{item.key}</text>
                  </g>
                )
              })}
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
              {data.issueCategories.slice(0, 4).map((item, index) => {
                const x = 40 + index * 55
                const height = (item.count / categoryMax) * 100
                return (
                  <g key={item.category}>
                    <rect x={x} y={180 - height} width="40" height={height} fill={['#E67E22', '#C0392B', '#3498DB', '#8E44AD'][index]} />
                    <text x={x + 20} y="200" textAnchor="middle" fontSize="11" fill="#666">{item.category}</text>
                    <text x={x + 20} y={165 - height} textAnchor="middle" fontSize="12" fontWeight="600" fill="#333">{item.count}</text>
                  </g>
                )
              })}
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
                  {data.quickApprovals.length === 0 ? (
                    <tr><td colSpan="4" style={{ textAlign: 'center', color: 'var(--mu)', padding: '16px' }}>ไม่มีรายการรออนุมัติ</td></tr>
                  ) : data.quickApprovals.map((item, index) => (
                    <tr key={`${item.type}-${index}`}>
                      <td><span className={`bd ${item.type === 'สลิป' ? 'b-wn' : 'b-pr'}`}>{item.type}</span></td>
                      <td>{item.source}</td>
                      <td style={{ fontSize: '12px' }}>{item.detail}</td>
                      <td><button className="btn btn-xs btn-a" onClick={() => navigate(item.type === 'สลิป' ? '/admin/fees' : '/admin/vehicles')}>ดู</button></td>
                    </tr>
                  ))}
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
            {data.alerts.length === 0 ? (
              <div style={{ color: 'var(--mu)', fontSize: '13px' }}>ยังไม่มีแจ้งเตือนจากฐานข้อมูล</div>
            ) : data.alerts.map((item, index) => item.kind === 'violation' ? (
              <div key={`alert-${index}`} className="vio">
                <div className="vio-t">{item.title}</div>
                <div style={{ fontSize: '12px', marginTop: '3px' }}>{item.meta}</div>
                <div style={{ marginTop: '6px' }}><span className="bd b-wn">{item.status}</span></div>
              </div>
            ) : (
              <div key={`alert-${index}`} className="iss">
                <div className="iss-h">
                  <div className="iss-t">{item.title}</div>
                  <span className={`bd ${item.status === 'resolved' || item.status === 'closed' ? 'b-ok' : 'b-pr'}`}>{item.status}</span>
                </div>
                <div className="iss-m">{item.meta}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default AdminDashboard
