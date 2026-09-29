import { backToJournal } from '@/lib/navigation'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { Screen } from '@/components/ui/screen'
import { Text } from '@/components/ui/text'
import { useTrackingStore } from '@/stores/tracking-store'
import { spacing } from '@/theme'
import { parsePositiveNumber } from '@/utils/tracking'
import { useState } from 'react'
import { View } from 'react-native'

export default function ProfileScreen() {
  const profile = useTrackingStore((s) => s.profile)
  const update = useTrackingStore((s) => s.setProfile)
  const [name, setName] = useState(profile.name)
  const imperial = profile.units === 'imperial'
  const [goal, setGoal] = useState(profile.goal)
  const [height, setHeight] = useState(
    profile.heightCm ? (profile.heightCm / (imperial ? 2.54 : 1)).toFixed(1) : '',
  )
  const [weight, setWeight] = useState(
    profile.goalWeightKg
      ? (profile.goalWeightKg * (imperial ? 2.2046226218 : 1)).toFixed(1)
      : '',
  )
  const [error, setError] = useState('')
  const save = () => {
    const parsedHeight = height.trim()
      ? parsePositiveNumber(height, imperial ? 108 : 275)
      : null
    const heightCm = parsedHeight ? parsedHeight * (imperial ? 2.54 : 1) : null
    const parsedWeight = weight.trim()
      ? parsePositiveNumber(weight, imperial ? 1102 : 500)
      : null
    const goalWeightKg = parsedWeight ? parsedWeight / (imperial ? 2.2046226218 : 1) : null
    if ((height.trim() && !heightCm) || (weight.trim() && !goalWeightKg)) {
      setError('Check your height and goal weight.')
      return
    }
    update({ name: name.trim(), heightCm, goalWeightKg, goal })
    backToJournal()
  }
  return (
    <Screen title="Personal details" header={false}>
      <Field
        label="Name"
        value={name}
        onChangeText={setName}
        autoComplete="given-name"
        maxLength={80}
      />
      <Field
        label={imperial ? 'Height in inches' : 'Height in cm'}
        value={height}
        onChangeText={setHeight}
        keyboardType="decimal-pad"
      />
      <Field
        label={imperial ? 'Goal weight in lb' : 'Goal weight in kg'}
        value={weight}
        onChangeText={setWeight}
        keyboardType="decimal-pad"
      />
      <Text variant="label" tone="muted">
        Your focus
      </Text>
      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        {(['lose', 'maintain', 'gain'] as const).map((option) => (
          <Button
            key={option}
            style={{ flex: 1, paddingHorizontal: spacing.sm }}
            title={option[0].toUpperCase() + option.slice(1)}
            variant={goal === option ? 'primary' : 'secondary'}
            onPress={() => setGoal(option)}
          />
        ))}
      </View>
      {!!error && <Text tone="danger">{error}</Text>}
      <Button title="Save details" onPress={save} />
    </Screen>
  )
}
