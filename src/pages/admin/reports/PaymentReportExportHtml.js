// PaymentReportExportHtml.js
// สร้าง HTML สำหรับ export PDF แบบเดียวกับหน้า fees (ใช้ Sarabun, layout เดียวกัน)

export function buildPaymentReportHtml({ title, columns, rows, filter, sumAmount }) {
  const today = new Date();
  const printDate = today.toLocaleDateString('th-TH');
  const tableHead = `<tr>${columns.map(col => `<th>${col.label}</th>`).join('')}</tr>`;
  const tableBody = rows.map((row, idx) =>
    `<tr>${columns.map(col => `<td>${row[col.key] ?? '-'}</td>`).join('')}</tr>`
  ).join('');
  return `
    <html>
      <head>
        <meta charset="utf-8" />
        <title>${title}</title>
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;500;700&display=swap" rel="stylesheet">
        <style>
          html, body { font-family: 'Sarabun', 'TH Sarabun New', Tahoma, sans-serif; margin: 0; padding: 0; color: #111827; background: #fff; }
          .report-wrap { max-width: 900px; margin: 0 auto; padding: 32px; }
          .report-title { font-size: 22px; font-weight: 700; margin-bottom: 8px; }
          .report-meta { font-size: 13px; color: #64748b; margin-bottom: 16px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
          th, td { border: 1px solid #cbd5e1; padding: 8px 10px; font-size: 13px; }
          th { background: #f1f5f9; font-weight: 600; }
          tfoot td { background: #f1f5f9; font-weight: 600; }
          .sum-row td { font-weight: 700; color: #2563eb; }
        </style>
      </head>
      <body>
        <div class="report-wrap">
          <div class="report-title">${title}</div>
          <div class="report-meta">
            ${filter ? `ช่วงเดือน: ${filter.startMonthLabel} ถึง ${filter.endMonthLabel} ปี ${filter.year + 543}<br/>` : ''}
            วันที่พิมพ์: ${printDate}
          </div>
          <table>
            <thead>${tableHead}</thead>
            <tbody>${tableBody}</tbody>
            <tfoot><tr class="sum-row"><td colspan="${columns.length - 1}" style="text-align:right;">รวมยอดเงินที่ชำระ</td><td>${sumAmount?.toLocaleString() ?? '-'}</td></tr></tfoot>
          </table>
        </div>
      </body>
    </html>
  `;
}
