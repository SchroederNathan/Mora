import { typography, useTheme } from '@/theme'
import { Text, type TextProps } from 'react-native'
export function ShimmerText({
  style,
  children,
  ...props
}: TextProps & { speed?: number; baseColor?: string; highlightColor?: string }) {
  const theme = useTheme()
  return (
    <Text style={[typography.label, { color: theme.mutedForeground }, style]} {...props}>
      {children}
    </Text>
  )
}
