import { create } from "zustand";
import { AppStatus } from "@/dto/CommonDTO";

export type ThemeMode = "light" | "dark";
export type LocaleMode = "en" | "vi" | "zh" | "es" | "ja" | "pt";

const VALID_LOCALES: LocaleMode[] = ["en", "vi", "zh", "es", "ja", "pt"];

export function normalizeLocale(value?: string | null): LocaleMode {
  const clean = (value || "").trim().toLowerCase() as LocaleMode;
  return VALID_LOCALES.includes(clean) ? clean : "en";
}

interface State {
  appTitle: string;
  status: AppStatus;
  isLoading: boolean;
  isSidebarOpen: boolean;
  theme: ThemeMode;
  locale: LocaleMode;
}

interface Actions {
  setAppTitle: (title: string) => void;
  setStatus: (status: AppStatus) => void;
  setLoading: (loading: boolean) => void;
  toggleSidebar: () => void;
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
  setLocale: (locale: LocaleMode) => void;
  toggleLocale: () => void;
  reset: () => void;
}

const DEFAULT_LOCALE: LocaleMode = normalizeLocale(
  process.env.NEXT_PUBLIC_DEFAULT_LANGUAGE
);

const initialState: State = {
  appTitle: "3D Lane Shooter",
  status: "IDLE",
  isLoading: false,
  isSidebarOpen: true,
  theme: "dark",
  locale: DEFAULT_LOCALE,
};

export const useAppStore = create<State & Actions>()((set) => ({
  ...initialState,

  setAppTitle: (appTitle) => set({ appTitle }),
  setStatus: (status) => set({ status }),
  setLoading: (isLoading) => set({ isLoading }),
  toggleSidebar: () =>
    set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
  setTheme: (theme) => set({ theme }),
  toggleTheme: () =>
    set((state) => ({ theme: state.theme === "light" ? "dark" : "light" })),
  setLocale: (locale) => set({ locale: normalizeLocale(locale) }),
  toggleLocale: () =>
    set((state) => {
      const idx = VALID_LOCALES.indexOf(state.locale);
      const next = VALID_LOCALES[(idx + 1) % VALID_LOCALES.length];
      return { locale: next };
    }),
  reset: () => set(initialState),
}));

export default useAppStore;
