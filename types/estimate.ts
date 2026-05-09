export type Material = {
  id: string
  title: string
  unit: string
  quantity: number
  waste: number
  price: number
}

export type Work = {
  id: string
  number: string
  title: string
  unit: string
  quantity: number
  price: number
  materials: Material[]
}
