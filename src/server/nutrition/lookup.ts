import { lookupFoodCache, writeFoodCache } from '@/server/nutrition/food-cache'
import {
  convertNutrients,
  type MacroTotals,
  type USDAFoodFull,
  type USDASearchResponse,
} from '@/types/nutrition'
import { nutritionEstimateSchema } from './nutrition-estimate'
import { resolveServing } from './serving'

import type { LookupAndLogFoodInput } from '@/server/ai/schemas'

const USDA_API_KEY = process.env.USDA_API_KEY
const USDA_BASE_URL = 'https://api.nal.usda.gov/fdc/v1'
const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY

async function searchPerplexityNutrition(
  foodQuery: string,
  servingUnit?: string,
): Promise<(MacroTotals & { servingDescription?: string }) | null> {
  if (!PERPLEXITY_API_KEY) return null

  try {
    const res = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${PERPLEXITY_API_KEY}`,
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(12000),
      body: JSON.stringify({
        model: 'sonar',
        messages: [
          {
            role: 'system',
            content:
              'You are a nutrition data lookup tool. Return ONLY valid JSON with no other text. Search for accurate nutrition information for the requested food.',
          },
          {
            role: 'user',
            content: `What are the nutrition facts for one ${servingUnit || 'standard serving'} of "${foodQuery}"? Give nutrients for exactly this unit, not for the total eaten. If this is a restaurant or branded item, use the actual published nutrition data. Return ONLY this JSON format, no other text:\n{"calories":0,"protein":0,"carbs":0,"fat":0,"fiber":0,"sugar":0,"servingDescription":"1 medium"}`,
          },
        ],
        temperature: 0.1,
      }),
    })

    if (!res.ok) {
      return null
    }

    const data = await res.json()
    const content = data.choices?.[0]?.message?.content?.trim()
    if (!content) return null

    const jsonMatch = content.match(/\{[\s\S]*?\}/)
    if (!jsonMatch) {
      return null
    }

    const parsed = nutritionEstimateSchema.safeParse(JSON.parse(jsonMatch[0]))
    if (!parsed.success) return null
    const result = parsed.data
    if (result.calories === 0 && result.protein === 0 && result.carbs === 0 && result.fat === 0)
      return null

    return result
  } catch (error) {
    console.error('[PERPLEXITY] Error:', error)
    return null
  }
}

function enhanceQuery(query: string): string {
  const normalized = query.toLowerCase().trim().replace(/\s+/g, ' ')

  if (
    /\b(raw|cooked|fried|baked|grilled|roasted|steamed|boiled|scrambled|poached|sauteed|sautéed)\b/i.test(
      normalized,
    )
  ) {
    return normalized
  }

  const rawFoods =
    /\b(banana|apple|orange|grape|strawberry|blueberry|mango|peach|pear|plum|cherry|avocado|tomato|carrot|celery|cucumber|spinach|lettuce|broccoli|pepper|onion|chicken|beef|pork|salmon|tuna|egg)\b/i

  if (rawFoods.test(normalized)) {
    return `${normalized} raw`
  }

  return normalized
}

export async function executeLookupAndLogFood({
  foodQuery,
  displayName,
  quantity = 1,
  meal,
  estimatedCalories,
  estimatedProtein,
  estimatedCarbs,
  estimatedFat,
  estimatedFiber,
  estimatedSugar,
  servingUnit,
}: LookupAndLogFoodInput) {
  const cacheQuery = `${foodQuery} | serving-v3 ${servingUnit || 'standard'}`
  try {
    const cached = await lookupFoodCache(cacheQuery, true)
    if (cached) {
      return {
        success: true,
        entry: {
          name: displayName,
          quantity,
          serving: {
            amount: 1,
            unit: (cached.servingDescription || 'serving').replace(/^1\s+/, ''),
            gramWeight: cached.servingGramWeight ?? 0,
          },
          nutrients: {
            calories: cached.calories,
            protein: cached.protein,
            carbs: cached.carbs,
            fat: cached.fat,
            fiber: cached.fiber,
            sugar: cached.sugar,
            sodium: cached.sodium,
          },
          meal,
          fdcId: cached.fdcId,
        },
        estimated: cached.source !== 'usda',
        source: cached.source,
        message: `Prepared for confirmation: ${quantity} ${displayName} (${cached.source === 'usda' ? '' : cached.source + ': '}${cached.calories} cal)`,
      }
    }
  } catch (cacheErr) {
    console.error('[LOOKUP] Cache lookup error:', cacheErr)
  }

  const estimate = nutritionEstimateSchema.safeParse({
    calories: estimatedCalories,
    protein: estimatedProtein,
    carbs: estimatedCarbs,
    fat: estimatedFat,
    fiber: estimatedFiber,
    sugar: estimatedSugar,
  })
  const llmFallback = estimate.success ? estimate.data : null

  const buildEntry = (
    nutrients: MacroTotals,
    source: 'usda' | 'perplexity' | 'estimate',
    servingDesc?: string,
    fdcId?: number,
  ) => {
    const gramWeight = /^(g|grams?)$/i.test(servingUnit || '')
      ? 1
      : /^(oz|ounces?)$/i.test(servingUnit || '')
        ? 28.349523125
        : /^(lb|pounds?)$/i.test(servingUnit || '')
          ? 453.59237
          : /^(kg|kilograms?)$/i.test(servingUnit || '')
            ? 1000
            : 0
    const description = servingUnit || servingDesc || 'serving'
    writeFoodCache(cacheQuery, {
      ...nutrients,
      source,
      servingDescription: description,
      servingGramWeight: gramWeight,
      fdcId,
    }).catch(() => {})

    return {
      success: true,
      entry: {
        name: displayName,
        quantity,
        serving: {
          amount: 1,
          unit: description.replace(/^1\s+/, ''),
          gramWeight,
        },
        nutrients,
        meal,
      },
      estimated: source !== 'usda',
      source,
      message: `Prepared for confirmation: ${quantity} ${displayName} (${source === 'usda' ? '' : source + ': '}${nutrients.calories} cal)`,
    }
  }

  const tryFallbacks = async () => {
    const pplx = await searchPerplexityNutrition(foodQuery, servingUnit)
    if (pplx) {
      return buildEntry(pplx, 'perplexity', pplx.servingDescription)
    }
    if (llmFallback) {
      return buildEntry(llmFallback, 'estimate')
    }
    return null
  }

  if (!USDA_API_KEY) {
    const fallback = await tryFallbacks()
    if (fallback) return fallback
    return {
      success: false,
      error: 'No API keys configured. Please provide estimated macros.',
      message:
        'Could not look up food. Please provide your best estimate for calories, protein, carbs, and fat.',
    }
  }

  try {
    const enhancedQuery = enhanceQuery(foodQuery)
    const searchParams = new URLSearchParams({
      api_key: USDA_API_KEY,
      query: enhancedQuery,
      pageSize: '5',
      dataType: 'Survey (FNDDS),Foundation,SR Legacy',
    })
    const searchRes = await fetch(`${USDA_BASE_URL}/foods/search?${searchParams}`, {
      signal: AbortSignal.timeout(10000),
    })

    if (!searchRes.ok) {
      const fallback = await tryFallbacks()
      if (fallback) return fallback
      throw new Error(`USDA API error: ${searchRes.status}`)
    }

    const searchData = (await searchRes.json()) as USDASearchResponse

    if (!searchData.foods?.length) {
      const fallback = await tryFallbacks()
      if (fallback) return fallback
      return {
        success: false,
        error: 'Food not found. Please provide estimated macros.',
        foodQuery,
        message: `Could not find "${foodQuery}". Please provide your best estimate for calories, protein, carbs, and fat.`,
      }
    }

    const queryWords = enhancedQuery
      .toLowerCase()
      .split(' ')
      .filter((w) => w.length > 2)
    let bestMatch = searchData.foods[0]
    let bestScore = -1

    for (const food of searchData.foods) {
      const desc = food.description.toLowerCase()
      const matchCount = queryWords.filter((w) => desc.includes(w)).length
      const dataTypeBonus = food.dataType === 'Survey (FNDDS)' ? 0.5 : 0
      const wordCount = desc.split(/[,\s]+/).length
      const simplicityBonus = wordCount <= 4 ? 0.3 : 0
      const score = matchCount + dataTypeBonus + simplicityBonus

      if (score > bestScore) {
        bestMatch = food
        bestScore = score
      }
    }

    const bestMatchCount = queryWords.filter((w) =>
      bestMatch.description.toLowerCase().includes(w),
    ).length
    const matchRatio = queryWords.length > 0 ? bestMatchCount / queryWords.length : 0

    if (matchRatio < 1) {
      const fallback = await tryFallbacks()
      if (fallback) return fallback
    }

    const fdcId = bestMatch.fdcId
    const detailRes = await fetch(`${USDA_BASE_URL}/food/${fdcId}?api_key=${USDA_API_KEY}`, {
      signal: AbortSignal.timeout(10000),
    })
    if (!detailRes.ok) {
      const fallback = await tryFallbacks()
      if (fallback) return fallback
      throw new Error(`USDA API error: ${detailRes.status}`)
    }

    const food = (await detailRes.json()) as USDAFoodFull
    const getNutrient = (ids: number[]) => {
      for (const id of ids) {
        const nutrient = food.foodNutrients?.find(
          (n: any) =>
            n.nutrientId === id || n.nutrient?.id === id || n.nutrientNumber === String(id),
        )
        if (nutrient) {
          const value = nutrient.value ?? nutrient.amount ?? 0
          if (value > 0) return value
        }
      }
      return 0
    }

    const rawCalories = getNutrient([1008, 208, 2047, 2048])
    const rawProtein = getNutrient([1003, 203])
    const rawCarbs = getNutrient([1005, 205])
    const rawFat = getNutrient([1004, 204])

    const calculatedCalories = rawProtein * 4 + rawCarbs * 4 + rawFat * 9
    const calories = rawCalories > 0 ? rawCalories : calculatedCalories

    const macros = {
      calories,
      protein: rawProtein,
      carbs: rawCarbs,
      fat: rawFat,
      fiber: getNutrient([1079, 291]),
      sugar: getNutrient([2000, 1063, 269]),
      sodium: getNutrient([1093, 307]),
    }

    if (
      macros.calories === 0 &&
      macros.protein === 0 &&
      macros.carbs === 0 &&
      macros.fat === 0
    ) {
      const fallback = await tryFallbacks()
      if (fallback) return fallback
      return {
        success: false,
        error: 'Nutrient data incomplete. Please provide estimated macros.',
        foodQuery,
        fdcId,
        message: `Found "${food.description}" but nutrient data is incomplete. Please provide your best estimate.`,
      }
    }

    const serving = resolveServing(food.foodPortions, servingUnit)

    const nutrients = convertNutrients(macros, serving.gramWeight / 100)

    writeFoodCache(cacheQuery, {
      ...nutrients,
      source: 'usda',
      servingDescription: `${serving.amount === 1 ? '' : serving.amount + ' '}${serving.unit}`,
      servingGramWeight: serving.gramWeight,
      fdcId,
    }).catch(() => {})

    return {
      success: true,
      entry: {
        name: displayName,
        quantity,
        serving,
        nutrients,
        meal,
        fdcId,
      },
      estimated: false,
      source: 'usda',
      message: `Prepared for confirmation: ${quantity} ${serving.unit} ${displayName} - ${Math.round(nutrients.calories * quantity)} cal, ${Math.round(nutrients.protein * quantity * 10) / 10}g protein`,
    }
  } catch (error) {
    console.error('[LOOKUP] Error:', error)
    const fallback = await tryFallbacks()
    if (fallback) return fallback
    return {
      success: false,
      error: 'API error occurred. Please provide estimated macros.',
      foodQuery,
      message: `Error looking up "${foodQuery}". Please provide your best estimate for calories, protein, carbs, and fat.`,
    }
  }
}
