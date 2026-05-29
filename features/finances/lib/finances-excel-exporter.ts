import type { FinanceSection } from "@/features/finances/types"

export async function exportFinancesToExcel(content: {
  record: {
    name: string
    workspaceName?: string | null
    customerName?: string | null
    projectAddress?: string | null
    workspaceLogo?: string | null
  }
  sections: FinanceSection[]
  totalPurchasesAmount: number
}) {
  const ExcelJS = await import("exceljs")
  const Workbook =
    ExcelJS.Workbook ||
    (ExcelJS as any).default?.Workbook ||
    (ExcelJS as any).default
  const workbook = new Workbook()
  const worksheet = workbook.addWorksheet("Приложение №1 (Финансы)", {
    views: [{ showGridLines: true }],
  })

  // Set initial columns
  worksheet.columns = [
    { key: "title", width: 50 },
    { key: "date", width: 15 },
    { key: "plan", width: 18 },
    { key: "fact", width: 18 },
    { key: "expenses", width: 18 },
    { key: "balance", width: 18 },
    { key: "status", width: 18 },
    { key: "percent", width: 12 },
  ]

  // Header Block (Logo, Contractor, Client, Address)
  worksheet.addRow([]) // Row 1 (Empty spacing)

  // Merge A2:B5 for logo placeholder
  worksheet.mergeCells(2, 1, 5, 2)
  const logoCell = worksheet.getCell(2, 1)
  logoCell.alignment = { horizontal: "center", vertical: "middle" }

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
        text: "—",
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
  const titleRow = worksheet.addRow(["", "", "ОТЧЕТ ПО ПОСТУПЛЕНИЯМ (ФИНАНСЫ)"])
  worksheet.mergeCells(titleRow.number, 3, titleRow.number, 8)
  titleRow.height = 28
  titleRow.getCell(3).font = {
    name: "Arial",
    size: 14,
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

  // Header Row
  const headerRow = worksheet.addRow([
    "Раздел / Платёж",
    "Дата",
    "План",
    "Факт",
    "Затраты",
    "Баланс",
    "Статус",
    "%",
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

  const sectionRowNumbers: number[] = []

  const paymentStatusLabel: Record<string, string> = {
    conducted: "Проведён",
    processing: "В обработке",
    cancelled: "Отменён",
    expected: "Ожидается",
  }

  const sectionStatusLabel: Record<string, string> = {
    paid: "Оплачен",
    partial: "Частично",
    unpaid: "Не оплачен",
    overpaid: "Переплата",
  }

  content.sections.forEach((section) => {
    const secRowIdx = worksheet.lastRow!.number + 1
    sectionRowNumbers.push(secRowIdx)

    const paymentCount = section.payments.length

    const isGeneral = section.sectionId === "general_advance"

    // Calculate section fact amount based on payments status (conducted / processing)
    // Status column is now G (col 7) not H (col 8)
    const factFormula =
      paymentCount > 0
        ? `SUMPRODUCT((G${secRowIdx + 1}:G${secRowIdx + paymentCount}="Проведён")*D${secRowIdx + 1}:D${secRowIdx + paymentCount}) + SUMPRODUCT((G${secRowIdx + 1}:G${secRowIdx + paymentCount}="В обработке")*D${secRowIdx + 1}:D${secRowIdx + paymentCount})`
        : null

    // Determine default local status text
    const conductedFact = section.payments
      .filter((p) => p.status === "conducted" || p.status === "processing")
      .reduce((sum, p) => sum + p.amount, 0)
    let statusText = "Не оплачен"
    if (isGeneral) {
      statusText = conductedFact > 0 ? "Внесено" : "Не внесено"
    } else if (conductedFact > 0) {
      if (conductedFact > section.planAmount) {
        statusText = "Переплата"
      } else if (conductedFact >= section.planAmount) {
        statusText = "Оплачен"
      } else {
        statusText = "Частично"
      }
    }

    const secRow = worksheet.addRow([
      section.title,
      "", // Date is empty
      isGeneral ? "" : section.planAmount,
      factFormula ? { formula: factFormula, result: conductedFact } : 0,
      section.expenses || "",
      {
        formula: `N(D${secRowIdx})-N(E${secRowIdx})`,
        result: conductedFact - (section.expenses ?? 0),
      },
      statusText,
      isGeneral
        ? ""
        : {
            formula: `(C${secRowIdx}>0)*D${secRowIdx}/(C${secRowIdx}+(C${secRowIdx}=0))`,
            result:
              section.planAmount > 0 ? conductedFact / section.planAmount : 0,
          },
    ])

    secRow.height = 24

    // Format section row cells
    for (let col = 1; col <= 8; col++) {
      const cell = secRow.getCell(col)
      cell.font = { name: "Arial", size: 10, bold: true }
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "F1F5F9" }, // slate-100
      }
      cell.border = {
        top: { style: "thin", color: { argb: "CBD5E1" } },
        bottom: { style: "thin", color: { argb: "CBD5E1" } },
        left: { style: "thin", color: { argb: "CBD5E1" } },
        right: { style: "thin", color: { argb: "CBD5E1" } },
      }
    }

    secRow.getCell(1).alignment = { horizontal: "left", vertical: "middle" }
    secRow.getCell(3).numFmt = '#,##0.00" ₽"'
    secRow.getCell(4).numFmt = '#,##0.00" ₽"'
    secRow.getCell(5).numFmt = '#,##0.00" ₽"'
    secRow.getCell(6).numFmt = '#,##0.00" ₽"'
    secRow.getCell(7).alignment = { horizontal: "center", vertical: "middle" }
    secRow.getCell(8).numFmt = "0%"

    // Add nested payment rows
    section.payments.forEach((payment) => {
      const payRowIdx = worksheet.lastRow!.number + 1
      const payStatus = paymentStatusLabel[payment.status] || payment.status

      const payRow = worksheet.addRow([
        `  ↳ ${payment.purpose || "Платёж"}`,
        new Date(payment.date),
        "", // Plan is empty
        payment.amount,
        "", // Expenses is empty
        "", // Balance is empty
        payStatus,
        "", // Percent is empty
      ])

      payRow.height = 20

      // Format payment row cells
      for (let col = 1; col <= 8; col++) {
        const cell = payRow.getCell(col)
        cell.font = { name: "Arial", size: 9, italic: col === 1 }
        cell.border = {
          top: { style: "thin", color: { argb: "F1F5F9" } },
          bottom: { style: "thin", color: { argb: "F1F5F9" } },
          left: { style: "thin", color: { argb: "CBD5E1" } },
          right: { style: "thin", color: { argb: "CBD5E1" } },
        }
      }

      payRow.getCell(1).alignment = { horizontal: "left", vertical: "middle" }
      payRow.getCell(2).numFmt = "dd.mm.yyyy"
      payRow.getCell(2).alignment = { horizontal: "center", vertical: "middle" }
      payRow.getCell(4).numFmt = '#,##0.00" ₽"'
      payRow.getCell(7).alignment = { horizontal: "center", vertical: "middle" }
    })

    // If section has no payments, add a dummy sub-row for clarity
    if (paymentCount === 0) {
      const emptyRow = worksheet.addRow([
        "  ↳ Платежей пока нет",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
      ])
      emptyRow.height = 20
      for (let col = 1; col <= 8; col++) {
        const cell = emptyRow.getCell(col)
        cell.font = {
          name: "Arial",
          size: 9,
          italic: true,
          color: { argb: "94A3B8" },
        }
        cell.border = {
          top: { style: "thin", color: { argb: "F1F5F9" } },
          bottom: { style: "thin", color: { argb: "F1F5F9" } },
          left: { style: "thin", color: { argb: "CBD5E1" } },
          right: { style: "thin", color: { argb: "CBD5E1" } },
        }
      }
    }
  })

  // Grand Total Row
  const grandTotalRowIdx = worksheet.lastRow!.number + 1

  const contractTotal = content.sections.reduce(
    (sum, s) => sum + s.planAmount,
    0
  )
  const paidTotal = content.sections.reduce(
    (sum, s) =>
      sum +
      s.payments
        .filter((p) => p.status === "conducted" || p.status === "processing")
        .reduce((pSum, p) => pSum + p.amount, 0),
    0
  )

  const planSumFormula =
    sectionRowNumbers.length > 0
      ? sectionRowNumbers.map((n) => `N(C${n})`).join("+")
      : null
  const factSumFormula =
    sectionRowNumbers.length > 0
      ? sectionRowNumbers.map((n) => `N(D${n})`).join("+")
      : null
  const expensesSumFormula =
    sectionRowNumbers.length > 0
      ? sectionRowNumbers.map((n) => `N(E${n})`).join("+")
      : null

  const grandTotalRow = worksheet.addRow([
    "ИТОГО ПО СМЕТЕ",
    "",
    planSumFormula ? { formula: planSumFormula, result: contractTotal } : 0,
    factSumFormula ? { formula: factSumFormula, result: paidTotal } : 0,
    expensesSumFormula
      ? { formula: expensesSumFormula, result: content.totalPurchasesAmount }
      : 0,
    {
      formula: `N(D${grandTotalRowIdx})-N(E${grandTotalRowIdx})`,
      result: paidTotal - content.totalPurchasesAmount,
    },
    "",
    {
      formula: `(N(C${grandTotalRowIdx})>0)*N(D${grandTotalRowIdx})/(N(C${grandTotalRowIdx})+(N(C${grandTotalRowIdx})=0))`,
      result: contractTotal > 0 ? paidTotal / contractTotal : 0,
    },
  ])

  grandTotalRow.height = 26
  worksheet.mergeCells(grandTotalRowIdx, 1, grandTotalRowIdx, 2)

  // Format Grand Total cells
  for (let col = 1; col <= 8; col++) {
    const cell = grandTotalRow.getCell(col)
    cell.font = {
      name: "Arial",
      size: 10,
      bold: true,
      color: { argb: "1E293B" },
    }
    cell.border = {
      top: { style: "thin", color: { argb: "475569" } },
      bottom: { style: "double", color: { argb: "1E293B" } },
      left: { style: "thin", color: { argb: "CBD5E1" } },
      right: { style: "thin", color: { argb: "CBD5E1" } },
    }
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "E2E8F0" }, // slate-200
    }
  }

  grandTotalRow.getCell(1).alignment = {
    horizontal: "right",
    vertical: "middle",
  }
  grandTotalRow.getCell(3).numFmt = '#,##0.00" ₽"'
  grandTotalRow.getCell(4).numFmt = '#,##0.00" ₽"'
  grandTotalRow.getCell(5).numFmt = '#,##0.00" ₽"'
  grandTotalRow.getCell(6).numFmt = '#,##0.00" ₽"'
  grandTotalRow.getCell(8).numFmt = "0%"

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
  link.download = `Финансы_Смета_${safeName}.xlsx`
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}
