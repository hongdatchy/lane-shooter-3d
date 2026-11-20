"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { normalizeLocale, useAppStore } from "@/state-manager/app-store";

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
  const theme = useAppStore((s) => s.theme);
  const locale = useAppStore((s) => s.locale);
  const setLocale = useAppStore((s) => s.setLocale);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const paramLocale = params.get("locale");
    if (paramLocale) {
      setLocale(normalizeLocale(paramLocale));
    }
  }, [setLocale]);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  return (
    <AppContext.Provider value={{ isReady, setReady }}>
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => useContext(AppContext);
