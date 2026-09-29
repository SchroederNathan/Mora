import { backToJournal } from '@/lib/navigation'
import { useTrackingStore } from '@/stores/tracking-store'
import { GoalCalculator } from '@/features/goals/goal-calculator'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { Screen } from '@/components/ui/screen'
import { Text } from '@/components/ui/text'
import { useUserStore } from '@/stores/user-store'
import { spacing } from '@/theme'
import type { UserGoals } from '@/types/nutrition'
import { parsePositiveNumber } from '@/utils/tracking'
import { useState } from 'react'
import { View } from 'react-native'

export default function GoalsScreen() {
  const profile = useTrackingStore((s) => s.profile)
  const goals = useUserStore((s) => s.goals)
  const setGoals = useUserStore((s) => s.setGoals)
  const [values, setValues] = useState(() =>
    Object.fromEntries(Object.entries(goals).map(([key, value]) => [key, String(value)])),
  )
  const [error, setError] = useState('')
  const save = () => {
    const parsed = Object.fromEntries(
      Object.entries(values).map(([key, value]) => [
        key,
        parsePositiveNumber(value, key === 'calories' ? 10000 : 1000),
      ]),
    )
    if (Object.values(parsed).some((value) => value === null)) {
      setError('Enter a positive number for each goal.')
      return
    }
    setGoals(parsed as UserGoals)
    backToJournal()
  }
  return (
    <Screen
      title="Daily nutrition goals"
      subtitle="Set targets that work for you. These are tracking goals, not medical advice."
      header={false}
    >
      <GoalCalculator
        current={{
          calories: Number(values.calories),
          protein: Number(values.protein),
          carbs: Number(values.carbs),
          fat: Number(values.fat),
        }}
        focus={profile.goal}
        units={profile.units}
        onApply={(targets) => {
          setValues(
            Object.fromEntries(
              Object.entries(targets).map(([key, value]) => [key, String(value)]),
            ),
          )
          setError('')
        }}
      />
      {(['calories', 'protein', 'carbs', 'fat'] as const).map((key) => (
        <Field
          key={key}
          label={
            key === 'calories' ? 'Calories' : `${key[0].toUpperCase()}${key.slice(1)} in grams`
          }
          keyboardType="decimal-pad"
          value={values[key]}
          onChangeText={(value) => setValues((previous) => ({ ...previous, [key]: value }))}
        />
      ))}
      {!!error && <Text tone="danger">{error}</Text>}
      <View style={{ gap: spacing.sm }}>
        <Button title="Save goals" onPress={save} />
        <Button title="Cancel" variant="ghost" onPress={() => backToJournal()} />
      </View>
    </Screen>
  )
}
