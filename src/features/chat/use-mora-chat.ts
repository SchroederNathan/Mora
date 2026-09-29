import { type AnimatedInputRef, MIN_INPUT_HEIGHT } from '@/components/chat/index'
import { PagerNavigationContext } from '@/contexts/pager-contexts'
import { buildAssistantContext as getAssistantContext } from '@/features/chat/context'
import { useDraftStore } from '@/features/chat/draft-store'
import { latestToolActivity, pendingQuestion } from '@/features/chat/transcript'
import { useRealtimeVoiceChat } from '@/features/voice/use-realtime-voice-chat'
import { useVoiceChat } from '@/features/voice/use-voice-chat'
import { authenticatedFetch as expoFetch } from '@/lib/api-client'
import { confirmAction } from '@/lib/dialogs'
import { Haptics } from '@/lib/haptics'
import { getChatMessages, saveChatMessages } from '@/lib/storage'
import { useDailyLogStore, useUserStore } from '@/stores/index'
import { useTheme } from '@/theme'
import { formatDateKey } from '@/types/nutrition'
import { generateAPIUrl } from '@/utils'
import { useChat } from '@ai-sdk/react'
import { type LegendListRef } from '@legendapp/list/react-native'
import type { UIMessage } from 'ai'
import { DefaultChatTransport, lastAssistantMessageIsCompleteWithToolCalls } from 'ai'
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator'
import * as ImagePicker from 'expo-image-picker'
import { useCallback, useContext, useEffect, useRef, useState } from 'react'
import { Alert, AppState, Keyboard, Platform, useWindowDimensions } from 'react-native'
import { useReanimatedKeyboardAnimation } from 'react-native-keyboard-controller'
import { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { recentConversation } from './history'

type VoiceTransport = 'realtime' | 'legacy'

export function useMoraChat() {
  const pager = useContext(PagerNavigationContext)
  const theme = useTheme()
  const [attachment, setAttachment] = useState<{
    uri: string
    data: string
    mediaType: string
  } | null>(null)
  const [initialMessages] = useState(() => getChatMessages() ?? [])
  const [photoError, setPhotoError] = useState('')
  const [voiceError, setVoiceError] = useState('')
  const [input, setInput] = useState('')
  const [isThinking, setIsThinking] = useState(false)
  const [thinkingStartTime, setThinkingStartTime] = useState<number | null>(null)
  const pendingEntries = useDraftStore((s) => s.entries)
  const setPendingEntries = useDraftStore((s) => s.update)
  const showCard = pendingEntries.length > 0
  const mealTitle =
    pendingEntries.length > 1
      ? pendingEntries
          .slice(0, 2)
          .map((pending) => pending.entry.name)
          .join(' & ')
      : null
  const isTitleLoading = false
  const [clarificationDismissing, setClarificationDismissing] = useState(false)
  const [voiceMode, setVoiceMode] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [lastAssistantText, setLastAssistantText] = useState('')
  const [voiceTransport, setVoiceTransport] = useState<VoiceTransport>('realtime')

  const voiceModeRef = useRef(false)
  const legacySpeakRef = useRef<((text: string) => Promise<void>) | undefined>(undefined)
  const legacyStartListeningRef = useRef<(() => Promise<void>) | undefined>(undefined)
  const pendingClarificationRef = useRef<typeof pendingClarification>(null)
  const addToolOutputRef = useRef<typeof addToolOutput>(null as any)
  const spokenToolCallsRef = useRef<Set<string>>(new Set())
  const voiceModeWhenSentRef = useRef(false)
  const voicePrefetchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const realtimeAssistantMessageIdRef = useRef<string | null>(null)
  const realtimeSubmitToolResponseRef = useRef<
    ((toolCallId: string, output: unknown) => void) | undefined
  >(undefined)
  const listRef = useRef<LegendListRef>(null)
  const inputRef = useRef<AnimatedInputRef>(null)
  const insets = useSafeAreaInsets()
  const headerHeight = insets.top + 76
  const { width: screenWidth, height: screenHeight } = useWindowDimensions()
  // Keyboard animation for content padding
  const { height: keyboardHeight } = useReanimatedKeyboardAnimation()

  // Zustand stores - destructure functions for stable references
  const loadDailyLog = useDailyLogStore((s) => s.load)
  const addMeal = useDailyLogStore((s) => s.addMeal)
  const loadUserStore = useUserStore((s) => s.load)

  // Load stores on mount
  useEffect(() => {
    loadDailyLog()
    loadUserStore()
  }, [loadDailyLog, loadUserStore])

  const buildAssistantContext = useCallback(() => getAssistantContext(voiceMode), [voiceMode])

  const {
    messages,
    error,
    status,
    stop,
    regenerate,
    clearError,
    sendMessage,
    addToolOutput,
    setMessages,
  } = useChat({
    messages: initialMessages,
    experimental_throttle: 50,
    transport: new DefaultChatTransport({
      fetch: expoFetch as unknown as typeof globalThis.fetch,
      api: generateAPIUrl('/api/chat'),
      prepareSendMessagesRequest: ({ messages, body }) => ({
        body: { ...body, messages: recentConversation(messages) },
      }),
      body: () => {
        const context = buildAssistantContext()
        return context
      },
    }),
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
    onError: (error) => {
      console.error(error, 'ERROR')
      setIsThinking(false)
      // Recover voice mode — restart listening so it doesn't get stuck in processing
      if (voiceModeRef.current) {
        setTimeout(() => {
          if (voiceModeRef.current) {
            legacyStartListeningRef.current?.()
          }
        }, 500)
      }
    },
    onFinish: ({ message }) => {
      // Don't clear isThinking if there's an unanswered ask_user — the user
      // still needs to respond and thinking should persist until then.
      const hasUnansweredAskUser = message.parts?.some(
        (p: any) => p.type === 'tool-ask_user' && p.state !== 'output-available',
      )
      if (!hasUnansweredAskUser) {
        setIsThinking(false)
      }
      // Clear tool activity after a short delay to show completion state

      // Voice mode: speak the assistant's text response
      // Use voiceModeWhenSentRef so speech still fires even if voice UI
      // was soft-exited (e.g. food confirmation card appeared)
      if (voiceModeWhenSentRef.current && message.parts) {
        voiceModeWhenSentRef.current = false
        const hasAskUser = message.parts.some(
          (p: any) =>
            p.type === 'tool-ask_user' && spokenToolCallsRef.current.has(p.toolCallId),
        )
        if (!hasAskUser) {
          const textParts = message.parts
            .filter((p: any) => p.type === 'text' && p.text?.trim())
            .map((p: any) => p.text.trim())
            .join(' ')
          if (textParts) {
            legacySpeakRef.current?.(textParts)
          } else {
            // No speakable text (tool-only response) — restart listening
            setTimeout(() => {
              if (voiceModeRef.current) {
                legacyStartListeningRef.current?.()
              }
            }, 300)
          }
        }
      }
    },
  })

  useEffect(() => {
    if (status === 'streaming' || status === 'submitted') return
    saveChatMessages(recentConversation(messages, 200))
  }, [messages, status])

  const pendingClarification = pendingQuestion(messages)
  const toolActivity = latestToolActivity(messages)
  useEffect(() => {
    useDraftStore.getState().reconcile(messages)
  }, [messages])

  const createVoiceMessageId = useCallback(
    (role: 'user' | 'assistant') =>
      `voice-${role}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    [],
  )

  const appendVoiceUserMessage = useCallback(
    (text: string) => {
      const trimmed = text.trim()
      if (!trimmed) return

      const messageId = createVoiceMessageId('user')
      setMessages((prev) => [
        ...prev,
        {
          id: messageId,
          role: 'user',
          parts: [{ type: 'text', text: trimmed }],
        },
      ])
    },
    [createVoiceMessageId, setMessages],
  )

  const updateRealtimeAssistantMessage = useCallback(
    (update: (message: UIMessage) => UIMessage) => {
      let messageId = realtimeAssistantMessageIdRef.current
      if (!messageId) {
        messageId = createVoiceMessageId('assistant')
        realtimeAssistantMessageIdRef.current = messageId
      }

      setMessages((prev) => {
        let found = false
        const next = prev.map((message) => {
          if (message.id !== messageId) return message
          found = true
          return update(message)
        })

        if (found) return next

        return [
          ...next,
          update({
            id: messageId,
            role: 'assistant',
            parts: [],
          } as UIMessage),
        ]
      })

      return messageId
    },
    [createVoiceMessageId, setMessages],
  )

  const upsertRealtimeAssistantText = useCallback(
    (text: string, state: 'streaming' | 'done' = 'streaming') => {
      const trimmed = text.trim()
      if (!trimmed) return

      updateRealtimeAssistantMessage((message) => {
        const parts = [...(message.parts || [])]
        const existingIndex = parts.findIndex((part) => part.type === 'text')
        const textPart = { type: 'text', text: trimmed, state } as const

        if (existingIndex === -1) {
          parts.unshift(textPart as any)
        } else {
          parts[existingIndex] = textPart as any
        }

        return { ...message, parts }
      })
      setLastAssistantText(trimmed)
    },
    [updateRealtimeAssistantMessage],
  )

  const upsertRealtimeToolPart = useCallback(
    (toolName: string, toolCallId: string, patch: Record<string, unknown>) => {
      updateRealtimeAssistantMessage((message) => {
        const parts = [...(message.parts || [])]
        const partType = `tool-${toolName}`
        const existingIndex = parts.findIndex(
          (part: any) => part.type === partType && part.toolCallId === toolCallId,
        )
        const nextPart = {
          ...(existingIndex >= 0 ? (parts[existingIndex] as any) : {}),
          type: partType,
          toolCallId,
          ...patch,
        }

        if (existingIndex === -1) {
          parts.push(nextPart)
        } else {
          parts[existingIndex] = nextPart
        }

        return { ...message, parts }
      })
    },
    [updateRealtimeAssistantMessage],
  )

  const realtimeVoiceChat = useRealtimeVoiceChat({
    getToolContext: buildAssistantContext,
    onTranscript: (text, isFinal) => {
      if (!isFinal || !text.trim()) return

      appendVoiceUserMessage(text)
      realtimeAssistantMessageIdRef.current = null
      setIsThinking(true)
      setThinkingStartTime(Date.now())
      setLastAssistantText('')

      const clarification = pendingClarificationRef.current
      if (clarification) {
        upsertRealtimeToolPart('ask_user', clarification.toolCallId, {
          state: 'output-available',
          input: {
            question: clarification.question,
            options: clarification.options,
            allowFreeform: clarification.allowFreeform,
            context: clarification.context,
          },
          output: text,
        })
        realtimeSubmitToolResponseRef.current?.(clarification.toolCallId, text)
      }
    },
    onAssistantTranscript: (text, isFinal) => {
      if (!text.trim()) return
      upsertRealtimeAssistantText(text, isFinal ? 'done' : 'streaming')
    },
    onAssistantTurnComplete: (text) => {
      if (text.trim()) {
        upsertRealtimeAssistantText(text, 'done')
      }
      setIsThinking(false)
      realtimeAssistantMessageIdRef.current = null
    },
    onToolCallStart: (call) => {
      upsertRealtimeToolPart(call.name, call.id, {
        state: 'input-available',
        input: call.input,
      })

      setIsThinking(true)
    },
    onToolCallResult: (call, output) => {
      upsertRealtimeToolPart(call.name, call.id, {
        state: 'output-available',
        input: call.input,
        output,
      })
    },
    onToolCallError: (call, error) => {
      upsertRealtimeToolPart(call.name, call.id, {
        state: 'output-error',
        input: call.input,
        errorText: error,
      })
      setIsThinking(false)
    },
    onError: (error) => {
      console.error('[VOICE LIVE] Error:', error)
    },
    onNeedsFallback: (reason) => {
      console.warn('[VOICE LIVE] Falling back to legacy voice:', reason)
      void fallbackToLegacyVoice()
    },
  })

  // Legacy voice chat hook
  const legacyVoiceChat = useVoiceChat({
    onError: (message) => {
      setVoiceError(
        /permission/i.test(message)
          ? 'Allow microphone and speech access in Settings, then reopen voice chat.'
          : 'Voice could not connect. Close this view and try again, or type your message.',
      )
      setIsThinking(false)
    },
    onTranscript: (text, isFinal) => {
      if (isFinal && text.trim()) {
        // If there's a pending clarification, route the answer to addToolOutput
        const clarification = pendingClarificationRef.current
        if (clarification) {
          setIsThinking(true)
          setThinkingStartTime(Date.now())
          voiceModeWhenSentRef.current = true
          addToolOutputRef.current?.({
            tool: 'ask_user',
            toolCallId: clarification.toolCallId,
            output: text,
          })
        } else {
          setIsThinking(true)
          setThinkingStartTime(Date.now())
          voiceModeWhenSentRef.current = true
          sendMessage({ text })
        }
      }
    },
    onSpeakingStart: (text) => {
      setLastAssistantText(text)
    },
    onSpeakingEnd: () => {
      // Auto-resume listening after TTS finishes
      if (voiceModeRef.current) {
        setTimeout(() => {
          if (voiceModeRef.current) {
            legacyStartListeningRef.current?.()
          }
        }, 300)
      }
    },
  })

  // Keep function refs in sync
  useEffect(() => {
    legacySpeakRef.current = legacyVoiceChat.speak
    legacyStartListeningRef.current = legacyVoiceChat.startListening
    realtimeSubmitToolResponseRef.current = realtimeVoiceChat.submitToolResponse
  }, [
    legacyVoiceChat.speak,
    legacyVoiceChat.startListening,
    realtimeVoiceChat.submitToolResponse,
  ])

  useEffect(() => {
    addToolOutputRef.current = addToolOutput
  }, [addToolOutput])

  const fallbackToLegacyVoice = useCallback(async () => {
    if (!voiceModeRef.current) return

    realtimeVoiceChat.disconnect()
    setVoiceTransport('legacy')
    legacyVoiceChat.setVoiceModeActive(true)
    await legacyVoiceChat.startListening()
  }, [legacyVoiceChat, realtimeVoiceChat])

  useEffect(() => {
    return () => {
      if (voicePrefetchTimerRef.current) {
        clearTimeout(voicePrefetchTimerRef.current)
      }
    }
  }, [])

  useEffect(() => {
    pendingClarificationRef.current = pendingClarification
  }, [pendingClarification])

  // Keep voiceModeRef in sync
  useEffect(() => {
    voiceModeRef.current = voiceMode
  }, [voiceMode])

  useEffect(() => {
    if (!voiceModeWhenSentRef.current) return
    if (voiceTransport !== 'legacy') return

    const lastUserMessageIndex = messages.findLastIndex((m) => m.role === 'user')
    if (lastUserMessageIndex === -1) return

    const assistantMessagesAfterUser = messages
      .slice(lastUserMessageIndex + 1)
      .filter((m) => m.role === 'assistant')
    const lastAssistantMessage =
      assistantMessagesAfterUser[assistantMessagesAfterUser.length - 1]
    if (!lastAssistantMessage?.parts) return

    const textParts = lastAssistantMessage.parts
      .filter((p: any) => p.type === 'text' && p.text?.trim())
      .map((p: any) => p.text.trim())
      .join(' ')

    if (!textParts) return

    if (voicePrefetchTimerRef.current) {
      clearTimeout(voicePrefetchTimerRef.current)
    }

    voicePrefetchTimerRef.current = setTimeout(() => {
      legacyVoiceChat.prefetchSpeech(textParts)
    }, 150)
  }, [legacyVoiceChat, messages, voiceTransport])

  const enterVoiceMode = useCallback(async () => {
    setVoiceError('')
    Keyboard.dismiss()
    setVoiceMode(true)
    setIsMuted(false)
    setLastAssistantText('')
    voiceModeRef.current = true
    legacyVoiceChat.setVoiceModeActive(false)
    setVoiceTransport('realtime')

    const connected = await realtimeVoiceChat.connect()
    if (!connected) {
      setVoiceTransport('legacy')
      legacyVoiceChat.setVoiceModeActive(true)
      await legacyVoiceChat.startListening()
    }
  }, [legacyVoiceChat, realtimeVoiceChat])

  const exitVoiceMode = useCallback(() => {
    setVoiceMode(false)
    setIsMuted(false)
    voiceModeRef.current = false
    realtimeVoiceChat.disconnect()
    legacyVoiceChat.setVoiceModeActive(false)
    legacyVoiceChat.stopListening()
    legacyVoiceChat.stopSpeaking()
  }, [legacyVoiceChat, realtimeVoiceChat])

  useEffect(
    () =>
      pager?.onLeaveChat(() => {
        if (voiceModeRef.current) exitVoiceMode()
      }),
    [pager, exitVoiceMode],
  )
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active' && voiceModeRef.current) exitVoiceMode()
    })
    return () => subscription.remove()
  }, [exitVoiceMode])

  // Soft exit: close UI and stop listening, but let TTS finish
  const softExitVoiceMode = useCallback(() => {
    setVoiceMode(false)
    setIsMuted(false)
    voiceModeRef.current = false
    if (voiceTransport === 'realtime') {
      realtimeVoiceChat.disconnect()
    } else {
      legacyVoiceChat.setVoiceModeActive(false)
      legacyVoiceChat.stopListening()
    }
  }, [legacyVoiceChat, realtimeVoiceChat, voiceTransport])

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => {
      if (!prev) {
        if (voiceTransport === 'realtime') {
          realtimeVoiceChat.mute()
        } else {
          legacyVoiceChat.stopListening()
        }
      } else {
        if (voiceTransport === 'realtime') {
          realtimeVoiceChat.unmute()
        } else {
          legacyVoiceChat.startListening()
        }
      }
      return !prev
    })
  }, [legacyVoiceChat, realtimeVoiceChat, voiceTransport])

  // Fade out chat content when voice mode is active
  const chatOpacity = useSharedValue(1)
  useEffect(() => {
    chatOpacity.value = withTiming(voiceMode ? 0 : 1, { duration: 250 })
  }, [voiceMode, chatOpacity])
  const chatFadeStyle = useAnimatedStyle(() => ({
    opacity: chatOpacity.value,
  }))

  const handleVoiceInterrupt = useCallback(() => {
    if (voiceTransport === 'realtime') {
      realtimeVoiceChat.interrupt()
      return
    }

    legacyVoiceChat.stopSpeaking()
    setTimeout(() => {
      if (voiceModeRef.current) {
        legacyVoiceChat.startListening()
      }
    }, 200)
  }, [legacyVoiceChat, realtimeVoiceChat, voiceTransport])

  // Speech is an external side effect; the card itself is derived from the transcript.
  useEffect(() => {
    if (
      !pendingClarification ||
      !voiceModeRef.current ||
      voiceTransport !== 'legacy' ||
      spokenToolCallsRef.current.has(pendingClarification.toolCallId)
    )
      return
    spokenToolCallsRef.current.add(pendingClarification.toolCallId)
    void legacySpeakRef.current?.(pendingClarification.question)
  }, [pendingClarification, voiceTransport])

  // Base bottom padding: input height + safe area + some margin
  const cardVisible = showCard
  const [cardHeight, setCardHeight] = useState(0)
  const baseBottomPadding =
    MIN_INPUT_HEIGHT +
    insets.bottom +
    40 +
    (cardVisible || pendingClarification ? cardHeight : 0)

  // Scroll to bottom helper - no deps on messages.length for stable reference
  const scrollToBottom = useCallback((animated = true) => {
    listRef.current?.scrollToEnd({ animated })
  }, [])

  const handleSend = useCallback(
    (text = input) => {
      if ((!text.trim() && !attachment) || status === 'streaming' || status === 'submitted')
        return
      clearError()
      setIsThinking(true)
      setThinkingStartTime(Date.now())
      sendMessage({
        text: text || 'Help me log the food in this photo. Ask about the portion if needed.',
        files: attachment
          ? [{ type: 'file', mediaType: attachment.mediaType, url: attachment.data }]
          : undefined,
      })
      setAttachment(null)
      // Scroll to bottom after sending
      requestAnimationFrame(() => {
        scrollToBottom(true)
      })
    },
    [input, attachment, status, clearError, sendMessage, scrollToBottom],
  )

  const handleCarouselSelect = useCallback(
    (text: string) => {
      handleSend(text)
    },
    [handleSend],
  )
  const newChat = () =>
    confirmAction(
      'Start a new chat?',
      'Your food log and saved meals will stay. This conversation and any unlogged draft will be cleared.',
      'New chat',
      () => {
        void stop()
        exitVoiceMode()
        useDraftStore.getState().take()
        setMessages([])
        saveChatMessages([])
        setInput('')
        clearError()
        setIsThinking(false)
      },
    )

  const handleClarificationDismiss = useCallback(() => {
    setClarificationDismissing(true)
  }, [])

  const handleClarificationAnswer = useCallback(
    (answer: string) => {
      if (!pendingClarification) return
      Haptics.selection()
      setIsThinking(true)
      setThinkingStartTime(Date.now())
      if (voiceModeRef.current && voiceTransport === 'realtime') {
        appendVoiceUserMessage(answer)
        upsertRealtimeToolPart('ask_user', pendingClarification.toolCallId, {
          state: 'output-available',
          input: {
            question: pendingClarification.question,
            options: pendingClarification.options,
            allowFreeform: pendingClarification.allowFreeform,
            context: pendingClarification.context,
          },
          output: answer,
        })
        realtimeSubmitToolResponseRef.current?.(pendingClarification.toolCallId, answer)
        realtimeAssistantMessageIdRef.current = null
      } else {
        addToolOutput({
          tool: 'ask_user',
          toolCallId: pendingClarification.toolCallId,
          output: answer,
        })
      }
      setClarificationDismissing(false)
    },
    [
      addToolOutput,
      appendVoiceUserMessage,
      pendingClarification,
      upsertRealtimeToolPart,
      voiceTransport,
    ],
  )

  const acknowledgeTracking = useCallback(
    (text: string) => {
      setMessages((previous) => [
        ...previous,
        { id: `tracking-${Date.now()}`, role: 'assistant', parts: [{ type: 'text', text }] },
      ])
    },
    [setMessages],
  )

  // Helper to get default meal based on time of day
  const getDefaultMeal = (): 'breakfast' | 'lunch' | 'dinner' | 'snack' => {
    const hour = new Date().getHours()
    if (hour < 10) return 'breakfast'
    if (hour < 14) return 'lunch'
    if (hour < 20) return 'dinner'
    return 'snack'
  }

  // Handle confirming and logging all pending food entries
  const handleConfirmLog = useCallback(() => {
    const draft = useDraftStore.getState().take()
    if (draft.length === 0) return

    const entries = draft.map(
      (pending) =>
        ({
          quantity: pending.entry.quantity,
          snapshot: {
            name: pending.entry.name,
            serving: pending.entry.serving,
            nutrients: pending.entry.nutrients,
            fdcId: pending.entry.fdcId,
            estimated: pending.entry.estimated,
          },
          meal: pending.entry.meal || getDefaultMeal(),
        }) as const,
    )

    loadDailyLog(formatDateKey())
    try {
      addMeal(entries, mealTitle)
    } catch {
      setPendingEntries(() => draft)
      return
    }

    setMessages((previous) => [
      ...previous,
      {
        id: `logged-${Date.now()}`,
        role: 'assistant',
        parts: [
          {
            type: 'text',
            text: `Logged ${mealTitle || entries.map((entry) => entry.snapshot.name).join(', ')}. You can edit it in your daily log.`,
          },
        ],
      },
    ])

    // Dismiss keyboard and swipe to Dashboard
    Keyboard.dismiss()
  }, [addMeal, mealTitle, loadDailyLog, setMessages, setPendingEntries])

  // Handle removing a specific entry from the pending list
  const handleRemoveEntry = useCallback(
    (index: number) => {
      Haptics.selection()
      setPendingEntries((prev) => {
        const next = prev.filter((_, i) => i !== index)
        return next
      })
    },
    [setPendingEntries],
  )

  // Handle quantity changes from edit mode
  const handleQuantityChange = useCallback(
    (index: number, newQuantity: number) => {
      if (newQuantity <= 0) {
        handleRemoveEntry(index)
      } else {
        setPendingEntries((prev) =>
          prev.map((p, i) =>
            i === index ? { ...p, entry: { ...p.entry, quantity: newQuantity } } : p,
          ),
        )
      }
    },
    [handleRemoveEntry, setPendingEntries],
  )

  useEffect(
    () =>
      useDraftStore.subscribe((state, previous) => {
        if (state.entries.length > previous.entries.length && voiceModeRef.current)
          softExitVoiceMode()
      }),
    [softExitVoiceMode],
  )

  const activeVoiceState =
    voiceTransport === 'realtime' ? realtimeVoiceChat.state : legacyVoiceChat.state
  const activeVoiceTranscript =
    voiceTransport === 'realtime'
      ? realtimeVoiceChat.interimTranscript
      : legacyVoiceChat.interimTranscript
  const activeAnalyserNode =
    voiceTransport === 'realtime'
      ? realtimeVoiceChat.analyserNode
      : legacyVoiceChat.analyserNode

  const pickPhoto = async (camera: boolean) => {
    try {
      if (camera) {
        const permission = await ImagePicker.requestCameraPermissionsAsync()
        if (!permission.granted) {
          setPhotoError('Allow camera access in settings, or choose a photo.')
          return
        }
      }
      const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.8 }
      const result = camera
        ? await ImagePicker.launchCameraAsync(options)
        : await ImagePicker.launchImageLibraryAsync(options)
      if (!result.canceled) {
        const asset = result.assets[0]
        const photo = await manipulateAsync(
          asset.uri,
          asset.width > 1536 ? [{ resize: { width: 1536 } }] : [],
          { compress: 0.75, format: SaveFormat.JPEG, base64: true },
        )
        if (!photo.base64 || photo.base64.length > 8000000) {
          setPhotoError('This photo is too large. Choose a smaller image.')
          return
        }
        setAttachment({
          uri: photo.uri,
          mediaType: 'image/jpeg',
          data: `data:image/jpeg;base64,${photo.base64}`,
        })
        setPhotoError('')
      }
    } catch {
      setPhotoError('Unable to open photos. Please try again.')
    }
  }
  const attachPhoto = () =>
    Platform.OS === 'web'
      ? void pickPhoto(false)
      : Alert.alert('Add a food photo', 'Include the whole meal or a clear nutrition label.', [
          {
            text: 'Camera',
            onPress: () => {
              void pickPhoto(true)
            },
          },
          {
            text: 'Photo library',
            onPress: () => {
              void pickPhoto(false)
            },
          },
          { text: 'Cancel', style: 'cancel' },
        ])

  return {
    newChat,
    acknowledgeTracking,
    lastAssistantText,
    theme,
    voiceMode,
    activeVoiceState,
    activeVoiceTranscript,
    activeAnalyserNode,
    screenWidth,
    screenHeight,
    chatFadeStyle,
    messages,
    headerHeight,
    handleCarouselSelect,
    listRef,
    keyboardHeight,
    baseBottomPadding,
    isThinking,
    thinkingStartTime,
    toolActivity,
    error,
    photoError,
    voiceError,
    clearError,
    regenerate,
    inputRef,
    input,
    setInput,
    handleSend,
    pendingClarification,
    setCardHeight,
    handleClarificationAnswer,
    handleClarificationDismiss,
    pendingEntries,
    mealTitle,
    isTitleLoading,
    handleConfirmLog,
    handleRemoveEntry,
    handleQuantityChange,
    clarificationDismissing,
    showCard,
    cardVisible,
    attachment,
    setAttachment,
    attachPhoto,
    status,
    stop,
    setIsThinking,
    enterVoiceMode,
    toggleMute,
    exitVoiceMode,
    handleVoiceInterrupt,
    isMuted,
    scrollToBottom,
  }
}
