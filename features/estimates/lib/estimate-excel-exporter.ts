export async function exportEstimateToExcel(content: any) {
  const ExcelJS = await import("exceljs")
  const Workbook =
    ExcelJS.Workbook ||
    (ExcelJS as any).default?.Workbook ||
    (ExcelJS as any).default
  const workbook = new Workbook()
  const worksheet1 = workbook.addWorksheet("Приложение №1", {
    views: [{ showGridLines: true }],
  })

  const worksheet2 = workbook.addWorksheet("Приложение №2", {
    views: [{ showGridLines: true }],
  })

  // Helper for dynamic row height calculation based on Column C text length, font size, and manual line breaks
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

  // 1. Pre-fetch all material preview images and workspace logo in parallel
  const imageUrlsToFetch = new Set<string>()
  if (content.record.workspaceLogo) {
    imageUrlsToFetch.add(content.record.workspaceLogo)
  }
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

  async function populateClientSheet(
    worksheet: any,
    sheetTitle: string,
    includeMaterials: boolean
  ) {
    // Set initial columns to ensure merging and layouts calculate positions correctly
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

    // 2. Header Block (Logo, Contractor, Client, Contract, Address)
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
      // Center it inside the merged area A2:B5 (col A-B, row 2-5)
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
    worksheet.mergeCells(contractorRow.number, 3, contractorRow.number, 8)
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
    worksheet.mergeCells(customerRow.number, 3, customerRow.number, 8)
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
    worksheet.mergeCells(contractRow.number, 3, contractRow.number, 8)
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
          text: "",
          font: { name: "Arial", size: 10, color: { argb: "1E293B" } },
        },
      ],
    }
    contractRow.getCell(3).alignment = { vertical: "middle" }
    contractRow.height = 20

    const addressRow = worksheet.addRow([])
    worksheet.mergeCells(addressRow.number, 3, addressRow.number, 8)
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
    const titleRow = worksheet.addRow(["", "", sheetTitle])
    worksheet.mergeCells(titleRow.number, 3, titleRow.number, 8)
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
    worksheet.mergeCells(nameRow.number, 3, nameRow.number, 8)
    nameRow.height = 18
    nameRow.getCell(3).font = { name: "Arial", size: 10, italic: true }
    nameRow.getCell(3).alignment = { horizontal: "center", vertical: "middle" }

    worksheet.addRow([]) // Spacer

    // 4. Headers
    const headerRow = worksheet.addRow([
      "№",
      includeMaterials ? "Превью" : "",
      includeMaterials
        ? "Наименование работ / материалов"
        : "Наименование работ",
      "Ед. изм.",
      "Кол-во",
      "Цена",
      "Сумма",
      "Примечание",
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

    // 5. Data Rows
    const sectionWorkTotalRows: number[] = []
    const sectionMaterialTotalRows: number[] = []

    content.sections.forEach((section: any, secIdx: number) => {
      const secRowNumber = secIdx + 1

      // Section Row
      const sectionText = `Раздел ${secRowNumber}. ${section.title}`
      const sectionRow = worksheet.addRow([
        String(secRowNumber),
        "",
        sectionText,
      ])
      sectionRow.height = calculateRowHeight(sectionText, 70, 24, 11)

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

      const sectionWorkRowIndices: number[] = []
      const sectionMaterialRowIndices: number[] = []

      section.works.forEach((work: any, workIdx: number) => {
        const workNum = `${secRowNumber}.${workIdx + 1}`
        const workRowIdx = worksheet.lastRow!.number + 1
        sectionWorkRowIndices.push(workRowIdx)

        // Work Row
        const workRow = worksheet.addRow([
          workNum,
          "",
          work.title,
          work.unitLabel,
          work.quantity,
          work.price,
          {
            formula: `E${workRowIdx}*F${workRowIdx}`,
          },
          work.notes || "",
        ])

        // Format Work Row
        workRow.height = calculateRowHeight(work.title, 70, 20, 10)
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
        if (includeMaterials) {
          work.materials.forEach((material: any, matIdx: number) => {
            const matNum = `${workNum}.${matIdx + 1}`
            const matRowIdx = worksheet.lastRow!.number + 1
            sectionMaterialRowIndices.push(matRowIdx)

            const matRow = worksheet.addRow([
              matNum,
              "",
              `   • ${material.title}`,
              material.unitLabel,
              material.quantity,
              material.price,
              {
                formula: `E${matRowIdx}*F${matRowIdx}`,
              },
              material.notes || "",
            ])

            // Format Material Row
            matRow.eachCell((cell: any) => {
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

            const materialText = `   • ${material.title}`
            const calculatedHeight = calculateRowHeight(materialText, 70, 18, 9)

            if (material.imageUrl && imageBuffers[material.imageUrl]) {
              const imgInfo = imageBuffers[material.imageUrl]!
              const imgId = workbook.addImage({
                buffer: imgInfo.buffer,
                extension: imgInfo.extension as any,
              })

              // Centered position inside Cell:
              worksheet.addImage(imgId, {
                tl: { col: 1.35, row: matRowIdx - 0.77 },
                ext: { width: 23, height: 23 },
                editAs: "oneCell",
              } as any)

              matRow.height = Math.max(32, calculatedHeight)
              matRow.getCell(2).alignment = {
                horizontal: "center",
                vertical: "middle",
              }
            } else {
              matRow.height = calculatedHeight
            }
          })
        }
      })

      // Section Work Summary Row
      if (sectionWorkRowIndices.length > 0) {
        const workFormula = sectionWorkRowIndices
          .map((idx) => `G${idx}`)
          .join("+")
        const sectionWorkTotalRow = worksheet.addRow([
          "",
          includeMaterials ? "Итого по разделу (работы):" : "Итого по разделу:",
          "",
          "",
          "",
          "",
          { formula: workFormula },
          "",
        ])
        sectionWorkTotalRow.height = 22
        sectionWorkTotalRows.push(worksheet.lastRow!.number)

        const secTotalRowNum = worksheet.lastRow!.number
        worksheet.mergeCells(secTotalRowNum, 2, secTotalRowNum, 6)

        for (let col = 1; col <= 8; col++) {
          const cell = sectionWorkTotalRow.getCell(col)
          cell.font = { name: "Arial", size: 10, bold: true }
          cell.border = {
            top: { style: "thin", color: { argb: "94A3B8" } },
            bottom: { style: "double", color: { argb: "94A3B8" } },
          }
        }
        sectionWorkTotalRow.getCell(2).alignment = {
          horizontal: "right",
          vertical: "middle",
        }
        sectionWorkTotalRow.getCell(7).numFmt = '#,##0.00" ₽"'
      }

      // Section Material Summary Row
      if (includeMaterials && sectionMaterialRowIndices.length > 0) {
        const matFormula = sectionMaterialRowIndices
          .map((idx) => `G${idx}`)
          .join("+")
        const sectionMaterialTotalRow = worksheet.addRow([
          "",
          "Итого по разделу (материалы):",
          "",
          "",
          "",
          "",
          { formula: matFormula },
          "",
        ])
        sectionMaterialTotalRow.height = 22
        sectionMaterialTotalRows.push(worksheet.lastRow!.number)

        const secTotalRowNum = worksheet.lastRow!.number
        worksheet.mergeCells(secTotalRowNum, 2, secTotalRowNum, 6)

        for (let col = 1; col <= 8; col++) {
          const cell = sectionMaterialTotalRow.getCell(col)
          cell.font = { name: "Arial", size: 10, bold: true }
          cell.border = {
            top: { style: "thin", color: { argb: "94A3B8" } },
            bottom: { style: "double", color: { argb: "94A3B8" } },
          }
        }
        sectionMaterialTotalRow.getCell(2).alignment = {
          horizontal: "right",
          vertical: "middle",
        }
        sectionMaterialTotalRow.getCell(7).numFmt = '#,##0.00" ₽"'
      }
    })

    // 6. Grand Summary Rows
    worksheet.addRow([])

    // Grand Works Total
    if (sectionWorkTotalRows.length > 0) {
      const grandWorksFormula = sectionWorkTotalRows
        .map((r) => `G${r}`)
        .join("+")
      const grandWorksTotalRow = worksheet.addRow([
        "",
        includeMaterials ? "ИТОГО ПО РАБОТАМ" : "ИТОГО ПО СМЕТЕ",
        "",
        "",
        "",
        "",
        { formula: grandWorksFormula },
        "",
      ])
      grandWorksTotalRow.height = 26

      const grandRowNum = worksheet.lastRow!.number
      worksheet.mergeCells(grandRowNum, 2, grandRowNum, 6)

      for (let col = 1; col <= 8; col++) {
        const cell = grandWorksTotalRow.getCell(col)
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
      grandWorksTotalRow.getCell(2).alignment = {
        horizontal: "right",
        vertical: "middle",
      }
    }

    // Grand Materials Total
    if (includeMaterials && sectionMaterialTotalRows.length > 0) {
      const grandMaterialsFormula = sectionMaterialTotalRows
        .map((r) => `G${r}`)
        .join("+")
      const grandMaterialsTotalRow = worksheet.addRow([
        "",
        "ИТОГО ПО МАТЕРИАЛАМ",
        "",
        "",
        "",
        "",
        { formula: grandMaterialsFormula },
        "",
      ])
      grandMaterialsTotalRow.height = 26

      const grandRowNum = worksheet.lastRow!.number
      worksheet.mergeCells(grandRowNum, 2, grandRowNum, 6)

      for (let col = 1; col <= 8; col++) {
        const cell = grandMaterialsTotalRow.getCell(col)
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
      grandMaterialsTotalRow.getCell(2).alignment = {
        horizontal: "right",
        vertical: "middle",
      }
    }
  }

  await populateClientSheet(worksheet1, "СМЕТНЫЙ РАСЧЁТ", true)
  await populateClientSheet(worksheet2, "РАСЧЁТ СТОИМОСТИ РАБОТ", false)

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
