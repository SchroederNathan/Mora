import { z } from 'zod'
const amount = z.number().finite().nonnegative().max(100000)
const date = z.iso.date()
const macros = z.object({
  calories: amount,
  protein: amount,
  carbs: amount,
  fat: amount,
  fiber: amount.optional(),
  sugar: amount.optional(),
  sodium: amount.optional(),
})
export const contextSchema = z.object({
  voiceMode: z.boolean().optional(),
  todayDateKey: date.optional(),
  userGoals: macros.nullable().optional(),
  foodHistory: z
    .array(
      z.object({
        date,
        totals: macros,
        entries: z
          .array(
            z.object({
              name: z.string().max(200),
              quantity: z.number().positive().max(2000),
              meal: z.string().max(20).optional(),
              nutrients: macros,
            }),
          )
          .max(250),
      }),
    )
    .max(14)
    .optional(),
})
export const chatRequestSchema = contextSchema
  .extend({
    messages: z
      .array(
        z.looseObject({
          id: z.string().min(1).max(200),
          role: z.enum(['user', 'assistant']),
          parts: z.array(z.record(z.string(), z.unknown())).max(100),
        }),
      )
      .min(1)
      .max(200),
  })
  .superRefine((body, ctx) => {
    for (const [messageIndex, message] of body.messages.entries()) {
      for (const [partIndex, part] of message.parts.entries()) {
        if (part.type !== 'file') continue
        if (
          typeof part.url !== 'string' ||
          part.url.length > 8000000 ||
          !/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(part.url) ||
          !['image/jpeg', 'image/png', 'image/webp'].includes(String(part.mediaType))
        )
          ctx.addIssue({
            code: 'custom',
            message: 'Use a JPEG, PNG, or WebP attachment.',
            path: ['messages', messageIndex, 'parts', partIndex],
          })
      }
    }
  })
export const speechRequestSchema = z.object({ text: z.string().trim().min(1).max(5000) })
export class RequestError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message)
  }
}
export async function readBody<T>(
  request: Request,
  schema: z.ZodType<T>,
  maxBytes = 1000000,
): Promise<T> {
  if (Number(request.headers.get('content-length')) > maxBytes)
    throw new RequestError('Request is too large.', 413)
  const body = await request.text()
  if (new TextEncoder().encode(body).length > maxBytes)
    throw new RequestError('Request is too large.', 413)
  const parsed = schema.safeParse(JSON.parse(body))
  if (!parsed.success) throw new RequestError('Check the request fields and try again.')
  return parsed.data
}
