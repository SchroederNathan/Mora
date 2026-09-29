import type { FoodConfirmationEntry, FoodLogEntry } from '@/types/nutrition'

export type FoodDetailParams =
  | { mode: 'logged'; entry: FoodLogEntry }
  | { mode: 'pending'; entries: FoodConfirmationEntry[] }

export type AppStackParamList = {
  Main: undefined
  FoodDetail: FoodDetailParams
}
