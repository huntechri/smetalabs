import { describe, it, expect } from "vitest"
import {
  formatDateRange,
  prepareChartData,
  calculateChartBounds,
  formatYAxisTick,
} from "./dashboard-model"

describe("dashboard-model calculations", () => {
  describe("formatDateRange", () => {
    it("should format valid start and end dates", () => {
      expect(formatDateRange("2026-05-01", "2026-05-15")).toBe("01.05.2026 – 15.05.2026")
    })

    it("should return start date if end date is missing", () => {
      expect(formatDateRange("2026-05-01", null)).toBe("2026-05-01")
    })

    it("should return correct message if both dates are missing", () => {
      expect(formatDateRange(null, null)).toBe("Сроки не указаны")
    })
  })

  describe("prepareChartData", () => {
    it("should make outflows negative", () => {
      const input = [
        { date: "2026-05-01", inflow: 100, outflow: 50, balance: 50 },
        { date: "2026-05-02", inflow: 0, outflow: 20, balance: 30 },
      ]
      const expected = [
        { date: "2026-05-01", inflow: 100, outflow: -50, balance: 50 },
        { date: "2026-05-02", inflow: 0, outflow: -20, balance: 30 },
      ]
      expect(prepareChartData(input)).toEqual(expected)
    })
  })

  describe("calculateChartBounds", () => {
    it("should calculate correct domain limits and offset", () => {
      const processed = [
        { balance: 100, inflow: 50, outflow: -20 },
        { balance: -50, inflow: 0, outflow: -150 },
      ]
      const bounds = calculateChartBounds(processed)
      expect(bounds.maxVal).toBeGreaterThanOrEqual(100)
      expect(bounds.minVal).toBeLessThanOrEqual(-150)
      expect(bounds.off).toBeCloseTo(100 / 150, 2)
    })

    it("should return defaults for empty data", () => {
      expect(calculateChartBounds([])).toEqual({ minVal: 0, maxVal: 0, off: 0.5 })
    })
  })

  describe("formatYAxisTick", () => {
    it("should format ticks correctly", () => {
      expect(formatYAxisTick(0)).toBe("0")
      expect(formatYAxisTick(500)).toBe("500")
      expect(formatYAxisTick(1500)).toBe("2 тыс")
      expect(formatYAxisTick(1500000)).toBe("1.5 млн")
    })
  })
})
