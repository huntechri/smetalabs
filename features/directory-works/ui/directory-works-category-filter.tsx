"use client"

import { useMemo } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useDirectoryWorkCategories } from "../application/use-directory-work-categories"

const ALL_CATEGORIES_VALUE = "__all_categories__"
const ALL_SUBCATEGORIES_VALUE = "__all_subcategories__"

function setOptionalParam(
  params: URLSearchParams,
  key: string,
  value: string | null
) {
  if (value) {
    params.set(key, value)
  } else {
    params.delete(key)
  }
  params.delete("cursor")
}

export function DirectoryWorksCategoryFilter({ open }: { open: boolean }) {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { categories, loading, error } = useDirectoryWorkCategories()
  const selectedCategory = searchParams.get("category") ?? ""
  const selectedSubcategory = searchParams.get("subcategory") ?? ""

  const selectedCategoryOption = useMemo(
    () => categories.find((item) => item.category === selectedCategory) ?? null,
    [categories, selectedCategory]
  )
  const subcategories = selectedCategoryOption?.subcategories ?? []
  const hasActiveFilter = Boolean(selectedCategory || selectedSubcategory)

  const pushParams = (params: URLSearchParams) => {
    const query = params.toString()
    router.replace(query ? `${pathname}?${query}` : pathname)
  }

  const handleCategoryChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    const nextCategory = value === ALL_CATEGORIES_VALUE ? null : value
    setOptionalParam(params, "category", nextCategory)
    params.delete("subcategory")
    pushParams(params)
  }

  const handleSubcategoryChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    const nextSubcategory = value === ALL_SUBCATEGORIES_VALUE ? null : value
    setOptionalParam(params, "subcategory", nextSubcategory)
    pushParams(params)
  }

  const handleReset = () => {
    const params = new URLSearchParams(searchParams.toString())
    params.delete("category")
    params.delete("subcategory")
    params.delete("cursor")
    pushParams(params)
  }

  if (!open) return null

  return (
    <div className="rounded-lg border border-border bg-card/60 p-2 shadow-sm">
      <div className="flex flex-col gap-2 @3xl/main:flex-row @3xl/main:items-center">
        <div className="min-w-0 flex-1">
          <p className="text-xs/relaxed font-medium text-foreground">
            Фильтр по разделам
          </p>
          <p className="text-xs/relaxed text-muted-foreground">
            Показывает работы только из выбранного раздела или подраздела.
          </p>
        </div>

        <div className="grid gap-2 sm:grid-cols-[minmax(180px,240px)_minmax(180px,240px)_auto]">
          <Select
            disabled={loading || categories.length === 0}
            onValueChange={handleCategoryChange}
            value={selectedCategory || ALL_CATEGORIES_VALUE}
          >
            <SelectTrigger className="w-full justify-between" size="default">
              <SelectValue placeholder="Все разделы" />
            </SelectTrigger>
            <SelectContent align="end">
              <SelectItem value={ALL_CATEGORIES_VALUE}>Все разделы</SelectItem>
              {categories.map((item) => (
                <SelectItem key={item.category} value={item.category}>
                  {item.category} · {item.total}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            disabled={!selectedCategory || subcategories.length === 0}
            onValueChange={handleSubcategoryChange}
            value={selectedSubcategory || ALL_SUBCATEGORIES_VALUE}
          >
            <SelectTrigger className="w-full justify-between" size="default">
              <SelectValue placeholder="Все подразделы" />
            </SelectTrigger>
            <SelectContent align="end">
              <SelectItem value={ALL_SUBCATEGORIES_VALUE}>
                Все подразделы
              </SelectItem>
              {subcategories.map((item) => (
                <SelectItem key={item.name} value={item.name}>
                  {item.name} · {item.total}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            disabled={!hasActiveFilter}
            onClick={handleReset}
            type="button"
            variant="outline"
          >
            Сбросить
          </Button>
        </div>
      </div>

      {error ? (
        <p className="mt-2 text-xs/relaxed text-destructive">
          Не удалось загрузить разделы: {error}
        </p>
      ) : null}
    </div>
  )
}
