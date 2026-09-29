import { GoalCalculator } from '@/features/goals/goal-calculator'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { Screen } from '@/components/ui/screen'
import { Text } from '@/components/ui/text'
import { useAuth } from '@/contexts/auth-context'
import { useTrackingStore, type Profile } from '@/stores/tracking-store'
import { useUserStore } from '@/stores/user-store'
import { radius, spacing, useTheme } from '@/theme'
import type { UserGoals } from '@/types/nutrition'
import { parsePositiveNumber } from '@/utils/tracking'
import { Stack } from 'expo-router'
import { Camera, ChartNoAxesCombined, MessageCircle } from 'lucide-react-native'
import { useState } from 'react'
import { View } from 'react-native'

export default function OnboardingScreen() {
  const { session, signInAnonymously } = useAuth()
  const theme = useTheme()
  const existingProfile = useTrackingStore((s) => s.profile)
  const returning = useTrackingStore((s) => s.onboardingComplete)
  const [step, setStep] = useState(0)
  const [name, setName] = useState(existingProfile.name)
  const [focus, setFocus] = useState<Profile['goal']>(existingProfile.goal)
  const [units, setUnits] = useState<Profile['units']>(existingProfile.units)
  const [values, setValues] = useState(() =>
    Object.fromEntries(
      Object.entries(useUserStore.getState().goals).map(([key, value]) => [key, String(value)]),
    ),
  )
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const start = async () => {
    if (loading) return
    const parsed = Object.fromEntries(
      Object.entries(values).map(([key, value]) => [
        key,
        parsePositiveNumber(value, key === 'calories' ? 10000 : 1000),
      ]),
    )
    if (Object.values(parsed).some((value) => value === null)) {
      setError('Enter a positive number for each target.')
      return
    }
    setLoading(true)
    setError('')
    try {
      if (!session) await signInAnonymously()
      useTrackingStore.getState().setProfile({ name: name.trim(), goal: focus, units })
      useUserStore.getState().setGoals(parsed as UserGoals)
      useTrackingStore.getState().completeOnboarding()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not get started. Please try again.')
      setLoading(false)
    }
  }
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <Screen>
        <Text variant="label" tone="primary" style={{ letterSpacing: 3 }}>
          MORA
        </Text>
        <View
          style={{ flexDirection: 'row', gap: spacing.sm }}
          accessibilityLabel={`Step ${step + 1} of 3`}
        >
          {[0, 1, 2].map((index) => (
            <View
              key={index}
              style={{
                flex: 1,
                height: 3,
                backgroundColor: index <= step ? theme.primary : theme.border,
                borderRadius: radius.full,
              }}
            />
          ))}
        </View>
        {step === 0 ? (
          <>
            <Text variant="hero">A little more{`\n`}balance.</Text>
            <Text tone="muted">
              Make tracking feel like a conversation. Tell Mora about your meal, review the
              details, and carry on with your day.
            </Text>
            <View style={{ gap: spacing.xl, paddingVertical: spacing.xl }}>
              {[
                {
                  Icon: MessageCircle,
                  title: 'Start with a conversation',
                  description: 'Type or talk through what you ate.',
                },
                {
                  Icon: Camera,
                  title: 'Point, snap, review',
                  description: 'Use a meal photo, nutrition label, or barcode.',
                },
                {
                  Icon: ChartNoAxesCombined,
                  title: 'See the bigger picture',
                  description: 'Keep food, water, activity, and progress together.',
                },
              ].map(({ Icon, title, description }) => (
                <View key={title} style={{ flexDirection: 'row', gap: spacing.lg }}>
                  <Icon size={24} color={theme.primary} />
                  <View style={{ flex: 1, gap: spacing.xs }}>
                    <Text variant="label">{title}</Text>
                    <Text tone="muted">{description}</Text>
                  </View>
                </View>
              ))}
            </View>
            <Button
              title={returning ? 'Continue with your journal' : 'Make it yours'}
              loading={loading}
              onPress={returning ? start : () => setStep(1)}
            />
            {!!error && <Text tone="danger">{error}</Text>}
          </>
        ) : step === 1 ? (
          <>
            <Text variant="title">Your pace. Your routine.</Text>
            <Field
              label="What should Mora call you?"
              placeholder="Your name (optional)"
              value={name}
              onChangeText={setName}
              maxLength={80}
              autoComplete="given-name"
            />
            <Text variant="label">What would you like to focus on?</Text>
            {(['maintain', 'lose', 'gain'] as const).map((goal) => (
              <Button
                key={goal}
                title={
                  {
                    maintain: 'Build balanced habits',
                    lose: 'Lose weight',
                    gain: 'Gain weight',
                  }[goal]
                }
                variant={focus === goal ? 'primary' : 'secondary'}
                onPress={() => setFocus(goal)}
              />
            ))}
            <Text variant="label">Preferred measurements</Text>
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              {(['metric', 'imperial'] as const).map((unit) => (
                <Button
                  key={unit}
                  style={{ flex: 1 }}
                  title={unit === 'metric' ? 'kg & cm' : 'lb & in'}
                  variant={unit === units ? 'primary' : 'secondary'}
                  onPress={() => setUnits(unit)}
                />
              ))}
            </View>
            <Button title="Continue" onPress={() => setStep(2)} />
          </>
        ) : (
          <>
            <Text variant="title">Make your targets yours.</Text>
            <Text tone="muted">
              These are starting values, not a personalized recommendation. Use your own daily
              targets, or change them later in Settings.
            </Text>
            <GoalCalculator
              current={{
                calories: Number(values.calories),
                protein: Number(values.protein),
                carbs: Number(values.carbs),
                fat: Number(values.fat),
              }}
              focus={focus}
              units={units}
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
                  key === 'calories'
                    ? 'Calories'
                    : `${key[0].toUpperCase() + key.slice(1)} in grams`
                }
                keyboardType="decimal-pad"
                value={values[key]}
                onChangeText={(value) =>
                  setValues((previous) => ({ ...previous, [key]: value }))
                }
              />
            ))}
            {!!error && (
              <Text tone="danger" accessibilityLiveRegion="polite">
                {error}
              </Text>
            )}
            <Button title="Start with Mora" loading={loading} onPress={start} />
            <Text variant="caption" tone="muted">
              Your journal stays on this device. Chat shares your messages and recent food
              history with our AI service to answer your questions.
            </Text>
          </>
        )}
        {step > 0 && (
          <Button
            title="Back"
            variant="ghost"
            disabled={loading}
            onPress={() => setStep(step - 1)}
          />
        )}
      </Screen>
    </>
  )
}
