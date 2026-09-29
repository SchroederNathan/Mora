import { scaleMacros, sumMacros } from '@/types/nutrition'
import { describe, expect, test } from 'bun:test'
import { calorieBudget, filterHistory, parsePositiveNumber, shiftDate } from './tracking'

describe('calendar history', () => {
  const history = [
    { date: '2026-09-28' },
    { date: '2026-09-25' },
    { date: '2026-09-01' },
    { date: '2026-09-29' },
  ]
  test('yesterday does not substitute an older logged day', () =>
    expect(filterHistory(history, '2026-09-28', 'yesterday')).toEqual([]))
  test('today only includes today', () =>
    expect(filterHistory(history, '2026-09-28', 'today')).toEqual([{ date: '2026-09-28' }]))
  test('week means calendar days, excluding future logs', () =>
    expect(filterHistory(history, '2026-09-28', 'week')).toHaveLength(2))
  test('month and year boundaries', () =>
    expect(shiftDate('2026-01-01', -1)).toBe('2025-12-31'))
})
test('rollover is capped and missing days do not grant calories', () => {
  expect(calorieBudget(2000, 300, true, true, 1500)).toBe(2500)
  expect(calorieBudget(2000, 300, false, true, null)).toBe(2000)
  expect(calorieBudget(2000, 300, false, true, 2500)).toBe(2000)
})
test('fractional servings preserve zero nutrients', () => {
  expect(scaleMacros({ calories: 100, protein: 10, carbs: 4, fat: 0, fiber: 0 }, 0.5)).toEqual({
    calories: 50,
    protein: 5,
    carbs: 2,
    fat: 0,
    fiber: 0,
    sugar: undefined,
  })
  expect(
    sumMacros([
      {
        quantity: 0.5,
        snapshot: { nutrients: { calories: 100, protein: 10, carbs: 4, fat: 2 } },
      },
    ]).calories,
  ).toBe(50)
})
test('numeric input rejects partial, negative and infinite values', () => {
  expect(parsePositiveNumber('1,5')).toBe(1.5)
  for (const invalid of ['', '1x', '-1', 'Infinity', '0'])
    expect(parsePositiveNumber(invalid)).toBeNull()
})
