import React, { useContext, useState, useEffect } from 'react'
import { ModalContext } from './AdminLayout'
import { getAuditLogs } from '../../lib/auditLogs'

const AdminLogs = () => {
  const { openModal } = useContext(ModalContext)
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadLogs()
  }, [])

  const loadLogs = async () => {
    setLoading(true)
    try {
      const data = await getAuditLogs(100)
      setLogs(data)
    } catch (error) {
      console.error('Error loading logs:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleViewLog = (log) => {
    const newValues = log.new_values ? JSON.stringify(log.new_values, null, 2) : '-'
    const actionBg = log.action === 'INSERT' ? 'b-pr' : log.action === 'UPDATE' ? 'b-a' : 'b-mu'
    openModal('รายละเอียด Log: ' + log.action, {
      timestamp: { label: 'เวลา', type: 'text', value: new Date(log.acted_at).toLocaleString('th-TH'), disabled: true },
      user: { label: 'ผู้ใช้', type: 'text', value: log.profiles?.name || 'System', disabled: true },
      action: { label: 'การดำเนินการ', type: 'text', value: log.action, disabled: true },
      table: { label: 'ตาราข้อมูล', type: 'text', value: log.table_name, disabled: true },
    }, null)
  }
  return (
    <div className="pane on">
      <div className="ph">
        <div className="ph-in">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div className="ph-ico">📋</div>
            <div>
              <div className="ph-h1">ข้อมูล Log</div>
              <div className="ph-sub">บันทึกกิจกรรมของระบบ</div>
            </div>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: '16px' }}>
        <div className="ch"><div className="ct">ข้อมูล Log ล่าสุด ({logs.length})</div></div>
        <div className="cb">
          {loading ? (
            <div style={{ padding: '20px', textAlign: 'center', color: '#999' }}>กำลังโหลด...</div>
          ) : logs.length === 0 ? (
            <div style={{ padding: '20px', textAlign: 'center', color: '#999' }}>ไม่มีข้อมูล Log</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="tw" style={{ width: '100%', minWidth: '700px', fontSize: '12px' }}>
                <thead><tr>
                  <th>เวลา</th><th>ผู้ใช้</th><th>การดำเนินการ</th><th>ตาราข้อมูล</th><th/>
                </tr></thead>
                <tbody>
                  {logs.map((log) => {
                    const actionBg = log.action === 'INSERT' ? 'b-pr' : log.action === 'UPDATE' ? 'b-a' : 'b-mu'
                    const time = new Date(log.acted_at).toLocaleString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                    return (
                      <tr key={log.id}>
                        <td>{time}</td>
                        <td>{log.profiles?.name || 'System'}</td>
                        <td><span className={`bd ${actionBg}`}>{log.action}</span></td>
                        <td>{log.table_name}</td>
                        <td><button className="btn btn-xs btn-o" onClick={() => handleViewLog(log)}>ดู</button></td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default AdminLogs
