import type { DirectoryWork, DirectoryWorksListParams } from "../model/directory-works-model"
import { listDirectoryWorksForWorkspace } from "./directory-works.repository"

const EXPORT_LIMIT = 100
const MAX_EXPORT_ROWS = 10000

const EXPORT_COLUMNS: Array<{
  label: string
  value: (work: DirectoryWork) => string | number | null
}> = [
  { label: "Код", value: (work) => work.code },
  { label: "Название", value: (work) => work.title },
  { label: "Ед. изм.", value: (work) => work.unitLabel || work.unit },
  { label: "Расценка", value: (work) => work.rateAmount },
  { label: "Валюта", value: (work) => work.currencyCode },
  { label: "Категория", value: (work) => work.category },
  { label: "Подкатегория", value: (work) => work.subcategory },
  { label: "Синонимы", value: (work) => work.aliases.join("; ") },
  { label: "Ключевые слова", value: (work) => work.keywords.join("; ") },
  { label: "Описание", value: (work) => work.description },
  { label: "Включенные операции", value: (work) => work.includedOperations },
  { label: "Исключенные операции", value: (work) => work.excludedOperations },
  { label: "Тип цены", value: (work) => work.priceKind },
]

type ExportFile = {
  body: string | Buffer
  contentType: string
  extension: "csv" | "xlsx"
}

function csvCell(value: string | number | null) {
  const normalized = value === null ? "" : String(value)
  if (/[";\n\r]/.test(normalized)) {
    return `"${normalized.replace(/"/g, '""')}"`
  }
  return normalized
}

function buildCsv(works: DirectoryWork[]) {
  const header = EXPORT_COLUMNS.map((column) => column.label).join(";")
  const rows = works.map((work) =>
    EXPORT_COLUMNS.map((column) => csvCell(column.value(work))).join(";")
  )
  return `\uFEFF${[header, ...rows].join("\n")}`
}

function escapeXml(value: string | number | null) {
  return (value === null ? "" : String(value))
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")
}

function columnName(index: number) {
  let name = ""
  let current = index + 1
  while (current > 0) {
    const remainder = (current - 1) % 26
    name = String.fromCharCode(65 + remainder) + name
    current = Math.floor((current - 1) / 26)
  }
  return name
}

function buildSheetXml(works: DirectoryWork[]) {
  const rows = [
    EXPORT_COLUMNS.map((column) => column.label),
    ...works.map((work) => EXPORT_COLUMNS.map((column) => column.value(work))),
  ]
  const sheetRows = rows
    .map((row, rowIndex) => {
      const cells = row
        .map((value, columnIndex) => {
          const ref = `${columnName(columnIndex)}${rowIndex + 1}`
          return `<c r="${ref}" t="inlineStr"><is><t>${escapeXml(value)}</t></is></c>`
        })
        .join("")
      return `<row r="${rowIndex + 1}">${cells}</row>`
    })
    .join("")

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheetData>${sheetRows}</sheetData></worksheet>`
}

const CRC_TABLE = Array.from({ length: 256 }, (_, index) => {
  let crc = index
  for (let bit = 0; bit < 8; bit += 1) {
    crc = crc & 1 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1
  }
  return crc >>> 0
})

function crc32(buffer: Buffer) {
  let crc = 0xffffffff
  for (const byte of buffer) {
    crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8)
  }
  return (crc ^ 0xffffffff) >>> 0
}

function createZip(files: Array<{ name: string; content: string | Buffer }>) {
  const localParts: Buffer[] = []
  const centralParts: Buffer[] = []
  let offset = 0

  for (const file of files) {
    const name = Buffer.from(file.name)
    const content = Buffer.isBuffer(file.content)
      ? file.content
      : Buffer.from(file.content)
    const crc = crc32(content)
    const localHeader = Buffer.alloc(30)
    localHeader.writeUInt32LE(0x04034b50, 0)
    localHeader.writeUInt16LE(20, 4)
    localHeader.writeUInt32LE(crc, 14)
    localHeader.writeUInt32LE(content.length, 18)
    localHeader.writeUInt32LE(content.length, 22)
    localHeader.writeUInt16LE(name.length, 26)
    localParts.push(localHeader, name, content)

    const centralHeader = Buffer.alloc(46)
    centralHeader.writeUInt32LE(0x02014b50, 0)
    centralHeader.writeUInt16LE(20, 4)
    centralHeader.writeUInt16LE(20, 6)
    centralHeader.writeUInt32LE(crc, 16)
    centralHeader.writeUInt32LE(content.length, 20)
    centralHeader.writeUInt32LE(content.length, 24)
    centralHeader.writeUInt16LE(name.length, 28)
    centralHeader.writeUInt32LE(offset, 42)
    centralParts.push(centralHeader, name)
    offset += localHeader.length + name.length + content.length
  }

  const centralDirectory = Buffer.concat(centralParts)
  const end = Buffer.alloc(22)
  end.writeUInt32LE(0x06054b50, 0)
  end.writeUInt16LE(files.length, 8)
  end.writeUInt16LE(files.length, 10)
  end.writeUInt32LE(centralDirectory.length, 12)
  end.writeUInt32LE(offset, 16)
  return Buffer.concat([...localParts, centralDirectory, end])
}

function buildXlsx(works: DirectoryWork[]) {
  return createZip([
    {
      name: "[Content_Types].xml",
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>`,
    },
    {
      name: "_rels/.rels",
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
    },
    {
      name: "xl/workbook.xml",
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="directory_works" sheetId="1" r:id="rId1"/></sheets></workbook>`,
    },
    {
      name: "xl/_rels/workbook.xml.rels",
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>`,
    },
    { name: "xl/worksheets/sheet1.xml", content: buildSheetXml(works) },
  ])
}

export async function getDirectoryWorksForExport(
  workspaceOwnerId: string,
  params: DirectoryWorksListParams
) {
  const works: DirectoryWork[] = []
  let cursor = 0
  let hasMore = true

  while (hasMore && works.length < MAX_EXPORT_ROWS) {
    const response = await listDirectoryWorksForWorkspace(workspaceOwnerId, {
      ...params,
      status: params.status ?? "active",
      sort: params.sort ?? "updated_desc",
      limit: EXPORT_LIMIT,
      cursor,
    })
    works.push(...response.data)
    hasMore = response.meta.hasMore
    cursor = response.meta.nextCursor ?? cursor + EXPORT_LIMIT
  }

  return works.slice(0, MAX_EXPORT_ROWS)
}

export function buildDirectoryWorksExportFile(
  works: DirectoryWork[],
  format: "csv" | "xlsx"
): ExportFile {
  if (format === "xlsx") {
    return {
      body: buildXlsx(works),
      contentType:
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      extension: "xlsx",
    }
  }

  return {
    body: buildCsv(works),
    contentType: "text/csv; charset=utf-8",
    extension: "csv",
  }
}
