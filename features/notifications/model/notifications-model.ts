export type NotificationIconType = 'briefcase' | 'calculator' | 'shopping-cart' | 'users' | 'credit-card' | 'bell';

export interface NotificationVisualInfo {
  iconType: NotificationIconType
  bgClass: string
}

/**
 * Простой хелпер для вычисления относительного времени на русском языке.
 */
export function formatRelativeTime(dateString: string): string {
  const now = new Date()
  const date = new Date(dateString)
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return "Только что"
  if (diffMins < 60) return `${diffMins} мин. назад`
  if (diffHours < 24) return `${diffHours} ч. назад`
  if (diffDays < 7) return `${diffDays} дн. назад`

  return date.toLocaleDateString("ru-RU", { day: "numeric", month: "short" })
}

/**
 * Возвращает тип иконки и цвет фона в зависимости от типа уведомления.
 */
export function getNotificationVisualType(type: string): NotificationVisualInfo {
  if (type.startsWith("project_")) {
    return {
      iconType: "briefcase",
      bgClass: "bg-blue-500/10 text-blue-500 dark:bg-blue-500/20",
    }
  }
  if (type.startsWith("estimate_")) {
    return {
      iconType: "calculator",
      bgClass: "bg-emerald-500/10 text-emerald-500 dark:bg-emerald-500/20",
    }
  }
  if (type.startsWith("procurement_")) {
    return {
      iconType: "shopping-cart",
      bgClass: "bg-amber-500/10 text-amber-500 dark:bg-amber-500/20",
    }
  }
  if (type.startsWith("team_")) {
    return {
      iconType: "users",
      bgClass: "bg-purple-500/10 text-purple-500 dark:bg-purple-500/20",
    }
  }
  if (type.startsWith("billing_")) {
    return {
      iconType: "credit-card",
      bgClass: "bg-rose-500/10 text-rose-500 dark:bg-rose-500/20",
    }
  }

  return {
    iconType: "bell",
    bgClass: "bg-muted text-muted-foreground",
  }
}
