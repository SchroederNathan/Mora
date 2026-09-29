import { Button } from '@/components/ui/button'
import { Screen } from '@/components/ui/screen'
import { Text } from '@/components/ui/text'
import { PagerNavigationContext } from '@/contexts/pager-contexts'
import { confirmAction } from '@/lib/dialogs'
import { getDailyLog } from '@/lib/storage'
import { useDailyLogStore } from '@/stores/daily-log-store'
import { emptyActivity, useTrackingStore } from '@/stores/tracking-store'
import { useUserStore } from '@/stores/user-store'
import { radius, spacing, useTheme } from '@/theme'
import { formatDateKey, formatServing, scaleMacros } from '@/types/nutrition'
import { calorieBudget, shiftDate } from '@/utils/tracking'
import { router } from 'expo-router'
import {
  Bookmark,
  ChevronLeft,
  ChevronRight,
  Droplets,
  Footprints,
  Minus,
  Plus,
  Utensils,
} from 'lucide-react-native'
import { useContext, useEffect, useState } from 'react'
import { Pressable, View } from 'react-native'
import Svg, { Circle } from 'react-native-svg'

export default function HomeScreen() {
  const theme = useTheme()
  const { log, currentDate, load, removeEntry } = useDailyLogStore()
  const { goals, load: loadGoals } = useUserStore()
  const activity = useTrackingStore((s) => s.days[currentDate] ?? emptyActivity)
  const { preferences, profile, changeWater, saveMeal, removeExercise } = useTrackingStore()
  const navigation = useContext(PagerNavigationContext)
  const [notice, setNotice] = useState('')
  useEffect(() => {
    load()
    loadGoals()
  }, [load, loadGoals])
  const manualBurned = activity.exercises.reduce((sum, item) => sum + item.calories, 0)
  const burned = Math.max(manualBurned, activity.healthCalories ?? 0)
  const budget = calorieBudget(
    goals.calories,
    burned,
    preferences.addBurned,
    preferences.rollover,
    getDailyLog(shiftDate(currentDate, -1))?.totals.calories ?? null,
  )
  const remaining = budget - log.totals.calories
  const progress = Math.min(1, log.totals.calories / Math.max(1, budget))
  const today = formatDateKey()
  const section = { gap: spacing.lg }
  return (
    <Screen>
      <View
        style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Previous day"
          onPress={() => load(shiftDate(currentDate, -1))}
          style={{ padding: spacing.md }}
        >
          <ChevronLeft size={22} color={theme.foreground} />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Return to today"
          onPress={() => load(today)}
        >
          <Text variant="label">
            {currentDate === today
              ? 'Today'
              : new Date(`${currentDate}T12:00:00`).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                })}
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Next day"
          disabled={currentDate >= today}
          onPress={() => load(shiftDate(currentDate, 1))}
          style={{ padding: spacing.md, opacity: currentDate >= today ? 0.25 : 1 }}
        >
          <ChevronRight size={22} color={theme.foreground} />
        </Pressable>
      </View>
      <View style={{ gap: spacing.sm }}>
        <Text variant="title">
          {profile.name ? `${profile.name}'s daily balance` : 'Your daily balance'}
        </Text>
        <Text tone="muted">Every meal is part of the picture.</Text>
      </View>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.xl,
          paddingVertical: spacing.lg,
        }}
      >
        <View style={{ flex: 1, gap: spacing.xs }}>
          <Text variant="hero">{Math.abs(remaining).toLocaleString()}</Text>
          <Text tone="muted">cal {remaining >= 0 ? 'remaining' : 'over your goal'}</Text>
          <Text variant="caption" tone="muted">
            {log.totals.calories.toLocaleString()} of {budget.toLocaleString()} cal
          </Text>
        </View>
        <Svg
          width={120}
          height={120}
          viewBox="0 0 120 120"
          accessibilityLabel={`${Math.round(progress * 100)} percent of calorie goal`}
        >
          <Circle cx={60} cy={60} r={50} stroke={theme.muted} strokeWidth={8} fill="none" />
          <Circle
            cx={60}
            cy={60}
            r={50}
            stroke={theme.primary}
            strokeWidth={8}
            fill="none"
            strokeDasharray={`${progress * 314.16} 314.16`}
            strokeLinecap="round"
            transform="rotate(-90 60 60)"
          />
        </Svg>
      </View>
      <View style={{ flexDirection: 'row', gap: spacing.lg }}>
        {(['protein', 'carbs', 'fat'] as const).map((key) => (
          <View key={key} style={{ flex: 1, gap: spacing.sm }}>
            <Text variant="caption" tone="muted">
              {key[0].toUpperCase() + key.slice(1)}
            </Text>
            <Text variant="heading">
              {Math.round(log.totals[key])}
              <Text variant="caption" tone="muted">
                {' '}
                / {goals[key]}g
              </Text>
            </Text>
            <View
              style={{
                height: 4,
                borderRadius: radius.full,
                backgroundColor: theme.muted,
                overflow: 'hidden',
              }}
            >
              <View
                style={{
                  width: `${Math.min(100, (log.totals[key] / Math.max(1, goals[key])) * 100)}%`,
                  height: 4,
                  backgroundColor: theme[key],
                }}
              />
            </View>
          </View>
        ))}
      </View>
      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        <Button
          title="Chat to log"
          style={{ flex: 1 }}
          onPress={() => navigation?.navigateToPage(1)}
        />
        <Button
          title="Find food"
          variant="secondary"
          style={{ flex: 1 }}
          onPress={() => router.push('/food-library')}
        />
      </View>
      <View
        style={{
          paddingVertical: spacing.lg,
          borderTopWidth: 1,
          borderBottomWidth: 1,
          borderColor: theme.border,
          gap: spacing.xl,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
          <Droplets size={23} color={theme.primary} />
          <View style={{ flex: 1 }}>
            <Text variant="label">Water</Text>
            <Text variant="caption" tone="muted">
              {activity.water.toLocaleString()} / {preferences.waterGoal.toLocaleString()} ml
            </Text>
          </View>
          {[-1, 1].map((direction) => (
            <Pressable
              key={direction}
              accessibilityRole="button"
              accessibilityLabel={direction < 0 ? 'Remove water' : 'Add water'}
              onPress={() => changeWater(currentDate, direction * preferences.waterServing)}
              style={({ pressed }) => ({
                width: 44,
                height: 44,
                borderRadius: radius.full,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: theme.muted,
                opacity: pressed ? 0.5 : 1,
              })}
            >
              {direction > 0 ? (
                <Plus size={20} color={theme.primary} />
              ) : (
                <Minus size={20} color={theme.mutedForeground} />
              )}
            </Pressable>
          ))}
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Log steps"
          onPress={() => router.push('/activity?kind=steps')}
          style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}
        >
          <Footprints size={23} color={theme.primary} />
          <View style={{ flex: 1 }}>
            <Text variant="label">Steps</Text>
            <Text variant="caption" tone="muted">
              {activity.steps.toLocaleString()} / {preferences.stepGoal.toLocaleString()}
            </Text>
          </View>
          <ChevronRight size={20} color={theme.mutedForeground} />
        </Pressable>
      </View>
      <View style={section}>
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Text variant="heading">Your food log</Text>
          <Button title="Add" variant="ghost" onPress={() => router.push('/food-editor')} />
        </View>
        {log.entries.length === 0 && (
          <View style={{ gap: spacing.md, paddingVertical: spacing.lg }}>
            <Utensils size={25} color={theme.mutedForeground} />
            <Text tone="muted">
              Nothing logged for this day yet. Start with your first meal.
            </Text>
          </View>
        )}
        {log.entries.map((entry) => (
          <View
            key={entry.id}
            style={{
              gap: spacing.sm,
              paddingVertical: spacing.md,
              borderBottomWidth: 1,
              borderColor: theme.border,
            }}
          >
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Edit ${entry.snapshot.name}`}
              onPress={() =>
                router.push({ pathname: '/food-editor', params: { entryId: entry.id } })
              }
              style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}
            >
              <View style={{ flex: 1, gap: spacing.xs }}>
                <Text variant="label">{entry.snapshot.name}</Text>
                <Text variant="caption" tone="muted">
                  {entry.quantity} × {formatServing(entry.snapshot.serving)} ·{' '}
                  {entry.meal ?? 'snack'}
                  {entry.snapshot.estimated ? ' · estimate' : ''}
                </Text>
              </View>
              <Text variant="label">
                {scaleMacros(entry.snapshot.nutrients, entry.quantity).calories} cal
              </Text>
            </Pressable>
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.md }}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Save ${entry.snapshot.name}`}
                onPress={() => {
                  const entries = entry.mealGroupId
                    ? log.entries.filter((item) => item.mealGroupId === entry.mealGroupId)
                    : [entry]
                  saveMeal(entry.mealTitle ?? entry.snapshot.name, entries)
                  setNotice('Saved to your foods & meals.')
                }}
                style={{
                  minHeight: 44,
                  justifyContent: 'center',
                  paddingHorizontal: spacing.sm,
                }}
              >
                <Bookmark size={18} color={theme.primary} />
              </Pressable>
              <Button
                title="Delete"
                variant="ghost"
                onPress={() =>
                  confirmAction(
                    'Delete food?',
                    entry.snapshot.name,
                    'Delete',
                    () => removeEntry(entry.id),
                    true,
                  )
                }
              />
            </View>
          </View>
        ))}
        {!!notice && (
          <Text accessibilityLiveRegion="polite" style={{ color: theme.success }}>
            {notice}
          </Text>
        )}
      </View>
      <View style={section}>
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Text variant="heading">Movement</Text>
          <Button
            title="Log exercise"
            variant="ghost"
            onPress={() => router.push('/activity?kind=exercise')}
          />
        </View>
        {!!activity.healthCalories && (
          <Text tone="muted">
            {activity.healthCalories} active cal from Apple Health. The larger of Health or
            manual calories is used to avoid counting workouts twice.
          </Text>
        )}
        {activity.exercises.length === 0 ? (
          <Text tone="muted">Your workouts will appear here.</Text>
        ) : (
          activity.exercises.map((item) => (
            <View
              key={item.id}
              style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}
            >
              <View style={{ flex: 1 }}>
                <Text>{item.name}</Text>
                <Text variant="caption" tone="muted">
                  {item.minutes} min · {item.calories} cal burned
                </Text>
              </View>
              <Button
                title="Remove"
                variant="ghost"
                onPress={() => removeExercise(currentDate, item.id)}
              />
            </View>
          ))
        )}
      </View>
      <View style={section}>
        <Text variant="heading">Reported nutrients</Text>
        <Text variant="caption" tone="muted">
          Not every food includes all of these values.
        </Text>
        <Text tone="muted">
          Fiber {Math.round(log.totals.fiber ?? 0)}g · Sugar {Math.round(log.totals.sugar ?? 0)}
          g · Sodium {Math.round(log.totals.sodium ?? 0)}mg
        </Text>
        <Button
          title="Edit daily goals"
          variant="secondary"
          onPress={() => router.push('/goals')}
        />
      </View>
    </Screen>
  )
}
