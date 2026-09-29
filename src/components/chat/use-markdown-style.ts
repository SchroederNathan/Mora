import { typography, useTheme } from '@/theme'
import { useMemo } from 'react'
import type { MarkdownStyle } from 'react-native-enriched-markdown'

export function useMarkdownStyle(): MarkdownStyle {
  const theme = useTheme()

  return useMemo(
    () => ({
      text: {
        color: theme.foreground,
        fontSize: 16,
        lineHeight: 24,
        fontFamily: typography.chat.fontFamily,
      },
      paragraph: {
        color: theme.foreground,
        fontSize: 16,
        lineHeight: 24,
        fontFamily: typography.chat.fontFamily,
      },
      h1: {
        color: theme.foreground,
        fontSize: 28,
        fontWeight: 'bold',
        fontFamily: typography.chat.fontFamily,
      },
      h2: {
        color: theme.foreground,
        fontSize: 24,
        fontWeight: 'bold',
        fontFamily: typography.chat.fontFamily,
      },
      h3: {
        color: theme.foreground,
        fontSize: 20,
        fontWeight: 'bold',
        marginTop: 32,
        fontFamily: typography.chat.fontFamily,
      },
      h4: {
        color: theme.foreground,
        fontSize: 18,
        fontWeight: 'bold',
        fontFamily: typography.chat.fontFamily,
      },
      h5: {
        color: theme.foreground,
        fontSize: 16,
        fontWeight: 'bold',
        fontFamily: typography.chat.fontFamily,
      },
      h6: {
        color: theme.foreground,
        fontSize: 14,
        fontWeight: 'bold',
        fontFamily: typography.chat.fontFamily,
      },
      strong: {
        color: theme.foreground,
        fontFamily: typography.chat.fontFamily,
      },
      em: {
        color: theme.foreground,
        fontFamily: typography.chat.fontFamily,
        fontStyle: 'italic',
      },
      link: {
        color: theme.link,
        underline: true,
      },
      code: {
        color: theme.codeText,
        backgroundColor: theme.codeBackground,
        borderColor: theme.border,
      },
      codeBlock: {
        backgroundColor: theme.codeBackground,
        color: theme.foreground,
        fontFamily: 'monospace',
        fontSize: 14,
        padding: 12,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: theme.border,
      },
      blockquote: {
        borderWidth: 4,
        borderColor: theme.link,
        backgroundColor: theme.blockquoteBackground,

        color: theme.mutedForeground,
      },
      list: {
        color: theme.foreground,
        fontFamily: typography.chat.fontFamily,
        bulletColor: theme.foreground,
      },
    }),
    [theme],
  )
}
