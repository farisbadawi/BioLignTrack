// components/CodeInput.tsx
// 6-box code input with auto-advance for doctor codes

import React, { useRef, useState, useEffect } from 'react'
import {
  View,
  TextInput,
  StyleSheet,
  Keyboard,
  NativeSyntheticEvent,
  TextInputKeyPressEventData,
} from 'react-native'
import { Colors, Spacing, BorderRadius } from '@/constants/colors'
import { useTheme } from '@/contexts/ThemeContext'

interface CodeInputProps {
  value: string
  onChange: (code: string) => void
  length?: number
  autoFocus?: boolean
  onComplete?: (code: string) => void
}

export function CodeInput({
  value,
  onChange,
  length = 6,
  autoFocus = false,
  onComplete,
}: CodeInputProps) {
  const { colors } = useTheme()
  const inputRefs = useRef<(TextInput | null)[]>([])
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null)

  // Split the value into individual characters
  const digits = value.split('').slice(0, length)
  while (digits.length < length) {
    digits.push('')
  }

  useEffect(() => {
    if (autoFocus && inputRefs.current[0]) {
      inputRefs.current[0].focus()
    }
  }, [autoFocus])

  // Check if code is complete
  useEffect(() => {
    if (value.length === length && onComplete) {
      onComplete(value)
    }
  }, [value, length, onComplete])

  const handleChange = (text: string, index: number) => {
    // Only allow alphanumeric characters and convert to uppercase
    const char = text.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(-1)

    if (char) {
      // Update the value
      const newDigits = [...digits]
      newDigits[index] = char
      const newValue = newDigits.join('')
      onChange(newValue)

      // Move to next input
      if (index < length - 1) {
        inputRefs.current[index + 1]?.focus()
      } else {
        // Last input - dismiss keyboard
        Keyboard.dismiss()
      }
    }
  }

  const handleKeyPress = (
    e: NativeSyntheticEvent<TextInputKeyPressEventData>,
    index: number
  ) => {
    if (e.nativeEvent.key === 'Backspace') {
      if (digits[index] === '' && index > 0) {
        // If current box is empty and backspace pressed, go to previous
        inputRefs.current[index - 1]?.focus()
        // Clear the previous box
        const newDigits = [...digits]
        newDigits[index - 1] = ''
        onChange(newDigits.join(''))
      } else {
        // Clear current box
        const newDigits = [...digits]
        newDigits[index] = ''
        onChange(newDigits.join(''))
      }
    }
  }

  const handleFocus = (index: number) => {
    setFocusedIndex(index)
  }

  const handleBlur = () => {
    setFocusedIndex(null)
  }

  // Handle paste
  const handlePaste = (text: string, index: number) => {
    const cleaned = text.replace(/[^A-Za-z0-9]/g, '').toUpperCase()
    if (cleaned.length > 1) {
      // User pasted multiple characters
      const newValue = cleaned.slice(0, length)
      onChange(newValue)
      // Focus the last filled input or the next empty one
      const nextIndex = Math.min(newValue.length, length - 1)
      inputRefs.current[nextIndex]?.focus()
      if (newValue.length === length) {
        Keyboard.dismiss()
      }
    }
  }

  return (
    <View style={styles.container}>
      {digits.map((digit, index) => (
        <TextInput
          key={index}
          ref={(ref) => { inputRefs.current[index] = ref }}
          style={[
            styles.box,
            {
              borderColor: focusedIndex === index ? colors.primary : colors.border,
              backgroundColor: colors.background,
              color: colors.textPrimary,
            },
            focusedIndex === index && styles.boxFocused,
            digit && styles.boxFilled,
          ]}
          value={digit}
          onChangeText={(text) => {
            if (text.length > 1) {
              // Handle paste
              handlePaste(text, index)
            } else {
              handleChange(text, index)
            }
          }}
          onKeyPress={(e) => handleKeyPress(e, index)}
          onFocus={() => handleFocus(index)}
          onBlur={handleBlur}
          maxLength={6} // Allow paste of up to 6 chars
          keyboardType="default"
          autoCapitalize="characters"
          autoCorrect={false}
          selectTextOnFocus
        />
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  box: {
    width: 48,
    height: 56,
    borderWidth: 2,
    borderRadius: BorderRadius.md,
    textAlign: 'center',
    fontSize: 24,
    fontWeight: '700',
  },
  boxFocused: {
    borderWidth: 2,
  },
  boxFilled: {
    borderWidth: 2,
  },
})
