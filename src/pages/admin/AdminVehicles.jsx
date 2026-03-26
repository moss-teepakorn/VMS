import React, { useEffect, useMemo, useState } from 'react'
import Swal from 'sweetalert2'
import { listHouses } from '../../lib/houses'
import { createVehicle, deleteVehicle, listVehicles, updateVehicle } from '../../lib/vehicles'

const VEHICLE_TYPES = [
  { value: 'รถยนต์', label: 'รถยนต์' },
  { value: 'รถจักรยานยนต์', label: 'รถจักรยานยนต์' },
  { value: 'รถกระบะ', label: 'รถกระบะ' },
  { value: 'รถตู้', label: 'รถตู้' },
  { value: 'รถอื่นๆ', label: 'รถอื่นๆ' },
]

const BRAND_OPTIONS = [
  'Toyota', 'Honda', 'Isuzu', 'Mitsubishi', 'Nissan', 'Mazda', 'Ford', 'MG',
  'BYD', 'GWM', 'Suzuki', 'Subaru', 'Hyundai', 'Kia', 'Mercedes-Benz',
  'BMW', 'Audi', 'Volvo', 'Lexus', 'Chevrolet', 'Peugeot', 'Yamaha', 'Honda Motorcycle',
  'Kawasaki', 'Suzuki Motorcycle', 'Vespa', 'Ducati', 'Triumph', 'Royal Enfield', 'อื่นๆ',
]

const COLOR_OPTIONS = [
  'ขาว', 'ดำ', 'เทา', 'เงิน', 'น้ำเงิน', 'แดง', 'เขียว', 'เหลือง',
  'ส้ม', 'น้ำตาล', 'ม่วง', 'ชมพู', 'ทอง', 'ฟ้า', 'อื่นๆ',
]

const PROVINCE_OPTIONS = [
  'กรุงเทพมหานคร', 'กระบี่', 'กาญจนบุรี', 'กาฬสินธุ์', 'กำแพงเพชร', 'ขอนแก่น', 'จันทบุรี', 'ฉะเชิงเทรา',
  'ชลบุรี', 'ชัยนาท', 'ชัยภูมิ', 'ชุมพร', 'เชียงราย', 'เชียงใหม่', 'ตรัง', 'ตราด', 'ตาก', 'นครนายก',
  'นครปฐม', 'นครพนม', 'นครราชสีมา', 'นครศรีธรรมราช', 'นครสวรรค์', 'นนทบุรี', 'นราธิวาส', 'น่าน',
  'บึงกาฬ', 'บุรีรัมย์', 'ปทุมธานี', 'ประจวบคีรีขันธ์', 'ปราจีนบุรี', 'ปัตตานี', 'พระนครศรีอยุธยา',
  'พะเยา', 'พังงา', 'พัทลุง', 'พิจิตร', 'พิษณุโลก', 'เพชรบุรี', 'เพชรบูรณ์', 'แพร่', 'ภูเก็ต',
  'มหาสารคาม', 'มุกดาหาร', 'แม่ฮ่องสอน', 'ยะลา', 'ร้อยเอ็ด', 'ระนอง', 'ระยอง', 'ราชบุรี', 'ลพบุรี',
  'ลำปาง', 'ลำพูน', 'เลย', 'ศรีสะเกษ', 'สกลนคร', 'สงขลา', 'สตูล', 'สมุทรปราการ', 'สมุทรสงคราม',
  'สมุทรสาคร', 'สระแก้ว', 'สระบุรี', 'สิงห์บุรี', 'สุโขทัย', 'สุพรรณบุรี', 'สุราษฎร์ธานี', 'สุรินทร์',
  'หนองคาย', 'หนองบัวลำภู', 'อ่างทอง', 'อำนาจเจริญ', 'อุดรธานี', 'อุตรดิตถ์', 'อุทัยธานี', 'อุบลราชธานี',
  'เบตง',
]

const PARKING_OPTIONS = [
  { value: 'ในบ้าน', label: 'ในบ้าน' },
  { value: 'หน้าบ้าน', label: 'หน้าบ้าน' },
  { value: 'ส่วนกลาง', label: 'ส่วนกลาง' },
]

const STATUS_OPTIONS = [
  { value: 'active', label: 'ใช้งาน' },
  { value: 'pending', label: 'รออนุมัติ' },
  { value: 'removed', label: 'ยกเลิก' },
]

const EMPTY_FORM = {
  house_id: '',
  license_plate_prefix: '',
  license_plate_number: '',
  province: 'กรุงเทพมหานคร',
  vehicle_type: 'รถยนต์',
  brand: 'Toyota',
  brand_other: '',
  model: '',
  color: 'ขาว',
  color_other: '',
  parking_location: 'ในบ้าน',
  parking_lock_no: '',
  parking_fee: '0.00',
  status: 'pending',
  note: '',
}

function formatDecimal(value) {
  return Number(value || 0).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

const AdminVehicles = () => {
  const [vehicles, setVehicles] = useState([])
  const [houses, setHouses] = useState([])
  const [soiFilter, setSoiFilter] = useState('all')
  const [vehicleTypeFilter, setVehicleTypeFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editingVehicle, setEditingVehicle] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)

  const parsePlate = (plate) => {
    const [prefix = '', number = ''] = String(plate || '').split('-')
    return {
      prefix: prefix.trim(),
      number: number.trim(),
    }
  }

  const houseOptions = useMemo(() => ([
    { value: '', label: 'เลือกบ้าน' },
    ...houses.map((house) => ({
      value: house.id,
      label: `ซอย ${house.soi || '-'} • ${house.house_no}${house.owner_name ? ` - ${house.owner_name}` : ''}`,
    })),
  ]), [houses])

  const soiOptions = useMemo(() => {
    const soies = [...new Set(houses.map((house) => house.soi).filter(Boolean))]
      .sort((a, b) => Number(a) - Number(b))
    return soies
  }, [houses])

  const loadVehicles = async (override = {}) => {
    try {
      setLoading(true)
      const [vehicleData, houseData] = await Promise.all([
        listVehicles({
          status: override.status ?? statusFilter,
          search: override.search ?? searchTerm,
          soi: override.soi ?? soiFilter,
          vehicleType: override.vehicleType ?? vehicleTypeFilter,
        }),
        houses.length === 0 ? listHouses() : Promise.resolve(houses),
      ])
      setVehicles(vehicleData)
      setHouses(houseData)
    } catch (error) {
      console.error('Error loading vehicles:', error)
      await Swal.fire({ icon: 'error', title: 'โหลดข้อมูลไม่สำเร็จ', text: error.message })
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

  const openAddModal = () => {
    setEditingVehicle(null)
    setForm(EMPTY_FORM)
    setShowModal(true)
  }

  const openEditModal = (vehicle) => {
    const baseBrand = BRAND_OPTIONS.includes(vehicle.brand || '') ? vehicle.brand : 'อื่นๆ'
    const baseColor = COLOR_OPTIONS.includes(vehicle.color || '') ? vehicle.color : 'อื่นๆ'

    setEditingVehicle(vehicle)
    const parsedPlate = parsePlate(vehicle.license_plate)
    setForm({
      house_id: vehicle.house_id || '',
      license_plate_prefix: parsedPlate.prefix,
      license_plate_number: parsedPlate.number,
      province: vehicle.province || 'กรุงเทพมหานคร',
      vehicle_type: vehicle.vehicle_type || 'รถยนต์',
      brand: baseBrand,
      brand_other: baseBrand === 'อื่นๆ' ? (vehicle.brand || '') : '',
      model: vehicle.model || '',
      color: baseColor,
      color_other: baseColor === 'อื่นๆ' ? (vehicle.color || '') : '',
      parking_location: vehicle.parking_location || 'ในบ้าน',
      parking_lock_no: vehicle.parking_lock_no || '',
      parking_fee: formatDecimal(vehicle.parking_fee || 0),
      status: vehicle.status || 'pending',
      note: vehicle.note || '',
    })
    setShowModal(true)
  }

  const closeModal = (force = false) => {
    if (saving && !force) return
    setShowModal(false)
    setEditingVehicle(null)
    setForm(EMPTY_FORM)
  }

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((current) => {
      const next = { ...current, [name]: value }

      if (name === 'brand' && value !== 'อื่นๆ') {
        next.brand_other = ''
      }

      if (name === 'color' && value !== 'อื่นๆ') {
        next.color_other = ''
      }

      if (name === 'parking_location' && value !== 'ส่วนกลาง') {
        next.parking_lock_no = ''
      }

      return next
    })
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (!form.house_id) {
      await Swal.fire({ icon: 'warning', title: 'ข้อมูลไม่ครบ', text: 'กรุณาเลือกบ้าน' })
      return
    }

    if (!form.license_plate_prefix.trim() || !form.license_plate_number.trim()) {
      await Swal.fire({ icon: 'warning', title: 'ข้อมูลไม่ครบ', text: 'กรุณากรอกทะเบียนรถ' })
      return
    }

    if (form.brand === 'อื่นๆ' && !form.brand_other.trim()) {
      await Swal.fire({ icon: 'warning', title: 'ข้อมูลไม่ครบ', text: 'กรุณากรอกยี่ห้อรถ (อื่นๆ)' })
      return
    }

    if (form.color === 'อื่นๆ' && !form.color_other.trim()) {
      await Swal.fire({ icon: 'warning', title: 'ข้อมูลไม่ครบ', text: 'กรุณากรอกสีรถ (อื่นๆ)' })
      return
    }

    const licensePlate = `${form.license_plate_prefix.trim()}-${form.license_plate_number.trim()}`

    try {
      setSaving(true)

      const payload = {
        house_id: form.house_id,
        license_plate: licensePlate,
        province: form.province,
        vehicle_type: form.vehicle_type,
        brand: form.brand === 'อื่นๆ' ? form.brand_other : form.brand,
        model: form.model,
        color: form.color === 'อื่นๆ' ? form.color_other : form.color,
        parking_location: form.parking_location,
        parking_lock_no: form.parking_location === 'ส่วนกลาง' ? form.parking_lock_no : null,
        parking_fee: Number(String(form.parking_fee).replace(/,/g, '')) || 0,
        status: form.status,
        note: form.note,
      }

      if (editingVehicle) {
        await updateVehicle(editingVehicle.id, payload)
        await Swal.fire({ icon: 'success', title: 'บันทึกสำเร็จ', text: `แก้ไขทะเบียน ${licensePlate} แล้ว`, timer: 1400, showConfirmButton: false })
      } else {
        await createVehicle(payload)
        await Swal.fire({ icon: 'success', title: 'เพิ่มข้อมูลสำเร็จ', text: `เพิ่มทะเบียน ${licensePlate} แล้ว`, timer: 1400, showConfirmButton: false })
      }

      closeModal(true)
      await loadVehicles({ status: statusFilter, search: searchTerm, soi: soiFilter, vehicleType: vehicleTypeFilter })
    } catch (error) {
      console.error('Error saving vehicle:', error)
      await Swal.fire({ icon: 'error', title: 'บันทึกไม่สำเร็จ', text: error.message })
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteVehicle = async (vehicle) => {
    const result = await Swal.fire({
      icon: 'warning',
      title: 'ยืนยันการลบ',
      text: `ต้องการลบทะเบียน ${vehicle.license_plate} ใช่หรือไม่?`,
      showCancelButton: true,
      confirmButtonText: 'ลบข้อมูล',
      cancelButtonText: 'ยกเลิก',
      confirmButtonColor: '#c0392b',
    })

    if (!result.isConfirmed) return

    try {
      await deleteVehicle(vehicle.id)
      await Swal.fire({ icon: 'success', title: 'ลบสำเร็จ', timer: 1200, showConfirmButton: false })
      await loadVehicles({ status: statusFilter, search: searchTerm, soi: soiFilter, vehicleType: vehicleTypeFilter })
    } catch (error) {
      console.error('Error deleting vehicle:', error)
      await Swal.fire({ icon: 'error', title: 'ลบไม่สำเร็จ', text: error.message })
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
            <button className="btn btn-p btn-sm" onClick={openAddModal}>+ ลงทะเบียนรถใหม่</button>
            <button className="btn btn-o btn-sm" onClick={() => loadVehicles({ status: statusFilter, search: searchTerm, soi: soiFilter, vehicleType: vehicleTypeFilter })}>🔄 รีเฟรช</button>
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
            placeholder="ค้นหา ทะเบียน / บ้าน / เจ้าของ / ยี่ห้อ / สี"
            style={{ flex: 1, minWidth: '240px', padding: '8px 12px', border: '1px solid var(--bo)', borderRadius: '6px' }}
          />
          <select
            value={soiFilter}
            onChange={(e) => setSoiFilter(e.target.value)}
            style={{ padding: '8px 12px', border: '1px solid var(--bo)', borderRadius: '6px' }}
          >
            <option value="all">ทุกซอย</option>
            {soiOptions.map((soi) => <option key={soi} value={soi}>{`ซอย ${soi}`}</option>)}
          </select>
          <select
            value={vehicleTypeFilter}
            onChange={(e) => setVehicleTypeFilter(e.target.value)}
            style={{ padding: '8px 12px', border: '1px solid var(--bo)', borderRadius: '6px' }}
          >
            <option value="all">ทุกประเภท</option>
            {VEHICLE_TYPES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
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
          <button className="btn btn-a btn-sm" onClick={() => loadVehicles({ status: statusFilter, search: searchTerm, soi: soiFilter, vehicleType: vehicleTypeFilter })}>ค้นหา</button>
        </div>
      </div>

      <div className="card" style={{ marginTop: '16px' }}>
        <div className="ch"><div className="ct">ยานพาหนะทั้งหมด ({vehicles.length} รายการ)</div></div>
        <div className="cb">
          <div style={{ overflowX: 'auto' }}>
            <table className="tw" style={{ width: '100%', minWidth: '980px' }}>
              <thead><tr>
                <th>ซอย</th>
                <th>บ้านเลขที่ / เจ้าของบ้าน</th>
                <th>ยี่ห้อ / รุ่น</th>
                <th>สี</th>
                <th>ที่จอด</th>
                <th>ค่าจอด</th>
                <th>สถานะ</th>
                <th></th>
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
                        <td>{vehicle.houses?.soi ? `ซอย ${vehicle.houses.soi}` : '-'}</td>
                        <td>
                          <div><strong>{vehicle.houses?.house_no || '-'}</strong> {vehicle.houses?.owner_name ? `- ${vehicle.houses.owner_name}` : ''}</div>
                          <div style={{ fontSize: '11px', color: 'var(--mu)' }}>{vehicle.vehicle_type || '-'} · {vehicle.license_plate || '-'} {vehicle.province ? `(${vehicle.province})` : ''}</div>
                        </td>
                        <td>{vehicle.brand || '-'} {vehicle.model || ''}</td>
                        <td>{vehicle.color || '-'}</td>
                        <td>{vehicle.parking_location || '-'}{vehicle.parking_lock_no ? ` (${vehicle.parking_lock_no})` : ''}</td>
                        <td>{formatDecimal(vehicle.parking_fee)}</td>
                        <td><span className={badge.className}>{badge.label}</span></td>
                        <td style={{ whiteSpace: 'nowrap' }}>
                          <button className="btn btn-xs btn-a" style={{ marginRight: '4px' }} onClick={() => openEditModal(vehicle)}>แก้ไข</button>
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

      {showModal && (
        <div className="house-mo">
          <div className="house-md house-md-vehicle">
            <div className="house-md-head">
              <div>
                <div className="house-md-title">🚗 {editingVehicle ? 'แก้ไขข้อมูลรถ' : 'ลงทะเบียนรถใหม่'}</div>
                <div className="house-md-sub">{(form.license_plate_prefix || form.license_plate_number) ? `${form.license_plate_prefix || ''}${form.license_plate_prefix && form.license_plate_number ? '-' : ''}${form.license_plate_number || ''}` : '-'} {form.model ? `— ${form.model}` : ''}</div>
              </div>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="house-md-body">
                <section className="house-sec">
                  <div className="house-sec-title">บ้านและข้อมูลทะเบียน</div>
                  <div className="house-grid house-grid-3">
                    <label className="house-field">
                      <span>บ้าน *</span>
                      <select name="house_id" value={form.house_id} onChange={handleChange}>
                        {houseOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                      </select>
                    </label>
                    <label className="house-field">
                      <span>ทะเบียนรถ (ส่วนหน้า) *</span>
                      <input name="license_plate_prefix" value={form.license_plate_prefix} onChange={handleChange} placeholder="7กจ" />
                    </label>
                    <label className="house-field">
                      <span>ทะเบียนรถ (ส่วนหลัง) *</span>
                      <input name="license_plate_number" value={form.license_plate_number} onChange={handleChange} placeholder="5533" />
                    </label>
                    <label className="house-field">
                      <span>จังหวัด</span>
                      <select name="province" value={form.province} onChange={handleChange}>
                        {PROVINCE_OPTIONS.map((province) => <option key={province} value={province}>{province}</option>)}
                      </select>
                    </label>
                  </div>
                </section>

                <section className="house-sec">
                  <div className="house-sec-title">รายละเอียดรถ</div>
                  <div className="house-grid house-grid-3">
                    <label className="house-field">
                      <span>ประเภทรถ</span>
                      <select name="vehicle_type" value={form.vehicle_type} onChange={handleChange}>
                        {VEHICLE_TYPES.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                      </select>
                    </label>
                    <label className="house-field">
                      <span>ยี่ห้อ</span>
                      <select name="brand" value={form.brand} onChange={handleChange}>
                        {BRAND_OPTIONS.map((brand) => <option key={brand} value={brand}>{brand}</option>)}
                      </select>
                    </label>
                    {form.brand === 'อื่นๆ' ? (
                      <label className="house-field">
                        <span>ระบุยี่ห้ออื่นๆ *</span>
                        <input name="brand_other" value={form.brand_other} onChange={handleChange} placeholder="เช่น NETA" />
                      </label>
                    ) : (
                      <div />
                    )}
                  </div>
                  <div className="house-grid house-grid-3" style={{ marginTop: '8px' }}>
                    <label className="house-field">
                      <span>รุ่น</span>
                      <input name="model" value={form.model} onChange={handleChange} placeholder="เช่น City / Revo" />
                    </label>
                    <label className="house-field">
                      <span>สี</span>
                      <select name="color" value={form.color} onChange={handleChange}>
                        {COLOR_OPTIONS.map((color) => <option key={color} value={color}>{color}</option>)}
                      </select>
                    </label>
                    {form.color === 'อื่นๆ' ? (
                      <label className="house-field">
                        <span>ระบุสีอื่นๆ *</span>
                        <input name="color_other" value={form.color_other} onChange={handleChange} placeholder="เช่น เทาอมฟ้า" />
                      </label>
                    ) : (
                      <div />
                    )}
                  </div>
                </section>

                <section className="house-sec">
                  <div className="house-sec-title">ที่จอดและสถานะ</div>
                  <div className="house-grid house-grid-3">
                    <label className="house-field">
                      <span>ตำแหน่งจอด</span>
                      <select name="parking_location" value={form.parking_location} onChange={handleChange}>
                        {PARKING_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                      </select>
                    </label>
                    <label className="house-field">
                      <span>Lock no (ส่วนกลางเท่านั้น)</span>
                      <input
                        name="parking_lock_no"
                        value={form.parking_lock_no}
                        onChange={handleChange}
                        placeholder="เช่น C-12"
                        disabled={form.parking_location !== 'ส่วนกลาง'}
                      />
                    </label>
                    <label className="house-field">
                      <span>ค่าจอด</span>
                      <input name="parking_fee" value={form.parking_fee} onChange={handleChange} placeholder="0.00" />
                    </label>
                    <label className="house-field house-field-span-2">
                      <span>สถานะ</span>
                      <select name="status" value={form.status} onChange={handleChange}>
                        {STATUS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                      </select>
                    </label>
                    <label className="house-field house-field-span-3">
                      <span>หมายเหตุ</span>
                      <textarea name="note" value={form.note} onChange={handleChange} rows="1" placeholder="รายละเอียดเพิ่มเติม" />
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

export default AdminVehicles
