import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'
import { getLogoUrl } from '../../../lib/assets'
import sarabunFont from '../../../lib/sarabun-base64.js'

function safeText(value) {
  if (value === null || value === undefined) return '-'
  return String(value)
}

export function exportReportExcel({ fileName, columns, rows }) {
  const normalizedRows = rows.map((row) => {
    const output = {}
    columns.forEach((column) => {
      output[column.label] = row[column.key]
    })
    return output
  })

  const worksheet = XLSX.utils.json_to_sheet(normalizedRows)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Report')
  XLSX.writeFile(workbook, `${fileName}.xlsx`)
}

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  // Add Sarabun font if available
  if (sarabunFont && sarabunFont.length > 0) {
    doc.addFileToVFS('Sarabun-Regular.ttf', sarabunFont)
    doc.addFont('Sarabun-Regular.ttf', 'Sarabun', 'normal')
    doc.setFont('Sarabun', 'normal')
  } else {
    doc.setFont('helvetica', 'normal')
  }
  doc.setFontSize(18)

  // Logo
  let y = 18
  try {
    const logoUrl = await getLogoUrl()
    if (logoUrl) {
      const img = new window.Image();
      img.src = logoUrl;
      await new Promise(res => { img.onload = res; });
      doc.addImage(img, 'PNG', 12, y, 22, 22)
    }
  } catch {}

  // Header
  doc.text(title, 38, y + 8)
  doc.setFontSize(12)
  if (filter) {
    doc.text(`ช่วงเดือน: ${filter.startMonthLabel} ถึง ${filter.endMonthLabel} ปี ${filter.year + 543}`, 38, y + 18)
  }
  doc.text(`วันที่พิมพ์: ${new Date().toLocaleDateString('th-TH')}`, 38, y + 26)

  // Table
  autoTable(doc, {
    startY: y + 32,
    head: [columns.map(col => col.label)],
    body: rows.map(row => columns.map(col => row[col.key])),
    styles: { font: (sarabunFont && sarabunFont.length > 0) ? 'Sarabun' : 'helvetica', fontSize: 12 },
    headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: 'bold' },
    bodyStyles: { textColor: 20 },
    margin: { left: 12, right: 12 },
    theme: 'grid',
    didDrawPage: (data) => {
      if (typeof sumAmount === 'number') {
        doc.setFont((sarabunFont && sarabunFont.length > 0) ? 'Sarabun' : 'helvetica', 'bold')
        doc.setFontSize(13)
        doc.text(
          `รวมยอดเงินที่ชำระ: ${sumAmount.toLocaleString()}`,
          data.settings.margin.left,
          doc.lastAutoTable.finalY + 8
        )
        doc.setFont((sarabunFont && sarabunFont.length > 0) ? 'Sarabun' : 'helvetica', 'normal')
      }
    }
  })
  doc.save(`${fileName}.pdf`)
}
