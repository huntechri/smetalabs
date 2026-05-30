import { describe, expect, it } from "vitest"
import {
  normalizeHeader,
  detectDelimiter,
  normalizeCellValue,
  toRecord,
} from "./csv-import"

describe("csv-import helpers", () => {
  describe("normalizeHeader", () => {
    it("normalizes headers with aliases", () => {
      const aliases = {
        "название": "name",
        "цена_за_единицу": "price",
      }
      expect(normalizeHeader("Название ", aliases)).toBe("name")
      expect(normalizeHeader("цена-за-единицу", aliases)).toBe("price")
    })

    it("normalizes headers without aliases", () => {
      const aliases = {}
      expect(normalizeHeader("Название работы", aliases)).toBe("название_работы")
      expect(normalizeHeader(" Единица  измерения ", aliases)).toBe("единица_измерения")
    })
  })

  describe("detectDelimiter", () => {
    it("detects tab delimiter", () => {
      expect(detectDelimiter("name\tprice\tunit\nitem1\t100\tmeters")).toBe("\t")
    })

    it("detects semicolon delimiter", () => {
      expect(detectDelimiter("name;price;unit\nitem1;100;meters")).toBe(";")
    })

    it("detects comma delimiter by default", () => {
      expect(detectDelimiter("name,price,unit\nitem1,100,meters")).toBe(",")
      expect(detectDelimiter("no delimiters in single line")).toBe("\t")
    })
  })

  describe("normalizeCellValue", () => {
    it("normalizes currency code to RUB", () => {
      expect(normalizeCellValue("currencyCode", "руб.")).toBe("RUB")
      expect(normalizeCellValue("currency_code", " ₽ ")).toBe("RUB")
      expect(normalizeCellValue("currencyCode", "rur")).toBe("RUB")
      expect(normalizeCellValue("currencyCode", "rub")).toBe("RUB")
    })

    it("keeps other values intact", () => {
      expect(normalizeCellValue("currencyCode", "USD")).toBe("USD")
      expect(normalizeCellValue("name", "руб.")).toBe("руб.")
    })
  })

  describe("toRecord", () => {
    it("correctly zips headers and values into a record", () => {
      const headers = ["name", "price", "unit"]
      const row = ["Кирпич", "25", "шт"]
      expect(toRecord(headers, row)).toEqual({
        name: "Кирпич",
        price: "25",
        unit: "шт",
      })
    })

    it("ignores empty header or empty value", () => {
      const headers = ["name", "", "unit"]
      const row = ["Кирпич", "25", ""]
      expect(toRecord(headers, row)).toEqual({
        name: "Кирпич",
      })
    })
  })
})
