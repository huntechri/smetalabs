"use client"

import { useMemo, useState } from "react"
import { Spinner } from "@phosphor-icons/react"

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
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useWorkspaceMembers } from "@/features/workspace-settings/application/use-workspace-members"
import {
  useLeaveWorkspace,
  useTransferOwnership,
  useDeactivateAccount,
  useDeleteWorkspace,
} from "../application/use-account-settings"
import { getOwnerTransferCandidates } from "../model/account-settings-model"
import type { WorkspaceAccessInfo } from "../types"

type SensitiveActionsCardProps = {
  workspaceAccess: WorkspaceAccessInfo | null | undefined
  workspaceName?: string | null
  refetch?: () => Promise<void>
}

export function SensitiveActionsCard({
  workspaceAccess,
  workspaceName,
}: SensitiveActionsCardProps) {
  const { members, loading: membersLoading } = useWorkspaceMembers()
  const leaveWorkspace = useLeaveWorkspace()
  const transferOwnership = useTransferOwnership()
  const deactivateAccount = useDeactivateAccount()
  const deleteWorkspace = useDeleteWorkspace()

  const [selectedOwnerId, setSelectedOwnerId] = useState("")
  const [deleteConfirmation, setDeleteConfirmation] = useState("")

  const isOwner = workspaceAccess?.role === "owner"
  const isWorkspaceMember = Boolean(workspaceAccess?.role)
  const displayWorkspaceName = workspaceName?.trim() || "workspace"

  const isPending =
    leaveWorkspace.isPending ||
    transferOwnership.isPending ||
    deactivateAccount.isPending ||
    deleteWorkspace.isPending

  const ownerCandidates = useMemo(
    () => getOwnerTransferCandidates(members),
    [members]
  )

  async function handleLeaveWorkspace() {
    try {
      await leaveWorkspace.mutateAsync()
    } catch {
      // toast is already handled by hook
    }
  }

  async function handleTransferOwnership() {
    if (!selectedOwnerId) return
    try {
      await transferOwnership.mutateAsync({ targetUserId: selectedOwnerId })
    } catch {
      // toast is already handled by hook
    }
  }

  async function handleDeactivateAccount() {
    try {
      await deactivateAccount.mutateAsync()
    } catch {
      // toast is already handled by hook
    }
  }

  async function handleDeleteWorkspace() {
    try {
      await deleteWorkspace.mutateAsync({ confirmation: deleteConfirmation })
    } catch {
      // toast is already handled by hook
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
                disabled={!isWorkspaceMember || isOwner || isPending}
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
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline" disabled={isPending}>
                    Отмена
                  </Button>
                </DialogClose>
                <Button
                  variant="destructive"
                  onClick={handleLeaveWorkspace}
                  disabled={isPending}
                  className="gap-1.5"
                >
                  {leaveWorkspace.isPending ? (
                    <Spinner className="size-3.5 animate-spin" />
                  ) : null}
                  {leaveWorkspace.isPending ? "Выход..." : "Покинуть"}
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
                disabled={!isOwner || isPending}
                title={
                  !isOwner ? "Доступно только владельцу workspace" : undefined
                }
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
                <Label htmlFor="new-owner" className="text-muted-foreground">
                  Новый владелец
                </Label>
                <Select
                  value={selectedOwnerId}
                  onValueChange={setSelectedOwnerId}
                  disabled={membersLoading || isPending}
                >
                  <SelectTrigger id="new-owner" className="w-full">
                    <SelectValue
                      placeholder={
                        membersLoading
                          ? "Загрузка участников..."
                          : "Выберите участника"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {ownerCandidates.map((member) => (
                      <SelectItem key={member.id} value={member.id}>
                        {member.name || member.email || member.id} ·{" "}
                        {member.role}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {ownerCandidates.length === 0 && !membersLoading ? (
                  <p className="text-xs text-muted-foreground">
                    Нет активных участников, которым можно передать ownership.
                  </p>
                ) : null}
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline" disabled={isPending}>
                    Отмена
                  </Button>
                </DialogClose>
                <Button
                  onClick={handleTransferOwnership}
                  disabled={isPending || membersLoading || !selectedOwnerId}
                  className="gap-1.5"
                >
                  {transferOwnership.isPending ? (
                    <Spinner className="size-3.5 animate-spin" />
                  ) : null}
                  {transferOwnership.isPending
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
                disabled={!isWorkspaceMember || isOwner || isPending}
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
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline" disabled={isPending}>
                    Отмена
                  </Button>
                </DialogClose>
                <Button
                  variant="destructive"
                  onClick={handleDeactivateAccount}
                  disabled={isPending}
                  className="gap-1.5"
                >
                  {deactivateAccount.isPending ? (
                    <Spinner className="size-3.5 animate-spin" />
                  ) : null}
                  {deactivateAccount.isPending
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
                disabled={!isOwner || isPending}
                title={
                  !isOwner ? "Доступно только владельцу workspace" : undefined
                }
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
                <Label
                  htmlFor="delete-workspace-confirmation"
                  className="text-muted-foreground"
                >
                  Подтверждение
                </Label>
                <Input
                  id="delete-workspace-confirmation"
                  value={deleteConfirmation}
                  onChange={(event) =>
                    setDeleteConfirmation(event.target.value)
                  }
                  placeholder={displayWorkspaceName}
                  disabled={isPending}
                />
                <p className="text-xs text-muted-foreground">
                  Текущее название: {displayWorkspaceName}
                </p>
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline" disabled={isPending}>
                    Отмена
                  </Button>
                </DialogClose>
                <Button
                  variant="destructive"
                  onClick={handleDeleteWorkspace}
                  disabled={isPending || !deleteConfirmation.trim()}
                  className="gap-1.5"
                >
                  {deleteWorkspace.isPending ? (
                    <Spinner className="size-3.5 animate-spin" />
                  ) : null}
                  {deleteWorkspace.isPending ? "Удаление..." : "Удалить"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardContent>
    </Card>
  )
}
