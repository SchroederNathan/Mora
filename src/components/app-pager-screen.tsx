import { Text } from '@/components/ui/text'
import { PagerNavigationContext } from '@/contexts/pager-contexts'
import ChatScreen from '@/screens/chat-screen'
import HomeScreen from '@/screens/home-screen'
import ProgressScreen from '@/screens/progress-screen'
import { radius, spacing, useTheme } from '@/theme'
import { router } from 'expo-router'
import {
  ChartNoAxesCombined,
  LayoutDashboard,
  MessageCircle,
  Settings,
} from 'lucide-react-native'
import { useMemo, useRef, useState } from 'react'
import { Keyboard, Pressable, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

const tabs = [
  { label: 'Today', Icon: LayoutDashboard },
  { label: 'Mora', Icon: MessageCircle },
  { label: 'Progress', Icon: ChartNoAxesCombined },
]
export default function AppPagerScreen() {
  const [page, setPage] = useState(1)
  const insets = useSafeAreaInsets()
  const theme = useTheme()
  const leaveChatListeners = useRef(new Set<() => void>())
  const navigation = useMemo(
    () => ({
      onLeaveChat: (listener: () => void) => {
        leaveChatListeners.current.add(listener)
        return () => {
          leaveChatListeners.current.delete(listener)
        }
      },
      navigateToPage: (index: number) => {
        if (index !== 1) leaveChatListeners.current.forEach((listener) => listener())
        Keyboard.dismiss()
        setPage(index)
      },
    }),
    [],
  )
  return (
    <PagerNavigationContext value={navigation}>
      <View style={{ flex: 1, backgroundColor: theme.background }}>
        {[HomeScreen, ChatScreen, ProgressScreen].map((Screen, index) => (
          <View
            key={index}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              opacity: page === index ? 1 : 0,
              zIndex: page === index ? 1 : 0,
            }}
            pointerEvents={page === index ? 'auto' : 'none'}
            accessibilityElementsHidden={page !== index}
            importantForAccessibility={page === index ? 'auto' : 'no-hide-descendants'}
          >
            <Screen />
          </View>
        ))}
        <View
          style={{
            position: 'absolute',
            zIndex: 100,
            top: 0,
            left: 0,
            right: 0,
            paddingTop: insets.top + spacing.sm,
            paddingBottom: spacing.md,
            paddingHorizontal: spacing.xl,
            backgroundColor: theme.background,
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.sm,
          }}
        >
          <View style={{ flex: 1, flexDirection: 'row', gap: spacing.xs }}>
            {tabs.map(({ label, Icon }, index) => (
              <Pressable
                key={label}
                accessibilityRole="tab"
                accessibilityState={{ selected: index === page }}
                accessibilityLabel={index === 1 ? 'Chat with Mora' : label}
                onPress={() => navigation.navigateToPage(index)}
                style={({ pressed }) => ({
                  paddingHorizontal: spacing.md,
                  minHeight: 44,
                  flexDirection: 'row',
                  gap: spacing.sm,
                  alignItems: 'center',
                  borderRadius: radius.full,
                  backgroundColor: page === index ? theme.chat : 'transparent',
                  opacity: pressed ? 0.6 : 1,
                })}
              >
                <Icon
                  size={18}
                  color={page === index ? theme.primary : theme.mutedForeground}
                />
                <Text
                  variant="label"
                  style={{ color: page === index ? theme.primary : theme.mutedForeground }}
                >
                  {label}
                </Text>
              </Pressable>
            ))}
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Settings"
            onPress={() => {
              leaveChatListeners.current.forEach((listener) => listener())
              router.push('/settings')
            }}
            style={({ pressed }) => ({
              width: 44,
              height: 44,
              alignItems: 'center',
              justifyContent: 'center',
              opacity: pressed ? 0.5 : 1,
            })}
          >
            <Settings size={21} color={theme.mutedForeground} />
          </Pressable>
        </View>
      </View>
    </PagerNavigationContext>
  )
}
