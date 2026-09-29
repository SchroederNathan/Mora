import { Alert } from 'react-native'
export function confirmAction(
  title: string,
  message: string,
  confirmLabel: string,
  action: () => void,
  destructive = false,
) {
  Alert.alert(title, message, [
    { text: 'Cancel', style: 'cancel' },
    { text: confirmLabel, style: destructive ? 'destructive' : 'default', onPress: action },
  ])
}
