"use client"

import Link from "next/link"
import { useParams, usePathname, useRouter } from "next/navigation"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

const estimateTabs = [
  {
    label: "Смета",
    path: "",
    value: "estimate",
  },
  {
    label: "Закупки",
    path: "purchases",
    value: "purchases",
  },
  {
    label: "Исполнение",
    path: "execution",
    value: "execution",
  },
  {
    label: "Финансы",
    path: "finances",
    value: "finances",
  },
  {
    label: "Документы",
    path: "documents",
    value: "documents",
  },
]

function getParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

export function EstimateNavigationTabs() {
  const params = useParams()
  const pathname = usePathname()
  const router = useRouter()
  const projectId = getParam(params.projectId)
  const estimateId = getParam(params.estimateId)

  if (!projectId || !estimateId) {
    return null
  }

  const basePath = `/projects/${projectId}/estimates/${estimateId}`
  const activeTab =
    estimateTabs.find((tab) => tab.path && pathname.endsWith(`/${tab.path}`))
      ?.value ?? "estimate"

  const getTabHref = (path: string) => (path ? `${basePath}/${path}` : basePath)

  return (
    <div className="rounded-xl border border-dashed border-pink-500 p-2">
      <Tabs value={activeTab} className="w-full flex-col justify-start">
        <div className="rounded-lg border border-dashed border-pink-300 p-2 @4xl/main:hidden">
          <Select
            value={activeTab}
            onValueChange={(value) => {
              const tab = estimateTabs.find((item) => item.value === value)

              if (tab) {
                router.push(getTabHref(tab.path))
              }
            }}
          >
            <SelectTrigger className="flex w-fit" size="sm">
              <SelectValue placeholder="Раздел сметы" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {estimateTabs.map((tab) => (
                  <SelectItem key={tab.value} value={tab.value}>
                    {tab.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>

        <div className="hidden rounded-lg border border-dashed border-pink-300 p-2 @4xl/main:block">
          <TabsList>
            {estimateTabs.map((tab) => (
              <TabsTrigger asChild key={tab.value} value={tab.value}>
                <Link href={getTabHref(tab.path)}>{tab.label}</Link>
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
      </Tabs>
    </div>
  )
}
