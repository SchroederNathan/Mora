import { authenticated } from '@/server/auth'
import { lookupBarcode, searchFoods } from '@/server/nutrition/search'

export const GET = authenticated(async (request) => {
  const url = new URL(request.url)
  const barcode = url.searchParams.get('barcode')
  const query = url.searchParams.get('q')?.trim() ?? ''
  if (barcode) {
    if (!/^\d{8,14}$/.test(barcode))
      return Response.json({ error: 'Invalid barcode.' }, { status: 400 })
    const food = await lookupBarcode(barcode)
    return Response.json({ foods: food ? [food] : [], source: 'Open Food Facts' })
  }
  if (query.length < 2 || query.length > 200)
    return Response.json({ error: 'Enter 2–200 characters.' }, { status: 400 })
  return Response.json({ foods: await searchFoods(query), source: 'USDA FoodData Central' })
})
