import { useTheme } from '@/theme'
import type { ComponentProps } from 'react'
import { View, type ViewStyle } from 'react-native'
type BorderRadius =
  number | { topLeft?: number; topRight?: number; bottomLeft?: number; bottomRight?: number }
export function GradientBorderCard({
  children,
  borderRadius = 20,
  borderWidth = 1,
  padding = 16,
  style,
}: {
  children: React.ReactNode
  borderRadius?: BorderRadius
  borderWidth?: number
  padding?:
    | number
    | Pick<
        ViewStyle,
        | 'padding'
        | 'paddingTop'
        | 'paddingBottom'
        | 'paddingHorizontal'
        | 'paddingVertical'
        | 'paddingLeft'
        | 'paddingRight'
      >
  style?: ComponentProps<typeof View>['style']
}) {
  const theme = useTheme()
  const corners =
    typeof borderRadius === 'number'
      ? { borderRadius }
      : {
          borderTopLeftRadius: borderRadius.topLeft,
          borderTopRightRadius: borderRadius.topRight,
          borderBottomLeftRadius: borderRadius.bottomLeft,
          borderBottomRightRadius: borderRadius.bottomRight,
        }
  return (
    <View
      style={[
        {
          backgroundColor: theme.card,
          borderColor: theme.border,
          borderWidth,
          borderCurve: 'continuous',
        },
        corners,
        typeof padding === 'number' ? { padding } : padding,
        style,
      ]}
    >
      {children}
    </View>
  )
}
