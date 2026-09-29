import { contextSchema, readBody } from '@/server/ai/request'
import { assistantToolSchemas, executeAssistantTool } from '@/server/ai/runtime'
import { authenticated } from '@/server/auth'
import { z } from 'zod'

const schema = contextSchema.extend({
  toolName: z.enum(
    Object.keys(assistantToolSchemas) as [
      keyof typeof assistantToolSchemas,
      ...(keyof typeof assistantToolSchemas)[],
    ],
  ),
  input: z.unknown(),
})
export const POST = authenticated(async (request) => {
  const { toolName, input, ...context } = await readBody(request, schema)
  const parsed = assistantToolSchemas[toolName].safeParse(input)
  if (!parsed.success) return Response.json({ error: 'Invalid tool input.' }, { status: 400 })
  return Response.json({ output: await executeAssistantTool(toolName, parsed.data, context) })
})
