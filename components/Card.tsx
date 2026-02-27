import React from 'react';
import { View, ViewStyle, StyleProp } from 'react-native';
import { BorderRadius, Spacing } from '@/constants/colors';
import { useTheme } from '@/contexts/ThemeContext';

interface CardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  padding?: keyof typeof Spacing;
}

export function Card({ children, style, padding = 'md' }: CardProps) {
  const { colors } = useTheme();

  return (
    <View style={[
      {
        backgroundColor: colors.background,
        borderRadius: BorderRadius.md,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3.84,
        elevation: 5,
        borderWidth: 1,
        borderColor: colors.border,
        padding: Spacing[padding],
      },
      style,
    ]}>
      {children}
    </View>
  );
}
