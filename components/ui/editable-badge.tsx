"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

type EditableBadgeProps = {
  value: string | number
  onChange?: (value: string) => void
  label?: string
  suffix?: string
  strong?: boolean
  className?: string
  formatDisplay?: (value: string | number) => string
}

export function EditableBadge({
  value,
  onChange,
  label,
  suffix,
  strong = false,
  className,
  formatDisplay,
}: EditableBadgeProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(String(value))

  const editable = typeof onChange === "function"

  const enterEdit = () => {
    if (!editable) return
    setDraft(String(value))
    setEditing(true)
  }

  const handleBadgeKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault()
      enterEdit()
    }
  }

  const commit = () => {
    setEditing(false)
    if (editable && draft !== String(value)) {
      onChange(draft)
    }
  }

  const cancel = () => {
    setEditing(false)
    setDraft(String(value))
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      commit()
    } else if (e.key === "Escape") {
      cancel()
    }
  }

  if (editing) {
    return (
      <Input
        className={cn("h-5 w-20 md:w-24 text-xs tabular-nums px-1", className)}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={handleKeyDown}
        autoFocus
        onFocus={(e) => e.target.select()}
      />
    )
  }

  const displayText = formatDisplay
    ? formatDisplay(value)
    : `${value}${suffix ? ` ${suffix}` : ""}`

  return (
    <Badge
      variant="outline"
      className={cn(
        "gap-1 rounded-md px-1.5 py-0.5 font-normal tabular-nums select-none",
        editable && "cursor-pointer hover:bg-muted",
        strong && "font-semibold",
        className
      )}
      role={editable ? "button" : undefined}
      tabIndex={editable ? 0 : undefined}
      onKeyDown={editable ? handleBadgeKeyDown : undefined}
      onClick={enterEdit}
    >
      {label && <span className="text-muted-foreground">{label}:</span>}
      <span>{displayText}</span>
    </Badge>
  )
}
