import { backToJournal } from '@/lib/navigation'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { Screen } from '@/components/ui/screen'
import { Text } from '@/components/ui/text'
import { useDailyLogStore } from '@/stores/daily-log-store'
import { useTrackingStore } from '@/stores/tracking-store'
import { spacing } from '@/theme'
import { formatServing, type FoodLogEntry, type FoodSnapshot } from '@/types/nutrition'
import { parsePositiveNumber } from '@/utils/tracking'
import { useLocalSearchParams } from 'expo-router'
import { useState } from 'react'
import { View } from 'react-native'

export default function FoodEditorScreen() {
  const params = useLocalSearchParams<{ food?: string; entryId?: string }>()
  const existing = useDailyLogStore((s) => s.log.entries.find((e) => e.id === params.entryId))
  const [initial] = useState<FoodSnapshot | null>(() => {
    try {
      return existing?.snapshot ?? (params.food ? JSON.parse(params.food) : null)
    } catch {
      return null
    }
  })
  const [name, setName] = useState(initial?.name ?? '')
  const [serving, setServing] = useState(initial ? formatServing(initial.serving) : '1 serving')
  const [quantity, setQuantity] = useState(String(existing?.quantity ?? 1))
  const [meal, setMeal] = useState<FoodLogEntry['meal']>(existing?.meal ?? 'snack')
  const [values, setValues] = useState(() =>
    Object.fromEntries(
      ['calories', 'protein', 'carbs', 'fat', 'fiber', 'sugar', 'sodium'].map((key) => [
        key,
        String(initial?.nutrients[key as keyof FoodSnapshot['nutrients']] ?? ''),
      ]),
    ),
  )
  const [error, setError] = useState('')
  const save = (favorite: boolean) => {
    const portions = parsePositiveNumber(quantity, 2000)
    const nutrients = Object.fromEntries(
      Object.entries(values).map(([key, value]) => [
        key,
        Number(value.trim().replace(',', '.')),
      ]),
    ) as FoodSnapshot['nutrients']
    if (
      !name.trim() ||
      !serving.trim() ||
      !portions ||
      !values.calories.trim() ||
      Object.values(nutrients).some(
        (value) => !Number.isFinite(value) || value < 0 || value > 10000,
      )
    ) {
      setError('Add a food name, serving, and valid nutrition amounts.')
      return
    }
    const snapshot: FoodSnapshot = {
      name: name.trim(),
      serving:
        initial && serving.trim() === formatServing(initial.serving)
          ? initial.serving
          : { amount: 1, unit: serving.trim(), gramWeight: initial?.serving.gramWeight ?? 0 },
      nutrients,
      fdcId: initial?.fdcId,
      estimated: initial?.estimated ?? false,
    }
    const entry = { snapshot, quantity: portions, meal }
    if (existing) useDailyLogStore.getState().updateEntry(existing.id, entry)
    else useDailyLogStore.getState().addEntry(entry)
    if (favorite) useTrackingStore.getState().saveMeal(name.trim(), [entry])
    backToJournal()
  }
  return (
    <Screen
      title={existing ? 'Edit food' : 'Add food'}
      subtitle="Nutrition amounts are per serving. Your log multiplies them by the number of servings."
      header={false}
    >
      <Field label="Food name" value={name} onChangeText={setName} maxLength={200} />
      <Field label="Serving description" value={serving} onChangeText={setServing} />
      <Field
        label="Number of servings"
        value={quantity}
        onChangeText={setQuantity}
        keyboardType="decimal-pad"
      />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
        {(['breakfast', 'lunch', 'dinner', 'snack'] as const).map((value) => (
          <Button
            key={value}
            title={value[0].toUpperCase() + value.slice(1)}
            variant={value === meal ? 'primary' : 'secondary'}
            onPress={() => setMeal(value)}
          />
        ))}
      </View>
      {Object.keys(values).map((key) => (
        <Field
          key={key}
          label={
            key === 'calories'
              ? 'Calories per serving'
              : `${key[0].toUpperCase() + key.slice(1)} in ${key === 'sodium' ? 'milligrams' : 'grams'}`
          }
          value={values[key]}
          onChangeText={(value) => setValues((previous) => ({ ...previous, [key]: value }))}
          keyboardType="decimal-pad"
        />
      ))}
      {!!error && <Text tone="danger">{error}</Text>}
      <Button title={existing ? 'Save changes' : 'Log food'} onPress={() => save(false)} />
      <Button
        title={existing ? 'Save changes and favorite' : 'Log and save as favorite'}
        variant="secondary"
        onPress={() => save(true)}
      />
    </Screen>
  )
}
