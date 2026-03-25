import React from 'react'

const AdminTechnicians = () => {
  return (
    <div className="pane on">
      <div className="ph">
        <div className="ph-in">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div className="ph-ico">🔨</div>
            <div>
              <div className="ph-h1">ทำเนียบช่าง</div>
              <div className="ph-sub">รายชื่อช่างซ่อมแซมของชุมชน</div>
            </div>
          </div>
          <div className="ph-acts">
            <button className="btn btn-p btn-sm">+ เพิ่มช่างใหม่</button>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: '16px' }}>
        <div className="ch"><div className="ct">รายชื่อช่างซ่อมแซม</div></div>
        <div className="cb">
          <div style={{ overflowX: 'auto' }}>
            <table className="tw" style={{ width: '100%', minWidth: '600px' }}>
              <thead><tr>
                <th>ชื่อ</th><th>สาขา</th><th>โทร</th><th>สถานะ</th><th/>
              </tr></thead>
              <tbody>
                <tr><td>นายสมชาติ สุขใจ</td><td>ไฟฟ้า</td><td>089-123-4567</td><td><span className="bd b-ok">พร้อมใช้</span></td><td><button className="btn btn-xs btn-o">ดู</button></td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AdminTechnicians
