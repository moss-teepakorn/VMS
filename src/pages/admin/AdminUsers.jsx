import React, { useContext, useState, useEffect } from 'react'
import { ModalContext } from './AdminLayout'
import { getUsers, createUser, updateUser, deleteUser, formatDateTime } from '../../lib/users'

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
    { label: 'ผู้ดูแลระบบ', value: 'admin' },
    { label: 'ลูกบ้าน', value: 'resident' },
  ]

  const statusOptions = [
    { label: 'Active', value: 'true' },
    { label: 'Inactive', value: 'false' },
  ]

  const handleAddUser = () => {
    openModal('เพิ่มผู้ใช้ใหม่', {
      username: { label: 'ชื่อผู้ใช้', type: 'text', placeholder: 'username' },
      password: { label: 'รหัสผ่าน', type: 'password', placeholder: 'อย่างน้อย 6 ตัวอักษร' },
      full_name: { label: 'ชื่อ-นามสกุล', type: 'text', placeholder: 'นายสมชาติ' },
      email: { label: 'อีเมล', type: 'email', placeholder: 'name@example.com' },
      phone: { label: 'เบอร์', type: 'tel', placeholder: '098-xxx-xxxx' },
      house_id: { label: 'house_id', type: 'text', placeholder: 'เว้นว่างได้ (หนึ่งบ้านมีหลายผู้ใช้ได้)' },
      role: { label: 'บทบาท', type: 'select', options: roleOptions },
      is_active: { label: 'สถานะ', type: 'select', options: statusOptions },
    }, async (data) => {
      try {
        if (!data.username?.value || !data.password?.value) {
          alert('กรุณาระบุชื่อผู้ใช้และรหัสผ่าน')
          return
        }
        await createUser({
          username: data.username?.value,
          password: data.password?.value,
          full_name: data.full_name?.value,
          email: data.email?.value,
          phone: data.phone?.value,
          house_id: data.house_id?.value,
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
      username: { label: 'ชื่อผู้ใช้', type: 'text', value: user.username || '' },
      password: { label: 'รหัสผ่านใหม่ (ถ้าไม่เปลี่ยนให้เว้นว่าง)', type: 'password', value: '' },
      full_name: { label: 'ชื่อ-นามสกุล', type: 'text', value: user.full_name || '' },
      email: { label: 'อีเมล', type: 'email', value: user.email || '' },
      phone: { label: 'เบอร์', type: 'tel', value: user.phone || '' },
      house_id: { label: 'house_id', type: 'text', value: user.house_id || '' },
      role: { label: 'บทบาท', type: 'select', value: user.role || 'resident', options: roleOptions },
      is_active: { label: 'สถานะ', type: 'select', value: user.is_active ? 'true' : 'false', options: statusOptions },
    }, async (data) => {
      try {
        await updateUser(user.id, {
          username: data.username?.value,
          password: data.password?.value,
          full_name: data.full_name?.value,
          email: data.email?.value,
          phone: data.phone?.value,
          house_id: data.house_id?.value,
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

  const handleResetPassword = (user) => {
    openModal('ตั้งรหัสผ่านใหม่', {
      password: { label: 'รหัสผ่านใหม่', type: 'password', placeholder: 'อย่างน้อย 6 ตัวอักษร' },
    }, async (data) => {
      try {
        if (!data.password?.value) {
          alert('กรุณากรอกรหัสผ่านใหม่')
          return
        }
        await updateUser(user.id, { password: data.password?.value })
        alert('เปลี่ยนรหัสผ่านเรียบร้อย')
      } catch (error) {
        alert(`เปลี่ยนรหัสผ่านไม่สำเร็จ: ${error.message}`)
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
                  <th>ชื่อผู้ใช้</th>
                  <th>ชื่อ</th>
                  <th>อีเมล</th>
                  <th>เบอร์โทร</th>
                  <th>บ้าน (house_id)</th>
                  <th>บทบาท</th>
                  <th>สถานะ</th>
                  <th>วันที่สร้าง</th>
                  <th>ล่าสุดเข้าใช้งาน</th>
                  <th>จัดการ</th>
                </tr></thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id}>
                      <td>{user.username || '-'}</td>
                      <td>{user.full_name || '-'}</td>
                      <td>{user.email || '-'}</td>
                      <td>{user.phone || '-'}</td>
                      <td>{user.house_id || '-'}</td>
                      <td><span className="bd b-pr">{user.role === 'admin' ? 'ผู้ดูแลระบบ' : 'ลูกบ้าน'}</span></td>
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
