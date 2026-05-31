import { describe, expect, it } from "vitest"
import {
  DEFAULT_DIRECTORY_SUPPLIER_COLOR,
  buildDirectorySupplierMutationInput,
  formatSupplierColorInput,
  getDirectorySupplierInitialFormState,
  getDirectorySuppliersListParams,
  getSupplierLegalStatusLabel,
  isValidSupplierColorHex,
} from "./directory-suppliers-model"

describe("directory-suppliers model", () => {
  it("maps legal status labels", () => {
    expect(getSupplierLegalStatusLabel("juridical")).toBe("Юр. лицо")
    expect(getSupplierLegalStatusLabel("individual")).toBe("Физ. лицо")
  })

  it("validates supplier color hex", () => {
    expect(isValidSupplierColorHex("#64748B")).toBe(true)
    expect(isValidSupplierColorHex("64748B")).toBe(false)
    expect(isValidSupplierColorHex("#BADHEX")).toBe(false)
  })

  it("normalizes color text input", () => {
    expect(formatSupplierColorInput("64748b")).toBe("#64748B")
    expect(formatSupplierColorInput("#3b82f6")).toBe("#3B82F6")
  })

  it("builds empty initial form state", () => {
    expect(getDirectorySupplierInitialFormState()).toEqual({
      name: "",
      color: DEFAULT_DIRECTORY_SUPPLIER_COLOR,
      legalStatus: "juridical",
      inn: "",
      phone: "",
      email: "",
      address: "",
      notes: "",
    })
  })

  it("builds mutation input from form state without changing values", () => {
    expect(
      buildDirectorySupplierMutationInput({
        name: "Поставщик",
        legalStatus: "individual",
        color: "#3B82F6",
        inn: "123",
        phone: "+7",
        email: "mail@example.com",
        address: "Адрес",
        notes: "Комментарий",
      })
    ).toEqual({
      name: "Поставщик",
      legalStatus: "individual",
      color: "#3B82F6",
      inn: "123",
      phone: "+7",
      email: "mail@example.com",
      address: "Адрес",
      notes: "Комментарий",
    })
  })

  it("parses list params from URL search params", () => {
    const params = new URLSearchParams({
      q: "  beton  ",
      status: "archived",
      limit: "25",
      cursor: "50",
      sort: "name_asc",
    })

    expect(getDirectorySuppliersListParams(params)).toEqual({
      q: "beton",
      status: "archived",
      limit: 25,
      cursor: 50,
      sort: "name_asc",
    })
  })

  it("falls back to safe list params defaults", () => {
    const params = new URLSearchParams({
      status: "unknown",
      limit: "-1",
      cursor: "abc",
      sort: "wrong",
    })

    expect(getDirectorySuppliersListParams(params)).toEqual({
      q: undefined,
      status: "active",
      limit: 50,
      cursor: 0,
      sort: "relevance",
    })
  })
})
