import { File, Paths } from 'expo-file-system'
import { shareAsync } from 'expo-sharing'
export async function exportJournal(json: string) {
  const file = new File(Paths.cache, 'mora-export.json')
  file.write(json)
  await shareAsync(file.uri, { mimeType: 'application/json', dialogTitle: 'Export Mora data' })
}
