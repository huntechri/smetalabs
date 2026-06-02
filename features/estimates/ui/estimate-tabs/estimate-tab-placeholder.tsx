type EstimateTabPlaceholderProps = {
  title: string
}

export function EstimateTabPlaceholder({ title }: EstimateTabPlaceholderProps) {
  return (
    <div className="flex flex-1 flex-col rounded-xl border border-dashed border-border p-1">
      <div className="flex min-h-96 flex-1 items-center justify-center rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
        {title}
      </div>
    </div>
  )
}
