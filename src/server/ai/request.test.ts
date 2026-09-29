import { expect, test } from 'bun:test'
import { chatRequestSchema, contextSchema, readBody, speechRequestSchema } from './request'
test('rejects system messages, invalid goals, dates, and oversized history', () => {
  expect(
    chatRequestSchema.safeParse({ messages: [{ id: '1', role: 'system', parts: [] }] }).success,
  ).toBe(false)
  expect(
    contextSchema.safeParse({ userGoals: { calories: -1, protein: 100, carbs: 100, fat: 50 } })
      .success,
  ).toBe(false)
  expect(contextSchema.safeParse({ todayDateKey: '2026-02-31' }).success).toBe(false)
  expect(
    contextSchema.safeParse({
      foodHistory: Array(15).fill({
        date: '2026-09-28',
        entries: [],
        totals: { calories: 0, protein: 0, carbs: 0, fat: 0 },
      }),
    }).success,
  ).toBe(false)
})
test('speech request bounds and JSON errors fail before provider calls', async () => {
  expect(speechRequestSchema.safeParse({ text: 'x'.repeat(5001) }).success).toBe(false)
  await expect(
    readBody(
      new Request('https://mora.test', { method: 'POST', body: 'bad json' }),
      speechRequestSchema,
    ),
  ).rejects.toBeInstanceOf(SyntaxError)
  await expect(
    readBody(
      new Request('https://mora.test', {
        method: 'POST',
        body: JSON.stringify({ text: 'too large' }),
      }),
      speechRequestSchema,
      5,
    ),
  ).rejects.toMatchObject({ status: 413 })
})
test('only accepts inline image attachments, never provider-side remote fetches', () => {
  const body = (url: string) => ({
    messages: [
      { id: 'image', role: 'user', parts: [{ type: 'file', mediaType: 'image/jpeg', url }] },
    ],
  })
  expect(chatRequestSchema.safeParse(body('http://localhost/private')).success).toBe(false)
  expect(chatRequestSchema.safeParse(body('data:image/jpeg;base64,YWJj')).success).toBe(true)
})
