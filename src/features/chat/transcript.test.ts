import type { UIMessage } from 'ai'
import { describe, expect, test } from 'bun:test'
import { latestToolActivity, pendingQuestion, reconcileDraft } from './transcript'
const entry = {
  name: 'Banana',
  quantity: 1,
  serving: { amount: 1, unit: 'medium', gramWeight: 118 },
  nutrients: { calories: 105, protein: 1.3, carbs: 27, fat: 0.4 },
}
const message = (
  id: string,
  tool: string,
  output: unknown,
  state = 'output-available',
): UIMessage =>
  ({
    id,
    role: 'assistant',
    parts: [{ type: `tool-${tool}`, toolCallId: id, state, input: {}, output }],
  }) as UIMessage
describe('chat draft reconciliation', () => {
  test('replayed tool results cannot log a second draft after confirmation', () => {
    const messages = [message('one', 'lookup_and_log_food', { success: true, entry })]
    const first = reconcileDraft(messages, [], [])
    expect(first.entries).toHaveLength(1)
    expect(reconcileDraft(messages, [], first.processed).entries).toEqual([])
  })
  test('supports fractional corrections and removal in transcript order', () => {
    const messages = [
      message('one', 'lookup_and_log_food', { success: true, entry }),
      message('two', 'update_food_servings', {
        success: true,
        foodName: 'BANANA',
        newQuantity: 0.5,
      }),
    ]
    const updated = reconcileDraft(messages, [], [])
    expect(updated.entries[0].entry.quantity).toBe(0.5)
    expect(
      reconcileDraft(
        [
          ...messages,
          message('three', 'remove_food_entry', { success: true, foodName: 'banana' }),
        ],
        updated.entries,
        updated.processed,
      ).entries,
    ).toEqual([])
  })
  test('ignores malformed, failed, incomplete, and out of range tool results', () => {
    const messages = [
      message('one', 'lookup_and_log_food', {
        success: true,
        entry: { ...entry, quantity: -1 },
      }),
      message('two', 'lookup_and_log_food', { success: false, entry }),
      message('three', 'lookup_and_log_food', { success: true, entry }, 'input-streaming'),
    ]
    expect(reconcileDraft(messages, [], []).entries).toEqual([])
  })
  test('resolves an earlier voice clarification by the same tool id', () => {
    const question = {
      id: 'assistant',
      role: 'assistant',
      parts: [
        {
          type: 'tool-ask_user',
          toolCallId: 'q1',
          state: 'input-available',
          input: { question: 'How much?', options: [{ label: 'Half', value: '0.5' }] },
        },
      ],
    } as UIMessage
    expect(pendingQuestion([question])?.question).toBe('How much?')
    expect(pendingQuestion([question, message('q1', 'ask_user', 'half')])).toBeNull()
  })
  test('does not show a previous turn tool as current activity', () => {
    expect(
      latestToolActivity([
        message('one', 'lookup_and_log_food', {}),
        { id: 'two', role: 'user', parts: [{ type: 'text', text: 'Hello' }] },
      ]).toolName,
    ).toBeNull()
  })
})
