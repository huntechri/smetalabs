import { describe, it, expect } from "vitest"
import { formatRelativeTime, getNotificationVisualType } from "./notifications-model"

describe("notifications-model logic", () => {
  describe("formatRelativeTime", () => {
    it("should return 'Только что' for recent dates", () => {
      const recent = new Date().toISOString()
      expect(formatRelativeTime(recent)).toBe("Только что")
    })

    it("should return relative minutes format", () => {
      const minutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()
      expect(formatRelativeTime(minutesAgo)).toBe("5 мин. назад")
    })

    it("should return relative hours format", () => {
      const hoursAgo = new Date(Date.now() - 3 * 3600 * 1000).toISOString()
      expect(formatRelativeTime(hoursAgo)).toBe("3 ч. назад")
    })

    it("should return relative days format", () => {
      const daysAgo = new Date(Date.now() - 4 * 24 * 3600 * 1000).toISOString()
      expect(formatRelativeTime(daysAgo)).toBe("4 дн. назад")
    })
  })

  describe("getNotificationVisualType", () => {
    it("should map project types correctly", () => {
      expect(getNotificationVisualType("project_created")).toEqual({
        iconType: "briefcase",
        bgClass: "bg-blue-500/10 text-blue-500 dark:bg-blue-500/20",
      })
    })

    it("should map estimate types correctly", () => {
      expect(getNotificationVisualType("estimate_updated")).toEqual({
        iconType: "calculator",
        bgClass: "bg-emerald-500/10 text-emerald-500 dark:bg-emerald-500/20",
      })
    })

    it("should map procurement types correctly", () => {
      expect(getNotificationVisualType("procurement_requested")).toEqual({
        iconType: "shopping-cart",
        bgClass: "bg-amber-500/10 text-amber-500 dark:bg-amber-500/20",
      })
    })

    it("should map team types correctly", () => {
      expect(getNotificationVisualType("team_joined")).toEqual({
        iconType: "users",
        bgClass: "bg-purple-500/10 text-purple-500 dark:bg-purple-500/20",
      })
    })

    it("should map billing types correctly", () => {
      expect(getNotificationVisualType("billing_paid")).toEqual({
        iconType: "credit-card",
        bgClass: "bg-rose-500/10 text-rose-500 dark:bg-rose-500/20",
      })
    })

    it("should return default bell icon for unknown types", () => {
      expect(getNotificationVisualType("custom_unknown_type")).toEqual({
        iconType: "bell",
        bgClass: "bg-muted text-muted-foreground",
      })
    })
  })
})
