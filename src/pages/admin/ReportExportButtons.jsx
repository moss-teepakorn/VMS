import React from 'react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import sarabunFont from '../../lib/sarabun-normal'; // จะสร้างไฟล์นี้สำหรับ font

// ฟังก์ชันดึงโลโก้แบบเดียวกับหน้า Login
import { getLogoUrl } from '../../lib/assets';

export default function ReportExportButtons({ columns, rows, filter, reportTitle }) {
  // สร้างข้อมูลสำหรับ export excel
  const handleExportExcel = () => {
    const wsData = [columns.map(col => col.label)];
    rows.forEach(row => {
      wsData.push(columns.map(col => row[col.key]));
    });
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Report');
    XLSX.writeFile(wb, `${reportTitle}.xlsx`);
  };

  // สร้าง PDF ด้วย jsPDF + Sarabun
  const handleExportPDF = async () => {
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    doc.addFileToVFS('Sarabun-Regular.ttf', sarabunFont);
    doc.addFont('Sarabun-Regular.ttf', 'Sarabun', 'normal');
    doc.setFont('Sarabun');

    // Logo
    const logoUrl = await getLogoUrl();
    if (logoUrl) {
      const img = new window.Image();
      img.src = logoUrl;
      await new Promise(res => { img.onload = res; });
      doc.addImage(img, 'PNG', 40, 32, 60, 60);
    }

    // Header
    doc.setFontSize(20);
    doc.text(reportTitle, 120, 60);
    doc.setFontSize(12);
    doc.text(`ช่วงเดือน: ${filter.startMonthLabel} ถึง ${filter.endMonthLabel} ปี ${filter.year + 543}`, 120, 85);
    doc.text(`วันที่พิมพ์: ${new Date().toLocaleDateString('th-TH')}`, 120, 105);

    // Table
    autoTable(doc, {
      startY: 120,
      head: [columns.map(col => col.label)],
      body: rows.map(row => columns.map(col => row[col.key])),
      styles: { font: 'Sarabun', fontSize: 10 },
      headStyles: { fillColor: [41, 128, 185] },
    });
    doc.save(`${reportTitle}.pdf`);
  };

  return (
    <div style={{ display: 'flex', gap: 8 }}>
      <button className="btn btn-p" onClick={handleExportExcel} type="button">Export Excel</button>
      <button className="btn btn-p" onClick={handleExportPDF} type="button">Export PDF</button>
    </div>
  );
}
