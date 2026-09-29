import { z } from 'zod'

const nutrient = z.number().finite().nonnegative().max(10000)
// Require all four primary nutrients: a partial estimate must not invent defaults.
export const nutritionEstimateSchema = z.object({
  calories: nutrient,
  protein: nutrient,
  carbs: nutrient,
  fat: nutrient,
  fiber: nutrient.optional(),
  sugar: nutrient.optional(),
  sodium: nutrient.optional(),
  servingDescription: z.string().max(200).optional(),
})
