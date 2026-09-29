import { Button } from '@/components/ui/button'
import { Screen } from '@/components/ui/screen'
import { Text } from '@/components/ui/text'
import { getAllDailyLogs } from '@/lib/storage'
import { useDailyLogStore } from '@/stores/daily-log-store'
import { useTrackingStore } from '@/stores/tracking-store'
import { radius, spacing, useTheme } from '@/theme'
import { formatDateKey } from '@/types/nutrition'
import { loggingStreak, shiftDate } from '@/utils/tracking'
import { router } from 'expo-router'
import { useState } from 'react'
import { Pressable, View } from 'react-native'
import Svg, { Circle, Polyline } from 'react-native-svg'

export default function ProgressScreen() {
  const theme = useTheme()
  const log = useDailyLogStore((s) => s.log)
  const weights = useTrackingStore((s) => s.weights)
  const profile = useTrackingStore((s) => s.profile)
  const [period, setPeriod] = useState(30)
  const today = formatDateKey()
  const logs = getAllDailyLogs()
  const days = Array.from({ length: 7 }, (_, i) => {
    const date = shiftDate(today, i - 6)
    return {
      date,
      calories:
        (log.date === date ? log : logs.find((l) => l.date === date))?.totals.calories ?? 0,
    }
  })
  const periodStart = shiftDate(today, 1 - period)
  const recentWeights = weights.filter((w) => w.date >= periodStart && w.date <= today)
  const streak = loggingStreak(logs, today)
  const latest = weights.at(-1)?.kg
  const unit = profile.units === 'imperial' ? 'lb' : 'kg'
  const displayWeight = (kg: number) => (kg * (unit === 'lb' ? 2.2046226218 : 1)).toFixed(1)
  const min = Math.min(...recentWeights.map((w) => w.kg)) - 1
  const max = Math.max(...recentWeights.map((w) => w.kg)) + 1
  const startDay = Date.parse(`${periodStart}T00:00:00Z`)
  const chartPoints = recentWeights.map((w) => ({
    date: w.date,
    x: 12 + ((Date.parse(`${w.date}T00:00:00Z`) - startDay) / 86400000 / (period - 1)) * 296,
    y: 130 - ((w.kg - min) / (max - min)) * 110,
  }))
  const points = chartPoints.map(({ x, y }) => `${x},${y}`).join(' ')
  const maxCalories = Math.max(1, ...days.map((d) => d.calories))
  return (
    <Screen title="Your progress" subtitle="A little more perspective, one day at a time.">
      <View style={{ flexDirection: 'row', gap: spacing.xl }}>
        <View style={{ flex: 1, gap: spacing.xs }}>
          <Text tone="muted" variant="label">
            Current weight
          </Text>
          <Text variant="title">
            {latest ? `${displayWeight(latest)} ${unit}` : 'Not logged'}
          </Text>
          {profile.goalWeightKg && (
            <Text tone="muted" variant="caption">
              Goal {displayWeight(profile.goalWeightKg)} {unit}
            </Text>
          )}
        </View>
        <View style={{ gap: spacing.xs }}>
          <Text tone="muted" variant="label">
            Logging streak
          </Text>
          <Text variant="title">
            {streak} {streak === 1 ? 'day' : 'days'}
          </Text>
        </View>
      </View>
      <Button
        title="Log weight"
        onPress={() =>
          router.push({ pathname: '/activity', params: { kind: 'weight', date: today } })
        }
      />
      <View style={{ gap: spacing.lg }}>
        <Text variant="heading">Weight trend</Text>
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          {[30, 90, 365].map((value) => (
            <Pressable
              key={value}
              accessibilityRole="button"
              accessibilityLabel={value === 365 ? '1 year' : `${value} days`}
              accessibilityState={{ selected: period === value }}
              onPress={() => setPeriod(value)}
              style={{
                flex: 1,
                padding: spacing.md,
                backgroundColor: period === value ? theme.chat : theme.muted,
                borderRadius: radius.full,
              }}
            >
              <Text
                variant="label"
                style={{
                  textAlign: 'center',
                  color: period === value ? theme.primary : theme.mutedForeground,
                }}
              >
                {value === 365 ? '1 year' : `${value} days`}
              </Text>
            </Pressable>
          ))}
        </View>
        {recentWeights.length > 1 ? (
          <View>
            <Svg
              width="100%"
              height={160}
              viewBox="0 0 320 160"
              accessibilityLabel={`Weight over ${period} days, from ${displayWeight(recentWeights[0].kg)} to ${displayWeight(recentWeights.at(-1)!.kg)} ${unit}`}
            >
              <Polyline points={points} stroke={theme.primary} strokeWidth={3} fill="none" />
              {chartPoints.map((point) => (
                <Circle key={point.date} cx={point.x} cy={point.y} r={3} fill={theme.primary} />
              ))}
            </Svg>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text variant="caption" tone="muted">
                {periodStart}
              </Text>
              <Text variant="caption" tone="muted">
                {today}
              </Text>
            </View>
          </View>
        ) : (
          <Text tone="muted">Log two weigh-ins to see your trend here.</Text>
        )}
      </View>
      <View style={{ gap: spacing.lg }}>
        <Text variant="heading">This week</Text>
        <Text variant="title">
          {days.reduce((total, day) => total + day.calories, 0).toLocaleString()}{' '}
          <Text tone="muted">cal logged</Text>
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm }}>
          {days.map((day) => (
            <View key={day.date} style={{ flex: 1, alignItems: 'center', gap: spacing.sm }}>
              <Text variant="caption" tone="muted">
                {day.calories || ''}
              </Text>
              <View
                style={{
                  width: '70%',
                  minHeight: 4,
                  height: Math.max(4, (day.calories / maxCalories) * 100),
                  backgroundColor: theme.primary,
                  borderRadius: radius.sm,
                }}
              />
              <Text variant="caption" tone="muted">
                {new Date(`${day.date}T12:00:00`).toLocaleDateString(undefined, {
                  weekday: 'narrow',
                })}
              </Text>
            </View>
          ))}
        </View>
      </View>
      {latest && profile.heightCm && (
        <View style={{ gap: spacing.sm }}>
          <Text variant="heading">BMI</Text>
          <Text variant="title">{(latest / (profile.heightCm / 100) ** 2).toFixed(1)}</Text>
          <Text variant="caption" tone="muted">
            BMI is a rough measure. It does not account for muscle mass or individual health.
          </Text>
        </View>
      )}
      <View style={{ gap: spacing.lg }}>
        <Text variant="heading">Weight history</Text>
        {weights.length === 0 ? (
          <Text tone="muted">Your weigh-ins will appear here.</Text>
        ) : (
          [...weights].reverse().map((w) => (
            <View
              key={w.date}
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                paddingVertical: spacing.sm,
                borderBottomWidth: 1,
                borderColor: theme.border,
              }}
            >
              <Text>
                {displayWeight(w.kg)} {unit}
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Edit weight for ${w.date}`}
                onPress={() =>
                  router.push({
                    pathname: '/activity',
                    params: { kind: 'weight', date: w.date, amount: displayWeight(w.kg) },
                  })
                }
              >
                <Text tone="primary">{w.date} · Edit</Text>
              </Pressable>
            </View>
          ))
        )}
      </View>
    </Screen>
  )
}
