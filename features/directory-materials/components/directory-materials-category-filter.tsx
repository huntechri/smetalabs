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
import { useDirectoryMaterialCategories } from "../hooks/use-directory-material-categories"

const ALL_CATEGORIES_VALUE = "__all_categories__"
const ALL_SUBCATEGORIES_VALUE = "__all_subcategories__"
const ALL_SUPPLIERS_VALUE = "__all_suppliers__"

function setOptionalParam(params: URLSearchParams, key: string, value: string | null) {
  if (value) {
    params.set(key, value)
  } else {
    params.delete(key)
  }
  params.delete("cursor")
}

export function DirectoryMaterialsCategoryFilter({ open }: { open: boolean }) {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { categories, suppliers, loading, error } = useDirectoryMaterialCategories()
  const selectedCategory = searchParams.get("category") ?? ""
  const selectedSubcategory = searchParams.get("subcategory") ?? ""
  const selectedSupplier = searchParams.get("supplier") ?? ""

  const selectedCategoryOption = useMemo(
    () => categories.find((item) => item.category === selectedCategory) ?? null,
    [categories, selectedCategory]
  )
  const subcategories = selectedCategoryOption?.subcategories ?? []
  const hasActiveFilter = Boolean(selectedCategory || selectedSubcategory || selectedSupplier)

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

  const handleSupplierChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    const nextSupplier = value === ALL_SUPPLIERS_VALUE ? null : value
    setOptionalParam(params, "supplier", nextSupplier)
    pushParams(params)
  }

  const handleReset = () => {
    const params = new URLSearchParams(searchParams.toString())
    params.delete("category")
    params.delete("subcategory")
    params.delete("supplier")
    params.delete("cursor")
    pushParams(params)
  }

  if (!open) return null

  return (
    <div className="rounded-lg border border-border bg-card/60 p-2 shadow-sm">
      <div className="flex flex-col gap-2 @3xl/main:flex-row @3xl/main:items-center">
        <div className="min-w-0 flex-1">
          <p className="text-xs/relaxed font-medium text-foreground">Фильтр по материалам</p>
          <p className="text-xs/relaxed text-muted-foreground">
            Показывает материалы по выбранной категории или поставщику.
          </p>
        </div>

        <div className="grid gap-2 sm:grid-cols-[minmax(160px,220px)_minmax(160px,220px)_minmax(160px,220px)_auto]">
          <Select
            disabled={loading || categories.length === 0}
            onValueChange={handleCategoryChange}
            value={selectedCategory || ALL_CATEGORIES_VALUE}
          >
            <SelectTrigger className="w-full justify-between" size="default">
              <SelectValue placeholder="Все категории" />
            </SelectTrigger>
            <SelectContent align="end">
              <SelectItem value={ALL_CATEGORIES_VALUE}>Все категории</SelectItem>
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
              <SelectValue placeholder="Все подкатегории" />
            </SelectTrigger>
            <SelectContent align="end">
              <SelectItem value={ALL_SUBCATEGORIES_VALUE}>Все подкатегории</SelectItem>
              {subcategories.map((item) => (
                <SelectItem key={item.name} value={item.name}>
                  {item.name} · {item.total}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            disabled={loading || suppliers.length === 0}
            onValueChange={handleSupplierChange}
            value={selectedSupplier || ALL_SUPPLIERS_VALUE}
          >
            <SelectTrigger className="w-full justify-between" size="default">
              <SelectValue placeholder="Все поставщики" />
            </SelectTrigger>
            <SelectContent align="end">
              <SelectItem value={ALL_SUPPLIERS_VALUE}>Все поставщики</SelectItem>
              {suppliers.map((item) => (
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
        <p className="mt-2 text-xs/relaxed text-destructive">Не удалось загрузить фильтры: {error}</p>
      ) : null}
    </div>
  )
}
