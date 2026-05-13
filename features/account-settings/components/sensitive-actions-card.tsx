"use client"

import { useEffect, useMemo, useState } from "react"
import { Spinner } from "@phosphor-icons/react"
import { toast } from "sonner"

import {
  deactivateAccountAction,
  deleteWorkspaceAction,
  leaveWorkspaceAction,
  transferWorkspaceOwnershipAction,
} from "@/app/actions/settings"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { createClient } from "@/lib/supabase/client"
import { fetchWorkspaceMembers } from "@/features/workspace-settings/api/team-client"
import type { WorkspaceAccessInfo } from "../types"
import type { WorkspaceMember } from "@/features/workspace-settings/types"

type SensitiveActionsCardProps = {
  workspaceAccess: WorkspaceAccessInfo | null | undefined
  workspaceName?: string | null
  refetch?: () => Promise<void>
}

type PendingAction =
  | "leave"
  | "transfer"
  | "deactivate"
  | "delete"
  | null

function getErrorMessage(err: unknown, fallback: string) {
  return err instanceof Error ? err.message : fallback
}

async function followActionResult(result: { redirectTo?: string }) {
  if (result.redirectTo) {
    window.location.href = result.redirectTo
    return
  }

  window.location.reload()
}

export function SensitiveActionsCard({
  workspaceAccess,
  workspaceName,
  refetch,
}: SensitiveActionsCardProps) {
  const [pendingAction, setPendingAction] = useState<PendingAction>(null)
  const [members, setMembers] = useState<WorkspaceMember[]>([])
  const [membersLoading, setMembersLoading] = useState(false)
  const [selectedOwnerId, setSelectedOwnerId] = useState("")
  const [deleteConfirmation, setDeleteConfirmation] = useState("")

  const isOwner = workspaceAccess?.role === "owner"
  const isWorkspaceMember = Boolean(workspaceAccess?.role)
  const displayWorkspaceName = workspaceName?.trim() || "workspace"

  const ownerCandidates = useMemo(
    () =>
      members.filter(
        (member) => member.status === "active" && member.role !== "owner"
      ),
    [members]
  )

  useEffect(() => {
    if (!isOwner) return

    let cancelled = false
    setMembersLoading(true)

    fetchWorkspaceMembers()
      .then((items) => {
        if (!cancelled) setMembers(items)
      })
      .catch((err) => {
        if (!cancelled) {
          toast.error(
            getErrorMessage(err, "Ошибка загрузки участников workspace")
          )
        }
      })
      .finally(() => {
        if (!cancelled) setMembersLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [isOwner])

  async function handleLeaveWorkspace() {
    setPendingAction("leave")
    try {
      const result = await leaveWorkspaceAction()
      toast.success(result.message)
      await refetch?.()
      await followActionResult(result)
    } catch (err) {
      toast.error(getErrorMessage(err, "Ошибка выхода из workspace"))
    } finally {
      setPendingAction(null)
    }
  }

  async function handleTransferOwnership() {
    if (!selectedOwnerId) {
      toast.error("Выберите нового владельца")
      return
    }

    setPendingAction("transfer")
    try {
      const result = await transferWorkspaceOwnershipAction({
        targetUserId: selectedOwnerId,
      })
      toast.success(result.message)
      await refetch?.()
      await followActionResult(result)
    } catch (err) {
      toast.error(getErrorMessage(err, "Ошибка передачи прав владельца"))
    } finally {
      setPendingAction(null)
    }
  }

  async function handleDeactivateAccount() {
    setPendingAction("deactivate")
    try {
      const result = await deactivateAccountAction()
      toast.success(result.message)

      const supabase = createClient()
      await supabase.auth.signOut()
      await followActionResult(result)
    } catch (err) {
      toast.error(getErrorMessage(err, "Ошибка деактивации аккаунта"))
    } finally {
      setPendingAction(null)
    }
  }

  async function handleDeleteWorkspace() {
    setPendingAction("delete")
    try {
      const result = await deleteWorkspaceAction({
        confirmation: deleteConfirmation,
      })
      toast.success(result.message)
      await refetch?.()
      await followActionResult(result)
    } catch (err) {
      toast.error(getErrorMessage(err, "Ошибка удаления workspace"))
    } finally {
      setPendingAction(null)
    }
  }

  return (
    <Card className="border-destructive/50">
      <CardHeader>
        <CardTitle className="text-destructive">Опасные действия</CardTitle>
        <CardDescription>
          Действия, которые могут повлиять на ваш аккаунт и рабочее
          пространство. Будьте осторожны.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-4 py-1">
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-medium">Покинуть workspace</span>
            <span className="text-xs text-muted-foreground">
              Вы покинете текущее рабочее пространство и потеряете доступ к его
              данным
            </span>
          </div>
          <Dialog>
            <DialogTrigger asChild>
              <Button
                variant="destructive"
                disabled={!isWorkspaceMember || isOwner || pendingAction !== null}
                title={
                  isOwner
                    ? "Владелец должен передать права или удалить workspace"
                    : undefined
                }
              >
                Покинуть
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Покинуть workspace?</DialogTitle>
                <DialogDescription>
                  Вы потеряете доступ ко всем данным текущего workspace. Если у
                  вас нет других рабочих пространств, система создаст для вас
                  личный workspace.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter showCloseButton>
                <Button
                  variant="destructive"
                  onClick={handleLeaveWorkspace}
                  disabled={pendingAction !== null}
                  className="gap-1.5"
                >
                  {pendingAction === "leave" ? (
                    <Spinner className="size-3.5 animate-spin" />
                  ) : null}
                  {pendingAction === "leave" ? "Выход..." : "Покинуть"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="flex items-center justify-between gap-4 py-1">
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-medium">
              Передать права владельца
            </span>
            <span className="text-xs text-muted-foreground">
              Назначить другого участника владельцем workspace
            </span>
          </div>
          <Dialog>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                disabled={!isOwner || pendingAction !== null}
                title={!isOwner ? "Доступно только владельцу workspace" : undefined}
              >
                Передать
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Передать права владельца?</DialogTitle>
                <DialogDescription>
                  Новый владелец должен быть активным участником текущего
                  workspace. После передачи вы останетесь администратором.
                </DialogDescription>
              </DialogHeader>
              <div className="flex flex-col gap-2 py-2">
                <label className="text-sm font-medium" htmlFor="new-owner">
                  Новый владелец
                </label>
                <select
                  id="new-owner"
                  value={selectedOwnerId}
                  onChange={(event) => setSelectedOwnerId(event.target.value)}
                  disabled={membersLoading || pendingAction !== null}
                  className="h-9 rounded-md border border-input bg-background px-3 text-sm outline-none disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="">
                    {membersLoading
                      ? "Загрузка участников..."
                      : "Выберите участника"}
                  </option>
                  {ownerCandidates.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.name || member.email || member.id} · {member.role}
                    </option>
                  ))}
                </select>
                {ownerCandidates.length === 0 && !membersLoading ? (
                  <p className="text-xs text-muted-foreground">
                    Нет активных участников, которым можно передать ownership.
                  </p>
                ) : null}
              </div>
              <DialogFooter showCloseButton>
                <Button
                  onClick={handleTransferOwnership}
                  disabled={
                    pendingAction !== null || membersLoading || !selectedOwnerId
                  }
                  className="gap-1.5"
                >
                  {pendingAction === "transfer" ? (
                    <Spinner className="size-3.5 animate-spin" />
                  ) : null}
                  {pendingAction === "transfer"
                    ? "Передача..."
                    : "Подтвердить передачу"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="flex items-center justify-between gap-4 py-1">
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-medium">Деактивировать аккаунт</span>
            <span className="text-xs text-muted-foreground">
              Ваш доступ к активным workspace будет заблокирован до повторной
              активации администратором
            </span>
          </div>
          <Dialog>
            <DialogTrigger asChild>
              <Button
                variant="destructive"
                disabled={!isWorkspaceMember || isOwner || pendingAction !== null}
                title={
                  isOwner
                    ? "Владелец должен передать права или удалить workspace"
                    : undefined
                }
              >
                Деактивировать
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Деактивировать аккаунт?</DialogTitle>
                <DialogDescription>
                  Все ваши активные membership-записи будут переведены в статус
                  «Заблокирован». Вы выйдете из приложения и не сможете работать
                  в workspace до повторной активации администратором.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter showCloseButton>
                <Button
                  variant="destructive"
                  onClick={handleDeactivateAccount}
                  disabled={pendingAction !== null}
                  className="gap-1.5"
                >
                  {pendingAction === "deactivate" ? (
                    <Spinner className="size-3.5 animate-spin" />
                  ) : null}
                  {pendingAction === "deactivate"
                    ? "Деактивация..."
                    : "Деактивировать"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="flex items-center justify-between gap-4 py-1">
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-medium">Удалить workspace</span>
            <span className="text-xs text-muted-foreground">
              Полное удаление рабочего пространства и всех текущих workspace
              настроек. Это действие необратимо.
            </span>
          </div>
          <Dialog>
            <DialogTrigger asChild>
              <Button
                variant="destructive"
                disabled={!isOwner || pendingAction !== null}
                title={!isOwner ? "Доступно только владельцу workspace" : undefined}
              >
                Удалить
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Удалить workspace?</DialogTitle>
                <DialogDescription>
                  Будут удалены участники, приглашения, разрешённые домены и
                  workspace-настройки. Аккаунт владельца не удаляется. Для
                  подтверждения введите название workspace или DELETE.
                </DialogDescription>
              </DialogHeader>
              <div className="flex flex-col gap-2 py-2">
                <label
                  className="text-sm font-medium"
                  htmlFor="delete-workspace-confirmation"
                >
                  Подтверждение
                </label>
                <input
                  id="delete-workspace-confirmation"
                  value={deleteConfirmation}
                  onChange={(event) => setDeleteConfirmation(event.target.value)}
                  placeholder={displayWorkspaceName}
                  disabled={pendingAction !== null}
                  className="h-9 rounded-md border border-input bg-background px-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
                />
                <p className="text-xs text-muted-foreground">
                  Текущее название: {displayWorkspaceName}
                </p>
              </div>
              <DialogFooter showCloseButton>
                <Button
                  variant="destructive"
                  onClick={handleDeleteWorkspace}
                  disabled={pendingAction !== null || !deleteConfirmation.trim()}
                  className="gap-1.5"
                >
                  {pendingAction === "delete" ? (
                    <Spinner className="size-3.5 animate-spin" />
                  ) : null}
                  {pendingAction === "delete" ? "Удаление..." : "Удалить"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardContent>
    </Card>
  )
}
