import { expect, test } from 'bun:test'
import { extractMacrosFromUSDA, formatServing, scaleMacros } from './nutrition'
test('USDA alternate energy ids and sodium keep their reported units', () => {
  const macros = extractMacrosFromUSDA([
    { nutrientId: 2048, nutrientName: 'Energy', unitName: 'kcal', value: 160 },
    { nutrientId: 1093, nutrientName: 'Sodium', unitName: 'mg', value: 7 },
  ])
  expect(macros.calories).toBe(160)
  expect(scaleMacros(macros, 2).sodium).toBe(14)
  expect(formatServing({ amount: 1, unit: '1 medium', gramWeight: 118 })).toBe('1 medium')
})
