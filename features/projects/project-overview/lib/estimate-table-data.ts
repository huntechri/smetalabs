import type { ProjectEstimateRecordStatus } from "@/types/project-estimate-record"

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

export function formatEstimateStatus(status: ProjectEstimateRecordStatus) {
  switch (status) {
    case "new":
      return "Новая"
    case "in_progress":
      return "В работе"
    case "completed":
      return "Завершена"
  }
}
