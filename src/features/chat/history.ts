import type { UIMessage } from 'ai'
/** Bound request and storage size. Retain recent images within an 8 MB budget. */
export function recentConversation(messages: UIMessage[], limit = 60): UIMessage[] {
  let imageBytes = 0
  const recent = messages.slice(-limit)
  return recent
    .reverse()
    .map((message, index) => ({
      ...message,
      parts: message.parts.map((part) => {
        if (part.type !== 'file') return part
        if (index >= 4 || imageBytes + part.url.length > 8000000)
          return { type: 'text' as const, text: '[Earlier food photo]' }
        imageBytes += part.url.length
        return part
      }),
    }))
    .reverse()
}
