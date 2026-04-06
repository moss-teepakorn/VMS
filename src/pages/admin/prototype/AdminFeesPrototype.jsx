import React from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import './AdminFeesPrototype.css'

const PROTO_ROUTES = [
  { key: 'overview', label: 'ภาพรวมแยกงาน', path: '/admin/fees-prototype' },
  { key: 'billing', label: 'ออกใบแจ้งหนี้', path: '/admin/fees-prototype/billing' },
  { key: 'collections', label: 'ค่าปรับและติดตามหนี้', path: '/admin/fees-prototype/collections' },
  { key: 'receive', label: 'รับชำระเงิน', path: '/admin/fees-prototype/receive' },
  { key: 'print', label: 'Print Center', path: '/admin/fees-prototype/print-center' },
  { key: 'archive', label: 'ประวัติ/Archive', path: '/admin/fees-prototype/archive' },
]

function PrototypeHeader({ title, subtitle }) {
  return (
    <div className="ph report-head">
      <div className="ph-in report-head-in">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div className="ph-ico">🧪</div>
          <div>
            <div className="ph-h1">{title}</div>
            <div className="ph-sub">{subtitle}</div>
          </div>
        </div>
      </div>
    </div>
  )
}

function Overview({ navigate }) {
  return (
    <div className="fees-proto-grid">
      <section className="fees-proto-card">
        <div className="fees-proto-card-head">โครงแยก Feature จากหน้าเดิม</div>
        <div className="fees-proto-card-body fees-proto-list">
          <div className="fees-proto-row"><strong>1) ออกใบแจ้งหนี้</strong><span>สร้าง/คัดกรอง/ยืนยันเป็นขั้นตอน</span></div>
          <div className="fees-proto-row"><strong>2) ค่าปรับและติดตามหนี้</strong><span>คำนวณค่าปรับ/ออกใบเตือน</span></div>
          <div className="fees-proto-row"><strong>3) รับชำระเงิน</strong><span>โฟกัสงานรับเงินรายวัน</span></div>
          <div className="fees-proto-row"><strong>4) Print Center</strong><span>พิมพ์เอกสารรวมศูนย์</span></div>
          <div className="fees-proto-row"><strong>5) ประวัติ/Archive</strong><span>ค้นย้อนหลังและตรวจสอบ</span></div>
        </div>
      </section>

      <section className="fees-proto-card">
        <div className="fees-proto-card-head">แผนย้ายปุ่มจากหน้าเดิม</div>
        <div className="fees-proto-card-body fees-proto-list">
          <div className="fees-proto-row"><strong>+ สร้างใบแจ้งหนี้</strong><span className="fees-proto-badge blue">ไปหน้า ออกใบแจ้งหนี้</span></div>
          <div className="fees-proto-row"><strong>พิมพ์ใบแจ้งหนี้ทั้งหมด</strong><span className="fees-proto-badge blue">ไป Print Center</span></div>
          <div className="fees-proto-row"><strong>พิมพ์ใบแจ้งเตือนทั้งหมด</strong><span className="fees-proto-badge orange">ไป ค่าปรับและติดตามหนี้</span></div>
          <div className="fees-proto-row"><strong>คำนวณค่าปรับทั้งหมด</strong><span className="fees-proto-badge orange">ไป ค่าปรับและติดตามหนี้</span></div>
          <div className="fees-proto-row"><strong>รายการปิด/ชำระแล้ว</strong><span className="fees-proto-badge gray">ไป ประวัติ/Archive</span></div>
        </div>
      </section>

      <section className="fees-proto-card" style={{ gridColumn: '1 / -1' }}>
        <div className="fees-proto-card-head">ปุ่มทดลองเดินหน้า Prototype</div>
        <div className="fees-proto-card-body">
          <div className="fees-proto-actions">
            <button className="btn btn-p btn-sm" onClick={() => navigate('/admin/fees-prototype/billing')}>ไปหน้าออกใบแจ้งหนี้</button>
            <button className="btn btn-o btn-sm" onClick={() => navigate('/admin/fees-prototype/collections')}>ไปหน้าค่าปรับ/ติดตามหนี้</button>
            <button className="btn btn-a btn-sm" onClick={() => navigate('/admin/fees-prototype/receive')}>ไปหน้ารับชำระเงิน</button>
            <button className="btn btn-g btn-sm" onClick={() => navigate('/admin/fees-prototype/print-center')}>ไปหน้า Print Center</button>
            <button className="btn btn-g btn-sm" onClick={() => navigate('/admin/fees-prototype/archive')}>ไปหน้า Archive</button>
          </div>
        </div>
      </section>
    </div>
  )
}

function BillingScreen() {
  return (
    <div className="fees-proto-grid">
      <section className="fees-proto-card">
        <div className="fees-proto-card-head">Wizard: ออกใบแจ้งหนี้</div>
        <div className="fees-proto-card-body">
          <div className="fees-proto-step"><h4>Step 1: เลือกปี/งวด</h4><p>เลือกปี 2569 + ครึ่งปีหลัง</p></div>
          <div className="fees-proto-step"><h4>Step 2: เลือกบ้านเป้าหมาย</h4><p>กรองโซน/สถานะ และตรวจรายการข้าม</p></div>
          <div className="fees-proto-step"><h4>Step 3: Preview ยอด</h4><p>แสดงยอดรวม/จำนวนบิล/บ้านที่ถูกข้าม</p></div>
          <div className="fees-proto-step"><h4>Step 4: ยืนยันสร้าง</h4><p>สร้างใบแจ้งหนี้แบบ batch และเก็บ log</p></div>
          <div className="fees-proto-actions">
            <button className="btn btn-p btn-sm">จำลอง Preview</button>
            <button className="btn btn-a btn-sm">จำลอง Create Batch</button>
          </div>
        </div>
      </section>

      <section className="fees-proto-card">
        <div className="fees-proto-card-head">ผลลัพธ์จำลอง</div>
        <div className="fees-proto-card-body fees-proto-list">
          <div className="fees-proto-row"><strong>บ้านที่สร้างใบแจ้งหนี้</strong><span className="fees-proto-badge green">124 หลัง</span></div>
          <div className="fees-proto-row"><strong>บ้านที่ข้าม (ชำระแล้ว)</strong><span className="fees-proto-badge gray">2 หลัง</span></div>
          <div className="fees-proto-row"><strong>บ้านที่ข้าม (รอตรวจสอบ)</strong><span className="fees-proto-badge orange">2 หลัง</span></div>
          <div className="fees-proto-row"><strong>ยอดรวมรอบนี้</strong><span className="fees-proto-badge blue">1,245,600.00</span></div>
        </div>
      </section>
    </div>
  )
}

function CollectionsScreen() {
  return (
    <div className="fees-proto-grid">
      <section className="fees-proto-card">
        <div className="fees-proto-card-head">Debt Queue (Prototype)</div>
        <div className="fees-proto-card-body fees-proto-list">
          <div className="fees-proto-row"><strong>บ้าน 101</strong><span className="fees-proto-badge orange">ค้าง 8,180.00</span></div>
          <div className="fees-proto-row"><strong>บ้าน 102</strong><span className="fees-proto-badge orange">ค้าง 10,340.00</span></div>
          <div className="fees-proto-row"><strong>บ้าน 103</strong><span className="fees-proto-badge orange">ค้าง 10,760.00</span></div>
        </div>
      </section>

      <section className="fees-proto-card">
        <div className="fees-proto-card-head">Bulk Actions</div>
        <div className="fees-proto-card-body">
          <div className="fees-proto-actions">
            <button className="btn btn-o btn-sm">คำนวณค่าปรับชุดที่เลือก</button>
            <button className="btn btn-p btn-sm">สร้างใบเตือนรอบใหม่</button>
            <button className="btn btn-g btn-sm">ส่งออกรายชื่อติดตาม</button>
          </div>
          <div className="fees-proto-step"><h4>นโยบายหน้าจอ</h4><p>หน้านี้แสดงเฉพาะลูกหนี้และการติดตามเท่านั้น</p></div>
        </div>
      </section>
    </div>
  )
}

function ReceiveScreen() {
  return (
    <div className="fees-proto-grid">
      <section className="fees-proto-card">
        <div className="fees-proto-card-head">Payment Intake Queue</div>
        <div className="fees-proto-card-body fees-proto-list">
          <div className="fees-proto-row"><strong>PAY-240401</strong><span className="fees-proto-badge blue">รอตรวจสอบ</span></div>
          <div className="fees-proto-row"><strong>PAY-240402</strong><span className="fees-proto-badge blue">รอตรวจสอบ</span></div>
          <div className="fees-proto-row"><strong>PAY-240403</strong><span className="fees-proto-badge green">อนุมัติแล้ว</span></div>
        </div>
      </section>

      <section className="fees-proto-card">
        <div className="fees-proto-card-head">Action Panel</div>
        <div className="fees-proto-card-body">
          <div className="fees-proto-actions">
            <button className="btn btn-ok btn-sm">อนุมัติที่เลือก</button>
            <button className="btn btn-dg btn-sm">ตีกลับที่เลือก</button>
            <button className="btn btn-a btn-sm">ออกใบเสร็จ</button>
          </div>
          <div className="fees-proto-step"><h4>นโยบายหน้าจอ</h4><p>รับชำระ/ตรวจสอบสลิปเท่านั้น ไม่แสดงเครื่องมือออกบิลและค่าปรับ</p></div>
        </div>
      </section>
    </div>
  )
}

function PrintCenterScreen() {
  return (
    <div className="fees-proto-grid">
      <section className="fees-proto-card">
        <div className="fees-proto-card-head">Print Jobs</div>
        <div className="fees-proto-card-body fees-proto-list">
          <div className="fees-proto-row"><strong>Invoice Batch 2569-H2</strong><span className="fees-proto-badge blue">124 ฉบับ</span></div>
          <div className="fees-proto-row"><strong>Notice Batch N-2026-04</strong><span className="fees-proto-badge orange">35 ฉบับ</span></div>
          <div className="fees-proto-row"><strong>Receipt Batch R-2026-04</strong><span className="fees-proto-badge green">89 ฉบับ</span></div>
        </div>
      </section>

      <section className="fees-proto-card">
        <div className="fees-proto-card-head">Output Controls</div>
        <div className="fees-proto-card-body">
          <div className="fees-proto-actions">
            <button className="btn btn-g btn-sm">รวม PDF</button>
            <button className="btn btn-p btn-sm">พิมพ์ตัวอย่างชุดแรก</button>
            <button className="btn btn-a btn-sm">ดาวน์โหลด ZIP</button>
          </div>
          <div className="fees-proto-step"><h4>นโยบายหน้าจอ</h4><p>งานพิมพ์รวมอยู่ศูนย์เดียว ลดปุ่มพิมพ์กระจายตามหลายหน้า</p></div>
        </div>
      </section>
    </div>
  )
}

function ArchiveScreen() {
  return (
    <div className="fees-proto-grid">
      <section className="fees-proto-card">
        <div className="fees-proto-card-head">Archive Search</div>
        <div className="fees-proto-card-body fees-proto-list">
          <div className="fees-proto-row"><strong>ช่วงเวลา</strong><span>01/01/2025 - 31/12/2025</span></div>
          <div className="fees-proto-row"><strong>สถานะ</strong><span className="fees-proto-badge gray">ชำระแล้ว / ยกเลิก</span></div>
          <div className="fees-proto-row"><strong>Saved View</strong><span className="fees-proto-badge blue">Q1-Reconciliation</span></div>
        </div>
      </section>

      <section className="fees-proto-card">
        <div className="fees-proto-card-head">Audit Trail</div>
        <div className="fees-proto-card-body fees-proto-list">
          <div className="fees-proto-row"><strong>INV-69-1A2B3C</strong><span>แก้ไขโดย admin01 · 05/04/2026 14:11</span></div>
          <div className="fees-proto-row"><strong>PAY-240402</strong><span>อนุมัติโดย admin02 · 05/04/2026 14:39</span></div>
          <div className="fees-proto-row"><strong>NOTICE-2026-04-09</strong><span>พิมพ์โดย admin01 · 05/04/2026 15:02</span></div>
        </div>
      </section>
    </div>
  )
}

export default function AdminFeesPrototype() {
  const navigate = useNavigate()
  const location = useLocation()

  const activeKey = PROTO_ROUTES.find((item) => item.path === location.pathname)?.key || 'overview'

  let title = 'Prototype: แยกหน้าการเงิน'
  let subtitle = 'ตัวอย่างการย้ายฟังก์ชันโดยไม่กระทบระบบเดิม'
  let content = <Overview navigate={navigate} />

  if (activeKey === 'billing') {
    title = 'Prototype: ออกใบแจ้งหนี้'
    subtitle = 'ย้ายงานสร้างบิลออกจากหน้าหลักเป็นขั้นตอน'
    content = <BillingScreen />
  } else if (activeKey === 'collections') {
    title = 'Prototype: ค่าปรับและติดตามหนี้'
    subtitle = 'รวมงานติดตามหนี้/ค่าปรับในหน้าที่โฟกัสเดียว'
    content = <CollectionsScreen />
  } else if (activeKey === 'receive') {
    title = 'Prototype: รับชำระเงิน'
    subtitle = 'หน้ารับเงินแยกจากการออกใบแจ้งหนี้'
    content = <ReceiveScreen />
  } else if (activeKey === 'print') {
    title = 'Prototype: Print Center'
    subtitle = 'รวมงานพิมพ์ทุกประเภทไว้จุดเดียว'
    content = <PrintCenterScreen />
  } else if (activeKey === 'archive') {
    title = 'Prototype: ประวัติ/Archive'
    subtitle = 'แยกข้อมูลปิดรายการและ audit ออกจากหน้าปฏิบัติการ'
    content = <ArchiveScreen />
  }

  return (
    <div className="pane on houses-compact fees-compact">
      <PrototypeHeader title={title} subtitle={subtitle} />

      <div className="card report-filter-card admin-search-filter-card">
        <div className="cb">
          <div className="fees-proto-nav">
            {PROTO_ROUTES.map((item) => (
              <button
                key={item.key}
                type="button"
                className={`fees-proto-nav-btn ${activeKey === item.key ? 'on' : ''}`}
                onClick={() => navigate(item.path)}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="fees-proto">{content}</div>
    </div>
  )
}
