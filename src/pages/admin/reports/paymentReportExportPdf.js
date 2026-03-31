// paymentReportExportPdf.js
// ใช้ html2canvas + jsPDF export PDF แบบเดียวกับหน้า fees
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { buildPaymentReportHtml } from './PaymentReportExportHtml';
import sarabunFont from '../../../lib/sarabun-base64.js';

export async function exportPaymentReportPdf({ title, fileName, columns, rows, filter, sumAmount }) {
  // 1. สร้าง HTML
  const html = buildPaymentReportHtml({ title, columns, rows, filter, sumAmount });
  // 2. สร้าง iframe ซ่อน
  const iframe = document.createElement('iframe');
  iframe.style.cssText = 'position:fixed;left:-9999px;top:0;border:none;width:1122px;height:793px;'; // A4 landscape
  document.body.appendChild(iframe);
  const doc = iframe.contentDocument;
  doc.open();
  doc.write(html);
  doc.close();
  // 3. รอโหลดฟอนต์/ภาพ
  await new Promise(res => setTimeout(res, 900));
  // 4. แปลงเป็น canvas
  const el = doc.body.querySelector('.report-wrap');
  const canvas = await html2canvas(el, { scale: 2, useCORS: true, backgroundColor: '#fff', width: 1122, height: 793 });
  // 5. ใส่ลง jsPDF (landscape)
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  // ฝังฟอนต์ Sarabun ถ้ามี base64
  if (sarabunFont && sarabunFont.length > 0) {
    pdf.addFileToVFS('Sarabun-Regular.ttf', sarabunFont);
    pdf.addFont('Sarabun-Regular.ttf', 'Sarabun', 'normal');
    pdf.setFont('Sarabun', 'normal');
  }
  const A4W = pdf.internal.pageSize.getWidth();
  const A4H = pdf.internal.pageSize.getHeight();
  pdf.addImage(canvas.toDataURL('image/jpeg', 0.95), 'JPEG', 0, 0, A4W, A4H, undefined, 'FAST');
  pdf.save(`${fileName}.pdf`);
  // 6. ลบ iframe
  document.body.removeChild(iframe);
}
