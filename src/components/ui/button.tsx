import { radius, spacing, useTheme } from '@/theme'
import { ActivityIndicator, Pressable, type StyleProp, type ViewStyle } from 'react-native'
import { Text } from './text'

export function Button({
  title,
  accessibilityLabel,
  onPress,
  variant = 'primary',
  disabled,
  loading,
  style,
}: {
  accessibilityLabel?: string
  title: string
  onPress: () => void
  variant?: 'primary' | 'secondary' | 'ghost' | 'destructive'
  disabled?: boolean
  loading?: boolean
  style?: StyleProp<ViewStyle>
}) {
  const theme = useTheme()
  const backgroundColor =
    variant === 'primary'
      ? theme.primary
      : variant === 'secondary'
        ? theme.muted
        : 'transparent'
  const color =
    variant === 'primary'
      ? theme.onPrimary
      : variant === 'destructive'
        ? theme.danger
        : theme.foreground
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityState={{ disabled: !!(disabled || loading), busy: !!loading }}
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        {
          minHeight: 48,
          padding: spacing.md,
          paddingHorizontal: spacing.xl,
          backgroundColor,
          borderRadius: radius.full,
          justifyContent: 'center',
          alignItems: 'center',
          opacity: disabled ? 0.4 : pressed ? 0.7 : 1,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={color} />
      ) : (
        <Text variant="label" style={{ color }}>
          {title}
        </Text>
      )}
    </Pressable>
  )
}
