// Builds a client-shareable spreadsheet that mirrors the printed report.
//
// The file is Excel-compatible HTML saved with an .xls extension. Excel, LibreOffice
// Calc, Google Sheets and Numbers all open it and keep the colours, borders, merged
// title cells and column widths - which is exactly what a shared report needs.
//
// Two rules matter for Excel to import it cleanly:
//   1. There must be a SINGLE <table>. Excel only imports the first table on a page,
//      so the whole document (title, metrics, every section) lives in one table and
//      the blocks are separated with merged rows, not separate tables.
//   2. No flex or grid layout. Excel ignores it, so every layout here is a table.
//
// The sheet sits on a uniform grid of BASE_COLUMNS equal-width columns. Blocks that
// want a wider column (a long "Notes" field) claim several base columns for it, and
// the summary band splits the grid evenly so the cards are always the same size.

export interface SheetMetric {
  label: string
  value: string | number
  tone?: 'default' | 'urgent' | 'good'
}

export interface SheetSection {
  heading: string
  columns: string[]
  rows: (string | number)[][]
  // Per-row highlight, e.g. mark urgent leads in red.
  highlight?: ('urgent' | 'normal')[]
  // Relative column widths, e.g. [1, 3, 2] - notes get more room than the index.
  columnWidths?: number[]
}

export interface SheetDoc {
  title: string
  subtitle?: string
  meta?: { label: string; value: string }[]
  metrics?: SheetMetric[]
  sections: SheetSection[]
  footer?: string
}

const BRAND = '#3b82f6'
const BRAND_DARK = '#1d4ed8'
const INK = '#1f2937'
const MUTED = '#6b7280'
const LINE = '#d1d5db'
const ZEBRA = '#f9fafb'
const URGENT_BG = '#fee2e2'
const URGENT_FG = '#b91c1c'

/** Width of the whole sheet, and how many equal base columns it is cut into. */
const SHEET_WIDTH = 900
const BASE_COLUMNS = 24

const escapeHtml = (value: unknown): string =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

const toneColor = (tone?: SheetMetric['tone']): string =>
  tone === 'urgent' ? URGENT_FG : tone === 'good' ? '#047857' : BRAND

/**
 * Splits `count` base columns between `weights` fields, largest-remainder style, so
 * every field gets at least one base column and the total is exactly `count`.
 */
function allocateBaseColumns(weights: number[], count: number): number[] {
  if (weights.length === 0) return []
  const total = weights.reduce((a, b) => a + b, 0) || weights.length
  const exact = weights.map(w => (w / total) * count)
  const floors = exact.map(Math.floor)
  let assigned = floors.reduce((a, b) => a + b, 0)
  const order = exact
    .map((v, i) => ({ i, frac: v - Math.floor(v) }))
    .sort((a, b) => b.frac - a.frac)
  let cursor = 0
  // Guarantee one column per field first.
  for (let i = 0; i < floors.length && assigned < count; i++) {
    if (floors[i] < 1) { floors[i] = 1; assigned++ }
  }
  while (assigned < count && cursor < order.length) {
    floors[order[cursor % order.length].i]++
    assigned++
    cursor++
  }
  while (assigned > count) {
    const idx = floors.indexOf(Math.max(...floors))
    if (floors[idx] <= 1) break
    floors[idx]--
    assigned--
  }
  return floors
}

/**
 * Renders a report document as one Excel-importable table.
 * Every block is a merged row, so the whole sheet lines up on a single grid.
 */
export function buildSheetHtml(doc: SheetDoc): string {
  const gridColumns = Math.max(
    BASE_COLUMNS,
    ...doc.sections.map(s => s.columns.length),
    ...(doc.metrics?.length ? [doc.metrics.length * 2] : [])
  )

  const rows: string[] = []

  // --- Title band -------------------------------------------------------
  rows.push(
    `<tr><td colspan="${gridColumns}" style="background:${BRAND_DARK};color:#ffffff;font-size:18pt;font-weight:bold;padding:10px 8px;text-align:center;border:1px solid ${BRAND_DARK};">${escapeHtml(doc.title)}</td></tr>`
  )

  if (doc.subtitle) {
    rows.push(
      `<tr><td colspan="${gridColumns}" style="background:#eff6ff;color:${BRAND_DARK};font-size:12pt;font-weight:bold;padding:6px 8px;text-align:center;border:1px solid ${LINE};">${escapeHtml(doc.subtitle)}</td></tr>`
    )
  }

  for (const item of doc.meta ?? []) {
    rows.push(
      `<tr><td colspan="${gridColumns}" style="font-size:10pt;color:${MUTED};padding:3px 8px;border:1px solid ${LINE};">${escapeHtml(item.label)}: <b>${escapeHtml(item.value)}</b></td></tr>`
    )
  }

  // --- Summary metrics, laid out as cards (label over value) -------------
  if (doc.metrics?.length) {
    const perRow = Math.max(1, Math.min(doc.metrics.length, Math.floor(gridColumns / 2)))
    for (let i = 0; i < doc.metrics.length; i += perRow) {
      const chunk = doc.metrics.slice(i, i + perRow)
      // The cards split the grid evenly; the last one takes any remainder so the
      // band always spans the full width.
      const even = Math.floor(gridColumns / chunk.length)
      const spans = chunk.map((_, idx) =>
        idx === chunk.length - 1 ? gridColumns - even * (chunk.length - 1) : even
      )
      const labelCells = chunk
        .map(
          (m, idx) =>
            `<td colspan="${spans[idx]}" style="background:#f3f4f6;color:${MUTED};font-size:9pt;font-weight:bold;padding:4px 8px;text-align:center;border:1px solid ${LINE};">${escapeHtml(m.label.toUpperCase())}</td>`
        )
        .join('')
      const valueCells = chunk
        .map(
          (m, idx) =>
            `<td colspan="${spans[idx]}" style="background:#ffffff;color:${toneColor(m.tone)};font-size:16pt;font-weight:bold;padding:6px 8px;text-align:center;border:1px solid ${LINE};">${escapeHtml(m.value)}</td>`
        )
        .join('')
      rows.push(`<tr>${labelCells}</tr>`)
      rows.push(`<tr>${valueCells}</tr>`)
    }
  }

  // --- Data sections ----------------------------------------------------
  for (const section of doc.sections) {
    const weights = section.columnWidths ?? section.columns.map(() => 1)
    const spans = allocateBaseColumns(weights, gridColumns)

    rows.push(
      `<tr><td colspan="${gridColumns}" style="background:#e5e7eb;color:${INK};font-size:12pt;font-weight:bold;padding:6px 8px;border:1px solid ${LINE};">${escapeHtml(section.heading)}</td></tr>`
    )

    const headerCells = section.columns
      .map(
        (c, idx) =>
          `<td colspan="${spans[idx]}" style="background:${BRAND};color:#ffffff;font-size:10pt;font-weight:bold;padding:6px 8px;text-align:left;border:1px solid ${BRAND};">${escapeHtml(c)}</td>`
      )
      .join('')
    rows.push(`<tr>${headerCells}</tr>`)

    section.rows.forEach((row, rowIndex) => {
      const tone = section.highlight?.[rowIndex]
      const bg = tone === 'urgent' ? URGENT_BG : rowIndex % 2 === 1 ? ZEBRA : '#ffffff'
      const fg = tone === 'urgent' ? URGENT_FG : INK
      const cells = row
        .map((cell, cellIndex) => {
          const weight = cellIndex === 0 ? 'bold' : 'normal'
          const span = spans[cellIndex] ?? 1
          return `<td colspan="${span}" style="background:${bg};color:${fg};font-size:10pt;font-weight:${weight};padding:5px 8px;text-align:left;border:1px solid ${LINE};">${escapeHtml(cell)}</td>`
        })
        .join('')
      rows.push(`<tr>${cells}</tr>`)
    })
    rows.push(`<tr><td colspan="${gridColumns}" style="border:1px solid ${LINE};"></td></tr>`)
  }

  if (doc.footer) {
    rows.push(
      `<tr><td colspan="${gridColumns}" style="font-size:9pt;color:${MUTED};padding:10px 8px;text-align:center;border:1px solid ${LINE};">${escapeHtml(doc.footer)}</td></tr>`
    )
  }

  // Column widths - Excel reads these off the <col> elements. Every base column is
  // the same width, so the merged blocks above always land on even proportions.
  const baseWidth = Math.round(SHEET_WIDTH / gridColumns)
  const cols = Array.from(
    { length: gridColumns },
    () => `<col style="width:${baseWidth}px;">`
  ).join('')

  return `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta http-equiv="Content-Type" content="text/html; charset=utf-8">
<meta name="ProgId" content="Excel.Sheet">
<title>${escapeHtml(doc.title)}</title>
<!--[if gte mso 9]><xml>
<x:ExcelWorkbook>
  <x:ExcelWorksheets><x:ExcelWorksheet><x:Name>Report</x:Name>
    <x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions>
  </x:ExcelWorksheet></x:ExcelWorksheets>
</x:ExcelWorkbook>
</xml><![endif]-->
<style>
  body { font-family: Calibri, Arial, sans-serif; }
  table { border-collapse: collapse; }
  td { mso-number-format: "\\@"; }
</style>
</head>
<body>
<table border="1" cellspacing="0" cellpadding="0">
${cols}
${rows.join('\n')}
</table>
</body>
</html>`
}

/** Saves the sheet as an Excel-compatible .xls file. */
export function downloadSheetFile(html: string, filename: string): void {
  // The BOM makes Excel read the file as UTF-8 even when it ignores the meta charset.
  const blob = new Blob(['\ufeff', html], { type: 'application/vnd.ms-excel;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/** File name helper: "Leads Report 2026-11-16" -> "leads-report-2026-11-16.xls" */
export function sheetFilename(base: string, date = new Date()): string {
  const stamp = date.toISOString().split('T')[0]
  return `${base.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}-${stamp}.xls`
}
