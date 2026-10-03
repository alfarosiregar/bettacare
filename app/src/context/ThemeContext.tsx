import React, { createContext, useContext, useState, useEffect } from 'react';
import { theme } from '../theme';
import { useAuth } from './AuthContext';

type ThemeType = 'light' | 'dark';

interface ThemeContextProps {
  colorScheme: ThemeType;
  colors: typeof theme.light;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextProps>({
  colorScheme: 'light',
  colors: theme.light,
  toggleTheme: () => {},
});

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  const [colorScheme, setColorScheme] = useState<ThemeType>('light');

  useEffect(() => {
    if (user && user.themePreference) {
      setColorScheme(user.themePreference);
    }
  }, [user?.themePreference]);

  const toggleTheme = () => {
    setColorScheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  const colors = theme[colorScheme];

  return (
    <ThemeContext.Provider value={{ colorScheme, colors, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
