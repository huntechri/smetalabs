import type { Work } from "@/types/estimate"

export const estimateWorks: Work[] = [
  {
    id: "work-1",
    number: "1",
    title: "Монтаж перегородки из ГКЛ в 2 слоя",
    unit: "м2",
    quantity: 42,
    price: 980,
    materials: [
      {
        id: "mat-1",
        title: "Гипсокартон влагостойкий 12,5 мм",
        unit: "лист",
        quantity: 58,
        waste: 7,
        price: 620,
      },
      {
        id: "mat-2",
        title: "Профиль стоечный 50x50",
        unit: "шт",
        quantity: 74,
        waste: 5,
        price: 245,
      },
      {
        id: "mat-3",
        title: "Саморезы по металлу 25 мм",
        unit: "упак.",
        quantity: 6,
        waste: 0,
        price: 390,
      },
    ],
  },
  {
    id: "work-2",
    number: "2",
    title: "Шпаклевка стен под окраску",
    unit: "м2",
    quantity: 86,
    price: 430,
    materials: [
      {
        id: "mat-4",
        title: "Шпаклевка финишная",
        unit: "меш.",
        quantity: 15,
        waste: 10,
        price: 780,
      },
      {
        id: "mat-5",
        title: "Грунтовка глубокого проникновения",
        unit: "кан.",
        quantity: 4,
        waste: 0,
        price: 1150,
      },
    ],
  },
]

export const stages = ["Этап 1: Черновые работы"]
