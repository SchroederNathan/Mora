import { AuthProvider, useAuth } from '@/contexts/auth-context'
import { useTrackingStore } from '@/stores/tracking-store'
import { useFonts } from 'expo-font'
import { Stack } from 'expo-router'
import * as SplashScreen from 'expo-splash-screen'
import { StatusBar } from 'expo-status-bar'
import { useEffect, useState } from 'react'
import { Appearance, Platform, View } from 'react-native'
import { KeyboardProvider } from 'react-native-keyboard-controller'
import { SafeAreaListener } from 'react-native-safe-area-context'
import { Uniwind } from 'uniwind'
import '../../globals.css'

import '@/polyfills'

// Prevent splash screen from auto-hiding
SplashScreen.preventAutoHideAsync()

function RootLayoutNav() {
  const { session, isLoading } = useAuth()
  const onboardingComplete = useTrackingStore((s) => s.onboardingComplete)
  const [fontsLoaded, fontError] = useFonts({
    'Satoshi Variable': require('../../assets/fonts/Satoshi-Variable.ttf'),
    'Sentient Variable': require('../../assets/fonts/Sentient-Variable.ttf'),
  })
  const appearance = useTrackingStore((s) => s.preferences.appearance)
  useEffect(() => {
    if (Platform.OS !== 'web')
      Appearance.setColorScheme(appearance === 'system' ? 'unspecified' : appearance)
    Uniwind.setTheme(appearance)
  }, [appearance])
  const [colorScheme, setColorScheme] = useState(() => Appearance.getColorScheme())

  useEffect(() => {
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      setColorScheme(colorScheme)
    })
    return () => subscription.remove()
  }, [])

  useEffect(() => {
    if (!isLoading && (fontsLoaded || fontError)) {
      SplashScreen.hideAsync()
    }
  }, [isLoading, fontsLoaded, fontError])

  if (isLoading || (!fontsLoaded && !fontError)) {
    return null
  }

  return (
    <SafeAreaListener
      onChange={({ insets }) => {
        Uniwind.updateInsets(insets)
      }}
    >
      <View className={`flex-1 ${colorScheme === 'dark' ? 'dark' : 'light'}`}>
        <StatusBar style="auto" />
        <KeyboardProvider>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Protected guard={!!session && onboardingComplete}>
              <Stack.Screen name="(app)" />
            </Stack.Protected>
            <Stack.Protected guard={!session || !onboardingComplete}>
              <Stack.Screen name="onboarding" />
            </Stack.Protected>
          </Stack>
        </KeyboardProvider>
      </View>
    </SafeAreaListener>
  )
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootLayoutNav />
    </AuthProvider>
  )
}
