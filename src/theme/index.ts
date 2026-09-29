import { useUniwind } from 'uniwind'
import { colors } from './colors'
export { colors } from './colors'

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 48 } as const
export const radius = { sm: 8, md: 12, lg: 20, xl: 28, full: 9999 } as const
export const fonts = { sans: 'Satoshi Variable', serif: 'Sentient Variable' } as const
export const typography = {
  hero: { fontFamily: fonts.serif, fontSize: 38, lineHeight: 48 },
  title: { fontFamily: fonts.serif, fontSize: 28, lineHeight: 36 },
  heading: { fontFamily: fonts.sans, fontSize: 20, lineHeight: 28, fontWeight: '700' },
  body: { fontFamily: fonts.sans, fontSize: 16, lineHeight: 24 },
  chat: { fontFamily: fonts.serif, fontSize: 16, lineHeight: 26 },
  label: { fontFamily: fonts.sans, fontSize: 14, lineHeight: 20, fontWeight: '600' },
  caption: { fontFamily: fonts.sans, fontSize: 12, lineHeight: 18 },
} as const
export const motion = { fast: 150, base: 250, slow: 400 } as const
export const shadows = { raised: '0 4px 20px rgba(0,0,0,0.08)' } as const
export function useTheme() {
  return colors[useUniwind().theme === 'dark' ? 'dark' : 'light']
}
