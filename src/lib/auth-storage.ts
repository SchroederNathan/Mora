import { createMMKV } from 'react-native-mmkv'
const storage = createMMKV({ id: 'supabase-auth' })
export const authStorage = {
  getItem: (key: string) => storage.getString(key) ?? null,
  setItem: (key: string, value: string) => storage.set(key, value),
  removeItem: (key: string) => {
    storage.remove(key)
  },
}
