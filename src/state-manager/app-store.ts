import { create } from "zustand";
import { persist } from "zustand/middleware";
import { AppStatus } from "@/dto/CommonDTO";

interface State {
  appTitle: string;
  status: AppStatus;
  isLoading: boolean;
  isSidebarOpen: boolean;
}

interface Actions {
  setAppTitle: (title: string) => void;
  setStatus: (status: AppStatus) => void;
  setLoading: (loading: boolean) => void;
  toggleSidebar: () => void;
  reset: () => void;
}

const initialState: State = {
  appTitle: "3D Demo",
  status: "IDLE",
  isLoading: false,
  isSidebarOpen: true,
};

export const useAppStore = create<State & Actions>()(
  persist(
    (set) => ({
      ...initialState,

      setAppTitle: (appTitle) => set({ appTitle }),
      setStatus: (status) => set({ status }),
      setLoading: (isLoading) => set({ isLoading }),
      toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
      reset: () => set(initialState),
    }),
    {
      name: "3d-demo-app-store",
      partialize: (state) => ({
        isSidebarOpen: state.isSidebarOpen,
      }),
    }
  )
);

export default useAppStore;
