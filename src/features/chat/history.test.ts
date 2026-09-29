import type { UIMessage } from 'ai'
import { expect, test } from 'bun:test'
import { recentConversation } from './history'
test('bounds history and image payloads without modifying the saved transcript', () => {
  const photo = 'data:image/jpeg;base64,' + 'a'.repeat(5000000)
  const messages: UIMessage[] = Array.from({ length: 62 }, (_, i) => ({
    id: String(i),
    role: 'user',
    parts:
      i > 59
        ? [{ type: 'file', mediaType: 'image/jpeg', url: photo }]
        : [{ type: 'text', text: 'Hello' }],
  }))
  const recent = recentConversation(messages)
  expect(recent).toHaveLength(60)
  expect(recent.at(-1)?.parts[0].type).toBe('file')
  expect(recent.at(-2)?.parts[0].type).toBe('text')
  expect(messages.at(-2)?.parts[0].type).toBe('file')
})
