import { useMarkdownStyle } from '@/components/chat/use-markdown-style'
import { Text } from '@/components/ui/text'
import { TrackingConfirmationCard } from '@/features/chat/tracking-confirmation-card'
import type { UIMessage } from 'ai'
import { memo, useCallback } from 'react'
import { Image, Linking, View } from 'react-native'
import type { LinkPressEvent } from 'react-native-enriched-markdown'
import { EnrichedMarkdownText } from 'react-native-enriched-markdown'

type MessageBubbleProps = {
  message: UIMessage
  onTrackingResolved: (text: string) => void
}

export const MessageBubble = memo(function MessageBubble({
  message,
  onTrackingResolved,
}: MessageBubbleProps) {
  const isUser = message.role === 'user'
  const markdownStyle = useMarkdownStyle()

  const handleLinkPress = useCallback((event: LinkPressEvent) => {
    if (/^https?:\/\//i.test(event.url)) void Linking.openURL(event.url)
  }, [])

  return (
    <View
      className={`flex-row ${isUser ? 'justify-end' : 'justify-start'} px-4 py-2`}
      id={message.id}
    >
      <View
        className={`${isUser ? 'max-w-[80%]' : 'w-full'}  rounded-3xl ${isUser && 'bg-user-bubble px-4 py-3'}`}
        style={{ borderCurve: 'continuous' }}
      >
        {message.parts.map((part, index) => {
          if (part.type === 'tool-prepare_tracking_entry' && part.state === 'output-available')
            return (
              <TrackingConfirmationCard
                key={part.toolCallId}
                id={part.toolCallId}
                output={part.output}
                onResolved={onTrackingResolved}
              />
            )
          if (part.type === 'file' && part.mediaType.startsWith('image/'))
            return (
              <Image
                key={`${message.id}-file-${index}`}
                source={{ uri: part.url }}
                style={{ width: 180, height: 150, borderRadius: 16, marginBottom: 8 }}
                accessibilityLabel="Attached food photo"
              />
            )
          if (part.type !== 'text') return null

          if (isUser) {
            return (
              <Text className="text-white text-base" key={`${message.id}-text-${index}`}>
                {part.text}
              </Text>
            )
          }

          return (
            <EnrichedMarkdownText
              key={`${message.id}-text-${index}`}
              allowTrailingMargin
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
