import { AudioGradientOrb } from '@/components/chat/audio-gradient-orb'
import {
  AnimatedInput,
  ClarificationCard,
  EmptyStateCarousels,
  FoodConfirmationCard,
  MessageBubble,
} from '@/components/chat/index'
import { ThinkingDropdown } from '@/components/chat/thinking-dropdown'
import { VoiceOverlay } from '@/components/chat/voice-overlay'
import { Button } from '@/components/ui/button'
import { Text } from '@/components/ui/text'
import { LegendList } from '@legendapp/list/react-native'
import type { UIMessage } from 'ai'
import { router } from 'expo-router'
import { useCallback, useEffect, useMemo } from 'react'
import { Platform, View } from 'react-native'
import type { SharedValue } from 'react-native-reanimated'
import Animated, { SlideInUp, useAnimatedStyle } from 'react-native-reanimated'

import { useMoraChat } from '@/features/chat/use-mora-chat'

/** Animated spacer that adjusts height based on keyboard */
function KeyboardSpacer({
  keyboardHeight,
  baseHeight,
}: {
  keyboardHeight: SharedValue<number>
  baseHeight: number
}) {
  const animatedStyle = useAnimatedStyle(() => ({
    height: baseHeight + Math.abs(keyboardHeight.value),
  }))
  return <Animated.View style={animatedStyle} />
}

export default function ChatScreen() {
  const {
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
  } = useMoraChat()
  // Build list data: messages + a thinking sentinel inserted after the last user message.
  // Always insert the sentinel when messages exist — ThinkingDropdown handles its own
  // visibility internally (returns null when not needed). This avoids unmount/remount
  // cycles that would lose accumulated step state.
  type ListItem = { type: 'message'; message: UIMessage } | { type: 'thinking' }

  const listData = useMemo<ListItem[]>(() => {
    if (messages.length === 0) {
      return []
    }

    // Find the last user message index
    let lastUserIdx = -1
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'user') {
        lastUserIdx = i
        break
      }
    }

    const items: ListItem[] = []
    for (let i = 0; i < messages.length; i++) {
      items.push({ type: 'message', message: messages[i] })
      if (i === lastUserIdx) {
        items.push({ type: 'thinking' })
      }
    }
    // If no user message found (edge case), append at end
    if (lastUserIdx === -1) {
      items.push({ type: 'thinking' })
    }
    return items
  }, [messages])

  // Footer component with keyboard-aware spacer
  const ListFooter = useMemo(
    () => <KeyboardSpacer keyboardHeight={keyboardHeight} baseHeight={baseBottomPadding} />,
    [keyboardHeight, baseBottomPadding],
  )

  // Scroll to bottom when card becomes visible
  useEffect(() => {
    if (cardVisible) {
      requestAnimationFrame(() => {
        scrollToBottom(false)
        setTimeout(() => {
          scrollToBottom(false)
        }, 16)
      })
    }
  }, [cardVisible, scrollToBottom])

  const renderItem = useCallback(
    ({ item }: { item: ListItem }) => {
      if (item.type === 'thinking') {
        return (
          <View className="px-4 py-2">
            <ThinkingDropdown
              isThinking={
                status === 'submitted' || status === 'streaming' || (voiceMode && isThinking)
              }
              thinkingStartTime={thinkingStartTime}
              toolName={toolActivity.toolName}
              toolState={toolActivity.toolState}
              foodQuery={toolActivity.foodQuery || undefined}
            />
          </View>
        )
      }
      return (
        <View>
          <MessageBubble message={item.message} onTrackingResolved={acknowledgeTracking} />
        </View>
      )
    },
    [isThinking, thinkingStartTime, toolActivity, status, voiceMode, acknowledgeTracking],
  )

  return (
    <View className="flex-1">
      {/* Orb — behind chat when normal, above when voice mode */}
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: voiceMode ? 50 : 0,
        }}
      >
        {voiceMode && (
          <AudioGradientOrb
            voiceMode={voiceMode}
            voiceState={activeVoiceState}
            analyserNode={activeAnalyserNode}
            width={screenWidth}
            height={screenHeight}
          />
        )}
      </View>

      {/* Chat content — fades out when voice mode activates */}
      <Animated.View
        style={[
          { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1 },
          chatFadeStyle,
        ]}
        pointerEvents={voiceMode ? 'none' : 'auto'}
      >
        <View style={{ flex: 1 }}>
          {messages.length === 0 && (
            <Animated.View
              entering={SlideInUp.springify().delay(100)}
              style={{ paddingTop: headerHeight + 8 }}
            >
              <EmptyStateCarousels onSelectItem={handleCarouselSelect} />
            </Animated.View>
          )}
          <LegendList
            ref={listRef}
            data={listData}
            extraData={
              status === 'submitted' || status === 'streaming' || (voiceMode && isThinking)
            }
            showsVerticalScrollIndicator={false}
            {...(Platform.OS === 'web'
              ? {}
              : {
                  keyboardDismissMode: 'interactive' as const,
                  keyboardShouldPersistTaps: 'handled' as const,
                })}
            renderItem={renderItem}
            getItemType={(item: any) => item.type}
            estimatedItemSize={100}
            recycleItems={false}
            keyExtractor={(item) => (item.type === 'message' ? item.message.id : 'thinking')}
            maintainScrollAtEnd
            maintainScrollAtEndThreshold={0.15}
            initialScrollAtEnd
            contentContainerStyle={{
              paddingTop: headerHeight + 8,
            }}
            ListHeaderComponent={
              messages.length > 0 ? (
                <Button title="New chat" variant="ghost" onPress={newChat} />
              ) : null
            }
            ListFooterComponent={ListFooter}
          />
        </View>

        {!!(error || photoError) && (
          <View
            style={{
              position: 'absolute',
              bottom: baseBottomPadding,
              left: 16,
              right: 16,
              backgroundColor: theme.card,
              padding: 16,
              borderRadius: 16,
            }}
          >
            <Text tone="danger">
              {photoError || 'Mora could not finish this reply. Your conversation is saved.'}
            </Text>
            {error && (
              <Button
                title="Try again"
                variant="secondary"
                onPress={() => {
                  clearError()
                  void regenerate()
                }}
              />
            )}
          </View>
        )}
        <AnimatedInput
          ref={inputRef}
          value={input}
          onChangeText={setInput}
          onSend={handleSend}
          hasMessages={messages.length > 0}
          keyboardHeight={keyboardHeight}
          disabled={!!pendingClarification}
          topContent={
            pendingClarification ? (
              <View onLayout={(e) => setCardHeight(e.nativeEvent.layout.height)}>
                <ClarificationCard
                  key={pendingClarification.toolCallId}
                  question={pendingClarification.question}
                  options={pendingClarification.options}
                  allowFreeform={pendingClarification.allowFreeform}
                  context={pendingClarification.context}
                  onSubmit={handleClarificationAnswer}
                  onDismiss={handleClarificationDismiss}
                />
              </View>
            ) : pendingEntries.length > 0 ? (
              <View onLayout={(e) => setCardHeight(e.nativeEvent.layout.height)}>
                <FoodConfirmationCard
                  entries={pendingEntries.map((p) => p.entry)}
                  mealTitle={mealTitle}
                  isTitleLoading={isTitleLoading}
                  onConfirm={handleConfirmLog}
                  onRemove={handleRemoveEntry}
                  onQuantityChange={handleQuantityChange}
                />
              </View>
            ) : undefined
          }
          topContentVisible={
            (!!pendingClarification && !clarificationDismissing) || cardVisible
          }
          onVoicePress={enterVoiceMode}
          onPhotoPress={attachPhoto}
          onBarcodePress={() => router.push('/scan')}
          attachmentUri={attachment?.uri}
          onRemoveAttachment={() => setAttachment(null)}
          sending={status === 'streaming' || status === 'submitted'}
          onStop={() => {
            void stop()
            setIsThinking(false)
          }}
        />
      </Animated.View>

      {/* Voice mode overlay */}
      {voiceMode && (
        <VoiceOverlay
          error={voiceError}
          state={activeVoiceState}
          interimTranscript={activeVoiceTranscript}
          lastAssistantText={lastAssistantText}
          analyserNode={activeAnalyserNode}
          toolName={toolActivity.toolName}
          toolState={toolActivity.toolState}
          foodQuery={toolActivity.foodQuery || undefined}
          isThinking={
            status === 'submitted' || status === 'streaming' || (voiceMode && isThinking)
          }
          isMuted={isMuted}
          onClose={exitVoiceMode}
          onTapInterrupt={handleVoiceInterrupt}
          onToggleMute={toggleMute}
        />
      )}
    </View>
  )
}
