import { useTheme } from '@/theme'
import { Stack } from 'expo-router'
export default function AppLayout() {
  const theme = useTheme()
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        title: '',
        headerBackButtonDisplayMode: 'minimal',
        headerTintColor: theme.foreground,
        headerStyle: { backgroundColor: theme.background },
        contentStyle: { backgroundColor: theme.background },
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
    </Stack>
  )
}
