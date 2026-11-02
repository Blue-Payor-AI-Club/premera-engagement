// CSV export of what a page is currently showing. Built from the data already on screen,
// which the API has filtered for the user's role, so it never exports more than they can see.

const cell = (value: string) => (/[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value)

export function toCsv(rows: string[][]): string {
  // Leading BOM so Excel opens UTF-8 (en dashes, accented names) correctly.
  return '﻿' + rows.map((r) => r.map(cell).join(',')).join('\r\n')
}

export function downloadCsv(filename: string, rows: string[][]): void {
  const url = URL.createObjectURL(new Blob([toCsv(rows)], { type: 'text/csv;charset=utf-8' }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
