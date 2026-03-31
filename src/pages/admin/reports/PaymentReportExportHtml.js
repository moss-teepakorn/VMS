// PaymentReportExportHtml.js
// สร้าง HTML สำหรับ export PDF แบบเดียวกับหน้า fees (ใช้ Sarabun, layout เดียวกัน)

export function buildPaymentReportHtml({ title, columns, rows, filter, sumAmount, logoUrl }) {
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
          .report-wrap {
            width: 1122px; /* A4 landscape at 96dpi */
            min-height: 793px;
            margin: 0 auto;
            padding: 16px 24px 16px 24px;
            background: #fff;
            border-radius: 12px;
            box-shadow: 0 2px 8px #0001;
            box-sizing: border-box;
          }
          .report-header {
            display: flex;
            align-items: center;
            gap: 24px;
            margin-bottom: 12px;
          }
          .brand { display: flex; align-items: flex-start; gap: 10px; flex: 1; min-width: 0; }
          .brand img {
            width: 48px;
            height: 48px;
            border-radius: 6px;
            object-fit: cover;
            border: 1px solid #cbd5e1;
            background: #f8fafc;
          }
          .report-title-block {
            flex: 1;
            display: flex;
            flex-direction: column;
            gap: 4px;
            min-width: 0;
          }
          .report-title {
            font-size: 26px; font-weight: 700; color: #0d9488; margin-bottom: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
          }
          .report-meta {
            font-size: 14px; color: #64748b; margin-bottom: 0; font-weight: 500;
          }
          .report-table-wrap { margin-top: 12px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
          th, td { border: 1.2px solid #cbd5e1; padding: 7px 8px; font-size: 14px; }
          th { background: #f1f5f9; font-weight: 600; }
          tfoot td { background: #f1f5f9; font-weight: 600; }
          .sum-row td { font-weight: 700; color: #2563eb; font-size: 16px; }
        </style>
      </head>
      <body>
        <div class="report-wrap">
          <div class="report-header">
            <div class="brand">
              <img src="${logoUrl || '/assets/village-logo.svg'}" alt="village-logo" />
              <div class="report-title-block">
                <div class="report-title">${title}</div>
                <div class="report-meta">
                  ${filter ? `ช่วงเดือน: ${filter.startMonthLabel} ถึง ${filter.endMonthLabel} ปี ${filter.year + 543}` : ''}
                  <br/>วันที่พิมพ์: ${printDate}
                </div>
              </div>
            </div>
          </div>
          <div class="report-table-wrap">
            <table>
              <thead>${tableHead}</thead>
              <tbody>${tableBody}</tbody>
              <tfoot><tr class="sum-row"><td colspan="${columns.length - 1}" style="text-align:right;">รวมยอดเงินที่ชำระ</td><td>${sumAmount?.toLocaleString() ?? '-'}</td></tr></tfoot>
            </table>
          </div>
        </div>
      </body>
    </html>
  `;
}
