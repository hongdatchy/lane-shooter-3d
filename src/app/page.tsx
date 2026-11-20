"use client";

import { useRef } from "react";
import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";
import { GameHUD } from "@/components/custom/game/GameHUD";
import { useGameStore } from "@/state-manager/game-store";
import { useTransClientSide } from "@/lang/useTransClientSide";
import "@/service/model-cache";
import "@/service/asset-preloader";

function ViewportLoading() {
  const trans = useTransClientSide();
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-slate-950 text-slate-300">
      <Loader2 className="h-8 w-8 animate-spin text-sky-400" />
      <p className="text-sm font-medium">{trans.app.loading3d}</p>
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
  const isInGame = gameStatus !== "MENU";

  return (
    <div className="space-y-3">
      {/* Khung Game 3D: Ở sảnh hiển thị gọn trong trang; khi bấm Chơi ngay vào game sẽ mở full màn hình */}
      <div
        ref={containerRef}
        className={
          isInGame
            ? "fixed inset-0 z-50 h-[100dvh] w-screen overflow-hidden bg-slate-950 touch-none select-none"
            : "relative h-[calc(100vh-11rem)] min-h-[600px] w-full overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 shadow-xl"
        }
      >
        <GameViewport />
        <GameHUD containerRef={containerRef} />
      </div>
    </div>
  );
}
