import React from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import './AdminFinanceV2.css'

const V2_ROUTES = [
  { key: 'hub', label: 'Finance Hub', path: '/admin/finance-v2' },
  { key: 'billing', label: 'ออกใบแจ้งหนี้ V2', path: '/admin/finance-v2/billing' },
  { key: 'collections', label: 'ติดตามหนี้ V2', path: '/admin/finance-v2/collections' },
  { key: 'receive', label: 'รับชำระ V2', path: '/admin/finance-v2/receive' },
  { key: 'print', label: 'Print Center V2', path: '/admin/finance-v2/print-center' },
  { key: 'archive', label: 'Archive V2', path: '/admin/finance-v2/archive' },
]

const demoDebtQueue = [
  { house: '101', owner: 'สมชาย ใจดี', amount: '8,180.00', tone: 'orange' },
  { house: '102', owner: 'สมหญิง สุขบุญ', amount: '10,340.00', tone: 'orange' },
  { house: '103', owner: 'นายสมศรี สุขสวัสดิ์', amount: '10,760.00', tone: 'orange' },
]

function Header({ title, subtitle }) {
  return (
    <div className="ph report-head">
      <div className="ph-in report-head-in">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div className="ph-ico">🧭</div>
          <div>
            <div className="ph-h1">{title}</div>
            <div className="ph-sub">{subtitle}</div>
          </div>
        </div>
      </div>
    </div>
  )
}

function HubPage({ navigate }) {
  return (
    <div className="finance-v2-grid one-col">
      <section className="finance-v2-card">
        <div className="finance-v2-head">Finance Hub (หน้าหลักใหม่สำหรับงานประจำวัน)</div>
        <div className="finance-v2-body">
          <div className="finance-v2-kpi">
            <div className="finance-v2-kpi-item"><label>ยอดออกใบแจ้งหนี้</label><strong>38,280.00</strong></div>
            <div className="finance-v2-kpi-item"><label>ยอดชำระแล้ว</label><strong>9,000.00</strong></div>
            <div className="finance-v2-kpi-item"><label>ยอดค้างชำระ</label><strong>29,280.00</strong></div>
            <div className="finance-v2-kpi-item"><label>% ที่ชำระ</label><strong>23.5%</strong></div>
          </div>
          <div className="finance-v2-note">หน้าทดลองนี้เป็นหน้าจอใหม่แยกจากของเดิมทั้งหมด เพื่อ UAT ก่อนย้ายจริง โดยยังไม่ผูกฐานข้อมูล</div>
          <div className="finance-v2-actions">
            <button className="btn btn-p btn-sm" onClick={() => navigate('/admin/finance-v2/billing')}>ไปหน้าออกใบแจ้งหนี้</button>
            <button className="btn btn-o btn-sm" onClick={() => navigate('/admin/finance-v2/collections')}>ไปหน้าติดตามหนี้</button>
            <button className="btn btn-a btn-sm" onClick={() => navigate('/admin/finance-v2/receive')}>ไปหน้ารับชำระ</button>
            <button className="btn btn-g btn-sm" onClick={() => navigate('/admin/finance-v2/print-center')}>ไป Print Center</button>
            <button className="btn btn-g btn-sm" onClick={() => navigate('/admin/finance-v2/archive')}>ไป Archive</button>
          </div>
        </div>
      </section>
    </div>
  )
}

function BillingPage() {
  return (
    <div className="finance-v2-grid">
      <section className="finance-v2-card">
        <div className="finance-v2-head">ออกใบแจ้งหนี้ V2 (Wizard)</div>
        <div className="finance-v2-body">
          <div className="finance-v2-step"><h4>Step 1</h4><p>เลือกปีและงวดที่ต้องการออกบิล</p></div>
          <div className="finance-v2-step"><h4>Step 2</h4><p>เลือกกลุ่มบ้านและเงื่อนไขการข้าม</p></div>
          <div className="finance-v2-step"><h4>Step 3</h4><p>Preview ยอดรวมและจำนวนบิล</p></div>
          <div className="finance-v2-step"><h4>Step 4</h4><p>ยืนยันสร้างและบันทึก log batch</p></div>
          <div className="finance-v2-actions">
            <button className="btn btn-p btn-sm">จำลอง Preview</button>
            <button className="btn btn-a btn-sm">จำลอง Create Batch</button>
          </div>
        </div>
      </section>
      <section className="finance-v2-card">
        <div className="finance-v2-head">ตัวอย่างผลลัพธ์</div>
        <div className="finance-v2-body finance-v2-list">
          <div className="finance-v2-row"><div className="finance-v2-row-main"><strong>สร้างใบแจ้งหนี้</strong><span>รอบ 2569 ครึ่งปีหลัง</span></div><span className="finance-v2-chip green">124 หลัง</span></div>
          <div className="finance-v2-row"><div className="finance-v2-row-main"><strong>ข้าม (ชำระแล้ว)</strong><span>ไม่ต้องสร้างซ้ำ</span></div><span className="finance-v2-chip gray">2 หลัง</span></div>
          <div className="finance-v2-row"><div className="finance-v2-row-main"><strong>ข้าม (รอตรวจสอบ)</strong><span>มีรายการ pending อยู่</span></div><span className="finance-v2-chip orange">2 หลัง</span></div>
          <div className="finance-v2-row"><div className="finance-v2-row-main"><strong>ยอดรวมรอบนี้</strong><span>คำนวณจากบ้านที่เข้าเงื่อนไข</span></div><span className="finance-v2-chip blue">1,245,600.00</span></div>
        </div>
      </section>
    </div>
  )
}

function CollectionsPage() {
  return (
    <div className="finance-v2-grid">
      <section className="finance-v2-card">
        <div className="finance-v2-head">Debt Queue V2</div>
        <div className="finance-v2-body finance-v2-list">
          {demoDebtQueue.map((row) => (
            <div key={row.house} className="finance-v2-row">
              <div className="finance-v2-row-main">
                <strong>บ้าน {row.house}</strong>
                <span>{row.owner}</span>
              </div>
              <span className={`finance-v2-chip ${row.tone}`}>ค้าง {row.amount}</span>
            </div>
          ))}
        </div>
      </section>
      <section className="finance-v2-card">
        <div className="finance-v2-head">Bulk Actions V2</div>
        <div className="finance-v2-body">
          <div className="finance-v2-actions">
            <button className="btn btn-o btn-sm">คำนวณค่าปรับ (เฉพาะที่เลือก)</button>
            <button className="btn btn-p btn-sm">สร้างใบเตือนรอบใหม่</button>
            <button className="btn btn-g btn-sm">ส่งออกคิวติดตาม</button>
          </div>
          <div className="finance-v2-note">หน้านี้โฟกัส “ลูกหนี้ + ติดตามหนี้” เท่านั้น ไม่รวมงานรับชำระหรือพิมพ์เอกสารทั่วไป</div>
        </div>
      </section>
    </div>
  )
}

function ReceivePage() {
  return (
    <div className="finance-v2-grid">
      <section className="finance-v2-card">
        <div className="finance-v2-head">Payment Intake Queue V2</div>
        <div className="finance-v2-body finance-v2-list">
          <div className="finance-v2-row"><div className="finance-v2-row-main"><strong>PAY-240401</strong><span>บ้าน 103 · โอนเงิน</span></div><span className="finance-v2-chip blue">รอตรวจสอบ</span></div>
          <div className="finance-v2-row"><div className="finance-v2-row-main"><strong>PAY-240402</strong><span>บ้าน 101 · โอนเงิน</span></div><span className="finance-v2-chip blue">รอตรวจสอบ</span></div>
          <div className="finance-v2-row"><div className="finance-v2-row-main"><strong>PAY-240403</strong><span>บ้าน 99/7 · เงินสด</span></div><span className="finance-v2-chip green">อนุมัติแล้ว</span></div>
        </div>
      </section>
      <section className="finance-v2-card">
        <div className="finance-v2-head">Action Panel V2</div>
        <div className="finance-v2-body">
          <div className="finance-v2-actions">
            <button className="btn btn-ok btn-sm">อนุมัติที่เลือก</button>
            <button className="btn btn-dg btn-sm">ตีกลับที่เลือก</button>
            <button className="btn btn-a btn-sm">ออกใบเสร็จ</button>
          </div>
          <div className="finance-v2-note">หน้ารับชำระแยกเดี่ยวสำหรับงานรายวัน ลดความเสี่ยงกดผิดจากปุ่ม batch ขนาดใหญ่</div>
        </div>
      </section>
    </div>
  )
}

function PrintCenterPage() {
  return (
    <div className="finance-v2-grid">
      <section className="finance-v2-card">
        <div className="finance-v2-head">Print Jobs V2</div>
        <div className="finance-v2-body finance-v2-list">
          <div className="finance-v2-row"><div className="finance-v2-row-main"><strong>Invoice Batch 2569-H2</strong><span>คิวพิมพ์ใบแจ้งหนี้ทั้งหมด</span></div><span className="finance-v2-chip blue">124 ฉบับ</span></div>
          <div className="finance-v2-row"><div className="finance-v2-row-main"><strong>Notice Batch N-2026-04</strong><span>คิวพิมพ์ใบเตือนรอบเดือน</span></div><span className="finance-v2-chip orange">35 ฉบับ</span></div>
          <div className="finance-v2-row"><div className="finance-v2-row-main"><strong>Receipt Batch R-2026-04</strong><span>คิวพิมพ์ใบเสร็จ</span></div><span className="finance-v2-chip green">89 ฉบับ</span></div>
        </div>
      </section>
      <section className="finance-v2-card">
        <div className="finance-v2-head">Output Controls</div>
        <div className="finance-v2-body">
          <div className="finance-v2-actions">
            <button className="btn btn-g btn-sm">รวม PDF</button>
            <button className="btn btn-p btn-sm">พิมพ์ตัวอย่าง</button>
            <button className="btn btn-a btn-sm">ดาวน์โหลด ZIP</button>
          </div>
          <div className="finance-v2-note">รวมงานพิมพ์ไว้จุดเดียว ไม่กระจายปุ่มพิมพ์ไปหลายตาราง</div>
        </div>
      </section>
    </div>
  )
}

function ArchivePage() {
  return (
    <div className="finance-v2-grid">
      <section className="finance-v2-card">
        <div className="finance-v2-head">Archive Search V2</div>
        <div className="finance-v2-body finance-v2-list">
          <div className="finance-v2-row"><div className="finance-v2-row-main"><strong>ช่วงเวลา</strong><span>01/01/2025 - 31/12/2025</span></div><span className="finance-v2-chip gray">ปีงบ 2568</span></div>
          <div className="finance-v2-row"><div className="finance-v2-row-main"><strong>สถานะ</strong><span>ชำระแล้ว / ยกเลิก</span></div><span className="finance-v2-chip gray">2 เงื่อนไข</span></div>
          <div className="finance-v2-row"><div className="finance-v2-row-main"><strong>Saved View</strong><span>Q1-Reconciliation</span></div><span className="finance-v2-chip blue">Active</span></div>
        </div>
      </section>
      <section className="finance-v2-card">
        <div className="finance-v2-head">Audit Trail V2</div>
        <div className="finance-v2-body finance-v2-list">
          <div className="finance-v2-row"><div className="finance-v2-row-main"><strong>INV-69-1A2B3C</strong><span>แก้ไขโดย admin01 · 05/04/2026 14:11</span></div><span className="finance-v2-chip gray">edit</span></div>
          <div className="finance-v2-row"><div className="finance-v2-row-main"><strong>PAY-240402</strong><span>อนุมัติโดย admin02 · 05/04/2026 14:39</span></div><span className="finance-v2-chip green">approve</span></div>
          <div className="finance-v2-row"><div className="finance-v2-row-main"><strong>NOTICE-2026-04-09</strong><span>พิมพ์โดย admin01 · 05/04/2026 15:02</span></div><span className="finance-v2-chip blue">print</span></div>
        </div>
      </section>
    </div>
  )
}

export default function AdminFinanceV2() {
  const navigate = useNavigate()
  const location = useLocation()
  const activeKey = V2_ROUTES.find((item) => item.path === location.pathname)?.key || 'hub'

  let title = 'การเงิน V2 (Pilot)'
  let subtitle = 'หน้าจอใหม่แยกจากของเดิม เพื่อทดสอบก่อน migrate'
  let content = <HubPage navigate={navigate} />

  if (activeKey === 'billing') {
    title = 'ออกใบแจ้งหนี้ V2'
    subtitle = 'ย้าย flow สร้างใบแจ้งหนี้ไปหน้าจอเฉพาะทาง'
    content = <BillingPage />
  } else if (activeKey === 'collections') {
    title = 'ติดตามหนี้และค่าปรับ V2'
    subtitle = 'รวมงานลูกหนี้และค่าปรับแบบรวมศูนย์'
    content = <CollectionsPage />
  } else if (activeKey === 'receive') {
    title = 'รับชำระเงิน V2'
    subtitle = 'คิวรับเงินรายวัน แยกจากงานออกบิล'
    content = <ReceivePage />
  } else if (activeKey === 'print') {
    title = 'Print Center V2'
    subtitle = 'จัดการงานพิมพ์เอกสารทั้งหมดในหน้าเดียว'
    content = <PrintCenterPage />
  } else if (activeKey === 'archive') {
    title = 'Archive V2'
    subtitle = 'ค้นประวัติย้อนหลัง + audit trail'
    content = <ArchivePage />
  }

  return (
    <div className="pane on houses-compact fees-compact">
      <Header title={title} subtitle={subtitle} />

      <div className="card report-filter-card admin-search-filter-card">
        <div className="cb">
          <div className="finance-v2-nav">
            {V2_ROUTES.map((item) => (
              <button
                key={item.key}
                type="button"
                className={`finance-v2-nav-btn ${activeKey === item.key ? 'on' : ''}`}
                onClick={() => navigate(item.path)}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="finance-v2">{content}</div>
    </div>
  )
}
