// paymentReportExportPdf.js
// ใช้ html2canvas + jsPDF export PDF แบบเดียวกับหน้า fees
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

import { buildPaymentReportHtml } from './PaymentReportExportHtml';

// Inline default SVG (fallback) to avoid runtime 404 on asset path
const DEFAULT_LOGO_SVG = `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:#0d9488;stop-opacity:1" /><stop offset="100%" style="stop-color:#059669;stop-opacity:1" /></linearGradient></defs><rect width="200" height="200" rx="36" fill="url(#bgGradient)"/><circle cx="40" cy="30" r="35" fill="white" opacity="0.08"/><circle cx="160" cy="80" r="50" fill="white" opacity="0.06"/><g transform="translate(100, 85)"><polygon points="0,-35 35,0 35,30 -35,30 -35,0" fill="white" opacity="0.15" stroke="white" stroke-width="2.5"/><polygon points="0,-35 -40,5 40,5" fill="none" stroke="white" stroke-width="2.5"/><rect x="-8" y="10" width="16" height="20" fill="none" stroke="white" stroke-width="1.5" opacity="0.8"/><circle cx="6" cy="20" r="1.5" fill="white" opacity="0.8"/><rect x="-20" y="0" width="8" height="8" fill="none" stroke="white" stroke-width="1.2" opacity="0.6"/><rect x="12" y="0" width="8" height="8" fill="none" stroke="white" stroke-width="1.2" opacity="0.6"/></g><circle cx="155" cy="155" r="22" fill="white" stroke="#0d9488" stroke-width="2"/><text x="155" y="165" font-family="Arial, sans-serif" font-size="18" font-weight="bold" fill="#0d9488" text-anchor="middle" dominant-baseline="middle">GF</text></svg>`;
const DEFAULT_LOGO_DATAURL = `data:image/svg+xml;utf8,${encodeURIComponent(DEFAULT_LOGO_SVG)}`;

// ฟังก์ชันแปลง image url เป็น data url (base64) แบบเดียวกับใบแจ้งหนี้
async function resolveImageToDataUrl(url, fallback = '') {
  const raw = String(url || '').trim();
  if (!raw) return fallback;
  try {
    const r = await fetch(raw);
    const contentType = r.headers.get('Content-Type') || '';
    if (!contentType.startsWith('image/')) return fallback;
    const blob = await r.blob();
    return await new Promise((res) => {
      const reader = new FileReader();
      reader.onloadend = () => res(String(reader.result || fallback || raw));
      reader.readAsDataURL(blob);
    });
  } catch {
    return raw || fallback;
  }
}

export async function exportPaymentReportPdf({ title, fileName, columns, rows, filter, sumAmount, logoUrl }) {
  // 1. แปลงโลโก้เป็น Data URL ก่อน (เหมือนใบแจ้งหนี้)
  const printLogoUrl = await resolveImageToDataUrl(logoUrl, DEFAULT_LOGO_DATAURL);
  // 2. สร้าง HTML
  const html = buildPaymentReportHtml({ title, columns, rows, filter, sumAmount, logoUrl: printLogoUrl });
  // 3. สร้าง iframe ซ่อน
  const iframe = document.createElement('iframe');
  iframe.style.cssText = 'position:fixed;left:-9999px;top:0;border:none;width:1122px;height:793px;'; // A4 landscape
  document.body.appendChild(iframe);
  const doc = iframe.contentDocument;
  doc.open();
  doc.write(html);
  doc.close();
  // 4. รอโหลดฟอนต์ Sarabun จาก Google Fonts ให้แน่ใจก่อน (สำคัญมากสำหรับ html2canvas)
  const fontReady = () => {
    if (doc.fonts && doc.fonts.check) {
      return doc.fonts.load('1em Sarabun');
    }
    return Promise.resolve();
  };
  await fontReady();
  await new Promise(res => setTimeout(res, 500)); // เผื่อฟอนต์โหลดช้า
  // 5. แปลงเป็น canvas
  const el = doc.body.querySelector('.report-wrap');
  const canvas = await html2canvas(el, { scale: 2, useCORS: true, backgroundColor: '#fff', width: 1122, height: 793 });
  // 6. ใส่ลง jsPDF (landscape)
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const A4W = pdf.internal.pageSize.getWidth();
  const A4H = pdf.internal.pageSize.getHeight();
  pdf.addImage(canvas.toDataURL('image/jpeg', 0.95), 'JPEG', 0, 0, A4W, A4H, undefined, 'FAST');
  pdf.save(`${fileName}.pdf`);
  // 7. ลบ iframe
  document.body.removeChild(iframe);
}
