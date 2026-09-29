import { backToJournal } from '@/lib/navigation'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { Screen } from '@/components/ui/screen'
import { Text } from '@/components/ui/text'
import { useDailyLogStore } from '@/stores/daily-log-store'
import { useTrackingStore } from '@/stores/tracking-store'
import { spacing } from '@/theme'
import { formatDateKey } from '@/types/nutrition'
import { parsePositiveNumber } from '@/utils/tracking'
import { useLocalSearchParams } from 'expo-router'
import { useState } from 'react'
import { View } from 'react-native'

export default function ActivityScreen() {
  const {
    kind = 'exercise',
    date,
    amount,
  } = useLocalSearchParams<{ kind: string; date?: string; amount?: string }>()
  const currentDate = useDailyLogStore((s) => s.currentDate)
  const store = useTrackingStore()
  const [name, setName] = useState('')
  const [value, setValue] = useState(amount ?? '')
  const [entryDate, setEntryDate] = useState(date ?? currentDate)
  const [minutes, setMinutes] = useState('30')
  const [error, setError] = useState('')
  const unit = store.profile.units === 'imperial' ? 'lb' : 'kg'
  const title =
    kind === 'weight' ? 'Log weight' : kind === 'steps' ? 'Log steps' : 'Log exercise'
  const save = () => {
    const number = kind === 'steps' && value.trim() === '0' ? 0 : parsePositiveNumber(value)
    if (number === null) {
      setError('Enter a valid amount greater than zero.')
      return
    }
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(entryDate) ||
      Number.isNaN(new Date(`${entryDate}T12:00:00`).getTime()) ||
      formatDateKey(new Date(`${entryDate}T12:00:00`)) !== entryDate ||
      entryDate > formatDateKey()
    ) {
      setError('Choose a valid date, today or earlier.')
      return
    }
    if (kind === 'weight') {
      const kg = unit === 'lb' ? number / 2.2046226218 : number
      if (kg > 500) {
        setError('Check the weight and units.')
        return
      }
      store.logWeight(kg, entryDate)
    } else if (kind === 'steps') store.setSteps(entryDate, number)
    else {
      const duration = parsePositiveNumber(minutes, 1440)
      if (!name.trim() || !duration || number > 10000) {
        setError('Add the activity name, duration, and calories burned.')
        return
      }
      store.addExercise(entryDate, {
        name: name.trim(),
        minutes: duration,
        calories: number,
        estimated: false,
      })
    }
    backToJournal()
  }
  return (
    <Screen title={title} subtitle={`For ${entryDate}`} header={false}>
      {kind === 'exercise' && (
        <>
          <Field
            label="Activity"
            placeholder="Walking, lifting, cycling…"
            value={name}
            onChangeText={setName}
          />
          <Field
            label="Duration in minutes"
            keyboardType="decimal-pad"
            value={minutes}
            onChangeText={setMinutes}
          />
        </>
      )}
      <Field
        label={
          kind === 'weight'
            ? `Weight in ${unit}`
            : kind === 'steps'
              ? 'Steps'
              : 'Calories burned'
        }
        keyboardType="decimal-pad"
        value={value}
        onChangeText={setValue}
        autoFocus
      />
      {kind === 'weight' && (
        <Field
          label="Date (YYYY-MM-DD)"
          value={entryDate}
          onChangeText={setEntryDate}
          autoCapitalize="none"
        />
      )}
      {kind === 'exercise' && (
        <Text tone="muted">
          Enter the calories from your workout tracker. You can choose whether to add them to
          your daily budget in settings.
        </Text>
      )}
      {!!error && <Text tone="danger">{error}</Text>}
      <View style={{ gap: spacing.sm }}>
        <Button title="Save" onPress={save} />
        <Button title="Cancel" variant="ghost" onPress={() => backToJournal()} />
      </View>
    </Screen>
  )
}
