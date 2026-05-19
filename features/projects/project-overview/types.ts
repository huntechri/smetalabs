import { z } from "zod"

export const estimateRowSchema = z.object({
  id: z.number(),
  name: z.string(),
  type: z.string(),
  status: z.enum(["Новая", "В работе", "Завершено"]),
  amount: z.number(),
  createdAt: z.string(),
})

export type EstimateRow = z.infer<typeof estimateRowSchema>

export type EstimateDialogState = {
  open: boolean
  estimate: EstimateRow | null
  name: string
  error: string | null
}
