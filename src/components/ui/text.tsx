import { typography, useTheme } from '@/theme'
import { Text as NativeText, type TextProps } from 'react-native'

export function Text({
  variant = 'body',
  tone = 'default',
  className,
  style,
  ...props
}: TextProps & {
  variant?: keyof typeof typography
  tone?: 'default' | 'muted' | 'primary' | 'danger'
}) {
  const theme = useTheme()
  const color =
    tone === 'default'
      ? theme.foreground
      : tone === 'muted'
        ? theme.mutedForeground
        : theme[tone]
  const textStyle = { ...typography[variant] } as {
    -readonly [K in keyof import('react-native').TextStyle]: import('react-native').TextStyle[K]
  }
  if (/\btext-(?:xs|sm|base|lg|xl|[2-9]xl)\b/.test(className ?? '')) {
    delete textStyle.fontSize
    delete textStyle.lineHeight
  }
  if (/\bfont-(?:sans|serif)\b/.test(className ?? '')) delete textStyle.fontFamily
  if (/\bfont-(?:medium|semibold|bold|normal)\b/.test(className ?? ''))
    delete textStyle.fontWeight
  const hasColor =
    /\btext-(?:foreground|muted(?:-foreground)?|primary|white|black|red-\d+)\b/.test(
      className ?? '',
    )
  return (
    <NativeText
      className={className}
      style={[textStyle, !hasColor && { color }, style]}
      {...props}
    />
  )
}
