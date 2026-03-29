import { jsPDF } from 'jspdf'
import * as XLSX from 'xlsx'

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

export function exportReportPdf({ title, fileName, columns, rows }) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pageWidth = doc.internal.pageSize.getWidth()
  const margin = 10
  const contentWidth = pageWidth - margin * 2
  const colWidth = contentWidth / Math.max(columns.length, 1)
  let y = 12

  doc.setFontSize(12)
  doc.text(title, margin, y)
  y += 8

  doc.setFontSize(9)
  columns.forEach((column, index) => {
    doc.text(safeText(column.label), margin + index * colWidth, y)
  })
  y += 4
  doc.line(margin, y, margin + contentWidth, y)
  y += 4

  rows.forEach((row) => {
    if (y > 282) {
      doc.addPage()
      y = 12
    }
    columns.forEach((column, index) => {
      doc.text(safeText(row[column.key]), margin + index * colWidth, y, { maxWidth: colWidth - 1 })
    })
    y += 5
  })

  doc.save(`${fileName}.pdf`)
}
