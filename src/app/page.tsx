"use client";

import { useCallback, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";
import { GameHUD } from "@/components/custom/game/GameHUD";
import { MainMenu } from "@/components/custom/game/MainMenu";
import { WorldMapScreen } from "@/components/custom/game/WorldMapScreen";
import { ArmoryScreen } from "@/components/custom/game/ArmoryScreen";
import { GameHeader } from "@/layout/game-header";
import { leaderboardService } from "@/service/leaderboard-service";
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
  const startGame = useGameStore((s) => s.startGame);
  const initPlatformAndProfile = useGameStore((s) => s.initPlatformAndProfile);
  const setLeaderboardData = useGameStore((s) => s.setLeaderboardData);
  const setLeaderboardError = useGameStore((s) => s.setLeaderboardError);
  const isInGame = gameStatus !== "MENU";

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
      {/* Header always visible on MENU */}
      {!isInGame && <GameHeader />}

      {/* MENU STATE: Lobby -> World Map / Armory -> Combat */}
      {!isInGame &&
        (menuScreen === "ARMORY" ? (
          <ArmoryScreen />
        ) : menuScreen === "WORLD_MAP" ? (
          <WorldMapScreen onDeployCombat={handleDeployCombat} />
        ) : (
          <MainMenu />
        ))}

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
