import { Button } from '@/components/ui/button'
import { Text } from '@/components/ui/text'
import { radius, spacing, useTheme } from '@/theme'
import { formatServing, scaleMacros, type FoodConfirmationEntry } from '@/types/nutrition'
import { Minus, Plus, X } from 'lucide-react-native'
import { Pressable, ScrollView, View } from 'react-native'
export type { FoodConfirmationEntry } from '@/types/nutrition'

export function FoodConfirmationCard({
  entries,
  mealTitle,
  onConfirm,
  onRemove,
  onQuantityChange,
}: {
  entries: FoodConfirmationEntry[]
  mealTitle?: string | null
  isTitleLoading?: boolean
  onConfirm: () => void
  onRemove: (index: number) => void
  onQuantityChange?: (index: number, quantity: number) => void
}) {
  const theme = useTheme()
  const calories = entries.reduce(
    (sum, entry) => sum + scaleMacros(entry.nutrients, entry.quantity).calories,
    0,
  )
  return (
    <View
      style={{
        padding: spacing.lg,
        gap: spacing.md,
        borderRadius: radius.lg,
        borderCurve: 'continuous',
        backgroundColor: theme.card,
        borderWidth: 1,
        borderColor: theme.border,
      }}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm }}>
        <Text variant="label" style={{ flex: 1 }}>
          {mealTitle || 'Ready to log?'}
        </Text>
        <Text variant="label" tone="primary">
          {calories} cal
        </Text>
      </View>
      <ScrollView style={{ maxHeight: 220 }} keyboardShouldPersistTaps="handled">
        {entries.map((entry, index) => (
          <View
            key={`${entry.name}-${index}`}
            style={{ paddingVertical: spacing.sm, gap: spacing.xs }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
              <View style={{ flex: 1 }}>
                <Text variant="label">{entry.name}</Text>
                <Text variant="caption" tone="muted">
                  {formatServing(entry.serving)}
                  {entry.estimated ? ' · estimate' : ''}
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Remove ${entry.name}`}
                onPress={() => onRemove(index)}
                style={{ padding: spacing.md }}
              >
                <X size={18} color={theme.mutedForeground} />
              </Pressable>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Decrease ${entry.name} servings`}
                onPress={() => onQuantityChange?.(index, Math.max(0.25, entry.quantity - 0.25))}
                style={{ padding: spacing.md }}
              >
                <Minus size={16} color={theme.primary} />
              </Pressable>
              <Text variant="caption">
                {entry.quantity} {entry.quantity === 1 ? 'serving' : 'servings'}
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Increase ${entry.name} servings`}
                onPress={() => onQuantityChange?.(index, entry.quantity + 0.25)}
                style={{ padding: spacing.md }}
              >
                <Plus size={16} color={theme.primary} />
              </Pressable>
              <Text variant="caption" tone="muted">
                {Math.round(entry.nutrients.protein * entry.quantity)}g protein
              </Text>
            </View>
          </View>
        ))}
      </ScrollView>
      <Button title={`Log ${entries.length === 1 ? 'food' : 'meal'}`} onPress={onConfirm} />
    </View>
  )
}
