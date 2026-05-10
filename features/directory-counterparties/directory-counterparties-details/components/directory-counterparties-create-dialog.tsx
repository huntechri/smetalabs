"use client"

import { useState } from "react"
import type { CounterpartyType, LegalStatus } from "@/types/directory-counterparty"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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

export function DirectoryCounterpartiesCreateDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [name, setName] = useState("")
  const [type, setType] = useState<CounterpartyType | "">("")
  const [status, setStatus] = useState<LegalStatus | "">("")
  const [inn, setInn] = useState("")
  const [phone, setPhone] = useState("")

  // Juridical fields
  const [legalAddress, setLegalAddress] = useState("")
  const [bankName, setBankName] = useState("")
  const [bik, setBik] = useState("")
  const [corrAccount, setCorrAccount] = useState("")
  const [accountNumber, setAccountNumber] = useState("")

  // Individual fields
  const [passportSeries, setPassportSeries] = useState("")
  const [passportNumber, setPassportNumber] = useState("")
  const [issuedBy, setIssuedBy] = useState("")
  const [issueDate, setIssueDate] = useState("")
  const [departmentCode, setDepartmentCode] = useState("")
  const [registrationAddress, setRegistrationAddress] = useState("")

  const handleCreate = () => {
    // TODO: implement save logic
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Новый контрагент</DialogTitle>
          <DialogDescription>
            Заполните данные для добавления нового контрагента.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="counterparty-name">Наименование</Label>
            <Input
              id="counterparty-name"
              placeholder="Введите название"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="counterparty-type">Тип</Label>
            <Select
              value={type}
              onValueChange={(v) => setType(v as CounterpartyType)}
            >
              <SelectTrigger id="counterparty-type" className="w-full">
                <SelectValue placeholder="Выберите тип" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="customer">Заказчик</SelectItem>
                <SelectItem value="contractor">Подрядчик</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="counterparty-status">Статус</Label>
            <Select
              value={status}
              onValueChange={(v) => setStatus(v as LegalStatus)}
            >
              <SelectTrigger id="counterparty-status" className="w-full">
                <SelectValue placeholder="Выберите статус" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="juridical">Юр. лицо</SelectItem>
                <SelectItem value="individual">Физ. лицо</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="counterparty-inn">ИНН</Label>
            <Input
              id="counterparty-inn"
              placeholder="Введите ИНН"
              value={inn}
              onChange={(e) => setInn(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="counterparty-phone">Телефон</Label>
            <Input
              id="counterparty-phone"
              placeholder="+7 (XXX) XXX-XX-XX"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>

          {status === "juridical" && (
            <>
              <hr className="border-dashed border-muted-foreground/30" />
              <p className="text-xs font-semibold text-muted-foreground uppercase">
                Банковские реквизиты
              </p>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="counterparty-legal-address">Юридический адрес</Label>
                <Input
                  id="counterparty-legal-address"
                  placeholder="Введите юридический адрес"
                  value={legalAddress}
                  onChange={(e) => setLegalAddress(e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="counterparty-bank-name">Наименование банка</Label>
                <Input
                  id="counterparty-bank-name"
                  placeholder="Введите наименование банка"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="counterparty-bik">БИК</Label>
                <Input
                  id="counterparty-bik"
                  placeholder="9 цифр"
                  value={bik}
                  onChange={(e) => setBik(e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="counterparty-corr-account">К/С</Label>
                <Input
                  id="counterparty-corr-account"
                  placeholder="20 цифр"
                  value={corrAccount}
                  onChange={(e) => setCorrAccount(e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="counterparty-account-number">Р/С</Label>
                <Input
                  id="counterparty-account-number"
                  placeholder="20 цифр"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                />
              </div>
            </>
          )}

          {status === "individual" && (
            <>
              <hr className="border-dashed border-muted-foreground/30" />
              <p className="text-xs font-semibold text-muted-foreground uppercase">
                Паспортные данные
              </p>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="counterparty-passport-series">Серия</Label>
                  <Input
                    id="counterparty-passport-series"
                    placeholder="4 цифры"
                    value={passportSeries}
                    onChange={(e) => setPassportSeries(e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="counterparty-passport-number">Номер</Label>
                  <Input
                    id="counterparty-passport-number"
                    placeholder="6 цифр"
                    value={passportNumber}
                    onChange={(e) => setPassportNumber(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="counterparty-issued-by">Кем выдан</Label>
                <Input
                  id="counterparty-issued-by"
                  placeholder="Наименование органа"
                  value={issuedBy}
                  onChange={(e) => setIssuedBy(e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="counterparty-issue-date">Дата выдачи</Label>
                <Input
                  id="counterparty-issue-date"
                  placeholder="ДД.ММ.ГГГГ"
                  value={issueDate}
                  onChange={(e) => setIssueDate(e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="counterparty-department-code">Код подразделения</Label>
                <Input
                  id="counterparty-department-code"
                  placeholder="000-000"
                  value={departmentCode}
                  onChange={(e) => setDepartmentCode(e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="counterparty-registration-address">Адрес регистрации</Label>
                <Input
                  id="counterparty-registration-address"
                  placeholder="Введите адрес регистрации"
                  value={registrationAddress}
                  onChange={(e) => setRegistrationAddress(e.target.value)}
                />
              </div>
            </>
          )}
        </div>

        <DialogFooter showCloseButton={false}>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Отмена
          </Button>
          <Button onClick={handleCreate}>Создать</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
