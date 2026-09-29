import { Text } from '@/components/ui/text'
import { radius, spacing, useTheme } from '@/theme'
import { ArrowUpRight, ChartNoAxesCombined, Utensils } from 'lucide-react-native'
import { Pressable, View } from 'react-native'

export function EmptyStateCarousels({
  onSelectItem,
}: {
  onSelectItem: (text: string) => void
}) {
  const theme = useTheme()
  return (
    <View style={{ padding: spacing.xl, gap: spacing.xxl }}>
      <View style={{ paddingTop: spacing.xxxl, gap: spacing.lg }}>
        <Text variant="caption" tone="primary" style={{ letterSpacing: 3 }}>
          A LITTLE MORE BALANCE
        </Text>
        <Text variant="hero">Good food.{'\n'}A fresh start.</Text>
        <Text tone="muted">
          Tell me about your meal, snap a photo, or talk it through. We&apos;ll keep track
          together.
        </Text>
      </View>
      <View style={{ gap: spacing.md }}>
        {[
          { text: 'Help me log my breakfast', Icon: Utensils },
          { text: 'How am I doing this week?', Icon: ChartNoAxesCombined },
        ].map(({ text, Icon }) => (
          <Pressable
            key={text}
            accessibilityRole="button"
            onPress={() => onSelectItem(text)}
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing.md,
              padding: spacing.lg,
              borderRadius: radius.lg,
              backgroundColor: theme.suggestionCard,
              opacity: pressed ? 0.65 : 1,
            })}
          >
            <Icon size={20} color={theme.primary} />
            <Text variant="label" style={{ flex: 1, color: theme.suggestionCardText }}>
              {text}
            </Text>
            <ArrowUpRight size={18} color={theme.mutedForeground} />
          </Pressable>
        ))}
      </View>
    </View>
  )
}
