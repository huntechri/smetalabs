"use client"

import { useMemo } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { FieldError } from "@/components/ui/field"
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
const FILTER_CONTENT_CLASS = "max-h-72 max-w-[calc(100vw-2rem)]"
const FILTER_ITEM_CLASS = "max-w-[calc(100vw-4rem)] truncate pr-8 whitespace-nowrap"

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
  const selectedCategory = searchParams.get("category") ?? ""
  const selectedSubcategory = searchParams.get("subcategory") ?? ""
  const selectedSupplier = searchParams.get("supplier") ?? ""
  const {
    categories,
    loading: categoriesLoading,
    error: categoriesError,
  } = useDirectoryMaterialCategories()
  const {
    suppliers,
    loading: scopedLoading,
    error: scopedError,
  } = useDirectoryMaterialCategories({
    category: selectedCategory || undefined,
    subcategory: selectedSubcategory || undefined,
  })

  const selectedCategoryOption = useMemo(
    () => categories.find((item) => item.category === selectedCategory) ?? null,
    [categories, selectedCategory]
  )
  const subcategories = selectedCategoryOption?.subcategories ?? []
  const hasActiveFilter = Boolean(selectedCategory || selectedSubcategory || selectedSupplier)
  const loading = categoriesLoading || scopedLoading
  const error = categoriesError ?? scopedError

  const pushParams = (params: URLSearchParams) => {
    const query = params.toString()
    router.replace(query ? `${pathname}?${query}` : pathname)
  }

  const handleCategoryChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    const nextCategory = value === ALL_CATEGORIES_VALUE ? null : value
    setOptionalParam(params, "category", nextCategory)
    params.delete("subcategory")
    params.delete("supplier")
    pushParams(params)
  }

  const handleSubcategoryChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    const nextSubcategory = value === ALL_SUBCATEGORIES_VALUE ? null : value
    setOptionalParam(params, "subcategory", nextSubcategory)
    params.delete("supplier")
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
    <Card size="sm" className="bg-card/60 shadow-sm">
      <CardHeader className="gap-0 px-2">
        <CardTitle>Фильтр по материалам</CardTitle>
        <CardDescription>
          Показывает материалы по выбранной категории или поставщику.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-2 px-2 sm:grid-cols-[minmax(160px,220px)_minmax(160px,220px)_minmax(160px,220px)_auto]">
        <Select
          disabled={categoriesLoading || categories.length === 0}
          onValueChange={handleCategoryChange}
          value={selectedCategory || ALL_CATEGORIES_VALUE}
        >
          <SelectTrigger className="w-full justify-between" size="default">
            <SelectValue placeholder="Все категории" />
          </SelectTrigger>
          <SelectContent align="end" className={FILTER_CONTENT_CLASS}>
            <SelectItem className={FILTER_ITEM_CLASS} value={ALL_CATEGORIES_VALUE}>
              Все категории
            </SelectItem>
            {categories.map((item) => (
              <SelectItem className={FILTER_ITEM_CLASS} key={item.category} value={item.category}>
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
          <SelectContent align="end" className={FILTER_CONTENT_CLASS}>
            <SelectItem className={FILTER_ITEM_CLASS} value={ALL_SUBCATEGORIES_VALUE}>
              Все подкатегории
            </SelectItem>
            {subcategories.map((item) => (
              <SelectItem className={FILTER_ITEM_CLASS} key={item.name} value={item.name}>
                {item.name} · {item.total}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          disabled={scopedLoading || suppliers.length === 0}
          onValueChange={handleSupplierChange}
          value={selectedSupplier || ALL_SUPPLIERS_VALUE}
        >
          <SelectTrigger className="w-full justify-between" size="default">
            <SelectValue placeholder="Все поставщики" />
          </SelectTrigger>
          <SelectContent align="end" className={FILTER_CONTENT_CLASS}>
            <SelectItem className={FILTER_ITEM_CLASS} value={ALL_SUPPLIERS_VALUE}>
              Все поставщики
            </SelectItem>
            {suppliers.map((item) => (
              <SelectItem className={FILTER_ITEM_CLASS} key={item.name} value={item.name}>
                {item.name} · {item.total}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          disabled={!hasActiveFilter || loading}
          onClick={handleReset}
          type="button"
          variant="outline"
        >
          Сбросить
        </Button>
      </CardContent>

      <FieldError className="px-2 pb-2">
        {error ? `Не удалось загрузить фильтры: ${error}` : null}
      </FieldError>
    </Card>
  )
}
