import { radius, shadows, spacing, typography, useTheme } from '@/theme'
import { ArrowUp, Camera, Mic, ScanBarcode, Square, X } from 'lucide-react-native'
import {
  forwardRef,
  useImperativeHandle,
  useRef,
  type ComponentRef,
  type ReactNode,
} from 'react'
import {
  Image,
  Pressable,
  TextInput,
  View,
  useWindowDimensions,
  type TextInputProps,
} from 'react-native'
import { KeyboardStickyView } from 'react-native-keyboard-controller'
import Animated, { useAnimatedStyle, type SharedValue } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

export type AnimatedInputRef = { focus: () => void; blur: () => void }
export const MIN_INPUT_HEIGHT = 108
export const MAX_INPUT_HEIGHT = 180
export type AnimatedInputProps = TextInputProps & {
  onSend: (text: string) => void
  hasMessages?: boolean
  keyboardHeight?: SharedValue<number>
  onFocusChange?: (focused: boolean) => void
  topContent?: ReactNode
  topContentVisible?: boolean
  disabled?: boolean
  onVoicePress?: () => void
  onPhotoPress?: () => void
  onBarcodePress?: () => void
  sending?: boolean
  onStop?: () => void
  attachmentUri?: string
  onRemoveAttachment?: () => void
}
export const AnimatedInput = forwardRef<AnimatedInputRef, AnimatedInputProps>(
  function AnimatedInput(
    {
      onSend,
      value,
      onChangeText,
      hasMessages,
      keyboardHeight,
      onFocusChange,
      topContent,
      topContentVisible,
      disabled,
      onVoicePress,
      onPhotoPress,
      onBarcodePress,
      sending,
      onStop,
      attachmentUri,
      onRemoveAttachment,
      ...props
    },
    ref,
  ) {
    const input = useRef<ComponentRef<typeof TextInput>>(null)
    const theme = useTheme()
    const insets = useSafeAreaInsets()
    const { height: windowHeight } = useWindowDimensions()
    const topContentStyle = useAnimatedStyle(() => ({
      maxHeight: Math.min(
        350,
        Math.max(
          100,
          windowHeight -
            Math.abs(keyboardHeight?.value ?? 0) -
            insets.top -
            insets.bottom -
            180,
        ),
      ),
    }))
    useImperativeHandle(ref, () => ({
      focus: () => input.current?.focus(),
      blur: () => input.current?.blur(),
    }))
    const hasText = !!value?.trim() || !!attachmentUri
    const action = () => {
      if (sending) {
        onStop?.()
        return
      }
      if (disabled) return
      if (hasText) {
        onSend(value?.trim() ?? '')
        onChangeText?.('')
      } else onVoicePress?.()
    }
    const iconButton = (label: string, Icon: typeof Camera, onPress?: () => void) => (
      <Pressable
        key={label}
        accessibilityRole="button"
        accessibilityLabel={label}
        disabled={disabled || sending}
        onPress={onPress}
        style={({ pressed }) => ({
          width: 44,
          height: 44,
          borderRadius: radius.full,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: disabled || sending ? 0.4 : pressed ? 0.5 : 1,
        })}
      >
        <Icon size={21} color={theme.mutedForeground} strokeWidth={1.8} />
      </Pressable>
    )
    return (
      <KeyboardStickyView
        offset={{ opened: insets.bottom }}
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          paddingHorizontal: spacing.lg,
          paddingBottom: insets.bottom + spacing.sm,
          zIndex: 20,
        }}
      >
        {topContentVisible && topContent && (
          <Animated.ScrollView
            keyboardShouldPersistTaps="handled"
            style={[{ marginBottom: spacing.md }, topContentStyle]}
          >
            {topContent}
          </Animated.ScrollView>
        )}
        <View
          style={{
            borderRadius: radius.xl,
            borderCurve: 'continuous',
            backgroundColor: theme.card,
            borderWidth: 1,
            borderColor: theme.border,
            boxShadow: shadows.raised,
            padding: spacing.sm,
          }}
        >
          {attachmentUri && (
            <View style={{ padding: spacing.sm, alignSelf: 'flex-start' }}>
              <Image
                source={{ uri: attachmentUri }}
                style={{ width: 64, height: 64, borderRadius: radius.md }}
              />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Remove photo"
                onPress={onRemoveAttachment}
                style={{
                  position: 'absolute',
                  top: 0,
                  right: 0,
                  padding: spacing.xs,
                  backgroundColor: theme.card,
                  borderRadius: radius.full,
                }}
              >
                <X size={18} color={theme.foreground} />
              </Pressable>
            </View>
          )}
          <TextInput
            ref={input}
            accessibilityLabel="Message Mora"
            value={value}
            onChangeText={onChangeText}
            multiline
            editable={!disabled}
            placeholder={disabled ? 'Answer the question above…' : 'Tell me what you ate…'}
            placeholderTextColor={theme.mutedForeground}
            selectionColor={theme.primary}
            style={[
              typography.chat,
              {
                color: theme.foreground,
                minHeight: 48,
                maxHeight: 140,
                paddingHorizontal: spacing.md,
                paddingVertical: spacing.sm,
              },
            ]}
            onFocus={() => onFocusChange?.(true)}
            onBlur={() => onFocusChange?.(false)}
            {...props}
          />
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            {iconButton('Attach a food photo', Camera, onPhotoPress)}
            {iconButton('Scan barcode', ScanBarcode, onBarcodePress)}
            <View style={{ flex: 1 }} />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={
                sending ? 'Stop response' : hasText ? 'Send message' : 'Start voice chat'
              }
              accessibilityState={{ disabled: !!disabled }}
              disabled={disabled && !sending}
              onPress={action}
              style={({ pressed }) => ({
                width: 44,
                height: 44,
                borderRadius: radius.full,
                backgroundColor: theme.primary,
                justifyContent: 'center',
                alignItems: 'center',
                opacity: pressed || disabled ? 0.6 : 1,
              })}
            >
              {sending ? (
                <Square size={16} fill={theme.onPrimary} color={theme.onPrimary} />
              ) : hasText ? (
                <ArrowUp size={22} color={theme.onPrimary} />
              ) : (
                <Mic size={20} color={theme.onPrimary} />
              )}
            </Pressable>
          </View>
        </View>
      </KeyboardStickyView>
    )
  },
)
