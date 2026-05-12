"use client"

import { useState } from "react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { Role } from "@/types/roles"
import { ROLE_LABELS } from "@/types/roles"

const EDITABLE_ROLES: Role[] = ["admin", "manager", "estimator", "viewer"]

type RoleChangeMember = {
  name: string
  role: Role
}

type RoleChangeDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  member: RoleChangeMember | null
  onConfirm: (role: Role) => void | Promise<void>
}

function getInitialRole(member: RoleChangeMember | null) {
  if (!member) return "viewer"
  return EDITABLE_ROLES.includes(member.role) ? member.role : "viewer"
}

function RoleChangeDialogForm({
  member,
  onOpenChange,
  onConfirm,
}: Pick<RoleChangeDialogProps, "member" | "onOpenChange" | "onConfirm">) {
  const [role, setRole] = useState<Role>(getInitialRole(member))

  const handleSubmit = async () => {
    await onConfirm(role)
  }

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Изменить роль</DialogTitle>
        <DialogDescription>
          Выберите новую роль для {member?.name ?? "участника"}.
        </DialogDescription>
      </DialogHeader>
      <Select value={role} onValueChange={(value) => setRole(value as Role)}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {EDITABLE_ROLES.map((editableRole) => (
            <SelectItem key={editableRole} value={editableRole}>
              {ROLE_LABELS[editableRole]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <DialogFooter>
        <Button variant="outline" onClick={() => onOpenChange(false)}>
          Отмена
        </Button>
        <Button onClick={handleSubmit}>Сохранить</Button>
      </DialogFooter>
    </DialogContent>
  )
}

export function RoleChangeDialog({
  open,
  onOpenChange,
  member,
  onConfirm,
}: RoleChangeDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <RoleChangeDialogForm
        key={`${open ? "open" : "closed"}-${member?.name ?? "member"}-${member?.role ?? "viewer"}`}
        member={member}
        onOpenChange={onOpenChange}
        onConfirm={onConfirm}
      />
    </Dialog>
  )
}
