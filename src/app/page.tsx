"use client";

import { useCallback, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import { Loader2, Rocket, Trophy, User, Wrench } from "lucide-react";
import { GameHUD } from "@/components/custom/game/GameHUD";
import { MainMenu } from "@/components/custom/game/MainMenu";
import { WorldMapScreen } from "@/components/custom/game/WorldMapScreen";
import { ArmoryScreen } from "@/components/custom/game/ArmoryScreen";
import { FirstRunGate } from "@/components/custom/game/FirstRunGate";
import { GameHeader } from "@/layout/game-header";
import { leaderboardService } from "@/service/leaderboard-service";
import { useTransClientSide } from "@/lang/useTransClientSide";
import { useGameStore } from "@/state-manager/game-store";
import "@/service/model-cache";
import "@/service/asset-preloader";

function ViewportLoading() {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-[#0A0D14] text-[#7DF4FF]">
      <Loader2 className="h-8 w-8 animate-spin text-[#00F0FF]" />
      <p className="font-mono text-sm tracking-wider uppercase">INITIALIZING 3D ENGINE...</p>
    </div>
  );
}

const GameViewport = dynamic(
  () => import("@/components/custom/game/GameViewport"),
  {
    ssr: false,
    loading: () => <ViewportLoading />,
  }
);

export default function HomePage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameStatus = useGameStore((s) => s.gameStatus);
  const menuScreen = useGameStore((s) => s.menuScreen);
  const mobileLobbyTab = useGameStore((s) => s.mobileLobbyTab);
  const setMobileLobbyTab = useGameStore((s) => s.setMobileLobbyTab);
  const openLobby = useGameStore((s) => s.openLobby);
  const openArmory = useGameStore((s) => s.openArmory);
  const profileLoaded = useGameStore((s) => s.profileLoaded);
  const platformError = useGameStore((s) => s.platformError);
  const firstRunDone = useGameStore((s) => s.firstRunDone);
  const devMode = useGameStore((s) => s.devMode);
  const assetsPercent = useGameStore((s) => s.assetsPercent);
  const startGame = useGameStore((s) => s.startGame);
  const initPlatformAndProfile = useGameStore((s) => s.initPlatformAndProfile);
  const setLeaderboardData = useGameStore((s) => s.setLeaderboardData);
  const setLeaderboardError = useGameStore((s) => s.setLeaderboardError);
  const trans = useTransClientSide();
  const isInGame = gameStatus !== "MENU";
  const showBootSplash = !isInGame && !profileLoaded;
  const showFirstRunGate =
    !isInGame && profileLoaded && !platformError && !firstRunDone && !devMode;

  const handleDeployCombat = useCallback(() => {
    startGame();
    if (typeof document !== "undefined" && !document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => {});
    }
  }, [startGame]);

  // Initialize Portal Adapter (CrazyGames / Web) & subscribe to Firestore Leaderboard
  useEffect(() => {
    void initPlatformAndProfile();

    let unsubscribe: (() => void) | undefined;
    try {
      unsubscribe = leaderboardService.subscribeLeaderboard(
        (entries) => setLeaderboardData(entries),
        (err) => setLeaderboardError(err.message)
      );
    } catch (err) {
      setLeaderboardError(err instanceof Error ? err.message : String(err));
    }

    return () => {
      unsubscribe?.();
    };
  }, [initPlatformAndProfile, setLeaderboardData, setLeaderboardError]);

  // Fullscreen hotkey
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.code === "KeyF" && !e.repeat) {
        if (document.fullscreenElement) {
          void document.exitFullscreen();
        } else {
          void document.documentElement.requestFullscreen();
        }
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="min-h-screen lg:h-screen flex flex-col bg-[#0A0D14] lg:overflow-hidden">
      {/* Header visible on standard MENU after first-run check */}
      {!isInGame && !showBootSplash && !showFirstRunGate && <GameHeader />}

      {/* Boot splash waiting for profileLoaded so returning users & newcomers route cleanly */}
      {showBootSplash && (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center text-[#DBFCFF]">
          <Loader2 className="h-9 w-9 animate-spin text-[#00F0FF]" />
          <p className="font-mono text-xs uppercase tracking-widest text-[#B9CACB]">
            {trans.firstRun.checkingProfile}
          </p>
          <span className="font-mono text-sm font-bold text-[#FFC080] tabular-nums">
            {assetsPercent}%
          </span>
        </div>
      )}

      {/* First-time user: Stage 1 centered Start screen with asset load % */}
      {showFirstRunGate && <FirstRunGate />}

      {/* Standard MENU STATE: Lobby -> World Map / Armory -> Combat */}
      {!isInGame &&
        !showBootSplash &&
        !showFirstRunGate &&
        (menuScreen === "ARMORY" ? (
          <ArmoryScreen />
        ) : menuScreen === "WORLD_MAP" ? (
          <WorldMapScreen onDeployCombat={handleDeployCombat} />
        ) : (
          <MainMenu />
        ))}

      {/* Persistent Mobile Bottom Nav (Lobby & Armory) */}
      {!isInGame &&
        !showBootSplash &&
        !showFirstRunGate &&
        (menuScreen === "LOBBY" || menuScreen === "ARMORY") && (
          <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around bg-[#111318]/95 backdrop-blur-md border-t border-[#272A32] h-14 px-2">
            {(
              [
                { id: "hero", icon: <User className="w-5 h-5" />, label: "HERO" },
                { id: "battle", icon: <Rocket className="w-5 h-5" />, label: "BATTLE" },
                { id: "intel", icon: <Trophy className="w-5 h-5" />, label: "INTEL" },
                { id: "armory", icon: <Wrench className="w-5 h-5" />, label: "ARMORY" },
              ] as const
            ).map((tab) => {
              const isActive =
                tab.id === "armory"
                  ? menuScreen === "ARMORY"
                  : menuScreen === "LOBBY" && mobileLobbyTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    if (tab.id === "armory") {
                      openArmory("ARSENAL");
                      return;
                    }
                    setMobileLobbyTab(tab.id);
                    if (menuScreen !== "LOBBY") {
                      openLobby();
                    }
                  }}
                  className={`flex flex-col items-center gap-0.5 flex-1 py-1.5 rounded-lg transition-colors cursor-pointer ${
                    isActive
                      ? "text-[#00F0FF]"
                      : "text-[#536062] hover:text-[#B9CACB]"
                  }`}
                >
                  {tab.icon}
                  <span className="font-mono text-[9px] font-bold uppercase tracking-wider leading-none">
                    {tab.label}
                  </span>
                  {isActive && (
                    <span className="w-4 h-0.5 rounded-full bg-[#00F0FF] mt-0.5" />
                  )}
                </button>
              );
            })}
          </nav>
        )}

      {/* GAME STATE — single 3D viewport instance */}
      <div
        ref={containerRef}
        className={
          isInGame
            ? "fixed inset-0 z-50 h-[100dvh] w-screen overflow-hidden bg-[#0A0D14] touch-none select-none"
            : "hidden"
        }
      >
        <GameViewport />
        <GameHUD containerRef={containerRef} />
      </div>
    </div>
  );
}
