import { GradientBorderCard } from '@/components/ui/gradient-border-card'
import { Text } from '@/components/ui/text'
import { Haptics } from '@/lib/haptics'
import { useTheme } from '@/theme'
import { ArrowUp } from 'lucide-react-native'
import { useCallback, useState } from 'react'
import { Pressable, TextInput, View } from 'react-native'
import Animated, { FadeInUp, LinearTransition } from 'react-native-reanimated'

type ClarificationCardProps = {
  question: string
  options?: { label: string; value: string }[]
  allowFreeform?: boolean
  context?: string
  onSubmit: (answer: string) => void
  /** Called immediately on selection, before the delayed onSubmit — use to start exit animation */
  onDismiss?: () => void
}

const chipLayoutTransition = LinearTransition.springify()

export function ClarificationCard({
  question,
  options,
  allowFreeform = true,
  context,
  onSubmit,
  onDismiss,
}: ClarificationCardProps) {
  const theme = useTheme()
  const [selectedValue, setSelectedValue] = useState<string | null>(null)
  const [freeformText, setFreeformText] = useState('')

  const handleChipPress = useCallback(
    (value: string) => {
      Haptics.selection()
      setSelectedValue(value)
      onDismiss?.() // Start exit animation immediately
      // Submit after brief visual feedback
      setTimeout(() => {
        onSubmit(value)
      }, 300)
    },
    [onSubmit, onDismiss],
  )

  const handleFreeformSubmit = useCallback(() => {
    if (!freeformText.trim()) return
    Haptics.selection()
    onDismiss?.() // Start exit animation immediately
    onSubmit(freeformText.trim())
  }, [freeformText, onSubmit, onDismiss])

  return (
    <View className="mx-1 -mb-2">
      <GradientBorderCard
        borderRadius={{ topLeft: 20, topRight: 20, bottomLeft: 0, bottomRight: 0 }}
        padding={{ padding: 16, paddingBottom: 24 }}
      >
        {/* Question */}
        <Text className="text-foreground text-lg font-semibold mb-1">{question}</Text>

        {/* Context */}
        {context && <Text className="text-muted-foreground text-sm mb-3">{context}</Text>}

        {/* Option chips */}
        {options && options.length > 0 && (
          <Animated.View layout={chipLayoutTransition} className="gap-2 mt-3">
            {options.map((option, index) => {
              const isSelected = selectedValue === option.value
              return (
                <Animated.View
                  key={option.value}
                  entering={FadeInUp.delay(index * 60)
                    .duration(300)
                    .springify()}
                >
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => handleChipPress(option.value)}
                    disabled={selectedValue !== null}
                    style={{
                      paddingHorizontal: 16,
                      paddingVertical: 12,
                      borderRadius: 12,
                      borderCurve: 'continuous',
                      borderWidth: 1.5,
                      borderColor: isSelected ? theme.primary : theme.border,
                      backgroundColor: isSelected ? theme.primary : 'transparent',
                      opacity: selectedValue !== null && !isSelected ? 0.4 : 1,
                    }}
                  >
                    <Text
                      className="text-sm font-medium"
                      style={{ color: isSelected ? theme.onPrimary : theme.foreground }}
                    >
                      {option.label}
                    </Text>
                  </Pressable>
                </Animated.View>
              )
            })}
          </Animated.View>
        )}

        {/* Freeform text input */}
        {allowFreeform && selectedValue === null && (
          <View
            className="flex-row items-center mt-4 gap-2"
            style={{
              borderWidth: 1,
              borderColor: theme.border,
              borderRadius: 999,
              paddingLeft: 16,
              paddingRight: 4,
              paddingVertical: 4,
            }}
          >
            <TextInput
              accessibilityLabel="Answer Mora"
              value={freeformText}
              onChangeText={setFreeformText}
              placeholder="Type your answer..."
              placeholderTextColor={theme.mutedForeground}
              selectionColor={theme.primary}
              className="flex-1 text-foreground text-sm"
              style={{ fontFamily: 'Sentient Variable', minHeight: 32, paddingVertical: 4 }}
              onSubmitEditing={handleFreeformSubmit}
              returnKeyType="send"
            />
            {freeformText.trim().length > 0 && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Submit answer"
                onPress={handleFreeformSubmit}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  backgroundColor: theme.primary,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <ArrowUp size={16} color={theme.onPrimary} strokeWidth={3} />
              </Pressable>
            )}
          </View>
        )}
      </GradientBorderCard>
    </View>
  )
}
