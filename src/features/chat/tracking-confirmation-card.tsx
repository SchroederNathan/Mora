import { Button } from '@/components/ui/button'
import { Text } from '@/components/ui/text'
import {
  trackingActionLabel,
  trackingActionSchema,
  validTrackingAction,
} from '@/features/tracking/action'
import { useTrackingStore } from '@/stores/tracking-store'
import { radius, spacing, useTheme } from '@/theme'
import { formatDateKey } from '@/types/nutrition'
import { View } from 'react-native'

export function TrackingConfirmationCard({
  id,
  output,
  onResolved,
}: {
  id: string
  output: unknown
  onResolved: (text: string) => void
}) {
  const theme = useTheme()
  const result = trackingActionSchema.safeParse((output as { action?: unknown })?.action)
  const resolution = useTrackingStore((s) => s.chatActions[id])
  if (!result.success || !validTrackingAction(result.data, formatDateKey())) return null
  const action = result.data
  const label = trackingActionLabel(action)
  const resolve = (save: boolean) => {
    const changed = useTrackingStore.getState().resolveChatAction(id, action, save)
    if (changed) onResolved(`${save ? 'Saved' : 'Dismissed'}: ${label} (${action.date}).`)
  }
  return (
    <View
      style={{
        backgroundColor: theme.card,
        borderWidth: 1,
        borderColor: theme.border,
        borderRadius: radius.lg,
        padding: spacing.lg,
        gap: spacing.sm,
        marginVertical: spacing.sm,
      }}
    >
      <Text variant="label">{label}</Text>
      <Text variant="caption" tone="muted">
        {action.date}
        {resolution ? ` · ${resolution === 'saved' ? 'Saved' : 'Dismissed'}` : ''}
      </Text>
      {!resolution && (
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <Button title="Save to journal" onPress={() => resolve(true)} />
          <Button title="Dismiss" variant="ghost" onPress={() => resolve(false)} />
        </View>
      )}
    </View>
  )
}
