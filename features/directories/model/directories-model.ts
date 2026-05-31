import { Button } from "@/components/ui/button"

export type DirectoryAction = {
  label: string
  icon: React.ReactNode
  variant?: React.ComponentProps<typeof Button>["variant"]
  disabled?: boolean
  title?: string
  hideLabel?: boolean
  onClick?: () => void
}

export type DirectoriesToolbarProps = {
  searchPlaceholder: string
  searchAriaLabel: string
  actions: DirectoryAction[]
  children?: React.ReactNode
}
