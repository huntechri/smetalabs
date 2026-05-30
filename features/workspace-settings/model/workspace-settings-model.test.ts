import { describe, expect, it, vi, beforeEach, afterEach } from "vitest"
import {
  getInitials,
  formatDate,
  formatRelative,
  formatMemberActivity,
  type WorkspaceMember,
} from "./workspace-settings-model"

describe("workspace-settings-model", () => {
  describe("getInitials", () => {
    it("returns initials for single and multi-word names", () => {
      expect(getInitials("Иван")).toBe("И")
      expect(getInitials("Иван Иванов")).toBe("ИИ")
      expect(getInitials("Иван Иванович Иванов")).toBe("ИИ")
    })
  })

  describe("formatDate", () => {
    it("returns dash for dash placeholder", () => {
      expect(formatDate("—")).toBe("—")
    })

    it("formats ISO string correctly to Russian locale format", () => {
      expect(formatDate("2026-05-20T10:00:00Z")).toBe("20.05.2026")
    })
  })

  describe("formatRelative", () => {
    beforeEach(() => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date("2026-05-30T12:00:00Z"))
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it("returns dash for dash placeholder", () => {
      expect(formatRelative("—")).toBe("—")
    })

    it("returns 'только что' for recent changes", () => {
      expect(formatRelative("2026-05-30T11:59:45Z")).toBe("только что")
    })

    it("returns minutes ago", () => {
      expect(formatRelative("2026-05-30T11:45:00Z")).toBe("15 мин. назад")
    })

    it("returns hours ago", () => {
      expect(formatRelative("2026-05-30T08:00:00Z")).toBe("4 ч. назад")
    })

    it("returns days ago", () => {
      expect(formatRelative("2026-05-25T12:00:00Z")).toBe("5 дн. назад")
    })

    it("falls back to formatDate for differences greater than 30 days", () => {
      expect(formatRelative("2026-04-01T12:00:00Z")).toBe("01.04.2026")
    })
  })

  describe("formatMemberActivity", () => {
    it("returns relative date if member was active", () => {
      const member = {
        lastActiveAt: "2026-05-30T11:45:00Z",
        status: "active",
      } as WorkspaceMember

      vi.useFakeTimers()
      vi.setSystemTime(new Date("2026-05-30T12:00:00Z"))
      expect(formatMemberActivity(member)).toBe("15 мин. назад")
      vi.useRealTimers()
    })

    it("returns appropriate label for invited status without activity", () => {
      const member = {
        lastActiveAt: "—",
        status: "invited",
      } as WorkspaceMember

      expect(formatMemberActivity(member)).toBe("Не входил")
    })

    it("returns appropriate label for suspended status without activity", () => {
      const member = {
        lastActiveAt: "—",
        status: "suspended",
      } as WorkspaceMember

      expect(formatMemberActivity(member)).toBe("Заблокирован")
    })

    it("returns 'Нет данных' for active status with no activity", () => {
      const member = {
        lastActiveAt: "—",
        status: "active",
      } as WorkspaceMember

      expect(formatMemberActivity(member)).toBe("Нет данных")
    })
  })
})
