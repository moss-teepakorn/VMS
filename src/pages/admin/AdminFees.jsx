import React, { useContext } from 'react'
import { ModalContext } from './AdminLayout'

const AdminFees = () => {
  const { openModal } = useContext(ModalContext)

  const handleAddFee = () => {
    openModal('สร้างใบแจ้งหนี้', {
      month: { label: 'เดือน', type: 'text', placeholder: 'มกราคม' },
      year: { label: 'ปี', type: 'number', placeholder: '2567' },
      amount: { label: 'จำนวนเงิน (บาท)', type: 'number', placeholder: '2750' },
    }, (data) => {
      console.log('Add fee:', data)
    })
  }
  return (
    <div className="pane on">
      <div className="ph">
        <div className="ph-in">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div className="ph-ico">💰</div>
            <div>
              <div className="ph-h1">ค่าส่วนกลาง</div>
              <div className="ph-sub">จัดสรรและเก็บค่าส่วนกลาง</div>
            </div>
          </div>
          <div className="ph-acts">
            <button className="btn btn-p btn-sm" onClick={handleAddFee}>+ สร้างใบแจ้งหนี้</button>
          </div>
        </div>
      </div>

      <div className="stats" style={{ marginTop: '16px' }}>
        <div className="sc"><div className="sc-ico a">💵</div><div><div className="sc-v">฿456,800</div><div className="sc-l">รวมเก็บแล้ว</div></div></div>
        <div className="sc"><div className="sc-ico d">⏳</div><div><div className="sc-v">฿48,600</div><div className="sc-l">ค้างชำระ</div></div></div>
      </div>

      <div className="card" style={{ marginTop: '16px' }}>
        <div className="ch"><div className="ct">ประวัติการเก็บ</div></div>
        <div className="cb">
          <div style={{ overflowX: 'auto' }}>
            <table className="tw" style={{ width: '100%', minWidth: '500px' }}>
              <thead>
                <tr>
                  <th>เดือน</th>
                  <th>ปี</th>
                  <th>จำนวนบ้าน</th>
                  <th>จำนวนเก็บ</th>
                  <th>จำนวนค้าง</th>
                  <th>ยอดรวม</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>มีนาคม</td>
                  <td>2568</td>
                  <td>104</td>
                  <td><span className="bd b-ok">฿286,000</span></td>
                  <td><span className="bd b-dg">฿48,600</span></td>
                  <td><strong>฿352,000</strong></td>
                </tr>
                <tr>
                  <td>กุมภาพันธ์</td>
                  <td>2568</td>
                  <td>104</td>
                  <td><span className="bd b-ok">฿286,000</span></td>
                  <td><span className="bd b-dg">฿0</span></td>
                  <td><strong>฿286,000</strong></td>
                </tr>
                <tr>
                  <td>มกราคม</td>
                  <td>2568</td>
                  <td>102</td>
                  <td><span className="bd b-ok">฿280,500</span></td>
                  <td><span className="bd b-dg">฿0</span></td>
                  <td><strong>฿280,500</strong></td>
                </tr>
                <tr>
                  <td>ธันวาคม</td>
                  <td>2567</td>
                  <td>100</td>
                  <td><span className="bd b-ok">฿275,000</span></td>
                  <td><span className="bd b-dg">฿0</span></td>
                  <td><strong>฿275,000</strong></td>
                </tr>
                <tr>
                  <td>พฤศจิกายน</td>
                  <td>2567</td>
                  <td>100</td>
                  <td><span className="bd b-ok">฿275,000</span></td>
                  <td><span className="bd b-dg">฿0</span></td>
                  <td><strong>฿275,000</strong></td>
                </tr>
                <tr>
                  <td>ตุลาคม</td>
                  <td>2567</td>
                  <td>99</td>
                  <td><span className="bd b-ok">฿272,250</span></td>
                  <td><span className="bd b-dg">฿0</span></td>
                  <td><strong>฿272,250</strong></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AdminFees
