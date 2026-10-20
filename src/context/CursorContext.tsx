import React, { createContext, useContext, useEffect } from 'react';

interface CursorContextType {
  cursorMode: 'mac';
}

const CursorContext = createContext<CursorContextType | undefined>(undefined);

export const CursorProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  useEffect(() => {
    try {
      const root = document.documentElement;
      root.classList.add('cursor-mac');
    } catch {}
  }, []);

  return (
    <CursorContext.Provider value={{ cursorMode: 'mac' }}>
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
