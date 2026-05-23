"use client"

import dynamic from "next/dynamic"
import { Skeleton } from "@/components/ui/skeleton"

const ChartAreaInteractive = dynamic(
  () =>
    import("@/features/dashboard/chart-area-interactive").then((mod) => ({
      default: mod.ChartAreaInteractive,
    })),
  {
    ssr: false,
    loading: () => <Skeleton className="h-[350px] w-full" />,
  }
)

export { ChartAreaInteractive }
