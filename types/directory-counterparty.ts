export type CounterpartyStatus = "juridical" | "individual"

export type DirectoryCounterpartyRow = {
  id: string
  name: string          // Наименование
  color: string         // hex-цвет контрагента
  status: CounterpartyStatus
  inn: string           // ИНН (10 цифр для физлиц, 12 для юрлиц)
  phone: string         // Телефон
}
