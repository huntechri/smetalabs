import { describe, expect, it } from "vitest"
import {
  getProfileInitials,
  formatLastLogin,
  getOwnerTransferCandidates,
  getErrorMessage,
} from "./account-settings-model"
import type { WorkspaceMember } from "@/features/workspace-settings/types"

describe("account-settings-model", () => {
  describe("getProfileInitials", () => {
    it("returns ? for null, undefined, empty, or whitespace-only strings", () => {
      expect(getProfileInitials(null)).toBe("?")
      expect(getProfileInitials(undefined)).toBe("?")
      expect(getProfileInitials("")).toBe("?")
      expect(getProfileInitials("   ")).toBe("?")
    });

    it("returns uppercase initials for single and multi-word names", () => {
      expect(getProfileInitials("John Doe")).toBe("JD")
      expect(getProfileInitials("иван грозный")).toBe("ИГ")
      expect(getProfileInitials("  alex  ")).toBe("A")
      expect(getProfileInitials("Иван Васильевич Грозный")).toBe("ИВГ")
    });
  });

  describe("formatLastLogin", () => {
    it("returns — for null or undefined lastLogin", () => {
      expect(formatLastLogin(null)).toBe("—")
      expect(formatLastLogin(undefined)).toBe("—")
    });

    it("returns formatted Russian locale string for valid date", () => {
      const isoDate = "2026-05-30T12:34:56.000Z"
      // Date parsing can depend on timezone, but let's test for standard date segments presence
      const formatted = formatLastLogin(isoDate)
      expect(formatted).not.toBe("—")
      expect(formatted).toMatch(/\d{2}\.\d{2}\.\d{4}/)
    });
  });

  describe("getOwnerTransferCandidates", () => {
    it("returns empty array for invalid inputs", () => {
      expect(getOwnerTransferCandidates(null as any)).toEqual([])
      expect(getOwnerTransferCandidates(undefined as any)).toEqual([])
    });

    it("filters active members who are not owner", () => {
      const mockMembers: WorkspaceMember[] = [
        { id: "1", name: "Owner", email: "o@test.com", role: "owner", status: "active", joinedAt: "", lastActiveAt: "" },
        { id: "2", name: "Active Admin", email: "a@test.com", role: "admin", status: "active", joinedAt: "", lastActiveAt: "" },
        { id: "3", name: "Suspended Estimator", email: "e@test.com", role: "estimator", status: "suspended", joinedAt: "", lastActiveAt: "" },
        { id: "4", name: "Active Viewer", email: "v@test.com", role: "viewer", status: "active", joinedAt: "", lastActiveAt: "" },
      ];

      const candidates = getOwnerTransferCandidates(mockMembers)
      expect(candidates).toHaveLength(2)
      expect(candidates.map(c => c.id)).toEqual(["2", "4"])
    });
  });

  describe("getErrorMessage", () => {
    it("extracts message from Error object", () => {
      const error = new Error("Something went wrong")
      expect(getErrorMessage(error, "Fallback")).toBe("Something went wrong")
    });

    it("returns fallback for non-Error object", () => {
      expect(getErrorMessage("String error", "Fallback")).toBe("Fallback")
      expect(getErrorMessage(null, "Fallback")).toBe("Fallback")
    });
  });
});
