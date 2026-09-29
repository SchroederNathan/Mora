import { Text } from '@/components/ui/text'
import { spacing, useTheme } from '@/theme'
import { ActivityIndicator, View } from 'react-native'

export function ThinkingDropdown({
  isThinking,
  toolName,
  foodQuery,
}: {
  isThinking: boolean
  thinkingStartTime?: number | null
  toolName?: string | null
  toolState?: string | null
  foodQuery?: string
}) {
  const theme = useTheme()
  if (!isThinking) return null
  const label =
    toolName === 'tool-lookup_and_log_food'
      ? `Looking up ${foodQuery || 'nutrition'}…`
      : toolName === 'tool-get_food_history'
        ? 'Checking your food log…'
        : 'Mora is thinking…'
  return (
    <View
      accessibilityLiveRegion="polite"
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        paddingVertical: spacing.sm,
      }}
    >
      <ActivityIndicator size="small" color={theme.primary} />
      <Text variant="caption" tone="muted">
        {label}
      </Text>
    </View>
  )
}
