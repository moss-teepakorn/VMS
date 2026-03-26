import React, { useContext, useState, useEffect } from 'react'
import { ModalContext } from './AdminLayout'
import { getUsers, createUser } from '../../lib/users'

const AdminUsers = () => {
  const { openModal } = useContext(ModalContext)
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadUsers()
  }, [])

  const loadUsers = async () => {
    setLoading(true)
    try {
      const data = await getUsers()
      setUsers(data)
    } catch (error) {
      console.error('Error loading users:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddUser = () => {
    openModal('เพิ่มผู้ใช้ใหม่', {
      name: { label: 'ชื่อ-นามสกุล', type: 'text', placeholder: 'นายสมชาติ' },
      email: { label: 'อีเมล', type: 'email', placeholder: 'email@example.com' },
      phone: { label: 'เบอร์', type: 'tel', placeholder: '098-xxx-xxxx' },
      role: { label: 'บทบาท', type: 'select', options: [
        { label: 'Admin', value: 'admin' },
        { label: 'จัดการ', value: 'manager' },
        { label: 'เจ้าหน้าที่', value: 'staff' },
        { label: 'สมาชิก', value: 'member' }
      ]},
    }, async (data) => {
      try {
        await createUser({
          name: data.name?.value,
          email: data.email?.value,
          phone: data.phone?.value,
          role: data.role?.value,
        })
        loadUsers()
      } catch (error) {
        console.error('Error adding user:', error)
      }
    })
  }
  return (
    <div className="pane on">
      <div className="ph">
        <div className="ph-in">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div className="ph-ico">👥</div>
            <div>
              <div className="ph-h1">ผู้ใช้งาน</div>
              <div className="ph-sub">จัดการบัญชีผู้ใช้ของระบบ</div>
            </div>
          </div>
          <div className="ph-acts">
            <button className="btn btn-p btn-sm">+ เพิ่มผู้ใช้ใหม่</button>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: '16px' }}>
        <div className="ch"><div className="ct">รายชื่อผู้ใช้งาน ({users.length})</div></div>
        <div className="cb">
          {loading ? (
            <div style={{ padding: '20px', textAlign: 'center', color: '#999' }}>กำลังโหลด...</div>
          ) : users.length === 0 ? (
            <div style={{ padding: '20px', textAlign: 'center', color: '#999' }}>ไม่มีข้อมูลผู้ใช้</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="tw" style={{ width: '100%', minWidth: '600px' }}>
                <thead><tr>
                  <th>ชื่อ</th><th>อีเมล</th><th>เบอร์โทร</th><th>บทบาท</th><th/>
                </tr></thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id}>
                      <td>{user.name || '-'}</td>
                      <td>{user.email}</td>
                      <td>{user.phone || '-'}</td>
                      <td><span className="bd b-pr">{user.role || 'member'}</span></td>
                      <td><button className="btn btn-xs btn-o">ดู</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default AdminUsers
