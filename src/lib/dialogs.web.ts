export function confirmAction(
  title: string,
  message: string,
  _confirmLabel: string,
  action: () => void,
  _destructive = false,
) {
  if (window.confirm(`${title}\n\n${message}`)) action()
}
