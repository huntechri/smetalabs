export type DirectoryMaterialRow = {
  id: string
  title: string        // название материала
  unit: string         // ед. изм (шт, м, кг, лист, упак, м²...)
  price: number        // цена за единицу
  imageUrl?: string    // URL изображения товара
  category: string     // категория
}
