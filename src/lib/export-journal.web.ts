export async function exportJournal(json: string) {
  const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }))
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = 'mora-export.json'
  anchor.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
