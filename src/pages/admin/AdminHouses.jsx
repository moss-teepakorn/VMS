import React, { useState, useContext, useEffect } from 'react'
import { ModalContext } from './AdminLayout'
import { listHouses, createHouse, updateHouse, deleteHouse } from '../../lib/houses'

const AdminHouses = () => {
  const { openModal } = useContext(ModalContext)
  const [filterType, setFilterType] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [houses, setHouses] = useState([])
  const [loading, setLoading] = useState(false)

  const loadHouses = async (override = {}) => {
    try {
      setLoading(true)
      const data = await listHouses({
        status: override.status ?? filterType,
        search: override.search ?? searchTerm,
      })
      setHouses(data)
    } catch (error) {
      console.error('Error loading houses:', error)
      alert(`ไม่สามารถโหลดข้อมูลบ้านได้: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadHouses()
  }, [])

  const getStatusBadge = (status) => {
    if (status === 'normal')   return { className: 'bd b-ok', label: 'ปกติ' }
    if (status === 'overdue')  return { className: 'bd b-wn', label: 'ค้างชำระ' }
    if (status === 'suspended') return { className: 'bd b-dg', label: 'ระงับสิทธิ์' }
    if (status === 'lawsuit')  return { className: 'bd b-pr', label: 'ฟ้องร้อง' }
    return { className: 'bd b-mu', label: status }
  }

  const handleAddHouse = () => {
    openModal('เพิ่มบ้านใหม่', {
      house_no:      { label: 'เลขที่บ้าน *', type: 'text', placeholder: 'เช่น 10/1' },
      soi:           { label: 'ซอย', type: 'text', placeholder: 'เช่น A, B, 1' },
      owner_name:    { label: 'ชื่อเจ้าของ', type: 'text', placeholder: 'นายสมชาติ ใจดี' },
      resident_name: { label: 'ชื่อผู้อยู่อาศัย', type: 'text', placeholder: 'ถ้าต่างจากเจ้าของ' },
      phone:         { label: 'เบอร์โทร', type: 'tel', placeholder: '098-xxx-xxxx' },
      area_sqw:      { label: 'พื้นที่ (ตร.ว.)', type: 'number', placeholder: '54' },
      fee_rate:      { label: 'อัตราค่าส่วนกลาง (บาท/ตร.ว./ปี)', type: 'number', placeholder: '85' },
      house_type:    { label: 'ประเภทการใช้', type: 'text', placeholder: 'อยู่เอง / เช่า / ว่าง' },
    }, async (data) => {
      try {
        const house_no = data.house_no?.value?.trim()
        if (!house_no) {
          alert('กรุณากรอกเลขที่บ้าน')
          return
        }

        await createHouse({
          house_no,
          soi:          data.soi?.value?.trim() || null,
          owner_name:   data.owner_name?.value?.trim() || null,
          resident_name: data.resident_name?.value?.trim() || null,
          phone:        data.phone?.value?.trim() || null,
          area_sqw:     data.area_sqw?.value || 0,
          fee_rate:     data.fee_rate?.value || 10,
          house_type:   data.house_type?.value?.trim() || 'อยู่เอง',
          status:       'normal',
        })

        await loadHouses()
      } catch (error) {
        console.error('Error creating house:', error)
        alert(`ไม่สามารถเพิ่มข้อมูลบ้านได้: ${error.message}`)
      }
    })
  }

  const handleEditHouse = (house) => {
    openModal('แก้ไขข้อมูลบ้าน ' + house.house_no, {
      house_no:      { label: 'เลขที่บ้าน *', type: 'text', value: house.house_no },
      soi:           { label: 'ซอย', type: 'text', value: house.soi || '' },
      owner_name:    { label: 'ชื่อเจ้าของ', type: 'text', value: house.owner_name || '' },
      resident_name: { label: 'ชื่อผู้อยู่อาศัย', type: 'text', value: house.resident_name || '' },
      phone:         { label: 'เบอร์โทร', type: 'tel', value: house.phone || '' },
      area_sqw:      { label: 'พื้นที่ (ตร.ว.)', type: 'number', value: house.area_sqw || 0 },
      fee_rate:      { label: 'อัตราค่าส่วนกลาง (บาท/ตร.ว./ปี)', type: 'number', value: house.fee_rate || 10 },
      house_type:    { label: 'ประเภทการใช้', type: 'text', value: house.house_type || 'อยู่เอง' },
      status:        { label: 'สถานะ', type: 'text', value: house.status || 'normal' },
      note:          { label: 'หมายเหตุ', type: 'text', value: house.note || '' },
    }, async (data) => {
      try {
        await updateHouse(house.id, {
          house_no:      data.house_no?.value?.trim(),
          soi:           data.soi?.value?.trim() || null,
          owner_name:    data.owner_name?.value?.trim() || null,
          resident_name: data.resident_name?.value?.trim() || null,
          phone:         data.phone?.value?.trim() || null,
          area_sqw:      Number(data.area_sqw?.value) || 0,
          fee_rate:      Number(data.fee_rate?.value) || 10,
          house_type:    data.house_type?.value?.trim() || 'อยู่เอง',
          status:        data.status?.value?.trim() || 'normal',
          note:          data.note?.value?.trim() || null,
        })
        await loadHouses()
      } catch (error) {
        console.error('Error updating house:', error)
        alert(`ไม่สามารถแก้ไขข้อมูลบ้านได้: ${error.message}`)
      }
    })
  }

  const handleDeleteHouse = (house) => {
    if (!confirm(`ยืนยันลบบ้านเลขที่ ${house.house_no}?\nการลบจะไม่สามารถกู้คืนได้`)) return
    deleteHouse(house.id)
      .then(() => loadHouses())
      .catch((error) => alert(`ไม่สามารถลบข้อมูลบ้านได้: ${error.message}`))
  }

  return (
    <div className="pane on">
      {/* Page Header */}
      <div className="ph">
        <div className="ph-in">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div className="ph-ico">🏠</div>
            <div>
              <div className="ph-h1">ข้อมูลบ้าน</div>
              <div className="ph-sub">จัดการข้อมูลหลัง 128 หลัง</div>
            </div>
          </div>
          <div className="ph-acts">
            <button className="btn btn-p btn-sm" onClick={handleAddHouse}>+ เพิ่มบ้าน</button>
            <button className="btn btn-o btn-sm" onClick={() => loadHouses()}>🔄 รีฟรช</button>
          </div>
        </div>
      </div>

      {/* Filter & Search */}
      <div className="card" style={{ marginBottom: '16px', marginTop: '16px' }}>
        <div className="ch">
          <div className="ct">ค้นหา &amp; กรองข้อมูล</div>
        </div>
        <div className="cb" style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="ค้นหาเลขที่บ้าน/เจ้าของ..."
            style={{ flex: 1, minWidth: '200px', padding: '8px 12px', border: '1px solid var(--bo)', borderRadius: '6px' }}
          />
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            style={{ padding: '8px 12px', border: '1px solid var(--bo)', borderRadius: '6px' }}
          >
            <option value="all">ทั้งหมด</option>
            <option value="normal">ปกติ</option>
            <option value="overdue">ค้างชำระ</option>
            <option value="suspended">ระงับสิทธิ์</option>
            <option value="lawsuit">ฟ้องร้อง</option>
          </select>
          <button className="btn btn-a btn-sm" onClick={() => loadHouses()}>ค้นหา</button>
        </div>
      </div>

      {/* Houses Table */}
      <div className="card">
        <div className="ch">
          <div className="ct">รายการบ้านทั้งหมด ({houses.length} หลัง)</div>
        </div>
        <div className="cb">
          <div style={{ overflowX: 'auto' }}>
            <table className="tw" style={{ width: '100%', minWidth: '600px' }}>
              <thead>
                <tr>
                  <th>เลขที่</th>
                  <th>เจ้าของ / ผู้อยู่อาศัย</th>
                  <th>ประเภท</th>
                  <th>พื้นที่ (ตร.ว.)</th>
                  <th>ค่าส่วนกลาง/ปี</th>
                  <th>สถานะ</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', color: 'var(--mu)', padding: '20px' }}>
                      กำลังโหลดข้อมูล...
                    </td>
                  </tr>
                ) : houses.length === 0 ? (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', color: 'var(--mu)', padding: '20px' }}>
                      ไม่พบข้อมูลบ้าน
                    </td>
                  </tr>
                ) : (
                  houses.map((house) => {
                    const badge = getStatusBadge(house.status)
                    const annualFee = Number(house.annual_fee ?? 0).toLocaleString('th-TH')
                    const soi = house.soi ? ` ซอย ${house.soi}` : ''

                    return (
                      <tr key={house.id}>
                        <td><strong>{house.house_no}{soi}</strong></td>
                        <td>
                          <div>{house.owner_name || '-'}</div>
                          {house.resident_name && house.resident_name !== house.owner_name && (
                            <div style={{ fontSize: '11px', color: 'var(--mu)' }}>{house.resident_name}</div>
                          )}
                        </td>
                        <td>{house.house_type || '-'}</td>
                        <td>{house.area_sqw ? Number(house.area_sqw).toLocaleString('th-TH') : '-'}</td>
                        <td>฿{annualFee}</td>
                        <td><span className={badge.className}>{badge.label}</span></td>
                        <td style={{ whiteSpace: 'nowrap' }}>
                          <button className="btn btn-xs btn-a" style={{ marginRight: '4px' }} onClick={() => handleEditHouse(house)}>แก้ไข</button>
                          <button className="btn btn-xs btn-dg" onClick={() => handleDeleteHouse(house)}>ลบ</button>
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

export default AdminHouses
