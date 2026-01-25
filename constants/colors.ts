// Light theme colors
export const LightColors = {
  primary: '#60e4e4',
  primaryDark: '#4ccaca',
  success: '#36c7c7',
  warning: '#f6c35c',
  error: '#e06767',
  textPrimary: '#0f172a',
  textSecondary: '#475569',
  background: '#ffffff',
  surface: '#f8fafc',
  border: '#e2e8f0',
  focusRing: '#60e4e4',
} as const;

// Dark theme colors
export const DarkColors = {
  primary: '#60e4e4',
  primaryDark: '#4ccaca',
  success: '#36c7c7',
  warning: '#f6c35c',
  error: '#e06767',
  textPrimary: '#f1f5f9',
  textSecondary: '#94a3b8',
  background: '#0f172a',
  surface: '#1e293b',
  border: '#334155',
  focusRing: '#60e4e4',
} as const;

// Default export for backwards compatibility (light theme)
export const Colors = LightColors;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const BorderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
} as const;

export type ThemeColors = {
  primary: string;
  primaryDark: string;
  success: string;
  warning: string;
  error: string;
  textPrimary: string;
  textSecondary: string;
  background: string;
  surface: string;
  border: string;
  focusRing: string;
};
