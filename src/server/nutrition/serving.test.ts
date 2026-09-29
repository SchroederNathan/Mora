import { expect, test } from 'bun:test'
import { convertNutrients, scaleMacros } from '@/types/nutrition'
import { nutritionEstimateSchema } from './nutrition-estimate'
import { resolveServing } from './serving'
const portions = [
  { id: 1, amount: 0.5, gramWeight: 120, modifier: 'cup' },
  { id: 2, amount: 1, gramWeight: 118, modifier: 'medium' },
]
test('normalizes fractional USDA portions to one requested unit', () => {
  expect(resolveServing(portions, 'cup')).toEqual({ amount: 1, unit: 'cup', gramWeight: 240 })
})
test('uses exact weight conversions and a standard medium portion', () => {
  expect(resolveServing(portions, 'g').gramWeight).toBe(1)
  expect(resolveServing(portions, 'oz').gramWeight).toBeCloseTo(28.3495)
  expect(resolveServing(portions).gramWeight).toBe(118)
  expect(resolveServing([])).toEqual({ amount: 100, unit: 'g', gramWeight: 100 })
})
test('does not silently substitute a different requested portion', () => {
  expect(() => resolveServing(portions, 'ml')).toThrow('No matching USDA portion')
  expect(resolveServing(portions, 'cups').gramWeight).toBe(240)
  expect(resolveServing([], 'lb').gramWeight).toBeCloseTo(453.59237)
})

test('keeps gram and ounce precision until the eaten portion is totaled', () => {
  const per100g = { calories: 165, protein: 31, carbs: 0, fat: 3.6, sodium: 74 }
  const perGram = convertNutrients(per100g, resolveServing([], 'g').gramWeight / 100)
  expect(perGram.calories).toBeCloseTo(1.65)
  expect(scaleMacros(perGram, 100)).toMatchObject(per100g)
  const perOunce = convertNutrients(per100g, resolveServing([], 'oz').gramWeight / 100)
  expect(scaleMacros(perOunce, 4).calories).toBe(187)
  expect(resolveServing([], 'kg').gramWeight).toBe(1000)
})
test('rejects incomplete or invalid estimates without inventing missing macros', () => {
  expect(nutritionEstimateSchema.safeParse({ calories: 165 }).success).toBe(false)
  expect(
    nutritionEstimateSchema.safeParse({ calories: -1, protein: 0, carbs: 0, fat: 0 }).success,
  ).toBe(false)
  expect(
    nutritionEstimateSchema.parse({ calories: 1.65, protein: 0.31, carbs: 0, fat: 0.036 })
      .calories,
  ).toBe(1.65)
})
