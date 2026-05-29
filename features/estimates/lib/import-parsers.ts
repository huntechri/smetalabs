export type ParsedRow = {
  index: number
  sectionTitle: string | null
  type: "section" | "work" | "material"
  code: string | null
  title: string
  unitLabel: string | null
  quantity: number | null
  price: number | null
  consumption: number | null
  notes: string | null
  imageUrl: string | null
  status: "valid" | "error"
  errors: string[]
}

export function normalizeKey(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, "")
}

export function parseNumber(value: unknown) {
  if (value === null || value === undefined) return null
  const str = String(value).trim().replace(/\s/g, "").replace(",", ".")
  if (!str) return null
  const parsed = Number(str)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null
}

export function splitDelimitedLine(line: string, delimiter: string) {
  const cells: string[] = []
  let current = ""
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (char === delimiter && !inQuotes) {
      cells.push(current)
      current = ""
    } else {
      current += char
    }
  }
  cells.push(current)
  return cells.map((c) => c.trim())
}

export function parseCsvText(text: string): ParsedRow[] {
  const lines = text
    .replace(/^\ufeff/, "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)

  if (lines.length === 0) return []

  const delimiter =
    (lines[0]!.match(/;/g)?.length ?? 0) >= (lines[0]!.match(/,/g)?.length ?? 0)
      ? ";"
      : ","

  const header = splitDelimitedLine(lines[0]!, delimiter)
  const columns = header.map((h, i) => ({
    key: normalizeKey(h),
    index: i,
  }))

  const findIndex = (keys: string[]) => {
    const found = columns.find((c) => keys.some((k) => c.key.includes(k)))
    return found?.index ?? -1
  }

  const idxSection = findIndex(["раздел", "section"])
  const idxType = findIndex(["тип", "type"])
  const idxCode = findIndex(["код", "code", "артикул"])
  const idxTitle = findIndex(["наименование", "название", "title", "name"])
  const idxUnit = findIndex(["ед", "изм", "unit", "measure"])
  const idxQty = findIndex(["кол", "qty", "quantity", "объем"])
  const idxPrice = findIndex(["цена", "price", "расценка"])
  const idxConsumption = findIndex(["коэф", "расход", "consumption", "norm"])
  const idxNotes = findIndex(["примечание", "заметка", "note"])
  const idxImageUrl = findIndex(["изображение", "фото", "image", "url", "pic"])

  const parsed: ParsedRow[] = []

  for (let i = 1; i < lines.length; i++) {
    const rowNumber = i + 1
    const line = lines[i]!
    const cells = splitDelimitedLine(line, delimiter)

    if (cells.length === 0 || !cells.some((c) => c)) continue

    const sectionTitle = idxSection >= 0 ? cells[idxSection] || null : null
    const typeStr = idxType >= 0 ? normalizeKey(cells[idxType] || "") : ""
    const code = idxCode >= 0 ? cells[idxCode] || null : null
    const title = idxTitle >= 0 ? cells[idxTitle] || "" : ""
    const unitLabel = idxUnit >= 0 ? cells[idxUnit] || null : null
    const quantityStr = idxQty >= 0 ? cells[idxQty] : null
    const priceStr = idxPrice >= 0 ? cells[idxPrice] : null
    const consumptionStr = idxConsumption >= 0 ? cells[idxConsumption] : null
    const notes = idxNotes >= 0 ? cells[idxNotes] || null : null
    const imageUrl = idxImageUrl >= 0 ? cells[idxImageUrl] || null : null

    const isMaterial =
      typeStr.includes("мат") || typeStr.includes("mat") || typeStr === "м"
    const isSection =
      typeStr.includes("разд") ||
      typeStr.includes("sect") ||
      typeStr === "р" ||
      (!typeStr && !unitLabel && !quantityStr && !priceStr && title)

    const type = isSection ? "section" : isMaterial ? "material" : "work"

    const quantity = parseNumber(quantityStr)
    const price = parseNumber(priceStr)
    const consumption = parseNumber(consumptionStr)

    const errors: string[] = []
    if (!title) errors.push("Нет наименования")
    if (type !== "section" && !unitLabel) errors.push("Нет единицы измерения")
    if (type !== "section" && quantity === null)
      errors.push("Некорректное количество")
    if (type !== "section" && price === null) errors.push("Некорректная цена")

    parsed.push({
      index: rowNumber,
      sectionTitle,
      type,
      code,
      title,
      unitLabel,
      quantity,
      price,
      consumption,
      notes,
      imageUrl,
      status: errors.length === 0 ? "valid" : "error",
      errors,
    })
  }

  return parsed
}

export async function parseXlsxFile(file: File): Promise<ParsedRow[]> {
  const ExcelJS = await import("exceljs")
  const Workbook =
    ExcelJS.Workbook ||
    (ExcelJS as any).default?.Workbook ||
    (ExcelJS as any).default
  const workbook = new Workbook()

  const arrayBuffer = await file.arrayBuffer()
  await workbook.xlsx.load(arrayBuffer)
  const worksheet =
    workbook.worksheets.find((ws) => ws.state === "visible") ||
    workbook.worksheets[0]

  if (!worksheet) return []

  let headerRowIndex = -1
  let idxSection = -1
  let idxType = -1
  let idxCode = -1
  let idxTitle = -1
  let idxUnit = -1
  let idxQty = -1
  let idxPrice = -1
  let idxConsumption = -1
  let idxNotes = -1
  let idxImageUrl = -1

  for (let i = 1; i <= Math.min(10, worksheet.rowCount); i++) {
    const row = worksheet.getRow(i)
    if (!row.values || !Array.isArray(row.values)) continue

    const cells = (row.values as any[])
      .map((c) => normalizeKey(String(c ?? "")))
      .filter(Boolean)

    if (cells.length > 2) {
      const isHeader =
        cells.some((c) => c.includes("наим") || c.includes("назв")) &&
        cells.some((c) => c.includes("кол") || c.includes("объем"))

      if (isHeader) {
        headerRowIndex = i
        const findIndex = (keys: string[]) => {
          return (row.values as any[]).findIndex((v) => {
            const str = normalizeKey(String(v ?? ""))
            return keys.some((k) => str.includes(k))
          })
        }

        idxSection = findIndex(["раздел", "section"])
        idxType = findIndex(["тип", "type"])
        idxCode = findIndex(["код", "code", "артикул"])
        idxTitle = findIndex(["наименование", "название", "title", "name"])
        idxUnit = findIndex(["ед", "изм", "unit", "measure"])
        idxQty = findIndex(["кол", "qty", "quantity", "объем"])
        idxPrice = findIndex(["цена", "price", "расценка"])
        idxConsumption = findIndex(["коэф", "расход", "consumption", "norm"])
        idxNotes = findIndex(["примечание", "заметка", "note"])
        idxImageUrl = findIndex(["изображение", "фото", "image", "url", "pic"])
        break
      }
    }
  }

  if (headerRowIndex === -1) {
    throw new Error("Не удалось найти заголовки таблицы")
  }

  const parsed: ParsedRow[] = []

  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber <= headerRowIndex) return

    const getVal = (idx: number) => {
      if (idx === -1) return null
      const val = row.getCell(idx).value
      if (val === null || val === undefined) return null
      if (typeof val === "object") {
        if ("richText" in val && Array.isArray(val.richText)) {
          return val.richText.map((rt: any) => rt.text).join("")
        }
        if ("text" in val && "hyperlink" in val) {
          return String(val.text)
        }
      }
      return String(val)
    }

    const sectionTitle = getVal(idxSection)
    const typeStr = normalizeKey(getVal(idxType) || "")
    const code = getVal(idxCode)
    const title = getVal(idxTitle) || ""
    const unitLabel = getVal(idxUnit)
    const quantityStr = getVal(idxQty)
    const priceStr = getVal(idxPrice)
    const consumptionStr = getVal(idxConsumption)
    const notes = getVal(idxNotes)
    const imageUrl = getVal(idxImageUrl)

    if (!title && !typeStr && !quantityStr && !priceStr) return

    const isMaterial =
      typeStr.includes("мат") || typeStr.includes("mat") || typeStr === "м"
    const isSection =
      typeStr.includes("разд") ||
      typeStr.includes("sect") ||
      typeStr === "р" ||
      (!typeStr && !unitLabel && !quantityStr && !priceStr && title)

    const type = isSection ? "section" : isMaterial ? "material" : "work"

    const quantity = parseNumber(quantityStr)
    const price = parseNumber(priceStr)
    const consumption = parseNumber(consumptionStr)

    const errors: string[] = []
    if (!title) errors.push("Нет наименования")
    if (type !== "section" && !unitLabel) errors.push("Нет единицы измерения")
    if (type !== "section" && quantity === null)
      errors.push("Некорректное количество")
    if (type !== "section" && price === null) errors.push("Некорректная цена")

    parsed.push({
      index: rowNumber,
      sectionTitle,
      type,
      code,
      title,
      unitLabel,
      quantity,
      price,
      consumption,
      notes,
      imageUrl,
      status: errors.length === 0 ? "valid" : "error",
      errors,
    })
  })

  return parsed
}

export async function downloadImportTemplate() {
  const ExcelJS = await import("exceljs")
  const Workbook =
    ExcelJS.Workbook ||
    (ExcelJS as any).default?.Workbook ||
    (ExcelJS as any).default
  const workbook = new Workbook()
  const worksheet = workbook.addWorksheet("Шаблон сметы", {
    views: [{ showGridLines: true }],
  })

  worksheet.columns = [
    { key: "section", width: 22 },
    { key: "type", width: 12 },
    { key: "code", width: 12 },
    { key: "title", width: 35 },
    { key: "unit", width: 10 },
    { key: "qty", width: 12 },
    { key: "price", width: 12 },
    { key: "consumption", width: 15 },
    { key: "notes", width: 25 },
    { key: "imageUrl", width: 35 },
  ]

  worksheet.addRow([
    "Раздел",
    "Тип",
    "Код",
    "Наименование",
    "Ед. изм.",
    "Кол-во",
    "Цена",
    "Коэф. расхода",
    "Примечание",
    "Ссылка на изображение",
  ])

  worksheet.getRow(1).eachCell((cell) => {
    cell.font = {
      name: "Arial",
      size: 10,
      bold: true,
      color: { argb: "FFFFFF" },
    }
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "1E293B" },
    }
  })

  worksheet.addRow([
    "Демонтаж и подготовка",
    "Раздел",
    "",
    "Подготовка комнат к ремонту",
    "",
    "",
    "",
    "",
    "Демонтажные работы",
    "",
  ])

  worksheet.addRow([
    "Демонтаж и подготовка",
    "Работа",
    "DEM-01",
    "Демонтаж кирпичных стен",
    "м2",
    45,
    450,
    "",
    "Стены в полкирпича",
    "",
  ])

  worksheet.addRow([
    "Демонтаж и подготовка",
    "Материал",
    "MAT-01",
    "Мешки строительные",
    "шт",
    120,
    30,
    2.6,
    "Для вывоза мусора",
    "https://images.unsplash.com/photo-1589939705384-5185137a7f0f",
  ])

  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = "template-estimate-import.xlsx"
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}
