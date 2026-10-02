import React, { createContext, useContext, useEffect, useState } from 'react';

export type CursorMode = 'classic' | 'modern' | 'default';

interface CursorContextType {
  cursorMode: CursorMode;
  setCursorMode: (mode: CursorMode) => void;
}

const STORAGE_KEY_CURSOR = 'app_custom_cursor_v1';

const CursorContext = createContext<CursorContextType | undefined>(undefined);

export const CursorProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cursorMode, setCursorModeState] = useState<CursorMode>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_CURSOR) as CursorMode | null;
      if (saved === 'classic' || saved === 'modern' || saved === 'default') {
        return saved;
      }
      return 'classic'; // Default to classic Windows XP cursor for the app's retro theme
    } catch {
      return 'classic';
    }
  });

  useEffect(() => {
    try {
      const root = document.documentElement;
      root.classList.remove('cursor-classic', 'cursor-modern');
      if (cursorMode === 'classic') {
        root.classList.add('cursor-classic');
      } else if (cursorMode === 'modern') {
        root.classList.add('cursor-modern');
      }
      localStorage.setItem(STORAGE_KEY_CURSOR, cursorMode);
    } catch {}
  }, [cursorMode]);

  const setCursorMode = (mode: CursorMode) => {
    setCursorModeState(mode);
  };

  return (
    <CursorContext.Provider value={{ cursorMode, setCursorMode }}>
      {children}
    </CursorContext.Provider>
  );
};

export const useCursor = () => {
  const context = useContext(CursorContext);
  if (!context) {
    throw new Error('useCursor must be used within a CursorProvider');
  }
  return context;
};
