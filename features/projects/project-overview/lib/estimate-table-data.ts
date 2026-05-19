import type { EstimateRow } from "@/features/projects/project-overview/types"

export const ESTIMATES_DATA: EstimateRow[] = [
  {
    id: 1,
    name: "Смета на отделочные работы",
    type: "Основная",
    status: "Новая",
    amount: 1250000,
    createdAt: "2026-05-19",
  },
  {
    id: 2,
    name: "Смета на инженерные сети",
    type: "Дополнительная",
    status: "В работе",
    amount: 875000,
    createdAt: "2026-05-18",
  },
  {
    id: 3,
    name: "Смета на черновые материалы",
    type: "Основная",
    status: "Завершено",
    amount: 640000,
    createdAt: "2026-05-17",
  },
]

export function formatEstimateAmount(value: number) {
  return value.toLocaleString("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 0,
  })
}

export function formatEstimateDate(value: string) {
  return new Date(value).toLocaleDateString("ru-RU")
}

export function createLocalEstimate(name: string, currentRows: EstimateRow[]): EstimateRow {
  return {
    id: Math.max(0, ...currentRows.map((estimate) => estimate.id)) + 1,
    name,
    type: "Основная",
    status: "Новая",
    amount: 0,
    createdAt: new Date().toISOString().slice(0, 10),
  }
}
