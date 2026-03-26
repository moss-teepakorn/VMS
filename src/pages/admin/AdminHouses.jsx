import React, { useState, useContext, useEffect } from 'react'
import { ModalContext } from './AdminLayout'
import { useAuth } from '../../contexts/AuthContext'
import { listHouses, createHouse } from '../../lib/houses'

const AdminHouses = () => {
  const { openModal } = useContext(ModalContext)
  const { user } = useAuth()
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
    if (status === 'occupied') return { className: 'bd b-ok', label: 'อยู่อาศัย' }
    if (status === 'vacant') return { className: 'bd b-wn', label: 'ว่าง' }
    return { className: 'bd b-pr', label: 'รอตรวจสอบ' }
  }

  const handleAddHouse = () => {
    openModal('เพิ่มบ้านใหม่', {
      number: { label: 'เลขที่บ้าน', type: 'text', placeholder: 'เช่น 10/1' },
      owner: { label: 'ชื่อเจ้าของ', type: 'text', placeholder: 'นายสมชาติ ใจดี' },
      phone: { label: 'เบอร์โทร', type: 'tel', placeholder: '098-xxx-xxxx' },
      area: { label: 'พื้นที่ (ตร.ม.)', type: 'number', placeholder: '150' },
    }, async (data) => {
      try {
        const houseNumber = data.number?.value?.trim()
        const ownerName = data.owner?.value?.trim()

        if (!houseNumber || !ownerName) {
          alert('กรุณากรอกเลขที่บ้านและชื่อเจ้าของ')
          return
        }

        await createHouse({
          house_number: houseNumber,
          owner_name: ownerName,
          phone: data.phone?.value?.trim() || null,
          area_sqm: data.area?.value || null,
          status: 'pending',
          monthly_fee: 2750,
          outstanding_amount: 0,
        }, user?.id || null)

        await loadHouses()
      } catch (error) {
        console.error('Error creating house:', error)
        alert(`ไม่สามารถเพิ่มข้อมูลบ้านได้: ${error.message}`)
      }
    })
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
            <option value="vacant">ว่าง</option>
            <option value="occupied">อยู่อาศัย</option>
            <option value="pending">รอการอนุมัติ</option>
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
                  <th>เจ้าของ</th>
                  <th>สถานะ</th>
                  <th>ค่าส่วนกลาง</th>
                  <th>ค้าง</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', color: 'var(--mu)', padding: '20px' }}>
                      กำลังโหลดข้อมูล...
                    </td>
                  </tr>
                ) : houses.length === 0 ? (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', color: 'var(--mu)', padding: '20px' }}>
                      ไม่พบข้อมูลบ้าน
                    </td>
                  </tr>
                ) : (
                  houses.map((house) => {
                    const status = getStatusBadge(house.status)
                    const monthlyFee = Number(house.monthly_fee ?? 0).toLocaleString('th-TH')
                    const outstanding = Number(house.outstanding_amount ?? 0)

                    return (
                      <tr key={house.id}>
                        <td><strong>{house.house_number}</strong></td>
                        <td>{house.owner_name}</td>
                        <td><span className={status.className}>{status.label}</span></td>
                        <td>฿{monthlyFee}</td>
                        <td>{outstanding > 0 ? `฿${outstanding.toLocaleString('th-TH')}` : '-'}</td>
                        <td><button className="btn btn-xs btn-o">ดู</button></td>
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
