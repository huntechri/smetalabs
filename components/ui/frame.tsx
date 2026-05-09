import { type ComponentProps } from "react"
import { cn } from "@/lib/utils"

export function Frame({ className, ...props }: ComponentProps<"div">) {
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
