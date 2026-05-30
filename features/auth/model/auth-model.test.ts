import { describe, expect, it } from "vitest"
import {
  validatePasswords,
  isAlreadySaved,
  hasInvitationMetadata,
  getInvitePasswordErrorMessage,
} from "./auth-model"

describe("auth-model domain logic", () => {
  describe("validatePasswords", () => {
    it("should return error if password is too short", () => {
      expect(validatePasswords("123", "123")).toBe("Пароль должен быть не менее 8 символов")
    })

    it("should return error if passwords do not match", () => {
      expect(validatePasswords("12345678", "87654321")).toBe("Пароли не совпадают")
    })

    it("should return null if passwords match and are at least 8 characters", () => {
      expect(validatePasswords("12345678", "12345678")).toBeNull()
    })
  });

  describe("isAlreadySaved", () => {
    it("should return true if code is same_password", () => {
      expect(isAlreadySaved({ code: "same_password" })).toBe(true)
    })

    it("should return true if message contains different from the old password", () => {
      expect(isAlreadySaved({ message: "New password must be different from the old password" })).toBe(true)
    })

    it("should return false for other errors", () => {
      expect(isAlreadySaved({ code: "invalid_credentials", message: "Invalid email" })).toBe(false)
      expect(isAlreadySaved({})).toBe(false)
    })
  });

  describe("hasInvitationMetadata", () => {
    it("should return true if invitation_id is a non-empty string", () => {
      expect(hasInvitationMetadata({ invitation_id: "123-abc" })).toBe(true)
    })

    it("should return false if invitation_id is empty, missing, or not a string", () => {
      expect(hasInvitationMetadata({ invitation_id: "" })).toBe(false)
      expect(hasInvitationMetadata({ other_key: "abc" })).toBe(false)
      expect(hasInvitationMetadata(null)).toBe(false)
      expect(hasInvitationMetadata(undefined)).toBe(false)
    })
  });

  describe("getInvitePasswordErrorMessage", () => {
    it("should return default fallback message when no error object is provided", () => {
      expect(getInvitePasswordErrorMessage(null)).toBe("Не удалось сохранить пароль. Попробуйте ещё раз.")
      expect(getInvitePasswordErrorMessage(undefined)).toBe("Не удалось сохранить пароль. Попробуйте ещё раз.")
    })

    it("should return error message when error object contains a message", () => {
      expect(getInvitePasswordErrorMessage({ message: "Network error" })).toBe("Network error")
    })
  });
})
