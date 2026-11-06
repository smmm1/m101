import React, { createContext, useContext, useEffect } from 'react';

export type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: 'light';
  isDark: false;
  toggleTheme: () => void;
  setTheme: (theme: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

/** M101 currently ships one governed visual theme: clean light.
 * Keep the context API stable for existing consumers while preventing
 * stale browser preferences from reintroducing a second, conflicting theme.
 */
export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  useEffect(() => {
    document.documentElement.classList.remove('dark');
    document.documentElement.classList.remove('light');
    document.documentElement.style.colorScheme = 'light';
    try {
      localStorage.removeItem('mustang_theme_mode');
    } catch {}
  }, []);

  const toggleTheme = () => {};
  const setTheme = (_theme: ThemeMode) => {};

  return (
    <ThemeContext.Provider value={{ theme: 'light', isDark: false, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within a ThemeProvider');
  return context;
};
