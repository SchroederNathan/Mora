import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { Screen } from '@/components/ui/screen'
import { Text } from '@/components/ui/text'
import { authenticatedFetch } from '@/lib/api-client'
import { useDailyLogStore } from '@/stores/daily-log-store'
import { useTrackingStore } from '@/stores/tracking-store'
import { spacing, useTheme } from '@/theme'
import { sumMacros, type FoodSnapshot } from '@/types/nutrition'
import { generateAPIUrl } from '@/utils'
import { router, useLocalSearchParams } from 'expo-router'
import { Bookmark, Plus, Search } from 'lucide-react-native'
import { useEffect, useState } from 'react'
import { Pressable, View } from 'react-native'

export default function FoodLibraryScreen() {
  const { barcode, tab: initialTab } = useLocalSearchParams<{
    barcode?: string
    tab?: string
  }>()
  const theme = useTheme()
  const [tab, setTab] = useState<'search' | 'saved'>(
    initialTab === 'saved' ? 'saved' : 'search',
  )
  const [query, setQuery] = useState('')
  const requestKey = barcode || query.trim()
  const canSearch = !!barcode || requestKey.length >= 2
  const [result, setResult] = useState<{
    key: string
    foods: FoodSnapshot[]
    source: string
    error: string
  } | null>(null)
  const loading = canSearch && result?.key !== requestKey
  const foods = canSearch && result?.key === requestKey ? result.foods : []
  const source = result?.key === requestKey ? result.source : ''
  const error = result?.key === requestKey ? result.error : ''
  const [notice, setNotice] = useState('')
  const saved = useTrackingStore((s) => s.savedMeals)
  const addMeal = useDailyLogStore((s) => s.addMeal)
  useEffect(() => {
    if (!canSearch) return
    const controller = new AbortController()
    const timeout = setTimeout(
      async () => {
        try {
          const response = await authenticatedFetch(
            generateAPIUrl(
              `/api/foods?${barcode ? `barcode=${encodeURIComponent(barcode)}` : `q=${encodeURIComponent(query.trim())}`}`,
            ),
            { signal: controller.signal },
          )
          const data = await response.json()
          if (!response.ok) throw new Error(data.error || 'Could not search foods.')
          if (!controller.signal.aborted)
            setResult({ key: requestKey, foods: data.foods, source: data.source, error: '' })
        } catch (e) {
          if (!controller.signal.aborted)
            setResult({
              key: requestKey,
              foods: [],
              source: '',
              error: e instanceof Error ? e.message : 'Could not search foods.',
            })
        }
      },
      barcode ? 0 : 300,
    )
    return () => {
      clearTimeout(timeout)
      controller.abort()
    }
  }, [barcode, query, requestKey, canSearch])
  return (
    <Screen
      title="Foods & meals"
      subtitle="Find a food, reuse a favorite, or enter your own."
      header={false}
    >
      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        <Button
          style={{ flex: 1 }}
          title="Search"
          variant={tab === 'search' ? 'primary' : 'secondary'}
          onPress={() => setTab('search')}
        />
        <Button
          style={{ flex: 1 }}
          title="Saved"
          variant={tab === 'saved' ? 'primary' : 'secondary'}
          onPress={() => setTab('saved')}
        />
      </View>
      {tab === 'search' ? (
        <>
          {!barcode && (
            <Field
              label="Search food database"
              placeholder="Greek yogurt, chicken, avocado…"
              value={query}
              onChangeText={setQuery}
            />
          )}
          {loading && <Text tone="muted">Searching food database…</Text>}
          {!!error && <Text tone="danger">{error}</Text>}
          {!loading && !error && foods.length === 0 && (
            <View style={{ gap: spacing.md, paddingVertical: spacing.xl }}>
              <Search size={28} color={theme.primary} />
              <Text variant="heading">
                {query.length >= 2 || barcode ? 'No matching food' : 'What are you having?'}
              </Text>
              <Text tone="muted">
                {barcode
                  ? 'Try searching the name or enter the nutrition label.'
                  : 'Search by food or brand. You can review the portion before logging.'}
              </Text>
            </View>
          )}
          {foods.map((food) => (
            <Pressable
              key={food.fdcId ?? food.name}
              accessibilityRole="button"
              accessibilityLabel={`${food.name}, ${Math.round(food.nutrients.calories)} calories per ${food.serving.amount} ${food.serving.unit}`}
              onPress={() =>
                router.push({
                  pathname: '/food-editor',
                  params: { food: JSON.stringify(food) },
                })
              }
              style={({ pressed }) => ({
                flexDirection: 'row',
                gap: spacing.lg,
                alignItems: 'center',
                paddingVertical: spacing.lg,
                borderBottomWidth: 1,
                borderColor: theme.border,
                opacity: pressed ? 0.6 : 1,
              })}
            >
              <View style={{ flex: 1 }}>
                <Text>{food.name}</Text>
                <Text variant="caption" tone="muted">
                  {Math.round(food.nutrients.calories)} cal · {food.serving.amount}{' '}
                  {food.serving.unit}
                </Text>
              </View>
              <Plus size={20} color={theme.primary} />
            </Pressable>
          ))}
          {!!source && foods.length > 0 && (
            <Text variant="caption" tone="muted">
              Nutrition data from {source}. Check the serving against your package.
            </Text>
          )}
          <Button
            title="Scan a barcode"
            variant="secondary"
            onPress={() => router.push('/scan')}
          />
          <Button title="Add food manually" onPress={() => router.push('/food-editor')} />
        </>
      ) : (
        <>
          <Button
            title="Create a meal"
            variant="secondary"
            onPress={() => router.push('/meal-builder')}
          />
          {saved.length === 0 && (
            <View style={{ gap: spacing.md, paddingVertical: spacing.xl }}>
              <Bookmark size={28} color={theme.primary} />
              <Text variant="heading">Keep your favorites close</Text>
              <Text tone="muted">
                Save foods or meals from your daily log to add them again with one tap.
              </Text>
            </View>
          )}
          {saved.map((meal) => (
            <View
              key={meal.id}
              style={{
                gap: spacing.md,
                paddingVertical: spacing.lg,
                borderBottomWidth: 1,
                borderColor: theme.border,
              }}
            >
              <Text variant="heading">{meal.name}</Text>
              <Text tone="muted">
                {sumMacros(meal.entries).calories} cal · {meal.entries.length}{' '}
                {meal.entries.length === 1 ? 'item' : 'items'}
              </Text>
              <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                <Button
                  title="Log again"
                  style={{ flex: 1 }}
                  onPress={() => {
                    addMeal(meal.entries, meal.name)
                    setNotice(`${meal.name} added to your log.`)
                  }}
                />
                <Button
                  title="Remove"
                  variant="ghost"
                  onPress={() => useTrackingStore.getState().removeSavedMeal(meal.id)}
                />
              </View>
            </View>
          ))}
        </>
      )}
      {!!notice && (
        <Text style={{ color: theme.success }} accessibilityLiveRegion="polite">
          {notice}
        </Text>
      )}
    </Screen>
  )
}
