import { expect, test } from 'bun:test'
import { estimateGoals, type GoalEstimateInput } from './estimate'
const input: GoalEstimateInput = {
  age: 30,
  heightCm: 180,
  weightKg: 80,
  equation: 'male',
  activity: 1.6,
  focus: 'maintain',
  adjustment: 250,
}
const macros = { calories: 2000, protein: 150, carbs: 200, fat: 65 }
test('calculates a transparent adult starting estimate and preserves macro proportions', () => {
  const result = estimateGoals(input, macros)
  expect(result.maintenance).toBe(2850)
  expect(result.goals.calories).toBe(2850)
  expect(
    Math.abs(result.goals.protein * 4 + result.goals.carbs * 4 + result.goals.fat * 9 - 2850),
  ).toBeLessThanOrEqual(8)
  expect(estimateGoals({ ...input, equation: 'female' }, macros).maintenance).toBe(2580)
  expect(estimateGoals({ ...input, focus: 'lose' }, macros).goals.calories).toBe(2600)
  expect(
    estimateGoals({ ...input, focus: 'gain', adjustment: 500 }, macros).goals.calories,
  ).toBe(3350)
})
test('does not estimate for minors, invalid measurements, or very low loss targets', () => {
  expect(() => estimateGoals({ ...input, age: 17 }, macros)).toThrow('adults')
  expect(() => estimateGoals({ ...input, weightKg: NaN }, macros)).toThrow('measurements')
  expect(() => estimateGoals({ ...input, weightKg: 50, focus: 'lose' }, macros)).toThrow(
    'not suitable',
  )
  expect(() =>
    estimateGoals(
      {
        ...input,
        age: 70,
        heightCm: 155,
        weightKg: 50,
        equation: 'female',
        activity: 1.4,
        focus: 'lose',
        adjustment: 500,
      },
      macros,
    ),
  ).toThrow('starting-target range')
  expect(() => estimateGoals(input, { calories: 2000, protein: 0, carbs: 0, fat: 0 })).toThrow(
    'valid protein',
  )
})
