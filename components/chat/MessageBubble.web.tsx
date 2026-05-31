import { Text } from '@/components/ui/Text'
import type { UIMessage } from 'ai'
import { memo, useCallback } from 'react'
import { Linking, View } from 'react-native'
import { EnrichedMarkdownText, type LinkPressEvent } from 'react-native-enriched-markdown'
import { useMarkdownStyle } from './useMarkdownStyle'

type MessageBubbleProps = {
  message: UIMessage
}

export const MessageBubble = memo(function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user'
  const markdownStyle = useMarkdownStyle()

  const handleLinkPress = useCallback((event: LinkPressEvent) => {
    Linking.openURL(event.url)
  }, [])

  return (
    <View className={`flex-row ${isUser ? 'justify-end' : 'justify-start'} px-4 py-2`} id={message.id}>
      <View
        className={`${isUser ? 'max-w-[80%]' : 'max-w-full'}  rounded-3xl ${isUser && 'bg-user-bubble px-4 py-3'}`}
        style={{ borderCurve: 'continuous' }}
      >
        {message.parts.map(part => {
          if (part.type !== 'text') return null

          if (isUser) {
            return <Text className="text-white text-base" key={`${message.id}-text`}>{part.text}</Text>
          }

          return (
            <EnrichedMarkdownText
              key={`${message.id}-text`}
              markdown={part.text}
              markdownStyle={markdownStyle}
              onLinkPress={handleLinkPress}
            />
          )
        })}
      </View>
    </View>
  )
})
