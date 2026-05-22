import { describe, it, expect } from "vitest"
import { applyOptimisticChange } from "../estimate-details/lib/optimistic-update"
import type { ProjectEstimateContentData } from "../estimate-details/lib/optimistic-update"

describe("optimistic-update calculations", () => {
  const mockData = (): ProjectEstimateContentData => ({
    record: {
      id: "estimate-1",
      projectId: "project-1",
      name: "Смета 1",
      type: "estimate",
      status: "new",
      amount: 100,
    },
    sections: [
      {
        id: "section-1",
        title: "Раздел 1",
        number: "1",
        sortOrder: 0,
        worksAmount: 100,
        materialsAmount: 0,
        totalAmount: 100,
        works: [
          {
            id: "work-1",
            sectionId: "section-1",
            number: "1.1",
            code: null,
            title: "Работа 1",
            unitCode: "m2",
            unitLabel: "м²",
            quantity: 10,
            price: 10,
            totalAmount: 100,
            category: null,
            notes: null,
            sortOrder: 0,
            materialsAmount: 0,
            totalWithMaterialsAmount: 100,
            materials: [
              {
                id: "material-1",
                workId: "work-1",
                sectionId: "section-1",
                number: "1.1.1",
                code: null,
                title: "Материал 1",
                unitCode: "kg",
                unitLabel: "кг",
                quantity: 2,
                consumption: 0.2, // 10 * 0.2 = 2
                price: 5,
                totalAmount: 10,
                supplierName: null,
                notes: null,
                sortOrder: 0,
              },
            ],
          },
        ],
      },
    ],
    summary: {
      worksAmount: 100,
      materialsAmount: 0,
      totalAmount: 100,
    },
  })

  describe("update_work", () => {
    it("should recalculate material quantities using multiplication (Work * Consumption)", () => {
      const data = mockData()
      const result = applyOptimisticChange(data, {
        action: "update_work",
        payload: {
          workId: "work-1",
          quantity: 20, // Работа увеличилась в 2 раза
        },
      })

      expect(result).not.toBeNull()
      const updatedWork = result!.sections[0].works[0]
      expect(updatedWork.quantity).toBe(20)
      
      const updatedMaterial = updatedWork.materials[0]
      // По классической формуле: 20 (работа) * 0.2 (расход) = 4
      expect(updatedMaterial.quantity).toBe(4)
      expect(updatedMaterial.consumption).toBe(0.2)
      expect(updatedMaterial.totalAmount).toBe(20) // 4 * 5 руб
    })

    it("should round material quantity up to integer when work quantity results in a fraction", () => {
      const data = mockData()
      // Material consumption is 0.2. Setting work quantity to 3.
      // 3 * 0.2 = 0.6. Ceiled should be 1.
      const result = applyOptimisticChange(data, {
        action: "update_work",
        payload: {
          workId: "work-1",
          quantity: 3,
        },
      })

      expect(result).not.toBeNull()
      const updatedMaterial = result!.sections[0].works[0].materials[0]
      expect(updatedMaterial.quantity).toBe(1)
      expect(updatedMaterial.consumption).toBe(0.2)
    })
  })

  describe("update_material", () => {
    it("should recalculate consumption using division (Quantity / Work) when quantity changes", () => {
      const data = mockData()
      const result = applyOptimisticChange(data, {
        action: "update_material",
        payload: {
          materialId: "material-1",
          quantity: 5, // Изменили количество материала на 5
          changedField: "quantity",
        },
      })

      expect(result).not.toBeNull()
      const updatedMaterial = result!.sections[0].works[0].materials[0]
      expect(updatedMaterial.quantity).toBe(5)
      // По классической формуле: 5 (количество) / 10 (работа) = 0.5
      expect(updatedMaterial.consumption).toBe(0.5)
    })

    it("should recalculate quantity using multiplication (Work * Consumption) when consumption changes", () => {
      const data = mockData()
      const result = applyOptimisticChange(data, {
        action: "update_material",
        payload: {
          materialId: "material-1",
          consumption: 0.4, // Изменили расход на 0.4
          changedField: "consumption",
        },
      })

      expect(result).not.toBeNull()
      const updatedMaterial = result!.sections[0].works[0].materials[0]
      expect(updatedMaterial.consumption).toBe(0.4)
      // По классической формуле: 10 (работа) * 0.4 (расход) = 4
      expect(updatedMaterial.quantity).toBe(4)
    })
    
    it("should always round quantity upwards to integers and calculate consumption based on it", () => {
      const data = mockData()
      
      // 1. Quantity 0.208 should round up to 1
      const result1 = applyOptimisticChange(data, {
        action: "update_material",
        payload: {
          materialId: "material-1",
          quantity: 0.208,
          changedField: "quantity",
        },
      })
      expect(result1).not.toBeNull()
      const updatedMat1 = result1!.sections[0].works[0].materials[0]
      expect(updatedMat1.quantity).toBe(1)
      expect(updatedMat1.consumption).toBe(0.1) // 1 / 10 = 0.1

      // 2. Quantity 1.2 should round up to 2
      const result2 = applyOptimisticChange(data, {
        action: "update_material",
        payload: {
          materialId: "material-1",
          quantity: 1.2,
          changedField: "quantity",
        },
      })
      expect(result2).not.toBeNull()
      const updatedMat2 = result2!.sections[0].works[0].materials[0]
      expect(updatedMat2.quantity).toBe(2)
      expect(updatedMat2.consumption).toBe(0.2) // 2 / 10 = 0.2
    })
  })
})
