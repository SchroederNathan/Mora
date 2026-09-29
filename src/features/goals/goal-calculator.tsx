import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { Text } from '@/components/ui/text'
import { useTrackingStore } from '@/stores/tracking-store'
import { radius, spacing, useTheme } from '@/theme'
import type { UserGoals } from '@/types/nutrition'
import { useState } from 'react'
import { Keyboard, Linking, View } from 'react-native'
import { activityLevels, estimateGoals, type GoalEstimateInput } from './estimate'

export function GoalCalculator({
  current,
  focus,
  units,
  onApply,
}: {
  current: UserGoals
  focus: GoalEstimateInput['focus']
  units: 'metric' | 'imperial'
  onApply: (goals: UserGoals) => void
}) {
  const theme = useTheme()
  const [step, setStep] = useState<number | null>(null)
  const profile = useTrackingStore((s) => s.profile)
  const weights = useTrackingStore((s) => s.weights)
  const imperial = units === 'imperial'
  const [age, setAge] = useState('')
  const [height, setHeight] = useState(
    profile.heightCm ? String(Math.round(profile.heightCm / (imperial ? 2.54 : 1))) : '',
  )
  const [weight, setWeight] = useState(
    weights.at(-1) ? (weights.at(-1)!.kg * (imperial ? 2.2046226218 : 1)).toFixed(1) : '',
  )
  const [equation, setEquation] = useState<GoalEstimateInput['equation'] | null>(null)
  const [activity, setActivity] = useState(1.6)
  const [adjustment, setAdjustment] = useState<250 | 500>(250)
  const [error, setError] = useState('')
  const [result, setResult] = useState<ReturnType<typeof estimateGoals> | null>(null)
  const calculate = () => {
    Keyboard.dismiss()
    setError('')
    if (!equation) {
      setError('Choose the equation to use, or keep your own targets.')
      return
    }
    try {
      setResult(
        estimateGoals(
          {
            age: Number(age),
            heightCm: Number(height.replace(',', '.')) * (imperial ? 2.54 : 1),
            weightKg: Number(weight.replace(',', '.')) / (imperial ? 2.2046226218 : 1),
            equation,
            activity,
            focus,
            adjustment,
          },
          current,
        ),
      )
      setStep(2)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Check your details and try again.')
    }
  }
  if (step === null)
    return (
      <Button
        title="Estimate starting targets"
        variant="secondary"
        onPress={() => {
          setStep(0)
          setError('')
        }}
      />
    )
  return (
    <View
      style={{
        gap: spacing.lg,
        borderWidth: 1,
        borderColor: theme.border,
        borderRadius: radius.lg,
        padding: spacing.lg,
      }}
    >
      <Text variant="heading">A starting point for you</Text>
      {step === 0 ? (
        <>
          <Text tone="muted">
            For adults who are not pregnant or breastfeeding. You can keep your own targets at
            any time.
          </Text>
          <Field
            label="Age in years"
            value={age}
            onChangeText={setAge}
            keyboardType="number-pad"
            maxLength={3}
          />
          <Field
            label={imperial ? 'Current height in inches' : 'Current height in cm'}
            value={height}
            onChangeText={setHeight}
            keyboardType="decimal-pad"
          />
          <Field
            label={imperial ? 'Current weight in lb' : 'Current weight in kg'}
            value={weight}
            onChangeText={setWeight}
            keyboardType="decimal-pad"
          />
          <Text variant="label">Equation to use</Text>
          <Text variant="caption" tone="muted">
            The published formula has two sex-based equations. These details stay on this
            device.
          </Text>
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            {(['female', 'male'] as const).map((option) => (
              <Button
                key={option}
                style={{ flex: 1, paddingHorizontal: spacing.sm }}
                title={option === 'female' ? 'Female equation' : 'Male equation'}
                variant={equation === option ? 'primary' : 'secondary'}
                onPress={() => setEquation(option)}
              />
            ))}
          </View>
          <Button
            title="Continue to activity"
            onPress={() => {
              Keyboard.dismiss()
              setError('')
              setStep(1)
            }}
          />
        </>
      ) : step === 1 ? (
        <>
          <Text tone="muted">
            Choose the level that describes your usual week, including exercise.
          </Text>
          {activityLevels.map((level) => (
            <View key={level.value} style={{ gap: spacing.xs }}>
              <Button
                title={level.label}
                variant={activity === level.value ? 'primary' : 'secondary'}
                onPress={() => setActivity(level.value)}
              />
              <Text variant="caption" tone="muted">
                {level.detail}
              </Text>
            </View>
          ))}
          {focus !== 'maintain' && (
            <>
              <Text variant="label">
                Daily {focus === 'lose' ? 'reduction' : 'addition'} from maintenance
              </Text>
              <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                {([250, 500] as const).map((value) => (
                  <Button
                    key={value}
                    style={{ flex: 1 }}
                    title={`${value} cal`}
                    variant={adjustment === value ? 'primary' : 'secondary'}
                    onPress={() => setAdjustment(value)}
                  />
                ))}
              </View>
              <Text variant="caption" tone="muted">
                An adjustment to your starting target. This does not predict a weekly weight
                change.
              </Text>
            </>
          )}
          <Button title="Calculate targets" onPress={calculate} />
          <Button
            title="Back to measurements"
            variant="ghost"
            onPress={() => {
              setStep(0)
              setError('')
            }}
          />
        </>
      ) : (
        result && (
          <>
            <Text variant="title">{result.goals.calories.toLocaleString()} cal / day</Text>
            <Text tone="muted">
              Estimated maintenance: {result.maintenance.toLocaleString()} cal.{' '}
              {result.goals.protein} g protein · {result.goals.carbs} g carbs ·{' '}
              {result.goals.fat} g fat.
            </Text>
            <Text variant="caption" tone="muted">
              Uses Mifflin–St Jeor and your activity level, then scales your current macro
              balance. It is an estimate; your needs can differ. Review and edit the targets
              below before saving. Activity is already included, so leave “Add exercise
              calories” off to avoid counting it twice.
            </Text>
            <Button
              title="Use these starting targets"
              onPress={() => {
                onApply(result.goals)
                setStep(null)
              }}
            />
            <Button title="Adjust calculation" variant="secondary" onPress={() => setStep(1)} />
            <Button
              title="How the equation works"
              variant="ghost"
              onPress={() => {
                void Linking.openURL('https://pubmed.ncbi.nlm.nih.gov/2305711/').catch(() =>
                  setError('Could not open the source. Try again later.'),
                )
              }}
            />
          </>
        )
      )}
      {!!error && (
        <Text tone="danger" accessibilityLiveRegion="polite">
          {error}
        </Text>
      )}
      <Button title="Keep my own targets" variant="ghost" onPress={() => setStep(null)} />
    </View>
  )
}
