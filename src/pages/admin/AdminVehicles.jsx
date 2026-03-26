import React, { useContext, useEffect, useMemo, useState } from 'react'
import { ModalContext } from './AdminLayout'
import { listHouses } from '../../lib/houses'
import { createVehicle, deleteVehicle, listVehicles, updateVehicle } from '../../lib/vehicles'

const AdminVehicles = () => {
  const { openModal } = useContext(ModalContext)
  const [vehicles, setVehicles] = useState([])
  const [houses, setHouses] = useState([])
  const [statusFilter, setStatusFilter] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(false)

  const houseOptions = useMemo(() => ([
    { value: '', label: 'เลือกบ้าน' },
    ...houses.map((house) => ({ value: house.id, label: `${house.house_no} ${house.owner_name ? `- ${house.owner_name}` : ''}` })),
  ]), [houses])

  const loadVehicles = async (override = {}) => {
    try {
      setLoading(true)
      const [vehicleData, houseData] = await Promise.all([
        listVehicles({ status: override.status ?? statusFilter, search: override.search ?? searchTerm }),
        houses.length === 0 ? listHouses() : Promise.resolve(houses),
      ])
      setVehicles(vehicleData)
      setHouses(houseData)
    } catch (error) {
      console.error('Error loading vehicles:', error)
      alert(`ไม่สามารถโหลดข้อมูลรถได้: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadVehicles()
  }, [])

  const getStatusBadge = (status) => {
    if (status === 'active') return { className: 'bd b-ok', label: 'ใช้งาน' }
    if (status === 'pending') return { className: 'bd b-wn', label: 'รออนุมัติ' }
    if (status === 'removed') return { className: 'bd b-dg', label: 'ยกเลิก' }
    return { className: 'bd b-mu', label: status }
  }

  const handleAddVehicle = () => {
    openModal('ลงทะเบียนรถใหม่', {
      house_id: { label: 'บ้าน', type: 'select', options: houseOptions, value: '' },
      license_plate: { label: 'ทะเบียน *', type: 'text', placeholder: 'เช่น กท 1234' },
      province: { label: 'จังหวัด', type: 'text', placeholder: 'กรุงเทพมหานคร' },
      brand: { label: 'ยี่ห้อ', type: 'text', placeholder: 'Toyota' },
      model: { label: 'รุ่น', type: 'text', placeholder: 'Altis' },
      color: { label: 'สี', type: 'text', placeholder: 'สีขาว' },
      vehicle_type: { label: 'ประเภทรถ', type: 'select', options: [{ value: 'car', label: 'รถยนต์' }, { value: 'motorcycle', label: 'จักรยานยนต์' }, { value: 'other', label: 'อื่นๆ' }], value: 'car' },
      parking_location: { label: 'ตำแหน่งจอด', type: 'select', options: [{ value: 'ในบ้าน', label: 'ในบ้าน' }, { value: 'หน้าบ้าน', label: 'หน้าบ้าน' }, { value: 'ส่วนกลาง', label: 'ส่วนกลาง' }], value: 'ในบ้าน' },
      parking_fee: { label: 'ค่าจอด (บาท)', type: 'number', placeholder: '0', value: '0' },
    }, async (data) => {
      try {
        if (!data.license_plate?.value?.trim()) {
          alert('กรุณากรอกทะเบียนรถ')
          return
        }

        await createVehicle({
          house_id: data.house_id?.value || null,
          license_plate: data.license_plate?.value,
          province: data.province?.value,
          brand: data.brand?.value,
          model: data.model?.value,
          color: data.color?.value,
          vehicle_type: data.vehicle_type?.value,
          parking_location: data.parking_location?.value,
          parking_fee: data.parking_fee?.value,
          status: 'pending',
        })

        await loadVehicles()
      } catch (error) {
        console.error('Error creating vehicle:', error)
        alert(`ไม่สามารถเพิ่มข้อมูลรถได้: ${error.message}`)
      }
    })
  }

  const handleEditVehicle = (vehicle) => {
    openModal('แก้ไขข้อมูลรถ', {
      house_id: { label: 'บ้าน', type: 'select', options: houseOptions, value: vehicle.house_id || '' },
      license_plate: { label: 'ทะเบียน *', type: 'text', value: vehicle.license_plate || '' },
      province: { label: 'จังหวัด', type: 'text', value: vehicle.province || '' },
      brand: { label: 'ยี่ห้อ', type: 'text', value: vehicle.brand || '' },
      model: { label: 'รุ่น', type: 'text', value: vehicle.model || '' },
      color: { label: 'สี', type: 'text', value: vehicle.color || '' },
      vehicle_type: { label: 'ประเภทรถ', type: 'select', options: [{ value: 'car', label: 'รถยนต์' }, { value: 'motorcycle', label: 'จักรยานยนต์' }, { value: 'other', label: 'อื่นๆ' }], value: vehicle.vehicle_type || 'car' },
      parking_location: { label: 'ตำแหน่งจอด', type: 'select', options: [{ value: 'ในบ้าน', label: 'ในบ้าน' }, { value: 'หน้าบ้าน', label: 'หน้าบ้าน' }, { value: 'ส่วนกลาง', label: 'ส่วนกลาง' }], value: vehicle.parking_location || 'ในบ้าน' },
      parking_lock_no: { label: 'หมายเลขล็อกจอด', type: 'text', value: vehicle.parking_lock_no || '' },
      parking_fee: { label: 'ค่าจอด (บาท)', type: 'number', value: String(vehicle.parking_fee || 0) },
      status: { label: 'สถานะ', type: 'select', options: [{ value: 'active', label: 'ใช้งาน' }, { value: 'pending', label: 'รออนุมัติ' }, { value: 'removed', label: 'ยกเลิก' }], value: vehicle.status || 'active' },
      note: { label: 'หมายเหตุ', type: 'textarea', value: vehicle.note || '' },
    }, async (data) => {
      try {
        await updateVehicle(vehicle.id, {
          house_id: data.house_id?.value || null,
          license_plate: data.license_plate?.value,
          province: data.province?.value || null,
          brand: data.brand?.value || null,
          model: data.model?.value || null,
          color: data.color?.value || null,
          vehicle_type: data.vehicle_type?.value || 'car',
          parking_location: data.parking_location?.value || 'ในบ้าน',
          parking_lock_no: data.parking_lock_no?.value || null,
          parking_fee: Number(data.parking_fee?.value || 0),
          status: data.status?.value || 'active',
          note: data.note?.value || null,
        })
        await loadVehicles()
      } catch (error) {
        console.error('Error updating vehicle:', error)
        alert(`ไม่สามารถแก้ไขข้อมูลรถได้: ${error.message}`)
      }
    })
  }

  const handleDeleteVehicle = async (vehicle) => {
    if (!window.confirm(`ยืนยันลบทะเบียน ${vehicle.license_plate}?`)) return
    try {
      await deleteVehicle(vehicle.id)
      await loadVehicles()
    } catch (error) {
      console.error('Error deleting vehicle:', error)
      alert(`ไม่สามารถลบข้อมูลรถได้: ${error.message}`)
    }
  }

  return (
    <div className="pane on">
      <div className="ph">
        <div className="ph-in">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div className="ph-ico">🚗</div>
            <div>
              <div className="ph-h1">ข้อมูลรถ</div>
              <div className="ph-sub">จัดการยานพาหนะของลูกบ้านและพื้นที่จอดรถ</div>
            </div>
          </div>
          <div className="ph-acts">
            <button className="btn btn-p btn-sm" onClick={handleAddVehicle}>+ ลงทะเบียนรถใหม่</button>
            <button className="btn btn-o btn-sm" onClick={() => loadVehicles()}>🔄 รีเฟรช</button>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: '16px', marginBottom: '16px' }}>
        <div className="ch"><div className="ct">ค้นหาและกรองข้อมูลรถ</div></div>
        <div className="cb" style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="ค้นหาทะเบียน / ยี่ห้อ / รุ่น"
            style={{ flex: 1, minWidth: '240px', padding: '8px 12px', border: '1px solid var(--bo)', borderRadius: '6px' }}
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ padding: '8px 12px', border: '1px solid var(--bo)', borderRadius: '6px' }}
          >
            <option value="all">ทั้งหมด</option>
            <option value="active">ใช้งาน</option>
            <option value="pending">รออนุมัติ</option>
            <option value="removed">ยกเลิก</option>
          </select>
          <button className="btn btn-a btn-sm" onClick={() => loadVehicles()}>ค้นหา</button>
        </div>
      </div>

      <div className="card" style={{ marginTop: '16px' }}>
        <div className="ch"><div className="ct">ยานพาหนะทั้งหมด</div></div>
        <div className="cb">
          <div style={{ overflowX: 'auto' }}>
            <table className="tw" style={{ width: '100%', minWidth: '860px' }}>
              <thead><tr>
                <th>ทะเบียน</th><th>บ้าน</th><th>ยี่ห้อ / รุ่น</th><th>ประเภท</th><th>ที่จอด</th><th>ค่าจอด</th><th>สถานะ</th><th/>
              </tr></thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="8" style={{ textAlign: 'center', color: 'var(--mu)', padding: '20px' }}>กำลังโหลดข้อมูล...</td></tr>
                ) : vehicles.length === 0 ? (
                  <tr><td colSpan="8" style={{ textAlign: 'center', color: 'var(--mu)', padding: '20px' }}>ไม่พบข้อมูลรถ</td></tr>
                ) : (
                  vehicles.map((vehicle) => {
                    const badge = getStatusBadge(vehicle.status)
                    return (
                      <tr key={vehicle.id}>
                        <td><strong>{vehicle.license_plate}</strong><div style={{ fontSize: '11px', color: 'var(--mu)' }}>{vehicle.province || '-'}</div></td>
                        <td>{vehicle.houses?.house_no || '-'}<div style={{ fontSize: '11px', color: 'var(--mu)' }}>{vehicle.houses?.owner_name || '-'}</div></td>
                        <td>{vehicle.brand || '-'} {vehicle.model || ''}<div style={{ fontSize: '11px', color: 'var(--mu)' }}>{vehicle.color || '-'}</div></td>
                        <td>{vehicle.vehicle_type || '-'}</td>
                        <td>{vehicle.parking_location || '-'}{vehicle.parking_lock_no ? ` (${vehicle.parking_lock_no})` : ''}</td>
                        <td>฿{Number(vehicle.parking_fee || 0).toLocaleString('th-TH')}</td>
                        <td><span className={badge.className}>{badge.label}</span></td>
                        <td style={{ whiteSpace: 'nowrap' }}>
                          <button className="btn btn-xs btn-a" style={{ marginRight: '4px' }} onClick={() => handleEditVehicle(vehicle)}>แก้ไข</button>
                          <button className="btn btn-xs btn-dg" onClick={() => handleDeleteVehicle(vehicle)}>ลบ</button>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AdminVehicles
