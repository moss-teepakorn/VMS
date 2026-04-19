
import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import Swal from 'sweetalert2';

import { exportReportExcel } from '../admin/reports/reportExport.mjs';
import { buildPaymentReportPrintableHtml } from '../admin/reports/paymentReportExportPdf.js';


export default function ReportExportButtons({ columns, rows, filter, reportTitle, sumAmount, logoUrl, footerLabel }) {
  const [showPreviewModal, setShowPreviewModal] = useState(false)
  const [previewHtml, setPreviewHtml] = useState('')
  const [runningAction, setRunningAction] = useState(false)

  // Export Excel (ใช้ฟังก์ชันกลาง)
  const handleExportExcel = () => {
    try {
      exportReportExcel({ fileName: reportTitle, columns, rows });
      Swal.fire({ icon: 'success', title: 'ส่งออก Excel สำเร็จ', timer: 1200, showConfirmButton: false });
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'ผิดพลาด', text: err.message });
    }
  };

  const openPrintWindow = (html) => {
    const popup = window.open('', '_blank', 'width=1200,height=900')
    if (!popup) return null
    popup.document.open()
    popup.document.write(html)
    popup.document.close()
    return popup
  }

  const previewModal = showPreviewModal ? (
    <div className="house-mo" style={{ zIndex: 130000 }}>
      <div className="house-md house-md--xl" style={{ '--house-md-max-w': '1120px', '--house-md-max-h': 'calc(100dvh - 36px)' }}>
        <div className="house-md-head">
          <div>
            <div className="house-md-title">🖨 {reportTitle}</div>
            <div className="house-md-sub">ตรวจสอบตัวอย่างก่อนส่งออกหรือพิมพ์</div>
          </div>
        </div>
        <div className="house-md-body" style={{ padding: 10, background: '#eef2f7' }}>
          <div style={{ border: '1px solid var(--bo)', borderRadius: 10, overflow: 'hidden', background: '#fff', height: 'calc(100dvh - 220px)', minHeight: 420 }}>
            <iframe title={reportTitle} srcDoc={previewHtml} style={{ width: '100%', height: '100%', border: 'none' }} />
          </div>
        </div>
        <div className="house-md-foot">
          <button className="btn btn-o" type="button" onClick={() => runPreviewAction('pdf')} disabled={runningAction}>{runningAction ? 'กำลังสร้างไฟล์...' : '⬇ PDF'}</button>
          <button className="btn btn-o" type="button" onClick={() => runPreviewAction('image')} disabled={runningAction}>{runningAction ? 'กำลังสร้างไฟล์...' : '⬇ Image'}</button>
          <button className="btn btn-p" type="button" onClick={() => runPreviewAction('excel')} disabled={runningAction}>📗 Excel</button>
          <button className="btn btn-a" type="button" onClick={() => runPreviewAction('paper')} disabled={runningAction}>🖨 พิมพ์</button>
          <button className="btn btn-g" type="button" onClick={() => { if (!runningAction) { setShowPreviewModal(false); setPreviewHtml('') } }} disabled={runningAction}>ปิด</button>
        </div>
      </div>
    </div>
  ) : null

  const renderReportInIframe = async (html) => {
    const iframe = document.createElement('iframe')
    iframe.style.cssText = 'position:fixed;left:-9999px;top:0;border:none;width:1122px;height:793px;'
    document.body.appendChild(iframe)
    const doc = iframe.contentDocument
    doc.open()
    doc.write(html)
    doc.close()
    await new Promise((resolve) => setTimeout(resolve, 700))
    return { iframe, doc }
  }

  const buildPreviewHtml = async ({ autoPrint = false } = {}) => {
    return buildPaymentReportPrintableHtml({
      title: reportTitle,
      columns,
      rows,
      filter,
      sumAmount,
      logoUrl,
      footerLabel,
      autoPrint,
    })
  }

  const openPreviewModal = async () => {
    try {
      setRunningAction(true)
      const html = await buildPreviewHtml({ autoPrint: false })
      setPreviewHtml(html)
      setShowPreviewModal(true)
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'เตรียมเอกสารไม่สำเร็จ', text: err.message })
    } finally {
      setRunningAction(false)
    }
  }

  const runPreviewAction = async (mode) => {
    try {
      setRunningAction(true)

      if (mode === 'excel') {
        handleExportExcel()
        return
      }

      if (mode === 'paper') {
        const html = await buildPreviewHtml({ autoPrint: true })
        const popup = openPrintWindow(html)
        if (!popup) {
          await Swal.fire({ icon: 'warning', title: 'ไม่สามารถเปิดหน้าต่างพิมพ์ได้', text: 'กรุณาอนุญาต popup ของเบราว์เซอร์' })
          return
        }
        setShowPreviewModal(false)
        setPreviewHtml('')
        return
      }

      const html = await buildPreviewHtml({ autoPrint: false })
      const { iframe, doc } = await renderReportInIframe(html)
      const wrap = doc.body.querySelector('.report-wrap')
      if (!wrap) {
        document.body.removeChild(iframe)
        throw new Error('ไม่พบข้อมูลรายงานสำหรับส่งออก')
      }

      const canvas = await html2canvas(wrap, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        width: 1122,
        height: 793,
      })

      if (mode === 'image') {
        const link = document.createElement('a')
        link.href = canvas.toDataURL('image/png')
        link.download = `${reportTitle}.png`
        link.click()
      } else {
        const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
        const A4W = pdf.internal.pageSize.getWidth()
        const A4H = pdf.internal.pageSize.getHeight()
        pdf.addImage(canvas.toDataURL('image/jpeg', 0.95), 'JPEG', 0, 0, A4W, A4H, undefined, 'FAST')
        pdf.save(`${reportTitle}.pdf`)
      }

      document.body.removeChild(iframe)
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'ผิดพลาด', text: err.message });
    } finally {
      setRunningAction(false)
    }
  }

  return (
    <>
    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
      <button
        className="btn btn-p"
        style={{
          width: 38,
          height: 38,
          minWidth: 38,
          borderRadius: 10,
          padding: 0,
          background: '#1e40af',
          color: '#fff',
          border: 'none',
          fontWeight: 700,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        onClick={openPreviewModal}
        type="button"
        title="พิมพ์/ส่งออกรายงาน"
      >
        🖨
      </button>
    </div>
    {previewModal && (typeof document !== 'undefined' ? createPortal(previewModal, document.body) : previewModal)}
    </>
  );
}
