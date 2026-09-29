import { spacing, useTheme } from '@/theme'
import type { ReactNode } from 'react'
import { Platform, ScrollView, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Text } from './text'

export function Screen({
  title,
  subtitle,
  children,
  header = true,
}: {
  title?: string
  subtitle?: string
  children: ReactNode
  header?: boolean
}) {
  const theme = useTheme()
  const insets = useSafeAreaInsets()
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.background }}
      keyboardShouldPersistTaps="handled"
      {...(Platform.OS === 'web'
        ? {}
        : { automaticallyAdjustKeyboardInsets: true, keyboardDismissMode: 'on-drag' as const })}
      contentContainerStyle={{
        paddingHorizontal: spacing.xl,
        paddingTop: header ? insets.top + 76 : spacing.xl,
        paddingBottom: insets.bottom + spacing.xxl,
        gap: spacing.xl,
      }}
    >
      {title && (
        <View style={{ gap: spacing.sm }}>
          <Text variant="title">{title}</Text>
          {subtitle && <Text tone="muted">{subtitle}</Text>}
        </View>
      )}
      {children}
    </ScrollView>
  )
}
