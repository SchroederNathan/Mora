import type { JSX } from 'react'
import type { UIMessage } from 'ai'
import { Platform } from 'react-native'

type MessageBubbleProps = {
  message: UIMessage
}

// eslint-disable-next-line @typescript-eslint/no-require-imports
const MessageBubbleWeb = require('./MessageBubble.web').MessageBubble
// eslint-disable-next-line @typescript-eslint/no-require-imports
const MessageBubbleNative = require('./MessageBubble.native').MessageBubble

const MessageBubbleImpl =
  Platform.OS === 'web'
    ? MessageBubbleWeb
    : MessageBubbleNative

export const MessageBubble = MessageBubbleImpl as (props: MessageBubbleProps) => JSX.Element
