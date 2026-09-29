import { fetch as expoFetch } from 'expo/fetch'
import { supabase } from './supabase'

export async function authHeaders() {
  const { data } = (await supabase?.auth.getSession()) ?? { data: { session: null } }
  return data.session ? { Authorization: `Bearer ${data.session.access_token}` } : {}
}

export const authenticatedFetch: typeof expoFetch = async (input, init) => {
  const headers = new Headers(init?.headers)
  const auth = await authHeaders()
  if (auth.Authorization) headers.set('Authorization', auth.Authorization)
  return expoFetch(input, { ...init, headers })
}
