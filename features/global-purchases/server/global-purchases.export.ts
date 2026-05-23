import type {
  GlobalPurchaseRow,
  GlobalPurchasesExportFile,
  GlobalPurchasesExportFormat,
} from "@/types/global-purchases"

const STATUS_LABELS: Record<GlobalPurchaseRow["status"], string> = {
  planned: "Запланировано",
  ordered: "Заказано",
  partially_received: "Частично получено",
  received: "Получено",
  cancelled: "Отменено",
}

const XLSX_CONTENT_TYPE =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
const textEncoder = new TextEncoder()

function escapeXml(value: string | number | null | undefined) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")
}

function formatDate(value: string | null | undefined) {
  if (!value) return ""
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString("ru-RU")
}

function columnName(index: number) {
  let value = index
  let name = ""
  while (value > 0) {
    const modulo = (value - 1) % 26
    name = String.fromCharCode(65 + modulo) + name
    value = Math.floor((value - modulo) / 26)
  }
  return name
}

type CellValue = string | number | null | undefined

type Cell = {
  value: CellValue
  type?: "text" | "number"
  style?: number
}

function textCell(value: CellValue, style = 0): Cell {
  return { value, type: "text", style }
}

function numberCell(value: CellValue, style = 0): Cell {
  return { value, type: "number", style }
}

function buildCell(cell: Cell, rowIndex: number, columnIndex: number) {
  const reference = `${columnName(columnIndex)}${rowIndex}`
  const style = cell.style ? ` s="${cell.style}"` : ""

  if (cell.value === null || cell.value === undefined || cell.value === "") {
    return `<c r="${reference}"${style}/>`
  }

  if (cell.type === "number") {
    return `<c r="${reference}"${style}><v>${escapeXml(cell.value)}</v></c>`
  }

  return `<c r="${reference}" t="inlineStr"${style}><is><t>${escapeXml(cell.value)}</t></is></c>`
}

function buildRow(cells: Cell[], rowIndex: number, height?: number) {
  const heightAttrs = height ? ` ht="${height}" customHeight="1"` : ""
  return `<row r="${rowIndex}"${heightAttrs}>${cells
    .map((cell, index) => buildCell(cell, rowIndex, index + 1))
    .join("")}</row>`
}

function buildSheetRows(purchases: GlobalPurchaseRow[]) {
  const exportedAt = new Date().toLocaleString("ru-RU")
  const rows: string[] = []

  rows.push(buildRow([textCell("Глобальные закупки", 1)], 1, 24))
  rows.push(
    buildRow(
      [textCell(`Выгружено: ${exportedAt}. Строк: ${purchases.length}.`, 2)],
      2
    )
  )
  rows.push(buildRow([], 3))

  rows.push(
    buildRow(
      [
        "№",
        "Объект",
        "Дата",
        "Наименование",
        "Ед. изм.",
        "Кол-во план",
        "Кол-во факт",
        "Цена план",
        "Цена факт",
        "Сумма план",
        "Сумма факт",
        "Отклонение",
        "Статус",
        "Примечание",
      ].map((label) => textCell(label, 3)),
      4,
      22
    )
  )

  purchases.forEach((purchase, index) => {
    rows.push(
      buildRow(
        [
          numberCell(index + 1, 4),
          textCell(purchase.projectTitle ?? "Без объекта", 5),
          textCell(formatDate(purchase.purchaseDate), 4),
          textCell(purchase.title, 5),
          textCell(purchase.unit, 4),
          numberCell(purchase.planQuantity, 6),
          numberCell(purchase.factQuantity, 6),
          numberCell(purchase.planPrice, 7),
          numberCell(purchase.factPrice, 7),
          numberCell(purchase.planTotal, 7),
          numberCell(purchase.factTotal, 7),
          numberCell(purchase.deviationTotal, 7),
          textCell(STATUS_LABELS[purchase.status], 5),
          textCell(purchase.notes, 5),
        ],
        index + 5
      )
    )
  })

  const summaryRowIndex = purchases.length + 5
  const planTotal = purchases.reduce((sum, row) => sum + row.planTotal, 0)
  const factTotal = purchases.reduce(
    (sum, row) => sum + (row.factTotal ?? 0),
    0
  )
  const deviationTotal = planTotal - factTotal

  rows.push(
    buildRow(
      [
        textCell("Итого", 8),
        textCell("", 8),
        textCell("", 8),
        textCell("", 8),
        textCell("", 8),
        textCell("", 8),
        textCell("", 8),
        textCell("", 8),
        textCell("", 8),
        numberCell(planTotal, 9),
        numberCell(factTotal, 9),
        numberCell(deviationTotal, 9),
        textCell("", 8),
        textCell("", 8),
      ],
      summaryRowIndex,
      22
    )
  )

  return rows.join("")
}

function worksheetXml(purchases: GlobalPurchaseRow[]) {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <dimension ref="A1:N${purchases.length + 5}"/>
  <sheetViews><sheetView workbookViewId="0"><pane ySplit="4" topLeftCell="A5" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>
  <sheetFormatPr defaultRowHeight="15"/>
  <cols>
    <col min="1" max="1" width="6" customWidth="1"/>
    <col min="2" max="2" width="28" customWidth="1"/>
    <col min="3" max="3" width="14" customWidth="1"/>
    <col min="4" max="4" width="48" customWidth="1"/>
    <col min="5" max="5" width="12" customWidth="1"/>
    <col min="6" max="12" width="14" customWidth="1"/>
    <col min="13" max="13" width="18" customWidth="1"/>
    <col min="14" max="14" width="34" customWidth="1"/>
  </cols>
  <sheetData>${buildSheetRows(purchases)}</sheetData>
  <mergeCells count="2">
    <mergeCell ref="A1:N1"/>
    <mergeCell ref="A2:N2"/>
  </mergeCells>
  <autoFilter ref="A4:N${purchases.length + 4}"/>
  <pageMargins left="0.7" right="0.7" top="0.75" bottom="0.75" header="0.3" footer="0.3"/>
</worksheet>`
}

function stylesXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <numFmts count="2">
    <numFmt numFmtId="164" formatCode="0.000"/>
    <numFmt numFmtId="165" formatCode="#,##0.00"/>
  </numFmts>
  <fonts count="4">
    <font><sz val="11"/><name val="Arial"/></font>
    <font><b/><sz val="16"/><name val="Arial"/></font>
    <font><sz val="10"/><color rgb="FF666666"/><name val="Arial"/></font>
    <font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Arial"/></font>
  </fonts>
  <fills count="4">
    <fill><patternFill patternType="none"/></fill>
    <fill><patternFill patternType="gray125"/></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FF1F2937"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFF3F4F6"/><bgColor indexed="64"/></patternFill></fill>
  </fills>
  <borders count="2">
    <border><left/><right/><top/><bottom/><diagonal/></border>
    <border><left style="thin"><color rgb="FF9CA3AF"/></left><right style="thin"><color rgb="FF9CA3AF"/></right><top style="thin"><color rgb="FF9CA3AF"/></top><bottom style="thin"><color rgb="FF9CA3AF"/></bottom><diagonal/></border>
  </borders>
  <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
  <cellXfs count="10">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
    <xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/>
    <xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1"/>
    <xf numFmtId="0" fontId="3" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
    <xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1"><alignment horizontal="center" vertical="top" wrapText="1"/></xf>
    <xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1"><alignment vertical="top" wrapText="1"/></xf>
    <xf numFmtId="164" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1"><alignment horizontal="right" vertical="top"/></xf>
    <xf numFmtId="165" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1"><alignment horizontal="right" vertical="top"/></xf>
    <xf numFmtId="0" fontId="1" fillId="3" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1"><alignment vertical="center"/></xf>
    <xf numFmtId="165" fontId="1" fillId="3" borderId="1" xfId="0" applyFont="1" applyFill="1" applyNumberFormat="1" applyBorder="1"><alignment horizontal="right" vertical="center"/></xf>
  </cellXfs>
  <cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`
}

const workbookXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets><sheet name="Закупки" sheetId="1" r:id="rId1"/></sheets>
</workbook>`

const workbookRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`

const rootRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`

const contentTypesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
</Types>`

const crcTable = Array.from({ length: 256 }, (_, index) => {
  let current = index
  for (let bit = 0; bit < 8; bit += 1) {
    current = current & 1 ? 0xedb88320 ^ (current >>> 1) : current >>> 1
  }
  return current >>> 0
})

function crc32(data: Uint8Array) {
  let crc = 0xffffffff
  for (const byte of data) crc = crcTable[(crc ^ byte) & 0xff]! ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}

function uint16(value: number) {
  const bytes = new Uint8Array(2)
  new DataView(bytes.buffer).setUint16(0, value, true)
  return bytes
}

function uint32(value: number) {
  const bytes = new Uint8Array(4)
  new DataView(bytes.buffer).setUint32(0, value, true)
  return bytes
}

function concatBytes(parts: Uint8Array[]) {
  const totalLength = parts.reduce((sum, part) => sum + part.length, 0)
  const output = new Uint8Array(totalLength)
  let offset = 0
  for (const part of parts) {
    output.set(part, offset)
    offset += part.length
  }
  return output
}

type ZipEntry = {
  name: string
  data: Uint8Array
}

function buildZip(entries: ZipEntry[]) {
  const localParts: Uint8Array[] = []
  const centralParts: Uint8Array[] = []
  let offset = 0

  for (const entry of entries) {
    const nameBytes = textEncoder.encode(entry.name)
    const crc = crc32(entry.data)
    const localHeader = concatBytes([
      uint32(0x04034b50),
      uint16(20),
      uint16(0),
      uint16(0),
      uint16(0),
      uint16(0),
      uint32(crc),
      uint32(entry.data.length),
      uint32(entry.data.length),
      uint16(nameBytes.length),
      uint16(0),
      nameBytes,
    ])

    localParts.push(localHeader, entry.data)

    const centralHeader = concatBytes([
      uint32(0x02014b50),
      uint16(20),
      uint16(20),
      uint16(0),
      uint16(0),
      uint16(0),
      uint16(0),
      uint32(crc),
      uint32(entry.data.length),
      uint32(entry.data.length),
      uint16(nameBytes.length),
      uint16(0),
      uint16(0),
      uint16(0),
      uint16(0),
      uint32(0),
      uint32(offset),
      nameBytes,
    ])

    centralParts.push(centralHeader)
    offset += localHeader.length + entry.data.length
  }

  const centralDirectory = concatBytes(centralParts)
  const endRecord = concatBytes([
    uint32(0x06054b50),
    uint16(0),
    uint16(0),
    uint16(entries.length),
    uint16(entries.length),
    uint32(centralDirectory.length),
    uint32(offset),
    uint16(0),
  ])

  return concatBytes([...localParts, centralDirectory, endRecord])
}

function xmlEntry(name: string, content: string): ZipEntry {
  return { name, data: textEncoder.encode(content) }
}

function buildXlsx(purchases: GlobalPurchaseRow[]) {
  return buildZip([
    xmlEntry("[Content_Types].xml", contentTypesXml),
    xmlEntry("_rels/.rels", rootRelsXml),
    xmlEntry("xl/workbook.xml", workbookXml),
    xmlEntry("xl/_rels/workbook.xml.rels", workbookRelsXml),
    xmlEntry("xl/styles.xml", stylesXml()),
    xmlEntry("xl/worksheets/sheet1.xml", worksheetXml(purchases)),
  ])
}

export function buildGlobalPurchasesExportFile(
  purchases: GlobalPurchaseRow[],
  format: GlobalPurchasesExportFormat
): GlobalPurchasesExportFile {
  if (format !== "xlsx") {
    throw new Error("Неподдерживаемый формат экспорта закупок")
  }

  return {
    body: new Blob([buildXlsx(purchases)], { type: XLSX_CONTENT_TYPE }),
    contentType: XLSX_CONTENT_TYPE,
    extension: "xlsx",
  }
}
