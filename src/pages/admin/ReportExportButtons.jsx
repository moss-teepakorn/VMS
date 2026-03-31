
import React from 'react';
import Swal from 'sweetalert2';

import { exportReportExcel } from '../admin/reports/reportExport.mjs';
import { exportPaymentReportPdf } from '../admin/reports/paymentReportExportPdf.js';


export default function ReportExportButtons({ columns, rows, filter, reportTitle, sumAmount, logoUrl }) {
  // Export Excel (ใช้ฟังก์ชันกลาง)
  const handleExportExcel = () => {
    try {
      exportReportExcel({ fileName: reportTitle, columns, rows });
      Swal.fire({ icon: 'success', title: 'ส่งออก Excel สำเร็จ', timer: 1200, showConfirmButton: false });
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'ผิดพลาด', text: err.message });
    }
  };

  // Export PDF (ใช้ html2canvas + jsPDF แบบหน้า fees)
  const handleExportPDF = async () => {
    try {
      await exportPaymentReportPdf({
        title: reportTitle,
        fileName: reportTitle,
        columns,
        rows,
        filter,
        sumAmount,
        logoUrl
      });
      Swal.fire({ icon: 'success', title: 'ส่งออก PDF สำเร็จ', timer: 1200, showConfirmButton: false });
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'ผิดพลาด', text: err.message });
    }
  };

  return (
    <div style={{ display: 'flex', gap: 8 }}>
      <button
        className="btn btn-p"
        style={{ background: '#27ae60', color: '#fff', border: 'none', fontWeight: 600 }}
        onClick={handleExportExcel}
        type="button"
      >
        Export Excel
      </button>
      <button
        className="btn btn-p"
        style={{ background: '#e67e22', color: '#fff', border: 'none', fontWeight: 600 }}
        onClick={handleExportPDF}
        type="button"
      >
        Export PDF
      </button>
    </div>
  );
}
