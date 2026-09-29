import { chatRequestSchema, readBody } from '@/server/ai/request'
import { buildAssistantSystemPrompt, buildAssistantTools } from '@/server/ai/runtime'
import { authenticated } from '@/server/auth'
import { createGateway } from '@ai-sdk/gateway'
import {
  convertToModelMessages,
  safeValidateUIMessages,
  stepCountIs,
  streamText,
  type InferUITools,
  type UIDataTypes,
  type UIMessage,
} from 'ai'

const gateway = createGateway()
export const POST = authenticated(async (request) => {
  const { messages, ...context } = await readBody(request, chatRequestSchema, 12000000)
  const tools = buildAssistantTools(context)
  const validated = await safeValidateUIMessages<
    UIMessage<unknown, UIDataTypes, InferUITools<typeof tools>>
  >({ messages, tools })
  if (!validated.success)
    return Response.json(
      { error: 'This conversation could not be read. Start a new chat.' },
      { status: 400 },
    )
  const result = streamText({
    model: gateway(process.env.CHAT_MODEL || 'google/gemini-3-flash'),
    messages: await convertToModelMessages(validated.data),
    stopWhen: stepCountIs(5),
    tools,
    abortSignal: request.signal,
    system: buildAssistantSystemPrompt(context),
  })
  return result.toUIMessageStreamResponse({
    headers: {
      'Content-Type': 'application/octet-stream',
      'Content-Encoding': 'none',
      'Cache-Control': 'no-store',
    },
  })
})
