import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { Screen } from '@/components/ui/screen'
import { Text } from '@/components/ui/text'
import { useAuth } from '@/contexts/auth-context'
import { healthAvailable, importHealth } from '@/features/health/import'
import { confirmAction } from '@/lib/dialogs'
import { exportJournal } from '@/lib/export-journal'
import { getAllDailyLogs, getChatMessages } from '@/lib/storage'
import { useTrackingStore } from '@/stores/tracking-store'
import { useUserStore } from '@/stores/user-store'
import { radius, spacing, useTheme } from '@/theme'
import * as Notifications from 'expo-notifications'
import { AndroidImportance } from 'expo-notifications'
import { router } from 'expo-router'
import { Bell, ChevronRight, Download, Settings2, Target, UserRound } from 'lucide-react-native'
import { useState } from 'react'
import { Appearance, Platform, Pressable, Switch, View } from 'react-native'
import { Uniwind } from 'uniwind'

export default function SettingsScreen() {
  const theme = useTheme()
  const { profile, preferences, setProfile, setPreferences } = useTrackingStore()
  const [error, setError] = useState('')
  const [syncing, setSyncing] = useState(false)
  const [notice, setNotice] = useState('')
  const syncHealth = async () => {
    setSyncing(true)
    setError('')
    try {
      const message = await importHealth()
      setNotice(message || 'Health import complete.')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to import Apple Health data.')
    } finally {
      setSyncing(false)
    }
  }
  const { signOut } = useAuth()
  const rowStyle = {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: spacing.md,
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
    borderColor: theme.border,
  }
  const setReminders = async (enabled: boolean) => {
    try {
      if (Platform.OS === 'web')
        throw new Error('Meal reminders are available in the iOS and Android app.')
      if (enabled) {
        const permission = await Notifications.requestPermissionsAsync()
        if (!permission.granted)
          throw new Error('Allow notifications in system settings to receive reminders.')
        if (Platform.OS === 'android')
          await Notifications.setNotificationChannelAsync('meals', {
            name: 'Meal reminders',
            importance: AndroidImportance.DEFAULT,
          })
        await Notifications.cancelAllScheduledNotificationsAsync()
        await Notifications.scheduleNotificationAsync({
          content: {
            title: 'A moment for your day',
            body: 'Log a meal or check in with Mora.',
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DAILY,
            hour: 19,
            minute: 0,
            channelId: 'meals',
          },
        })
      } else await Notifications.cancelAllScheduledNotificationsAsync()
      setPreferences({ reminders: enabled })
      setError('')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to update reminders.')
    }
  }
  const exportData = async () => {
    try {
      const { profile, preferences, weights, days, savedMeals } = useTrackingStore.getState()
      const json = JSON.stringify(
        {
          version: 1,
          exportedAt: new Date().toISOString(),
          profile,
          preferences,
          goals: useUserStore.getState().goals,
          logs: getAllDailyLogs(),
          weights,
          activity: days,
          savedMeals,
          messages: getChatMessages(),
        },
        null,
        2,
      )
      await exportJournal(json)
    } catch {
      setError('Unable to export right now. Please try again.')
    }
  }
  return (
    <Screen
      header={false}
      title={profile.name || 'Make Mora yours'}
      subtitle="Your goals, your preferences, your pace."
    >
      <View>
        {[
          {
            title: 'Personal details',
            Icon: UserRound,
            onPress: () => router.push('/profile'),
          },
          { title: 'Nutrition goals', Icon: Target, onPress: () => router.push('/goals') },
          {
            title: 'Saved foods & meals',
            Icon: Settings2,
            onPress: () => router.push('/food-library?tab=saved'),
          },
          { title: 'Export my data', Icon: Download, onPress: exportData },
        ].map(({ title, Icon, onPress }) => (
          <Pressable
            key={title}
            onPress={onPress}
            accessibilityRole="button"
            accessibilityLabel={title}
            style={({ pressed }) => [rowStyle, { opacity: pressed ? 0.6 : 1 }]}
          >
            <Icon size={20} color={theme.primary} />
            <Text style={{ flex: 1 }}>{title}</Text>
            <ChevronRight size={18} color={theme.mutedForeground} />
          </Pressable>
        ))}
      </View>
      <View style={{ gap: spacing.md }}>
        <Text variant="heading">Appearance</Text>
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          {(['system', 'light', 'dark'] as const).map((mode) => (
            <Button
              key={mode}
              style={{ flex: 1, paddingHorizontal: spacing.sm }}
              title={mode[0].toUpperCase() + mode.slice(1)}
              variant={preferences.appearance === mode ? 'primary' : 'secondary'}
              onPress={() => {
                setPreferences({ appearance: mode })
                if (Platform.OS !== 'web')
                  Appearance.setColorScheme(mode === 'system' ? 'unspecified' : mode)
                Uniwind.setTheme(mode)
              }}
            />
          ))}
        </View>
      </View>
      <View style={{ gap: spacing.md }}>
        <Text variant="heading">Tracking</Text>
        <View style={rowStyle}>
          <Text style={{ flex: 1 }}>Use pounds</Text>
          <Switch
            accessibilityLabel="Use pounds"
            value={profile.units === 'imperial'}
            onValueChange={(enabled) => setProfile({ units: enabled ? 'imperial' : 'metric' })}
          />
        </View>
        {(
          [
            {
              key: 'addBurned',
              label: 'Add exercise calories',
              detail: 'Include logged workouts in your daily budget.',
            },
            {
              key: 'rollover',
              label: 'Rollover calories',
              detail: 'Carry up to 200 unused calories from yesterday.',
            },
          ] as const
        ).map((item) => (
          <View key={item.key} style={rowStyle}>
            <View style={{ flex: 1 }}>
              <Text>{item.label}</Text>
              <Text variant="caption" tone="muted">
                {item.detail}
              </Text>
            </View>
            <Switch
              accessibilityLabel={item.label}
              value={preferences[item.key]}
              onValueChange={(value) => setPreferences({ [item.key]: value })}
            />
          </View>
        ))}
        <View style={rowStyle}>
          <Bell size={20} color={theme.primary} />
          <View style={{ flex: 1 }}>
            <Text>Evening reminder</Text>
            <Text variant="caption" tone="muted">
              Every day at 7 pm
            </Text>
          </View>
          <Switch
            accessibilityLabel="Evening reminder"
            value={preferences.reminders}
            onValueChange={setReminders}
          />
        </View>
      </View>
      {healthAvailable && (
        <View style={{ gap: spacing.md }}>
          <Text variant="heading">Apple Health</Text>
          <Text tone="muted">
            Import today’s steps and active calories, plus your latest weight. You choose which
            data to share.
          </Text>
          <Button
            title="Import Apple Health"
            variant="secondary"
            loading={syncing}
            onPress={syncHealth}
          />
          {!!notice && <Text tone="muted">{notice}</Text>}
        </View>
      )}
      <View style={{ gap: spacing.md }}>
        <Text variant="heading">Water</Text>
        <Text tone="muted">Choose the amount added with each tap.</Text>
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          {[150, 250, 500].map((amount) => (
            <Button
              key={amount}
              style={{ flex: 1, paddingHorizontal: spacing.sm }}
              title={`${amount} ml`}
              variant={preferences.waterServing === amount ? 'primary' : 'secondary'}
              onPress={() => setPreferences({ waterServing: amount })}
            />
          ))}
        </View>
        <Field
          label="Daily water goal in ml"
          keyboardType="number-pad"
          defaultValue={String(preferences.waterGoal)}
          onEndEditing={(e) => {
            const value = Number(e.nativeEvent.text)
            if (Number.isFinite(value) && value >= 250 && value <= 10000)
              setPreferences({ waterGoal: value })
            else setError('Choose a water goal between 250 and 10,000 ml.')
          }}
        />
      </View>
      {!!error && (
        <View
          style={{ padding: spacing.lg, borderRadius: radius.md, backgroundColor: theme.muted }}
        >
          <Text tone="danger">{error}</Text>
        </View>
      )}
      <Text variant="caption" tone="muted">
        Your logs are stored on this device. Export a copy before changing devices. Nutrition
        estimates may need correction.
      </Text>
      <Button
        title="Sign out"
        variant="destructive"
        onPress={() =>
          confirmAction(
            'Sign out?',
            'Your local logs will remain on this device.',
            'Sign out',
            () => {
              void signOut().catch(() => setError('Unable to sign out.'))
            },
            true,
          )
        }
      />
    </Screen>
  )
}
