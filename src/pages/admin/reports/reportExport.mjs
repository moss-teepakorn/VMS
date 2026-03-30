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
