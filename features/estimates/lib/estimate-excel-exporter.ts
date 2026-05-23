export async function exportEstimateToExcel(content: any) {
  const ExcelJS = await import("exceljs")
  const Workbook =
    ExcelJS.Workbook ||
    (ExcelJS as any).default?.Workbook ||
    (ExcelJS as any).default
  const workbook = new Workbook()
  const worksheet = workbook.addWorksheet("Смета", {
    views: [{ showGridLines: true }],
  })

  // 1. Pre-fetch all material preview images in parallel
  const imageUrlsToFetch = new Set<string>()
  content.sections.forEach((section: any) => {
    section.works.forEach((work: any) => {
      work.materials.forEach((material: any) => {
        if (material.imageUrl) {
          imageUrlsToFetch.add(material.imageUrl)
        }
      })
    })
  })

  const imageBuffers: Record<
    string,
    { buffer: ArrayBuffer; extension: string }
  > = {}
  await Promise.all(
    Array.from(imageUrlsToFetch).map(async (url) => {
      try {
        const res = await fetch(url)
        if (!res.ok) return
        const buf = await res.arrayBuffer()
        const contentType = res.headers.get("content-type") || ""
        let extension = "png"
        if (contentType.includes("jpeg") || contentType.includes("jpg")) {
          extension = "jpeg"
        } else if (contentType.includes("gif")) {
          extension = "gif"
        }
        imageBuffers[url] = { buffer: buf, extension }
      } catch (err) {
        console.error("Failed to fetch image:", url, err)
      }
    })
  )

  // 2. Title Block
  worksheet.addRow([])
  const titleRow = worksheet.addRow(["", "СМЕТНЫЙ РАСЧЁТ"])
  titleRow.getCell(2).font = {
    name: "Arial",
    size: 16,
    bold: true,
    color: { argb: "1E293B" },
  }

  const projectRow = worksheet.addRow([
    "",
    `Проект: ${content.record.projectName || "SmetaLab Project"}`,
  ])
  projectRow.getCell(2).font = { name: "Arial", size: 10, italic: true }

  const nameRow = worksheet.addRow(["", `Смета: ${content.record.name}`])
  nameRow.getCell(2).font = { name: "Arial", size: 10, italic: true }

  worksheet.addRow([])

  // 3. Column Config
  worksheet.columns = [
    { key: "number", width: 8 },
    { key: "image", width: 10 },
    { key: "title", width: 70 },
    { key: "unit", width: 10 },
    { key: "quantity", width: 12 },
    { key: "price", width: 15 },
    { key: "amount", width: 18 },
    { key: "notes", width: 25 },
  ]

  // 4. Headers
  const headerRow = worksheet.addRow([
    "№",
    "Превью",
    "Наименование работ / материалов",
    "Ед. изм.",
    "Кол-во",
    "Цена",
    "Сумма",
    "Примечание",
  ])

  headerRow.height = 28
  headerRow.eachCell((cell) => {
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

  // 5. Data Rows
  const sectionTotalRows: number[] = []

  content.sections.forEach((section: any, secIdx: number) => {
    const secRowNumber = secIdx + 1

    // Section Row
    const sectionRow = worksheet.addRow([
      String(secRowNumber),
      "",
      `Раздел ${secRowNumber}. ${section.title}`,
    ])
    sectionRow.height = 24

    // Apply section styles across columns A-H (1-8)
    for (let col = 1; col <= 8; col++) {
      const cell = sectionRow.getCell(col)
      cell.font = { name: "Arial", size: 11, bold: true }
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "E2E8F0" },
      }
      cell.border = {
        top: { style: "thin", color: { argb: "CBD5E1" } },
        bottom: { style: "thin", color: { argb: "CBD5E1" } },
      }
      if (col === 1)
        cell.alignment = { horizontal: "center", vertical: "middle" }
      else cell.alignment = { vertical: "middle", wrapText: true }
    }

    const startRowIdx = worksheet.lastRow!.number + 1
    let rowsCount = 0

    section.works.forEach((work: any, workIdx: number) => {
      const workNum = `${secRowNumber}.${workIdx + 1}`

      // Work Row
      const workRow = worksheet.addRow([
        workNum,
        "",
        work.title,
        work.unitLabel,
        work.quantity,
        work.price,
        {
          formula: `E${worksheet.lastRow!.number + 1}*F${worksheet.lastRow!.number + 1}`,
        },
        work.notes || "",
      ])
      rowsCount++

      // Format Work Row
      workRow.height = 20
      workRow.getCell(1).alignment = {
        horizontal: "center",
        vertical: "middle",
      }
      workRow.getCell(3).alignment = { vertical: "middle", wrapText: true }
      workRow.getCell(4).alignment = {
        horizontal: "center",
        vertical: "middle",
      }
      workRow.getCell(5).numFmt = "#,##0.00"
      workRow.getCell(6).numFmt = '#,##0.00" ₽"'
      workRow.getCell(7).numFmt = '#,##0.00" ₽"'
      workRow.getCell(7).font = { bold: true }
      workRow.getCell(8).alignment = { vertical: "middle", wrapText: true }

      for (let col = 1; col <= 8; col++) {
        const cell = workRow.getCell(col)
        cell.border = {
          bottom: { style: "thin", color: { argb: "F1F5F9" } },
        }
      }

      // Materials in Work
      work.materials.forEach((material: any, matIdx: number) => {
        const matNum = `${workNum}.${matIdx + 1}`

        const matRow = worksheet.addRow([
          matNum,
          "",
          `   • ${material.title}`,
          material.unitLabel,
          material.quantity,
          material.price,
          {
            formula: `E${worksheet.lastRow!.number + 1}*F${worksheet.lastRow!.number + 1}`,
          },
          material.notes || "",
        ])
        rowsCount++

        // Format Material Row
        matRow.eachCell((cell) => {
          cell.font = { name: "Arial", size: 9, color: { argb: "475569" } }
        })
        matRow.getCell(1).alignment = {
          horizontal: "center",
          vertical: "middle",
        }
        matRow.getCell(3).alignment = { vertical: "middle", wrapText: true }
        matRow.getCell(4).alignment = {
          horizontal: "center",
          vertical: "middle",
        }
        matRow.getCell(5).numFmt = "#,##0.00"
        matRow.getCell(6).numFmt = '#,##0.00" ₽"'
        matRow.getCell(7).numFmt = '#,##0.00" ₽"'
        matRow.getCell(8).alignment = { vertical: "middle", wrapText: true }

        for (let col = 1; col <= 8; col++) {
          const cell = matRow.getCell(col)
          cell.border = {
            bottom: { style: "thin", color: { argb: "F8FAFC" } },
          }
        }

        const matRowIdx = worksheet.lastRow!.number

        if (material.imageUrl && imageBuffers[material.imageUrl]) {
          const imgInfo = imageBuffers[material.imageUrl]!
          const imgId = workbook.addImage({
            buffer: imgInfo.buffer,
            extension: imgInfo.extension as any,
          })

          // Centered position inside Cell:
          // Col B width: 10 (~77px). Image size: 0.6cm x 0.6cm (~23px). Offset: (77 - 23)/2 = 27px (~0.35 offset)
          // Row height: 32 (~43px). Image size: 23px. Offset: (43 - 23)/2 = 10px (~0.23 offset)
          worksheet.addImage(imgId, {
            tl: { col: 1.35, row: matRowIdx - 0.77 },
            ext: { width: 23, height: 23 },
            editAs: "oneCell",
          } as any)

          matRow.height = 32
          matRow.getCell(2).alignment = {
            horizontal: "center",
            vertical: "middle",
          }
        } else {
          matRow.height = 18
        }
      })
    })

    const endRowIdx = worksheet.lastRow!.number

    // Section Summary Row
    if (rowsCount > 0) {
      const sectionTotalRow = worksheet.addRow([
        "",
        `Итого по разделу: ${section.title}`,
        "",
        "",
        "",
        "",
        { formula: `SUM(G${startRowIdx}:G${endRowIdx})` },
        "",
      ])
      sectionTotalRow.height = 22
      sectionTotalRows.push(worksheet.lastRow!.number)

      const secTotalRowNum = worksheet.lastRow!.number
      worksheet.mergeCells(secTotalRowNum, 2, secTotalRowNum, 6)

      for (let col = 1; col <= 8; col++) {
        const cell = sectionTotalRow.getCell(col)
        cell.font = { name: "Arial", size: 10, bold: true }
        cell.border = {
          top: { style: "thin", color: { argb: "94A3B8" } },
          bottom: { style: "double", color: { argb: "94A3B8" } },
        }
      }
      sectionTotalRow.getCell(2).alignment = {
        horizontal: "right",
        vertical: "middle",
      }
      sectionTotalRow.getCell(7).numFmt = '#,##0.00" ₽"'
    }
  })

  // 6. Grand Summary Row
  worksheet.addRow([])
  const grandFormula =
    sectionTotalRows.length > 0
      ? sectionTotalRows.map((r) => `G${r}`).join("+")
      : "0"

  const grandTotalRow = worksheet.addRow([
    "",
    "ИТОГО ПО СМЕТЕ",
    "",
    "",
    "",
    "",
    { formula: grandFormula },
    "",
  ])
  grandTotalRow.height = 26

  const grandRowNum = worksheet.lastRow!.number
  worksheet.mergeCells(grandRowNum, 2, grandRowNum, 6)

  for (let col = 1; col <= 8; col++) {
    const cell = grandTotalRow.getCell(col)
    cell.font = {
      name: "Arial",
      size: 12,
      bold: true,
      color: { argb: "1E293B" },
    }
    cell.border = {
      top: { style: "thin", color: { argb: "475569" } },
      bottom: { style: "double", color: { argb: "1E293B" } },
    }
    if (col === 7) {
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

  // 7. Technical Sheet ("Для импорта")
  const techSheet = workbook.addWorksheet("Для импорта", {
    views: [{ showGridLines: true }],
  })

  techSheet.columns = [
    { key: "section", width: 25 },
    { key: "type", width: 12 },
    { key: "code", width: 12 },
    { key: "title", width: 40 },
    { key: "unit", width: 10 },
    { key: "qty", width: 12 },
    { key: "price", width: 12 },
    { key: "consumption", width: 15 },
    { key: "notes", width: 25 },
    { key: "imageUrl", width: 35 },
  ]

  techSheet.addRow([
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

  techSheet.getRow(1).eachCell((cell) => {
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

  content.sections.forEach((section: any) => {
    // Add section row
    techSheet.addRow([
      section.title,
      "Раздел",
      "",
      section.title,
      "",
      "",
      "",
      "",
      "",
      "",
    ])

    section.works.forEach((work: any) => {
      // Add work row
      techSheet.addRow([
        section.title,
        "Работа",
        work.code || "",
        work.title,
        work.unitLabel || "",
        work.quantity ?? "",
        work.price ?? "",
        "",
        work.notes || "",
        "",
      ])

      work.materials.forEach((material: any) => {
        // Add material row
        techSheet.addRow([
          section.title,
          "Материал",
          material.code || "",
          material.title,
          material.unitLabel || "",
          material.quantity ?? "",
          material.price ?? "",
          material.consumption ?? "",
          material.notes || "",
          material.imageUrl || "",
        ])
      })
    })
  })

  // 8. Download Trigger
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
  link.download = `Смета_${safeName}.xlsx`
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}
