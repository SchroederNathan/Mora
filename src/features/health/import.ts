export const healthAvailable = false
export async function importHealth(): Promise<string> {
  throw new Error('Apple Health import is available on iPhone.')
}
