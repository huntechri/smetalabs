export type ProjectStatus = "new" | "in_progress" | "completed"

export type ProjectRow = {
  id: string
  title: string
  status: ProjectStatus
  progress: number // 0–100
  customer: string // Заказчик
  address?: string // Адрес объекта
  budget: number // Бюджет в рублях
  startDate?: string // Дата начала
  endDate?: string // Дата окончания
}
