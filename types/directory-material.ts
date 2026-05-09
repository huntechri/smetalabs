export type DirectoryMaterialRow = {
  id: string
  title: string        // название материала
  unit: string         // ед. изм (шт, м, кг, лист, упак, м²...)
  price: number        // цена за единицу
  supplier: string     // поставщик
  category: string     // категория
}
