import { backToJournal } from '@/lib/navigation'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { Screen } from '@/components/ui/screen'
import { Text } from '@/components/ui/text'
import { useDailyLogStore } from '@/stores/daily-log-store'
import { useTrackingStore } from '@/stores/tracking-store'
import { spacing } from '@/theme'
import { sumMacros } from '@/types/nutrition'
import { useState } from 'react'
import { View } from 'react-native'

export default function MealBuilderScreen() {
  const savedMeals = useTrackingStore((s) => s.savedMeals)
  const [name, setName] = useState('')
  const [selected, setSelected] = useState<Record<string, number>>({})
  const [error, setError] = useState('')
  const entries = savedMeals.flatMap((meal) =>
    selected[meal.id] > 0
      ? meal.entries.map((entry) => ({
          ...entry,
          quantity: entry.quantity * selected[meal.id],
        }))
      : [],
  )
  const totals = sumMacros(entries)
  const save = (log: boolean) => {
    if (!name.trim() || !entries.length) {
      setError('Name your meal and choose at least one saved food.')
      return
    }
    useTrackingStore.getState().saveMeal(name.trim(), entries)
    if (log) useDailyLogStore.getState().addMeal(entries, name.trim())
    backToJournal()
  }
  return (
    <Screen
      title="Create a meal"
      subtitle="Combine your saved foods, then reuse the meal whenever you like."
      header={false}
    >
      <Field
        label="Meal name"
        placeholder="My usual breakfast"
        value={name}
        onChangeText={setName}
        maxLength={120}
      />
      {savedMeals.length === 0 && (
        <Text tone="muted">Save a food from your daily log to start building meals.</Text>
      )}
      {savedMeals.map((meal) => (
        <View key={meal.id} style={{ gap: spacing.sm }}>
          <Text variant="label">{meal.name}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
            <Button
              title="−"
              accessibilityLabel={`Decrease ${meal.name} portions`}
              variant="secondary"
              onPress={() =>
                setSelected((previous) => ({
                  ...previous,
                  [meal.id]: Math.max(0, (previous[meal.id] ?? 0) - 0.5),
                }))
              }
            />
            <Text style={{ flex: 1, textAlign: 'center' }}>
              {selected[meal.id] ?? 0} portions
            </Text>
            <Button
              title="+"
              accessibilityLabel={`Increase ${meal.name} portions`}
              variant="secondary"
              onPress={() =>
                setSelected((previous) => ({
                  ...previous,
                  [meal.id]: Math.min(10, (previous[meal.id] ?? 0) + 0.5),
                }))
              }
            />
          </View>
        </View>
      ))}
      <Text variant="heading">{totals.calories} cal</Text>
      <Text tone="muted">
        {totals.protein}g protein · {totals.carbs}g carbs · {totals.fat}g fat
      </Text>
      {!!error && <Text tone="danger">{error}</Text>}
      <Button title="Save meal" onPress={() => save(false)} />
      <Button title="Save and log meal" variant="secondary" onPress={() => save(true)} />
    </Screen>
  )
}
