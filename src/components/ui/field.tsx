import { radius, spacing, typography, useTheme } from '@/theme'
import { TextInput, View, type TextInputProps } from 'react-native'
import { Text } from './text'

export function Field({ label, style, ...props }: TextInputProps & { label: string }) {
  const theme = useTheme()
  return (
    <View style={{ gap: spacing.sm }}>
      <Text variant="label" tone="muted">
        {label}
      </Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={theme.mutedForeground}
        selectionColor={theme.primary}
        style={[
          typography.body,
          {
            color: theme.foreground,
            backgroundColor: theme.muted,
            padding: spacing.lg,
            minHeight: 52,
            borderRadius: radius.md,
            borderCurve: 'continuous',
          },
          style,
        ]}
        {...props}
      />
    </View>
  )
}
