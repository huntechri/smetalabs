"use server"

import { z } from "zod"
import { requireAuth } from "@/lib/auth/permissions"

/**
 * ⚠️ SKELETONS — реальная логика будет добавлена после создания
 * workspace-таблиц (workspace_members, workspace_invitations,
 * workspace_allowed_domains) в Drizzle-схемах.
 *
 * На данный момент действия выбрасывают ошибку "Not implemented".
 * Архитектурный контракт (сигнатуры + Zod-валидация) зафиксирован.
 */

// ── Zod schemas ──

const ChangeRoleSchema = z.object({
  userId: z.string().uuid("Некорректный ID пользователя"),
  newRole: z.enum(["owner", "admin", "manager", "estimator", "viewer"]),
})

const RemoveMemberSchema = z.object({
  userId: z.string().uuid("Некорректный ID пользователя"),
})

const SuspendMemberSchema = z.object({
  userId: z.string().uuid("Некорректный ID пользователя"),
})

const InviteMemberSchema = z.object({
  email: z.string().email("Некорректный email"),
  role: z.enum(["owner", "admin", "manager", "estimator", "viewer"]),
})

const RevokeInvitationSchema = z.object({
  id: z.string().uuid("Некорректный ID приглашения"),
})

// ── changeRole ──

export async function changeRole(input: z.infer<typeof ChangeRoleSchema>) {
  await requireAuth()
  ChangeRoleSchema.parse(input)
  throw new Error(
    "Not implemented: используйте workspace_members API после подключения безопасной операции"
  )
}

// ── removeMember ──

export async function removeMember(input: z.infer<typeof RemoveMemberSchema>) {
  await requireAuth()
  RemoveMemberSchema.parse(input)
  throw new Error(
    "Not implemented: удаление участника выполняется только через scoped Team API"
  )
}

// ── suspendMember ──

export async function suspendMember(
  input: z.infer<typeof SuspendMemberSchema>
) {
  await requireAuth()
  SuspendMemberSchema.parse(input)
  throw new Error(
    "Not implemented: блокировка участника выполняется только через scoped Team API"
  )
}

// ── inviteMember ──

export async function inviteMember(input: z.infer<typeof InviteMemberSchema>) {
  await requireAuth()
  InviteMemberSchema.parse(input)
  throw new Error(
    "Not implemented: приглашения выполняются только через scoped Team API"
  )
}

// ── revokeInvitation ──

export async function revokeInvitation(
  input: z.infer<typeof RevokeInvitationSchema>
) {
  await requireAuth()
  RevokeInvitationSchema.parse(input)
  throw new Error(
    "Not implemented: отзыв приглашений выполняется только через scoped Team API"
  )
}
