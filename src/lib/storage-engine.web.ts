const prefix = 'mora-data:'
export const storage = {
  getString: (key: string) =>
    typeof localStorage === 'undefined'
      ? undefined
      : (localStorage.getItem(prefix + key) ?? undefined),
  set: (key: string, value: string) => {
    if (typeof localStorage !== 'undefined') localStorage.setItem(prefix + key, value)
  },
  remove: (key: string) => {
    if (typeof localStorage !== 'undefined') localStorage.removeItem(prefix + key)
  },
  getAllKeys: () =>
    typeof localStorage === 'undefined'
      ? []
      : Object.keys(localStorage)
          .filter((key) => key.startsWith(prefix))
          .map((key) => key.slice(prefix.length)),
  clearAll: () => {
    if (typeof localStorage !== 'undefined')
      Object.keys(localStorage)
        .filter((key) => key.startsWith(prefix))
        .forEach((key) => localStorage.removeItem(key))
  },
}
