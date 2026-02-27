import React from 'react';
import { TouchableOpacity, Text, ViewStyle, TextStyle } from 'react-native';
import { Spacing, BorderRadius } from '@/constants/colors';
import { useTheme } from '@/contexts/ThemeContext';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  style,
  textStyle
}: ButtonProps) {
  const { colors } = useTheme();

  const variantStyles: Record<string, ViewStyle> = {
    primary: { backgroundColor: colors.primary },
    secondary: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
    outline: { backgroundColor: 'transparent', borderWidth: 2, borderColor: colors.primary },
  };

  const sizeStyles: Record<string, ViewStyle> = {
    sm: { paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xs, minHeight: 32 },
    md: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, minHeight: 44 },
    lg: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, minHeight: 52 },
  };

  const textVariantStyles: Record<string, TextStyle> = {
    primary: { color: colors.background },
    secondary: { color: colors.textPrimary },
    outline: { color: colors.primary },
  };

  const textSizeStyles: Record<string, TextStyle> = {
    sm: { fontSize: 14 },
    md: { fontSize: 16 },
    lg: { fontSize: 18 },
  };

  return (
    <TouchableOpacity
      style={[
        { borderRadius: BorderRadius.md, alignItems: 'center', justifyContent: 'center', flexDirection: 'row' },
        variantStyles[variant],
        sizeStyles[size],
        disabled && { opacity: 0.5 },
        style,
      ]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.8}
    >
      <Text style={[
        { fontWeight: '600', textAlign: 'center' },
        textVariantStyles[variant],
        textSizeStyles[size],
        textStyle,
      ]}>
        {title}
      </Text>
    </TouchableOpacity>
  );
}
