export type SupplierStatus = "juridical" | "individual"

export type DirectorySupplierRow = {
  id: string
  name: string          // Наименование
  color: string         // hex-цвет поставщика
  status: SupplierStatus
  inn: string           // ИНН (10 цифр для физлиц, 12 для юрлиц)
  phone: string         // Телефон
}
