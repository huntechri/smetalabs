import { describe, it, expect } from "vitest"
import {
  roundMoney,
  roundQuantity,
  roundConsumption,
  calculateMaterialAmount,
  calculateWorkAmount,
  calculateWorkFactAmount,
  calculateWorkTotalWithMaterials,
  calculateWorkPriceWithCoefficient,
  resolveMaterialQuantity,
  recalcSection,
  recalcSummary,
  recalcRecordAmount,
} from "./calculations"
import type { ProjectEstimateContentSection } from "@/types/project-estimate-content"

describe("Estimate pure calculations", () => {
  describe("rounding functions", () => {
    it("roundMoney rounds to 2 decimal places", () => {
      expect(roundMoney(10.123)).toBe(10.12)
      expect(roundMoney(10.127)).toBe(10.13)
      expect(roundMoney(10.125)).toBe(10.13)
    })

    it("roundQuantity rounds up to the nearest integer", () => {
      expect(roundQuantity(10.001)).toBe(11)
      expect(roundQuantity(10.999)).toBe(11)
      expect(roundQuantity(10)).toBe(10)
    })

    it("roundConsumption rounds to 6 decimal places", () => {
      expect(roundConsumption(0.1234567)).toBe(0.123457)
      expect(roundConsumption(0.1234562)).toBe(0.123456)
    })
  })

  describe("amount calculations", () => {
    it("calculateMaterialAmount multiplies qty by price and rounds", () => {
      expect(calculateMaterialAmount(2.5, 10.15)).toBe(25.38) // 25.375 ceiled/rounded
    })

    it("calculateWorkAmount multiplies qty by price and rounds", () => {
      expect(calculateWorkAmount(1.33, 150.5)).toBe(200.17) // 200.165
    })

    it("calculateWorkFactAmount multiplies factQty by factPrice and rounds", () => {
      expect(calculateWorkFactAmount(3, 50.33)).toBe(150.99)
    })

    it("calculateWorkTotalWithMaterials sums work and materials amounts", () => {
      expect(calculateWorkTotalWithMaterials(100.5, 45.25)).toBe(145.75)
    })
  })

  describe("calculateWorkPriceWithCoefficient", () => {
    it("returns base price rounded to 2 decimals if coefficient is <= 0", () => {
      expect(calculateWorkPriceWithCoefficient(123.456, 0)).toBe(123.46)
      expect(calculateWorkPriceWithCoefficient(123.456, -5)).toBe(123.46)
    })

    it("rounds raw price with coefficient UP to nearest 10", () => {
      // 100 * (1 + 5/100) = 105. 105 rounded up to nearest 10 is 110.
      expect(calculateWorkPriceWithCoefficient(100, 5)).toBe(110)

      // 100 * (1 + 9.9/100) = 109.9. 109.9 rounded up to nearest 10 is 110.
      expect(calculateWorkPriceWithCoefficient(100, 9.9)).toBe(110)

      // 100 * (1 + 10.1/100) = 110.1. 110.1 rounded up to nearest 10 is 120.
      expect(calculateWorkPriceWithCoefficient(100, 10.1)).toBe(120)

      // 105 * (1 + 5/100) = 110.25. Rounded up is 120.
      expect(calculateWorkPriceWithCoefficient(105, 5)).toBe(120)
    })
  })

  describe("resolveMaterialQuantity", () => {
    it("recalculates quantity when consumption changes", () => {
      const result = resolveMaterialQuantity({
        workQuantity: 10,
        currentQuantity: 2,
        currentConsumption: 0.2,
        consumption: 0.4,
        changedField: "consumption",
      })
      expect(result.quantity).toBe(4) // 10 * 0.4 = 4
      expect(result.consumption).toBe(0.4)
    })

    it("recalculates consumption when quantity changes", () => {
      const result = resolveMaterialQuantity({
        workQuantity: 10,
        currentQuantity: 2,
        currentConsumption: 0.2,
        quantity: 5,
        changedField: "quantity",
      })
      expect(result.quantity).toBe(5)
      expect(result.consumption).toBe(0.5) // 5 / 10 = 0.5
    })
  })

  describe("section and summary recalcs", () => {
    const mockSection = (): ProjectEstimateContentSection => ({
      id: "sec-1",
      title: "Test Section",
      number: "1",
      sortOrder: 1,
      worksAmount: 0,
      materialsAmount: 0,
      totalAmount: 0,
      works: [
        {
          id: "work-1",
          sectionId: "sec-1",
          number: "1.1",
          code: null,
          title: "Work 1",
          unitCode: "pcs",
          unitLabel: "шт",
          quantity: 2,
          price: 50.25,
          totalAmount: 100.5,
          factQuantity: 0,
          factPrice: 0,
          factTotalAmount: 0,
          category: null,
          notes: null,
          sortOrder: 1,
          materialsAmount: 25.1,
          totalWithMaterialsAmount: 125.6,
          materials: [],
        },
      ],
    })

    it("recalcSection calculates works, materials and total amount", () => {
      const section = mockSection()
      const updated = recalcSection(section)
      expect(updated.worksAmount).toBe(100.5)
      expect(updated.materialsAmount).toBe(25.1)
      expect(updated.totalAmount).toBe(125.6)
    })

    it("recalcSummary sums multiple sections", () => {
      const sec1 = { ...mockSection(), worksAmount: 100, materialsAmount: 20, totalAmount: 120 }
      const sec2 = { ...mockSection(), worksAmount: 50, materialsAmount: 10, totalAmount: 60 }
      const summary = recalcSummary([sec1, sec2])
      expect(summary.worksAmount).toBe(150)
      expect(summary.materialsAmount).toBe(30)
      expect(summary.totalAmount).toBe(180)
    })

    it("recalcRecordAmount sums section total amounts", () => {
      const sec1 = { ...mockSection(), totalAmount: 120 }
      const sec2 = { ...mockSection(), totalAmount: 60 }
      const recordAmount = recalcRecordAmount([sec1, sec2])
      expect(recordAmount).toBe(180)
    })
  })
})
