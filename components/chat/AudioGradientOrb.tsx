import { colors } from '@/constants/colors'
import type { VoiceState } from '@/hooks/useVoiceChat'
import { useEffect, useRef } from 'react'
import { useColorScheme, View } from 'react-native'
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated'

type AudioGradientOrbProps = {
  voiceMode: boolean
  voiceState: VoiceState
  analyserNode: any | null
  width: number
  height: number
}

const BASE_SIZE = 280
const VOICE_SIZE = 160

export function AudioGradientOrb({
  voiceMode,
  voiceState,
  analyserNode,
  width,
  height,
}: AudioGradientOrbProps) {
  const colorScheme = useColorScheme()
  const isDark = colorScheme === 'dark'
  const primary = isDark ? colors.dark.primary : colors.light.primary

  const amplitudeSV = useSharedValue(0)
  const sizeSV = useSharedValue(BASE_SIZE)
  const centerYSV = useSharedValue(1.15)
  const opacitySV = useSharedValue(0.5)
  const rafRef = useRef<number | null>(null)

  useEffect(() => {
    sizeSV.value = withSpring(voiceMode ? VOICE_SIZE : BASE_SIZE)
    centerYSV.value = withSpring(voiceMode ? 0.5 : 1.15)
    opacitySV.value = withSpring(voiceMode ? 1 : 0.5)
  }, [centerYSV, opacitySV, sizeSV, voiceMode])

  useEffect(() => {
    if (voiceState !== 'speaking' || !analyserNode) {
      const decay = () => {
        if (amplitudeSV.value > 0.001) {
          amplitudeSV.value *= 0.9
          rafRef.current = requestAnimationFrame(decay)
        } else {
          amplitudeSV.value = 0
          rafRef.current = null
        }
      }

      rafRef.current = requestAnimationFrame(decay)

      return () => {
        if (rafRef.current) cancelAnimationFrame(rafRef.current)
      }
    }

    const bufferLength = analyserNode.frequencyBinCount
    const dataArray = new Uint8Array(bufferLength)

    const update = () => {
      analyserNode.getByteFrequencyData(dataArray)

      let sum = 0
      for (let i = 0; i < bufferLength; i++) {
        const value = dataArray[i] / 255
        sum += value * value
      }

      const rms = Math.sqrt(sum / bufferLength)
      amplitudeSV.value = amplitudeSV.value * 0.7 + rms * 0.3
      rafRef.current = requestAnimationFrame(update)
    }

    rafRef.current = requestAnimationFrame(update)

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
  }, [amplitudeSV, analyserNode, voiceState])

  const outerStyle = useAnimatedStyle(() => {
    const sizeMultiplier = 1.35
    const opacityMultiplier = 0.14
    const animatedSize = sizeSV.value * sizeMultiplier * (1 + amplitudeSV.value * 0.45)
    const top = height * centerYSV.value - animatedSize / 2
    const left = width / 2 - animatedSize / 2

    return {
      position: 'absolute',
      width: animatedSize,
      height: animatedSize,
      borderRadius: animatedSize / 2,
      top,
      left,
      backgroundColor: primary,
      opacity: opacitySV.value * opacityMultiplier,
      transform: [{ scale: 1 + amplitudeSV.value * 0.15 * sizeMultiplier }],
    }
  })

  const middleStyle = useAnimatedStyle(() => {
    const sizeMultiplier = 1.05
    const opacityMultiplier = 0.22
    const animatedSize = sizeSV.value * sizeMultiplier * (1 + amplitudeSV.value * 0.45)
    const top = height * centerYSV.value - animatedSize / 2
    const left = width / 2 - animatedSize / 2

    return {
      position: 'absolute',
      width: animatedSize,
      height: animatedSize,
      borderRadius: animatedSize / 2,
      top,
      left,
      backgroundColor: primary,
      opacity: opacitySV.value * opacityMultiplier,
      transform: [{ scale: 1 + amplitudeSV.value * 0.15 * sizeMultiplier }],
    }
  })

  const innerStyle = useAnimatedStyle(() => {
    const sizeMultiplier = 0.8
    const opacityMultiplier = 0.34
    const animatedSize = sizeSV.value * sizeMultiplier * (1 + amplitudeSV.value * 0.45)
    const top = height * centerYSV.value - animatedSize / 2
    const left = width / 2 - animatedSize / 2

    return {
      position: 'absolute',
      width: animatedSize,
      height: animatedSize,
      borderRadius: animatedSize / 2,
      top,
      left,
      backgroundColor: primary,
      opacity: opacitySV.value * opacityMultiplier,
      transform: [{ scale: 1 + amplitudeSV.value * 0.15 * sizeMultiplier }],
    }
  })

  const haloStyle = useAnimatedStyle(() => {
    const haloSize = sizeSV.value * 1.8
    const top = height * centerYSV.value - haloSize / 2
    const left = width / 2 - haloSize / 2

    return {
      position: 'absolute',
      width: haloSize,
      height: haloSize,
      borderRadius: haloSize / 2,
      top,
      left,
      backgroundColor: primary,
      opacity: interpolate(amplitudeSV.value, [0, 1], [0.04, 0.1]) * opacitySV.value,
      transform: [{ scale: 1 + amplitudeSV.value * 0.12 }],
    }
  })

  return (
    <View pointerEvents="none" style={{ width, height }}>
      <Animated.View style={haloStyle} />
      <Animated.View style={outerStyle} />
      <Animated.View style={middleStyle} />
      <Animated.View style={innerStyle} />
    </View>
  )
}
