import type { ServingInfo, USDAFoodPortion } from '@/types/nutrition'
/** USDA nutrients are per 100g; portions may describe multiple or fractional units. */
export function resolveServing(
  portions: USDAFoodPortion[] = [],
  requestedUnit?: string,
): ServingInfo {
  const unit = requestedUnit?.trim().toLowerCase()
  if (unit === 'g' || unit === 'gram' || unit === 'grams')
    return { amount: 1, unit: 'g', gramWeight: 1 }
  if (unit === 'kg' || unit === 'kilogram' || unit === 'kilograms')
    return { amount: 1, unit: 'kg', gramWeight: 1000 }
  if (unit === 'oz' || unit === 'ounce' || unit === 'ounces')
    return { amount: 1, unit: 'oz', gramWeight: 28.349523125 }
  if (unit === 'lb' || unit === 'pound' || unit === 'pounds')
    return { amount: 1, unit: 'lb', gramWeight: 453.59237 }
  const text = (portion: USDAFoodPortion) =>
    `${portion.modifier ?? ''} ${portion.portionDescription ?? ''}`.trim().toLowerCase()
  const usable = portions.filter((portion) => portion.gramWeight > 0 && portion.amount > 0)
  const searchUnit = unit?.replace(/^(cups|slices|pieces|tablespoons|teaspoons)$/, (value) =>
    value.slice(0, -1),
  )
  const exact =
    searchUnit &&
    usable.find((portion) =>
      `${text(portion)} ${portion.measureUnit?.name ?? ''}`.includes(searchUnit),
    )
  if (unit && !exact && unit !== 'serving')
    throw new Error('No matching USDA portion for the requested unit')
  const medium = usable.find((portion) => text(portion).includes('medium'))
  const ordinary = usable.find((portion) => !/package|yield|nfs/.test(text(portion)))
  const portion = exact || medium || ordinary || usable[0]
  if (!portion) return { amount: 100, unit: 'g', gramWeight: 100 }
  const label = (portion.modifier || portion.portionDescription || 'serving').replace(
    /^\d+(?:\.\d+|\/\d+)?\s*/,
    '',
  )
  return {
    amount: 1,
    unit: label || 'serving',
    gramWeight: portion.gramWeight / portion.amount,
  }
}
