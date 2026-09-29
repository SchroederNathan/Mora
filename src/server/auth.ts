import { RequestError } from '@/server/ai/request'
import { createClient } from '@supabase/supabase-js'

export async function requireUser(request: Request) {
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL
  const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  if (!token || !url || !key) return null
  const client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data, error } = await client.auth.getUser(token)
  return error ? null : data.user
}

export function authenticated(handler: (request: Request) => Promise<Response>) {
  return async (request: Request) => {
    try {
      if (!(await requireUser(request)))
        return Response.json({ error: 'Sign in to continue.' }, { status: 401 })
      return await handler(request)
    } catch (error) {
      if (error instanceof RequestError)
        return Response.json({ error: error.message }, { status: error.status })
      if (error instanceof SyntaxError)
        return Response.json({ error: 'Invalid JSON.' }, { status: 400 })
      console.error('[API]', error instanceof Error ? error.message : 'Request failed')
      return Response.json(
        { error: 'The request could not be completed. Please try again.' },
        { status: 500 },
      )
    }
  }
}
