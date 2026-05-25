import type {
  ProjectEstimateContentSection,
} from "@/types/project-estimate-content"

export async function exportExecutionToExcel(content: {
  record: {
    name: string
    workspaceName?: string | null
    customerName?: string | null
    projectAddress?: string | null
    workspaceLogo?: string | null
  }
  sections: ProjectEstimateContentSection[]
}) {
  const ExcelJS = await import("exceljs")
  const Workbook =
    ExcelJS.Workbook ||
    (ExcelJS as any).default?.Workbook ||
    (ExcelJS as any).default
  const workbook = new Workbook()
  const worksheet = workbook.addWorksheet("Приложение №1 (Исполнение)", {
    views: [{ showGridLines: true }],
  })

  // Helper for dynamic row height calculation based on Column B text length, font size, and manual line breaks
  function calculateRowHeight(
    text: string,
    colWidth: number,
    baseHeight: number = 20,
    fontSize: number = 10
  ) {
    if (!text) return baseHeight

    // Split by manual line breaks to handle multiline inputs
    const lines = text.split(/\r?\n/)
    let totalLines = 0

    // Adjust character limit per line based on font size and Cyrillic widths
    let charsPerLine = colWidth * 0.85
    if (fontSize === 11) {
      charsPerLine = colWidth * 0.78
    } else if (fontSize === 9) {
      charsPerLine = colWidth * 0.92
    }
    charsPerLine = Math.max(1, Math.floor(charsPerLine))

    for (const line of lines) {
      const charCount = line.length
      const wrappedLines = Math.max(1, Math.ceil(charCount / charsPerLine))
      totalLines += wrappedLines
    }

    // Line height in points based on font size
    const ptLineHeight = fontSize === 9 ? 13 : fontSize === 11 ? 16 : 15

    // Add safety padding in points
    const padding = 6
    const calculatedHeight = totalLines * ptLineHeight + padding

    return Math.max(baseHeight, calculatedHeight)
  }

  // Pre-fetch workspace logo if present
  const imageBuffers: Record<
    string,
    { buffer: ArrayBuffer; extension: string }
  > = {}

  if (content.record.workspaceLogo) {
    try {
      const res = await fetch(content.record.workspaceLogo)
      if (res.ok) {
        const buf = await res.arrayBuffer()
        const contentType = res.headers.get("content-type") || ""
        let extension = "png"
        if (contentType.includes("jpeg") || contentType.includes("jpg")) {
          extension = "jpeg"
        } else if (contentType.includes("gif")) {
          extension = "gif"
        }
        imageBuffers[content.record.workspaceLogo] = { buffer: buf, extension }
      }
    } catch (err) {
      console.error("Failed to fetch workspace logo:", content.record.workspaceLogo, err)
    }
  }

  // Set initial columns to ensure merging and layouts calculate positions correctly
  worksheet.columns = [
    { key: "number", width: 8 },
    { key: "title", width: 60 },
    { key: "unit", width: 10 },
    { key: "planQuantity", width: 15 },
    { key: "planPrice", width: 15 },
    { key: "planTotal", width: 18 },
    { key: "factQuantity", width: 15 },
    { key: "factPrice", width: 15 },
    { key: "factTotal", width: 18 },
    { key: "deviationTotal", width: 18 },
  ]

  // Header Block (Logo, Contractor, Client, Address)
  worksheet.addRow([]) // Row 1 (Empty spacing)

  // Merge A2:B5 for logo placeholder
  worksheet.mergeCells(2, 1, 5, 2)
  const logoCell = worksheet.getCell(2, 1)
  logoCell.alignment = { horizontal: "center", vertical: "middle" }

  if (
    content.record.workspaceLogo &&
    imageBuffers[content.record.workspaceLogo]
  ) {
    const logoInfo = imageBuffers[content.record.workspaceLogo]!
    const logoId = workbook.addImage({
      buffer: logoInfo.buffer,
      extension: logoInfo.extension as any,
    })
    worksheet.addImage(logoId, {
      tl: { col: 0.3, row: 1.4 },
      ext: { width: 64, height: 64 },
      editAs: "oneCell",
    } as any)
  } else {
    logoCell.font = {
      name: "Arial",
      size: 9,
      italic: true,
      color: { argb: "94A3B8" },
    }
    logoCell.value = "Место для логотипа"
    logoCell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "F8FAFC" },
    }
    logoCell.border = {
      top: { style: "dashDot", color: { argb: "CBD5E1" } },
      left: { style: "dashDot", color: { argb: "CBD5E1" } },
      bottom: { style: "dashDot", color: { argb: "CBD5E1" } },
      right: { style: "dashDot", color: { argb: "CBD5E1" } },
    }
  }

  const contractorRow = worksheet.addRow([])
  worksheet.mergeCells(contractorRow.number, 3, contractorRow.number, 10)
  contractorRow.getCell(3).value = {
    richText: [
      {
        text: "Подрядчик: ",
        font: {
          name: "Arial",
          size: 10,
          bold: true,
          color: { argb: "475569" },
        },
      },
      {
        text: content.record.workspaceName || "—",
        font: { name: "Arial", size: 10, color: { argb: "1E293B" } },
      },
    ],
  }
  contractorRow.getCell(3).alignment = { vertical: "middle" }
  contractorRow.height = 20

  const customerRow = worksheet.addRow([])
  worksheet.mergeCells(customerRow.number, 3, customerRow.number, 10)
  customerRow.getCell(3).value = {
    richText: [
      {
        text: "Заказчик: ",
        font: {
          name: "Arial",
          size: 10,
          bold: true,
          color: { argb: "475569" },
        },
      },
      {
        text: content.record.customerName || "—",
        font: { name: "Arial", size: 10, color: { argb: "1E293B" } },
      },
    ],
  }
  customerRow.getCell(3).alignment = { vertical: "middle" }
  customerRow.height = 20

  const contractRow = worksheet.addRow([])
  worksheet.mergeCells(contractRow.number, 3, contractRow.number, 10)
  contractRow.getCell(3).value = {
    richText: [
      {
        text: "Договор №: ",
        font: {
          name: "Arial",
          size: 10,
          bold: true,
          color: { argb: "475569" },
        },
      },
      {
        text: "—",
        font: { name: "Arial", size: 10, color: { argb: "1E293B" } },
      },
    ],
  }
  contractRow.getCell(3).alignment = { vertical: "middle" }
  contractRow.height = 20

  const addressRow = worksheet.addRow([])
  worksheet.mergeCells(addressRow.number, 3, addressRow.number, 10)
  addressRow.getCell(3).value = {
    richText: [
      {
        text: "Адрес объекта: ",
        font: {
          name: "Arial",
          size: 10,
          bold: true,
          color: { argb: "475569" },
        },
      },
      {
        text: content.record.projectAddress || "—",
        font: { name: "Arial", size: 10, color: { argb: "1E293B" } },
      },
    ],
  }
  addressRow.getCell(3).alignment = { vertical: "middle" }
  addressRow.height = 20

  worksheet.addRow([]) // Spacer

  // Title row
  const titleRow = worksheet.addRow(["", "", "ПЛАН-ФАКТНЫЙ АНАЛИЗ ВЫПОЛНЕНИЯ РАБОТ"])
  worksheet.mergeCells(titleRow.number, 3, titleRow.number, 10)
  titleRow.height = 28
  titleRow.getCell(3).font = {
    name: "Arial",
    size: 16,
    bold: true,
    color: { argb: "1E293B" },
  }
  titleRow.getCell(3).alignment = { horizontal: "center", vertical: "middle" }

  // Subtitles
  const nameRow = worksheet.addRow(["", "", `Смета: ${content.record.name}`])
  worksheet.mergeCells(nameRow.number, 3, nameRow.number, 10)
  nameRow.height = 18
  nameRow.getCell(3).font = { name: "Arial", size: 10, italic: true }
  nameRow.getCell(3).alignment = { horizontal: "center", vertical: "middle" }

  worksheet.addRow([]) // Spacer

  // Header Row
  const headerRow = worksheet.addRow([
    "№",
    "Наименование работы",
    "Ед. изм.",
    "План: Кол-во",
    "План: Цена",
    "План: Сумма",
    "Факт: Кол-во",
    "Факт: Цена",
    "Факт: Сумма",
    "Отклонение",
  ])

  headerRow.height = 28
  headerRow.eachCell((cell: any) => {
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
    cell.alignment = {
      vertical: "middle",
      horizontal: "center",
      wrapText: true,
    }
    cell.border = {
      top: { style: "thin", color: { argb: "475569" } },
      bottom: { style: "medium", color: { argb: "475569" } },
      left: { style: "thin", color: { argb: "475569" } },
      right: { style: "thin", color: { argb: "475569" } },
    }
  })

  const startRow = headerRow.number + 1
  const sectionTotalRowNums: number[] = []

  const activeSections = content.sections
    .map((section) => {
      const activeWorks = section.works.filter((work) => (work.factQuantity ?? 0) !== 0)
      return {
        ...section,
        works: activeWorks,
      }
    })
    .filter((section) => section.works.length > 0)

  activeSections.forEach((section, secIdx) => {
    const secRowNumber = secIdx + 1

    // Section Header Row
    const sectionText = `Раздел ${secRowNumber}. ${section.title}`
    const sectionRow = worksheet.addRow([
      String(secRowNumber),
      sectionText,
    ])
    sectionRow.height = calculateRowHeight(sectionText, 60, 24, 11)

    const sectionRowNum = sectionRow.number
    worksheet.mergeCells(sectionRowNum, 2, sectionRowNum, 10)

    for (let col = 1; col <= 10; col++) {
      const cell = sectionRow.getCell(col)
      cell.font = { name: "Arial", size: 11, bold: true, color: { argb: "1E293B" } }
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "E2E8F0" },
      }
      cell.border = {
        top: { style: "thin", color: { argb: "CBD5E1" } },
        bottom: { style: "thin", color: { argb: "CBD5E1" } },
        left: { style: "thin", color: { argb: "CBD5E1" } },
        right: { style: "thin", color: { argb: "CBD5E1" } },
      }
      if (col === 1) {
        cell.alignment = { horizontal: "center", vertical: "middle" }
      } else if (col === 2) {
        cell.alignment = { vertical: "middle", wrapText: true }
      }
    }

    const sectionWorkRowIndices: number[] = []

    section.works.forEach((work, workIdx) => {
      const workNum = `${secRowNumber}.${workIdx + 1}`
      const rowIdx = worksheet.lastRow!.number + 1
      sectionWorkRowIndices.push(rowIdx)

      const dataRow = worksheet.addRow([
        workNum,
        work.title,
        work.unitLabel,
        work.quantity ?? 0,
        work.price ?? 0,
        { formula: `D${rowIdx}*E${rowIdx}` },
        work.factQuantity ?? 0,
        work.factPrice ?? 0,
        { formula: `G${rowIdx}*H${rowIdx}` },
        { formula: `F${rowIdx}-I${rowIdx}` }
      ])

      dataRow.height = calculateRowHeight(work.title, 60, 20, 10)

      dataRow.getCell(1).alignment = { horizontal: "center", vertical: "middle" }
      dataRow.getCell(2).alignment = { vertical: "middle", wrapText: true }
      dataRow.getCell(3).alignment = { horizontal: "center", vertical: "middle" }

      // Numbers & Currency formats
      dataRow.getCell(4).numFmt = "#,##0.00"
      dataRow.getCell(5).numFmt = '#,##0.00" ₽"'
      dataRow.getCell(6).numFmt = '#,##0.00" ₽"'

      dataRow.getCell(7).numFmt = "#,##0.00"
      dataRow.getCell(8).numFmt = '#,##0.00" ₽"'
      dataRow.getCell(9).numFmt = '#,##0.00" ₽"'

      dataRow.getCell(10).numFmt = '#,##0.00" ₽"'
      dataRow.getCell(10).font = { bold: true }

      // Borders and fonts for each cell
      for (let col = 1; col <= 10; col++) {
        const cell = dataRow.getCell(col)
        cell.font = { name: "Arial", size: 10 }
        cell.border = {
          top: { style: "thin", color: { argb: "E2E8F0" } },
          bottom: { style: "thin", color: { argb: "E2E8F0" } },
          left: { style: "thin", color: { argb: "E2E8F0" } },
          right: { style: "thin", color: { argb: "E2E8F0" } },
        }
      }
    })

    // Section Summary Row
    if (sectionWorkRowIndices.length > 0) {
      const startWorkRow = sectionWorkRowIndices[0]
      const endWorkRow = sectionWorkRowIndices[sectionWorkRowIndices.length - 1]
      const secTotalRowNum = worksheet.lastRow!.number + 1
      sectionTotalRowNums.push(secTotalRowNum)

      const sectionTotalRow = worksheet.addRow([
        "",
        `Итого по разделу ${secRowNumber}:`,
        "",
        "",
        "",
        { formula: `SUM(F${startWorkRow}:F${endWorkRow})` },
        "",
        "",
        { formula: `SUM(I${startWorkRow}:I${endWorkRow})` },
        { formula: `F${secTotalRowNum}-I${secTotalRowNum}` }
      ])
      sectionTotalRow.height = 22

      worksheet.mergeCells(secTotalRowNum, 2, secTotalRowNum, 5) // Merge B to E
      worksheet.mergeCells(secTotalRowNum, 7, secTotalRowNum, 8) // Merge G and H

      for (let col = 1; col <= 10; col++) {
        const cell = sectionTotalRow.getCell(col)
        cell.font = { name: "Arial", size: 10, bold: true }
        cell.border = {
          top: { style: "thin", color: { argb: "94A3B8" } },
          bottom: { style: "double", color: { argb: "94A3B8" } },
          left: { style: "thin", color: { argb: "E2E8F0" } },
          right: { style: "thin", color: { argb: "E2E8F0" } },
        }
        if (col === 6 || col === 9 || col === 10) {
          cell.numFmt = '#,##0.00" ₽"'
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "F1F5F9" },
          }
        }
      }
      sectionTotalRow.getCell(2).alignment = {
        horizontal: "right",
        vertical: "middle",
      }
    }
  })

  const endRow = worksheet.lastRow!.number

  // Grand Total Row
  const grandTotalRow = worksheet.addRow([
    "",
    "ИТОГО ПО ВЫПОЛНЕНИЮ РАБОТ",
    "",
    "",
    "",
    sectionTotalRowNums.length > 0
      ? { formula: sectionTotalRowNums.map((r) => `F${r}`).join("+") }
      : 0,
    "",
    "",
    sectionTotalRowNums.length > 0
      ? { formula: sectionTotalRowNums.map((r) => `I${r}`).join("+") }
      : 0,
    "",
  ])
  grandTotalRow.height = 26

  const grandRowNum = grandTotalRow.number
  grandTotalRow.getCell(10).value = { formula: `F${grandRowNum}-I${grandRowNum}` }

  worksheet.mergeCells(grandRowNum, 2, grandRowNum, 5) // Merge B to E
  worksheet.mergeCells(grandRowNum, 7, grandRowNum, 8) // Merge G and H

  for (let col = 1; col <= 10; col++) {
    const cell = grandTotalRow.getCell(col)
    cell.font = {
      name: "Arial",
      size: 11,
      bold: true,
      color: { argb: "1E293B" },
    }
    cell.border = {
      top: { style: "thin", color: { argb: "475569" } },
      bottom: { style: "double", color: { argb: "1E293B" } },
      left: { style: "thin", color: { argb: "E2E8F0" } },
      right: { style: "thin", color: { argb: "E2E8F0" } },
    }
    if (col === 6 || col === 9 || col === 10) {
      cell.numFmt = '#,##0.00" ₽"'
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "F1F5F9" },
      }
    }
  }

  grandTotalRow.getCell(2).alignment = {
    horizontal: "right",
    vertical: "middle",
  }

  // Conditional formatting for Deviation column J
  if (endRow >= startRow) {
    worksheet.addConditionalFormatting({
      ref: `J${startRow}:J${grandRowNum}`,
      rules: [
        {
          type: "cellIs",
          operator: "greaterThan",
          formulae: ["0"],
          priority: 1,
          style: {
            font: { color: { argb: "047857" }, bold: true }, // Emerald-700
          },
        },
        {
          type: "cellIs",
          operator: "lessThan",
          formulae: ["0"],
          priority: 2,
          style: {
            font: { color: { argb: "B91C1C" }, bold: true }, // Red-700
          },
        },
      ],
    })
  }

  // Generate Excel workbook buffer and trigger download
  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  const safeName = content.record.name
    .replace(/[^a-zA-Z0-9а-яА-ЯёЁ\s-_]/g, "")
    .replace(/\s+/g, "_")
  link.download = `Выполнение_Смета_${safeName}.xlsx`
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}
