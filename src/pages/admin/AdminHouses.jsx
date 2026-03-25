import React, { useState } from 'react'

const AdminHouses = () => {
  const [filterType, setFilterType] = useState('all')

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
            <button className="btn btn-p btn-sm">+ เพิ่มบ้าน</button>
            <button className="btn btn-o btn-sm">🔄 รีฟรช</button>
          </div>
        </div>
      </div>

      {/* Filter & Search */}
      <div className="card" style={{ marginBottom: '16px', marginTop: '16px' }}>
        <div className="ch">
          <div className="ct">ค้นหา &amp; กรองข้อมูล</div>
        </div>
        <div className="cb" style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <input type="text" placeholder="ค้นหาเลขที่บ้าน..." style={{ flex: 1, minWidth: '200px', padding: '8px 12px', border: '1px solid var(--bo)', borderRadius: '6px' }} />
          <select value={filterType} onChange={(e) => setFilterType(e.target.value)} style={{ padding: '8px 12px', border: '1px solid var(--bo)', borderRadius: '6px' }}>
            <option value="all">ทั้งหมด</option>
            <option value="vacant">ว่าง</option>
            <option value="occupied">อยู่อาศัย</option>
            <option value="pending">รอการอนุมัติ</option>
          </select>
          <button className="btn btn-a btn-sm">ค้นหา</button>
        </div>
      </div>

      {/* Houses Table */}
      <div className="card">
        <div className="ch">
          <div className="ct">รายการบ้านทั้งหมด (128 หลัง)</div>
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
                <tr>
                  <td><strong>10/1</strong></td>
                  <td>นายสมชาติ ใจดี</td>
                  <td><span className="bd b-ok">อยู่อาศัย</span></td>
                  <td>฿2,750</td>
                  <td>-</td>
                  <td><button className="btn btn-xs btn-o">ดู</button></td>
                </tr>
                <tr>
                  <td><strong>10/2</strong></td>
                  <td>นางสาวพิชญา สุขใจ</td>
                  <td><span className="bd b-wn">ว่าง</span></td>
                  <td>฿2,750</td>
                  <td>-</td>
                  <td><button className="btn btn-xs btn-o">ดู</button></td>
                </tr>
                <tr>
                  <td><strong>10/3</strong></td>
                  <td>นายสุรพล เก่ง</td>
                  <td><span className="bd b-pr">รอตรวจสอบ</span></td>
                  <td>฿2,750</td>
                  <td>฿2,750</td>
                  <td><button className="btn btn-xs btn-o">ดู</button></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AdminHouses
