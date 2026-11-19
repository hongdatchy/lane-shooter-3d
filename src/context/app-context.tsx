"use client";

import React, { createContext, useContext, useState } from "react";

interface AppContextType {
  isReady: boolean;
  setReady: (ready: boolean) => void;
}

const AppContext = createContext<AppContextType>({
  isReady: true,
  setReady: () => {},
});

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [isReady, setReady] = useState(true);

  return (
    <AppContext.Provider value={{ isReady, setReady }}>
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => useContext(AppContext);
