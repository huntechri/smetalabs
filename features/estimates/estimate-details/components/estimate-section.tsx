"use client"

import { type ComponentProps, useMemo, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { EditableBadge } from "@/components/ui/editable-badge"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import {
  CaretRightIcon,
  CopyIcon,
  DotsThreeVerticalIcon,
  GearSixIcon,
  PencilSimpleIcon,
  PlusIcon,
  TrashIcon,
} from "@phosphor-icons/react"

type Material = {
  id: string
  title: string
  unit: string
  quantity: number
  waste: number
  price: number
}

type Work = {
  id: string
  number: string
  title: string
  unit: string
  quantity: number
  price: number
  materials: Material[]
}

const works: Work[] = [
  {
    id: "work-1",
    number: "1",
    title: "Монтаж перегородки из ГКЛ в 2 слоя",
    unit: "м2",
    quantity: 42,
    price: 980,
    materials: [
      {
        id: "mat-1",
        title: "Гипсокартон влагостойкий 12,5 мм",
        unit: "лист",
        quantity: 58,
        waste: 7,
        price: 620,
      },
      {
        id: "mat-2",
        title: "Профиль стоечный 50x50",
        unit: "шт",
        quantity: 74,
        waste: 5,
        price: 245,
      },
      {
        id: "mat-3",
        title: "Саморезы по металлу 25 мм",
        unit: "упак.",
        quantity: 6,
        waste: 0,
        price: 390,
      },
    ],
  },
  {
    id: "work-2",
    number: "2",
    title: "Шпаклевка стен под окраску",
    unit: "м2",
    quantity: 86,
    price: 430,
    materials: [
      {
        id: "mat-4",
        title: "Шпаклевка финишная",
        unit: "меш.",
        quantity: 15,
        waste: 10,
        price: 780,
      },
      {
        id: "mat-5",
        title: "Грунтовка глубокого проникновения",
        unit: "кан.",
        quantity: 4,
        waste: 0,
        price: 1150,
      },
    ],
  },
]

const stages = ["Stage 1: Rough work"]

const currency = new Intl.NumberFormat("ru-RU", {
  maximumFractionDigits: 0,
  style: "currency",
  currency: "RUB",
})

function formatMoney(value: number) {
  return currency.format(value).replace("RUB", "₽")
}

function getWorkTotal(work: Work) {
  return work.quantity * work.price
}

function getMaterialTotal(material: Material) {
  return material.quantity * material.price
}

function formatConsumption(value: number) {
  if (value > 0 && value < 0.001) {
    return "0,001"
  }

  return new Intl.NumberFormat("ru-RU", {
    maximumFractionDigits: 3,
    minimumFractionDigits: 0,
  }).format(value)
}

function parseDecimalInput(value: string) {
  return Number(value.replace(",", "."))
}

export function EstimateSection() {
  const [workRows, setWorkRows] = useState(works)
  const [expandedStages, setExpandedStages] = useState(true)
  const [expandedWorks, setExpandedWorks] = useState<Set<string>>(
    new Set([works[0].id])
  )

  const totals = useMemo(() => {
    const workTotal = workRows.reduce(
      (sum, work) => sum + getWorkTotal(work),
      0
    )
    const materialTotal = workRows.reduce(
      (sum, work) =>
        sum +
        work.materials.reduce(
          (materialsSum, material) => materialsSum + getMaterialTotal(material),
          0
        ),
      0
    )

    return {
      materialTotal,
      workTotal,
    }
  }, [workRows])

  const toggleWork = (id: string) => {
    setExpandedWorks((current) => {
      const next = new Set(current)

      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }

      return next
    })
  }

  const updateWork = (id: string, updates: Partial<Work>) => {
    setWorkRows((current) =>
      current.map((work) => (work.id === id ? { ...work, ...updates } : work))
    )
  }

  const updateMaterial = (
    workId: string,
    materialId: string,
    updates: Partial<Material>
  ) => {
    setWorkRows((current) =>
      current.map((work) =>
        work.id === workId
          ? {
              ...work,
              materials: work.materials.map((material) =>
                material.id === materialId
                  ? { ...material, ...updates }
                  : material
              ),
            }
          : work
      )
    )
  }

  return (
    <section className="flex flex-col overflow-hidden rounded-lg border border-dashed border-gray-400 bg-card text-card-foreground shadow-sm">
      <Collapsible open={expandedStages} onOpenChange={setExpandedStages}>
        <CollapsibleTrigger asChild>
          <button
            className="flex w-full flex-col gap-3 border-b border-dashed border-orange-500 px-4 py-3 text-left transition-colors hover:bg-muted/50 sm:flex-row sm:items-center sm:justify-between"
            type="button"
          >
            <div className="flex min-w-0 items-start gap-3 rounded-md border border-dashed border-orange-300 p-2">
              <Frame className="border-orange-300">
                <CaretRightIcon
                  weight="bold"
                  className={cn(
                    "shrink-0 transition-transform",
                    expandedStages && "rotate-90"
                  )}
                />
              </Frame>
              <div className="flex min-w-0 flex-col gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  {stages.map((stage) => (
                    <Frame key={stage} className="border-orange-300">
                      <Badge>{stage}</Badge>
                    </Frame>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 rounded-md border border-dashed border-orange-300 p-2 sm:min-w-56">
              <SummaryValue label="Works" value={totals.workTotal} />
              <SummaryValue label="Materials" value={totals.materialTotal} />
            </div>
          </button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <Separator className="bg-orange-500/50" />
          <div className="flex flex-col">
            {workRows.map((work) => {
              const isExpanded = expandedWorks.has(work.id)
              const workTotal = getWorkTotal(work)

              return (
                <Collapsible
                  key={work.id}
                  open={isExpanded}
                  onOpenChange={() => toggleWork(work.id)}
                >
                  <div className="border-b border-dashed border-green-500 last:border-b-0">
                    <div className="m-3 flex flex-col gap-3 rounded-md border border-dashed border-green-500 p-3 transition-colors hover:bg-muted/50 lg:flex-row lg:items-center lg:justify-between">
                      <div className="flex min-w-0 flex-1 flex-wrap items-start gap-3">
                        <div className="flex w-full items-center gap-3 lg:w-auto">
                          <CollapsibleTrigger asChild>
                            <button
                              aria-label={
                                isExpanded
                                  ? "Collapse work"
                                  : "Expand work"
                              }
                              type="button"
                            >
                              <Frame className="border-green-300">
                                <CaretRightIcon
                                  weight="bold"
                                  className={cn(
                                    "shrink-0 transition-transform",
                                    isExpanded && "rotate-90"
                                  )}
                                />
                              </Frame>
                            </button>
                          </CollapsibleTrigger>
                          <WorkNumber value={work.number} />
                          <div className="ml-auto rounded-md border border-dashed border-green-300 p-1 lg:hidden">
                            <ActionButtons />
                          </div>
                        </div>
                        <WorkNameField
                          onChange={(value) =>
                            updateWork(work.id, { title: value })
                          }
                          value={work.title}
                        />
                      </div>

                      <div className="flex w-full flex-col gap-3 rounded-md border border-dashed border-green-400 p-2 lg:w-auto lg:flex-row lg:items-center lg:justify-end">
                        <div className="grid w-full grid-cols-2 gap-2 sm:grid-cols-3 lg:w-auto lg:min-w-80">
                          <EditableBadge
                            label="Qty"
                            onChange={(value) =>
                              updateWork(work.id, { quantity: Number(value) })
                            }
                            suffix={work.unit}
                            value={work.quantity}
                          />
                          <EditableBadge
                            label="Price"
                            onChange={(value) =>
                              updateWork(work.id, { price: Number(value) })
                            }
                            value={work.price}
                          />
                          <Badge variant="outline" className="gap-1 rounded-md px-1.5 py-0.5 font-semibold tabular-nums"><span className="text-muted-foreground">Total:</span><span>{formatMoney(workTotal)}</span></Badge>
                        </div>
                        <div className="hidden rounded-md border border-dashed border-green-300 p-1 lg:block">
                          <ActionButtons />
                        </div>
                      </div>
                    </div>

                    <CollapsibleContent>
                      <div className="border-t border-dashed border-purple-500 bg-muted/20 px-4 py-4">
                        <div className="rounded-md border border-dashed border-purple-400 p-3">
                          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
                            {work.materials.map((material, index) => (
                              <Card
                                key={material.id}
                                size="sm"
                                className="min-h-36 gap-3 border border-dashed border-blue-500 bg-background shadow-none"
                              >
                                <CardHeader>
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="min-w-0">
                                      <div className="flex flex-wrap items-center gap-2">
                                        <Frame className="border-blue-300">
                                          <Badge variant="outline">
                                            {work.number}.{index + 1}
                                          </Badge>
                                        </Frame>
                                        <Frame className="border-blue-300">
                                          <Badge variant="secondary">
                                            {material.unit}
                                          </Badge>
                                        </Frame>
                                      </div>
                                    </div>
                                    <MaterialActions title={material.title} />
                                  </div>
                                  <MaterialNameField
                                    onChange={(value) =>
                                      updateMaterial(work.id, material.id, {
                                        title: value,
                                      })
                                    }
                                    value={material.title}
                                  />
                                </CardHeader>

                                <CardContent>
                                  <dl className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
                                    <EditableBadge
                                      label="Qty"
                                      onChange={(value) =>
                                        updateMaterial(work.id, material.id, {
                                          quantity: Number(value),
                                        })
                                      }
                                      value={material.quantity}
                                    />
                                    <EditableBadge
                                      label="Consumption"
                                      onChange={(value) =>
                                        updateMaterial(work.id, material.id, {
                                          waste: parseDecimalInput(value),
                                        })
                                      }
                                      formatDisplay={(v) => formatConsumption(Number(v))}
                                      value={material.waste}
                                    />
                                    <EditableBadge
                                      label="Price"
                                      onChange={(value) =>
                                        updateMaterial(work.id, material.id, {
                                          price: Number(value),
                                        })
                                      }
                                      value={material.price}
                                    />
                                    <Badge variant="outline" className="gap-1 rounded-md px-1.5 py-0.5 font-semibold tabular-nums"><span className="text-muted-foreground">Total:</span><span>{formatMoney(getMaterialTotal(material))}</span></Badge>
                                  </dl>
                                </CardContent>
                              </Card>
                            ))}
                          </div>

                          <div className="mt-3 flex justify-end border-t border-dashed border-purple-300 pt-3">
                            <FramedButton
                              frameClassName="border-purple-300"
                              variant="outline"
                            >
                              <PlusIcon data-icon="inline-start" />
                              Material
                            </FramedButton>
                          </div>
                        </div>
                      </div>
                    </CollapsibleContent>
                  </div>
                </Collapsible>
              )
            })}
          </div>
        </CollapsibleContent>
      </Collapsible>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-dashed border-yellow-500 bg-muted/20 px-4 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <FramedButton frameClassName="border-yellow-300" variant="outline">
            <PlusIcon data-icon="inline-start" />
            Section
          </FramedButton>
          <FramedButton frameClassName="border-yellow-300" variant="outline">
            <PlusIcon data-icon="inline-start" />
            Work
          </FramedButton>
        </div>
        <FramedButton frameClassName="border-yellow-300" variant="destructive">
          <TrashIcon data-icon="inline-start" />
          Delete section
        </FramedButton>
      </div>
    </section>
  )
}

function SummaryValue({
  label,
  strong = false,
  value,
}: {
  label: string
  strong?: boolean
  value: number | string
}) {
  return (
    <div className="min-w-0 rounded-md border border-dashed p-2">
      <div className="text-xs text-muted-foreground uppercase">{label}</div>
      <div className={cn("truncate text-xs", strong && "font-semibold")}>
        {typeof value === "number" ? formatMoney(value) : value}
      </div>
    </div>
  )
}

function WorkInputField({
  className,
  inputMode,
  label,
  onChange,
  readOnly = false,
  strong = false,
  suffix,
  type = "text",
  value,
}: {
  className?: string
  inputMode?: ComponentProps<typeof Input>["inputMode"]
  label: string
  onChange?: (value: string) => void
  readOnly?: boolean
  strong?: boolean
  suffix?: string
  type?: ComponentProps<typeof Input>["type"]
  value: number | string
}) {
  return (
    <label
      className={cn("min-w-0 rounded-md border border-dashed p-2", className)}
    >
      <span className="mb-1 block text-xs text-muted-foreground uppercase">
        {label}
      </span>
      <div className="flex min-w-0 items-center gap-1">
        <Input
          className={cn(strong && "font-semibold")}
          inputMode={inputMode}
          onChange={(event) => onChange?.(event.target.value)}
          readOnly={readOnly}
          type={type}
          value={value}
        />
        {suffix ? (
          <span className="shrink-0 text-xs text-muted-foreground">
            {suffix}
          </span>
        ) : null}
      </div>
    </label>
  )
}

function WorkNameField({
  onChange,
  value,
}: {
  onChange: (value: string) => void
  value: string
}) {
  return (
    <label className="min-w-48 flex-1 rounded-md border border-dashed border-green-300 p-2">
      <span className="mb-1 block text-xs text-muted-foreground uppercase">
        Name
      </span>
      <Textarea
        className="min-h-16"
        onChange={(event) => onChange(event.target.value)}
        value={value}
      />
    </label>
  )
}

function MaterialInputField({
  inputMode = "decimal",
  label,
  onChange,
  readOnly = false,
  strong = false,
  suffix,
  value,
}: {
  inputMode?: ComponentProps<typeof Input>["inputMode"]
  label: string
  onChange?: (value: string) => void
  readOnly?: boolean
  strong?: boolean
  suffix?: string
  value: number | string
}) {
  return (
    <label className="min-w-0 rounded-md border border-dashed border-blue-300 p-2">
      <span className="mb-1 block text-xs text-muted-foreground uppercase">
        {label}
      </span>
      <div className="flex min-w-0 items-center gap-1">
        <Input
          className={cn(strong && "font-semibold")}
          inputMode={inputMode}
          onChange={(event) => onChange?.(event.target.value)}
          readOnly={readOnly}
          value={value}
        />
        {suffix ? (
          <span className="shrink-0 text-xs text-muted-foreground">
            {suffix}
          </span>
        ) : null}
      </div>
    </label>
  )
}

function MaterialNameField({
  onChange,
  value,
}: {
  onChange: (value: string) => void
  value: string
}) {
  return (
    <label className="block min-w-0 rounded-md border border-dashed border-blue-300 p-2">
      <span className="mb-1 block text-xs text-muted-foreground uppercase">
        Name
      </span>
      <Textarea
        className="min-h-16"
        onChange={(event) => onChange(event.target.value)}
        value={value}
      />
    </label>
  )
}

function MaterialActions({ title }: { title: string }) {
  return (
    <Frame className="border-blue-300">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            aria-label={`Material actions for ${title}`}
            size="icon-sm"
            type="button"
            variant="ghost"
          >
            <DotsThreeVerticalIcon />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuGroup>
            <DropdownMenuItem>Edit</DropdownMenuItem>
            <DropdownMenuItem>Duplicate</DropdownMenuItem>
            <DropdownMenuItem variant="destructive">Delete</DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </Frame>
  )
}

function WorkNumber({ value }: { value: string }) {
  return (
    <div className="flex w-12 shrink-0 items-center justify-center gap-1 rounded-md border border-dashed border-green-300 px-2 py-1">
      <span className="text-xs text-muted-foreground">№</span>
      <span className="text-xs font-semibold">{value}</span>
    </div>
  )
}

function ActionButtons() {
  return (
    <div className="flex items-center gap-1">
      <FramedButton
        aria-label="Edit work"
        frameClassName="border-green-300"
        size="icon-sm"
        variant="ghost"
      >
        <PencilSimpleIcon />
      </FramedButton>
      <FramedButton
        aria-label="Duplicate work"
        frameClassName="border-green-300"
        size="icon-sm"
        variant="ghost"
      >
        <CopyIcon />
      </FramedButton>
      <FramedButton
        aria-label="Work settings"
        frameClassName="border-green-300"
        size="icon-sm"
        variant="ghost"
      >
        <GearSixIcon />
      </FramedButton>
    </div>
  )
}

function Frame({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "inline-flex rounded-md border border-dashed p-1",
        className
      )}
      {...props}
    />
  )
}

function FramedButton({
  frameClassName,
  ...props
}: ComponentProps<typeof Button> & {
  frameClassName?: string
}) {
  return (
    <Frame className={frameClassName}>
      <Button {...props} />
    </Frame>
  )
}
