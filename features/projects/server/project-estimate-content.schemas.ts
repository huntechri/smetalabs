import { z } from "zod"

export const estimateContentProjectIdSchema = z.string().uuid("Некорректный идентификатор проекта")
export const estimateContentRecordIdSchema = z.string().uuid("Некорректный идентификатор сметы")

const trimmedTextSchema = (message: string, max = 300) =>
  z.string({ error: message }).trim().min(1, message).max(max, "Слишком длинное значение")

const nullableTrimmedTextSchema = z
  .string()
  .trim()
  .max(1000, "Слишком длинное значение")
  .optional()
  .nullable()
  .transform((value) => (value ? value : null))

const moneySchema = z.coerce
  .number({ error: "Некорректная цена" })
  .finite("Некорректная цена")
  .min(0, "Цена не может быть меньше 0")

const quantitySchema = z.coerce
  .number({ error: "Некорректное количество" })
  .finite("Некорректное количество")
  .min(0, "Количество не может быть меньше 0")

const positiveConsumptionSchema = z.coerce
  .number({ error: "Некорректный расход" })
  .finite("Некорректный расход")
  .positive("Расход должен быть больше 0")

const optionalPositiveConsumptionSchema = z
  .union([positiveConsumptionSchema, z.null(), z.undefined()])
  .transform((value) => value ?? null)

const sortItemSchema = z.object({
  id: z.string().uuid("Некорректный идентификатор строки"),
  sortOrder: z.coerce.number().int("Некорректный порядок").min(0, "Порядок не может быть меньше 0"),
})

const baseSectionSchema = z.object({
  title: trimmedTextSchema("Название раздела обязательно"),
})

const unitSchema = z.object({
  unitCode: trimmedTextSchema("Единица измерения обязательна", 60),
  unitLabel: trimmedTextSchema("Единица измерения обязательна", 60),
})

export const estimateContentOptionsParamsSchema = z.object({
  q: z.string().trim().max(200).optional().default(""),
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
  cursor: z.coerce.number().int().min(0).optional().default(0),
})

export const estimateContentChangeSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("create_section"),
    payload: baseSectionSchema.extend({
      sortOrder: z.coerce.number().int().min(0).optional(),
    }),
  }),
  z.object({
    action: z.literal("update_section"),
    payload: baseSectionSchema.partial().extend({
      sectionId: z.string().uuid("Раздел не найден"),
      sortOrder: z.coerce.number().int().min(0).optional(),
    }),
  }),
  z.object({
    action: z.literal("archive_section"),
    payload: z.object({ sectionId: z.string().uuid("Раздел не найден") }),
  }),
  z.object({
    action: z.literal("reorder_sections"),
    payload: z.object({ items: z.array(sortItemSchema).min(1, "Нет строк для изменения порядка") }),
  }),
  z.object({
    action: z.literal("add_work_from_directory"),
    payload: z.object({
      sectionId: z.string().uuid("Раздел не найден"),
      directoryWorkId: z.string().uuid("Работа справочника не найдена"),
      quantity: quantitySchema.default(0),
      price: moneySchema.optional(),
      sortOrder: z.coerce.number().int().min(0).optional(),
    }),
  }),
  z.object({
    action: z.literal("add_manual_work"),
    payload: unitSchema.extend({
      sectionId: z.string().uuid("Раздел не найден"),
      title: trimmedTextSchema("Название работы обязательно"),
      quantity: quantitySchema.default(0),
      price: moneySchema.default(0),
      category: trimmedTextSchema("Категория работы обязательна", 200).optional().nullable(),
      notes: nullableTrimmedTextSchema,
      sortOrder: z.coerce.number().int().min(0).optional(),
    }),
  }),
  z.object({
    action: z.literal("update_work"),
    payload: z.object({
      workId: z.string().uuid("Работа не найдена"),
      sectionId: z.string().uuid("Раздел не найден").optional(),
      title: trimmedTextSchema("Название работы обязательно").optional(),
      quantity: quantitySchema.optional(),
      price: moneySchema.optional(),
      notes: nullableTrimmedTextSchema,
      sortOrder: z.coerce.number().int().min(0).optional(),
    }),
  }),
  z.object({
    action: z.literal("archive_work"),
    payload: z.object({ workId: z.string().uuid("Работа не найдена") }),
  }),
  z.object({
    action: z.literal("reorder_works"),
    payload: z.object({
      sectionId: z.string().uuid("Раздел не найден"),
      items: z.array(sortItemSchema).min(1, "Нет строк для изменения порядка"),
    }),
  }),
  z.object({
    action: z.literal("move_work_to_section"),
    payload: z.object({
      workId: z.string().uuid("Работа не найдена"),
      sectionId: z.string().uuid("Раздел не найден"),
      sortOrder: z.coerce.number().int().min(0).optional(),
    }),
  }),
  z.object({
    action: z.literal("add_material_from_directory"),
    payload: z.object({
      workId: z.string().uuid("Работа не найдена"),
      directoryMaterialId: z.string().uuid("Материал справочника не найден"),
      quantity: quantitySchema.optional(),
      consumption: optionalPositiveConsumptionSchema.optional(),
      price: moneySchema.optional(),
      sortOrder: z.coerce.number().int().min(0).optional(),
      changedField: z.enum(["quantity", "consumption", "price"]).optional().default("quantity"),
    }),
  }),
  z.object({
    action: z.literal("add_manual_material"),
    payload: unitSchema.extend({
      workId: z.string().uuid("Работа не найдена"),
      title: trimmedTextSchema("Название материала обязательно"),
      quantity: quantitySchema.optional(),
      consumption: optionalPositiveConsumptionSchema.optional(),
      price: moneySchema.default(0),
      supplierName: nullableTrimmedTextSchema,
      notes: nullableTrimmedTextSchema,
      sortOrder: z.coerce.number().int().min(0).optional(),
      changedField: z.enum(["quantity", "consumption", "price"]).optional().default("quantity"),
    }),
  }),
  z.object({
    action: z.literal("update_material"),
    payload: z.object({
      materialId: z.string().uuid("Материал не найден"),
      workId: z.string().uuid("Работа не найдена").optional(),
      title: trimmedTextSchema("Название материала обязательно").optional(),
      quantity: quantitySchema.optional(),
      consumption: optionalPositiveConsumptionSchema.optional(),
      price: moneySchema.optional(),
      notes: nullableTrimmedTextSchema,
      sortOrder: z.coerce.number().int().min(0).optional(),
      changedField: z.enum(["quantity", "consumption", "price", "workQuantity"]).optional().default("quantity"),
    }),
  }),
  z.object({
    action: z.literal("archive_material"),
    payload: z.object({ materialId: z.string().uuid("Материал не найден") }),
  }),
  z.object({
    action: z.literal("reorder_materials"),
    payload: z.object({
      workId: z.string().uuid("Работа не найдена"),
      items: z.array(sortItemSchema).min(1, "Нет строк для изменения порядка"),
    }),
  }),
  z.object({
    action: z.literal("move_material_to_work"),
    payload: z.object({
      materialId: z.string().uuid("Материал не найден"),
      workId: z.string().uuid("Работа не найдена"),
      sortOrder: z.coerce.number().int().min(0).optional(),
    }),
  }),
])

export type EstimateContentChangeInput = z.infer<typeof estimateContentChangeSchema>
export type EstimateContentOptionsParams = z.infer<typeof estimateContentOptionsParamsSchema>

export function parseEstimateContentProjectId(value: string) {
  return estimateContentProjectIdSchema.parse(value)
}

export function parseEstimateContentRecordId(value: string) {
  return estimateContentRecordIdSchema.parse(value)
}

export function parseEstimateContentOptionsParams(params: URLSearchParams) {
  return estimateContentOptionsParamsSchema.parse({
    q: params.get("q") ?? undefined,
    limit: params.get("limit") ?? undefined,
    cursor: params.get("cursor") ?? undefined,
  })
}

export function parseEstimateContentChangeBody(body: unknown) {
  return estimateContentChangeSchema.parse(body)
}
