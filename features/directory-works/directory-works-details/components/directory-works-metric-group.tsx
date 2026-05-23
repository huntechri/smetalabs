export function DirectoryWorksMetricGroup({
  children,
  title,
}: {
  children: React.ReactNode
  title: string
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5 rounded-md border border-border p-1.5">
      <div className="text-xs text-muted-foreground uppercase">{title}</div>
      <div className="flex min-w-0 flex-wrap gap-1.5">{children}</div>
    </div>
  )
}
