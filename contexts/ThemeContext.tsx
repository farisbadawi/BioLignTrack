import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import { LightColors, DarkColors, ThemeColors } from '@/constants/colors';
import { usePatientStore } from '@/stores/patient-store';

type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: ThemeMode;
  isDark: boolean;
  colors: ThemeColors;
  setTheme: (theme: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'system',
  isDark: false,
  colors: LightColors,
  setTheme: () => {},
});

export const useTheme = () => useContext(ThemeContext);

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const systemColorScheme = useColorScheme();
  const { userSettings, updateUserSettings } = usePatientStore();
  const [theme, setThemeState] = useState<ThemeMode>('system');

  // Sync with store settings
  useEffect(() => {
    if (userSettings?.theme) {
      setThemeState(userSettings.theme);
    }
  }, [userSettings?.theme]);

  const isDark = theme === 'dark' || (theme === 'system' && systemColorScheme === 'dark');
  const colors = isDark ? DarkColors : LightColors;

  const setTheme = async (newTheme: ThemeMode) => {
    setThemeState(newTheme);
    await updateUserSettings({ theme: newTheme });
  };

  return (
    <ThemeContext.Provider value={{ theme, isDark, colors, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export default ThemeContext;
