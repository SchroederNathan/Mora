import {
  extractMacrosFromUSDA,
  convertNutrients,
  type FoodSnapshot,
  type USDASearchResponse,
} from '@/types/nutrition'

export async function searchFoods(query: string): Promise<FoodSnapshot[]> {
  const key = process.env.USDA_API_KEY
  if (!key) throw new Error('Food search is not configured.')
  const response = await fetch(
    `https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${encodeURIComponent(key)}&query=${encodeURIComponent(query)}&pageSize=15`,
    { signal: AbortSignal.timeout(12000) },
  )
  if (!response.ok) throw new Error('Food search is temporarily unavailable.')
  const data: USDASearchResponse = await response.json()
  return data.foods.map((food) => {
    const grams =
      food.servingSize && food.servingSizeUnit?.toLowerCase() === 'g' ? food.servingSize : 100
    return {
      name: food.description,
      fdcId: food.fdcId,
      serving: { amount: grams, unit: 'g', gramWeight: grams },
      nutrients: convertNutrients(extractMacrosFromUSDA(food.foodNutrients ?? []), grams / 100),
      estimated: false,
    }
  })
}

export async function lookupBarcode(barcode: string): Promise<FoodSnapshot | null> {
  if (!/^\d{8,14}$/.test(barcode)) return null
  const response = await fetch(
    `https://world.openfoodfacts.org/api/v2/product/${barcode}.json?fields=product_name,nutriments,serving_quantity,serving_size`,
    {
      headers: { 'User-Agent': 'Mora/1.0 (nutrition tracking)' },
      signal: AbortSignal.timeout(12000),
    },
  )
  if (!response.ok) throw new Error('Barcode lookup is temporarily unavailable.')
  const data = await response.json()
  if (data.status !== 1 || !data.product?.nutriments) return null
  const product = data.product
  const number = (key: string) => Math.max(0, Number(product.nutriments[key]) || 0)
  // The API's 100g field also represents 100ml for liquids. Only use a serving
  // conversion when the package declares an unambiguous mass or volume unit.
  const unit = /\bml\b/i.test(product.serving_size ?? '') ? 'ml' : 'g'
  const grams =
    Number.isFinite(Number(product.serving_quantity)) && Number(product.serving_quantity) > 0
      ? Number(product.serving_quantity)
      : 100
  return {
    name: product.product_name || 'Packaged food',
    serving: { amount: grams, unit, gramWeight: unit === 'g' ? grams : 0 },
    nutrients: convertNutrients(
      {
        calories: number('energy-kcal_100g'),
        protein: number('proteins_100g'),
        carbs: number('carbohydrates_100g'),
        fat: number('fat_100g'),
        fiber: number('fiber_100g'),
        sugar: number('sugars_100g'),
        sodium: number('sodium_100g') * 1000,
      },
      grams / 100,
    ),
    estimated: false,
  }
}
