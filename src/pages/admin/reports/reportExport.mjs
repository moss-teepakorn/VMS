import * as XLSX from 'xlsx'

function safeText(value) {
	if (value === null || value === undefined) return '-'
	return String(value)
}

function coerceNumeric(value) {
	if (value === null || value === undefined) return value
	if (typeof value === 'number') return value
	const s = String(value).trim()
	// Accept strings like "1,234", "1234.56" or "1,234.56"
	if (/^-?[0-9,]+(?:\.[0-9]+)?$/.test(s)) {
		const cleaned = s.replace(/,/g, '')
		const n = Number(cleaned)
		return Number.isFinite(n) ? n : value
	}
	return value
}

export function exportReportExcel({ fileName, columns, rows }) {
	const normalizedRows = rows.map((row) => {
		const output = {}
		columns.forEach((column) => {
			// Prefer raw numeric field if available (e.g. 'outstandingRaw')
			const rawKey = `${column.key}Raw`
			if (Object.prototype.hasOwnProperty.call(row, rawKey) && row[rawKey] !== undefined) {
				output[column.label] = coerceNumeric(row[rawKey])
				return
			}

			const val = row[column.key]
			const coerced = coerceNumeric(val)
			output[column.label] = coerced === val ? val : coerced
		})
		return output
	})

	const worksheet = XLSX.utils.json_to_sheet(normalizedRows)
	const workbook = XLSX.utils.book_new()
	XLSX.utils.book_append_sheet(workbook, worksheet, 'Report')
	XLSX.writeFile(workbook, `${fileName}.xlsx`)
}
