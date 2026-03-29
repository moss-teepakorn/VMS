import React, { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Chart from 'chart.js/auto'
import { getDashboardData } from '../../lib/dashboard'
import { getSetupConfig } from '../../lib/setup'
import villageLogo from '../../assets/village-logo.svg'
import './AdminDashboard.css'

const AdminDashboard = () => {
  const navigate = useNavigate()
  const [dashboard, setDashboard] = useState(null)
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [themeKey, setThemeKey] = useState(() => document.body.getAttribute('data-theme') || 'normal')
  const [setup, setSetup] = useState({
    villageName: 'The Greenfield',
    loginCircleLogoUrl: '',
  })
  const paymentChartRef = useRef(null)
  const houseStatusChartRef = useRef(null)
  const quarterlyChartRef = useRef(null)
  const issuesChartRef = useRef(null)
  const chartInstancesRef = useRef([])

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        setLoading(true)
        setLoadError('')
        setDashboard(await getDashboardData())
      } catch (error) {
        setLoadError(error?.message || 'ไม่สามารถโหลดข้อมูล dashboard ได้')
        console.error('Error loading dashboard:', error)
      } finally {
        setLoading(false)
      }
    }

    const loadSetup = async () => {
      try {
        const next = await getSetupConfig()
        setSetup(next)
      } catch (error) {
        console.error('Error loading setup config:', error)
      }
    }

    loadSetup()
    loadDashboard()
  }, [])

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setThemeKey(document.body.getAttribute('data-theme') || 'normal')
    })

    observer.observe(document.body, { attributes: true, attributeFilter: ['data-theme'] })

    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!dashboard) return

    const styles = getComputedStyle(document.body)
    const getVar = (name, fallback) => {
      const value = styles.getPropertyValue(name).trim()
      return value || fallback
    }

    const palette = {
      primary: getVar('--pr', '#1B4F72'),
      primaryLight: getVar('--prl', '#E8F4F8'),
      accent: getVar('--ac', '#28B463'),
      warning: getVar('--wn', '#E67E22'),
      danger: getVar('--dg', '#C0392B'),
      border: getVar('--bo', '#D1D5DB'),
      text: getVar('--tx', '#334155'),
      muted: getVar('--mu', '#6B7280'),
      card: getVar('--card', '#FFFFFF'),
      bg2: getVar('--bg2', '#F1F5F9'),
    }

    chartInstancesRef.current.forEach((chart) => chart.destroy())
    chartInstancesRef.current = []

    Chart.defaults.font.family = 'Sarabun, sans-serif'
    Chart.defaults.color = palette.text
    Chart.defaults.borderColor = palette.border

    if (paymentChartRef.current) {
      const paymentChart = new Chart(paymentChartRef.current, {
        type: 'bar',
        data: {
          labels: data.paymentTrend.map((item) => item.label),
          datasets: [
            {
              label: 'ยอดเก็บได้',
              data: data.paymentTrend.map((item) => item.collected),
              backgroundColor: palette.accent,
              borderRadius: 6,
              maxBarThickness: 26,
            },
            {
              label: 'ยอดค้าง',
              data: data.paymentTrend.map((item) => item.outstanding),
              backgroundColor: palette.danger,
              borderRadius: 6,
              maxBarThickness: 26,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: { duration: 900, easing: 'easeOutQuart' },
          plugins: {
            legend: { position: 'bottom', labels: { usePointStyle: true, boxWidth: 8 } },
          },
          scales: {
            y: {
              beginAtZero: true,
              ticks: {
                callback: (value) => `${Number(value).toLocaleString('th-TH')}`,
              },
            },
          },
        },
      })
      chartInstancesRef.current.push(paymentChart)
    }

    if (houseStatusChartRef.current) {
      const houseStatusChart = new Chart(houseStatusChartRef.current, {
        type: 'doughnut',
        data: {
          labels: ['ปกติ', 'ค้างชำระ', 'ระงับสิทธิ์', 'ฟ้องร้อง'],
          datasets: [
            {
              data: [
                data.houseStatus.normal,
                data.houseStatus.overdue,
                data.houseStatus.suspended,
                data.houseStatus.lawsuit,
              ],
              backgroundColor: [palette.accent, palette.warning, '#EF4444', '#A855F7'],
              borderColor: palette.card,
              borderWidth: 2,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: '62%',
          animation: { duration: 950, easing: 'easeOutQuart' },
          plugins: {
            legend: { position: 'bottom', labels: { usePointStyle: true, boxWidth: 8 } },
          },
        },
      })
      chartInstancesRef.current.push(houseStatusChart)
    }

    if (quarterlyChartRef.current) {
      const quarterlyChart = new Chart(quarterlyChartRef.current, {
        type: 'line',
        data: {
          labels: data.quarterlyTrend.map((item) => item.key),
          datasets: [
            {
              label: 'ยอดเก็บได้',
              data: data.quarterlyTrend.map((item) => item.paid),
              borderColor: palette.primary,
              backgroundColor: palette.primaryLight,
              pointBackgroundColor: palette.primary,
              fill: true,
              tension: 0.28,
            },
            {
              label: 'ยอดค้าง',
              data: data.quarterlyTrend.map((item) => item.outstanding),
              borderColor: palette.warning,
              backgroundColor: 'transparent',
              pointBackgroundColor: palette.warning,
              tension: 0.28,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: { duration: 1000, easing: 'easeOutQuart' },
          plugins: {
            legend: { position: 'bottom', labels: { usePointStyle: true, boxWidth: 8 } },
          },
          scales: {
            y: {
              beginAtZero: true,
            },
          },
        },
      })
      chartInstancesRef.current.push(quarterlyChart)
    }

    if (issuesChartRef.current) {
      const issueData = data.issueCategories.slice(0, 6)
      const issuesChart = new Chart(issuesChartRef.current, {
        type: 'pie',
        data: {
          labels: issueData.map((item) => item.category),
          datasets: [
            {
              data: issueData.map((item) => item.count),
              backgroundColor: [
                palette.warning,
                palette.danger,
                palette.primary,
                '#7C3AED',
                '#06B6D4',
                '#4B5563',
              ],
              borderColor: palette.card,
              borderWidth: 2,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: { duration: 900, easing: 'easeOutQuart' },
          plugins: {
            legend: { position: 'bottom', labels: { usePointStyle: true, boxWidth: 8 } },
          },
        },
      })
      chartInstancesRef.current.push(issuesChart)
    }

    return () => {
      chartInstancesRef.current.forEach((chart) => chart.destroy())
      chartInstancesRef.current = []
    }
  }, [dashboard, themeKey])

  if (loading && !dashboard) {
    return <div className="pane on"><div className="card"><div className="cb" style={{ padding: '24px', textAlign: 'center', color: 'var(--mu)' }}>กำลังโหลดข้อมูล dashboard...</div></div></div>
  }

  if (!loading && !dashboard) {
    return (
      <div className="pane on">
        <div className="card">
          <div className="cb" style={{ padding: '24px', textAlign: 'center', color: 'var(--mu)' }}>
            {loadError || 'ไม่พบข้อมูลจริงสำหรับแสดงผล Dashboard'}
          </div>
        </div>
      </div>
    )
  }

  const todayLabel = new Date().toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' })
  const data = dashboard

  return (
    <div className="pane on dashboard dashboard-v1" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Page Header */}
      <div className="ph">
        <div className="ph-in">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div className="ph-ico">
              <img className="ph-ico-img" src={setup.loginCircleLogoUrl || villageLogo} alt="system-logo" />
            </div>
            <div>
              <div className="ph-h1">Dashboard ภาพรวม</div>
              <div className="ph-sub" id="dash-sub">{setup.villageName} · {todayLabel}</div>
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
            <canvas ref={paymentChartRef} />
          </div>
        </div>
        <div className="chart-box house-status-card">
          <div className="ch">
            <h3>🏠 สถานะบ้านทั้งหมด ({data.header.totalHouses} หลัง)</h3>
          </div>
          <div className="chart-wrap house-status-wrap">
            <canvas ref={houseStatusChartRef} />
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
            <canvas ref={quarterlyChartRef} />
          </div>
        </div>
        <div className="chart-box">
          <div className="ch">
            <h3>🔧 ปัญหาตามประเภท</h3>
          </div>
          <div className="chart-wrap">
            <canvas ref={issuesChartRef} />
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
