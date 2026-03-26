import React, { useContext, useState, useEffect } from 'react'
import { ModalContext } from './AdminLayout'
import { getUsers, createUser, updateUser, deleteUser, sendResetPasswordEmail, formatDateTime } from '../../lib/users'

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

  const roleOptions = [
    { label: 'Admin', value: 'admin' },
    { label: 'Resident', value: 'resident' },
  ]

  const statusOptions = [
    { label: 'Active', value: 'true' },
    { label: 'Inactive', value: 'false' },
  ]

  const handleAddUser = () => {
    openModal('เพิ่มผู้ใช้ใหม่', {
      id: { label: 'Auth User ID (UUID)', type: 'text', placeholder: 'ใส่ UUID จาก auth.users' },
      full_name: { label: 'ชื่อ-นามสกุล', type: 'text', placeholder: 'นายสมชาติ' },
      email: { label: 'อีเมล', type: 'email', placeholder: 'name@example.com' },
      phone: { label: 'เบอร์', type: 'tel', placeholder: '098-xxx-xxxx' },
      role: { label: 'บทบาท', type: 'select', options: roleOptions },
      is_active: { label: 'สถานะ', type: 'select', options: statusOptions },
    }, async (data) => {
      try {
        if (!data.id?.value) {
          alert('กรุณาใส่ Auth User ID ก่อน')
          return
        }
        await createUser({
          id: data.id?.value,
          full_name: data.full_name?.value,
          email: data.email?.value,
          phone: data.phone?.value,
          role: data.role?.value,
          is_active: data.is_active?.value !== 'false',
        })
        loadUsers()
      } catch (error) {
        console.error('Error adding user:', error)
        alert(`เพิ่มผู้ใช้ไม่สำเร็จ: ${error.message}`)
      }
    })
  }

  const handleEditUser = (user) => {
    openModal('แก้ไขผู้ใช้', {
      full_name: { label: 'ชื่อ-นามสกุล', type: 'text', value: user.full_name || '' },
      email: { label: 'อีเมล', type: 'email', value: user.email || '' },
      phone: { label: 'เบอร์', type: 'tel', value: user.phone || '' },
      role: { label: 'บทบาท', type: 'select', value: user.role || 'resident', options: roleOptions },
      is_active: { label: 'สถานะ', type: 'select', value: user.is_active ? 'true' : 'false', options: statusOptions },
    }, async (data) => {
      try {
        await updateUser(user.id, {
          full_name: data.full_name?.value,
          email: data.email?.value,
          phone: data.phone?.value,
          role: data.role?.value,
          is_active: data.is_active?.value !== 'false',
        })
        loadUsers()
      } catch (error) {
        console.error('Error updating user:', error)
        alert(`แก้ไขผู้ใช้ไม่สำเร็จ: ${error.message}`)
      }
    })
  }

  const handleDeleteUser = async (user) => {
    const ok = window.confirm(`ยืนยันลบผู้ใช้: ${user.full_name || user.id} ?`)
    if (!ok) return
    try {
      await deleteUser(user.id)
      loadUsers()
    } catch (error) {
      console.error('Error deleting user:', error)
      alert(`ลบผู้ใช้ไม่สำเร็จ: ${error.message}`)
    }
  }

  const handleToggleActive = async (user) => {
    try {
      await updateUser(user.id, { is_active: !user.is_active })
      loadUsers()
    } catch (error) {
      console.error('Error toggling active:', error)
      alert(`อัปเดตสถานะไม่สำเร็จ: ${error.message}`)
    }
  }

  const handleChangeRole = async (user) => {
    const nextRole = user.role === 'admin' ? 'resident' : 'admin'
    try {
      await updateUser(user.id, { role: nextRole })
      loadUsers()
    } catch (error) {
      console.error('Error changing role:', error)
      alert(`เปลี่ยนบทบาทไม่สำเร็จ: ${error.message}`)
    }
  }

  const handleResetPassword = async (user) => {
    try {
      await sendResetPasswordEmail(user.email)
      alert(`ส่งอีเมลรีเซ็ตรหัสผ่านแล้ว: ${user.email}`)
    } catch (error) {
      alert(`ส่งอีเมลรีเซ็ตรหัสผ่านไม่สำเร็จ: ${error.message}`)
    }
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
            <button className="btn btn-p btn-sm" onClick={handleAddUser}>+ เพิ่มผู้ใช้ใหม่</button>
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
              <table className="tw" style={{ width: '100%', minWidth: '980px' }}>
                <thead><tr>
                  <th>ชื่อ</th>
                  <th>อีเมล</th>
                  <th>เบอร์โทร</th>
                  <th>บทบาท</th>
                  <th>สถานะ</th>
                  <th>วันที่สร้าง</th>
                  <th>ล่าสุดเข้าใช้งาน</th>
                  <th>จัดการ</th>
                </tr></thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id}>
                      <td>{user.full_name || '-'}</td>
                      <td>{user.email || '-'}</td>
                      <td>{user.phone || '-'}</td>
                      <td><span className="bd b-pr">{user.role || 'resident'}</span></td>
                      <td>
                        {user.is_active ? (
                          <span className="bd b-ok">active</span>
                        ) : (
                          <span className="bd b-mu">inactive</span>
                        )}
                      </td>
                      <td>{formatDateTime(user.created_at)}</td>
                      <td>{formatDateTime(user.last_login_at)}</td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        <button className="btn btn-xs btn-a" style={{ marginRight: '4px' }} onClick={() => handleEditUser(user)}>แก้ไข</button>
                        <button className="btn btn-xs btn-o" style={{ marginRight: '4px' }} onClick={() => handleChangeRole(user)}>สลับบทบาท</button>
                        <button className="btn btn-xs btn-o" style={{ marginRight: '4px' }} onClick={() => handleToggleActive(user)}>{user.is_active ? 'ปิดใช้งาน' : 'เปิดใช้งาน'}</button>
                        <button className="btn btn-xs btn-o" style={{ marginRight: '4px' }} onClick={() => handleResetPassword(user)}>รีเซ็ตรหัสผ่าน</button>
                        <button className="btn btn-xs btn-dg" onClick={() => handleDeleteUser(user)}>ลบ</button>
                      </td>
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
