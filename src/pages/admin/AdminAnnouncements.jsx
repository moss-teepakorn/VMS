import React from 'react'

const AdminAnnouncements = () => {
  return (
    <div className="pane on">
      <div className="ph">
        <div className="ph-in">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div className="ph-ico">📢</div>
            <div>
              <div className="ph-h1">ประกาศ</div>
              <div className="ph-sub">แจ้งข่าวสารไปยังชุมชน</div>
            </div>
          </div>
          <div className="ph-acts">
            <button className="btn btn-p btn-sm">+ โพสต์ประกาศใหม่</button>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: '16px' }}>
        <div className="ch"><div className="ct">ประกาศล่าสุด</div></div>
        <div className="cb">
          <div className="iss">
            <div className="iss-t">ปิดไฟตามตรา</div>
            <div className="iss-m">16 มี.ค. 2568 เวลา 10:00 น. - ปิดไฟตามตรา 2 ชั่วโมง</div>
          </div>
          <div className="iss">
            <div className="iss-t">ประชุมเยี่ยมจำหน่ายขิณสม์</div>
            <div className="iss-m">15 มี.ค. 2568 เวลา 19:00 น. - ห้องรวม</div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AdminAnnouncements
