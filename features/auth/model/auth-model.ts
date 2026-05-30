/**
 * Validates password strength (minimum length) and matching passwords.
 * Returns a string error or null if valid.
 */
export function validatePasswords(password: string, confirmPassword: string): string | null {
  if (password.length < 8) {
    return "Пароль должен быть не менее 8 символов"
  }
  if (password !== confirmPassword) {
    return "Пароли не совпадают"
  }
  return null
}

/**
 * Checks if the update password error indicates the password is already saved/same.
 */
export function isAlreadySaved(error: { code?: string; message?: string }): boolean {
  return (
    error.code === "same_password" ||
    error.message?.toLowerCase().includes("different from the old password") === true
  )
}

/**
 * Validates if user metadata contains invitation ID.
 */
export function hasInvitationMetadata(metadata: Record<string, unknown> | null | undefined): boolean {
  return (
    typeof metadata?.invitation_id === "string" &&
    metadata.invitation_id.length > 0
  )
}

/**
 * Returns a normalized error message for invite-password flow.
 */
export function getInvitePasswordErrorMessage(error: { message?: string } | null | undefined): string {
  if (!error) return "Не удалось сохранить пароль. Попробуйте ещё раз."
  return error.message ?? "Не удалось сохранить пароль. Попробуйте ещё раз."
}
