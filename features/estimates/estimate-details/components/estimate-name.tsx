import { useState, useEffect, useRef, useCallback } from "react"
import { Textarea } from "@/components/ui/textarea"

export function EstimateName({
  onChange,
  value,
}: {
  onChange: (value: string) => void
  value: string
}) {
  const [localValue, setLocalValue] = useState(value)
  const isFocusedRef = useRef(false)
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)
  const lastSavedValueRef = useRef(value)
  const onChangeRef = useRef(onChange)

  // Keep onChange ref in sync so debounced callback always uses the latest function reference
  useEffect(() => {
    onChangeRef.current = onChange
  }, [onChange])

  // Sync localValue with prop when not focused (e.g. initial load or updates from external sources)
  useEffect(() => {
    if (!isFocusedRef.current) {
      setLocalValue(value)
      lastSavedValueRef.current = value
    }
  }, [value])

  // Clean up debounce timer on component unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [])

  const commitChange = useCallback((val: string) => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
      debounceTimerRef.current = null
    }

    if (val !== lastSavedValueRef.current) {
      lastSavedValueRef.current = val
      onChangeRef.current(val)
    }
  }, [])

  const handleChange = useCallback(
    (event: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newVal = event.target.value
      setLocalValue(newVal)

      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }

      debounceTimerRef.current = setTimeout(() => {
        commitChange(newVal)
      }, 800)
    },
    [commitChange]
  )

  const handleBlur = useCallback(() => {
    isFocusedRef.current = false
    commitChange(localValue)
  }, [commitChange, localValue])

  const handleFocus = useCallback(() => {
    isFocusedRef.current = true
  }, [])

  return (
    <label className="flex min-w-48 flex-1 flex-col gap-1.5">
      <span className="text-xs text-muted-foreground uppercase">
        Наименование
      </span>
      <Textarea
        className="min-h-16"
        onChange={handleChange}
        onBlur={handleBlur}
        onFocus={handleFocus}
        value={localValue}
      />
    </label>
  )
}
