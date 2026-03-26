import React, { useState, useEffect } from 'react'
import Swal from 'sweetalert2'
import {
  getUsers,
  createUser,
  updateUser,
  deleteUser,
  listHouseOptions,
  getHouseDetail,
  formatDateTime,
} from '../../lib/users'

const EMPTY_FORM = {
  username: '',
  password: '',
  full_name: '',
  email: '',
  phone: '',
  role: 'resident',
  is_active: true,
  house_id: '',
}

const AdminUsers = () => {
  const [users, setUsers] = useState([])
  const [houses, setHouses] = useState([])
  const [selectedHouse, setSelectedHouse] = useState(null)
  const [loading, setLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [editingUser, setEditingUser] = useState(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)

  useEffect(() => {
    loadUsers()
    loadHouses()
  }, [])

  const loadUsers = async () => {
    setLoading(true)
    try {
      const data = await getUsers()
      setUsers(data)
    } catch (error) {
      console.error('Error loading users:', error)
      await Swal.fire({ icon: 'error', title: 'โหลดข้อมูลไม่สำเร็จ', text: error.message })
    } finally {
      setLoading(false)
    }
  }

  const loadHouses = async () => {
    try {
      const rows = await listHouseOptions()
      setHouses(rows)
    } catch (error) {
      console.error('Error loading houses:', error)
      await Swal.fire({ icon: 'error', title: 'โหลดบ้านไม่สำเร็จ', text: error.message })
    }
  }

  const getHouseNo = (houseId) => {
    if (!houseId) return '-'
    const house = houses.find((item) => item.id === houseId)
    return house?.house_no || '-'
  }

  const getHouseOwnerName = (houseId, fallback = '-') => {
    if (!houseId) return fallback
    const house = houses.find((item) => item.id === houseId)
    return house?.owner_name || fallback
  }

  const getRoleText = (role) => (role === 'admin' ? 'ผู้ดูแลระบบ' : 'ลูกบ้าน')

  const openAddModal = () => {
    setEditingUser(null)
    setSelectedHouse(null)
    setForm(EMPTY_FORM)
    setShowModal(true)
  }

  const openEditModal = async (user) => {
    setEditingUser(user)
    setForm({
      username: user.username || '',
      password: '',
      full_name: user.full_name || '',
      email: user.email || '',
      phone: user.phone || '',
      role: user.role || 'resident',
      is_active: user.is_active ?? true,
      house_id: user.house_id || '',
    })

    if (user.house_id) {
      try {
        const detail = await getHouseDetail(user.house_id)
        setSelectedHouse(detail)
      } catch {
        setSelectedHouse(null)
      }
    } else {
      setSelectedHouse(null)
    }
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setEditingUser(null)
    setForm(EMPTY_FORM)
    setSelectedHouse(null)
  }

  const handleChange = (event) => {
    const { name, value } = event.target
    if (name === 'is_active') {
      setForm((prev) => ({ ...prev, is_active: value === 'true' }))
      return
    }
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleSelectHouse = async (event) => {
    const houseId = event.target.value
    setForm((prev) => ({ ...prev, house_id: houseId }))

    if (!houseId) {
      setSelectedHouse(null)
      return
    }

    try {
      const detail = await getHouseDetail(houseId)
      setSelectedHouse(detail)
      setForm((prev) => ({
        ...prev,
        full_name: detail?.owner_name || detail?.resident_name || detail?.contact_name || prev.full_name,
        email: detail?.email || prev.email,
        phone: detail?.phone || prev.phone,
      }))
    } catch (error) {
      console.error('Error loading house detail:', error)
      setSelectedHouse(null)
      await Swal.fire({ icon: 'error', title: 'โหลดข้อมูลบ้านไม่สำเร็จ', text: error.message })
    }
  }

  const validateForm = () => {
    if (!form.house_id) return 'กรุณาเลือกบ้านเลขที่'
    if (!form.username.trim()) return 'กรุณากรอก username'
    if (!form.password.trim()) return 'กรุณากรอก password'
    if (!form.full_name.trim()) return 'กรุณากรอกชื่อ-นามสกุล'
    if (!form.email.trim()) return 'กรุณากรอก email'
    if (!form.phone.trim()) return 'กรุณากรอกเบอร์โทร'
    return null
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    const validationError = validateForm()
    if (validationError) {
      await Swal.fire({ icon: 'warning', title: 'ข้อมูลไม่ครบ', text: validationError })
      return
    }

    setSaving(true)
    try {
      const payload = {
        username: form.username,
        password: form.password,
        full_name: form.full_name,
        email: form.email,
        phone: form.phone,
        role: form.role,
        is_active: form.is_active,
        house_id: form.house_id,
      }

      if (editingUser) {
        await updateUser(editingUser.id, payload)
      } else {
        await createUser(payload)
      }
      closeModal()
      await loadUsers()
      await Swal.fire({ icon: 'success', title: 'สำเร็จ', text: 'บันทึกข้อมูลผู้ใช้เรียบร้อย' })
    } catch (error) {
      console.error('Save user failed:', error)
      await Swal.fire({ icon: 'error', title: 'บันทึกไม่สำเร็จ', text: error.message })
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteUser = async (user) => {
    const result = await Swal.fire({
      icon: 'question',
      title: 'ยืนยันการลบผู้ใช้งาน',
      text: user.username || user.full_name || user.id,
      showCancelButton: true,
      confirmButtonText: 'ลบ',
      cancelButtonText: 'ยกเลิก',
    })
    if (!result.isConfirmed) return

    try {
      await deleteUser(user.id)
      await loadUsers()
      await Swal.fire({ icon: 'success', title: 'ลบสำเร็จ', text: 'ลบผู้ใช้งานเรียบร้อย' })
    } catch (error) {
      await Swal.fire({ icon: 'error', title: 'ลบไม่สำเร็จ', text: error.message })
    }
  }

  const handleQuickResetPassword = async (user) => {
    const result = await Swal.fire({
      title: `เปลี่ยนรหัสผ่าน: ${user.username}`,
      input: 'password',
      inputPlaceholder: 'กรอกรหัสผ่านใหม่ (อย่างน้อย 6 ตัวอักษร)',
      showCancelButton: true,
      confirmButtonText: 'บันทึก',
      cancelButtonText: 'ยกเลิก',
      inputValidator: (value) => {
        if (!value) return 'กรุณากรอกรหัสผ่านใหม่'
        if (value.length < 6) return 'รหัสผ่านต้องอย่างน้อย 6 ตัวอักษร'
        return undefined
      },
    })
    if (!result.isConfirmed) return

    try {
      await updateUser(user.id, { password: result.value })
      await Swal.fire({ icon: 'success', title: 'สำเร็จ', text: 'เปลี่ยนรหัสผ่านเรียบร้อย' })
    } catch (error) {
      await Swal.fire({ icon: 'error', title: 'ไม่สำเร็จ', text: error.message })
    }
  }

  return (
    <div className="pane on" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div className="ph">
        <div className="ph-in">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div className="ph-ico">👥</div>
            <div>
              <div className="ph-h1">ผู้ใช้งานระบบ</div>
              <div className="ph-sub">จัดการโปรไฟล์</div>
            </div>
          </div>
          <div className="ph-acts">
            <button className="btn btn-p btn-sm" onClick={openAddModal}>+ เพิ่มผู้ใช้ใหม่</button>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="ch"><div className="ct">รายชื่อผู้ใช้งาน ({users.length})</div></div>
        <div className="cb">
          {loading ? (
            <div style={{ padding: '20px', textAlign: 'center', color: '#999' }}>กำลังโหลด...</div>
          ) : users.length === 0 ? (
            <div style={{ padding: '20px', textAlign: 'center', color: '#999' }}>ไม่มีข้อมูลผู้ใช้</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="tw" style={{ width: '100%', minWidth: '1080px' }}>
                <thead><tr>
                  <th>บ้านเลขที่</th>
                  <th>username</th>
                  <th>ชื่อ-นามสกุล</th>
                  <th>email</th>
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
                      <td>{getHouseNo(user.house_id)}</td>
                      <td>{user.username || '-'}</td>
                      <td>{getHouseOwnerName(user.house_id, user.full_name || '-')}</td>
                      <td>{user.email || '-'}</td>
                      <td>{user.phone || '-'}</td>
                      <td><span className="bd b-pr">{getRoleText(user.role)}</span></td>
                      <td>{user.is_active ? <span className="bd b-ok">active</span> : <span className="bd b-mu">inactive</span>}</td>
                      <td>{formatDateTime(user.created_at)}</td>
                      <td>{formatDateTime(user.last_login_at)}</td>
                      <td><div className="td-acts">
                        <button className="btn btn-xs btn-a" onClick={() => openEditModal(user)}>แก้ไข</button>
                        <button className="btn btn-xs btn-o" onClick={() => handleQuickResetPassword(user)}>เปลี่ยนรหัสผ่าน</button>
                        <button className="btn btn-xs btn-dg" onClick={() => handleDeleteUser(user)}>ลบ</button>
                      </div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <div className="house-mo">
          <div className="house-md house-md-vehicle">
            <div className="house-md-head">
              <div>
                <div className="house-md-title">👥 {editingUser ? 'แก้ไขผู้ใช้งานระบบ' : 'เพิ่มผู้ใช้งานระบบ'}</div>
                <div className="house-md-sub">{form.username || '-'} {selectedHouse?.owner_name ? `— ${selectedHouse.owner_name}` : ''}</div>
              </div>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="house-md-body">
                <section className="house-sec">
                  <div className="house-sec-title">บ้านที่ผูกกับผู้ใช้</div>
                  <div className="house-grid house-grid-2">
                    <label className="house-field">
                      <span>บ้านเลขที่ <strong style={{ color: '#dc2626' }}>*</strong></span>
                      <select name="house_id" value={form.house_id} onChange={handleSelectHouse}>
                        <option value="">-- เลือกบ้านเลขที่ --</option>
                        {houses.map((house) => (
                          <option key={house.id} value={house.id}>{house.house_no}{house.soi ? ` (ซอย ${house.soi})` : ''}</option>
                        ))}
                      </select>
                    </label>
                    <label className="house-field">
                      <span>เจ้าของบ้าน</span>
                      <input value={selectedHouse?.owner_name || '-'} readOnly className="house-readonly" />
                    </label>
                    <label className="house-field house-field-span-2">
                      <span>ที่อยู่</span>
                      <input value={selectedHouse?.address || '-'} readOnly className="house-readonly" />
                    </label>
                    <label className="house-field">
                      <span>email</span>
                      <input name="email" type="email" value={form.email} onChange={handleChange} placeholder="name@example.com" />
                    </label>
                    <label className="house-field">
                      <span>เบอร์โทร</span>
                      <input name="phone" value={form.phone} onChange={handleChange} placeholder="08x-xxx-xxxx" />
                    </label>
                  </div>
                </section>

                <section className="house-sec">
                  <div className="house-sec-title">ข้อมูลเข้าสู่ระบบ</div>
                  <div className="house-grid house-grid-2">
                    <label className="house-field">
                      <span>username <strong style={{ color: '#dc2626' }}>*</strong></span>
                      <input name="username" value={form.username} onChange={handleChange} placeholder="username" />
                    </label>
                    <label className="house-field">
                      <span>password <strong style={{ color: '#dc2626' }}>*</strong></span>
                      <input name="password" type="password" value={form.password} onChange={handleChange} placeholder="อย่างน้อย 6 ตัวอักษร" />
                    </label>
                    <label className="house-field house-field-span-2">
                      <span>ชื่อ-นามสกุล</span>
                      <input name="full_name" value={form.full_name} onChange={handleChange} placeholder="ชื่อ-นามสกุล" />
                    </label>
                    <label className="house-field">
                      <span>บทบาท</span>
                      <select name="role" value={form.role} onChange={handleChange}>
                        <option value="admin">ผู้ดูแลระบบ</option>
                        <option value="resident">ลูกบ้าน</option>
                      </select>
                    </label>
                    <label className="house-field house-field-span-2">
                      <span>สถานะ</span>
                      <select name="is_active" value={String(form.is_active)} onChange={handleChange}>
                        <option value="true">active</option>
                        <option value="false">inactive</option>
                      </select>
                    </label>
                  </div>
                </section>
              </div>

              <div className="house-md-foot">
                <button className="btn btn-g" type="button" onClick={closeModal}>ยกเลิก</button>
                <button className="btn btn-p" type="submit" disabled={saving}>{saving ? 'กำลังบันทึก...' : 'บันทึก'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminUsers
